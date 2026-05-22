# Play Store Data Safety Form

Play Console → App content → Data safety, 按下面填。
Google 会要求你提交真实情况——这份指南反映 v2.5.0 实际行为。

## 1. Data collection and security

### Does your app collect or share any of the required user data types?

**Yes** — 因为 IP/技术日志算"数据收集"，按 Google 定义。

### Is all of the user data collected by your app encrypted in transit?

**Yes** — 全部走 HTTPS。

### Do you provide a way for users to request that their data be deleted?

**Yes** — 用户可以:
- 在 app 内删除自己的 alert thresholds (Settings 里的 Trash 按钮)
- 卸载 app → 本地 localStorage 自动清掉
- 通过邮件请求删除 (Privacy Policy 里有联系方式)

## 2. Data types collected

### App activity

- [x] **App interactions**
  - Collected: Yes
  - Shared: No
  - Optional: No (匿名 Sentry crash telemetry, 仅 PROD)
  - Purpose: Analytics, App functionality
  - 备注: Sentry 仅在 VITE_SENTRY_DSN 配置时才采集

### Device or other IDs

- [x] **Device or other IDs**
  - Collected: Yes
  - Shared: No
  - Optional: No
  - Purpose: App functionality
  - 备注: 本地生成的 device_id (UUID), 用于关联 alert subscriptions, 不发送给第三方

### Diagnostics

- [x] **Crash logs**
  - Collected: Yes (仅 PROD + 已配 Sentry DSN)
  - Shared: 仅与 Sentry (我们的错误监控供应商)
  - Optional: No
  - Purpose: Analytics

- [x] **Performance diagnostics**
  - Collected: No (这版未启用 browserTracing)
  - 注: 未来如果加 tracing, 这里要勾上

### 其它问题答案

- **Does your app share user data with third parties?**
  - Sentry (crash diagnostics) - if enabled
  - Supabase (database hosting; standard cloud provider relationship)
  - Vercel (hosting) - logs IP for security/abuse only
- **Is any of this data collected from children?** No (no child-directed features)

## 3. NOT collected

明确不收集:
- Personal info (name, email, phone, address)
- Financial info (no payment, no bank details)
- Health & fitness data
- Messages, photos, videos, audio
- Files & docs
- Calendar, contacts
- Location (precise or approximate)
- Web browsing history
- App info & performance (除了 crash logs)
- Device or account auth data

## 4. Data deletion request mechanism

User can request deletion by:
1. In-app: Settings → delete individual alerts
2. Uninstall: clears all local data
3. Email: <填你的邮箱> (response within 14 days)
