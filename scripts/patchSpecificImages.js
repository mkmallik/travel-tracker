// Targeted image patch script. Lets you swap specific image URLs (trip
// covers or per-day itinerary images) in one shot — handy when an Unsplash
// pick misses the mark or you want to drop in a Google Photos share link.
//
// For Google Photos URLs (https://photos.app.goo.gl/...), this script
// follows the share page and extracts the embedded direct image URL on
// lh3.googleusercontent.com. Plain http(s) URLs are stored as-is.
//
// Edit the PATCHES map below before running.
//
// Usage: SHEET_ID=<id> node scripts/patchSpecificImages.js

const fs = require('fs');
const path = require('path');
const https = require('https');
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

// ── EDIT HERE ────────────────────────────────────────────────────────
// `trips:<id>` → updates the trip cover image
// `<trip_id>:<day_num>` → updates a specific itinerary day image
const PATCHES = {
  // Bali cover — was Ubud-ish but user said unrelated; trying a Bali
  // beach/temple shot from a different ID. Swap to a Google Photos link
  // any time for a more authentic photo.
  'trips:bali-apr-2024': `https://images.unsplash.com/photo-1604999565976-8913ad2ddb7c${QS}`,
  // Bangkok Day 12 — skyscrapers retry
  'thailand-apr-2026:12': `https://images.unsplash.com/photo-1503152394-c571994fd383${QS}`,
  // Bangkok Day 13 — busy streets retry
  'thailand-apr-2026:13': `https://images.unsplash.com/photo-1517502884422-41eaead166d4${QS}`,
};
// ─────────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.destroy();
        resolve(get(r.headers.location));
        return;
      }
      let body = '';
      r.setEncoding('utf8');
      r.on('data', (c) => body += c);
      r.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function resolveUrl(url) {
  if (!url.includes('photos.app.goo.gl') && !url.includes('photos.google.com')) return url;
  const html = await get(url);
  const matches = [...html.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^"\s]+/g)].map(m => m[0]);
  const bases = [...new Set(matches.map(u => u.split('=')[0]))].filter(b => b.includes('/pw/'));
  if (!bases.length) throw new Error(`Couldn't extract image from ${url}`);
  return bases[0] + '=w1600';
}

async function main() {
  // Resolve any Google Photos shares first
  const resolved = {};
  for (const [k, v] of Object.entries(PATCHES)) {
    resolved[k] = await resolveUrl(v);
    if (resolved[k] !== v) console.log(`  · ${k}: resolved ${v.slice(0,50)}... → ${resolved[k].slice(0,60)}...`);
  }

  const tripUpdates = [];
  const dayUpdates = [];

  // Trips updates
  const tripPatches = Object.entries(resolved).filter(([k]) => k.startsWith('trips:'));
  if (tripPatches.length) {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'trips!A:H' });
    const rows = r.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const tid = (rows[i]?.[0] ?? '').toString();
      const match = tripPatches.find(([k]) => k === `trips:${tid}`);
      if (!match) continue;
      tripUpdates.push({ range: `trips!H${i+1}`, values: [[match[1]]] });
      console.log(`  · trips/${tid} cover updated`);
    }
  }

  // Itinerary updates
  const dayPatches = Object.entries(resolved).filter(([k]) => !k.startsWith('trips:'));
  if (dayPatches.length) {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'itinerary!A:G' });
    const rows = r.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const tid = (rows[i]?.[0] ?? '').toString();
      const day = parseInt((rows[i]?.[1] ?? '').toString(), 10);
      const match = dayPatches.find(([k]) => k === `${tid}:${day}`);
      if (!match) continue;
      dayUpdates.push({ range: `itinerary!G${i+1}`, values: [[match[1]]] });
      console.log(`  · ${tid} day ${day} image updated`);
    }
  }

  const all = [...tripUpdates, ...dayUpdates];
  if (!all.length) { console.log('Nothing matched.'); return; }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: all },
  });
  console.log(`✓ Updated ${all.length} cell(s).`);
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
