import { Rocket, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function FoldersView() {
  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h2 className="font-headline font-extrabold text-primary text-4xl tracking-tight leading-tight">
          Folders
        </h2>
        <p className="font-body text-secondary text-lg">
          Ontdek de nieuwste aanbiedingen van uw favoriete winkels.
        </p>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl p-10 md:p-14 border border-surface-container shadow-sm text-center space-y-6 relative overflow-hidden"
      >
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Rocket size={48} strokeWidth={2} />
          </div>
          <Sparkles
            size={20}
            className="absolute -top-1 -right-1 text-primary"
            strokeWidth={2.5}
          />
        </div>

        <div className="space-y-3 max-w-md mx-auto">
          <h3 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">
            Binnenkort beschikbaar
          </h3>
          <p className="text-on-surface-variant font-medium leading-relaxed">
            Binnenkort kunnen lokale winkels hier hun folders en aanbiedingen
            delen. Houd deze pagina in de gaten!
          </p>
        </div>

        <div className="pt-2">
          <span className="inline-block px-4 py-2 bg-primary/10 rounded-full text-xs font-black text-primary uppercase tracking-widest">
            Wij werken eraan
          </span>
        </div>

        {/* 品牌色装饰水印 */}
        <div className="absolute -right-8 -bottom-8 opacity-[0.03] pointer-events-none">
          <Rocket size={200} />
        </div>
      </motion.div>
    </div>
  );
}
