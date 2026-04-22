import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import CurrencyCard from "../components/CurrencyCard";
import Converter from "../components/Converter";
import FolderCarousel from "../components/FolderCarousel";
import { ExchangeRate } from "../types";
import { fetchExchangeRates } from "../api/rates";
import { TabId } from "../types";
import { formatRelativeTime } from "../lib/formatTime";

interface DashboardViewProps {
  onTabChange: (id: TabId) => void;
}

export default function DashboardView({ onTabChange }: DashboardViewProps) {
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
    <div className="space-y-12">
      <section className="space-y-2">
        <h2 className="font-headline font-extrabold text-4xl text-primary tracking-tight leading-tight">
          Wisselkoersen Dashboard
        </h2>
        <p className="text-on-surface-variant font-medium text-lg">
          Real-time financiële inzichten voor Suriname.
        </p>
        {!isLoading && rates.length > 0 && (() => {
          const { text, isStale } = formatRelativeTime(rates[0].updatedAt);
          return (
            <p className={`text-xs font-bold mt-1 ${isStale ? 'text-red-600' : 'text-on-surface-variant/70'}`}>
              {isStale ? '⚠️ ' : ''}Laatst bijgewerkt: {text}
            </p>
          );
        })()}
      </section>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-4 text-primary">
          <Loader2 size={40} className="animate-spin" />
          <p className="font-bold">Koersen laden...</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rates.map((rate) => (
            <CurrencyCard key={rate.pair} rate={rate} />
          ))}
        </section>
      )}

      <Converter />
      <FolderCarousel onTabChange={onTabChange} />
    </div>
  );
}
