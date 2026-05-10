// Phase-2 import for the three past trips (Bali, Vietnam, Greece+Italy):
//   - generates Booking rows from each itinerary day's hotel/flight/ferry amounts
//   - inserts the URL Links from the Sites tab of each xlsx
//   - generates a per-day Blog entry from real activity / food / travel data
//
// Reads data the Python helper already extracted into scripts/data/.
// Idempotent: bookings + links use deterministic ids so re-runs don't double.
//
// Usage: SHEET_ID=<id> node scripts/fillExtraTripsRichData.js

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

const EXTRAS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'extra-trips-extras.json'), 'utf8'));

const TRIP_IDS = ['bali-apr-2024', 'vietnam-apr-2025', 'greece-italy-apr-2023'];

// ───────────────── helpers ─────────────────

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

function detectFlightTitle(travel) {
  if (!travel) return '';
  const lines = travel.split('\n').map((l) => l.trim()).filter(Boolean);
  // Find first line that looks like a flight (PNR, airline code, "Flight")
  const flightLine = lines.find((l) => /flight|PNR|6E[\s-]?\d|FD[\s-]?\d|GF[\s-]?\d|EY[\s-]?\d|VJ[\s-]?\d|A3[\s-]?\d/i.test(l));
  return flightLine || lines[0] || '';
}

function detectTransferTitle(travel) {
  if (!travel) return '';
  const lines = travel.split('\n').map((l) => l.trim()).filter(Boolean);
  const t = lines.find((l) => /ferry|train|bus|van|catamaran|transfer/i.test(l));
  return t || lines[0] || '';
}

// ───────────────── booking generation ─────────────────
//
// For each itinerary day, look at the four "real" amounts (hotels_amt,
// flights_amt, ferry_amt, train_amt). Create a booking row for each
// non-zero one, using the day's accom/agent/address/travel as context.
//
// For hotel bookings: look forward through the itinerary to find when
// the accom changes (or trip ends) — use that as end_date so the
// booking spans the actual nights.

function buildBookings(tripId) {
  const days = EXTRAS[tripId].itinerary.sort((a, b) => a.day_num - b.day_num);
  const bookings = [];

  for (let i = 0; i < days.length; i++) {
    const d = days[i];

    // Hotel — only on the day the booking was charged (hotels_amt > 0)
    if (d.hotels_amt > 0 && d.accom) {
      // Find the last day this accom is the stay
      let endIdx = i;
      for (let j = i; j < days.length; j++) {
        if (days[j].accom === d.accom) endIdx = j;
        else if (days[j].accom) break;
      }
      const endDate = days[endIdx].date || d.date;
      bookings.push({
        id: `${tripId}-hotel-d${d.day_num}`,
        trip_id: tripId,
        type: 'hotel',
        title: d.accom,
        booking_ref: '',
        agent: d.agent || '',
        address: d.address || '',
        start_date: d.date,
        end_date: endDate,
        start_time: '',
        end_time: '',
        amount: d.hotels_amt,
        currency: 'INR',
        amount_thb: 0,
        amount_inr: d.hotels_amt,
        note: d.payment || '',
        cost_on: 'start',
        extras: '{}',
      });
    }

    // Flight
    if (d.flights_amt > 0 && d.travel) {
      const title = detectFlightTitle(d.travel) || `Flight from ${d.from || '—'} to ${d.to || d.stay || '—'}`;
      bookings.push({
        id: `${tripId}-flight-d${d.day_num}`,
        trip_id: tripId,
        type: 'flight',
        title: title.slice(0, 200),
        booking_ref: '',
        agent: d.agent || '',
        address: '',
        start_date: d.date,
        end_date: d.date,
        start_time: '',
        end_time: '',
        amount: d.flights_amt,
        currency: 'INR',
        amount_thb: 0,
        amount_inr: d.flights_amt,
        note: d.travel.slice(0, 500),
        cost_on: 'start',
        extras: JSON.stringify({ from: d.from || '', to: d.to || d.stay || '' }),
      });
    }

    // Ferry / Train → 'transfer'
    if (d.ferry_amt > 0) {
      bookings.push({
        id: `${tripId}-ferry-d${d.day_num}`,
        trip_id: tripId,
        type: 'transfer',
        title: detectTransferTitle(d.travel) || `Ferry: ${d.from || '—'} → ${d.to || d.stay || '—'}`,
        booking_ref: '',
        agent: d.agent || '',
        address: '',
        start_date: d.date,
        end_date: d.date,
        start_time: '',
        end_time: '',
        amount: d.ferry_amt,
        currency: 'INR',
        amount_thb: 0,
        amount_inr: d.ferry_amt,
        note: 'Ferry/boat transfer',
        cost_on: 'start',
        extras: JSON.stringify({ from_place: d.from || '', to_place: d.to || d.stay || '', mode: 'Ferry' }),
      });
    }
    if (d.train_amt > 0) {
      bookings.push({
        id: `${tripId}-train-d${d.day_num}`,
        trip_id: tripId,
        type: 'transfer',
        title: detectTransferTitle(d.travel) || `Train: ${d.from || '—'} → ${d.to || d.stay || '—'}`,
        booking_ref: '',
        agent: d.agent || '',
        address: '',
        start_date: d.date,
        end_date: d.date,
        start_time: '',
        end_time: '',
        amount: d.train_amt,
        currency: 'INR',
        amount_thb: 0,
        amount_inr: d.train_amt,
        note: 'Train transfer',
        cost_on: 'start',
        extras: JSON.stringify({ from_place: d.from || '', to_place: d.to || d.stay || '', mode: 'Train' }),
      });
    }
  }

  return bookings;
}

