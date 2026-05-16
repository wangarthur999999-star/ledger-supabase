import { useState } from "react";
import { ArrowUpDown, Info, Calculator, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import { useExchangeRates } from "../context/ExchangeRateContext";

export default function Converter() {
  const { t, locale } = useSettings();
  const { usdRate, rates } = useExchangeRates();
  const [amount, setAmount] = useState<string>("100");
  const [fromUSD, setFromUSD] = useState(true);

  const rateReady = usdRate > 0;

  const numericAmount = parseFloat(amount) || 0;
  const result = rateReady
    ? (fromUSD ? numericAmount * usdRate : numericAmount / usdRate)
    : 0;

  if (!rateReady && rates.length === 0) {
    return (
      <section className="bg-surface-container-low rounded-[32px] p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-surface-container flex items-center justify-center py-16">
        <p className="text-sm text-on-surface-variant font-bold">{t('converter.loading')}</p>
      </section>
    );
  }

  return (
    <section className="bg-surface-container-low rounded-[32px] p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-surface-container relative overflow-hidden group">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-1000" />

      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
            <Calculator size={24} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-2xl text-on-surface tracking-tight">{t('converter.title')}</h3>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">{t('converter.subtitle')}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold ring-1 ring-emerald-100">
          <TrendingUp size={14} />
          <span>{t('converter.liveBadge')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 relative">
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
              {t('converter.fromLabel', { currency: fromUSD ? t('common.amerikaanseDollar') : t('common.surinaamseDollar') })}
            </label>
            <span className="text-[10px] font-bold text-primary">{fromUSD ? 'USD' : 'SRD'}</span>
          </div>
          <div className="relative group/input">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-surface-container-low border-2 border-transparent rounded-3xl px-8 py-6 text-3xl font-headline font-extrabold focus:border-primary/20 focus:bg-white transition-all outline-none"
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <span className="text-2xl font-black text-on-surface/20">{fromUSD ? '$' : 'SRD'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center -my-6 relative z-10">
          <motion.button
            onClick={() => setFromUSD(!fromUSD)}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 rounded-full bg-on-surface text-white shadow-xl flex items-center justify-center border-[6px] border-white group/swap transition-all hover:bg-primary"
          >
            <ArrowUpDown size={24} strokeWidth={2.5} className="group-hover/swap:scale-125 transition-transform" />
          </motion.button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
              {t('converter.toLabel', { currency: fromUSD ? t('common.surinaamseDollar') : t('common.amerikaanseDollar') })}
            </label>
            <span className="text-[10px] font-bold text-primary">{fromUSD ? 'SRD' : 'USD'}</span>
          </div>
          <div className="w-full bg-primary/[0.03] border-2 border-primary/5 rounded-3xl px-8 py-6 flex items-center justify-between">
            <span className="text-3xl font-headline font-extrabold text-primary">
              <span className="text-primary/30 mr-2">{fromUSD ? 'SRD' : '$'}</span>
              {result.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="p-2 bg-surface-container-low rounded-xl shadow-sm border border-surface-container">
              <Info size={16} className="text-on-surface-variant" />
            </div>
          </div>
        </div>
      </div>

      {rateReady && (
        <div className="mt-10 flex items-center justify-center gap-4 py-4 bg-surface-container-low/50 rounded-2xl border border-surface-container/50">
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
            {t('converter.ratePrefix', { rate: usdRate.toFixed(2) })}
          </p>
          <div className="w-1 h-1 bg-on-surface-variant/30 rounded-full" />
          <p className="text-[10px] font-bold text-on-surface-variant italic">
            {t('converter.streetRateSublabel')}
          </p>
        </div>
      )}
    </section>
  );
}
