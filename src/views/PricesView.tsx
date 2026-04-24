import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import { supabase } from "../lib/supabase";

interface PriceItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  currency: string | null;
  change: number | null;
  change_pct: number | null;
  source: string;
  updated_at: string;
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function formatPrice(price: number, currency: string | null): string {
    const symbol = currency === 'USD' ? '$' : '';
    return `${symbol}${price.toFixed(2)}`;
  }

  function formatChange(amount: number | null, pct: number | null): string {
    if (amount === null || pct === null) return '-';
    const sign = amount >= 0 ? '+' : '';
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

  const isPositive = (pct: number | null) => pct !== null && pct >= 0;

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
        </section>
        <div className="bg-red-50 text-red-700 p-4 rounded-xl">
          Error: {error}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prices.map((item, index) => (
          <motion.div
            key={item.symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-3xl p-6 border border-surface shadow-sm space-y-4"
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
              <div
                className={`p-2 rounded-full ${
                  isPositive(item.change_pct)
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {isPositive(item.change_pct) ? (
                  <ArrowUp size={20} />
                ) : (
                  <ArrowDown size={20} />
                )}
              </div>
            </div>

            <div>
              <p className="font-headline font-extrabold text-3xl text-on-surface">
                {formatPrice(item.price, item.currency)}
              </p>
              <p
                className={`text-sm font-medium ${
                  isPositive(item.change_pct)
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {formatChange(item.change, item.change_pct)}
              </p>
            </div>

            <div className="pt-2 border-t border-surface-container">
              <p className="text-xs text-on-surface-variant">
                Source: {item.source} • {formatTime(item.updated_at)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {prices.length === 0 && (
        <div className="text-center py-20 text-on-surface-variant">
          {t('prices.empty') || 'No price data available yet.'}
        </div>
      )}
    </div>
  );
}
