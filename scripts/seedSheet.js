// Seed script: uploads current itinerary + default settings to your Google Sheet.
// Safe to run multiple times — it replaces the contents of `itinerary` and `settings`
// and does NOT touch `expenses` (you keep logging those through the app).
//
// Usage:
//   1. Place your service-account JSON key at scripts/service-account.json
//      (this file is gitignored — do NOT commit it)
//   2. Set SHEET_ID env or edit DEFAULT_SHEET_ID below
//   3. node scripts/seedSheet.js
//
// Requires: googleapis (already installed)

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { google } = require('googleapis');

const CSV_PATH = path.join(__dirname, '..', 'assets', 'trip.csv');
function loadSeedDays() {
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const num = (v) => {
    const n = parseFloat(String(v ?? '0').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  return parsed.data
    .filter((r) => r.Day && String(r.Day).trim() !== '')
    .map((r) => ({
      dayNum: parseInt(String(r.Day).trim(), 10),
      date: String(r.Date || '').trim(),
      stayCity: String(r.Stay || '').trim(),
      fromCity: String(r.From || '').trim(),
      toCity: String(r.To || '').trim(),
      imageUrl: String(r.Images || '').trim(),
      accommodationName: String(r['Name of Accommodation'] || '').trim(),
      address: String(r.Address || '').trim(),
      location: String(r.Location || '').trim(),
      agent: String(r.Agent || '').trim(),
      paymentStatus: String(r.Payment || '').trim(),
      travelDetails: String(r['Travel Details'] || '').trim(),
      summary: String(r["Summary of day's events"] || '').trim(),
      budgeted: {
        hotels: num(r.Hotels),
        flights: num(r.Flights),
        ferry: num(r.Ferry),
        train: num(r.Train),
        others: num(r.Others),
      },
    }));
}
const SEED_DAYS = loadSeedDays();

const DEFAULT_SHEET_ID = '13grSBTA59EmnK9x7IFJ7vZrMw2-xuCic_BDf0f1oqr8';
const SHEET_ID = process.env.SHEET_ID || DEFAULT_SHEET_ID;
const KEY_PATH = path.join(__dirname, 'service-account.json');

const ITINERARY_HEADERS = [
  'day_num', 'date', 'stay_city', 'from_city', 'to_city', 'image_url',
  'accommodation_name', 'address', 'location', 'agent', 'payment_status',
  'travel_details', 'summary', 'hotels', 'flights', 'ferry', 'train', 'others',
];
const EXPENSE_HEADERS = [
  'id', 'date', 'day_num', 'category', 'amount', 'currency',
  'amount_thb', 'amount_inr', 'note', 'created_at',
];
const SETTING_HEADERS = ['key', 'value'];
const BOOKING_HEADERS = [
  'id', 'type', 'title', 'booking_ref', 'agent', 'address',
  'start_date', 'end_date', 'start_time', 'end_time',
  'amount', 'currency', 'amount_thb', 'amount_inr', 'note',
  'cost_on', 'extras', 'created_at',
];

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    console.error(`\n❌ Missing ${KEY_PATH}`);
    console.error('   Save your service-account JSON key file there and re-run.\n');
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Ensure bookings tab exists (adds it if missing — the other tabs you created manually)
  await ensureTabExists(sheets, 'bookings');

  // Ensure headers in all four tabs
  console.log('→ Writing headers...');
  await setRange(sheets, 'itinerary!A1:R1', [ITINERARY_HEADERS]);
  await setRange(sheets, 'expenses!A1:J1', [EXPENSE_HEADERS]);
  await setRange(sheets, 'settings!A1:B1', [SETTING_HEADERS]);
  await setRange(sheets, 'bookings!A1:R1', [BOOKING_HEADERS]);

  // Clear + write itinerary rows
  console.log(`→ Uploading ${SEED_DAYS.length} itinerary rows...`);
  await clearRange(sheets, 'itinerary!A2:R1000');
  const itinRows = SEED_DAYS.map((d) => [
    d.dayNum, d.date, d.stayCity, d.fromCity, d.toCity, d.imageUrl,
    d.accommodationName, d.address, d.location, d.agent, d.paymentStatus,
    d.travelDetails, d.summary,
    d.budgeted.hotels, d.budgeted.flights, d.budgeted.ferry, d.budgeted.train, d.budgeted.others,
  ]);
  await setRange(sheets, `itinerary!A2:R${1 + itinRows.length}`, itinRows);

  // Upsert default settings (do not clobber existing)
  console.log('→ Writing default settings (fx rate, trip metadata)...');
  const currentSettings = await getRange(sheets, 'settings!A:B');
  const existingKeys = new Set(currentSettings.slice(1).map((r) => (r?.[0] ?? '').toString()));
  const desired = [
    ['fx_inr_per_thb', '2.45'],
    ['trip_title', 'Thailand — Apr 27 to May 9, 2026'],
    ['trip_start', '2026-04-27'],
    ['trip_end', '2026-05-09'],
    ['home_currency', 'INR'],
    ['local_currency', 'THB'],
  ];
  const toAppend = desired.filter(([k]) => !existingKeys.has(k));
  if (toAppend.length > 0) {
    await appendRows(sheets, 'settings!A:B', toAppend);
  }

  console.log('\n✅ Seed complete.');
  console.log(`   Sheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit\n`);
}

async function setRange(sheets, range, values) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function getRange(sheets, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  return res.data.values ?? [];
}

async function clearRange(sheets, range) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range,
  });
}

async function appendRows(sheets, range, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

async function ensureTabExists(sheets, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === title);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
  console.log(`  · created new tab '${title}'`);
}

main().catch((e) => {
  console.error('\n❌ Seed failed:', e?.errors?.[0]?.message || e?.message || e);
  process.exit(1);
});
