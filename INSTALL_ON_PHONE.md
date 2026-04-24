# Install on your phone

The deployed web app is PWA-capable — you can install it as a standalone
Android/iOS app that auto-updates whenever the site changes.

## Option 1 — PWA install (fastest, no build)

### Android (Chrome)

1. Open `https://travel-tracker-v2.vercel.app/` in Chrome
2. Tap the **⋮** (three-dot menu) top-right
3. Tap **Install app** (or **Add to Home screen**)
4. The Travel Tracker icon appears on your home screen
5. Tap it — launches full-screen, no URL bar, behaves like a native app

### iOS (Safari)

1. Open the URL in Safari (iOS Safari only supports install from there)
2. Tap the **Share** button (square with arrow up)
3. Scroll down → **Add to Home Screen**
4. Name it "Travel" → Add

### What you get
- Standalone launch (no browser chrome)
- App icon on home screen
- Works offline for cached pages (login + last-loaded data)
- **Auto-updates** — every launch pulls the latest site

### What you lose vs. a proper APK
- Not distributable via Play Store
- Can't be shared as a file to other users
- No push notifications (unless we add a service worker)

---

## Option 2 — Android TWA APK (produces an `.apk` file)

Once the PWA manifest is live (it is now, since we added
`public/manifest.webmanifest`), use PWABuilder.com to generate a signed APK:

1. Go to https://www.pwabuilder.com
2. Paste `https://travel-tracker-v2.vercel.app/` → **Start**
3. It checks the manifest + service worker. If anything is missing it'll
   suggest fixes (likely only the service worker — optional).
4. Click **Package For Stores** → **Android** → **Generate Package**
5. Downloads a ZIP with:
   - `app-release-signed.apk` — sideload to your phone
   - `assetlinks.json` — put at `public/.well-known/assetlinks.json`
     before the next deploy so the app opens without a URL bar
6. Install: email the APK to yourself → open on Android → allow
   "Install unknown apps" once for Gmail/Drive → install.

Any future Vercel deploy is automatically live in the TWA — the APK is
just a thin shell around the URL.

---

## Option 3 — Native React Native WebView app

Only if you want splash screen / deep links / native back button control.
Create a separate Expo project, render `<WebView src="…" />`, build via
EAS to an APK. Not recommended unless you need the extra shell features.
