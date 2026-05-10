// Pre-fills the new `blog` column (col U on itinerary tab) with a long-form
// journal entry for every day of the trip. Each entry is 3–4 paragraphs of
// storytelling drawn from the actual itinerary; the user edits anything they
// want via the Blog tab pencil.
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
// renders each chunk as its own paragraph. Storytelling, not receipts —
// keep amounts out of here unless they're genuinely part of the story.

const BLOG = {
  1: [
    'Bengaluru to Phuket. Akasa Air QP 623 lifted off at 09:20 and four hours later we were stepping out of HKT into that thick, hibiscus-scented air that tells you you\'re in Thailand. Immigration moved quickly, bags came out fast, and the prepaid taxi line outside arrivals was painless.',
    'Kata Hill Sea View was our base for the first three nights, and the room had exactly the kind of slatted-wood, tropical feel you want for a Phuket landing. We dropped the bags, picked up a SIM card on the way, and pushed straight out — there was no chance of letting jet lag win.',
    'Patong came alive after dark. We did the obligatory Bangla Road wander — neon, music, tuk-tuk horns, the whole carnival — and grabbed McDonald\'s for a no-decisions first dinner. Walked the beach for a bit afterwards under the lights. A good first scribble in the trip journal.',
  ],
  2: [
    'The big Phi Phi day. Hotel pickup at 07:30, sleepy and clutching coffee, then a speedboat from Rassada pier that bounced us out across glassy turquoise toward Maya Bay. The Pileh Lagoon, Bamboo Island, Monkey Beach, the whole Phi Phi highlight reel.',
    'Maya Bay itself is exactly the postcard. The boat drops you at the back beach and you walk the wooden boardwalk over to the famous half-moon — same beach as the Leonardo DiCaprio movie, but now with strict timed entry to keep it from getting trampled. The light off the cliffs at midday is unreal.',
    'Lunch on the boat, snorkeling at Pileh, a stop near Monkey Beach where the macaques perform exactly the chaos you\'d hope for. Picked up a small photo frame and a souvenir at one of the island stops. Back at the hotel by evening, sun-tired in the best way.',
  ],
  3: [
    'A proper Phuket sightseeing day, all of it stitched together by Grab. Kata Hill down to Old Town in the morning, then up to the temple, and finally to Kata Beach for the late afternoon — the loop a Phuket day is supposed to be.',
    'Old Town was the highlight: shophouses in Sino-Portuguese pastels, café-hopping along Soi Romanee and Thalang Road, an easy lunch of four dishes and two drinks. The temple visit afterwards was quieter, candle smoke in the air. Pad thai with a cold coffee for dinner — exactly the right thing.',
    'Picked up the small things you only buy on a trip: a pearl wristband, tiger balm, a dress, a few gift items. Beach time at Kata to close out — recliner under an umbrella, the heat going slow.',
  ],
  4: [
    'Phuket → Krabi day. The combo van + ferry transfer picked us up around 07:00 and ran the loop down to the pier and across to Ao Nang. Five hours all in. The catamaran leg in the middle is the best part — flat sea, big breeze, blocks of rock rising out of the horizon.',
    'Kokotel Krabi Ao Nang took us in for two nights. The room was simple — about 22 square metres, one double and one single — but a five-minute walk from the beach, which is what mattered. Settled in, swung the windows open, and went to find food.',
    'Afternoon was Ao Nang strip mode: swimsuit shopping for Dola, a beach swim, a long massage to flatten out the morning of travel, and a relaxed dinner. Trip officially in vacation gear.',
  ],
  5: [
    '4 Islands tour day — the headline Krabi experience. Speedboat out of Ao Nang pier at 08:00. Phra Nang Cave, Poda, Chicken Island, the Tup Island sandbar at low tide, and Railay to finish.',
    'The Tup Island sandbar is the moment everyone takes their picture: at low tide a thin ribbon of white sand connects three islands and you can walk between them with sea on either side. Phra Nang beach, with its big limestone cliffs and the little spirit shrine in the cave, is a close second.',
    'Plenty of time at each stop, lunch included. Calm afternoon back at the hotel — legs full of salt water, camera roll completely full, sunburn arriving on schedule.',
  ],
  6: [
    'Pure travel — Krabi to Koh Samui by the long combo route. Van out of Ao Nang to Donsak pier, catamaran across (about 1.5 hrs, the longest single sea leg of the trip), van again from Nathon pier on Samui to the hotel. Pickup around 10:45, on Samui by mid-afternoon.',
    'Samui hits differently from Phuket and Krabi — quieter, a little plusher, more shade. Cinnamon Beach Villas was our home for the next three nights, and we walked into a villa-style setup that immediately said "stop racing for a minute".',
    'No outside spend today — everything happened in the resort. We ate in, watched the light come down over the pool, and crashed early. The right rhythm for a transit day.',
  ],
  7: [
    'Ang Thong day — the Marine Park speedboat. Pickup at 07:30, out of Bophut, and an hour or so across to the 42-island archipelago. The voucher\'s in the Links tab for next time.',
    'The headline is the Emerald Lagoon — a flooded crater hidden in the middle of one of the islands, reached by a sweaty staircase of about 250 steps. The water is exactly the colour the name says. Kayaking through the hidden mangrove lagoon was the second highlight; the viewpoint hike at lunch the third.',
    'Picked up a set of water shoes on the way out — the rocky beaches make them mandatory. Back at Cinnamon by evening, salt in the hair, knees a little wrecked from the staircase, perfectly happy.',
  ],
  8: [
    'Lazy Samui day on purpose. No tour, no early alarm, no pier. Just pool, beach, and a cycle of meals. The kind of day every long trip needs in the middle.',
    'Three meals back-to-back, an afternoon beer from the minibar, and a long stretch on a sun lounger. We caught up on the Cinnamon room tab so the day belonged to nothing.',
    'No regret on any of it. This is the day the muscles unclench and the trip stops being a list of things to do.',
  ],
  9: [
    'Long, multi-leg travel day — Samui all the way to Bangkok. Combined van + ferry + van transfer from the hotel down to Surat Thani Airport, then AirAsia FD 3234 over to Don Mueang, then Grab across Bangkok traffic to Cassia Rama 9. Most of the day lost to motion.',
    'Cassia Rama 9 took us in for the last four nights of the trip. After Cinnamon\'s villa quiet, Bangkok is a different planet — vertical, neon, pulsing, never-quite-quiet.',
    'Airport meals on the way, light dinner near the hotel, and a hard crash. Bangkok proper starts tomorrow.',
  ],
  10: [
    'Bangkok\'s greatest-hits temple day, and a cruise to finish. Grand Palace at 08:30 sharp — dress code is enforced strictly, shoulders and knees covered, no exceptions. Then Wat Pho with the Reclining Buddha and the foot-massage school in the courtyard, then the cross-river ferry over to Wat Arun.',
    'Grab did a lot of work today, stitching the temples to ICONSIAM and MBK and back. Picked up something nice for Dola and some makeup material along the way.',
    'Evening was the Chao Phraya Princess dinner cruise out of Asiatique. Lights on the temples on either side of the river, a dance set on board, dinner that was better than it had any right to be. The kind of evening that earns the early start.',
  ],
  11: [
    'Originally Ayutthaya day, traded out for Bangkok activities — the right call. Grand Palace + Khon Masked Dance tour in the afternoon, then up the King Power MahaNakhon for the Skywalk + Skyverse package.',
    'The Skywalk is the famous glass tray hanging off the side of the building — 78 floors up, nothing under your feet but Bangkok. Skyverse is the immersive AR experience next door, fun and short. Got the sky-deck photograph as the only proper souvenir of the moment.',
    'Cab-heavy day, the kind that bills the calves. Light dinner near the hotel and a cold shower.',
  ],
  12: [
    'Shopping day in Bangkok. Pratu Nam Market in the morning, BTS up to Chit Lom, then street markets through the afternoon. Clothes for everyone, a watch, a money bag, a few souvenirs.',
    'Mid-day decision to grab an extra suitcase to take everything home in — plus a battery, a fan, a tin of chocolates, and a battery bank for the flight. Nail art for Dola at one of the small salons; lunch at a market food court; juices on every corner.',
    'Final blowout dinner in the evening. Bags packed back at Cassia, the new suitcase fitted out, an alarm set for 04:00. The trip is in its last hours and the room looks it.',
  ],
  13: [
    'Going home. 04:00 wake, 04:30 Grab to Suvarnabhumi, and IndiGo 6E 1056 lifted off Bangkok on schedule. International check-in cuts at 07:05 — we made it with a clean buffer.',
    'Picked up one last airport souvenir before security. Quiet flight; landed BLR at 10:15 local. Cab home through the morning Bengaluru traffic.',
    'Two weeks bookended by Akasa out and IndiGo back. The trip blog opens up here for editing whenever the memories shake loose more detail.',
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
