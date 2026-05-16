# Ledger 文件索引

每个源文件的角色、依赖、关键细节。可用于 Obsidian `[[双向链接]]`。

---

## 入口层

### `src/main.tsx`
- **角色**: 应用启动入口
- **依赖**: App, SettingsProvider, ExchangeRateProvider, Sentry
- **细节**: 
  - 生产环境初始化 Sentry (DSN + browserTracing + replay)
  - Provider 嵌套顺序: Settings → ExchangeRate → App
  - StrictMode 包裹

### `src/App.tsx`
- **角色**: 根组件, Tab 路由 + 页面动画
- **依赖**: TopAppBar, BottomNavBar, 4 个 View (lazy), motion
- **细节**:
  - `React.lazy` 实现 4 个 View 代码分割
  - `AnimatePresence` + `motion.div` 实现页面切换动画 (opacity + y 位移)
  - Sentry.ErrorBoundary 全局兜底
  - `activeTab` state 驱动 Tab 切换

---

## 类型定义

### `src/types.ts`
- **角色**: 共享类型定义
- **导出**:
  - `ExchangeRate` — 汇率数据结构 (pair, official, street, change, updatedAt)
  - `TabId` — `'dashboard' | 'rates' | 'prices' | 'settings'`

---

## Context 层

### `src/context/SettingsContext.tsx`
- **角色**: 全局设置管理 (语言 / 暗色模式 / 翻译)
- **依赖**: api/profile (fetchProfile, updateProfile)
- **导出**: `SettingsProvider`, `useSettings()`
- **细节**:
  - `translations` 对象包含 NL/EN 全部文案 (~120 个 key)
  - `TKey` 类型从 translations.NL 自动推导
  - `t()` 函数支持 `{variable}` 插值
  - darkMode 切换通过 `document.documentElement.classList.toggle('dark')` 实现
  - 语言和暗色模式变更自动 sync 到 localStorage (AES-GCM 加密)

### `src/context/ExchangeRateContext.tsx`
- **角色**: 汇率数据共享 (消除 DashboardView/RatesView/Converter 的重复查询)
- **依赖**: api/rates (fetchExchangeRates), lib/supabase
- **导出**: `ExchangeRateProvider`, `useExchangeRates()`
- **细节**:
  - 启动时拉取一次汇率数据存入 state
  - Supabase Realtime 监听 `exchange_rates` 表变更自动刷新
  - `visibilitychange` 事件: 标签页切回前台时静默刷新
  - `usdRate` 计算属性: 从 rates 中提取 USD 的 street.buy 价格
  - 3 个消费者 (DashboardView, RatesView, Converter) 不再各自查库

---

## API 层

### `src/api/rates.ts`
- **角色**: Supabase 汇率数据查询
- **依赖**: lib/supabase
- **导出**:
  - `fetchExchangeRates()` — 全量查询 `exchange_rates` 表, 返回 `ExchangeRate[]`
  - `fetchUSDRate()` — 单独查询 USD 汇率 (仅返回 street_buy, 由 Context 内部逻辑替代)
- **细节**: RawExchangeRate 内部接口做 snake_case → camelCase 映射

### `src/api/prices.ts`
- **角色**: 大宗商品价格查询
- **依赖**: lib/supabase
- **导出**:
  - `fetchDashboardCommodities(symbols)` — 按 symbol 数组查 `prices` 表
  - `CommodityMiniCardData` — 迷你卡数据结构
- **细节**: 返回结果按传入的 symbols 顺序排列，保证 UI 展示顺序一致

### `src/api/profile.ts`
- **角色**: 用户配置本地加密存储
- **依赖**: Web Crypto API (AES-GCM)
- **导出**: `fetchProfile()`, `updateProfile()`, `UserProfile`
- **细节**:
  - PII 字段 (display_name, email, phone) 使用 AES-GCM 加密存 localStorage
  - 固定 16 字节加密密钥 (仅本地混淆, 非跨设备安全)
  - 兼容 v1 → v2 迁移: 自动读取旧版明文 JSON 并转加密存储
  - 不支持跨设备同步 (原计划 Supabase Auth 集成后恢复)

---

## 工具层

### `src/lib/supabase.ts`
- **角色**: Supabase 客户端实例
- **细节**: 
  - 从 `import.meta.env` 读取 URL 和 Anon Key
  - 缺少环境变量时启动抛错 (fail-fast)

