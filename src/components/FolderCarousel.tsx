import { useState, useEffect } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { Folder, TabId } from "../types";
import { fetchFolders } from "../api/folders";

interface FolderCarouselProps {
  onTabChange: (id: TabId) => void;
}

export default function FolderCarousel({ onTabChange }: FolderCarouselProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchFolders();
      setFolders(data);
      setIsLoading(false);
    };
    load();
  }, []);

  // 数据为空且已加载完成时不显示本区域 (Folders 功能还没上线)。
  // Loading 时仍然渲染,避免加载完成后 Dashboard 布局跳动。
  if (!isLoading && folders.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-headline font-bold text-2xl text-on-surface tracking-tight">Nieuwste Folders</h3>
        <button 
          onClick={() => onTabChange('folders')}
          className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
        >
          Bekijk alles <ArrowRight size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-primary">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6 snap-x group">
          {folders.map((folder) => (
            <motion.div 
              key={folder.id}
              whileHover={{ y: -4 }}
              className="flex-shrink-0 w-48 snap-start space-y-3 cursor-pointer"
            >
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-sm shadow-primary/5 bg-surface-container relative">
                <img 
                  src={folder.image} 
                  alt={folder.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              <div className="px-1">
                <p className="font-bold text-sm text-on-surface truncate">{folder.name}</p>
                <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{folder.validity}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
