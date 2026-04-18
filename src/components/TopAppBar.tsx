import { useState } from "react";
import { Settings, RefreshCw, User } from "lucide-react";
import { motion } from "motion/react";
import { TabId } from "../types";

interface TopAppBarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

export default function TopAppBar({ activeTab, onTabChange }: TopAppBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const dateString = today.toLocaleDateString('nl-NL', options);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return dateString.charAt(0).toUpperCase() + dateString.slice(1);
      case 'prices':
        return 'Prijsvergelijker';
      case 'folders':
        return 'Folders';
      case 'settings':
        return 'Instellingen';
      case 'rates':
        return 'Wisselkoersen';
      default:
        return 'Sovereign Ledger';
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };
  
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-container shadow-sm">
      <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center h-20">
        <div className="flex items-center gap-4">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-10 h-10 rounded-full bg-primary-container overflow-hidden ring-2 ring-primary/5 shadow-sm"
          >
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI6Pd1nnoofvkgxmCx5cKIlNJsQRbdZ94z8hnJP2GCJ_4w_R3NDHdwz2zDVp0WVN3io5mThp1C3v0mNwKtteCw8a85uQcF-AkqJrX2xkh6-mVa12JrGBe4fwR-8pyqImrjA_xr21H0pOVNJLBwq6GGU4hDFNqs6MWw2xJCa7xNsQRJGVUsM093K8xjU1g-800zeebvaGvoL7ElTWR6DdRCXZ0BLwSoNWhjuz8fAn-xoHGIZRxYMZ4XjfxiVPKINKc-svdM0KDPPM33" 
              alt="Profile"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <div>
            <h1 className="font-headline font-extrabold text-lg text-primary leading-tight tracking-tight">
              {getTitle()}
            </h1>
            {activeTab === 'dashboard' && (
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">
                Update: {today.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={{ duration: 0.6 }}
            className="p-2.5 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
            title="Vernieuwen"
          >
            <RefreshCw size={20} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => onTabChange('settings')}
            className={`p-2.5 rounded-full hover:bg-surface-container transition-colors ${activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-on-surface-variant'}`}
            title="Instellingen"
          >
            <Settings size={20} />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
