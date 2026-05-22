# Release Checklist

完整的上线前清单。每次发版按顺序走一遍。

---

## 0. 一次性准备（仅首次上线 / 换环境时做）

### Supabase 项目

- [ ] 创建 Production Supabase 项目（跟 dev 分开）
- [ ] 在 SQL Editor 跑 `supabase-schema.sql` 建表
- [ ] 按时间顺序跑 `supabase/migrations/*.sql`
- [ ] 在 Dashboard → Database → Replication 里把 `exchange_rates`, `prices`, `alert_thresholds` 加进 `supabase_realtime` publication
- [ ] 拿到 Project URL 和 anon key → 写进 Vercel env vars
- [ ] 拿到 service_role key → 写进 GitHub repo secrets（**绝不进客户端**）

### Sentry 项目

- [ ] 在 sentry.io 建 React 项目，拿 DSN → 写进 Vercel `VITE_SENTRY_DSN`
- [ ] 建 auth token (Settings → Account → API → Auth Tokens)，scope: `project:releases`
  → 写进 GitHub repo secret `SENTRY_AUTH_TOKEN`
- [ ] org slug + project slug → GitHub repo secrets `SENTRY_ORG` / `SENTRY_PROJECT`

### Web Push (VAPID)

- [ ] 生成 VAPID 密钥对：
  ```bash
  npx web-push generate-vapid-keys
  ```
- [ ] **公钥** → Vercel env `VITE_VAPID_PUBLIC_KEY` + GitHub secret `VAPID_PUBLIC_KEY`
- [ ] **私钥** → 仅 GitHub secret `VAPID_PRIVATE_KEY`（**绝不进客户端 env**）
- [ ] `mailto:` 联系人 → GitHub secret `VAPID_SUBJECT`

### Android Release Signing

- [ ] 生成 release keystore：
  ```bash
  keytool -genkey -v -keystore ledger-release.keystore -alias ledger \
    -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] **备份好这个文件** —— 丢了就不能再发 update 到同一 Play Store listing
- [ ] base64 encode → GitHub secret `KEYSTORE_BASE64`
- [ ] 密码 → GitHub secrets `STORE_PASSWORD` / `KEY_ALIAS` / `KEY_PASSWORD`

### Play Console

- [ ] 创建 app listing
- [ ] 上传 `app-release.aab`（先 internal track）
- [ ] 填 Data Safety form: 标注收集 IP/技术日志 (Vercel/Supabase/Sentry),
      不收集 PII/财务数据
- [ ] 关联 privacy policy URL → `https://your-domain.com/privacy.html`
- [ ] 截图、商店描述（NL + EN 都要）

---

## 1. 每次发版前

### 代码质量

- [ ] `npm run typecheck` 0 错误
- [ ] `npm run lint` 0 错误
- [ ] `npm run test:src` 全过
- [ ] `npm run test:scripts` 全过
- [ ] `npm audit --omit=dev` 无 high/critical

### 构建本地验证

- [ ] `npm run build` 成功
- [ ] `npm run preview` 跑起来，手动点一遍 Dashboard / Rates / Prices / Settings
- [ ] 测一次添加 alert + 查看 sparkline tooltip
- [ ] 测一次切换语言

### 性能 / Lighthouse

- [ ] PWA 标识在浏览器地址栏有 (Chrome devtools → Application → Manifest 无错)
- [ ] Lighthouse 在 `npm run preview` 上跑:
  - Performance ≥ 90
  - Accessibility ≥ 95
  - Best Practices ≥ 95
  - PWA: installable ✓

### 版本号

- [ ] `package.json` version 升一档（patch/minor/major）
- [ ] `android/app/build.gradle` 不用动 (从 package.json 读)
- [ ] CHANGELOG.md 增加这版的变更（可选）

### Git

- [ ] 改动 commit 到 main
- [ ] 推送后 CI 全绿 (typecheck, lint, audit, test, build, CodeQL)

---

## 2. Web 部署 (Vercel)

- [ ] 推送 main 触发自动部署
- [ ] 部署完成后开 production URL，验证:
  - [ ] 首屏看到汇率（不卡 loading）
  - [ ] PWA banner 出现，可以"添加到主屏幕"
  - [ ] DevTools → Application → Service Workers，`sw.js` 已 activated
  - [ ] DevTools → Network 检查 Sentry chunk **仅在** 真出错时 / idle 才下载
- [ ] 等 5 分钟，确认 Sentry 收到一次 sourcemap 上传 release

---

## 3. Android 部署 (Play Store)

- [ ] CI 上 push tag `v{version}` 触发 `build.yml`，产 release APK + AAB
- [ ] 下载 `app-release.aab`
- [ ] Play Console 上传到 Internal Testing track
- [ ] 在自己手机上装一遍 (Play Console internal tester 邀请)
  - [ ] App 能启动，看到汇率
  - [ ] Status bar 是深绿背景白色文字
  - [ ] 加 alert，等 cron 触发，能收到本地通知
  - [ ] 离线状态启动，UI 出现 (字体本地)，data 显示上次缓存或 error state
- [ ] 升 Production track

---

## 4. 上线后监控（第一周）

- [ ] Sentry 每天检查一次：error rate 应 < 0.5% 会话
- [ ] Supabase Dashboard → 表 row 数: alerts 表新增量符合预期
- [ ] GitHub Actions → update-rates / check-alerts cron 全部绿
- [ ] Play Console → Vitals: ANR / crash 比例 < 0.1%

---

## 5. 已知缺口（上线后第一个迭代再做）

- **Supabase Auth**: 当前 device_id 模型导致换机 / 清缓存后丢订阅。接 Auth 后
  把 alert_thresholds.device_id 改成 user_id (FK auth.users)，加迁移路径
- **真实 WhatsApp 支持号码**: `SettingsView.WHATSAPP_NUMBER` 还是占位 `5978000000`
- **历史数据归档策略**: prices_history 超过 1 年的行可以聚合成周/月样本
- **iOS APK**: 当前只有 Android，iOS 需要 Apple Developer account + Capacitor iOS 平台
