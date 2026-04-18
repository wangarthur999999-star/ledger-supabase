import { Search, ChevronDown, ChevronUp, X, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Fuse from "fuse.js";
import { Product } from "../types";
import { fetchProducts } from "../api/products";

export default function PricesView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Alle Producten");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      const data = await fetchProducts();
      setProducts(data);
      setIsLoading(false);
    };
    loadProducts();
  }, []);

  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: ["name"],
      threshold: 0.3,
      includeScore: true,
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply category filter
    if (activeCategory !== 'Alle Producten') {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(activeCategory.toLowerCase())
      );
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const fuseResults = fuse.search(searchQuery).map(result => result.item);
      filtered = filtered.filter(p => fuseResults.some(fr => fr.id === p.id));
    }
    
    return filtered;
  }, [searchQuery, fuse, products, activeCategory]);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Prijsvergelijker</h2>
        <p className="text-on-surface-variant font-medium">Vind de beste prijzen in Paramaribo</p>
      </section>

      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={20} className={`transition-colors ${searchQuery ? 'text-primary' : 'text-on-surface-variant'}`} />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoek producten (bijv. olie, rijst)..." 
          className="w-full bg-surface-container-low border-none rounded-2xl py-5 pl-12 pr-12 focus:ring-2 focus:ring-primary/20 transition-all text-lg font-medium outline-none shadow-sm"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-4 flex items-center text-on-surface-variant hover:text-primary transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {['Alle Producten', 'Rijst', 'Olie', 'Eieren', 'Kip'].map((cat) => (
          <button 
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              if (cat !== 'Alle Producten') {
                setSearchQuery('');
              }
            }}
            className={`px-6 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-primary">
            <Loader2 size={40} className="animate-spin" />
            <p className="font-bold">Producten laden...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <motion.div 
                  key={product.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-surface-container transition-all"
                >
                  <div 
                    onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                    className="p-5 flex items-center justify-between cursor-pointer active:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center p-2 overflow-hidden">
                        <img src={product.image} alt={product.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-lg text-on-surface">{product.name}</h3>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded uppercase tracking-wider">
                          Vanaf SRD {Number(product.lowestPrice).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    {expandedId === product.id ? <ChevronUp className="text-on-surface-variant" /> : <ChevronDown className="text-on-surface-variant" />}
                  </div>

                  <AnimatePresence>
                    {expandedId === product.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-surface-container-low/30"
                      >
                        <div className="p-5 pt-0">
                          <div className="bg-white rounded-2xl overflow-hidden border border-surface-container shadow-inner">
                            <div className="grid grid-cols-3 px-4 py-3 bg-surface-container-high text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                              <span>Supermarkt</span>
                              <span className="text-center">Voorraad</span>
                              <span className="text-right">Prijs</span>
                            </div>
                            <div className="divide-y divide-surface-container">
                              {product.prices.map((p, idx) => (
                                <div key={idx} className="grid grid-cols-3 px-4 py-4 items-center hover:bg-surface-container-low/50 transition-colors">
                                  <span className="font-bold text-sm">{p.supermarket}</span>
                                  <div className="flex justify-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${p.availability === 'OP VOORRAAD' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      {p.availability}
                                    </span>
                                  </div>
                                  <span className="text-right font-headline font-extrabold text-primary">
                                    {Number(p.price).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto text-on-surface-variant">
                  <Search size={32} />
                </div>
                <div>
                  <p className="font-headline font-bold text-xl text-on-surface">Geen producten gevonden</p>
                  <p className="text-on-surface-variant text-sm">Probeer een andere zoekterm.</p>
                </div>
                <button 
                  onClick={() => setSearchQuery("")}
                  className="text-primary font-bold text-sm underline underline-offset-4"
                >
                  Wis filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      
      <section className="bg-primary/5 rounded-3xl p-8 relative overflow-hidden flex items-center group mt-10">
        <div className="relative z-10 max-w-[65%] space-y-2">
          <h4 className="font-headline text-2xl font-extrabold text-primary leading-tight">Bespaar tot 15% op uw boodschappen</h4>
          <p className="text-primary/70 text-sm font-medium">Vergelijk prijzen dagelijks voor de meest actuele updates.</p>
        </div>
        <div className="absolute right-3 top-0 bottom-0 w-1/3 opacity-30">
          <img src="https://picsum.photos/seed/food/400/400" className="w-full h-full object-cover rounded-l-3xl" referrerPolicy="no-referrer" />
        </div>
      </section>
    </div>
  );
}
