// Replace trip cover_image_url for the imported trips with verified
// Unsplash photos (the originals from the xlsx were random hotelier /
// blog URLs that mostly redirected or 404'd).
//
// Usage: SHEET_ID=<id> node scripts/fixTripCovers.js

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

const QS = '?auto=format&fit=crop&w=1600&q=75';

const COVER_BY_TRIP = {
  'bali-apr-2024':         `https://images.unsplash.com/photo-1518002171953-a080ee817e1f${QS}`, // Bali / Ubud
  'vietnam-apr-2025':      `https://images.unsplash.com/photo-1540541338287-41700207dee6${QS}`, // Halong Bay
  'greece-italy-apr-2023': `https://images.unsplash.com/photo-1543429776-2782fc8e1acd${QS}`, // Santorini
};

async function main() {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'trips!A:K',
  });
  const rows = r.data.values || [];
  const updates = [];
  for (let i = 1; i < rows.length; i++) {
    const tid = (rows[i]?.[0] ?? '').toString();
    if (!(tid in COVER_BY_TRIP)) continue;
    const sheetRow = i + 1;
    updates.push({ range: `trips!H${sheetRow}`, values: [[COVER_BY_TRIP[tid]]] });
    console.log(`  · ${tid} cover → ${COVER_BY_TRIP[tid].slice(0, 60)}...`);
  }
  if (!updates.length) { console.log('Nothing to update.'); return; }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });
  console.log(`✓ Replaced ${updates.length} trip cover(s).`);
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
