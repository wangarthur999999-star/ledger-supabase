/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import TopAppBar from "./components/TopAppBar";
import BottomNavBar from "./components/BottomNavBar";
import DashboardView from "./views/DashboardView";
import RatesView from "./views/RatesView";
import PricesView from "./views/PricesView";
import FoldersView from "./views/FoldersView";
import SettingsView from "./views/SettingsView";
import { TabId } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const handleTabChange = (id: TabId) => setActiveTab(id);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onTabChange={handleTabChange} />;
      case 'rates':
        return <RatesView />;
      case 'prices':
        return <PricesView />;
      case 'folders':
        return <FoldersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onTabChange={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/10 overflow-x-hidden">
      <TopAppBar activeTab={activeTab} onTabChange={handleTabChange} />
      
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNavBar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
    </div>
  );
}
