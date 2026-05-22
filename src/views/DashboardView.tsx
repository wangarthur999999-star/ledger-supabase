import { Loader2 } from 'lucide-react';
import CurrencyCard from '../components/CurrencyCard';
import CommodityMiniCard from '../components/CommodityMiniCard';
import Converter from '../components/Converter';
import ErrorState from '../components/ErrorState';
import { formatRelativeTime } from '../lib/formatTime';
import { useSettings } from '../context/SettingsContext';
import { useExchangeRates } from '../lib/useExchangeRates';
import { usePrices } from '../lib/usePrices';

const DASHBOARD_COMMODITIES = ['GOLD', 'WTI', 'BRENT'] as const;

export default function DashboardView() {
  const { t } = useSettings();
  const { rates, isLoading, error, refresh } = useExchangeRates();
  const { prices } = usePrices();

  // 从全量 prices 里筛 dashboard 用的精选, 顺序固定: GOLD, WTI, BRENT
  const commodities = DASHBOARD_COMMODITIES
    .map((sym) => prices.find((p) => p.symbol === sym))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // 用所有 rate 里最新的 updatedAt, 不依赖数组顺序 (Supabase 返回顺序无保证)
  let lastUpdatedElement = null;
  if (!isLoading && rates.length > 0) {
    const latestIso = rates.reduce<string | undefined>((latest, r) => {
      if (!r.updatedAt) return latest;
      return !latest || r.updatedAt > latest ? r.updatedAt : latest;
    }, undefined);
    const { text, isStale } = formatRelativeTime(latestIso, t);
    lastUpdatedElement = (
      <p className={`text-xs font-bold mt-1 ${isStale ? 'text-red-600' : 'text-on-surface-variant/70'}`}>
        {isStale ? '🕒 ' : ''}
        {t('dashboard.lastUpdatedPrefix')}
        {text}
      </p>
    );
  }

  return (
    <div className="space-y-12">
      <section className="space-y-2">
        <h2 className="font-headline font-extrabold text-4xl text-primary tracking-tight leading-tight">
          {t('dashboard.title')}
        </h2>
        <p className="text-on-surface-variant font-medium text-lg">
          {t('dashboard.subtitle')}
        </p>
        {lastUpdatedElement}
      </section>

      {error ? (
        <ErrorState onRetry={refresh} />
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-4 text-primary">
          <Loader2 size={40} className="animate-spin" />
          <p className="font-bold">{t('dashboard.loading')}</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rates.map((rate) => (
            <CurrencyCard key={rate.pair} rate={rate} />
          ))}
        </section>
      )}

      {commodities.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-on-surface px-1">
            {t('dashboard.commoditiesTitle')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {commodities.map((c) => (
              <CommodityMiniCard key={c.symbol} data={c} />
            ))}
          </div>
        </section>
      )}

      <Converter />
    </div>
  );
}
