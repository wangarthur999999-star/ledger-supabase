import { useState, useEffect } from "react";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Euro, ArrowUpDown } from "lucide-react";
import { motion } from "motion/react";
import { ExchangeRate } from "../types";
import { fetchExchangeRates } from "../api/rates";

export default function RatesView() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRates = async () => {
      setIsLoading(true);
      const data = await fetchExchangeRates();
      setRates(data);
      setIsLoading(false);
    };
    loadRates();
  }, []);

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h2 className="font-headline font-extrabold text-4xl text-primary tracking-tight leading-tight">
          Wisselkoersen
        </h2>
        <p className="text-on-surface-variant font-medium text-lg">
          Alle koersen op één plek – officieel & straat.
        </p>
      </section>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-primary">
          <Loader2 size={40} className="animate-spin" />
          <p className="font-bold">Koersen laden...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {rates.map((rate) => {
            const isUp = rate.change >= 0;
            const Icon = rate.pair.includes('USD') ? DollarSign : Euro;

            return (
              <motion.div
                key={rate.pair}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 border border-surface-container shadow-sm overflow-hidden relative"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <Icon size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">{rate.pair}</h3>
                      <p className="text-xs font-bold text-on-surface-variant">{rate.fullName}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{isUp ? '+' : ''}{rate.change}%</span>
                  </div>
                </div>

                {/* Rate Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Official */}
                  <div className="bg-surface-container-low rounded-2xl p-5 space-y-4">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Official (CBvS)</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-on-surface-variant">Aankoop</span>
                        <span className="text-xl font-headline font-extrabold text-primary">
                          {Number(rate.official.buy).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-px bg-surface-container" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-on-surface-variant">Verkoop</span>
                        <span className="text-xl font-headline font-extrabold text-on-surface">
                          {Number(rate.official.sell).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Street */}
                  <div className="bg-primary/[0.03] rounded-2xl p-5 space-y-4 border border-primary/5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Street (Cambio)</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-primary/60">Aankoop</span>
                        <span className="text-xl font-headline font-extrabold text-primary">
                          {Number(rate.street.buy).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-px bg-primary/10" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-primary/60">Verkoop</span>
                        <span className="text-xl font-headline font-extrabold text-primary">
                          {Number(rate.street.sell).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spread indicator */}
                <div className="mt-4 flex items-center justify-center gap-3 py-3 bg-surface-container-low/50 rounded-xl">
                  <ArrowUpDown size={14} className="text-on-surface-variant" />
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                    Spread: <span className="text-primary">{(Number(rate.street.sell) - Number(rate.street.buy)).toFixed(2)} SRD</span>
                  </p>
                </div>

                {/* Watermark */}
                <div className="absolute -right-6 -bottom-6 opacity-[0.02]">
                  <Icon size={160} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
