import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { getMenu, addMenuItem, updateMenuItem, deleteMenuItem, undoLastAction, canUndo, saveMenu, getCategoryMacros, setCategoryMacro } from "../lib/menuService";
import { Plus, Edit2, Trash2, Check, X, FileText, Tag, Euro, AlignLeft, Undo2, ChevronUp, ChevronDown, Download } from "lucide-react";
import { motion } from "motion/react";
import { allergenIcons } from "../lib/allergenIcons";
import html2pdf from "html2pdf.js";

const getMacroCategory = (cat: string) => {
  const macrosMap = getCategoryMacros();
  if (macrosMap[cat]) {
    return macrosMap[cat];
  }

  const c = cat.toLowerCase();
  if (c.includes("aperitivo") || c.includes("bruschette") || c.includes("friselline") || c.includes("sfiziosit")) {
    return "Food & Sfizi";
  }
  if (c.includes("taglieri") || c.includes("piatti") || c.includes("panini") || c.includes("puglia bowl") || c.includes("ciotole")) {
    return "Piatti & Specialità";
  }
  if (c.includes("calici") || c.includes("vini") || c.includes("vino") || c.includes("bollicine") || c.includes("champagne") || c.includes("prosecchi") || c.includes("cantina")) {
    return "Cantina";
  }
  if (c.includes("cocktail") || c.includes("drink") || c.includes("birr") || c.includes("analcolic") || c.includes("caff") || c.includes("digestivi") || c.includes("bevande") || c.includes("acqu") || c.includes("amar") || c.includes("liquor") || c.includes("grapp") || c.includes("soft")) {
    return "Bar & Cafè";
  }
  return "Extra / Altro";
};

