# Deployment: What You Need to Do

我（Claude）能改代码、写配置、跑测试，但下面这些**必须你本人**操作——
账号注册、密钥生成、Play Store 提交。按顺序走，一步一行勾掉。

总耗时估计：4-6 小时（不算 Play Store 审核 1-7 天）

---

## ☐ Phase 1: 准备账号（30 分钟）

### ☐ 1.1 Supabase
1. 去 https://supabase.com → Sign up（用你想长期用的邮箱）
2. New Project → 选择 region (Europe Central 或 South America East 离 SR 都近)
3. 起名 "ledger-sr-prod"，设个强密码（用密码管理器存好 —— 是 Postgres root，丢了重置麻烦）
4. **拿下来**:
   - Project Settings → API → `Project URL` 和 `anon public key`
   - Project Settings → API → `service_role secret` （**别泄漏**，等于 db root）

### ☐ 1.2 Vercel
1. 去 https://vercel.com → Sign up with GitHub
2. 暂时不连 repo，等代码 push 完了再连

### ☐ 1.3 Sentry（可选但推荐）
1. https://sentry.io → Sign up free tier
2. Create project → React → 命名 "ledger-sr-web"
3. **拿下来**:
   - 项目 DSN（看起来像 `https://xxx@xxx.ingest.sentry.io/xxx`）
   - Settings → Account → API → Auth Tokens → 创建 token，scope 勾 `project:releases`
   - 你的 org slug 和 project slug（URL 里能看到）

### ☐ 1.4 Google Play Developer（必须）
1. https://play.google.com/console → 注册（**$25 一次性**，需要信用卡）
2. 完成身份验证（可能要等 1-2 天审批）
3. 暂时不创建 app，等 APK 真的能 build 出来再回来做

---

## ☐ Phase 2: 生成密钥（20 分钟）

所有密钥用密码管理器（1Password / Bitwarden）存好。

### ☐ 2.1 VAPID（Web Push 用）
```bash
npx web-push generate-vapid-keys
```
输出两个 key。

### ☐ 2.2 Android keystore（**绝对不能丢**）

```bash
keytool -genkey -v -keystore ledger-release.keystore \
  -alias ledger -keyalg RSA -keysize 2048 -validity 10000
```

会问你：密码（设两个：keystore 密码 + key 密码，可以相同）、姓名、组织等
（这些信息会出现在 APK 签名里，**公开可见**，但不影响功能）。

**生成的 `ledger-release.keystore` 文件**:
- 备份到 2 个以上的安全地方（密码管理器附件 + 离线 U盘）
- **丢了 = 永远无法再更新这个 Play Store listing**（必须换 appId 重新上架，
  现有用户接不到 update）
- 转 base64（GitHub Actions secret 用）：
  ```bash
  base64 -w 0 ledger-release.keystore > keystore.base64.txt
  ```

---

## ☐ Phase 3: 配置 Supabase 数据库（20 分钟）

1. ☐ 在 Supabase Dashboard → SQL Editor，按顺序跑：
   ```
   1. supabase-schema.sql（建主要表）
   2. supabase/migrations/ 下所有 .sql 文件，**按文件名时间戳排序**
   ```
   每跑完一个 SQL，下面看到 "Success" 就跑下一个。

2. ☐ Database → Replication
   - 把 `supabase_realtime` publication 编辑
   - 勾上 `exchange_rates`, `prices`, `alert_thresholds`（让 realtime 推送生效）

3. ☐ 跑测试数据（确保 schema 生效）：
   - Table Editor → exchange_rates → 应该看到 USD/EUR 两行 seed 数据
   - Table Editor → prices, alert_thresholds → 空表 OK

---

## ☐ Phase 4: 推代码到 GitHub（10 分钟）

1. ☐ GitHub 上建 private repo "ledger-sr"
2. ☐ 解压我给的 zip 进本地目录
3. ☐ 检查并修改：
   - [ ] `public/privacy.html` 顶部的 RELEASE TODO：确认 maintainer name + 邮箱
   - [ ] `public/privacy.html` 文末日期改成今天
   - [ ] `package.json` 里 `version` 是 2.5.0（可以保留也可以改）
4. ☐ `git init && git add . && git commit -m "Initial release v2.5.0"`
5. ☐ `git remote add origin git@github.com:YOU/ledger-sr.git`
6. ☐ `git push -u origin main`

---

## ☐ Phase 5: 配置 GitHub Repo Secrets（15 分钟）

GitHub repo → Settings → Secrets and variables → Actions → New repository secret。
每个 secret 加一行：

### 后端 cron 用（必须）
- ☐ `URL` = Supabase Project URL
- ☐ `KEY` = Supabase **service_role** key（不是 anon！）

### Web build 用（必须）
- ☐ `VITE_SUPABASE_URL` = Supabase Project URL（同上）
- ☐ `VITE_SUPABASE_ANON_KEY` = Supabase **anon** key

### Sentry（可选）
- ☐ `VITE_SENTRY_DSN` = Sentry DSN
- ☐ `SENTRY_AUTH_TOKEN` = Sentry auth token
- ☐ `SENTRY_ORG` = Sentry org slug
- ☐ `SENTRY_PROJECT` = Sentry project slug

### Web Push（可选）
- ☐ `VITE_VAPID_PUBLIC_KEY` = VAPID public key
- ☐ `VAPID_PRIVATE_KEY` = VAPID private key
- ☐ `VAPID_SUBJECT` = `mailto:你的邮箱@example.com`

