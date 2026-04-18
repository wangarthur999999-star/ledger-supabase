import { ArrowRight, BookOpen, Clock, Zap, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Folder } from "../types";
import { fetchFolders } from "../api/folders";

export default function FoldersView() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFolders = async () => {
      setIsLoading(true);
      const data = await fetchFolders();
      setFolders(data);
      setIsLoading(false);
    };
    loadFolders();
  }, []);

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h2 className="font-headline font-extrabold text-primary text-4xl tracking-tight leading-tight">Folders</h2>
        <p className="font-body text-secondary text-lg">Ontdek de nieuwste aanbiedingen van uw favoriete winkels.</p>
      </section>

      <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
        {['Alle Folders', 'Populair', 'Nieuw', 'Eindigt Binnenkort'].map((filter, i) => (
          <button key={filter} className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${i === 0 ? 'bg-primary text-white shadow-lg' : 'bg-surface-container-highest text-on-surface'}`}>{filter}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-primary">
          <Loader2 size={40} className="animate-spin" />
          <p className="font-bold">Folders laden...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {folders.map((folder, index) => (
            <motion.div 
              key={folder.id}
              whileHover={{ y: -6 }}
              className="group flex flex-col bg-white rounded-3xl overflow-hidden shadow-[0_12px_32px_-4px_rgba(30,41,59,0.08)] border border-surface-container"
            >
              <div className="aspect-[4/3] w-full relative overflow-hidden bg-surface-container">
                <img src={folder.image} alt={folder.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                {index === 0 && (
                  <div className="absolute top-4 left-4 bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Nieuw</div>
                )}
                {index === 2 && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Laatste Kans</div>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-headline font-bold text-2xl text-on-surface">{folder.name}</h3>
                    <div className={`flex items-center gap-2 mt-1 font-bold text-xs ${index === 2 ? 'text-red-600' : 'text-primary'}`}>
                      <Clock size={14} />
                      <span>{folder.validity}</span>
                    </div>
                  </div>
                  <div className="bg-primary/5 p-3 rounded-2xl text-primary">
                    <BookOpen size={24} />
                  </div>
                </div>
                <button className="w-full py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-[0.98]">
                  Bekijk Folder
                  <Zap size={16} fill="white" />
                </button>
              </div>
            </motion.div>
          ))}
          
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-surface-container rounded-3xl p-10 bg-surface-container/20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
              <Zap size={32} />
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-lg text-on-surface">Meer folders onderweg</p>
              <p className="text-sm text-on-surface-variant mt-1">Houd deze pagina in de gaten.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
