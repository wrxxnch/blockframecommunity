export interface BfEntityItem {
  id: string;
  index: number;
  nodeName: string;
  rawText: string;
}

/**
 * Finds the index of the matching closing brace '}' for an opening brace '{' at openBracePos.
 * Properly ignores braces inside single/double quotes, long strings [[...]], and comments --...
 */
function findMatchingBrace(str: string, openBracePos: number): number {
  let depth = 1;
  let inString: false | '"' | "'" | "[[" = false;
  let inComment = false;

  for (let i = openBracePos + 1; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";

    // Single-line comment
    if (inComment) {
      if (char === "\n") {
        inComment = false;
      }
      continue;
    }

    // Double quotes string
    if (inString === '"') {
      if (char === '"' && prevChar !== "\\") inString = false;
      continue;
    }

    // Single quote string
    if (inString === "'") {
      if (char === "'" && prevChar !== "\\") inString = false;
      continue;
    }

    // Long string [[...]]
    if (inString === "[[") {
      if (char === "]" && str[i + 1] === "]") {
        inString = false;
        i++;
      }
      continue;
    }

    // Start of comment --
    if (char === "-" && str[i + 1] === "-") {
      inComment = true;
      i++;
      continue;
    }

    // Start of strings
    if (char === '"') {
      inString = '"';
      continue;
    }
    if (char === "'") {
      inString = "'";
      continue;
    }
    if (char === "[" && str[i + 1] === "[") {
      inString = "[[";
      i++;
      continue;
    }

    // Count braces outside strings/comments
    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Parses a .bf string content and extracts dictionary definitions & entity blocks.
 */
export function parseBfContent(content: string): BfEntityItem[] {
  if (!content || typeof content !== "string") return [];

  // 1. Build string dictionary map: [1]="mcl_core:dirt", etc.
  const dictMap: Record<number, string> = {};
  const dictRegex = /_?\[(\d+)\]\s*=\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = dictRegex.exec(content)) !== null) {
    const idx = parseInt(match[1], 10);
    dictMap[idx] = match[2].trim();
  }

  // 2. Find "entities" or "nodes" section inside content
  let entitiesStartMatch = /(?:entities|nodes|blocks)\s*=\s*\{/i.exec(content);
  if (!entitiesStartMatch) {
    // If not found, try matching the outer return { ... }
    entitiesStartMatch = /return\s*\{/i.exec(content);
  }

  if (!entitiesStartMatch) {
    return fallbackParseNodes(content, dictMap);
  }

  const openBracePos = entitiesStartMatch.index + entitiesStartMatch[0].length - 1;
  const closeBracePos = findMatchingBrace(content, openBracePos);

  if (closeBracePos === -1) {
    return fallbackParseNodes(content, dictMap);
  }

  const entitiesBlock = content.substring(openBracePos + 1, closeBracePos);

  // 3. Extract top-level entity tables { ... } inside entitiesBlock
  const entityChunks: string[] = [];
  let inString: false | '"' | "'" | "[[" = false;
  let inComment = false;
  let depth = 0;
  let chunkStart = -1;

  for (let i = 0; i < entitiesBlock.length; i++) {
    const char = entitiesBlock[i];
    const prevChar = i > 0 ? entitiesBlock[i - 1] : "";

    if (inComment) {
      if (char === "\n") inComment = false;
      continue;
    }
    if (inString === '"') {
      if (char === '"' && prevChar !== "\\") inString = false;
      continue;
    }
    if (inString === "'") {
      if (char === "'" && prevChar !== "\\") inString = false;
      continue;
    }
    if (inString === "[[") {
      if (char === "]" && entitiesBlock[i + 1] === "]") {
        inString = false;
        i++;
      }
      continue;
    }

    if (char === "-" && entitiesBlock[i + 1] === "-") {
      inComment = true;
      i++;
      continue;
    }
    if (char === '"') {
      inString = '"';
      continue;
    }
    if (char === "'") {
      inString = "'";
      continue;
    }
    if (char === "[" && entitiesBlock[i + 1] === "[") {
      inString = "[[";
      i++;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        chunkStart = i;
      }
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && chunkStart !== -1) {
        const rawText = entitiesBlock.substring(chunkStart, i + 1).trim();
        if (rawText.length > 0) {
          entityChunks.push(rawText);
        }
        chunkStart = -1;
      }
    }
  }

  if (entityChunks.length === 0) {
    return fallbackParseNodes(content, dictMap);
  }

  // 4. Map chunks into BfEntityItem objects
  return entityChunks.map((chunk, idx) => {
    let nodeName = "";

    // Check node="something" or node='something' or name="something"
    const stringNodeMatch = /(?:node|name|item)\s*=\s*["']([^"']+)["']/i.exec(chunk);
    if (stringNodeMatch) {
      nodeName = stringNodeMatch[1];
    } else {
      // Check node=_[1] or node=[1]
      const refNodeMatch = /(?:node|name|item)\s*=\s*_?\[(\d+)\]/i.exec(chunk);
      if (refNodeMatch) {
        const refIdx = parseInt(refNodeMatch[1], 10);
        nodeName = dictMap[refIdx] || `[${refIdx}]`;
      } else {
        // Check node=identifier
        const idNodeMatch = /(?:node|name|item)\s*=\s*([a-zA-Z0-9_:.-]+)/i.exec(chunk);
        if (idNodeMatch) {
          nodeName = idNodeMatch[1];
        } else {
          // Look for any string with namespace:item (e.g. "postick:postick")
          const nsMatch = /["']([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)["']/i.exec(chunk);
          if (nsMatch) {
            nodeName = nsMatch[1];
          }
        }
      }
    }

    if (!nodeName) {
      nodeName = `Bloco / Entidade #${idx + 1}`;
    }

    return {
      id: `entity-${idx}`,
      index: idx + 1,
      nodeName,
      rawText: chunk,
    };
  });
}

/**
 * Fallback parser in case entities = { ... } bracket matching isn't standard
 */
function fallbackParseNodes(content: string, dictMap: Record<number, string>): BfEntityItem[] {
  const nodeMatches = Array.from(content.matchAll(/(?:node|name|item)\s*=\s*(?:["']([^"']+)["']|_?\[(\d+)\])/gi));
  if (nodeMatches.length === 0) return [];

  return nodeMatches.map((m, idx) => {
    let nodeName = m[1] || "";
    if (!nodeName && m[2]) {
      const refIdx = parseInt(m[2], 10);
      nodeName = dictMap[refIdx] || `[${refIdx}]`;
    }
    return {
      id: `entity-${idx}`,
      index: idx + 1,
      nodeName: nodeName || `Item #${idx + 1}`,
      rawText: m[0],
    };
  });
}

/**
 * Reconstructs a .bf file content with only selected entity items.
 */
export function rebuildBfContent(
  originalContent: string,
  selectedIds: Set<string>,
  allItems: BfEntityItem[]
): string {
  // If all items selected or no items parsed, return original content
  if (allItems.length === 0 || selectedIds.size === allItems.length) {
    return originalContent;
  }

  // Filter selected entity items
  const selectedItems = allItems.filter((item) => selectedIds.has(item.id));

  // Find entities={ ... } block
  const entitiesStartMatch = /(?:entities|nodes|blocks)\s*=\s*\{/i.exec(originalContent);
  if (!entitiesStartMatch) {
    return originalContent;
  }

  const openBracePos = entitiesStartMatch.index + entitiesStartMatch[0].length - 1;
  const closeBracePos = findMatchingBrace(originalContent, openBracePos);

  if (closeBracePos === -1) {
    return originalContent;
  }

  // Build new entities block
  const newEntitiesContent = `\n  ${selectedItems.map((item) => item.rawText).join(",\n  ")}\n`;
  const before = originalContent.substring(0, openBracePos + 1);
  const after = originalContent.substring(closeBracePos);

  return before + newEntitiesContent + after;
}
