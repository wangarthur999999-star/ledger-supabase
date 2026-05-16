import { useState, useEffect } from "react";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import CurrencyCard from "../components/CurrencyCard";
import CommodityMiniCard from "../components/CommodityMiniCard";
import Converter from "../components/Converter";
import { formatRelativeTime } from "../lib/formatTime";
import { useSettings } from "../context/SettingsContext";
import { useExchangeRates } from "../context/ExchangeRateContext";
import { fetchDashboardCommodities, CommodityMiniCardData } from "../api/prices";
import { supabase } from "../lib/supabase";

const DASHBOARD_COMMODITIES = ['GOLD', 'WTI', 'BRENT'];

export default function DashboardView() {
  const { t } = useSettings();
  const { rates, isLoading, error, refresh } = useExchangeRates();
  const [commodities, setCommodities] = useState<CommodityMiniCardData[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadCommodities = async () => {
      try {
        const ordered = await fetchDashboardCommodities(DASHBOARD_COMMODITIES);
        if (mounted) setCommodities(ordered);
      } catch (err) {
        console.error('[Dashboard] commodities fetch error:', err instanceof Error ? err.message : String(err));
      }
    };

    loadCommodities();

    const pricesChannel = supabase
      .channel('dashboard_prices_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prices' }, () => loadCommodities())
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Dashboard] Prices channel error:', status);
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(pricesChannel);
    };
  }, []);

  let lastUpdatedElement = null;
  if (!isLoading && rates.length > 0) {
    const { text, isStale } = formatRelativeTime(rates[0].updatedAt, t);
    lastUpdatedElement = (
      <p className={`text-xs font-bold mt-1 ${isStale ? 'text-red-600' : 'text-on-surface-variant/70'}`}>
        {isStale ? '🕒 ' : ''}{t('dashboard.lastUpdatedPrefix')}{text}
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
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant">
            <WifiOff size={32} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-on-surface">{t('error.loadFailed')}</p>
            <p className="text-sm text-on-surface-variant">{t('error.loadFailedSub')}</p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold"
          >
            <RefreshCw size={16} />
            {t('error.retry')}
          </button>
        </div>
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
