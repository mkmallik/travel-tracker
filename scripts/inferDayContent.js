// Refines `summary` (Plan for the day), `travel_details`, and the new
// `day_summary` (post-trip recap) for every day of the active trip,
// based on what was actually booked and logged.
//
// Hand-curated content per day from the live data — bookings, transfers,
// activities, expenses with their notes. Run once after a trip ends, then
// edit individual cards in the app to refine further.
//
// Usage: SHEET_ID=<id> node scripts/inferDayContent.js

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

// 19 = day_summary (col T, 1-based 20). 13 = travel_details (col N).
// 14 = summary (col O — the existing "Plan for the day").
const COL_TRAVEL = 'M'; // 13th letter
const COL_SUMMARY = 'N'; // 14th — Plan for the day
const COL_DAY_SUMMARY = 'T'; // 20th — new recap

// ─── CURATED CONTENT ────────────────────────────────────────────────
// Each day: { plan: [points], travel: [points], summary: paragraph }

const DAY = {
  1: {
    plan: [
      'Akasa Air QP 623 BLR → HKT (09:20 → 15:05)',
      'Airport taxi to Patong / Kata',
      'Check in at KATA HILL SEA VIEW (3 nights)',
      'Sim card on arrival',
      'Evening beach walk + Bangla Rd',
      'Dinner at McDonald\'s, Patong',
    ],
    travel: [
      'Reach BLR by 07:00 — international cutoff is 60 min before',
      'Akasa Air QP 623 — non-stop, ~4h 15m',
      'Carry THB 15,000 cash; ATMs at HKT arrival',
      'Airport → Kata Hill: prepaid taxi ~₹3,000 / 600 THB, 45 min',
      'Local Grab works for short hops within Patong/Kata',
    ],
    summary:
      'Travel day — Bengaluru to Phuket. Akasa Air landed mid-afternoon. Settled at Kata Hill Sea View, picked up a SIM card, did a Bangla Rd / beach walk, and grabbed McDonald\'s in Patong for the easy first dinner.',
  },
  2: {
    plan: [
      'Hotel pickup 07:30 for Phi Phi tour',
      'Speedboat from Rassada/Chalong: Maya Bay, Pileh Lagoon, Bamboo, Monkey Beach',
      'Lunch included on the boat',
      'Return ~18:00, dinner near hotel',
    ],
    travel: [
      'Tour pickup window 07:00–07:45 — be ready in lobby',
      'Carry: dry bag, sunscreen, swimwear, motion-sickness pill',
      'Phi Phi national park fee paid in cash on arrival (~฿400/person)',
      'Tour booked via Klook — voucher in Links tab',
    ],
    summary:
      'Headline Phuket day — Phi Phi & Maya Bay speedboat tour booked via Klook. Park fee paid in cash on arrival. Lunch on the boat. Picked up a photo frame and a small souvenir at one of the island stops; back at the hotel by evening, sun-tired in the best way.',
  },
  3: {
    plan: [
      'Big Buddha morning (dress code: shoulders + knees covered)',
      'Phuket Old Town walking + lunch',
      'Promthep Cape sunset (arrive 45 min before)',
      'Kata beach evening — recliner + drinks',
    ],
    travel: [
      'Half-day private driver ~฿1,500 OR rent scooter ฿300/day',
      'Old Town Sunday Walking Street is closed Wed — go for cafés instead',
      'Promthep Cape: very crowded at sunset, get there early',
      'Grab works for hotel → Old Town and back',
    ],
    summary:
      'Phuket sightseeing on Grab — Old Town in the morning (Sino-Portuguese shophouses, café-hopping, easy 4-dish lunch), temple visit, then Kata Beach for the late afternoon. Pad thai with a cold coffee for dinner. Picked up the small things: pearl wristband, tiger balm, a dress, a few gift items.',
  },
  4: {
    plan: [
      'Check out of Kata Hill by 12:00',
      'Phuket → Krabi via ferry (07:00 transfer pickup)',
      'Check in at Kokotel Krabi Ao Nang (3 nights)',
      'Afternoon at Ao Nang beach',
      'Evening: fire shows + seafood dinner',
    ],
    travel: [
      'Phuket → Krabi transfer (₹6,793) — combo ferry/van, ~5 hrs',
      'Pickup ~07:00 from hotel; arrival Ao Nang ~12:00',
      'Confirm pickup the night before with hotel front desk',
      'Krabi Ao Nang taxi to Kokotel ~5 min walk from drop-off',
    ],
    summary:
      'Travel day — Phuket → Krabi (Ao Nang). Combo van + ferry transfer in the morning, into Kokotel Krabi Ao Nang for two nights. Afternoon: swimsuit shopping for Dola, beach time, a massage to flatten out the morning of travel, and a relaxed dinner.',
  },
  5: {
    plan: [
      'Krabi 4 Islands tour from Ao Nang pier (08:00)',
      'Phra Nang Cave, Poda, Chicken Island, Tup Island sandbar',
      'Finish at Railay',
      'Evening at Ao Nang strip',
    ],
    travel: [
      '4 Islands tour booked via Klook (₹9,595)',
      'Boat: longtail (cheaper, slower) or speedboat — booking is speedboat',
      'May 1 is Labour Day in Thailand — expect crowds at piers',
      'Hat / sunscreen / dry bag essential',
    ],
    summary:
      'Krabi headline day — 4 Islands speedboat tour via Klook. Phra Nang Cave, Poda, Chicken Island, Tup Island sandbar, Railay to finish. Calm afternoon back at the hotel; legs full of salt water, camera roll full.',
  },
  6: {
    plan: [
      'Check out of Kokotel by 12:00',
      'Krabi → Koh Samui combo (van + bus + ferry)',
      'Check in at Cinnamon Beach Villas, Bophut/Chaweng (3 nights)',
      'Sunset + dinner at Fisherman\'s Village (Bophut)',
    ],
    travel: [
      'Combo ticket booked (₹8,730) — van Ao Nang → Donsak → catamaran 1.5 hrs → Nathon → taxi 30 min',
      'Pickup ~10:45, arrival Samui ~13:45',
      'Dramamine if prone to seasickness on the catamaran leg',
      'Cinnamon Beach Villas — confirm 14:00 check-in or stash bags at the front desk',
    ],
    summary:
      'Pure travel day — Krabi to Koh Samui via the Lomprayah-style combo (van + catamaran + van). Checked into Cinnamon Beach Villas for the next three nights. Ate in-resort and crashed early.',
  },
  7: {
    plan: [
      'Hotel pickup 07:30 for Ang Thong tour',
      'Speedboat from Bophut or Maenam pier',
      '42 islands, emerald lagoon, viewpoint hike, hidden-lagoon kayaking',
      'Return ~17:30, light dinner',
    ],
    travel: [
      'Ang Thong booked via Klook (₹16,413)',
      'Voucher: KLK9725963859 — keep on phone for boarding',
      'Weather-dependent: check forecast night before; speedboats cancel in rough seas',
      'Carry water shoes for the rocky beaches (we bought ฿200 set today)',
    ],
    summary:
      'Headline Samui day — Ang Thong Marine Park speedboat. 42 islands, the Emerald Lagoon (sweaty staircase up to the crater), kayaking the hidden mangrove, viewpoint hike at lunch. Picked up water shoes on the way out — the rocky beaches make them mandatory.',
  },
  8: {
    plan: [
      'Samui island loop',
      'Wat Phra Yai (Big Buddha) → Hin Ta / Hin Yai rocks',
      'Na Muang Waterfall (skip the elephant rides — ethics)',
      'Afternoon Chaweng beach',
      'Dinner at Bophut',
    ],
    travel: [
      'Scooter ฿300/day or half-day driver ~฿1,500',
      'Roads on Samui are easy and well-paved',
      'Big Buddha temple dress code: shoulders/knees covered',
    ],
    summary:
      'Lazy Samui day on purpose — no tour, no early alarm, no pier. Three meals back-to-back, pool, beach, minibar. The mid-trip reset day every long trip needs.',
  },
  9: {
    plan: [
      'Check out Cinnamon by 11:00',
      'Taxi Samui → Lipa Noi pier (~30 min)',
      'Raja Ferry 08:00 → Donsak → shuttle to Surat Thani Airport (URT)',
      'AirAsia FD 3234 URT → DMK (15:35 → 16:50)',
      'DMK → Bangkok hotel by Grab',
      'Light dinner near Cassia Rama 9',
    ],
    travel: [
      'Combined van+boat+van transfer ₹7,682 (Samui hotel → URT)',
      'Pickup 08:00; reach airport with 2-hr buffer',
      'AirAsia FD 3234 booked ₹20,525',
      'DMK → Cassia Rama 9: Grab ~₹1,400, 45–60 min through Bangkok traffic',
    ],
    summary:
      'Long travel day — Samui → Bangkok. Transfer combo to Surat Thani Airport, AirAsia to Don Mueang, Grab across Bangkok traffic to Cassia Rama 9 (the home for the last four nights). Light dinner near the hotel and crashed.',
  },
  10: {
    plan: [
      'Bangkok temple triple — Grand Palace, Wat Pho, Wat Arun',
      'Grand Palace 08:30 sharp (dress code STRICT)',
      'Wat Pho Reclining Buddha + optional Thai massage',
      'Chao Phraya cross-river ferry to Wat Arun (฿5)',
      'Evening: ICONSIAM browse',
      'Dinner cruise on Chao Phraya (Princess) booked',
    ],
    travel: [
      'Grand Palace tickets ฿500/person',
      'Asiatique river shuttle: free from Sathorn pier',
      'MBK: BTS National Stadium',
      'Cruise pickup at Asiatique pier — arrive 30 min early',
    ],
    summary:
      'Bangkok temples + cruise. Grand Palace at 08:30 sharp, Wat Pho with the Reclining Buddha, the cross-river ferry to Wat Arun. Picked up a watch for Dola and some makeup material along the way. Evening Chao Phraya Princess dinner cruise out of Asiatique — illuminated temples sliding past the boat.',
  },
  11: {
    plan: [
      'Ayutthaya day trip (skipped — replaced with Bangkok activities)',
      'Grand Palace + Emerald Buddha tour (afternoon, 14:30)',
      'Skywalk + Skyverse (group of 3) at MahaNakhon',
      'Dinner near hotel',
    ],
    travel: [
      'Grand Palace + Khon Masked Dance tour ₹4,628',
      'Skywalk/Skyverse package ₹10,767 (incl. ฿600 meal coupon)',
      'Skywalk: King Power MahaNakhon, BTS Chong Nonsi',
      'ICONSIAM is one ferry stop from Sathorn',
    ],
    summary:
      'Bangkok day 2 — culture + height. Grand Palace tour with the Khon Masked Dance in the afternoon. Up the King Power MahaNakhon for the Skywalk + Skyverse package (the famous glass tray hanging off the side, 78 floors above the city). Sky-deck photograph as the souvenir of the moment. Cab-heavy day — the kind that bills the calves.',
  },
  12: {
    plan: [
      'SHOPPING DAY — pack bags tonight',
      'Pratu Nam Market morning (clothes, watches, accessories)',
      'Street markets all afternoon',
      'Nail art if time',
      'Last dinner in Bangkok',
      '04:00 wake tomorrow for airport',
    ],
    travel: [
      'BTS to Pratu Nam (Chit Lom or Ratchathewi)',
      'Battery banks: street markets ~฿1,000–1,200',
      'Handle handicrafts last (heavy + fragile)',
      'Confirm 04:30 Grab to Suvarnabhumi tonight',
    ],
    summary:
      'Bangkok shopping day — Pratu Nam Market in the morning, street markets through the afternoon. Clothes, watches, an extra suitcase to take everything home in, a battery bank, nail art for Dola. Final blowout dinner in the evening, bags packed, 04:00 alarm set.',
  },
  13: {
    plan: [
      '04:00 wake — bags ready',
      '04:30 Grab to Suvarnabhumi (BKK)',
      'IndiGo 6E 1056 BKK → BLR (08:05 → 10:15)',
      'Airport taxi BLR → home',
    ],
    travel: [
      'IndiGo 6E 1056 — international check-in CLOSES 07:05',
      'Reach BKK by 05:30 absolute latest',
      'Airport Rail Link doesn\'t start until 05:30 — taxi only',
      'Carry passport + boarding pass printout; keep ₹500 for BLR airport taxi',
    ],
    summary:
      'Going home. 04:00 wake, 04:30 Grab to Suvarnabhumi, IndiGo 6E 1056 BKK → BLR landed at 10:15 local. One last airport souvenir, cab home, end of trip.',
  },
};

async function main() {
  // Read full itinerary range so we know which row corresponds to which day
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'itinerary!A:T' });
  const rows = r.data.values || [];
  if (rows.length <= 1) { console.error('No itinerary rows.'); return; }

  const updates = [];
  let touched = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const dayNum = parseInt((row[1] ?? '').toString(), 10);
    if (!Number.isFinite(dayNum)) continue;
    const content = DAY[dayNum];
    if (!content) continue;
    const sheetRow = i + 1;
    updates.push({
      range: `itinerary!${COL_TRAVEL}${sheetRow}`,
      values: [[content.travel.join('\n')]],
    });
    updates.push({
      range: `itinerary!${COL_SUMMARY}${sheetRow}`,
      values: [[content.plan.join('\n')]],
    });
    updates.push({
      range: `itinerary!${COL_DAY_SUMMARY}${sheetRow}`,
      values: [[content.summary]],
    });
    touched++;
  }

  for (let i = 0; i < updates.length; i += 80) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates.slice(i, i + 80) },
    });
  }
  console.log(`✓ Updated ${touched} day rows (${updates.length} cells written).`);
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
