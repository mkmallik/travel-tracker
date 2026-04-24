# travel-tracker

A personal travel app for itineraries, bookings, and expenses — built so the owner can use it from their phone on the go and edit the underlying data from their laptop via Google Sheets.

Three primary screens:
- **Itinerary** — day-by-day cards with hero photos, transit lines, accommodation info, day budget vs. actual spend
- **Log** — add expenses or bookings (Hotel / Flight / Activity / Transfer), with a native calendar picker, THB/INR toggle, and auto-link to the trip day
- **Summary** — total spent in dual currency, breakdown by category and by day, appearance toggle (Light / Dark / Auto), data import/export

Multi-trip from the start: the "Trips" tab holds each trip's metadata; the currently-closest trip auto-selects on open.

## Stack

- **Expo (React Native) + TypeScript** — one codebase for iOS, Android, and web
- **Google Sheets as the source of truth** — five tabs: `trips`, `itinerary`, `expenses`, `bookings`, `settings`
- **Vercel serverless functions** — tiny proxy over the Sheets API (service-account credentials stay in env vars, never touch the browser bundle)
- **Password gate** — single `APP_PASSWORD`, 30-day JWT session

## Repo layout

```
api/                  Vercel serverless functions
  auth/login.ts       password → 30-day JWT
  sheets/get.ts       read all trips + scoped itinerary/expenses/bookings
  sheets/trip.ts      CRUD for trips
  sheets/expense.ts   CRUD for expenses (POST / PATCH / DELETE)
  sheets/booking.ts   CRUD for bookings (hotel / flight / activity / transfer)
  sheets/day.ts       patch itinerary day rows
  sheets/setting.ts   patch settings
  lib/auth.ts         JWT verify + CORS helpers
  lib/sheets.ts       Google Sheets client (service-account JWT)
  lib/schema.ts       canonical column orders per tab
src/
  screens/            Itinerary, DayDetail, LogExpense, BookingForm,
                      Summary, LoginScreen
  components/         HeroImage, DatePicker, TripSwitcher, Money
  store/              AsyncStorage-backed store with optimistic writes
  api/client.ts       HTTP client for /api/*
  theme/              light + dark palettes, useTheme hook
  data/               types + generated seed data
scripts/
  seedSheet.js        one-time: creates tabs, writes headers, seeds your
                      itinerary from assets/trip.csv
  parseCsv.js         regenerate src/data/seedTrip.ts from the CSV
  updateImages.js     swap trip CSV image URLs for curated Unsplash photos
assets/trip.csv       the itinerary source-of-truth for seeding
vercel.json           Vercel config (static export + API routes)
```

## Getting started

See [DEPLOY.md](./DEPLOY.md) for the full deployment recipe:

1. Create a Google Cloud project, enable the Sheets API, create a service account + JSON key
2. Create a Google Sheet with the expected tabs, share it as Editor with the service-account email
3. Drop the JSON key at `scripts/service-account.json` (gitignored) and run `SHEET_ID=<your-sheet-id> npm run seed`
4. Push this repo to your own GitHub account
5. Import into Vercel, set the 5 env vars, deploy

Local dev:

```bash
npm install
npm run web   # Expo on localhost:8081
```

## Why Google Sheets instead of a database

The laptop view **is** the Google Sheet — sort, filter, bulk edit, paste from Excel, formulas. The app reads from and writes back to it. No custom admin UI to maintain, no database to host, and your data lives in a place you already understand. The downside is that it's single-tenant and not great for concurrent editing, but for a personal travel tracker that's exactly the right shape.

## License

Personal project, no license asserted. Fork freely — if it's useful to you, enjoy.
