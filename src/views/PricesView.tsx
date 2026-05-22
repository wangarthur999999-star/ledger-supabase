import { memo, useMemo } from 'react';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useSettings, type TKey } from '../context/SettingsContext';
import ErrorState from '../components/ErrorState';
import Sparkline from '../components/Sparkline';
import { usePrices, type PriceItem } from '../lib/usePrices';
import { usePriceHistory } from '../lib/usePriceHistory';

const MONTHLY_SYMBOLS = new Set([
  'ALUMINUM',
  'RICE',
  'SUGAR',
  'WHEAT',
  'COFFEE',
  'SOYBEAN_OIL',
]);

const ENERGY_SYMBOLS = new Set(['WTI', 'BRENT', 'NATGAS']);
const METAL_SYMBOLS = new Set(['GOLD', 'SILVER']);

type GroupKey = 'energy' | 'metals' | 'other';
const GROUPS: readonly GroupKey[] = ['energy', 'metals', 'other'];

function getGroup(symbol: string): GroupKey {
  if (ENERGY_SYMBOLS.has(symbol)) return 'energy';
  if (METAL_SYMBOLS.has(symbol)) return 'metals';
  return 'other';
}

const GROUP_TITLE_KEYS: Record<GroupKey, TKey> = {
  energy: 'prices.groupEnergy',
  metals: 'prices.groupMetals',
  other: 'prices.groupOther',
};

// 这些是纯函数 (除了 formatTime 依赖 locale), 挪到模块顶层避免每次 render 重新创建。
// PriceCard 用 React.memo 后, props 是稳定引用就不会触发重渲。

function formatPrice(price: number, currency: string | null, unit: string): string {
  const symbol = currency === 'USD' ? '$' : '';
  const unitSuffix = unit ? ` ${unit.replace('USD/', '/')}` : '';
  return `${symbol}${price.toFixed(2)}${unitSuffix}`;
}

function formatChange(amount: number | null, pct: number | null): string {
  if (amount === null || pct === null) return '-';
  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
}

