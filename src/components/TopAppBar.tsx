import { useEffect, useState } from "react";
import { Settings, RefreshCw, User } from "lucide-react";
import { motion } from "motion/react";
import { TabId } from "../types";
import { useSettings } from "../context/SettingsContext";
import { refreshExchangeRates } from "../lib/useExchangeRates";
import { refreshPrices } from "../lib/usePrices";

interface TopAppBarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

export default function TopAppBar({ activeTab, onTabChange }: TopAppBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t, locale } = useSettings();

  // 标题里的日期/时间 mount 时算一次, 然后每分钟刷新一次
  // (原实现永不更新, 跨日打开 app 标题不变)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  const dateString = now.toLocaleDateString(locale, dateOptions);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return dateString.charAt(0).toUpperCase() + dateString.slice(1);
      case 'prices':
        return t('pageTitle.prices');
      case 'settings':
        return t('pageTitle.settings');
      case 'rates':
        return t('pageTitle.rates');
      default:
        return t('pageTitle.default');
    }
  };

  // 手动刷新: 触发共享 store 的强刷, 不再用 window.location.reload()。
  // reload 会重新加载所有 JS, 重置所有 state, 移动端体验差。
  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshExchangeRates();
    refreshPrices();
    // 视觉反馈 ~600ms 让用户看到旋转
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-container shadow-sm">
      <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center h-20">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-10 h-10 rounded-full bg-primary-container ring-2 ring-primary/5 shadow-sm flex items-center justify-center text-primary"
          >
            <User size={20} />
          </motion.div>
          <div>
            <h1 className="font-headline font-extrabold text-lg text-primary leading-tight tracking-tight">
              {getTitle()}
            </h1>
            {activeTab === 'dashboard' && (
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">
                {t('topbar.updatePrefix')}
                {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.6 }}
            className="p-2.5 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
            title={t('topbar.refresh')}
            aria-label={t('topbar.refresh')}
          >
            <RefreshCw size={20} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onTabChange('settings')}
            className={`p-2.5 rounded-full hover:bg-surface-container transition-colors ${activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-on-surface-variant'}`}
            title={t('topbar.settings')}
            aria-label={t('topbar.settings')}
          >
            <Settings size={20} />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
