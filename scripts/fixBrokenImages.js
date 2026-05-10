// One-off: replace the dead/redirecting image URLs on the imported trips
// with verified-working Unsplash photos.
//
// Usage: SHEET_ID=<id> node scripts/fixBrokenImages.js

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

// (trip_id, day_num) → replacement URL. Only for rows whose original image
// returned non-200 / non-image content-type. All Unsplash IDs verified 200.
const FIXES = {
  // Bali
  'bali-apr-2024:1':  `https://images.unsplash.com/photo-1518002171953-a080ee817e1f${QS}`, // Ubud rice / Bali
  'bali-apr-2024:7':  `https://images.unsplash.com/photo-1573790387438-4da905039392${QS}`, // Nusa Penida / Bali coast
  'bali-apr-2024:11': `https://images.unsplash.com/photo-1604999565976-8913ad2ddb7c${QS}`, // Kuta / Bali sea temple
  // Vietnam
  'vietnam-apr-2025:2': `https://images.unsplash.com/photo-1540541338287-41700207dee6${QS}`, // Halong Bay limestone karsts
  'vietnam-apr-2025:4': `https://images.unsplash.com/photo-1499856871958-5b9627545d1a${QS}`, // Ninh Binh / Vietnam landscape
  'vietnam-apr-2025:8': `https://images.unsplash.com/photo-1473496169904-658ba7c44d8a${QS}`, // Hoi An lanterns
  'vietnam-apr-2025:9': `https://images.unsplash.com/photo-1552832230-c0197dd311b5${QS}`, // Phu Quoc beach
  // Greece + Italy
  'greece-italy-apr-2023:4':  `https://images.unsplash.com/photo-1543429776-2782fc8e1acd${QS}`, // Santorini caldera
  'greece-italy-apr-2023:5':  `https://images.unsplash.com/photo-1558442074-3c19857bc1dc${QS}`, // Mykonos / Greek island
  'greece-italy-apr-2023:12': `https://images.unsplash.com/photo-1500313830540-7b6650a74fd0${QS}`, // Rome Colosseum
};

async function main() {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'itinerary!A:U',
  });
  const rows = r.data.values || [];

  const updates = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const tripId = (row[0] ?? '').toString();
    const dayNum = parseInt((row[1] ?? '').toString(), 10);
    if (!tripId || !Number.isFinite(dayNum)) continue;
    const key = `${tripId}:${dayNum}`;
    if (!(key in FIXES)) continue;
    const sheetRow = i + 1; // 1-based
    updates.push({ range: `itinerary!G${sheetRow}`, values: [[FIXES[key]]] });
    console.log(`  · queued ${key} → ${FIXES[key].slice(0, 60)}...`);
  }

  if (updates.length === 0) { console.log('Nothing to fix.'); return; }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });
  console.log(`✓ Replaced ${updates.length} broken image(s).`);
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
