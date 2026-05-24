import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { getMenu } from "../lib/menuService";
import { Check, Info } from "lucide-react";

export default function CrossSellingManager() {
  const [featuredProducts, setFeaturedProducts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const allProducts = Array.from(new Set(getMenu().map(p => p.name.it)));

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const d = await getDoc(doc(db, "settings", "crossSelling"));
        if (d.exists() && d.data().featured) {
          setFeaturedProducts(d.data().featured);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "settings/crossSelling");
      }
    };
    fetchSettings();
  }, []);

  const toggleFeatured = (prod: string) => {
    setFeaturedProducts(prev => 
      prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "crossSelling"), { featured: featuredProducts });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/crossSelling");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-brand-gold/20">
      <h2 className="font-logo text-5xl mb-8 text-brand-black">Gestione Cross-Selling</h2>
      <div className="mb-8 p-6 bg-brand-black text-brand-gold rounded-[2.5rem] shadow-2xl border border-brand-gold/30 flex gap-6">
        <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center shrink-0">
          <Info className="text-brand-gold" size={32} />
        </div>
        <div>
          <h3 className="font-logo text-2xl mb-2 text-brand-gold uppercase tracking-tight">Sistema Intelligente Attivo</h3>
          <p className="text-sm opacity-80 leading-relaxed">
            Il sistema suggerisce ora autonomamente i prodotti migliori in base al carrello del cliente:
          </p>
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            <li className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-gold"><Check size={12}/> Bevande se mancanti</li>
            <li className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-gold"><Check size={12}/> Sfiziosità con i Panini</li>
            <li className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-gold"><Check size={12}/> Caffetteria dopo il pasto</li>
            <li className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-gold"><Check size={12}/> Taglieri con i Drink</li>
          </ul>
          <p className="mt-4 text-[9px] font-bold italic opacity-40 uppercase tracking-widest">
            * Puoi selezionare prodotti manuali qui sotto come fallback o priorità.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <label className="text-[10px] uppercase font-black tracking-widest opacity-40 px-4">Prodotti Manuali (Fallback / Priority)</label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8 h-[400px] overflow-y-auto p-4 border border-brand-black/10 rounded-3xl">
        {allProducts.map(prod => (
          <button
            key={prod}
            onClick={() => toggleFeatured(prod)}
            className={`p-4 rounded-2xl text-xs font-bold transition-all border text-left ${featuredProducts.includes(prod) ? "bg-brand-black text-brand-gold border-brand-black shadow-lg" : "bg-white text-brand-black border-brand-black/10 hover:border-brand-black"}`}
          >
            {prod}
          </button>
        ))}
      </div>

      <button 
        onClick={handleSave}
        disabled={isSaving}
        className="px-8 py-4 bg-brand-black text-brand-gold rounded-full font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 max-w-sm"
      >
        <Check size={16} /> {isSaving ? "Salvataggio..." : "Salva Prodotti in Evidenza"}
      </button>
    </div>
  );
}
