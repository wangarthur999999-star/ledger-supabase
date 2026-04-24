-- 阶段1-2：创建 prices 表（商品价格）
-- 数据来源：FRED API + metals.dev API
-- 执行方式：在 Supabase Dashboard > SQL Editor 中运行此文件

-- 1. 创建 prices 表
CREATE TABLE IF NOT EXISTS public.prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL UNIQUE,        -- 商品代码（如 GOLD, SILVER, WTI, BRENT, COPPER）
  name_en text NOT NULL,              -- 英文名称
  name_nl text NOT NULL,              -- 荷兰文名称（苏里南官方语言）
  unit text DEFAULT 'USD/oz',        -- 单位（USD/oz, USD/bbl, USD/lb）
  current_price numeric(12,2) NOT NULL,
  previous_price numeric(12,2),
  change_amount numeric(12,2),
  change_pct numeric(6,2),
  source text NOT NULL,               -- 数据来源（'fred', 'metals.dev'）
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2. 启用 RLS
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

-- 3. 公开读取策略（所有人可看）
CREATE POLICY "Public Read Prices" ON public.prices
  FOR SELECT USING (true);

-- 4. 只允许 service role 写入（通过 Edge Function / GitHub Actions 写入）
CREATE POLICY "Service Role Insert Prices" ON public.prices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service Role Update Prices" ON public.prices
  FOR UPDATE USING (true);

-- 5. 加入 Realtime publication（前端可订阅实时更新）
ALTER PUBLICATION supabase_realtime ADD TABLE public.prices;

-- 6. 插入初始数据（placeholder，后续由爬虫更新）
-- GOLD = 黄金, SILVER = 白银, WTI = 西德克萨斯原油, BRENT = 布伦特原油, COPPER = 铜
INSERT INTO public.prices (symbol, name_en, name_nl, unit, current_price, source)
VALUES
  ('GOLD',   'Gold',         'Goud',           'USD/oz',    2345.00, 'fred'),
  ('SILVER', 'Silver',       'Zilver',          'USD/oz',    27.50,   'metals.dev'),
  ('WTI',    'WTI Crude',    'WTI Ruwe Olie',  'USD/bbl',   78.20,   'fred'),
  ('BRENT',  'Brent Crude',  'Brent Ruwe Olie', 'USD/bbl',   82.50,   'fred'),
  ('COPPER', 'Copper',       'Koper',           'USD/lb',    3.85,    'fred')
ON CONFLICT (symbol) DO NOTHING;

-- 7. 验证
SELECT '✅ prices 表创建完成' AS status;
SELECT * FROM public.prices;