function makeFormatTime(locale: string) {
  return (timeStr: string): string => {
    const date = new Date(timeStr);
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
}

function getChangeState(pct: number | null): 'positive' | 'negative' | 'neutral' {
  if (pct === null) return 'neutral';
  if (pct > 0) return 'positive';
  if (pct < 0) return 'negative';
  return 'neutral';
}

function isMonthly(item: PriceItem): boolean {
  return item.source === 'fred' && MONTHLY_SYMBOLS.has(item.symbol);
}

export default function PricesView() {
  const { t, locale } = useSettings();
  const { prices, isLoading, error, refresh } = usePrices();

  // 一次性按 group 分桶 (O(N)), 之前是每个 group 都 filter 一遍全量 (O(G×N))。
  // 当前 N=11 不构成性能问题, 但是 antipattern, 修了。
  const groupedPrices = useMemo(() => {
    const buckets: Record<GroupKey, PriceItem[]> = {
      energy: [],
      metals: [],
      other: [],
    };
    for (const p of prices) {
      buckets[getGroup(p.symbol)].push(p);
    }
    return buckets;
  }, [prices]);

  // 取最新的 updated_at 作为页面顶部 "Updated: ..." 提示
  let lastUpdated: string | null = null;
  if (prices.length > 0) {
    lastUpdated = prices.reduce<string | null>((latest, p) => {
      if (!p.updated_at) return latest;
      return !latest || p.updated_at > latest ? p.updated_at : latest;
    }, null);
  }

  // formatTime 依赖当前 locale, useMemo 稳定引用让 PriceCard 不必要重渲
  const formatTime = useMemo(() => makeFormatTime(locale), [locale]);

  if (isLoading) {
    return (
      <div className="space-y-10">
        <PageHeader t={t} />
        <div className="text-center py-20 text-on-surface-variant">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10">
        <PageHeader t={t} />
        <ErrorState onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline font-extrabold text-primary text-3xl tracking-tight leading-tight">
              {t('prices.title')}
            </h2>
            <p className="text-on-surface-variant font-medium">
              {t('prices.subtitle')}
            </p>
          </div>
          <button
            onClick={refresh}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            title={t('topbar.refresh')}
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {lastUpdated && (
          <p className="text-sm text-on-surface-variant">
            {t('dashboard.lastUpdatedPrefix')} {formatTime(lastUpdated)}
          </p>
        )}
      </section>

      {GROUPS.map((group) => {
        const groupItems = groupedPrices[group];
        if (groupItems.length === 0) return null;
        return (
          <section key={group} className="space-y-4">
            <h3 className="text-lg font-bold text-on-surface px-1">
              {t(GROUP_TITLE_KEYS[group])}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupItems.map((item, index) => (
                <PriceCard
                  key={item.symbol}
                  item={item}
                  delay={Math.min(index * 0.04, 0.25)}
                  formatTime={formatTime}
                  monthlyLabel={t('prices.monthlyData')}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        );
      })}

      {prices.length === 0 && (
        <div className="text-center py-20 text-on-surface-variant">
          {t('prices.empty')}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 单张商品卡 (抽出来是因为每张卡要独立调 usePriceHistory hook,
// 在 .map() 里直接调 hook 会违反 rules of hooks)
// memo: 父组件 PricesView 重渲时 (e.g. realtime 推了新数据但本卡不变),
// 本卡不必重渲
// ─────────────────────────────────────────────────────────────────

interface PriceCardProps {
  item: PriceItem;
  delay: number;
  formatTime: (timeStr: string) => string;
  monthlyLabel: string;
  locale: string;
}

const PriceCard = memo(function PriceCard({
  item,
  delay,
  formatTime,
  monthlyLabel,
  locale,
}: PriceCardProps) {
  const { data: history } = usePriceHistory(item.symbol, 30);
  const monthly = isMonthly(item);
  const changeState = getChangeState(item.change_pct);
  const sparklineTone =
    changeState === 'positive' ? 'up' : changeState === 'negative' ? 'down' : 'neutral';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white rounded-3xl p-6 border border-surface shadow-sm space-y-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-headline font-extrabold text-lg text-on-surface">{item.name}</h3>
          <p className="text-sm text-on-surface-variant">{item.symbol}</p>
        </div>
        {!monthly && (
          <div
            className={`p-2 rounded-full ${
              changeState === 'positive'
                ? 'bg-green-50 text-green-600'
                : changeState === 'negative'
                ? 'bg-red-50 text-red-600'
                : 'bg-gray-50 text-gray-400'
            }`}
          >
            {changeState === 'positive' ? (
              <ArrowUp size={20} />
            ) : changeState === 'negative' ? (
              <ArrowDown size={20} />
            ) : null}
          </div>
        )}
      </div>

      <div>
        <p className="font-headline font-extrabold text-3xl text-on-surface">
          {formatPrice(item.price, item.currency, item.unit)}
        </p>
        {monthly ? (
          <p className="text-sm font-medium text-on-surface-variant">{monthlyLabel}</p>
        ) : (
          <p
            className={`text-sm font-medium ${
              changeState === 'positive'
                ? 'text-green-600'
                : changeState === 'negative'
                ? 'text-red-600'
                : 'text-gray-400'
            }`}
          >
            {formatChange(item.change, item.change_pct)}
          </p>
        )}
      </div>

      {/* Sparkline: 历史数据 >= 2 个点才显示, 否则留空白避免空线 */}
      {history.length >= 2 && (
        <div className="-mx-2">
          <Sparkline data={history} tone={sparklineTone} height={40} locale={locale} />
        </div>
      )}

      <div className="pt-2 border-t border-surface-container">
        <p className="text-xs text-on-surface-variant">
          Source: {item.source} • {formatTime(item.updated_at)}
        </p>
      </div>
    </motion.div>
  );
});

// 抽出页头, 三处 (loading / error / normal) 共用
function PageHeader({ t }: { t: (k: TKey) => string }) {
  return (
    <section className="space-y-2">
      <h2 className="font-headline font-extrabold text-primary text-3xl tracking-tight leading-tight">
        {t('prices.title')}
      </h2>
      <p className="text-on-surface-variant font-medium">
        {t('prices.subtitle')}
      </p>
    </section>
  );
}
