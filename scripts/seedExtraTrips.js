// Adds three past trips (Bali 2024, Vietnam 2025, Greece+Italy 2023) to the
// live sheet, populating the trips, itinerary, and expenses tabs.
//
// Reads data extracted from the user's xlsx files (parsed beforehand with
// the Python helper into scripts/data/extra-trips.json).
//
// Idempotent — skips trip rows whose id is already present, and uses
// deterministic expense ids so re-runs don't duplicate.
//
// Usage: SHEET_ID=<id> node scripts/seedExtraTrips.js

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

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'extra-trips.json'), 'utf8'));

const TRIP_META = {
  'bali-apr-2024': {
    title: 'Bali — Apr 28 to May 12, 2024',
    start_date: '2024-04-28',
    end_date: '2024-05-12',
    home_currency: 'INR',
    local_currency: 'IDR',
    fx_rate: 0.0051, // 1 IDR ≈ 0.0051 INR (2024 rate)
    status: 'completed',
    note: 'Indonesia — Ubud, Nusa Penida, Gili Trawangan, Kuta',
  },
  'vietnam-apr-2025': {
    title: 'Vietnam — Apr 10 to Apr 23, 2025',
    start_date: '2025-04-10',
    end_date: '2025-04-23',
    home_currency: 'INR',
    local_currency: 'VND',
    fx_rate: 0.0033, // 1 VND ≈ 0.0033 INR (2025 rate)
    status: 'completed',
    note: 'Vietnam — Hanoi, Halong Bay, Hoi An, Phu Quoc, Ho Chi Minh',
  },
  'greece-italy-apr-2023': {
    title: 'Greece + Italy — Apr 15 to May 2, 2023',
    start_date: '2023-04-15',
    end_date: '2023-05-02',
    home_currency: 'INR',
    local_currency: 'EUR',
    fx_rate: 93.0, // 1 EUR ≈ 93 INR (2023 rate)
    status: 'completed',
    note: 'Greece + Italy — Athens, Santorini, Mykonos, Amalfi Coast, Rome, Florence, Venice, Milan',
  },
};

const TRIP_HEADERS = [
  'id','title','start_date','end_date','home_currency','local_currency','fx_rate',
  'cover_image_url','status','note','created_at',
];
const ITINERARY_HEADERS = [
  'trip_id','day_num','date','stay_city','from_city','to_city','image_url',
  'accommodation_name','address','location','agent','payment_status',
  'travel_details','summary','hotels','flights','ferry','train','others',
  'day_summary','blog',
];
const EXPENSE_HEADERS = [
  'id','trip_id','date','day_num','category','amount','currency',
  'amount_thb','amount_inr','note','created_at',
];

async function getRange(range) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  return r.data.values || [];
}
async function appendRows(range, values) {
  if (!values.length) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID, range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

async function main() {
  const tripsExisting = await getRange('trips!A:K');
  const existingTripIds = new Set(tripsExisting.slice(1).map((r) => (r?.[0] ?? '').toString()));

  const expExisting = await getRange('expenses!A:A');
  const existingExpIds = new Set(expExisting.slice(1).map((r) => (r?.[0] ?? '').toString()));

  const tripRowsToAdd = [];
  const itinRowsToAdd = [];
  const expRowsToAdd = [];

  const now = Date.now();
  let nowOffset = 0;

  for (const [tripId, days] of Object.entries(DATA)) {
    const meta = TRIP_META[tripId];
    if (!meta) { console.warn(`No metadata for ${tripId}, skipping.`); continue; }

    // Cover image: take the day-1 image, fall back to first non-empty
    const cover = days[0]?.image || days.find((d) => d.image)?.image || '';

    if (!existingTripIds.has(tripId)) {
      tripRowsToAdd.push([
        tripId, meta.title, meta.start_date, meta.end_date,
        meta.home_currency, meta.local_currency, String(meta.fx_rate),
        cover, meta.status, meta.note, String(now + nowOffset++),
      ]);
    } else {
      console.log(`  · trips already has ${tripId}, skipping trip row`);
    }

    // Itinerary rows — write all (no per-row idempotency check; we assume
    // the only way these run is on a fresh tripId)
    for (const d of days) {
      itinRowsToAdd.push([
        tripId, d.day_num, d.date, d.stay, d.from, d.to, d.image,
        d.accom, d.address, '', d.agent, d.payment,
        d.travel, d.summary,
        0, 0, 0, 0, 0,        // budget cols zeroed — actuals live in expenses
        '',                   // day_summary (empty for now)
        '',                   // blog (empty for now)
      ]);
    }

    // Expense rows — one per non-zero category per day
    for (const d of days) {
      for (const [category, amount] of Object.entries(d.expenses)) {
        if (!amount || amount <= 0) continue;
        // Deterministic id so re-runs don't duplicate
        const eid = `${tripId}-d${d.day_num}-${category.toLowerCase()}`;
        if (existingExpIds.has(eid)) continue;
        expRowsToAdd.push([
          eid, tripId, d.date, d.day_num, category,
          amount, 'INR',
          0,        // amount_thb (not tracked for past trips — pre-converted)
          amount,   // amount_inr
          '',       // note
          String(now + nowOffset++),
        ]);
      }
    }
  }

  // Push in order — trips first (so itinerary FKs are valid), then itinerary, then expenses
  console.log(`→ trips:    +${tripRowsToAdd.length}`);
  await appendRows('trips!A:K', tripRowsToAdd);

  console.log(`→ itinerary: +${itinRowsToAdd.length}`);
  await appendRows('itinerary!A:U', itinRowsToAdd);

  console.log(`→ expenses:  +${expRowsToAdd.length}`);
  // Expenses are the chunkiest list — split into batches to be polite
  for (let i = 0; i < expRowsToAdd.length; i += 200) {
    await appendRows('expenses!A:K', expRowsToAdd.slice(i, i + 200));
  }

  console.log('\n✅ Done.');
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
