// Pre-fills the new `blog` column (col U on itinerary tab) with a long-form
// journal entry for every day of the trip. Each entry is 3–4 paragraphs of
// storytelling drawn from the actual bookings + expense notes; the user
// edits anything they want via the Blog tab pencil.
//
// Independent from inferDayContent.js (which writes the shorter `day_summary`
// recap shown on Day Detail).
//
// Usage: SHEET_ID=<id> node scripts/inferBlogContent.js

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

const COL_BLOG = 'U'; // 21st col — blog

// ─── BLOG ENTRIES ───────────────────────────────────────────────────
// Paragraphs separated by blank lines. The Blog tab splits on \n\n and
// renders each chunk as its own paragraph.

const BLOG = {
  1: [
    'Bengaluru to Phuket. Akasa Air QP 623 lifted off at 09:20 and four hours later we were stepping out of HKT into that thick, hibiscus-scented air that tells you you\'re in Thailand. Immigration moved quickly. The taxi to Kata Hill Sea View ran ₹4,887 across the day\'s rides — the airport leg, then a couple of evening Grabs out and back.',
    'Kata Hill Sea View was our base for the first three nights (₹14,723 total) and the room had exactly the kind of slatted-wood, tropical feel you want for a Phuket landing. We dropped the bags, picked up a SIM card for ฿500, and pushed straight out — there was no chance of letting jet lag win.',
    'Patong came alive after dark. We did the obligatory Bangla Road wander — neon, music, tuk-tuk horns — and grabbed McDonald\'s for a no-decisions first dinner (₹1,271). Walked the beach for a bit afterwards. ₹9,106 of ground spend, a good first scribble in the trip ledger.',
  ],
  2: [
    'The big Phi Phi day. Hotel pickup at 07:30, sleepy and clutching coffee, then a speedboat from Rassada that bounced us out across glassy turquoise to Maya Bay. Booked via Klook for ₹12,198 — Pileh Lagoon, Bamboo Island, Monkey Beach, the whole highlight reel.',
    'Maya Bay itself is exactly the postcard. The boat dropped us at the back beach and you walk the wooden boardwalk over to the famous half-moon — same beach as the Leonardo DiCaprio movie, but now with strict timed entry to keep it from getting trampled. The light off the cliffs at midday is unreal.',
    'National park fee ฿1,200 + ฿400 activity + ฿40 tip in cash. Lunch on the boat. Picked up a ฿200 photo frame and a ฿500 souvenir at one of the island stops, plus ฿690 on dishes/drinks/water through the day. Back at the hotel by evening, sun-tired in the best way. Ground total ₹8,817.',
  ],
  3: [
    'A proper Phuket sightseeing day, all of it stitched together by Grab. Kata Hill → Old Town for ₹806, then up to the temple for ₹606, and finally Kata Beach for ₹616 — the kind of day where the receipts tell the whole story.',
    'Old Town in the morning was the highlight: shophouses in Sino-Portuguese pastels, café-hopping, an easy lunch (฿720, four dishes and two drinks). The temple visit afterwards was quieter, and we ended at Kata Beach with a ฿100 recliner for the late afternoon.',
    'Picked up the small things you only buy on a trip: a pearl wristband, tiger balm, a dress, a few gift items — about ฿800 in scattered shopping. Pad thai with a cold coffee for dinner (฿508), 7-Eleven snacks across the day (₹621). Day total ₹10,131.',
  ],
  4: [
    'Phuket → Krabi day. The combo van+ferry transfer (₹6,793) picked us up around 07:00 and ran the loop down to the pier and across to Ao Nang. Five hours all in. The catamaran leg in the middle is the best part — flat sea, big breeze, blocks of rock rising out of the horizon.',
    'Kokotel Krabi Ao Nang took us in for two nights (₹11,223). The room was simple — 22 m², one double and one single — but a five-minute walk from the beach, which is what mattered. Settled in, swung the windows open, and went to find food.',
    'Afternoon was Ao Nang strip mode: swimsuit shopping for Dola (₹1,697), a beach swim, a ฿900 massage to flatten out the morning of travel, dinner ฿1,000. Two 7-Eleven runs (₹740 + ₹767) for snacks and water. Heavy day on the wallet at ₹13,304 but the trip was officially in vacation gear.',
  ],
  5: [
    '4 Islands tour day — the headline Krabi experience. Speedboat out of Ao Nang pier at 08:00, booked via Klook for ₹9,595. Phra Nang Cave, Poda, Chicken Island, the Tup Island sandbar at low tide, and Railay to finish.',
    'The Tup Island sandbar is the moment everyone takes their picture: at low tide a thin ribbon of white sand connects three islands and you can walk between them with the sea on either side. Phra Nang beach, with its limestone cliffs, is a close second. Plenty of time at each stop, lunch included.',
    'Ground spend was almost nothing — ฿420 lunch, ฿440 ice cream, ฿290 drinks, plus a ₹799 7-Eleven pile of snacks back at the hotel. Light day, ₹4,146 ground. Just legs full of salt water and the camera roll absolutely full.',
  ],
  6: [
    'Pure travel — Krabi to Koh Samui by the long combo route. Booked together for ₹8,730: van out of Ao Nang to Donsak pier, catamaran across (~1.5 hrs, the longest single sea leg of the trip), van again from Nathon pier on Samui to the hotel. Pickup ~10:45, on Samui by ~13:45.',
    'Samui hits differently from Phuket and Krabi — quieter, a little plusher, more shade. Cinnamon Beach Villas was our home for the next three nights (₹22,462 total) and we walked into a villa-style setup that immediately said "stop racing for a minute".',
    'No ground spend today — everything happened in the resort. We ate in, watched the light come down, and crashed early. The ledger has a single zero next to "today" and that\'s exactly right for a transit day.',
  ],
  7: [
    'Ang Thong day — the Marine Park speedboat. Booked via Klook for ₹16,413 (voucher KLK9725963859 on the phone for boarding). Pickup 07:30, out of Bophut, and an hour or so across to the 42-island archipelago.',
    'The headline is the Emerald Lagoon — a flooded crater hidden in the middle of one of the islands, reached by a sweaty staircase of about 250 steps. The water is exactly the color the name says. Kayaking through the hidden mangrove lagoon was the second highlight; the viewpoint hike at lunch the third.',
    'Picked up a ฿200 set of water shoes on the way out — the rocky beaches make them mandatory. Activity entry + photo fee ฿900, drinks ฿170. Light ground spend at ₹3,696; everything heavy was rolled into the package. Back at Cinnamon by evening, salt in the hair, knees a little wrecked from the staircase.',
  ],
  8: [
    'Lazy Samui day on purpose. No tour, no early alarm, no pier. Just pool, beach, and a cycle of meals. The kind of day every long trip needs in the middle.',
    'Three meals stacked back-to-back: lunch ₹1,442, dinner ₹1,702, and a three-day catch-up tab at Cinnamon for ₹8,257 covering everything we\'d charged to the room since arriving. Plus ₹200 minibar beer in the afternoon. Eating-heavy day end to end.',
    'Day total ₹11,601 — almost all food. No regret. The ledger reads like an indulgent restaurant receipt and that\'s the point of a mid-trip reset day.',
  ],
  9: [
    'Long, multi-leg travel day — Samui all the way to Bangkok. Combined transfer from the hotel to Surat Thani Airport (van + ferry + van) ran ₹7,682. Then AirAsia FD 3234, URT → DMK, ₹20,525. DMK → Cassia Rama 9 by Grab, ₹1,415, dragging across Bangkok traffic.',
    'Cassia Rama 9 took us in for the last four nights of the trip (₹22,803). After Cinnamon\'s villa quiet, Bangkok is a different planet — vertical, neon, pulsing.',
    'Airport meals ฿132 + ₹528. Light dinner with water ₹1,538 near the hotel. ₹3,865 in ground spend on top of the big transit lines. Crashed hard. Bangkok proper starts tomorrow.',
  ],
  10: [
    'Bangkok\'s greatest-hits temple day, and a cruise to finish. Grand Palace at 08:30 sharp — dress code is enforced strictly, shoulders and knees covered, no exceptions. Then Wat Pho with the Reclining Buddha, then the ฿5 cross-river ferry over to Wat Arun.',
    'Grab did a lot of work today: hostel → Grand Palace ₹447, then a ₹1,299 multi-leg (Nextopia → Asiatique + Grand Palace → Nextopia), Asiatique → MBK ₹361, MBK → hotel ฿300. The day kept moving.',
    'Bought Dola something nice (₹2,694) and some makeup material (₹1,059) along the way. Evening was the Chao Phraya Princess Dinner Cruise out of Asiatique (₹7,437) — illuminated temples sliding past while you eat. Total ground spend ₹9,908.',
  ],
  11: [
    'Originally Ayutthaya day, traded out for Bangkok activities — the right call. Grand Palace + Khon Masked Dance tour in the afternoon (₹4,628), then up the King Power MahaNakhon for the Skywalk + Skyverse package (₹10,767, included a ฿600 meal coupon).',
    'The Skywalk is the famous glass tray hanging off the side of the building — 78 floors up, nothing under your feet but Bangkok. Skyverse is the immersive AR experience next door. Got the ₹892 sky-deck photograph as the only proper souvenir of the moment.',
    'Cab heavy: hotel → Grand Palace ₹859, Khon → Skywalk ฿180, Skywalk → ICONSIAM ₹452, ICONSIAM → hotel ₹1,028. Dinner + breakfast ฿444 + ฿80 candies + ฿100 fruit box. ₹5,571 in ground spend. The kind of day that bills the calves and the wallet equally.',
  ],
  12: [
    'Shopping day in Bangkok — the heaviest spend of the entire trip and entirely on purpose. Pratu Nam Market in the morning, BTS up to Chit Lom: clothes ₹1,660 + ฿970, money bag ฿200, souvenirs ฿340.',
    'Mid-day a haul: an extra suitcase + battery + chocolates + fan combo for ฿1,070 (hello over-baggage charges tomorrow), a watch ₹1,240, a battery bank ₹1,440. Lunch ₹1,185, juices ₹140 × 2, ฿1,240 nail art for Dola, and a final blowout dinner ₹1,881.',
    'Cabs ₹536 (hostel → market) + ₹705 (back). Day total ₹20,043 — by far the chunkiest line in the trip. Bags packed in the evening; 04:00 alarm set for the airport.',
  ],
  13: [
    'Going home. 04:00 wake, 04:30 Grab to Suvarnabhumi (₹1,289), and IndiGo 6E 1056 BKK → BLR (₹44,707) lifted off at 08:05. International check-in cuts at 07:05 — we made it with a clean buffer.',
    'Picked up one last airport souvenir for ₹442. Quiet flight; landed BLR at 10:15 local. BLR → home cab ₹1,349.',
    '₹3,080 in ground spend on the last day. Two weeks bookended by Akasa out and IndiGo back. The trip ledger closes here — and the trip blog opens up for editing whenever the memories shake loose more detail.',
  ],
};

async function main() {
  // Read full itinerary range; we need the row index for each day_num
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
    const paras = BLOG[dayNum];
    if (!paras) continue;
    const sheetRow = i + 1;
    updates.push({
      range: `itinerary!${COL_BLOG}${sheetRow}`,
      values: [[paras.join('\n\n')]],
    });
    touched++;
  }

  for (let i = 0; i < updates.length; i += 80) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates.slice(i, i + 80) },
    });
  }
  console.log(`✓ Updated blog for ${touched} day rows.`);
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
