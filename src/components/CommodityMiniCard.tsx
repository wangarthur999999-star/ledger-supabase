import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "motion/react";

export interface CommodityMiniCardData {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  change_pct: number | null;
}

interface CommodityMiniCardProps {
  data: CommodityMiniCardData;
}

export default function CommodityMiniCard({ data }: CommodityMiniCardProps) {
  const isUp = data.change_pct !== null && data.change_pct > 0;
  const isDown = data.change_pct !== null && data.change_pct < 0;
  const unitSuffix = data.unit ? ` ${data.unit.replace('USD/', '/')}` : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-low rounded-2xl p-4 border border-transparent hover:border-primary/10 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest truncate">
            {data.name}
          </p>
        </div>
        {data.change_pct !== null && (
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
              isUp
                ? 'bg-emerald-100 text-emerald-700'
                : isDown
                ? 'bg-red-100 text-red-700'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {isUp ? <TrendingUp size={10} /> : isDown ? <TrendingDown size={10} /> : null}
            <span>
              {isUp ? '+' : ''}
              {data.change_pct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      <p className="font-headline font-extrabold text-xl text-on-surface">
        ${data.price.toFixed(2)}
        <span className="text-sm font-bold text-on-surface-variant">{unitSuffix}</span>
      </p>
    </motion.div>
  );
}
