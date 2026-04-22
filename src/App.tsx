/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import TopAppBar from "./components/TopAppBar";
import BottomNavBar from "./components/BottomNavBar";
import DashboardView from "./views/DashboardView";
import RatesView from "./views/RatesView";
import PricesView from "./views/PricesView";
import FoldersView from "./views/FoldersView";
import SettingsView from "./views/SettingsView";
import { TabId } from "./types";
import { fetchProfile } from "./api/profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [language, setLanguage] = useState<'NL' | 'EN'>('NL');

  useEffect(() => {
    // Sync language from profile on load
    const syncProfile = async () => {
      const profile = await fetchProfile();
      if (profile) {
        setLanguage(profile.language as 'NL' | 'EN');
      }
    };
    syncProfile();
  }, []);

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
    <div className="min-h-screen bg-surface selection:bg-primary/10 overflow-x-hidden flex flex-col">
      <TopAppBar activeTab={activeTab} onTabChange={handleTabChange} language={language} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-28 pb-40">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ 
              duration: 0.2, 
              ease: [0.4, 0, 0.2, 1] 
            }}
            className="w-full"
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
