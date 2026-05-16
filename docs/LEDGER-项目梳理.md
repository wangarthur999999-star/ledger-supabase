# Sovereign Ledger — 项目梳理

> React 19 + TypeScript + Tailwind v4 金融看板 | 苏里南汇率 / 大宗商品 / 货币转换

---

## 一、项目概况

| 项目 | 说明 |
|------|------|
| **名称** | Ledger SR (Sovereign Ledger) |
| **定位** | 苏里南实时金融数据看板 |
| **技术栈** | React 19, TypeScript 5.8, Tailwind CSS v4, Vite 6, Supabase, Sentry |
| **关键依赖** | motion (动画), lucide-react (图标), @sentry/react (错误追踪) |
| **目标平台** | Web PWA + Capacitor (Android 打包) |
| **当前版本** | 2.4.0 |

---

## 二、核心功能

1. **仪表盘 (Dashboard)** — 汇率卡片 + 大宗商品迷你卡 + 货币转换器
2. **汇率页 (Rates)** — 全币种官方/街头汇率对比 + 点差
3. **物价页 (Prices)** — 能源/金属/农产品全球价格追踪
4. **设置页 (Settings)** — 个人资料、语言切换(NL/EN)、暗色模式、通知偏好

---

## 三、项目结构

```
src/
├── main.tsx                          # 入口: Sentry.init + Provider 嵌套
├── App.tsx                           # 根组件: lazy加载4个View + 路由动画
├── types.ts                          # ExchangeRate 接口 + TabId 联合类型
├── index.css                         # Tailwind @theme + 暗色模式 CSS 变量
│
├── context/                          # React Context 层
│   ├── SettingsContext.tsx            # 语言/暗色模式/翻译函数 t()
│   └── ExchangeRateContext.tsx        # 汇率数据共享 (单次请求 → 全局复用)
│
├── api/                              # 数据层
│   ├── rates.ts                      # Supabase: exchange_rates 表查询
│   ├── prices.ts                     # Supabase: prices 表查询 + 仪表盘大宗商品
│   └── profile.ts                    # localStorage: AES-GCM 加密用户配置
│
├── lib/                              # 工具层
│   ├── supabase.ts                   # Supabase 客户端 (env var 注入)
│   └── formatTime.ts                 # 相对时间格式化 (纯函数, 无 React 依赖)
│
├── views/                            # 页面 (React.lazy 代码分割)
│   ├── DashboardView.tsx             # 仪表盘: 汇率+商品+转换器三合一
│   ├── RatesView.tsx                 # 汇率详情页
│   ├── PricesView.tsx                # 物价对比页
│   └── SettingsView.tsx              # 设置页
│
└── components/                       # UI 组件
    ├── TopAppBar.tsx                 # 顶部导航栏 (动态标题)
    ├── BottomNavBar.tsx              # 底部导航栏 (4 Tab + 动画指示器)
    ├── CurrencyCard.tsx              # 汇率卡片
    ├── CommodityMiniCard.tsx         # 大宗商品迷你卡
    ├── Converter.tsx                 # USD ↔ SRD 货币转换器
    └── EmptyState.tsx                # 空状态占位
```

---

## 四、数据流架构

```
┌─────────────────────────────────────────────────┐
│                   main.tsx                       │
│  SettingsProvider → ExchangeRateProvider → App   │
└─────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
  DashboardView     RatesView        Converter
        │                │                │
        └────────────────┼────────────────┘
                         │
              useExchangeRates()
              ┌──────────┴──────────┐
              │  ExchangeRateContext │
              │  ┌────────────────┐ │
              │  │ fetchRates()   │ │ ← 单次 Supabase 查询
              │  │ Supabase       │ │
              │  │ Realtime 订阅   │ │ ← postgres_changes 实时推送
              │  │ Visibility API │ │ ← 标签页切回自动刷新
              │  └────────────────┘ │
              └─────────────────────┘
```

**关键设计决策：**
- DashboardView、RatesView、Converter 原本各自独立查询 Supabase（3 次重复请求）
- 重构为 ExchangeRateContext 单一数据源，启动时只查 1 次，所有消费者共享缓存
- visibilitychange + Supabase Realtime 双通道保证数据新鲜度

---

## 五、暗色模式实现

| 层级 | 实现 |
|------|------|
| **CSS 变量** | `html.dark` 选择器覆盖 `@theme` 中的 8 个颜色令牌 |
| **状态管理** | SettingsContext 中 `darkMode` state → `html.dark` class toggle |
| **持久化** | 加密存入 localStorage，下次启动恢复 |
| **组件适配** | 所有容器从 `bg-white` → `bg-surface-container-low`，文本/边框使用语义令牌 |

**颜色令牌对照:**

| 令牌 | 浅色 | 暗色 |
|------|------|------|
| `--color-primary` | `#004532` | `#5ee8b4` |
| `--color-surface` | `#f7f9fb` | `#0e1213` |
| `--color-surface-container-low` | `#f2f4f6` | `#141819` |
| `--color-on-surface` | `#191c1e` | `#e2e4e5` |

---

## 六、代码分割 (Lazy Loading)

```typescript
// App.tsx — 4 个 View 全部使用 React.lazy
const DashboardView = lazy(() => import("./views/DashboardView"));
const RatesView = lazy(() => import("./views/RatesView"));
const PricesView = lazy(() => import("./views/PricesView"));
const SettingsView = lazy(() => import("./views/SettingsView"));
```

**构建产物 (gzip):**

| Chunk | 大小 |
|-------|------|
| index.js (公共依赖) | 253 KB |
| CSS | 6.3 KB |
| DashboardView | 3.4 KB |
| RatesView | 1.5 KB |
| PricesView | 2.2 KB |
| SettingsView | 3.6 KB |

---

## 七、数据安全

| 措施 | 说明 |
|------|------|
| **PII 加密** | display_name, email, phone 使用 Web Crypto API AES-GCM 加密存 localStorage |
| **Supabase Anon Key** | 仅通过 `import.meta.env` 注入，不硬编码 |
| **Sentry** | 生产环境错误追踪 (`tracesSampleRate: 1.0`) |
| **Encryption Key** | 固定 16 字节，仅用于本地混淆 (非跨设备同步) |

---

## 八、Supabase 数据表

| 表名 | 用途 | 实时订阅 |
|------|------|----------|
| `exchange_rates` | 汇率数据 (pair, official, street, change) | ✅ ExchangeRateContext |
| `prices` | 大宗商品价格 (symbol, price, unit, change_pct) | ✅ DashboardView + PricesView |

---

## 九、国际化

- **语言**: 荷兰语 (NL) / 英语 (EN)，SettingsContext 的 `translations` 对象承载所有文案
- **类型安全**: `TKey` 从 translations.NL 的 keyof 推导，`t()` 函数编译期校验 key
- **变量插值**: `t('time.minutesAgo', { n: 5 })` → `"5 minuten geleden"`
- **locale**: 影响数字格式化 (`toLocaleString`) 和日期显示

---

## 十、已知待办

| 项目 | 优先级 | 说明 |
|------|--------|------|
| TypeScript 严格类型 | 中 | `formatRelativeTime` 的 `t` 参数类型需要放宽 |
| Supabase Auth 集成 | 低 | 当前用 localStorage 模拟，RLS 不可用 |
| 主包体积优化 | 低 | 817KB 主要来自 Supabase SDK，可考虑 tree-shaking |
| WhatsApp 支持号码 | 低 | `SUPPORT_WHATSAPP` 当前为空字符串 |