export default function MenuManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showNewCategoryInput, setShowNewInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    price: 0,
    available: true,
    isVisible: true,
    allergens: [] as string[],
    baseIngredients: [] as { name: string; category: string }[],
  });

  const categories: string[] = Array.from(new Set(products.map(p => p.category.it)));

  const ALLERGEN_LIST = [
    "Glutine", "Crostacei", "Uova", "Pesce", "Arachidi", "Soia", 
    "Latte", "Lattosio", "Frutta a guscio", "Sedano", "Senape", "Sesamo", 
    "Anidride solforosa", "Solfiti", "Lupini", "Molluschi"
  ];

  const INGREDIENT_CATEGORIES = ["Salume", "Formaggio", "Verdura", "Salsa", "Altro"];

  useEffect(() => {
    setProducts(getMenu());
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "price" ? parseFloat(value) || 0 : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name.startsWith("allergen_")) {
      const allergen = name.replace("allergen_", "");
      setFormData(prev => ({
        ...prev,
        allergens: checked 
          ? [...prev.allergens, allergen]
          : prev.allergens.filter(a => a !== allergen)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      price: 0,
      available: true,
      isVisible: true,
      allergens: [],
      baseIngredients: [],
    });
    setIsAdding(false);
    setEditingId(null);
    setShowNewInput(false);
    setNewCategoryName("");
  };

  const startEdit = (product: Product) => {
    setFormData({
      name: product.name.it,
      category: product.category.it,
      description: product.description.it || "",
      price: product.price,
      available: product.available,
      isVisible: product.isVisible !== false, // Default to true if undefined
      allergens: product.allergens || [],
      baseIngredients: product.baseIngredients || [],
    });
    setEditingId(product.id || null);
    setIsAdding(false);
    setShowNewInput(false);
    
    setTimeout(() => {
      document.getElementById("menu-form")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleDelete = (id: string) => {
    deleteMenuItem(id);
    setProducts(getMenu());
  };

  const handleMoveProduct = (catIt: string, prodId: string, direction: -1 | 1) => {
      const grouped = new Map<string, Product[]>();
      categories.forEach(c => grouped.set(c, []));
      products.forEach(p => {
          if (!grouped.has(p.category.it)) {
              grouped.set(p.category.it, []);
          }
          grouped.get(p.category.it)!.push(p);
      });

      const catProds = grouped.get(catIt);
      if (!catProds) return;
      
      const idx = catProds.findIndex(p => p.id === prodId);
      if (idx === -1) return;
      if (direction === -1 && idx === 0) return;
      if (direction === 1 && idx === catProds.length - 1) return;

      const temp = catProds[idx];
      catProds[idx] = catProds[idx + direction];
      catProds[idx + direction] = temp;

      const newProducts: Product[] = [];
      categories.forEach(c => {
          newProducts.push(...(grouped.get(c) || []));
      });
      saveMenu(newProducts);
      setProducts(newProducts);
  };

  const handleMoveCategory = (index: number, direction: -1 | 1) => {
      if (direction === -1 && index === 0) return;
      if (direction === 1 && index === categories.length - 1) return;

      const newCategories = [...categories];
      const temp = newCategories[index];
      newCategories[index] = newCategories[index + direction];
      newCategories[index + direction] = temp;

      const grouped = new Map<string, Product[]>();
      newCategories.forEach(c => grouped.set(c, []));
      products.forEach(p => {
          if (grouped.has(p.category.it)) {
              grouped.get(p.category.it)!.push(p);
          } else {
             grouped.set(p.category.it, [p]);
             newCategories.push(p.category.it);
          }
      });

      const newProducts: Product[] = [];
      newCategories.forEach(c => {
          newProducts.push(...(grouped.get(c) || []));
      });
      saveMenu(newProducts);
      setProducts(newProducts);
  };

  const handleUndo = () => {
    if (undoLastAction()) {
      setProducts(getMenu());
    }
  };

  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const downloadMenuPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById("pdf-menu-container");
      if (!element) return;
      
      const opt = {
        margin:       [15, 0, 15, 0], // top, left, bottom, right
        filename:     'Menu_Gigliola.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'], avoid: '.avoid-break' }
      };

      await html2pdf().from(element).set(opt).save();
    } catch (e) {
      console.error(e);
      alert("Errore durante la generazione del PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const translateText = async (text: string, targetLang: string) => {
    if (!text) return "";
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=it&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      return data[0].map((item: any) => item[0]).join('');
    } catch (e) {
      console.error("Translation error", e);
      return text;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = showNewCategoryInput ? newCategoryName : formData.category;
    
    if (!formData.name || !finalCategory) {
      return;
    }

    setIsTranslating(true);
    
    // Auto-translation
    let nameEn = formData.name, nameDe = formData.name, nameFr = formData.name;
    let descEn = formData.description, descDe = formData.description, descFr = formData.description;
    let catEn = finalCategory, catDe = finalCategory, catFr = finalCategory;

    try {
      // Name
      if (formData.name) {
        [nameEn, nameDe, nameFr] = await Promise.all([
          translateText(formData.name, 'en'), translateText(formData.name, 'de'), translateText(formData.name, 'fr')
        ]);
      }
      // Description
      if (formData.description) {
        [descEn, descDe, descFr] = await Promise.all([
           translateText(formData.description, 'en'), translateText(formData.description, 'de'), translateText(formData.description, 'fr')
        ]);
      }
      // Category
      if (finalCategory) {
        [catEn, catDe, catFr] = await Promise.all([
           translateText(finalCategory, 'en'), translateText(finalCategory, 'de'), translateText(finalCategory, 'fr')
        ]);
      }
    } catch(err) {
      console.error("Translation failed, falling back to original", err);
    }

    const payload: Omit<Product, "id"> = {
      name: { it: formData.name, en: nameEn, de: nameDe, fr: nameFr },
      category: { it: finalCategory, en: catEn, de: catDe, fr: catFr },
      description: { it: formData.description, en: descEn, de: descDe, fr: descFr },
      price: formData.price,
      available: formData.available,
      isVisible: formData.isVisible,
      allergens: formData.allergens,
      baseIngredients: formData.baseIngredients,
    };

    if (editingId) {
      updateMenuItem(editingId, payload);
    } else {
      addMenuItem(payload);
    }

    setProducts(getMenu());
    setIsTranslating(false);
    resetForm();
  };

  return (
    <div className="bg-white p-6 md:p-12 rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl border border-brand-gold/20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-logo text-3xl sm:text-5xl text-brand-black">Gestione Menu</h2>
          <p className="text-sm opacity-60 mt-2">Aggiungi, modifica o rimuovi i prodotti dal menu.</p>
        </div>
        {!isAdding && !editingId && (
          <div className="flex gap-2 items-center flex-wrap">
            {canUndo() && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-2 bg-brand-paper border border-brand-black/10 text-brand-black px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-black/5 active:scale-95 transition-all shadow-sm"
              >
                <Undo2 size={16} /> Annulla
              </button>
            )}
            <button
              onClick={downloadMenuPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 bg-white border border-brand-black/10 text-brand-black px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-paper active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              <Download size={16} /> {isGeneratingPDF ? "Generazione..." : "Scarica PDF"}
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-brand-black text-brand-gold px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              <Plus size={16} /> Nuovo Prodotto
            </button>
          </div>
        )}
      </div>

      {(isAdding || editingId) && (
        <form id="menu-form" onSubmit={handleSubmit} className="bg-brand-paper p-8 rounded-3xl border border-brand-black/10 mb-12 shadow-sm">
          <div className="flex justify-between items-center border-b border-brand-black/10 pb-4 mb-6">
            <h3 className="font-bold text-xl text-brand-black">
              {editingId ? "Modifica Prodotto" : "Nuovo Prodotto"}
            </h3>
            <button type="button" onClick={resetForm} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                <FileText size={12} /> Nome Prodotto
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full bg-white p-4 rounded-xl border border-brand-black/10 focus:border-brand-black focus:outline-none transition-all font-bold"
                placeholder="es. Puglia Bowl"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                <Tag size={12} /> Categoria
              </label>
              <div className="flex flex-col gap-2">
                <select
                  name="category"
                  value={showNewCategoryInput ? "NEW" : formData.category}
                  onChange={(e) => {
                    if (e.target.value === "NEW") {
                      setShowNewInput(true);
                      setFormData(prev => ({ ...prev, category: "" }));
                    } else {
                      setShowNewInput(false);
                      setFormData(prev => ({ ...prev, category: e.target.value }));
                    }
                  }}
                  required
                  className="w-full bg-white p-4 rounded-xl border border-brand-black/10 focus:border-brand-black focus:outline-none transition-all font-bold appearance-none cursor-pointer"
                >
                  <option value="" disabled>Seleziona una categoria...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="NEW" className="text-brand-gold font-black">+ NUOVA CATEGORIA...</option>
                </select>
                
                {showNewCategoryInput && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                  >
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      required
                      className="w-full bg-white p-4 pr-12 rounded-xl border-2 border-brand-gold focus:outline-none transition-all font-bold"
                      placeholder="Scrivi il nome della nuova categoria..."
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewInput(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-black/40 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                <AlignLeft size={12} /> Descrizione
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-white p-4 rounded-xl border border-brand-black/10 focus:border-brand-black focus:outline-none transition-all resize-none"
                placeholder="Ingredienti o descrizione del piatto..."
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                <Euro size={12} /> Prezzo (€)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.10"
                min="0"
                required
                className="w-full bg-white p-4 rounded-xl border border-brand-black/10 focus:border-brand-black focus:outline-none transition-all font-mono font-bold text-brand-gold-dark"
              />
            </div>
            <div className="flex flex-col gap-4 mt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="available"
                  checked={formData.available}
                  onChange={handleCheckboxChange}
                  className="w-6 h-6 accent-brand-black"
                />
                <span className="font-bold text-sm tracking-wide">Ordinabile (Disponibile in stock)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isVisible"
                  checked={formData.isVisible}
                  onChange={handleCheckboxChange}
                  className="w-6 h-6 accent-brand-gold"
                />
                <span className="font-bold text-sm tracking-wide">Visibile nel Menu</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">
                Allergeni
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ALLERGEN_LIST.map(allergen => (
                   <label key={allergen} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.allergens.includes(allergen) ? 'bg-brand-gold/10 border-brand-gold text-brand-black' : 'bg-white border-brand-black/10 text-brand-black/40 hover:border-brand-black/20'}`}>
                      <input 
                        type="checkbox"
                        name={`allergen_${allergen}`}
                        checked={formData.allergens.includes(allergen)}
                        onChange={handleCheckboxChange}
                        className="hidden"
                      />
                      <div className="w-8 h-8 flex items-center justify-center bg-brand-gold/10 rounded-full text-lg">
                        {allergenIcons[allergen] || "⚠️"}
                      </div>
                      <span className="text-xs font-bold">{allergen}</span>
                   </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 mt-6">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">
                Ingredienti Base (per Sostituzioni Gratuite)
              </label>
              <div className="flex flex-col gap-3">
                {formData.baseIngredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white p-3 rounded-xl border border-brand-black/5">
                    <input 
                      type="text" 
                      placeholder="Nome Ingrediente"
                      value={ing.name}
                      onChange={(e) => {
                        const newIngs = [...formData.baseIngredients];
                        newIngs[idx].name = e.target.value;
                        setFormData(prev => ({ ...prev, baseIngredients: newIngs }));
                      }}
                      className="flex-1 bg-brand-paper p-2 rounded-lg border border-brand-black/5 text-sm font-bold"
                    />
                    <select
                      value={ing.category}
                      onChange={(e) => {
                        const newIngs = [...formData.baseIngredients];
                        newIngs[idx].category = e.target.value;
                        setFormData(prev => ({ ...prev, baseIngredients: newIngs }));
                      }}
                      className="bg-brand-paper p-2 rounded-lg border border-brand-black/5 text-xs font-black uppercase outline-none focus:border-brand-gold"
                    >
                      <option value="">Seleziona Categoria</option>
                      {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => {
                        setFormData(prev => ({ ...prev, baseIngredients: prev.baseIngredients.filter((_, i) => i !== idx) }));
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, baseIngredients: [...prev.baseIngredients, { name: "", category: "" }] }));
                  }}
                  className="w-full py-3 border-2 border-dashed border-brand-black/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-black/40 hover:border-brand-black/30 hover:text-brand-black/60 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Aggiungi Ingrediente Base
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-brand-black/10">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 font-black uppercase tracking-widest text-xs opacity-50 hover:opacity-100 transition-all rounded-full"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isTranslating}
              className="px-8 py-3 bg-brand-gold text-brand-black rounded-full font-black uppercase tracking-widest text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 border border-brand-black/10 disabled:opacity-50"
            >
              <Check size={16} /> {isTranslating ? "Salvataggio..." : "Salva Prodotto"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-3xl border border-brand-black/10 shadow-sm relative z-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-black text-brand-gold text-[10px] uppercase tracking-widest">
              <th className="p-4 font-black">Prodotto</th>
              <th className="p-4 font-black">Categoria</th>
              <th className="p-4 font-black">Prezzo</th>
              <th className="p-4 font-black text-center">Stato</th>
              <th className="p-4 font-black text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-black/5 bg-white">
            {(() => {
              const macros = ["Food & Sfizi", "Piatti & Specialità", "Cantina", "Bar & Cafè", "Extra / Altro"];
              return macros.map(macro => {
                const macroCats = categories.filter(c => getMacroCategory(c) === macro);
                if (macroCats.length === 0) return null;
                
                return (
                  <React.Fragment key={macro}>
                    <tr className="bg-brand-black text-brand-gold">
                      <td colSpan={5} className="p-4 font-black tracking-widest uppercase text-sm">
                        {macro}
                      </td>
                    </tr>
                    {macroCats.map(cat => {
                      const catIdx = categories.indexOf(cat);
                      const catProducts = products.filter(p => p.category.it === cat);
                      if (catProducts.length === 0) return null;
                      
                      return (
                        <React.Fragment key={cat}>
                          <tr className="bg-brand-paper border-y border-brand-black/10">
                            <td colSpan={2} className="p-4 font-black text-brand-black tracking-widest uppercase">
                              <div className="flex items-center gap-4">
                                {cat}
                                <select 
                                   value={macro} 
                                   onChange={(e) => { 
                                     setCategoryMacro(cat, e.target.value); 
                                     window.location.reload(); 
                                   }}
                                   className="text-[9px] bg-white border border-brand-black/10 rounded px-2 py-1 font-bold lowercase tracking-wider text-brand-black/60 outline-none cursor-pointer hover:bg-brand-gold/10"
                                >
                                  {macros.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </div>
                            </td>
                            <td colSpan={3} className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <span className="text-[10px] font-black uppercase text-brand-black/40 mr-2 hidden sm:inline">Ordine Sezione:</span>
                                 <button onClick={() => handleMoveCategory(catIdx, -1)} disabled={catIdx === 0} className="p-1 rounded bg-white border border-brand-black/10 disabled:opacity-30 hover:bg-brand-gold transition-colors">
                                   <ChevronUp size={16} />
                                 </button>
                                 <button onClick={() => handleMoveCategory(catIdx, 1)} disabled={catIdx === categories.length - 1} className="p-1 rounded bg-white border border-brand-black/10 disabled:opacity-30 hover:bg-brand-gold transition-colors">
                                   <ChevronDown size={16} />
                                 </button>
                              </div>
                            </td>
                          </tr>
                          {catProducts.map((product, pIdx) => (
                            <tr key={product.id} className="hover:bg-brand-black/5 transition-colors group">
                              <td className="p-4 pl-4 sm:pl-8">
                                <div className="flex items-center gap-2 mb-1">
                                  <button onClick={() => handleMoveProduct(cat, product.id!, -1)} disabled={pIdx === 0} className="shrink-0 p-0.5 rounded text-brand-black/40 hover:text-brand-black hover:bg-brand-black/5 disabled:opacity-30 transition-colors">
                                    <ChevronUp size={14} />
                                  </button>
                                  <button onClick={() => handleMoveProduct(cat, product.id!, 1)} disabled={pIdx === catProducts.length - 1} className="shrink-0 p-0.5 rounded text-brand-black/40 hover:text-brand-black hover:bg-brand-black/5 disabled:opacity-30 transition-colors">
                                    <ChevronDown size={14} />
                                  </button>
                                  <div className="font-bold text-brand-black">{product.name.it}</div>
                                </div>
                                <div className="text-xs opacity-60 line-clamp-1 max-w-[300px] ml-10">{product.description.it}</div>
                              </td>
                              <td className="p-4">
                                <span className="bg-brand-paper px-3 py-1 rounded-full text-[10px] font-bold border border-brand-black/5 text-brand-black/50 hidden sm:inline-block">
                                  {product.category.it}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-bold text-brand-gold-dark text-sm sm:text-base">
                                € {product.price.toFixed(2)}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${product.isVisible !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 hidden sm:inline">
                                      {product.isVisible !== false ? 'Visibile' : 'Nascosto'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${product.available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 hidden sm:inline">
                                      {product.available ? 'Disp.' : 'Esaur.'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2 transition-opacity">
                                  <button
                                    onClick={() => startEdit(product)}
                                    className="p-2 sm:p-3 bg-brand-paper rounded-xl text-brand-black hover:bg-brand-gold hover:text-brand-black transition-colors border border-brand-black/10 flex items-center gap-1 sm:gap-2 font-black uppercase text-[10px] tracking-widest shadow-sm"
                                    title="Modifica"
                                  >
                                    <Edit2 size={12} /> <span className="hidden lg:inline">Modifica</span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(product.id as string)}
                                    className="p-2 sm:p-3 bg-brand-paper rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-brand-black/10 flex items-center justify-center shadow-sm"
                                    title="Elimina"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              });
            })()}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center opacity-50 font-bold">
                  Nessun prodotto trovato nel menu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hidden PDF Generation Container */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -100 }}>
        <div id="pdf-menu-container" className="w-[800px] p-12 font-sans" style={{ backgroundColor: '#FDFCF9', color: '#1A1A1A' }}>
          <div className="flex justify-center mb-12 border-b pb-8" style={{ borderColor: 'rgba(26, 26, 26, 0.1)' }}>
            <img src="/unnamed.png" alt="Logo" className="h-32 object-contain" crossOrigin="anonymous" />
          </div>
          
          <div className="space-y-12">
            {(() => {
              const macros = ["Food & Sfizi", "Piatti & Specialità", "Cantina", "Bar & Cafè", "Extra / Altro"];
              return macros.map(macro => {
                const macroCats = categories.filter(c => getMacroCategory(c) === macro);
                if (macroCats.length === 0) return null;
                
                return (
                  <div key={macro} className="mb-10">
                    <h1 className="font-logo text-3xl text-center mb-8 pb-4 border-b-2 uppercase tracking-[0.3em] font-bold" style={{ borderColor: 'rgba(26, 26, 26, 0.2)' }}>{macro}</h1>
                    {macroCats.map(cat => {
                      const catProducts = products.filter(p => p.category.it === cat && p.isVisible !== false);
                      if (catProducts.length === 0) return null;
                      
                      const catEn = catProducts[0]?.category?.en;
                      
                      return (
                        <div key={cat} className="mb-8 avoid-break block">
                          <h2 className="font-bold uppercase tracking-widest text-lg mb-6 leading-tight avoid-break block" style={{ color: 'rgba(26, 26, 26, 0.8)' }}>
                            {cat}
                            {catEn && catEn !== cat && (
                              <span className="text-base italic font-serif ml-2 normal-case" style={{ color: 'rgba(26, 26, 26, 0.6)' }}>/ {catEn}</span>
                            )}
                          </h2>
                          <div className="grid grid-cols-1 gap-6">
                            {catProducts.map(product => (
                              <div key={product.id} className="avoid-break block">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1">
                                    <h3 className="font-bold text-xl leading-tight font-elegant tracking-wide">
                                      {product.name.it}
                                      {product.name.en && product.name.en !== product.name.it && (
                                        <span className="text-lg ml-2 italic font-serif" style={{ color: 'rgba(26, 26, 26, 0.5)' }}>/ {product.name.en}</span>
                                      )}
                                    </h3>
                                    {(product.description.it || product.description.en) && (
                                      <p className="text-[15px] opacity-80 mt-1.5 leading-relaxed font-serif">
                                        {product.description.it}
                                        {product.description.en && product.description.en !== product.description.it && (
                                          <span className="block italic mt-0.5 opacity-70">{product.description.en}</span>
                                        )}
                                      </p>
                                    )}
                                    {product.allergens && product.allergens.length > 0 && (
                                      <p className="text-[11px] mt-2 uppercase tracking-widest" style={{ color: 'rgba(26, 26, 26, 0.5)' }}>
                                        <span className="font-black">Allergeni:</span> {product.allergens.join(", ")}
                                      </p>
                                    )}
                                  </div>
                                  <div className="font-serif font-bold text-xl whitespace-nowrap mt-1">
                                    € {product.price.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
          
          <div className="mt-16 pt-8 border-t text-center opacity-60 text-xs font-serif italic" style={{ borderColor: 'rgba(26, 26, 26, 0.1)' }}>
            Enoteca Gigliola - Via Milo, 72019 San Vito dei Normanni (BR)
          </div>
        </div>
      </div>
    </div>
  );
}
