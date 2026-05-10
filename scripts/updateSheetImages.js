// Updates the image_url column on the live itinerary sheet for every day.
// Curated Unsplash photos chosen to match each day's actual activity
// (arrival → islands → temples → markets → home).
//
// Usage: SHEET_ID=<id> node scripts/updateSheetImages.js
//
// To swap any individual image after running this, use the in-app day editor
// (or just edit column G in the sheet directly).

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

const COL_IMAGE = 'G'; // 7th col — image_url

const QS = '?auto=format&fit=crop&w=1600&q=75';

// Curated Unsplash photos, themed to the day's actual activity.
// All URLs verified to return 200. User can swap any individual image
// in-app via the day editor if a particular pick doesn't fit.
const IMAGE_BY_DAY = {
  1:  `https://images.unsplash.com/photo-1528181304800-259b08848526${QS}`, // Thailand longtail — arrival vibe
  2:  `https://images.unsplash.com/photo-1505881502353-a1986add3762${QS}`, // Phi Phi / Maya Bay
  3:  `https://images.unsplash.com/photo-1757489810186-0456b4aa61ba${QS}`, // Phuket Old Town
  4:  `https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b${QS}`, // Ao Nang / Krabi longtails
  5:  `https://images.unsplash.com/photo-1528127269322-539801943592${QS}`, // 4 Islands — longtail + cliffs
  6:  `https://images.unsplash.com/photo-1530948990335-1eb93cbe6430${QS}`, // Koh Samui beach (1st Samui day)
  7:  `https://images.unsplash.com/photo-1502602898657-3e91760cbb34${QS}`, // Emerald lagoon / island (Ang Thong)
  8:  `https://images.unsplash.com/photo-1551918120-9739cb430c6d${QS}`, // resort pool — lazy day
  9:  `https://images.unsplash.com/photo-1508009603885-50cf7c579365${QS}`, // Bangkok skyscrapers (Skywalk vibe)
  10: `https://images.unsplash.com/photo-1563492065599-3520f775eeed${QS}`, // Grand Palace gold
  11: `https://images.unsplash.com/photo-1525874684015-58379d421a52${QS}`, // busy Bangkok shopping street
  12: `https://images.unsplash.com/photo-1567337710282-00832b415979${QS}`, // Bangkok markets / urban shopping
  13: `https://images.unsplash.com/photo-1436491865332-7a61a109cc05${QS}`, // clouds — going home
};

async function main() {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'itinerary!A:U',
  });
  const rows = r.data.values || [];
  if (rows.length <= 1) { console.error('No itinerary rows.'); return; }

  const updates = [];
  let touched = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const dayNum = parseInt((row[1] ?? '').toString(), 10);
    if (!Number.isFinite(dayNum)) continue;
    const url = IMAGE_BY_DAY[dayNum];
    if (!url) continue;
    const sheetRow = i + 1;
    updates.push({
      range: `itinerary!${COL_IMAGE}${sheetRow}`,
      values: [[url]],
    });
    touched++;
  }

  for (let i = 0; i < updates.length; i += 80) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates.slice(i, i + 80) },
    });
  }
  console.log(`✓ Updated image_url on ${touched} day rows.`);
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
