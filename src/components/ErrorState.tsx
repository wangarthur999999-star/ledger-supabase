import { WifiOff, RefreshCw } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface ErrorStateProps {
  onRetry: () => void;
}

// 通用错误占位 + 重试. Dashboard / Rates / Prices 三处用同一份 UI.
export default function ErrorState({ onRetry }: ErrorStateProps) {
  const { t } = useSettings();
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant">
        <WifiOff size={32} />
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-on-surface">{t('error.loadFailed')}</p>
        <p className="text-sm text-on-surface-variant">{t('error.loadFailedSub')}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold"
      >
        <RefreshCw size={16} />
        {t('error.retry')}
      </button>
    </div>
  );
}
