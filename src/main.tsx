import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App';
import './index.css';
import { SettingsProvider } from './context/SettingsContext';
import { initSentryAsync } from './lib/sentry';
import { initCapacitor } from './lib/capacitor';

// Sentry 异步加载 — 不阻塞首屏。DEV / 没配 DSN 时直接 no-op (chunk 不下载)。
initSentryAsync();

// Capacitor 平台初始化 (status bar 样式等). Web 环境下完全 no-op。
initCapacitor();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    {/* reducedMotion="user": 自动检测系统 prefers-reduced-motion: reduce,
       开启的用户 (前庭障碍 / 眩晕敏感) 会跳过所有 motion 动画的运动部分。 */}
    <MotionConfig reducedMotion="user">
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </MotionConfig>
  </StrictMode>,
);
