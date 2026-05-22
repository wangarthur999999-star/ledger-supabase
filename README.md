# Sovereign Ledger (SR$)

Real-time financial dashboard for Suriname — exchange rates and global commodity prices, with rate-change push notifications.

Short name: **Ledger SR**

---

## Features

- **Live USD/SRD & EUR/SRD exchange rates** — scraped daily from CBvS (official) and Finabank (proxy for street rates)
- **Currency converter** — quick USD ↔ SRD conversion using buy / sell street rates (handles cambio spread correctly)
- **Global commodity tracker** — oil, gold, silver, grains, sugar (FRED + metals.dev), with 30-day sparkline trend and tap-for-tooltip
- **Rate alerts** — push notifications when USD/EUR/SRD crosses your threshold; works on web (Web Push) and Android APK (Capacitor local notifications)
- **Bilingual UI** — Nederlands / English
- **PWA installable** — "Add to Home Screen" supported on Chrome / Edge / Safari
- **Offline-friendly** — Android APK boots without network; data refresh requires connectivity
- **Realtime updates** — Supabase channel keeps the UI in sync when scrapers write new data
- **Accessible** — keyboard focus rings, prefers-reduced-motion, screen-reader friendly
- **Privacy-respecting** — no PII collection, no third-party trackers, no Google Fonts CDN

---

## Tech Stack

- **Frontend**: React 19 + TypeScript (strict) + Vite 6 + Tailwind 4
- **Animation**: Motion (Framer Motion v12)
- **Backend**: Supabase (Postgres + REST + Realtime)
- **Push**: Web Push (VAPID) + Service Worker for web; Capacitor LocalNotifications for Android
- **Error tracking**: Sentry (async-loaded, optional, with sourcemap upload via vite-plugin-sentry)
- **Mobile**: Capacitor 8 (Android target; iOS-ready code, just needs the platform added)
- **Scrapers**: Node 22 + Cheerio + Axios + node-test (`scripts/`), scheduled via GitHub Actions

---

## Quick Start (Web Dev)

**Prerequisites**

- Node.js 20+ (LTS)
- A Supabase project (URL + anon key)

**Steps**

```bash
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY at minimum
npm run dev
```

App runs at `http://localhost:3000`.

### Environment variables

| Key | Where used | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Web client | ✓ |
| `VITE_SUPABASE_ANON_KEY` | Web client | ✓ |
| `VITE_SENTRY_DSN` | Web client (production only) | optional |
| `VITE_VAPID_PUBLIC_KEY` | Web client (push subscribe) | optional |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | Build-time (sourcemap upload) | optional |
| `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | `scripts/check_alerts.js` only | optional |
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/*.js` only (cron) | optional* |

\* Required only if you run the scrapers locally. CI uses GitHub repo secrets.

In **production** the app **throws** when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, so misconfigured deploys fail loudly.

---

## Going Live

See [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) for the full release checklist — Supabase setup, Sentry, VAPID keypair, Android signing, Play Store data safety form.

For future Auth migration (currently using device_id model), see [`docs/AUTH_MIGRATION.md`](./docs/AUTH_MIGRATION.md).

---

## Build & Deploy

### Web (Vercel)

Production deploys automatically on push to `main`. Live: https://ledger-supabase.vercel.app

### Android APK (Capacitor)

**Prerequisites**

- JDK 21 (Eclipse Temurin recommended) — Capacitor 8 requirement
- `JAVA_HOME` pointing to the JDK 21 install
- Android SDK (install via Android Studio)

**Steps**

```bash
npm run build              # build web bundle
npx cap sync android       # sync into Android project
cd android
./gradlew assembleDebug    # debug APK (Linux/macOS)
.\gradlew.bat assembleDebug   # Windows
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

Release APK + AAB build runs in `.github/workflows/build.yml`; release signing needs `KEYSTORE_BASE64` / `STORE_PASSWORD` / `KEY_ALIAS` / `KEY_PASSWORD` set as repository secrets.

Notes:

- If `gradlew --version` shows JDK 17 instead of 21, the build will fail. Fix `JAVA_HOME` and restart shell.
- After changing icon/splash sources in `resources/`, regenerate with: `npx capacitor-assets generate`
- `versionName` is read from `package.json`; `versionCode` from `PACKAGE_VERSION_CODE` env (CI uses `github.run_number`).

---

## Project Structure

```
ledger-sr/
├── src/
│   ├── views/              # Dashboard, Rates, Prices, Settings
│   ├── components/         # TopAppBar, BottomNavBar, Converter, Sparkline, ErrorBoundary, ErrorState
│   ├── api/                # rates, alerts, profile, priceHistory
│   ├── context/            # SettingsContext (language + t + tp)
│   ├── lib/                # supabase, sentry (async), capacitor, notifications, webPush,
│   │                       # createSharedStore, useExchangeRates, usePrices, usePriceHistory,
│   │                       # useAlertWatcher, deviceId, formatTime
│   └── locales/            # NL + EN
├── public/
│   ├── sw.js               # Service worker (web push)
│   ├── privacy.html        # NL/EN privacy policy
│   ├── manifest.webmanifest
│   └── icon-512.png
├── scripts/
│   ├── update_rates.js     # CBVS + Finabank → exchange_rates
│   ├── update_prices.js    # FRED + metals.dev → prices + prices_history
│   ├── check_alerts.js     # NEW: alert evaluation + web-push
│   ├── lib/                # cbvs_parser, finabank_parser
│   └── __tests__/          # 46 unit + integration tests
├── supabase/migrations/    # 9 SQL migrations
├── android/                # Capacitor Android project
├── docs/
│   └── AUTH_MIGRATION.md
├── RELEASE_CHECKLIST.md
└── .github/
    ├── workflows/          # ci, codeql, build, update-rates, update-prices
    └── dependabot.yml
```

---

## Database Schema

Six tables, all RLS-protected (anon = read-only or scoped CRUD; service_role writes):

- `exchange_rates` — latest USD/EUR rates (one row per pair)
- `exchange_rates_history` — snapshots for 20h change computation
- `prices` — commodity prices (FRED + metals.dev)
- `prices_history` — daily snapshots for sparklines
- `alert_thresholds` — user-configured push subscriptions

Full schema: `supabase-schema.sql`. Incremental: `supabase/migrations/`.

---

## Non-Goals

- **Multi-folder organization** — single-ledger use case
- **AI/LLM features** — scaffold residue from AI Studio template, not used
- **iOS** — Android only at v2.4; iOS platform code-ready, needs `npx cap add ios`

---

## License

Private project. All rights reserved.
