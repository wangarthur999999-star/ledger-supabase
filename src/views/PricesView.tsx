import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, RefreshCw, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import { useSettings, type TKey } from "../context/SettingsContext";
import { supabase } from "../lib/supabase";

interface PriceItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  currency: string | null;
  unit: string;
  change: number | null;
  change_pct: number | null;
  source: string;
  updated_at: string;
}

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

function getGroup(symbol: string): GroupKey {
  if (ENERGY_SYMBOLS.has(symbol)) return 'energy';
  if (METAL_SYMBOLS.has(symbol)) return 'metals';
  return 'other';
}

export default function PricesView() {
  const { t, locale } = useSettings();
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function fetchPrices() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('prices')
        .select('*')
        .order('symbol', { ascending: true });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data && data.length > 0) {
        setPrices(data as PriceItem[]);
        const newest = data.reduce((prev, curr) =>
          new Date(curr.updated_at) > new Date(prev.updated_at) ? curr : prev
        );
        setLastUpdated(newest.updated_at);
      } else {
        setPrices([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrices();

    const channel = supabase
      .channel('prices-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prices' },
        () => {
          fetchPrices();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Prices] Realtime channel error:', status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  function formatTime(timeStr: string): string {
    const date = new Date(timeStr);
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getChangeState(pct: number | null): 'positive' | 'negative' | 'neutral' {
    if (pct === null) return 'neutral';
    if (pct > 0) return 'positive';
    if (pct < 0) return 'negative';
    return 'neutral';
  }
  const isMonthly = (item: PriceItem) =>
    item.source === 'fred' && MONTHLY_SYMBOLS.has(item.symbol);

  if (loading) {
    return (
      <div className="space-y-10">
        <section className="space-y-2">
          <h2 className="font-headline font-extrabold text-primary text-3xl tracking-tight leading-tight">
            {t('prices.title')}
          </h2>
          <p className="text-on-surface-variant font-medium">
            {t('prices.subtitle')}
          </p>
        </section>
        <div className="text-center py-20 text-on-surface-variant">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10">
        <section className="space-y-2">
          <h2 className="font-headline font-extrabold text-primary text-3xl tracking-tight leading-tight">
            {t('prices.title')}
          </h2>
          <p className="text-on-surface-variant font-medium">
            {t('prices.subtitle')}
          </p>
        </section>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant">
            <WifiOff size={32} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-on-surface">{t('error.loadFailed')}</p>
            <p className="text-sm text-on-surface-variant">{t('error.loadFailedSub')}</p>
          </div>
          <button
            onClick={fetchPrices}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold"
          >
            <RefreshCw size={16} />
            {t('error.retry')}
          </button>
        </div>
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
            onClick={fetchPrices}
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

      {(['energy', 'metals', 'other'] as GroupKey[]).map((group) => {
        const groupItems = prices.filter((p) => getGroup(p.symbol) === group);
        if (groupItems.length === 0) return null;
        const groupTitleKey = (
          group === 'energy'
            ? 'prices.groupEnergy'
            : group === 'metals'
            ? 'prices.groupMetals'
            : 'prices.groupOther'
        ) as TKey;
        return (
          <section key={group} className="space-y-4">
            <h3 className="text-lg font-bold text-on-surface px-1">
              {t(groupTitleKey)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupItems.map((item, index) => (
                <motion.div
                  key={item.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-surface-container-low rounded-3xl p-6 border border-surface shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-headline font-extrabold text-lg text-on-surface">
                        {item.name}
                      </h3>
                      <p className="text-sm text-on-surface-variant">
                        {item.symbol}
                      </p>
                    </div>
                    {!isMonthly(item) && (
                      <div
                        className={`p-2 rounded-full ${
                          getChangeState(item.change_pct) === 'positive'
                            ? 'bg-green-50 text-green-600'
                            : getChangeState(item.change_pct) === 'negative'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {getChangeState(item.change_pct) === 'positive' ? (
                          <ArrowUp size={20} />
                        ) : getChangeState(item.change_pct) === 'negative' ? (
                          <ArrowDown size={20} />
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-headline font-extrabold text-3xl text-on-surface">
                      {formatPrice(item.price, item.currency, item.unit)}
                    </p>
                    {isMonthly(item) ? (
                      <p className="text-sm font-medium text-on-surface-variant">
                        {t('prices.monthlyData')}
                      </p>
                    ) : (
                      <p
                        className={`text-sm font-medium ${
                          getChangeState(item.change_pct) === 'positive'
                            ? 'text-green-600'
                            : getChangeState(item.change_pct) === 'negative'
                            ? 'text-red-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {formatChange(item.change, item.change_pct)}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-surface-container">
                    <p className="text-xs text-on-surface-variant">
                      Source: {item.source} • {formatTime(item.updated_at)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        );
      })}

      {prices.length === 0 && (
        <div className="text-center py-20 text-on-surface-variant">
          {t('prices.empty') || 'No price data available yet.'}
        </div>
      )}
    </div>
  );
}
