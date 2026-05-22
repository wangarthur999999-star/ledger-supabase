# Changelog

## 2.5.0 — Release-ready

### New features

- **Rate alerts** with push notifications (web + Android). Configure thresholds
  for USD/EUR vs SRD; receive a notification when crossed.
  - Service Worker (`public/sw.js`) handles incoming Web Push
  - Cron job `scripts/check_alerts.js` evaluates thresholds and dispatches via VAPID
  - Capacitor LocalNotifications path for APK users
- **Commodity sparklines** — every Prices card now shows a 30-day mini chart with
  tap/hover tooltip showing price + date
- **PWA installable** — `manifest.webmanifest` + icon, "Add to Home Screen" works
  on Chrome/Edge/Safari

### Improvements

- Sentry now loads async + sourcemaps auto-uploaded via `vite-plugin-sentry`
- Capacitor StatusBar styled to match design tokens
- Service Worker registered for Web Push
- `noscript` fallback in `index.html`
- `prefers-reduced-motion` respected globally via `MotionConfig`
- Global `:focus-visible` ring (a11y)
- Console logs stripped in production builds (errors kept for Sentry)
- FRED monthly data: skip unchanged upserts (saves Supabase writes + realtime spam)
- FRED scraper now parallelizes 9 commodity requests (5s → 1s)
- StrictMode-safe realtime channel refcounting
- Request-id race guard on store reloads

### Bug fixes

- Converter now uses `street.buy` for USD→SRD and `street.sell` for SRD→USD
  (previously used same rate for both directions, ignoring cambio spread)
- `change` field can now be `null` to distinguish "no data" from "0% change"
- `Number(null) → 0` bug in rates API
- Active tab persisted across app restarts
- TopAppBar refresh button no longer does full page reload
- RatesView now sorts USD before EUR deterministically
- SettingsView toast timer properly cleaned up
- Android `allowBackup="false"` (was leaking data to Google Drive)
- `.gitignore` mixed encoding fixed
- WhatsApp number left as placeholder constant for clarity (still needs real number)

### Infrastructure

- ESLint 9 (flat config) + TypeScript strict mode
- ESLint, CodeQL, `npm audit` in CI
- Dependabot weekly with grouped PRs
- Locales split (`src/locales/nl.ts` + `en.ts`) — NL as source of truth, EN may be partial
- Vite chunk splitting (sentry, supabase, motion, icons separate)
- Bundle: main 281 KB (gzip 86 KB), down from baseline ~606 KB
- 11 src unit tests + 46 scripts unit tests

### Database

- New tables: `prices_history` (sparklines), `alert_thresholds` (notifications)
- RLS enabled on all tables including `exchange_rates` (was anon-writable!)
- Indexes added on `prices.updated_at` and `prices.source`
- `exchange_rates.change` is now nullable
- Removed dead tables (products, folders, user_profiles)

### Docs

- README rewritten for release context
- `RELEASE_CHECKLIST.md` — full pre-launch checklist
- `docs/AUTH_MIGRATION.md` — future Auth migration plan
- Privacy policy now bilingual (NL/EN), includes Sentry disclosure

## Earlier versions

Earlier iterations were development scaffolding from the AI Studio template.
2.5.0 is the first version intended for public release.
