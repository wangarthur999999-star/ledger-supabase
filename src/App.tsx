/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardView from './views/DashboardView';
import RatesView from './views/RatesView';
import PricesView from './views/PricesView';
import SettingsView from './views/SettingsView';
import { TabId } from './types';
import { reportError } from './lib/sentry';
import { useAlertWatcher } from './lib/useAlertWatcher';

const TAB_STORAGE_KEY = 'ledger_active_tab_v1';
const VALID_TABS: readonly TabId[] = ['dashboard', 'rates', 'prices', 'settings'];

function readInitialTab(): TabId {
  if (typeof localStorage === 'undefined') return 'dashboard';
  const raw = localStorage.getItem(TAB_STORAGE_KEY);
  return VALID_TABS.includes(raw as TabId) ? (raw as TabId) : 'dashboard';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(readInitialTab);

  // 启动 alert watcher: 每当 rates 变化, 跟用户的阈值比对, 触发就推通知。
  // Capacitor APK 走本地通知; web/PWA 走 Notification API。
  // 后端 check_alerts.js 是补充, 处理 Web Push (用户没打开 app 时也能收到)。
  useAlertWatcher();

  // 持久化 active tab: 关 app 再开能回到上次的位置 (移动端常见预期)
  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {
      // 隐私模式 / quota 满了 — 忽略
    }
  }, [activeTab]);

  const handleTabChange = (id: TabId) => setActiveTab(id);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'rates':
        return <RatesView />;
      case 'prices':
        return <PricesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <ErrorBoundary
      onError={reportError}
      fallback={
        <div className="min-h-screen flex items-center justify-center text-red-500 p-8">
          Something went wrong. Please restart the app.
        </div>
      }
    >
      <div className="min-h-screen bg-surface selection:bg-primary/10 overflow-x-hidden flex flex-col">
        <TopAppBar activeTab={activeTab} onTabChange={handleTabChange} />

        <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-28 pb-40">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="w-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNavBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </ErrorBoundary>
  );
}
