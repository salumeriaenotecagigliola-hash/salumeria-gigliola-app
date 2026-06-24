import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { getMenu, getCategoryMacros } from "../lib/menuService";
import { Check, Info, ChevronDown, ChevronRight } from "lucide-react";

const getMacroCategory = (cat: string) => {
  const macrosMap = getCategoryMacros();
  if (macrosMap[cat]) {
    return macrosMap[cat];
  }

  const c = cat.toLowerCase();
  if (
    c.includes("aperitivo") ||
    c.includes("bruschette") ||
    c.includes("friselline") ||
    c.includes("sfiziosit")
  ) {
    return "Food & Sfizi";
  }
  if (
    c.includes("taglieri") ||
    c.includes("piatti") ||
    c.includes("panini") ||
    c.includes("puglia bowl") ||
    c.includes("ciotole") ||
    c.includes("pinsa") ||
    c.includes("pinse") ||
    c.includes("padellino") ||
    c.includes("fritt") ||
    c.includes("focacci")
  ) {
    return "Piatti & Specialità";
  }
  if (
    c.includes("calici") ||
    c.includes("vini") ||
    c.includes("vino") ||
    c.includes("bollicine") ||
    c.includes("champagne") ||
    c.includes("prosecchi") ||
    c.includes("cantina")
  ) {
    return "Cantina";
  }
  if (
    c.includes("cocktail") ||
    c.includes("drink") ||
    c.includes("birr") ||
    c.includes("analcolic") ||
    c.includes("caffetteria") ||
    c.includes("digestivi")
  ) {
    return "Bar & Cafè";
  }
  return "Extra / Altro";
};

export default function CategoryManager() {
  const [categoryConfig, setCategoryConfig] = useState<
    Record<string, { isTop: boolean; isDropdown: boolean }>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedMacros, setExpandedMacros] = useState<Record<string, boolean>>(
    {
      "Food & Sfizi": true,
      "Piatti & Specialità": true,
      Cantina: true,
      "Bar & Cafè": true,
      "Extra / Altro": true,
    },
  );

  const allCategories = Array.from(
    new Set(getMenu().map((p) => p.category.it)),
  );

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const d = await getDoc(doc(db, "settings", "categories"));
        if (d.exists() && d.data().config) {
          setCategoryConfig(d.data().config);
        } else {
          // Initialize defaults (all top)
          const defaults: Record<
            string,
            { isTop: boolean; isDropdown: boolean }
          > = {};
          allCategories.forEach((cat) => {
            defaults[cat] = { isTop: true, isDropdown: false };
          });
          setCategoryConfig(defaults);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "settings/categories");
      }
    };
    fetchSettings();
  }, []);

  const toggleConfig = (cat: string, field: "isTop" | "isDropdown") => {
    setCategoryConfig((prev) => {
      const current = prev[cat] || { isTop: false, isDropdown: false };
      return {
        ...prev,
        [cat]: {
          ...current,
          [field]: !current[field],
        },
      };
    });
  };

  const toggleMacro = (macro: string) => {
    setExpandedMacros((prev) => ({
      ...prev,
      [macro]: !prev[macro],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "categories"), {
        config: categoryConfig,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/categories");
    } finally {
      setIsSaving(false);
    }
  };

  // Group categories
  const groupedCategories: Record<string, string[]> = {
    "Food & Sfizi": [],
    "Piatti & Specialità": [],
    Cantina: [],
    "Bar & Cafè": [],
    "Extra / Altro": [],
  };

  allCategories.forEach((cat) => {
    const macro = getMacroCategory(cat);
    if (groupedCategories[macro]) {
      groupedCategories[macro].push(cat);
    } else {
      groupedCategories["Extra / Altro"].push(cat);
    }
  });

  return (
    <div className="bg-white p-6 md:p-12 rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl border border-brand-gold/20">
      <h2 className="font-logo text-3xl sm:text-5xl mb-8 text-brand-black">
        Gestione Categorie
      </h2>
      <div className="mb-8 p-4 bg-brand-gold/10 rounded-2xl border border-brand-gold/30 flex gap-4">
        <Info className="shrink-0 text-brand-gold-dark mt-1" />
        <p className="text-sm">
          Scegli quali categorie mostrare come bottoni estesi in cima alla
          pagina e quali raggruppare nel menù a tendina "Altre categorie".
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-12">
        {Object.entries(groupedCategories).map(([macro, cats]) => {
          if (cats.length === 0) return null;

          return (
            <div
              key={macro}
              className="border border-brand-black/10 rounded-3xl overflow-hidden bg-brand-paper shadow-sm"
            >
              <button
                onClick={() => toggleMacro(macro)}
                className="w-full bg-white p-6 flex flex-row items-center justify-between hover:bg-brand-gold/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-xl text-brand-black tracking-wide">
                    {macro}
                  </h3>
                  <span className="bg-brand-black/5 text-brand-black/60 px-3 py-1 rounded-full text-xs font-bold">
                    {cats.length} voci
                  </span>
                </div>
                {expandedMacros[macro] ? (
                  <ChevronDown className="text-brand-black/40" />
                ) : (
                  <ChevronRight className="text-brand-black/40" />
                )}
              </button>

              {expandedMacros[macro] && (
                <div className="p-4 flex flex-col gap-3 border-t border-brand-black/5">
                  {cats.map((cat) => {
                    const config = categoryConfig[cat] || {
                      isTop: false,
                      isDropdown: false,
                    };
                    return (
                      <div
                        key={cat}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-4 rounded-2xl border border-brand-black/10 gap-4 shadow-sm"
                      >
                        <span className="font-bold text-base text-brand-black ml-2">
                          {cat}
                        </span>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                          <label className="flex items-center gap-2 cursor-pointer bg-brand-paper p-3 rounded-xl border border-brand-black/10 flex-1 md:flex-none hover:border-brand-gold transition-colors">
                            <input
                              type="checkbox"
                              checked={config.isTop}
                              onChange={() => toggleConfig(cat, "isTop")}
                              className="w-5 h-5 accent-brand-black"
                            />
                            <span className="text-xs font-black uppercase tracking-wide">
                              Mostra esteso
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-brand-paper p-3 rounded-xl border border-brand-black/10 flex-1 md:flex-none hover:border-brand-gold transition-colors">
                            <input
                              type="checkbox"
                              checked={config.isDropdown}
                              onChange={() => toggleConfig(cat, "isDropdown")}
                              className="w-5 h-5 accent-brand-black"
                            />
                            <span className="text-xs font-black uppercase tracking-wide">
                              Menù a tendina
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-8 py-4 bg-brand-black text-brand-gold rounded-full font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 max-w-sm"
      >
        <Check size={16} />{" "}
        {isSaving ? "Salvataggio..." : "Salva Configurazione Categorie"}
      </button>
    </div>
  );
}