// ───────────────── link generation ─────────────────

function buildLinks(tripId) {
  const links = EXTRAS[tripId].links;
  return links.map((l, i) => ({
    id: `${tripId}-link-${i + 1}`,
    trip_id: tripId,
    name: l.name || l.info || `Link ${i + 1}`,
    url: l.url,
    note: l.info || '',
    created_at: String(Date.now() + i),
  }));
}

// ───────────────── blog generation ─────────────────
//
// For each day: combine itinerary travel/summary text with the real
// activity & dinner labels from Daily-Detail. Output is 2-3 paragraphs:
//   1. Movement / location intro (transit days: "Flew/sailed from X to Y";
//      stay days: "Day in [city]")
//   2. Activities — list the real labelled activities for the date
//   3. Food + other notable purchases

function buildBlogs(tripId) {
  const days = EXTRAS[tripId].itinerary.sort((a, b) => a.day_num - b.day_num);
  const dailyByDate = {};
  for (const dd of EXTRAS[tripId].daily_details) {
    if (!dd.date) continue;
    (dailyByDate[dd.date] = dailyByDate[dd.date] || []).push(dd);
  }

  const blogs = {};
  for (const d of days) {
    const items = dailyByDate[d.date] || [];

    // Bucket the day's labelled expenses
    const acts = items.filter((x) => x.cat === 'ACTIVITY' && x.label).map((x) => x.label.replace(/\n/g, ' '));
    const foods = items.filter((x) => x.cat === 'FOOD' && x.label).map((x) => x.label.replace(/\n/g, ' '));
    const others = items.filter((x) => x.cat === 'OTHER' && x.label).map((x) => x.label.replace(/\n/g, ' '));

    // ── paragraph 1: location / movement ──
    const isTransit = d.from && d.to && d.from !== d.to;
    const para1Lines = [];
    if (isTransit) {
      let mode = 'Travel';
      if (d.flights_amt > 0) mode = 'Flew';
      else if (d.ferry_amt > 0) mode = 'Ferried';
      else if (d.train_amt > 0) mode = 'Took the train';
      else mode = 'Travelled';
      para1Lines.push(`${mode} from ${d.from} to ${d.to}.`);
    } else {
      para1Lines.push(`Day in ${d.stay || 'transit'}.`);
    }
    if (d.hotels_amt > 0 && d.accom) {
      para1Lines.push(`Checked in at ${d.accom}.`);
    }
    // Travel details (first line) for transit days
    if (isTransit && d.travel) {
      const firstTravelLine = d.travel.split('\n').map((l) => l.trim()).filter(Boolean)[0];
      if (firstTravelLine && firstTravelLine.length < 200) {
        para1Lines.push(firstTravelLine + '.');
      }
    }
    // Day-events summary if present
    if (d.summary && d.summary.length > 4) {
      const cleaned = d.summary.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2).join(' ');
      if (cleaned) para1Lines.push(cleaned + (cleaned.endsWith('.') ? '' : '.'));
    }
    const para1 = para1Lines.join(' ').replace(/\.\.+/g, '.').replace(/\s+/g, ' ').trim();

    // ── paragraph 2: activities ──
    let para2 = '';
    if (acts.length === 1) {
      para2 = `Today's headliner: ${acts[0]}.`;
    } else if (acts.length === 2) {
      para2 = `Two activities today: ${acts[0]}, then ${acts[1]}.`;
    } else if (acts.length > 2) {
      const last = acts.pop();
      para2 = `Busy activity day — ${acts.join(', ')}, and finally ${last}.`;
    }

    // ── paragraph 3: food + others ──
    const foodLine = foods.length > 0
      ? `On the food front: ${foods.slice(0, 6).join(', ')}${foods.length > 6 ? ', and more' : ''}.`
      : '';
    const otherLine = others.length > 0
      ? `Picked up along the way: ${others.slice(0, 5).join(', ')}${others.length > 5 ? ', and a few more bits' : ''}.`
      : '';
    const para3 = [foodLine, otherLine].filter(Boolean).join(' ');

    const paragraphs = [para1, para2, para3].filter((p) => p && p.length > 4);
    blogs[d.day_num] = paragraphs.join('\n\n');
  }

  return blogs;
}

