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
      'Travel day — Bengaluru to Phuket. Flew Akasa Air QP 623 (₹44,969 booking) landing 15:05. Settled at Kata Hill Sea View (₹14,723 / 3 nights). Picked up a Sim card (฿500), grabbed McDonald\'s dinner at Patong (₹1,271), and ended with a Bangla Rd / beach walk. Cabs ate ₹4,887 today (airport→hotel + 2 evening Grab rides). Total day-1 ground spend ₹9,106.',
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
      'Headline Phuket day — Phi Phi & Maya Bay speedboat tour (₹12,198 booked via Klook). Park fee ฿1,200 + activity ฿400 + tip ฿40 paid in cash. Lunch on the boat; ฿690 spent on dishes/drinks/water at the islands. Picked up a photo frame (฿200) and a small souvenir (฿500). Back at hotel by evening, total ground spend ₹8,817.',
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
      'Phuket sightseeing on Grab — Kata Hill → Old Town (₹806) → temple (₹606) → Kata Beach (₹616). Lunch ฿720 (4 dishes + 2 drinks), 7-Eleven snacks ₹621, and pad thai dinner with a cold coffee ฿508. Light shopping: pearl wristband, tiger balm, dress, gift items (~฿800 combined). Recliner on the beach ฿100. Day total ₹10,131.',
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
      'Travel day — Phuket → Krabi (Ao Nang). Booked transfer ₹6,793 (van + ferry). Checked into Kokotel Krabi Ao Nang (₹11,223 / 2 nights, room: 22 m², 1 double + 1 single). Settled in, swimsuit shopping for Dola (₹1,697), beach time, a massage ฿900, and ฿1,000 dinner. 7-Eleven runs (₹740 + ₹767) for snacks/water. Heavy day ₹13,304.',
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
      'Krabi headline day — 4 Islands speedboat tour via Klook (₹9,595). Calm spend on the ground: ฿420 lunch (3 dishes), ฿440 ice cream, ฿290 drinks, plus 7-Eleven run ₹799. Light day, ₹4,146 ground spend.',
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
      'Pure travel day — Krabi to Koh Samui via the Lomprayah-style combo (₹8,730). Checked into Cinnamon Beach Villas (₹22,462 / 3 nights). No ground spend logged today; all eating in-resort and crashed early.',
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
      'Headline Samui day — Ang Thong Marine Park speedboat (₹16,413). Picked up water shoes ฿200 on the way. Activity entry/photo fee ฿900 + drinks ฿170. Easy ₹3,696 ground spend; everything else covered by the package.',
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
      'Lazy Samui day — eating-heavy, no big tour. Three meals back-to-back: lunch ₹1,442, dinner ₹1,702 + a 3-day catch-up tab from Cinnamon (₹8,257), plus ₹200 minibar beer. Day total ₹11,601, all food. Beach time + minibar — perfect mid-trip reset.',
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
      'Long travel day — Samui → Bangkok. Transfer combo to Surat Thani (₹7,682), AirAsia to Don Mueang (₹20,525). Airport meals ฿132 + ₹528. Cab from DMK to Cassia Rama 9 ₹1,415. Checked into Cassia (₹22,803 / 4 nights). Dinner + water ₹1,538 near hotel and crashed. ₹3,865 in ground spend.',
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
      'Bangkok temples + cruise. Grand Palace, Wat Pho, Wat Arun in the morning. Lots of Grab today: hostel→Grand Palace ₹447, ₹1,299 multi-leg (Nextopia → Asiatique + Grand Palace → Nextopia), Asiatique→MBK ₹361, MBK→hotel ฿300. Watch for Dola (₹2,694) + makeup material (₹1,059). Evening Chao Phraya Princess Dinner Cruise (₹7,437) at Asiatique. Day ₹9,908.',
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
      'Bangkok day 2 — culture + height. Grand Palace tour (₹4,628). Skywalk + Skyverse with the meal coupon (₹10,767). Sky deck photograph ₹892. Cab heavy: hotel → Grand Palace ₹859, Khon → Skywalk ฿180, Skywalk → ICONSIAM ₹452, ICONSIAM → hotel ₹1,028. Dinner + breakfast ฿444 + ฿80 candies + ฿100 fruit box. ₹5,571 ground.',
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
      'Heaviest spend day — Bangkok shopping spree. Pratu Nam Market: clothes ₹1,660 + ฿970, money bag ฿200, souvenirs ฿340, suitcase battery+chocolates+fan ฿1,070, watch ₹1,240, battery bank ₹1,440. Plus juices ₹140 × 2, lunch ₹1,185, ฿1,240 nail art, and ₹1,881 final dinner. Cabs ₹536 (hostel→market) + ₹705 (back). Big day ₹20,043. Bags packed; 04:00 wake-up tomorrow.',
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
      'Going home. IndiGo 6E 1056 BKK → BLR (₹44,707). Hotel → Suvarnabhumi cab ₹1,289, BLR → home ₹1,349. Picked up one last souvenir at the airport ₹442. ₹3,080 spent today, end of trip.',
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
