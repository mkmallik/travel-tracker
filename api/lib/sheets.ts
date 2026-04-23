import { google, sheets_v4 } from 'googleapis';
import { SHEETS } from './schema';

let cached: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (cached) return cached;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyRaw = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !keyRaw) {
    throw new Error(
      'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars'
    );
  }
  // Vercel/Node treats \n inside env vars as literal backslash-n; we normalize.
  const key = keyRaw.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  cached = google.sheets({ version: 'v4', auth });
  return cached;
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('Missing GOOGLE_SHEET_ID env var');
  return id;
}

export async function readRange(range: string): Promise<string[][]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return (res.data.values as string[][] | undefined) ?? [];
}

export async function appendRow(tab: string, row: (string | number)[]): Promise<void> {
  const sheets = getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${tab}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

export async function updateRow(tab: string, rowNumber: number, row: (string | number)[]): Promise<void> {
  const sheets = getClient();
  const endCol = String.fromCharCode('A'.charCodeAt(0) + row.length - 1);
  const range = `${tab}!A${rowNumber}:${endCol}${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

export async function deleteRowByIndex(tab: string, rowIndex0Based: number): Promise<void> {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: getSheetId() });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === tab);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new Error(`Sheet tab not found: ${tab}`);
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties!.sheetId!,
              dimension: 'ROWS',
              startIndex: rowIndex0Based,
              endIndex: rowIndex0Based + 1,
            },
          },
        },
      ],
    },
  });
}

export async function ensureHeaders(tab: string, headers: readonly string[]): Promise<void> {
  const sheets = getClient();
  const existing = await readRange(`${tab}!1:1`);
  const haveRow = existing[0] ?? [];
  const need = headers.join('\n');
  const have = haveRow.join('\n');
  if (need !== have) {
    const endCol = String.fromCharCode('A'.charCodeAt(0) + headers.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${tab}!A1:${endCol}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [Array.from(headers)] },
    });
  }
}

export { SHEETS };
