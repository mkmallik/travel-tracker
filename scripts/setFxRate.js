// Set the trip's FX rate AND recompute amount_thb / amount_inr columns
// on every expense and booking row. Useful when the rate changes during
// or before a trip and you want the sheet's static conversion columns
// to reflect the new rate.
//
// The app's runtime totals already use the current rate from the trip row,
// so this script's main job is to keep the sheet's stored snapshots
// consistent with that rate.
//
// Usage:
//   SHEET_ID=<sheet-id> node scripts/setFxRate.js <rate>
// Example:
//   SHEET_ID=13grSBTA59EmnK9x7IFJ7vZrMw2-xuCic_BDf0f1oqr8 \
//     node scripts/setFxRate.js 2.91

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) {
  console.error('\n❌ Missing SHEET_ID env var.\n');
  process.exit(1);
}

const newRate = parseFloat(process.argv[2]);
if (!Number.isFinite(newRate) || newRate <= 0) {
  console.error('\n❌ Usage: SHEET_ID=<id> node scripts/setFxRate.js <rate>\n');
  process.exit(1);
}

const KEY_PATH = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(KEY_PATH)) {
  console.error(`\n❌ Missing ${KEY_PATH}\n`);
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const round2 = (n) => Math.round(n * 100) / 100;
const get = async (range) => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  return r.data.values || [];
};

async function main() {
  console.log(`\n→ Target rate: 1 THB = ${newRate} INR\n`);

  const updates = [];
  let tripsTouched = 0, settingsTouched = 0, expensesTouched = 0, bookingsTouched = 0;

  // 1. Update fx_rate column on every trip row (col G = index 7)
  const tripRows = await get('trips!A:K');
  for (let i = 1; i < tripRows.length; i++) {
    if (!(tripRows[i] || [])[0]) continue;
    updates.push({ range: `trips!G${i + 1}`, values: [[newRate]] });
    tripsTouched++;
  }

  // 2. Update legacy settings row (key fx_inr_per_thb -> col B)
  const settingRows = await get('settings!A:B');
  let settingFound = false;
  for (let i = 1; i < settingRows.length; i++) {
    if (((settingRows[i] || [])[0] ?? '').toString().trim() === 'fx_inr_per_thb') {
      updates.push({ range: `settings!B${i + 1}`, values: [[newRate]] });
      settingsTouched++;
      settingFound = true;
    }
  }
  if (!settingFound) {
    // Append a new row so future reads find it
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'settings!A:B',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [['fx_inr_per_thb', newRate]] },
    });
    settingsTouched++;
  }

  // 3. Recompute expenses (col F=amount, G=currency, H=amount_thb, I=amount_inr)
  const expRows = await get('expenses!A:K');
  for (let i = 1; i < expRows.length; i++) {
    const row = expRows[i] || [];
    if (!row[0]) continue;
    const amount = parseFloat(row[5]);
    if (!Number.isFinite(amount)) continue;
    const currency = (row[6] || 'THB').toString().toUpperCase();
    const thb = currency === 'THB' ? amount : amount / newRate;
    const inr = currency === 'INR' ? amount : amount * newRate;
    updates.push({
      range: `expenses!H${i + 1}:I${i + 1}`,
      values: [[round2(thb), round2(inr)]],
    });
    expensesTouched++;
  }

  // 4. Recompute bookings (col L=amount, M=currency, N=amount_thb, O=amount_inr)
  const bookRows = await get('bookings!A:S');
  for (let i = 1; i < bookRows.length; i++) {
    const row = bookRows[i] || [];
    if (!row[0]) continue;
    const amount = parseFloat(row[11]);
    if (!Number.isFinite(amount)) continue;
    const currency = (row[12] || 'THB').toString().toUpperCase();
    const thb = currency === 'THB' ? amount : amount / newRate;
    const inr = currency === 'INR' ? amount : amount * newRate;
    updates.push({
      range: `bookings!N${i + 1}:O${i + 1}`,
      values: [[round2(thb), round2(inr)]],
    });
    bookingsTouched++;
  }

  if (updates.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  // Apply in chunks of 100 to avoid huge single requests
  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: chunk },
    });
  }

  console.log(`✓ Trips fx_rate           : ${tripsTouched}`);
  console.log(`✓ Settings rows           : ${settingsTouched}`);
  console.log(`✓ Expenses recomputed     : ${expensesTouched}`);
  console.log(`✓ Bookings recomputed     : ${bookingsTouched}`);
  console.log(`\n✅ Done. Total updates: ${updates.length}`);
  console.log(`   Open the app and tap Refresh on the Summary tab.\n`);
}

main().catch((e) => {
  console.error('\n❌ Failed:', e?.errors?.[0]?.message || e?.message || e);
  process.exit(1);
});
