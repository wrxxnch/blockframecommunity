export interface BfEntityItem {
  id: string;
  index: number;
  nodeName: string;
  rawText: string;
}

/**
 * Parses a .bf string content and extracts dictionary definitions & entity blocks.
 */
export function parseBfContent(content: string): BfEntityItem[] {
  if (!content || typeof content !== "string") return [];

  // 1. Build string dictionary map: [1]="mcl farming:cookie", etc.
  const dictMap: Record<number, string> = {};
  const dictRegex = /\[(\d+)\]\s*=\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = dictRegex.exec(content)) !== null) {
    const idx = parseInt(match[1], 10);
    dictMap[idx] = match[2].trim();
  }

  // 2. Find "entities" section inside content
  const entitiesStartMatch = /entities\s*=\s*\{/i.exec(content);
  if (!entitiesStartMatch) {
    // Fallback: search for any node="...." or node=... occurrences if format differs
    return fallbackParseNodes(content, dictMap);
  }

  const startPos = entitiesStartMatch.index + entitiesStartMatch[0].length;
  
  // Find matching closing brace for entities={ ... }
  let depth = 1;
  let endPos = -1;
  for (let i = startPos; i < content.length; i++) {
    const char = content[i];
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        endPos = i;
        break;
      }
    }
  }

  if (endPos === -1) {
    return fallbackParseNodes(content, dictMap);
  }

  const entitiesBlock = content.substring(startPos, endPos);

  // 3. Extract each top-level entity { ... } inside entitiesBlock
  const entityChunks: string[] = [];
  let chunkDepth = 0;
  let chunkStart = -1;

  for (let i = 0; i < entitiesBlock.length; i++) {
    const char = entitiesBlock[i];
    if (char === "{") {
      if (chunkDepth === 0) {
        chunkStart = i;
      }
      chunkDepth++;
    } else if (char === "}") {
      chunkDepth--;
      if (chunkDepth === 0 && chunkStart !== -1) {
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

    // Check node="something" or node='something'
    const stringNodeMatch = /node\s*=\s*["']([^"']+)["']/i.exec(chunk);
    if (stringNodeMatch) {
      nodeName = stringNodeMatch[1];
    } else {
      // Check node=_[1] or node=[1] or node=dict[1] or node=1
      const refNodeMatch = /node\s*=\s*_?\[(\d+)\]/i.exec(chunk);
      if (refNodeMatch) {
        const refIdx = parseInt(refNodeMatch[1], 10);
        nodeName = dictMap[refIdx] || `[${refIdx}]`;
      } else {
        // Check node=node_name
        const idNodeMatch = /node\s*=\s*([a-zA-Z0-9_:.-]+)/i.exec(chunk);
        if (idNodeMatch) {
          nodeName = idNodeMatch[1];
        } else {
          // Look for any string like "mcl_..." inside chunk
          const mclMatch = /["'](mcl_[a-zA-Z0-9_:.-]+)["']/i.exec(chunk);
          if (mclMatch) {
            nodeName = mclMatch[1];
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
  const nodeMatches = Array.from(content.matchAll(/node\s*=\s*(?:["']([^"']+)["']|_?\[(\d+)\])/gi));
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
  const entitiesStartMatch = /entities\s*=\s*\{/i.exec(originalContent);
  if (!entitiesStartMatch) {
    return originalContent;
  }

  const startPos = entitiesStartMatch.index + entitiesStartMatch[0].length;
  
  let depth = 1;
  let endPos = -1;
  for (let i = startPos; i < originalContent.length; i++) {
    const char = originalContent[i];
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        endPos = i;
        break;
      }
    }
  }

  if (endPos === -1) {
    return originalContent;
  }

  // Build new entities block
  const newEntitiesContent = `\n  ${selectedItems.map((item) => item.rawText).join(",\n  ")}\n`;
  const before = originalContent.substring(0, startPos);
  const after = originalContent.substring(endPos);

  return before + newEntitiesContent + after;
}
