import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Sentry from "@sentry/react";
import TopAppBar from "./components/TopAppBar";
import BottomNavBar from "./components/BottomNavBar";
import { TabId } from "./types";
import { Loader2 } from "lucide-react";

const DashboardView = lazy(() => import("./views/DashboardView"));
const RatesView = lazy(() => import("./views/RatesView"));
const PricesView = lazy(() => import("./views/PricesView"));
const SettingsView = lazy(() => import("./views/SettingsView"));

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

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
    <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center text-red-500 p-8">Something went wrong. Please restart the app.</div>}>
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
              <Suspense fallback={<ViewFallback />}>
                {renderView()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNavBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </Sentry.ErrorBoundary>
  );
}