// ───────────────── main ─────────────────

async function main() {
  // Existing rows for idempotency
  const bookExisting = await getRange('bookings!A:A');
  const existingBookIds = new Set(bookExisting.slice(1).map((r) => (r?.[0] ?? '').toString()));
  const linkExisting = await getRange('links!A:A');
  const existingLinkIds = new Set(linkExisting.slice(1).map((r) => (r?.[0] ?? '').toString()));

  // Itinerary read for blog cell location lookup
  const itinAll = await getRange('itinerary!A:U');

  let bookingsToAdd = [];
  let linksToAdd = [];
  const blogUpdates = [];

  let now = Date.now();
  let off = 0;

  for (const tripId of TRIP_IDS) {
    const bks = buildBookings(tripId);
    const lns = buildLinks(tripId);
    const blogs = buildBlogs(tripId);

    // Bookings — schema: 19 cols
    // id,trip_id,type,title,booking_ref,agent,address,start_date,end_date,
    // start_time,end_time,amount,currency,amount_thb,amount_inr,note,cost_on,extras,created_at
    for (const b of bks) {
      if (existingBookIds.has(b.id)) continue;
      bookingsToAdd.push([
        b.id, b.trip_id, b.type, b.title, b.booking_ref, b.agent, b.address,
        b.start_date, b.end_date, b.start_time, b.end_time,
        b.amount, b.currency, b.amount_thb, b.amount_inr,
        b.note, b.cost_on, b.extras, String(now + off++),
      ]);
    }

    // Links — schema: 6 cols (id, trip_id, name, url, note, created_at)
    for (const l of lns) {
      if (existingLinkIds.has(l.id)) continue;
      linksToAdd.push([l.id, l.trip_id, l.name, l.url, l.note, l.created_at]);
    }

    // Blogs — patch col U on each itinerary row matching this trip
    for (let i = 1; i < itinAll.length; i++) {
      const row = itinAll[i] || [];
      if ((row[0] ?? '').toString() !== tripId) continue;
      const dayNum = parseInt((row[1] ?? '').toString(), 10);
      if (!Number.isFinite(dayNum)) continue;
      const blog = blogs[dayNum];
      if (!blog) continue;
      const sheetRow = i + 1;
      blogUpdates.push({ range: `itinerary!U${sheetRow}`, values: [[blog]] });
    }
  }

  console.log(`→ bookings: +${bookingsToAdd.length}`);
  await appendRows('bookings!A:S', bookingsToAdd);

  console.log(`→ links:    +${linksToAdd.length}`);
  await appendRows('links!A:F', linksToAdd);

  console.log(`→ blogs:    +${blogUpdates.length} day cells`);
  if (blogUpdates.length) {
    // chunk to be polite
    for (let i = 0; i < blogUpdates.length; i += 50) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { valueInputOption: 'RAW', data: blogUpdates.slice(i, i + 50) },
      });
    }
  }

  console.log('\n✅ Done.');
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
