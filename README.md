# Sovereign Ledger (SR$)

Real-time financial dashboard for Suriname — exchange rates and supermarket prices, in your pocket.

Short name: **Ledger SR**

---

## Features

- **Live USD/SRD exchange rates** — scraped from CBvS and Finabank, updated daily
- **Currency converter** — quick USD↔SRD conversion using the current street buy rate
- **Supermarket price tracker** — common goods, by store
- **Bilingual UI** — English / Dutch
- **Offline-friendly** — Android APK runs without a constant connection (data refresh requires network)

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind 4
- **Animation**: Motion (Framer Motion v12)
- **Backend**: Supabase (Postgres + REST)
- **Mobile**: Capacitor 8 (Android target)
- **Scrapers**: Node + Cheerio + Axios (`scripts/`)

---

## Quick Start (Web Dev)

**Prerequisites**
- Node.js 20+ (LTS)
- A Supabase project (URL + anon key)

**Steps**

```bash
npm install
cp .env.example .env.local   # then fill in Supabase credentials
npm run dev
```

App runs at `http://localhost:3000`.

---

## Build & Deploy

### Web (Vercel)

Production deploys automatically on push to `main`.
Live: https://ledger-supabase.vercel.app

### Android APK (Capacitor)

**Prerequisites**
- JDK 21 (Eclipse Temurin recommended) — Capacitor 8 upstream requirement
- `JAVA_HOME` pointing to the JDK 21 install
- Android SDK (install via Android Studio; SDK location set in `android/local.properties` or `ANDROID_SDK_ROOT`)

**Steps**

```powershell
# 1. Build the web bundle
npm run build

# 2. Sync web bundle into the Android project
npx cap sync android

# 3. Build the debug APK
cd android
.\gradlew.bat assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

**Notes**
- If `gradlew --version` shows JDK 17 instead of 21, the build will fail with `invalid source release: 21`. Fix `JAVA_HOME` and restart the shell.
- After changing icon/splash sources in `resources/`, regenerate with: `npx capacitor-assets generate`
- Release-signed APKs are not yet configured.

---

## Project Structure

```
ledger/
├── src/                  # React app
│   ├── views/            # 4 main tabs: Dashboard, Rates, Prices, Settings
│   ├── components/       # Shared UI (TopAppBar, BottomNavBar, Converter, ...)
│   ├── api/              # Supabase queries (rates, profile)
│   ├── context/          # SettingsContext (i18n + preferences)
│   └── lib/              # supabase client, formatters
├── scripts/              # Daily scrapers (cron-runnable)
│   ├── update_rates.js   # CBvS + Finabank → exchange_rates table
│   ├── update_prices.js  # supermarkets → prices table
│   └── lib/              # parsers
├── android/              # Capacitor Android project
├── public/               # static assets (privacy.html)
├── resources/            # icon.png, splash.png (sources for capacitor-assets)
└── supabase-schema.sql   # database schema
```

---

## Database

Two app tables:
- `exchange_rates` — daily USD/SRD rates from CBvS and Finabank
- `prices` — supermarket prices

Schema: see `supabase-schema.sql`.

---

## Non-Goals

- **Multi-folder organization**: removed in cleanup (P0). Ledger SR targets a personal single-ledger use case; multi-entity / multi-org support is out of scope.
- **AI/LLM features**: scaffold residue from AI Studio template; intentionally not used.

---

## License

Private project. All rights reserved.
No license is granted to copy, modify, or redistribute this code.
