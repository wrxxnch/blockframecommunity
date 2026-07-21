import { Post, PostWithContent } from "../types";

export interface SyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  count: number;
}

const BACKUP_FILE_NAME = "BlockFrame Library Backup";

/**
 * Searches Google Drive for an existing spreadsheet named "BlockFrame Library Backup".
 * If not found, creates a new one with correct headers.
 */
export async function findOrCreateBackupSheet(accessToken: string): Promise<{ id: string; url: string; isNew: boolean }> {
  // 1. Search for the file in Drive
  const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    console.error("Erro ao buscar planilha no Drive:", errorText);
    throw new Error(`Falha ao buscar planilha no Google Drive: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  
  if (searchData.files && searchData.files.length > 0) {
    // Found existing sheet
    const file = searchData.files[0];
    return {
      id: file.id,
      url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
      isNew: false,
    };
  }

  // 2. Create a new spreadsheet since it wasn't found
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: BACKUP_FILE_NAME,
      },
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error("Erro ao criar planilha:", errorText);
    throw new Error(`Falha ao criar planilha no Google Sheets: ${createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 3. Initialize headers in the new sheet
  const headers = [
    "ID",
    "Título",
    "Autor",
    "Categoria",
    "Tags",
    "Nome do Arquivo",
    "Tamanho (KB)",
    "Data de Criação (LocalTime)",
    "Código do Bloco (.bf)",
    "Likes/Curtidas",
    "URL do Print (Capa)",
  ];

  await writeSheetValues(accessToken, spreadsheetId, "Sheet1!A1:K1", [headers]);

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    isNew: true,
  };
}

/**
 * Helper to write/update specific range of cells in Google Sheets
 */
async function writeSheetValues(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Erro ao escrever valores na planilha:", errorText);
    throw new Error(`Erro ao salvar dados na planilha: ${res.statusText}`);
  }
}

/**
 * Syncs the local list of posts to the Google Sheet.
 * It reads the sheet, matches existing records, and updates or appends.
 */
export async function syncPostsToSheet(
  accessToken: string,
  spreadsheetId: string,
  posts: PostWithContent[]
): Promise<{ added: number; updated: number; url: string }> {
  // 1. Get current values from the sheet to prevent duplicates and keep likes updated
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:K`;
  const getRes = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!getRes.ok) {
    throw new Error(`Falha ao carregar dados existentes da planilha: ${getRes.statusText}`);
  }

  const getData = await getRes.json();
  const rows: any[][] = getData.values || [];
  
  // Find indices of posts by ID in the sheet (excluding header)
  const header = rows[0] || [];
  const idColIndex = 0; // Column A

  const sheetPostsMap = new Map<string, number>(); // ID -> row index (1-based because sheet headers is row 1)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[idColIndex]) {
      sheetPostsMap.set(String(row[idColIndex]), i + 1);
    }
  }

  let added = 0;
  let updated = 0;

  // We will prepare batch updates to make it fast
  const valueRanges: any[] = [];
  const appendRows: any[][] = [];

  for (const post of posts) {
    const dateStr = new Date(post.createdAt).toLocaleString("pt-BR");
    const rowData = [
      post.id,
      post.title,
      post.author,
      post.category,
      post.tags ? post.tags.join(", ") : "",
      post.filename,
      post.sizeKb,
      dateStr,
      post.content || "",
      post.likes || 0,
      post.imageUrl || "",
    ];

    const existingRowNumber = sheetPostsMap.get(post.id);
    if (existingRowNumber) {
      // Exists in Sheet, update row
      valueRanges.push({
        range: `Sheet1!A${existingRowNumber}:K${existingRowNumber}`,
        majorDimension: "ROWS",
        values: [rowData],
      });
      updated++;
    } else {
      // Doesn't exist, queue for append
      appendRows.push(rowData);
      added++;
    }
  }

  // 1. Perform Updates (Batch Update)
  if (valueRanges.length > 0) {
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    const batchRes = await fetch(batchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: valueRanges,
      }),
    });

    if (!batchRes.ok) {
      const text = await batchRes.text();
      console.error("Batch update failed:", text);
      throw new Error("Falha ao atualizar linhas existentes na planilha.");
    }
  }

  // 2. Perform Appends
  if (appendRows.length > 0) {
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=RAW`;
    const appendRes = await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range: "Sheet1!A1",
        majorDimension: "ROWS",
        values: appendRows,
      }),
    });

    if (!appendRes.ok) {
      const text = await appendRes.text();
      console.error("Append failed:", text);
      throw new Error("Falha ao adicionar novas linhas na planilha.");
    }
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { added, updated, url };
}

/**
 * Imports posts from the Google Sheet and merges them into the local database
 */
export async function importPostsFromSheet(accessToken: string, spreadsheetId: string): Promise<any[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:K`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao ler dados da planilha para importação: ${res.statusText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  
  if (rows.length <= 1) {
    return []; // No data or only header
  }

  const importedPosts: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const id = row[0] ? String(row[0]) : `p_sheet_${Date.now().toString(36)}_${i}`;
    const title = row[1] ? String(row[1]) : "Sem título";
    const author = row[2] ? String(row[2]) : "Anônimo";
    const category = row[3] ? String(row[3]) : "Outro";
    const tagsRaw = row[4] ? String(row[4]) : "";
    const filename = row[5] ? String(row[5]) : "file.bf";
    const sizeKb = row[6] ? Number(row[6]) || 1 : 1;
    const createdAtRaw = row[7] ? String(row[7]) : "";
    const content = row[8] ? String(row[8]) : "";
    const likes = row[9] ? Number(row[9]) || 0 : 0;
    const imageUrl = row[10] ? String(row[10]) : undefined;

    // Parse created date
    let createdAt = Date.now();
    if (createdAtRaw) {
      const parsedDate = Date.parse(createdAtRaw);
      if (!isNaN(parsedDate)) {
        createdAt = parsedDate;
      }
    }

    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    importedPosts.push({
      id,
      title,
      author,
      category,
      tags,
      filename,
      sizeKb,
      passcode: "sheet_imported", // default passcode
      likes,
      createdAt,
      content,
      imageUrl,
    });
  }

  return importedPosts;
}
