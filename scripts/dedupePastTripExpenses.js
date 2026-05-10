// One-off cleanup: the past-trip importer (seedExtraTrips.js) created
// expense rows for every non-zero category, AND fillExtraTripsRichData.js
// later created bookings for the same hotels/flights/ferries/trains. The
// Summary screen sums (expenses + bookings) and was therefore double-counting
// big-ticket items for the imported trips.
//
// This script removes the Hotels/Flights/Ferry/Train expense rows we
// previously generated for the past trips, leaving only the on-trip
// categories (Cabs/Food/Activities/Others) — same shape as the manually
// logged Thailand trip where bookings hold the prepaid stuff and
// expenses hold the on-the-ground spending.
//
// Idempotent — safe to re-run.
//
// Usage: SHEET_ID=<id> node scripts/dedupePastTripExpenses.js

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) { console.error('Missing SHEET_ID'); process.exit(1); }
const KEY_PATH = path.join(__dirname, 'service-account.json');
const creds = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
const auth = new google.auth.JWT({
  email: creds.client_email, key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const PAST_TRIP_IDS = new Set(['bali-apr-2024', 'vietnam-apr-2025', 'greece-italy-apr-2023']);
const DUP_CATEGORIES = new Set(['Hotels', 'Flights', 'Ferry', 'Train']);

async function main() {
  // Need to find the sheetId for 'expenses' first to use deleteRange
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const expensesSheet = meta.data.sheets?.find((s) => s.properties?.title === 'expenses');
  if (!expensesSheet) { console.error('No expenses tab.'); process.exit(1); }
  const expSheetId = expensesSheet.properties.sheetId;

  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'expenses!A:K',
  });
  const rows = r.data.values || [];

  // Collect 0-based row indices to delete (rows[1..] are data; index 0 is header)
  const indicesToDelete = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const tid = (row[1] ?? '').toString();
    const cat = (row[4] ?? '').toString();
    if (!PAST_TRIP_IDS.has(tid)) continue;
    if (!DUP_CATEGORIES.has(cat)) continue;
    indicesToDelete.push(i);
  }

  if (!indicesToDelete.length) {
    console.log('Nothing to delete — already clean.');
    return;
  }

  // Sort descending so we can delete from the bottom up without shifting
  // earlier indices.
  indicesToDelete.sort((a, b) => b - a);

  // Group consecutive runs into single deleteDimension requests
  const requests = [];
  let runStart = indicesToDelete[0];
  let runEnd = indicesToDelete[0];
  for (let k = 1; k < indicesToDelete.length; k++) {
    const cur = indicesToDelete[k];
    if (cur === runStart - 1) {
      runStart = cur;
    } else {
      requests.push({
        deleteDimension: {
          range: {
            sheetId: expSheetId,
            dimension: 'ROWS',
            startIndex: runStart,
            endIndex: runEnd + 1,
          },
        },
      });
      runStart = cur; runEnd = cur;
    }
  }
  requests.push({
    deleteDimension: {
      range: {
        sheetId: expSheetId,
        dimension: 'ROWS',
        startIndex: runStart,
        endIndex: runEnd + 1,
      },
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  console.log(`✓ Deleted ${indicesToDelete.length} duplicate expense row(s) across ${requests.length} contiguous range(s).`);
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
