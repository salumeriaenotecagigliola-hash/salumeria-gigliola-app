import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Extra } from "../types";
import { Plus, Trash, Edit2, Check, X } from "lucide-react";
import { getMenu } from "../lib/menuService";

export default function CustomizationManager() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [category, setCategory] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  
  const allCategories = Array.from(new Set(getMenu().map(p => p.category.it)));
  const allProducts = Array.from(new Set(getMenu().map(p => p.name.it)));

  const INGREDIENT_CATEGORIES = ["Salume", "Formaggio", "Verdura", "Salsa", "Altro"];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "extras"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Extra));
      setExtras(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "extras");
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setName("");
    setPrice("0");
    setCategory("");
    setTargets([]);
    setEditingId(null);
  };

  const handleEdit = (extra: Extra) => {
    setEditingId(extra.id);
    setName(extra.name);
    setPrice(extra.price.toString());
    setCategory(extra.category || "");
    setTargets(extra.targets || []);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    const extraData = {
      name: name.trim(),
      category: category,
      price: parseFloat(price) || 0,
      targets
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "extras", editingId), extraData);
      } else {
        await addDoc(collection(db, "extras"), extraData);
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, "extras");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "extras", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "extras");
    }
  };

  const toggleTarget = (t: string) => {
    setTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-brand-gold/20">
      <h2 className="font-logo text-5xl mb-8 text-brand-black">Gestione Ingredienti Extra</h2>
      
      <div className="bg-brand-paper p-8 rounded-3xl mb-12 border border-brand-black/5">
        <h3 className="font-bold text-xl mb-6 text-brand-black uppercase tracking-wide">
          {editingId ? "Modifica Extra" : "Nuovo Ingrediente Extra"}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-2">Nome Ingrediente</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white p-4 rounded-2xl border border-brand-black/10 focus:border-brand-gold outline-none font-bold text-brand-black"
              placeholder="es. Bufala, Tartufo..."
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-2">Categoria Ingrediente</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-white p-4 rounded-2xl border border-brand-black/10 focus:border-brand-gold outline-none font-bold text-brand-black appearance-none"
            >
              <option value="">Seleziona categoria...</option>
              {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-2">Prezzo Aggiuntivo (€)</label>
            <input 
              type="number" 
              step="0.10"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full bg-white p-4 rounded-2xl border border-brand-black/10 focus:border-brand-gold outline-none font-bold text-brand-black"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-3">Applica a Categorie/Prodotti</label>
          <div className="h-48 overflow-y-auto bg-white p-4 rounded-2xl border border-brand-black/10 flex flex-col gap-2">
            <div className="font-bold text-xs uppercase text-brand-gold mb-1">Categorie</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {allCategories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => toggleTarget(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${targets.includes(cat) ? 'bg-brand-black text-brand-gold border-brand-black' : 'bg-transparent text-brand-black/60 border-brand-black/20 hover:border-brand-black'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="font-bold text-xs uppercase text-brand-gold mb-1">Prodotti</div>
            <div className="flex flex-wrap gap-2">
              {allProducts.map(prod => (
                <button 
                  key={prod}
                  onClick={() => toggleTarget(prod)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${targets.includes(prod) ? 'bg-brand-gold text-brand-black border-brand-gold' : 'bg-transparent text-brand-black/60 border-brand-black/20 hover:border-brand-black'}`}
                >
                  {prod}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 bg-brand-black text-brand-gold py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {editingId ? <Check size={16} /> : <Plus size={16} />}
            {editingId ? "Salva Modifiche" : "Aggiungi Extra"}
          </button>
          {editingId && (
            <button 
              onClick={resetForm}
              className="px-6 border border-brand-black/20 text-brand-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-brand-black/5 transition-all"
            >
              <X size={16} /> Annulla
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {extras.map(e => (
          <div key={e.id} className="bg-white border border-brand-black/10 p-6 rounded-3xl shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-xl text-brand-black">{e.name}</h4>
                  {e.category && (
                    <span className="bg-brand-gold/20 text-brand-black/60 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">
                      {e.category}
                    </span>
                  )}
                </div>
                <div className="text-brand-gold-dark font-mono font-bold">+ € {e.price.toFixed(2)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(e)} className="p-2 text-brand-black/40 hover:text-brand-gold transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(e.id)} className="p-2 text-brand-black/40 hover:text-red-500 transition-colors">
                  <Trash size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-auto">
              {e.targets.slice(0, 3).map(t => (
                <span key={t} className="bg-brand-black/5 px-2 py-1 rounded text-[10px] font-bold text-brand-black/60 truncate max-w-full">
                  {t}
                </span>
              ))}
              {e.targets.length > 3 && (
                <span className="bg-brand-black/5 px-2 py-1 rounded text-[10px] font-bold text-brand-black/60">
                  +{e.targets.length - 3}
                </span>
              )}
            </div>
          </div>
        ))}
        {extras.length === 0 && (
          <div className="col-span-full py-12 text-center text-brand-black/40 font-bold uppercase tracking-widest text-xs">
            Nessun extra configurato
          </div>
        )}
      </div>
    </div>
  );
}
