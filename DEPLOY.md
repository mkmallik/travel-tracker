# Deployment guide

This project is an Expo Web app with Vercel serverless functions that proxy to a private Google Sheet. Cross-device sync (laptop + phone) works through the Sheet; auth is a single password guarding the app URL.

## One-time setup

### 1. Seed the Google Sheet

Runs locally once, from your machine.

```bash
# 1. Place your service-account JSON key here (gitignored)
mv ~/Downloads/travel-tracker-*.json scripts/service-account.json

# 2. Seed the Thailand itinerary + default settings
npm run seed
```

You should now see the 13 days in the `itinerary` tab and defaults in `settings`.

### 2. Deploy to Vercel

**Option A — via GitHub (recommended):**

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework: **Other** (Vercel will pick up `vercel.json`).
4. Click **Environment Variables** and add the four below.
5. Click **Deploy**.

**Option B — via Vercel CLI:**

```bash
npm i -g vercel
vercel          # first time: it will ask to link
# Add env vars via dashboard or: vercel env add <NAME> production
vercel --prod
```

### 3. Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Value | Notes |
|---|---|---|
| `GOOGLE_SHEET_ID` | `13grSBTA59EmnK9x7IFJ7vZrMw2-xuCic_BDf0f1oqr8` | the ID from the sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `sheets-proxy@travel-tracker-494217.iam.gserviceaccount.com` | from the service-account JSON file |
| `GOOGLE_PRIVATE_KEY` | *(paste the `private_key` field from the JSON — include the `-----BEGIN PRIVATE KEY-----` lines and all `\n` escapes)* | Vercel's textarea handles multiline fine |
| `APP_PASSWORD` | *(the password you want to gate the app with)* | min 8 chars recommended |
| `JWT_SECRET` | *(any long random string)* | e.g. `openssl rand -hex 32` output |

Set all five for **Production**, **Preview**, and **Development** scopes.

### 4. Optional — set the API base for local Expo dev

If you want to run the app locally against the deployed serverless functions:

```bash
# .env.local (gitignored)
EXPO_PUBLIC_API_BASE=https://your-app.vercel.app
```

Then `npm run web` will call the deployed `/api/*` endpoints.

---

## Day-to-day usage

- **Phone**: bookmark the Vercel URL. First visit: enter password (valid for 30 days). Log expenses, view itinerary, see summary.
- **Laptop**: same Vercel URL for the app UI — OR open the Google Sheet directly for power-user editing (sort, filter, bulk updates, formulas, paste from Excel).
- **Sync**: tap the Refresh button on the Summary tab to pull latest changes from the sheet. Writes from the app push to the sheet immediately.

## How the moving parts fit together

```
  Phone (Expo app)  ┐                 ┌→  Google Sheet
                    ├→ Vercel (API) ──┤    (private, 3 tabs)
  Laptop (app URL)  ┘                 ↑
                                      └── Laptop (sheets.google.com)
```

The service-account credentials never leave Vercel's environment. The browser bundle has no secrets — only the Vercel URL. The Sheet stays private to your Google account.

## Troubleshooting

- **"Wrong password"**: check `APP_PASSWORD` env var matches what you typed. After changing env vars on Vercel, redeploy.
- **"Sheets read failed"**: confirm the service-account email is shared as Editor on the sheet. Check `GOOGLE_PRIVATE_KEY` includes the header/footer lines.
- **Old data showing after laptop edit**: tap Refresh on Summary tab — the phone doesn't auto-poll yet (Phase 2 todo).
- **Login screen keeps appearing**: JWT expired (30 days) or `JWT_SECRET` changed between deploys. Log in again.

## Not yet implemented

- Laptop table view *in the app* — for now edit directly in Google Sheets (which is arguably better). Phase 2.
- Auto-polling for remote changes — tap Refresh for now.
- Offline-first optimistic writes queue (writes currently require network).