### `src/lib/formatTime.ts`
- **角色**: 相对时间格式化 (纯函数, 无 React 依赖)
- **导出**: `formatRelativeTime(isoTimestamp, t, now?)`
- **细节**:
  - 依赖注入 `t` 函数 (不耦合 SettingsContext 的 TKey 类型)
  - 48 小时阈值: 超过标记 `isStale = true`
  - 支持: justNow / minutesAgo / hoursAgo / daysAgo

---

## 页面层 (React.lazy 代码分割)

### `src/views/DashboardView.tsx`
- **角色**: 仪表盘主页
- **Context**: useSettings, useExchangeRates
- **子组件**: CurrencyCard, CommodityMiniCard, Converter
- **数据源**: 
  - 汇率: ExchangeRateContext (共享)
  - 大宗商品: 本地 useState + supabase realtime (GOLD/WTI/BRENT)
- **状态**: isLoading / error / 正常 三态渲染

### `src/views/RatesView.tsx`
- **角色**: 汇率详情页 (全币种对比)
- **Context**: useSettings, useExchangeRates
- **细节**:
  - 每张卡展示 official vs street 双栏对比
  - spread = street.sell - street.buy
  - 涨跌指示器: TrendingUp (绿) / TrendingDown (红)
  - 背景水印图标

### `src/views/PricesView.tsx`
- **角色**: 大宗商品价格追踪
- **Context**: useSettings
- **数据源**: 本地 fetch → Supabase prices 表 + realtime 订阅
- **细节**:
  - 三组分类: 能源 (WTI/BRENT/NATGAS)、金属 (GOLD/SILVER)、其他
  - 月度数据标记 (fred 源 + MONTHLY_SYMBOLS 集合)
  - 涨跌箭头 + 百分比

### `src/views/SettingsView.tsx`
- **角色**: 用户设置页
- **Context**: useSettings (language, darkMode, t)
- **数据源**: api/profile (fetchProfile / updateProfile)
- **细节**:
  - 头像 + 个人信息编辑 (展开/收起动画)
  - 语言切换: NL / EN 两按钮
  - 暗色模式: 弹簧动画 toggle (Sun ↔ Moon)
  - 汇率提醒: toggle 开关
  - 支持区: WhatsApp (未配置号码)、隐私政策
  - 版本号展示

---

## 组件层

### `src/components/TopAppBar.tsx`
- **角色**: 顶部固定导航栏
- **Props**: activeTab, onTabChange
- **细节**: 
  - 标题按 Tab 动态切换 (Dashboard 显示日期, 其他显示页面名)
  - 刷新按钮: 旋转动画 → window.location.reload()
  - 设置快捷入口

### `src/components/BottomNavBar.tsx`
- **角色**: 底部固定导航栏
- **Props**: activeTab, onTabChange
- **细节**:
  - 4 个 Tab: 仪表盘 / 汇率 / 物价 / 设置
  - motion layoutId 动画指示器
  - 毛玻璃效果: `bg-surface/90 backdrop-blur-2xl`
  - 暗色模式安全阴影: `shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.15)]`

### `src/components/CurrencyCard.tsx`
- **角色**: 单个汇率卡片 (仪表盘用)
- **Props**: rate: ExchangeRate
- **Context**: useSettings
- **细节**:
  - 图标按币种: USD → DollarSign, EUR → Euro
  - 双列显示官方/街头买入价
  - 涨跌百分比 badge (绿/红/灰)
  - 背景大图标水印

### `src/components/CommodityMiniCard.tsx`
- **角色**: 大宗商品迷你卡 (仪表盘用)
- **Props**: data: CommodityMiniCardData
- **细节**: 
  - 紧凑布局: 名称 + 涨跌 + 价格
  - 单位后缀处理 (USD/oz → /oz)

### `src/components/Converter.tsx`
- **角色**: USD ↔ SRD 实时货币转换器
- **Context**: useSettings, useExchangeRates (usdRate)
- **细节**:
  - 双向转换: fromUSD ? amount × rate : amount / rate
  - 中间圆形箭头按钮: hover 时 180° 旋转
  - 结果显示 2 位小数
  - 底部显示当前汇率 + street rate 标签

### `src/components/EmptyState.tsx`
- **角色**: 空状态占位组件
- **Props**: title, subtitle

---

## 样式

### `src/index.css`
- **角色**: Tailwind 入口 + 设计令牌 + 暗色模式
- **细节**:
  - 字体: Inter (正文) + Manrope (标题), Google Fonts CDN
  - `@theme` 定义 8 个颜色令牌
  - `html.dark` 覆盖令牌值实现暗色模式
  - `.hide-scrollbar` 工具类