### WhatsApp 支持（可选；不配则按钮隐藏）
- ☐ `VITE_WHATSAPP_NUMBER` = 例如 `5978001234`（没 +，没空格）

### Android signing（必须，才能 build release）
- ☐ `KEYSTORE_BASE64` = `keystore.base64.txt` 的内容
- ☐ `STORE_PASSWORD` = keystore 密码
- ☐ `KEY_ALIAS` = `ledger`（如果你按上面命令生成的）
- ☐ `KEY_PASSWORD` = key 密码

---

## ☐ Phase 6: Vercel 部署 Web（15 分钟）

1. ☐ Vercel Dashboard → Add New → Project → Import from GitHub → 选 ledger-sr
2. ☐ Framework Preset 应该自动检测为 Vite（如没有，手选）
3. ☐ Environment Variables 里填：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SENTRY_DSN`（可选）
   - `VITE_VAPID_PUBLIC_KEY`（可选）
   - `VITE_WHATSAPP_NUMBER`（可选）
   - `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT`（让 Vercel build 时也上传 sourcemap）
4. ☐ Deploy
5. ☐ 等 ~2 分钟，拿到 production URL（看起来像 `ledger-sr-xxx.vercel.app`）
6. ☐ **测试**：浏览器打开这个 URL
   - [ ] 看到 Dashboard 有汇率（如没有，去 GitHub Actions 手动触发 update-rates workflow）
   - [ ] 切语言能切换
   - [ ] Settings → 加一个 alert → 浏览器弹通知权限请求

---

## ☐ Phase 7: 触发数据爬虫第一次跑（5 分钟）

1. ☐ GitHub repo → Actions → "Update Exchange Rates" workflow → Run workflow
2. ☐ 等绿（约 2 分钟）
3. ☐ Actions → "Update Prices" → Run workflow → 等绿
4. ☐ 刷新 Vercel 上的 web 版，应该看到真实数据

---

## ☐ Phase 8: Android Build（30 分钟）

1. ☐ Git tag 触发 build：
   ```bash
   git tag v2.5.0
   git push --tags
   ```
2. ☐ GitHub Actions → "Build Release APK + AAB" workflow 开始跑（约 5-10 分钟）
3. ☐ 跑完后，Actions 页面下载 artifacts：
   - `ledger-aab-XXX.zip` → 解压拿到 `app-release.aab`（给 Play Store）
   - `ledger-apk-XXX.zip` → 解压拿到 `app-release.apk`（手机直接侧载测试）
4. ☐ **本地测试 APK**：传 APK 到 Android 手机，开"允许未知来源"，安装，运行
   - [ ] 看到 status bar 是深绿背景
   - [ ] 加一个 alert → 弹通知权限 → 同意
   - [ ] 切到后台，等 24h 看是否真的来通知（或手动改 alert 阈值触发）

---

## ☐ Phase 9: Play Store 提交（1-2 小时）

1. ☐ Play Console → Create app
   - App name: "Ledger SR"
   - Default language: Nederlands (Netherlands) - nl-NL
   - App or game: App
   - Free or paid: Free
2. ☐ App content（左侧菜单逐项填）：
   - [ ] Privacy policy URL：`https://你的-vercel-URL.vercel.app/privacy.html`
   - [ ] App access：All functionality available without restrictions
   - [ ] Ads：No ads
   - [ ] Content rating questionnaire（按真实情况填，应该是 Everyone）
   - [ ] Target audience：13+（财务类）
   - [ ] News app：No
   - [ ] **Data safety**：按 `docs/store-listing/data-safety-form.md` 填
3. ☐ Main store listing：
   - 按 `docs/store-listing/play-store-NL.md` 填荷兰语
   - 添加 English (United States) 翻译，按 `play-store-EN.md` 填
   - 截图：至少 2 张手机截图（自己手机截，或用 Android emulator）
   - Feature graphic: 1024×500 PNG（需要做一张）
   - App icon: Play Console 会从 AAB 里自动提取，无需上传
4. ☐ Production → Create new release
   - Upload `app-release.aab`
   - Release name: 2.5.0
   - Release notes（NL + EN，从 CHANGELOG.md 摘录关键点）
5. ☐ Send for review
   - 审核 1-7 天
   - 第一次提交常被退回（"signed-but-wrong-format"、隐私政策不完整等），不要慌

---

## ☐ Phase 10: 上线后第一周监控

- ☐ Sentry: 每天看一眼 error rate
- ☐ Play Console → Vitals: ANR / crash rate < 0.1%
- ☐ Supabase: alert_thresholds 表 row 数应该慢慢涨
- ☐ GitHub Actions: update-rates / update-prices / check-alerts 全部绿

---

## 失败排查

| 现象 | 怎么办 |
|---|---|
| Vercel build 红：`Missing VITE_SUPABASE_URL` | 没在 Vercel env 配，回去 Phase 6 |
| 数据库 SQL 跑红 `relation "set_updated_at" does not exist` | 必须先跑 supabase-schema.sql，再跑 migrations |
| GitHub Action build 红：`keystore.jks not found` | KEYSTORE_BASE64 secret 没配或 base64 加 newline 了，去掉 newline 重传 |
| Play Store 退回："App misses target API level" | Android Gradle 配置过期，更新 compileSdkVersion / targetSdkVersion |
| Sentry 上传失败：401 | SENTRY_AUTH_TOKEN 没勾对 scope，重新生成 token 时勾 `project:releases` |
| 通知不到达 | 检查 alert_thresholds.push_endpoint 是否有值；Web Push 需要 HTTPS（localhost 不算） |
