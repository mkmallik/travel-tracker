// Pre-fills the `blog` column (col U) for the Bali (Apr 2024) and
// Greece + Italy (Apr 2023) trips. Long-form storytelling, 3 paragraphs
// per day, no costs or per-line-item amounts — same shape as
// inferBlogContent.js (Thailand).
//
// Usage: SHEET_ID=<id> node scripts/inferPastBlogs.js

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

const COL_BLOG = 'U';

// ─── BALI (Apr 28 – May 12, 2024) ────────────────────────────────────
const BALI = {
  1: [
    'Bengaluru to Bali. IndiGo 6E 1605 lifted off just before 01:00 and seven hours later we were stepping out into Denpasar\'s sticky pre-dawn air. The visa-on-arrival queue was patient and slow. Outside, the taxi tout symphony started immediately — Grab on the phone settled it quickly.',
    'An hour up to Ubud, watching the rice fields catch the first light and the scooter traffic build. Sayong House, on Dewi Sita Street right behind Maruti Lane, has a courtyard plunge pool and a breakfast veranda — exactly the kind of small Balinese stay you want. Dropped the bags, slept off the night flight, and surfaced for a late lunch at one of the warungs on Monkey Forest Road.',
    'Evening was a slow loop of Ubud town — the Monkey Forest gate, Saraswati Temple, dinner with the gamelan drifting in from somewhere nearby. Bali doesn\'t announce itself; it just absorbs you.',
  ],
  2: [
    'First full Ubud day. Morning at the Tegalalang Rice Terraces — the famous staircase paddies cascading down the valley wall, with the bamboo coconut swings looking out over them. You walk the trail along the top tier, then drop down through the terraces themselves.',
    'Afternoon was the Sacred Monkey Forest right in town. The macaques know exactly who you are and exactly what\'s in your bag. Kept a tight grip on sunglasses; lost a banana anyway. The forest temples are mossy, atmospheric — Pura Dalem Agung at the heart of it.',
    'Dinner at Locavore-adjacent — Ubud\'s food scene punches above its weight. Walked back through the lit-up Saraswati lotus pond and called it.',
  ],
  3: [
    'Ubud day for waterfalls. Tegenungan first thing — the wide curtain you reach by climbing down a flight of stone steps, swimming in the basin where it lands. Tibumana after, deeper in the jungle, much quieter.',
    'Lunch up at one of the cliff-edge places looking back across the Ayung valley. The Bali coffee culture is real — every café does pour-over Kintamani beans, and you keep ordering more.',
    'Late afternoon Yoga Barn class to undo the waterfall hike. Evening market browsing on Hanoman — a few small things picked up, mostly walking and looking. Last Ubud dinner.',
  ],
  4: [
    'Last Ubud morning, slow on purpose. Breakfast on the Sayong House veranda — fresh papaya, jaffles, sweet kopi tubruk. Then a cycling loop through the rice fields north of town with a local guide — flat, easy, an hour and a half through the paddies and small village temples.',
    'Afternoon at Pura Tirta Empul — the holy springs temple where pilgrims queue to bathe in the spouts. The water is icy. You buy a sarong at the entrance, go through the ritual, get blessed at the end. Spiritually and practically a reset.',
    'Quiet last evening in Ubud. Dinner at one of the smaller warungs, an early night — speedboat to Nusa Penida tomorrow.',
  ],
  5: [
    'Ubud to Nusa Penida. Hotel pickup early, the van wound down through Mas and Sukawati to Sanur, and the speedboat across to Toya Pakeh on Nusa Penida took about half an hour — choppy and wet on the front rows, calmer at the back.',
    'Sea Terras Suite sits up the hill from Batumulapan with the kind of view you book Nusa Penida for: the strait and Lembongan beyond it, frangipani in the foreground. Settled in, swam in the resort pool, and ate dinner watching the boats come back in.',
    'Nusa Penida is rough — the roads are bad, the cliffs are dramatic, and the island feels much wilder than mainland Bali. Tomorrow is the headline day.',
  ],
  6: [
    'The big Kelingking day. Up early, in a car with a driver who clearly knows the road by feel — the western Nusa Penida road is half potholes, half rubble. Worth it. Kelingking is the cliff that looks like a dinosaur\'s arched back, with a tiny white-sand cove hundreds of metres below.',
    'The hike down to the beach is a metal-ladder-and-rope affair, an hour of vertical descent. Most people stop at the viewpoint. We went down, and once you\'re on the sand it\'s a different planet — pounding surf, almost no one else, the cliff towering overhead.',
    'After the climb back up, the rest of the loop: Broken Beach (a natural arch and a swirling cove you look down into), Angel\'s Billabong (a tide pool right on the cliff\'s edge — only safe at low tide), Crystal Bay sunset. The driver waited through all of it. Long, dusty, perfect day.',
  ],
  7: [
    'East-side Nusa Penida day. Diamond Beach and Atuh Beach sit on the wild east coast — Diamond is a fan of cliff-staircase down to perfect sand and a single huge sea stack offshore, Atuh is the calmer neighbour to the south.',
    'The drive over is brutal but the payoff is huge. Spent the morning at Diamond, the afternoon at Atuh, with a lunch break at one of the cliff-top warungs serving nasi campur and ice-cold coconuts. The water is bluer than seems plausible.',
    'Back to Sea Terras at dusk, sunburn arriving on schedule. Goreng Tempe and a Bintang on the patio. Easy.',
  ],
  8: [
    'Nusa Penida to Gili Trawangan. Fast ferry Nusa Penida → Padangbai on Bali, then the speedboat from Padangbai across to Gili T — under an hour but choppy again. Different Indonesia from here on: Lombok-side, Muslim-majority, no motorised vehicles on the island at all.',
    'Blu d\' aMare is tucked into the quieter northern side of Gili T, ten minutes by cidomo (horse cart — the only land transport on the island) from the main strip. Bungalow with an outdoor shower, the kind of place that makes you forget how loud the world is.',
    'Late afternoon walk on the beach all the way around to the night market on the east side. Skewers, fresh fish, watermelon juice, sunset over the strait toward Bali with Mount Agung silhouetted on the horizon.',
  ],
  9: [
    'Gili T snorkel day. Boat trip to the three Gilis (Trawangan, Meno, Air) — turtle spotting at the reef off Meno was the headline, big calm green turtles cruising past at three metres.',
    'Lunch on Gili Air, the quietest of the three. Snorkelled the underwater statues off the north of Trawangan in the afternoon — eerie and good. Back to Blu d\' aMare by mid-afternoon, drained in the best way.',
    'Sunset on the hill at the centre of Trawangan, then a slow dinner at one of the beachside places — the entire west coast of Gili T faces the sunset and the restaurants line up accordingly.',
  ],
  10: [
    'Lazy Gili T day. No boats, no plan. Bicycle rented from the dive shop next door, slow loop around the island — about an hour and a half if you stop a lot, which we did.',
    'Afternoon on a beach swing at Pink Coco beach club. Read, swam, slept on a sun lounger, ordered too many fruit smoothies. The afternoon wind on Gili T cools everything down and makes the heat tolerable.',
    'Dinner on the beach again — the same instinct kept winning out. Watching the orange sky go pink over the sea, the small boats coming back, the kids playing in the surf. One of those evenings you keep in a pocket.',
  ],
  11: [
    'Gili T to Bali, second half of the trip starts. Speedboat back across to Padangbai, then the long drive down to Seminyak — almost three hours through the bottle-neck Denpasar traffic. Bali roads are an experience.',
    'FuramaXclusive Ocean Beach Hotel sits on Jalan Arjuna in Legian, a five-minute walk to the beach. After a week of bungalows and small-island simplicity, the resort is a big swing — proper pool, breakfast buffet, beach club access.',
    'Evening at Seminyak beach watching surfers ride the long left-handers in the sunset, then dinner on Eat Street — the row of restaurants along Jalan Petitenget. Bali has many faces; this is the polished one.',
  ],
  12: [
    'Surf day. Lessons at Single Fin in the morning — Seminyak\'s long beach break is the gentlest place in Bali to stand up. Stood up for about a second the first time, longer the second, and eventually managed to ride one almost all the way in. Salt water everywhere.',
    'Back to the pool for the afternoon. The hotel pool with a coconut and a book is its own kind of vacation — particularly after a week of doing things.',
    'Beach club sunset at Potato Head — the famous coastline bar with the wooden-shutter facade, where the cocktails come slowly and the music is good. Skipped the dinner menu and walked back to a smaller place. Last few days have that beginning-of-the-end feeling.',
  ],
  13: [
    'South Bali day. GWK Cultural Park first — the massive Garuda Wisnu Kencana statue, taller than the Statue of Liberty, finished only a few years ago. The plaza around it is grand and a little surreal.',
    'Uluwatu Temple in the afternoon — perched on the southern cliff with the surf pounding two hundred metres below. The monkeys here are even more practised thieves than Ubud\'s; sunglasses on a leash, please. Stayed for the Kecak fire dance at sunset, the chant rising as the sky goes dark behind the temple silhouette.',
    'Dinner at Single Fin or Sundays Beach Club — depends which way the wind\'s blowing. Cliff-edge bars in this part of Bali are unmatched.',
  ],
  14: [
    'Last full day, doing nothing on purpose. Slow breakfast, swam, packed the bags loosely, swam again. Walked to Seminyak beach late afternoon.',
    'Final dinner at Mama San — Asian fusion menu, dark wood, very Bali-modern. A nightcap at a small bar in Legian, then back to the hotel, alarm set for 04:30.',
    'Two weeks bookended by IndiGo flights and four wildly different stays — Ubud jungle, Nusa Penida cliffs, Gili Trawangan beach bungalow, Seminyak resort. The right number of moves.',
  ],
  15: [
    'Going home. 04:30 cab to Denpasar, IndiGo 6E 1606 lifted off DPS at 11:20 and landed Bengaluru just before 15:00. Bali says goodbye with one of those bright humid mornings that makes the airport announcements feel particularly final.',
    'A quiet flight, a long cab home through Bengaluru traffic. The trip ledger closes here — frangipani in the bags, sunburn fading, the photos to sort still ahead.',
  ],
};

