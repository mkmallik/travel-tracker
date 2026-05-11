// Greece + Italy 2023 — narrative summary, plan, and travel details for
// every day, plus the two image fixes the user requested (Day 5 Mykonos
// windmills via Wikimedia, Day 12 Rome Colosseum via Wikipedia).
//
// Mirrors scripts/inferDayContent.js (Thailand) — writes col M (travel),
// col N (summary / "Plan for the day"), col T (day_summary), and col G
// (image_url) on the itinerary sheet for trip_id=greece-italy-apr-2023.
//
// Usage: SHEET_ID=<id> node scripts/inferGreeceContent.js

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

const TRIP_ID = 'greece-italy-apr-2023';

const COL_IMAGE = 'G';        // 7  — image_url
const COL_TRAVEL = 'M';       // 13 — travel_details
const COL_SUMMARY = 'N';      // 14 — summary / "Plan for the day"
const COL_DAY_SUMMARY = 'T';  // 20 — day_summary (post-trip recap)

// Optional per-day image override. Days not listed keep their current cell.
const IMAGE_OVERRIDES = {
  5: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/The_four_windmills_in_Mykonos.JPG/1280px-The_four_windmills_in_Mykonos.JPG',
  12: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/330px-Colosseo_2020.jpg',
};

const DAY = {
  1: {
    plan: [
      'Land Athens evening (Gulf Air)',
      'Studio Near Acropolis check-in',
      'Light dinner at a local taverna',
      'Walk in Plaka — see the Acropolis lit up',
      'Early night — Santorini ferry tomorrow',
    ],
    travel: [
      'Bengaluru → Athens via Bahrain (Gulf Air GF-283)',
      'Taxi airport → Plaka apartment, ~45 min',
      'Studio Near Acropolis (Airbnb HMQBFAPR8Z)',
      'Get a Greek SIM at arrivals or a 7-day eSIM',
    ],
    summary:
      'Long flight day — Bengaluru to Athens via Bahrain. Settled into the studio near the Acropolis, light first dinner, a Plaka walk under floodlit Parthenon, then early to bed for the ferry to Santorini.',
  },
  2: {
    plan: [
      'Morning ferry Piraeus → Santorini (WorldChampion Jet)',
      'Transfer to Tzekos Villas, Fira',
      'Late lunch on the caldera',
      'Walk Fira → Firostefani at golden hour',
      'Dinner above the cliff edge',
    ],
    travel: [
      'Ferry Piraeus → Santorini (SeaJets WorldChampion Jet)',
      'Cab Athens → Piraeus port, ~30 min, leave early',
      'Bring motion-sickness pill — Aegean swell',
      'Tzekos Villas Hotel, Fira (Agoda 903087117)',
    ],
    summary:
      'Athens to Santorini by fast ferry. Tzekos Villas in Fira sits right on the caldera ridge. Settled in, a slow lunch, a walk along the cliff path to Firostefani, dinner watching the light fall on the volcano.',
  },
  3: {
    plan: [
      'Late breakfast on the terrace',
      'Traditional Sightseeing Bus Tour (Oia sunset)',
      'Stops: Pyrgos, Profitis Ilias, Megalochori, Akrotiri',
      'Sunset in Oia — get there 45 min early',
      'Dinner back in Fira',
    ],
    travel: [
      'Bus tour pickup at hotel, ~14:00',
      'Oia is mobbed for sunset — arrive 17:30 to claim a spot',
      'Cash for the wine-tasting stop',
      'Layer up — wind picks up after sundown',
    ],
    summary:
      'Santorini headline day. The bus tour looped through the southern villages — Pyrgos, Profitis Ilias monastery, Megalochori, the Akrotiri ruins — and ended in Oia for the sunset. Watched the famous blue dome turn gold, then gold to pink. Dinner back in Fira.',
  },
  4: {
    plan: [
      'Volcanic Islands cruise (Nea Kameni + hot springs)',
      'Sulphur swim in the warm bay',
      'Optional Oia stop on the way back',
      'Walk down the Donkey Way to the old port (if knees agree)',
      'Last Santorini dinner',
    ],
    travel: [
      'Cruise pickup at the old port, Fira',
      'Carry water shoes — Nea Kameni rocks are sharp',
      'Swimsuit under your clothes; tour gives barely 30 min to change',
      'Donkey Way: 587 steps down — knees, not heart',
    ],
    summary:
      'Volcano day — caldera cruise to Nea Kameni and a swim in the sulphur springs of Palea Kameni. Boat looped back via Thirassia and Oia. Climbed/declined the Donkey Way for the views. Quiet last dinner in Fira before the Mykonos ferry tomorrow.',
  },
  5: {
    plan: [
      'Ferry Santorini → Mykonos (SeaJets WorldChampion Jet, 12:00)',
      'Check in Magic View Suites, Mykonos Town',
      'Late lunch in the Old Port',
      'Stroll the labyrinth lanes of Chora',
      'Little Venice + windmills at sunset',
    ],
    travel: [
      'Ferry Santorini new port → Mykonos new port',
      'Cab from Mykonos new port → Chora, ~10 min',
      'Magic View Suites #3, Down Town (Airbnb HMTY8KQ9BH)',
      'No cars in Chora — bags get walked the last block',
    ],
    summary:
      'Santorini to Mykonos by ferry. Magic View Suites is bang inside the white-and-blue maze of Chora. Got lost on purpose, found Little Venice, watched the four windmills catch the last light. Different Greek island energy — more party, more polished.',
  },
  6: {
    plan: [
      'Beach day — Paradise or Super Paradise',
      'Lunch at a beach club',
      'Afternoon back in Chora',
      'Sunset cocktail at Caprice in Little Venice',
      'Long dinner on the waterfront',
    ],
    travel: [
      'Bus or cab Chora → Paradise / Super Paradise',
      'Sunbeds are pricey — split the cost or use the free strip',
      'Wind comes up by 16:00 — go in the morning for calm swimming',
      'Last bus back from beaches around 19:30',
    ],
    summary:
      'Lazy Mykonos day. Beach in the morning, back to Chora for a slow afternoon, sunset cocktails on the Little Venice waterfront with the sea coming up over the wall, and a long dinner. The kind of day Mykonos is built for.',
  },
  7: {
    plan: [
      'Morning ferry Mykonos → Piraeus (BLUE STAR NAXOS)',
      'Cab Piraeus → Acropolis apartment',
      'Quiet lunch in Koukaki',
      'Athens at dusk — short walk to the Acropolis base',
      'Dinner at a Plaka rooftop',
    ],
    travel: [
      'Long ferry leg — ~5 hours via Naxos, Paros',
      'Blue Star is bigger / slower / steadier than the SeaJets',
      'Book seats in the lounge upstairs for the comfortable view',
      '10 Min. Walk to Acropolis apartment (Airbnb)',
    ],
    summary:
      'Mykonos to Athens by Blue Star ferry — a long, easy passage with the Cyclades sliding past the windows. Checked into the apartment a ten-minute walk from the Acropolis. Quiet evening, looking up at the rock from every street.',
  },
  8: {
    plan: [
      'Acropolis at opening (08:00) — beat the heat',
      'Acropolis Museum after',
      'Lunch in Plaka',
      'Ancient Agora in the afternoon',
      'Last Greek dinner in Anafiotika',
    ],
    travel: [
      'Buy the combo ticket — Acropolis + Agora + Roman Agora + Lyceum',
      'Carry water + hat — Acropolis has no shade',
      'Acropolis Museum: skip the glass floor with shorts',
      'Anafiotika is the Cycladic village hidden behind the Plaka cliffs',
    ],
    summary:
      'The big Athens day — Acropolis at opening, the Parthenon and the Erechtheion in good light. Acropolis Museum after for context. Long lunch in Plaka. Wandered the Ancient Agora in the afternoon — emptier than the rock, and somehow more atmospheric.',
  },
  9: {
    plan: [
      'Athens → Naples (Aegean Airlines A3-680)',
      'Private transfer Naples → Amalfi',
      'Check in Amalfi Panoramic Coast',
      'Wind down on the balcony',
      'Light dinner in Amalfi town',
    ],
    travel: [
      'Aegean Airlines A3 680 — short morning hop',
      'Naples airport → Amalfi: 2 hr drive via Sorrento + the coast road',
      'The coastal SS163 is single-lane in places — driver knows the trick',
      'Amalfi Panoramic Coast, Via Maestra dei Villaggi',
    ],
    summary:
      'Athens to the Amalfi Coast in one big leg — flight to Naples, then the famous coast road down to Amalfi. The drive itself is the headliner: switchbacks, lemon groves, the Mediterranean dropping away. Settled into Amalfi Panoramic Coast with a sea-facing balcony.',
  },
  10: {
    plan: [
      'Path of the Gods morning hike (Bomerano → Nocelle)',
      'Lunch in Positano',
      'Beach time at Spiaggia Grande',
      'Dinner with a sea view',
      'Limoncello at a terrace bar',
    ],
    travel: [
      'Bus Amalfi → Agerola/Bomerano (~1 hr)',
      'Hike Bomerano → Nocelle, 1,700 steps down to Positano at the end',
      'Boots > sneakers — the path is uneven',
      'Ferry Positano → Amalfi for the easier return leg',
    ],
    summary:
      'Path of the Gods day — Bomerano to Nocelle on the cliff trail, with Positano sliding into view at the end. Long lunch on a Positano terrace, swim at Spiaggia Grande, ferry back to Amalfi. Earned every bite of pasta.',
  },
  11: {
    plan: [
      'Ferry to Capri for a day trip',
      'Boat around the island (Blue Grotto if calm)',
      'Anacapri + chairlift to Monte Solaro',
      'Late lunch in Capri Town',
      'Ferry back, last Amalfi dinner',
    ],
    travel: [
      'Ferry Amalfi → Capri Marina Grande, ~50 min',
      'Blue Grotto only opens when the swell is small — check at the dock',
      'Monte Solaro chairlift: top of the world, 12 min ride',
      'Last return ferry to Amalfi ~18:00',
    ],
    summary:
      'Capri day trip from Amalfi. Boat ride around the island, the Blue Grotto when the sea cooperated, lemons and Caprese salad in Capri Town, then up the Monte Solaro chairlift for the view of the whole island. Last evening on the Amalfi terrace before Rome tomorrow.',
  },
  12: {
    plan: [
      'Drive/transfer to Naples Centrale',
      'Frecciarossa to Rome (~1 hr 10 min)',
      'Check in Trevi Fountain Guesthouse',
      'Roman Forum + Palatine Hill (afternoon)',
      'Colosseum at 16:00 (timed ticket)',
    ],
    travel: [
      'Train Napoli Centrale 12:09 → Roma Termini (Frecciarossa 9421)',
      'Trevi Fountain Guesthouse, walking distance to the centre',
      'Pre-book Colosseum + Forum combo — same-day sells out',
      'Forum first (free with combo), Colosseum second for the queue trick',
    ],
    summary:
      'Amalfi to Rome via Naples. Frecciarossa runs at 250+ km/h and it shows — countryside blurs. Dropped bags at Trevi Fountain Guesthouse and went straight to the Forum and Palatine for the afternoon, then the Colosseum on a 16:00 slot. Rome at golden hour from inside the arena — unbeatable.',
  },
  13: {
    plan: [
      'Vatican Museums + Sistine Chapel (book first slot)',
      "St Peter's Basilica + cupola climb",
      'Lunch near Castel Sant\'Angelo',
      'Piazza Navona — underground stadium tour',
      'Trevi Fountain underground tour',
    ],
    travel: [
      'Book Vatican for 08:00 entry — the only way to dodge the wave',
      'Dress code: shoulders + knees covered (Vatican AND St Peter\'s)',
      'Piazza Navona stadium ticket is separate from Vatican',
      'Trevi underground tour is small group — pre-book',
    ],
    summary:
      'Rome day two — Vatican Museums and the Sistine Chapel at opening, St Peter\'s after with the cupola climb. Afternoon went underground twice: the Stadium of Domitian beneath Piazza Navona, and the aqueduct ruins beneath the Trevi Fountain. Pasta dinner near the apartment.',
  },
  14: {
    plan: [
      'Frecciarossa Rome → Florence (~1 hr 30 min)',
      'Check in Hotel St. James, Florence',
      'Ponte Vecchio + Piazza della Signoria',
      'Palazzo Vecchio courtyard',
      'Dinner with a Chianti',
    ],
    travel: [
      'Train Roma Termini → Firenze Santa Maria Novella',
      'Florence centre is walkable — leave the cab at the station',
      'Hotel St. James, Via XXVII Aprile 18',
      'Florence cathedral skip-the-line ticket if you want the climb',
    ],
    summary:
      'Rome to Florence by Frecciarossa. Florence is a different scale — denser, more intimate. Walked the Ponte Vecchio, stood in Piazza della Signoria with the statues for company, peeked into the Palazzo Vecchio courtyard. Tuscan dinner, an early night.',
  },
  15: {
    plan: [
      'Train Florence → Pisa morning',
      'Leaning Tower + Pisa Baptistery + Cathedral',
      'Lunch on the Arno',
      'Train back to Florence late afternoon',
      'Uffizi Gallery if time + tickets',
    ],
    travel: [
      'Train Firenze SMN → Pisa Centrale, ~1 hr 10 min',
      'Tower ticket has timed entry — book at least a day ahead',
      'Local train, RE 02 class — sit anywhere',
      'Total Pisa loop fits in 4–5 hours; come back to Florence for dinner',
    ],
    summary:
      'Pisa day trip — leaned against the Leaning Tower for the obligatory photo, walked the Piazza dei Miracoli, climbed (some of) the bell tower. Lunch on the Arno, train back to Florence, and an evening drift through the city.',
  },
  16: {
    plan: [
      'Frecciarossa Florence → Venice (~2 hr)',
      'Check in Hotel Locanda Salieri (Santa Croce)',
      'Vaporetto down the Grand Canal',
      "St Mark's Square + Basilica + Campanile",
      'Dinner in a quiet sestiere',
    ],
    travel: [
      'Train Firenze SMN → Venezia Santa Lucia',
      'No cars in Venice — vaporetto or your feet',
      'Hotel Locanda Salieri is a 5-min walk from the station',
      'St Mark\'s Basilica entry is free; bag check is mandatory',
    ],
    summary:
      'Florence to Venice — the train glides over the lagoon onto the island and the city appears. Vaporetto past every palazzo on the Grand Canal, St Mark\'s with the gold mosaics, the Campanile for the rooftop view. Dinner away from the main piazza, in the quiet behind the canals.',
  },
  17: {
    plan: [
      'Frecciarossa Venice → Milan (~2 hr 20 min)',
      'Check in Hotel Terminal, Stazione Centrale',
      'Leonardo3 (interactive Leonardo da Vinci museum)',
      "The Last Supper — Refectory, Santa Maria delle Grazie",
      'Duomo at sunset',
    ],
    travel: [
      'Train Venezia Santa Lucia → Milano Centrale',
      'Hotel Terminal — right next to the station',
      'Last Supper has timed 15-min slots — book months ahead',
      'Duomo terraces close at sunset — get up before then',
    ],
    summary:
      'Venice to Milan, the last train day. Leonardo3 in the morning for the interactive engineering side of him, then the Last Supper in the refectory — 15 minutes is all you get and it\'s enough. Sunset on the Duomo terraces, the Alps faint on the horizon.',
  },
  18: {
    plan: [
      'Milan → Bengaluru (Etihad EY-88 via Abu Dhabi)',
      'Early airport transfer',
      'Last espresso in the terminal',
      'Long flight home',
      'Sleep',
    ],
    travel: [
      'Etihad EY-88 Milan → Abu Dhabi → BLR',
      'International check-in cuts 90 min before — be at MXP by 09:00',
      'Carry the Frecciarossa receipts in carry-on (proof of stay if asked)',
      'Sleep on the AUH → BLR leg, it lands early morning India time',
    ],
    summary:
      'Going home. Etihad through Abu Dhabi to Bengaluru, three weeks closing out at altitude. Greece + Italy bookended by a Gulf Air arrival and an Etihad return — every train in between worked, every ferry too.',
  },
};

async function main() {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'itinerary!A:U',
  });
  const rows = r.data.values || [];

  const updates = [];
  let touched = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if ((row[0] ?? '').toString() !== TRIP_ID) continue;
    const dayNum = parseInt((row[1] ?? '').toString(), 10);
    if (!Number.isFinite(dayNum)) continue;
    const c = DAY[dayNum];
    if (!c) continue;
    const sheetRow = i + 1;
    updates.push({ range: `itinerary!${COL_TRAVEL}${sheetRow}`,      values: [[c.travel.join('\n')]] });
    updates.push({ range: `itinerary!${COL_SUMMARY}${sheetRow}`,     values: [[c.plan.join('\n')]] });
    updates.push({ range: `itinerary!${COL_DAY_SUMMARY}${sheetRow}`, values: [[c.summary]] });
    if (IMAGE_OVERRIDES[dayNum]) {
      updates.push({ range: `itinerary!${COL_IMAGE}${sheetRow}`, values: [[IMAGE_OVERRIDES[dayNum]]] });
    }
    touched++;
  }

  for (let i = 0; i < updates.length; i += 80) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates.slice(i, i + 80) },
    });
  }
  console.log(`✓ Updated ${touched} Greece+Italy days (${updates.length} cells).`);
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
