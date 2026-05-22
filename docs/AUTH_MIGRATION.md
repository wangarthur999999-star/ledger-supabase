# Future: Supabase Auth Migration Plan

当前应用使用 **device_id**（客户端 localStorage UUID）作为用户身份，不接 Supabase Auth。
本文档记录"未来接入 Auth"的迁移路径，让未来的实施者不需要重新思考。

## 为什么暂时不接 Auth

- **个人 ledger 用例**：用户大多就一台手机一台电脑，不需要跨设备同步
- **降低上线门槛**：注册/登录是个 funnel，能省则省
- **隐私哲学契合**：privacy policy 已经说"不收集 PII"，加 Auth 就要改

## 何时该接

当出现以下任一情况：

1. 用户反映"换手机后所有 alerts 丢了"成为高频投诉
2. 想加"profile 在 web 和 APK 间同步"
3. 想加"用户主动备份/导出数据"
4. 需要按用户身份做分析或客服

## 迁移步骤

### Phase 1: 加 Auth，旧 device_id 仍工作（向后兼容）

- [ ] Supabase Dashboard → Authentication 启用 Magic Link / Email + Password / OAuth
- [ ] 加新 column `alert_thresholds.user_id UUID REFERENCES auth.users(id) NULL`
  （nullable，让老 device_id-only 行继续存在）
- [ ] 加 RLS policy: 用户能看自己 user_id 的行 OR 自己 device_id 的行
  ```sql
  CREATE POLICY "user or device own row" ON alert_thresholds
    FOR ALL TO authenticated
    USING (
      user_id = auth.uid()
      OR (user_id IS NULL AND device_id = current_setting('request.jwt.claims.device_id', true))
    );
  ```
- [ ] 同样改 `profile` 数据：建 `user_profiles` 表（id = auth.users.id），
      原本 localStorage 的 profile 字段挪过去
- [ ] 在 SettingsView 加 "Sign in" 按钮，登录后自动把当前 device_id 下的 alert_thresholds
      迁移到 user_id（一条 SQL update）

### Phase 2: 强制 Auth（可选）

视用户接受度决定要不要走这一步。如果走：

- [ ] 加引导 UI："登录后你的设置会同步到所有设备"
- [ ] 给 90 天迁移窗口
- [ ] 之后把 device_id-only 的 row 标 deprecated，service_role 定期 GC

### Phase 3: 清理 device_id

- [ ] 当所有活跃行都有 user_id 后，drop `device_id` column
- [ ] 删 `src/lib/deviceId.ts`，替换为从 Supabase session 取 user.id

## 不会被破坏的代码

这些抽象层是为 Auth 准备的，不需要改：

- **`src/api/profile.ts`**: 已经是 abstraction layer，把 `readProfileSync` / `updateProfile`
  实现换成 Supabase 调用即可，caller 无感
- **`src/api/alerts.ts`**: 把 `getDeviceId()` 调用换成 `getUser().id`，其余不动
- **`scripts/check_alerts.js`**: 不受影响（用 service_role 绕过 RLS）

## 数据迁移 SQL 模板

```sql
-- 用户首次登录时, 把这个 device 下的 alert_thresholds 划到 user_id
UPDATE alert_thresholds
SET user_id = $1, device_id = NULL
WHERE device_id = $2 AND user_id IS NULL;
```
