import { TrendingUp, TrendingDown, DollarSign, Euro } from "lucide-react";
import { motion } from "motion/react";
import { ExchangeRate } from "../types";

interface CurrencyCardProps {
  rate: ExchangeRate;
  key?: string;
}

export default function CurrencyCard({ rate }: CurrencyCardProps) {
  const isUp = rate.change >= 0;
  const Icon = rate.pair.includes('USD') ? DollarSign : Euro;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-low rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[200px] group border border-transparent hover:border-primary/10 transition-colors"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Icon size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-xl text-on-surface tracking-tight">{rate.pair}</h3>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{rate.fullName}</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isUp ? '+' : ''}{rate.change}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Official (CBvS)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-headline font-extrabold text-primary">{rate.official.buy.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Street (Cambio)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-headline font-extrabold text-on-surface">{rate.street.buy.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Background Icon Watermark */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
        <Icon size={160} />
      </div>
    </motion.div>
  );
}
