# Ledger 近期改动记录

> 2026-05-14 优化回合

---

## 1. 汇率上下文共享 (ExchangeRateContext)

**问题**: DashboardView、RatesView、Converter 各自独立调用 `fetchExchangeRates()`，应用启动产生 3 次重复 Supabase 查询。

**方案**: 新建 `src/context/ExchangeRateContext.tsx`，作为单一数据源。

**改动文件:**
| 文件 | 改动 |
|------|------|
| `src/context/ExchangeRateContext.tsx` | **新建** — Provider + useExchangeRates hook |
| `src/main.tsx` | 包裹 ExchangeRateProvider |
| `src/views/DashboardView.tsx` | 移除本地 fetch, 改用 useExchangeRates() |
| `src/views/RatesView.tsx` | 同上 (~30 行删除) |
| `src/components/Converter.tsx` | 移除 fetchUSDRate, 改用 context 的 usdRate |

**额外获得:**
- `visibilitychange` 事件: 标签页切回前台自动刷新
- Supabase Realtime 订阅: 数据库变更即时推送
- 错误状态回调: CHANNEL_ERROR / TIMED_OUT 日志

---

## 2. 代码分割 (Lazy Loading)

**问题**: 4 个 View 全部直接 import，首屏 bundle 857KB。

**方案**: `App.tsx` 使用 `React.lazy` + `Suspense` 按需加载。

**改动文件:**
| 文件 | 改动 |
|------|------|
| `src/App.tsx` | 直接 import → lazy import, 添加 Suspense + ViewFallback |

**效果**: 4 个 View 拆分为独立 chunk (Dashboard 3.4KB, Rates 1.5KB, Prices 2.2KB, Settings 3.6KB, 均为 gzip 后)。

---

## 3. 暗色模式修复

**问题**: 6 个组件使用硬编码 `bg-white`，暗色模式下白底刺眼。

**方案**: `bg-white` → `bg-surface-container-low` (语义令牌, 自动跟随主题)。

**改动文件:**
| 文件 | 行号 | 改动 |
|------|------|------|
| `BottomNavBar.tsx` | 21 | `bg-white/90` → `bg-surface/90` |
| `RatesView.tsx` | 67 | 汇率卡片 `bg-white` → `bg-surface-container-low` |
| `PricesView.tsx` | 231 | 价格卡片 `bg-white` → `bg-surface-container-low` |
| `SettingsView.tsx` | 121, 197, 246, 285, 300 | 5 处卡片/按钮 |
| `Converter.tsx` | 29, 93 | 主容器 + info 图标容器 |

**保留 bg-white 的位置 (有意为之):**
- `Converter.tsx:62` — `focus:bg-white` (input 聚焦反馈)
- `SettingsView.tsx:237,269` — toggle 开关圆点 (需固定白色)

---

## 4. 开发环境修复

- 安装 `@types/react` + `@types/react-dom` (修复 TS7026 JSX 类型错误)
- 构建验证通过: `vite build` 4.3s
