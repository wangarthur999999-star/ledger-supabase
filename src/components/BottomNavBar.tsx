import { LayoutGrid, TrendingUp, ShoppingBasket, BookOpen, Settings } from "lucide-react";
import { motion } from "motion/react";
import { TabId } from "../types";

const NAV_ITEMS: { id: TabId; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'rates', label: 'Koersen', icon: TrendingUp },
  { id: 'prices', label: 'Prijzen', icon: ShoppingBasket },
  { id: 'folders', label: 'Folders', icon: BookOpen },
  { id: 'settings', label: 'Instellingen', icon: Settings },
];

interface BottomNavBarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

export default function BottomNavBar({ activeTab, onTabChange }: BottomNavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-2xl border-t border-surface-container shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.15)] rounded-t-[32px]">
      <div className="flex justify-around items-center px-4 pt-4 pb-10 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              whileTap={{ scale: 0.85 }}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative py-2 ${isActive ? 'text-primary' : 'text-on-surface-variant/60 hover:text-on-surface-variant'}`}
            >
              <div className={`p-2.5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-primary/10 shadow-sm' : ''}`}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(0,69,50,0.5)]"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