// ─── GREECE + ITALY (Apr 15 – May 2, 2023) ───────────────────────────
const GREECE = {
  1: [
    'Bengaluru to Athens via Bahrain on Gulf Air. Two flights, a layover, and the slow recognition of European time hitting somewhere over the Aegean. Cleared immigration around late evening, taxi up through the Athens night to a small studio just behind the Acropolis.',
    'Studio Near Acropolis is exactly the kind of Plaka place you want for a first night — old building, modern fit-out, lemon tree out back. Dropped bags and pushed straight out for a walk — Plaka after midnight, the Parthenon lit on its rock, almost no one else around.',
    'Light first dinner at a still-open taverna on Adrianou. Tomorrow the ferries start.',
  ],
  2: [
    'Athens to Santorini by fast ferry. Up early for the cab down to Piraeus — the port wakes up at 06:00 and is full motion by 07:00, ferries lining up like buses. SeaJets\' WorldChampion Jet is a low-slung hydrofoil that hammers the waves; the front rows feel every chop.',
    'Five hours of Aegean, the Cycladic islands passing one by one — Sifnos, Folegandros, Ios — and then the dark cliff of the Santorini caldera rising up. The new port at Athinios is just a switchback below the rim. Up the road by van to Fira and Tzekos Villas, perched on the edge.',
    'Caldera-side balcony, late lunch, a long walk along the cliff path from Fira to Firostefani as the light dropped. Dinner with the volcano dark in the centre of the bay. Santorini puts on its show without trying.',
  ],
  3: [
    'Santorini sightseeing day, bus tour edition. The Traditional Sightseeing tour from Fira looped the southern half of the island — Pyrgos with its hilltop chapel and views across the entire caldera, Profitis Ilias monastery higher still, Megalochori for the wine tasting, and the Akrotiri archaeological site for the buried Minoan town.',
    'Then the big finale — Oia for sunset. The bus drops you about 17:00 and you walk down the marble main lane with a thousand other people, picking a spot on the western edge of the village. The famous blue domes catch the dropping sun, the whole village goes gold then pink then violet.',
    'Back to Fira for a late dinner. Three weeks of European spring travel just started, and this is the picture that everyone will ask about.',
  ],
  4: [
    'Volcano day. Cruise out of Fira\'s old port — itself worth the ride, a switchback path down the cliff that you can walk, take the cable car, or ride a donkey. We took the cable car going down.',
    'The first stop is Nea Kameni, the active volcanic island in the middle of the caldera. A 30-minute walk up the crater rim across black volcanic rubble; the views back to Fira and Oia are huge. From the top you can see the whole horseshoe of the island the way it used to be, before the Minoan eruption blew it apart.',
    'Then Palea Kameni for the sulphur springs — you jump off the boat and swim into a warm yellow-brown bay that smells faintly of eggs. The walk back up the Donkey Way at the end (587 steps) is the leg-burner. Last Santorini dinner before tomorrow\'s ferry to Mykonos.',
  ],
  5: [
    'Santorini to Mykonos by the fast ferry. SeaJets again, two hours of Cycladic crossing, into Mykonos new port mid-afternoon. The contrast hits immediately: Santorini is dramatic and vertical, Mykonos is windswept and horizontal — a low whitewashed town spilling down to the sea.',
    'Magic View Suites #3 sits inside the maze of Chora itself — no cars in the old town, you walk the last block with your bags. Got lost on purpose in the alleyways immediately, found Little Venice where the buildings sit right at the water line, found the famous Four Windmills on the ridge at sunset.',
    'Mykonos in April is gentler than the high-season chaos. The bars were full but not packed; the restaurants had tables; the small boats came back to the old port as the sky went pink. Different Greek island energy.',
  ],
  6: [
    'Mykonos beach day. Bus from the central station out to Paradise Beach in the morning. The beach itself is the wide sweep on the south coast; the beach clubs line the back of it with white loungers and music that gets louder as the day goes on.',
    'Lunch at a beach club, swam, read. The Aegean is still cold in April but you adapt fast. Wind picks up in the afternoon — a Mykonos signature — so we headed back to Chora mid-afternoon.',
    'Final evening on the island: a sunset cocktail at one of the Little Venice bars with the sea coming up over the wall just below your table, then a slow dinner away from the main piazza in the quiet behind the church. The kind of day Mykonos is for.',
  ],
  7: [
    'Mykonos to Athens by the long ferry — Blue Star Naxos out of Mykonos new port, calling at Naxos and Paros before Piraeus. About five hours total, on a much bigger boat than the SeaJets. The slower pace is its own pleasure — the Cyclades unfold in real time.',
    'Athens by late afternoon, cab to the apartment about ten minutes\' walk from the Acropolis base. After a week of Cycladic islands, the city feels enormous and humming.',
    'Quiet first Athens evening. A short walk to look up at the rock with the lights coming on, then dinner at a place in Koukaki — outside table, the Parthenon glowing on the ridge above us.',
  ],
  8: [
    'The Athens day. Acropolis at opening — 08:00, before the cruise-ship crowds. The path up through the Propylaea, the Erechtheion with its caryatid porch, and then the Parthenon itself, gold-tinted in early light. You take your time and the place takes its time back.',
    'Acropolis Museum after — the design is brilliant; the glass floor over the archaeological dig underneath, the Parthenon Frieze laid out on the top floor at the same orientation as the actual temple visible through the windows. Forty minutes of context that makes the morning rock make sense.',
    'Long Greek lunch in Plaka. Afternoon in the Ancient Agora — emptier than the Acropolis, somehow more atmospheric, with the Temple of Hephaestus completely intact at the top of the hill. Last Greek dinner that night in Anafiotika, the Cycladic-village pocket of Plaka hiding behind the cliffs.',
  ],
  9: [
    'Greece to Italy in one big day. Aegean Airlines A3-680, short morning hop Athens to Naples Capodichino. The drive down the Amalfi Coast starts the moment you exit the airport — through Sorrento, around the headland, onto SS163 with the sea dropping away on the right.',
    'The Amalfi coastal road is the headliner. Two hours of switchbacks, lemon groves clinging to terraced slopes, fishing villages tucked into impossible coves — Positano coming into view, then Praiano, then finally Amalfi itself, a white town wedged between cliffs and sea.',
    'Amalfi Panoramic Coast is up above the town, a balcony with a clean blue view of the Tyrrhenian. Settled in, walked down into the town centre for the cathedral and a slow evening pasta in the piazza.',
  ],
  10: [
    'Path of the Gods day. Bus from Amalfi up through Agerola to Bomerano, the trailhead at about 600 metres. The path runs along the cliff above the coast — Capri visible to the west on clear days — and ends with the sting in the tail: about 1,700 steps down to Nocelle, perched above Positano.',
    'Lunch in Positano on a terrace with the iconic view: the pastel buildings cascading down to the beach, the church dome at the centre, the sea past. Spiaggia Grande for a swim and a sun lounger. The water is still bracing in April.',
    'Ferry back to Amalfi at the end of the afternoon — a much easier return than the bus would have been, and you see Positano from the water as you leave. Pasta and a Negroni back at the hotel.',
  ],
  11: [
    'Capri day trip. Ferry out of Amalfi marina to Capri\'s Marina Grande, fifty minutes flat across the open water. Capri itself is small but stacked — the marina at sea level, Capri Town up on the central saddle, Anacapri across the western ridge.',
    'Took the small boat ride around the island — past the Faraglioni rock stacks, the Blue Grotto opening up just enough that day for a glimpse inside. Funicular up to Capri Town for the piazzetta and a long lemon-themed lunch — the lemons here are the size of softballs.',
    'Chairlift up Monte Solaro in the afternoon — twelve minutes of dangling above terraced gardens and oleander, then a 360-degree view of the entire island and the bay of Naples beyond. Back to Amalfi for the last evening on this coast.',
  ],
  12: [
    'Naples Centrale to Roma Termini on a Frecciarossa, the high-speed train that does 250+ km/h and shows it — the countryside blurs past the windows. About 70 minutes of stations and tunnel.',
    'Trevi Fountain Guesthouse is exactly where the name says, and exactly the right place to drop bags in Rome. Walked over to the Roman Forum in the afternoon — through the Arch of Septimius Severus, past the Temple of Saturn, up the Palatine Hill where the emperors lived.',
    'Then the Colosseum on a 16:00 timed ticket — late enough that the light is going gold on the limestone, but enough sun left to see the substructures and feel the scale. Standing in the centre of the arena floor with the sun dropping behind it is unforgettable. Pasta dinner near Piazza Navona.',
  ],
  13: [
    'Vatican day. 08:00 entry into the Museums — the only way to do them, because by 10:00 the queue snakes for an hour. Long galleries (Map Room, Tapestries) build up to the Sistine Chapel at the end — Michelangelo\'s ceiling and the Last Judgement, in a room you\'re not allowed to talk in.',
    'Into St Peter\'s after — the Basilica is so big it doesn\'t feel big until you notice how small the people up by the altar are. Climbed the cupola for the view over Bernini\'s colonnade and the whole city.',
    'Afternoon went underground twice: the Stadium of Domitian under Piazza Navona (the elongated shape of the piazza is the outline of the chariot track that was there), and the aqueduct ruins under the Trevi Fountain. Rome has these layers everywhere. Dinner back at the apartment district.',
  ],
  14: [
    'Rome to Florence by Frecciarossa, 90 minutes through Tuscan farmland. Out of the train at Firenze Santa Maria Novella and the city is small enough that you walk to the hotel; Hotel St. James is just north of the duomo.',
    'Florence is a different scale from Rome — denser, more intimate, more domestic. Walked the Ponte Vecchio with the gold shops over the Arno, stood in Piazza della Signoria with the statues for company, peeked into the Palazzo Vecchio courtyard where the fountain runs.',
    'Tuscan dinner — bistecca and a Chianti — and a slow walk back. Florence in the evening is golden everywhere, the stone glowing.',
  ],
  15: [
    'Pisa day trip. Regional train from Firenze SMN to Pisa Centrale in about an hour ten — the slow train, scenic, sit anywhere. Out of the station, fifteen minutes\' walk to the Piazza dei Miracoli and the famous Leaning Tower with the Cathedral and Baptistery around it.',
    'Did the photo. Climbed (some of) the bell tower — the tilt is more apparent inside, the floors slanted under your feet. Walked the Cathedral and the Baptistery; the Baptistery acoustics are unreal — the guide demonstrates by singing into the centre.',
    'Lunch on the Arno before training back to Florence. Quiet evening, a slow walk through the side streets and a final long Florentine dinner.',
  ],
  16: [
    'Florence to Venice by Frecciarossa — about two hours, finishing with the bridge across the lagoon that puts you, suddenly, on an island where there are no cars.',
    'Hotel Locanda Salieri is a five-minute walk from Venezia Santa Lucia, in the Santa Croce sestiere. Bags down, then the obligatory vaporetto down the Grand Canal — every palazzo on either side, Ca\' d\'Oro, Rialto Bridge, the Salute, finally St Mark\'s.',
    'St Mark\'s Basilica with the gold mosaics catching what light there is inside, the Campanile climbed for the rooftop view across the lagoon, the Doge\'s Palace at sunset. Dinner in a small place behind the canals, away from the tourist run.',
  ],
  17: [
    'Venice to Milan, the last train day. Frecciarossa again, just over two hours west into Lombardy. Hotel Terminal is right next to Milano Centrale, which is itself a piece of theatre — vaulted Art Nouveau cathedral of a station.',
    'Leonardo3 in the morning — the interactive museum dedicated to Leonardo da Vinci\'s engineering side, where they\'ve built working models of his machines. Then the big one: Santa Maria delle Grazie for The Last Supper, fifteen minutes in front of the fresco in a climate-controlled room. You book months in advance for those fifteen minutes and they\'re worth every one.',
    'Duomo at sunset — climbed up to the roof terraces, walked among the spires with the Alps faint on the northern horizon. Last European dinner in the Galleria.',
  ],
  18: [
    'Going home. Etihad EY-88 Milan → Abu Dhabi → Bengaluru. Three weeks closing out at altitude. Greece + Italy bookended by a Gulf Air arrival and an Etihad return — every train in between worked, every ferry too, the Frecciarossas in particular felt like cheating.',
    'Long flight, quiet flight, the Mediterranean dropping away through cloud. Bengaluru at the other end, monsoon-end light. The trip ledger closes here — three countries, eight cities, four boat rides, six trains, two flights. A different shape of trip than the South-East Asia ones, and worth every leg.',
  ],
};

async function applyBlogs(trip_id, blogMap) {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'itinerary!A:U',
  });
  const rows = r.data.values || [];
  const updates = [];
  let touched = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if ((row[0] ?? '').toString() !== trip_id) continue;
    const day = parseInt((row[1] ?? '').toString(), 10);
    if (!Number.isFinite(day)) continue;
    const paras = blogMap[day];
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
  console.log(`  · ${trip_id}: blog for ${touched} day(s) written`);
}

async function main() {
  await applyBlogs('bali-apr-2024', BALI);
  await applyBlogs('greece-italy-apr-2023', GREECE);
  console.log('✓ Done.');
}

main().catch((e) => { console.error('Failed:', e?.message ?? e); process.exit(1); });
