import React, { useState, useEffect } from "react";
import unnamedLogo from "../unnamed.png";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  limit,
  orderBy
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Extra, Product, OrderItem, OrderStatus, Language } from "../types";
import {
  ShoppingCart,
  Plus,
  Minus,
  Send,
  ClipboardList,
  Info,
  X,
  Download,
  Settings,
  ChevronDown,
  Menu,
  Globe,
  ListChecks,
  CheckCircle2,
  ArrowRightLeft,
  ArrowLeft,
} from "lucide-react";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../lib/i18n";
import { allergenIcons } from "../lib/allergenIcons";

interface Props {
  lang: Language;
  setLang?: (lang: Language) => void;
  onOpenAdmin?: () => void;
  editMode?: boolean;
  initialCart?: OrderItem[];
  initialTable?: string;
  initialNotes?: string;
  initialCustomerName?: string;
  initialCustomerLastName?: string;
  initialCustomerPhone?: string;
  initialTakeawayTime?: string;
  orderId?: string;
  onEditComplete?: () => void;
  isManager?: boolean;
  minPrepTime?: number;
  onNavigateManager?: (view: string, tab: string) => void;
}

const ALCOHOLIC_OPTIONS = [
  "Spritz Aperol",
  "Spritz Campari",
  "Gin Tonic",
  "Gin Lemon",
  "Vino Bianco",
  "Vino Rosso",
  "Vino Rosato",
  "Birra Ichnusa",
  "Birra Peroni",
];
const NON_ALCOHOLIC_OPTIONS = [
  "Coca Cola",
  "Coca Cola Zero",
  "Fanta",
  "Sprite",
  "Succo di Frutta",
  "Acqua Tonica",
  "Crodino",
  "Sanbittèr",
  "Acqua Naturale",
  "Acqua Frizzante",
];

const inferIngredients = (description: string, extras: Extra[]): { name: string; category: string }[] => {
  if (!description) return [];
  let text = description;
  
  const markers = ["con ", "base di ", ":", "composto da "];
  for (const marker of markers) {
    if (text.toLowerCase().includes(marker)) {
      const parts = text.split(new RegExp(marker, "i"));
      text = parts[parts.length - 1];
      break;
    }
  }

  return text
    .split(/[,.;]|\s\be\s\b|\n/i)
    .map(s => s.trim().replace(/^e\s+/i, ""))
    .filter(s => s.length > 2 && s.length < 40 && !s.toLowerCase().includes("servito") && !s.toLowerCase().includes("accompagnato") && !s.toLowerCase().includes("scegli"))
    .map(name => {
      const match = extras.find(e => 
        name.toLowerCase().includes(e.name.toLowerCase()) || 
        e.name.toLowerCase().includes(name.toLowerCase())
      );
      return { 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        category: match ? match.category : "varie" 
      };
    });
};

import { getMenu, getCategoryMacros } from "../lib/menuService";

export const getMacroCategory = (cat: string) => {
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


/**
 * Hook Centralizzato per lo stato del Cliente.
 * Responsabilità: Gestire ordini, carrello, Firebase e UI state.
 */
export function useCustomerState(props: Props) {
  const { 
    lang, setLang, onOpenAdmin, editMode, initialCart, initialTable, initialNotes, 
    initialCustomerName, initialCustomerLastName, initialCustomerPhone, initialTakeawayTime,
    orderId, onEditComplete, isManager, minPrepTime, onNavigateManager 
  } = props;
  

  const products = React.useMemo(
    () =>
      getMenu()
        .filter((p) => p.isVisible !== false),
    [],
  );
  const categoriesOriginal = React.useMemo(
    () => {
      const cats: { it: string, local: string }[] = [];
      const seen = new Set<string>();
      products.forEach(p => {
        if (!seen.has(p.category.it)) {
          seen.add(p.category.it);
          cats.push({ it: p.category.it, local: p.category[lang] || p.category.it });
        }
      });
      
      const catsWithIndex = cats.map((cat, index) => ({ ...cat, index }));
      
      const macroOrder = ["Food & Sfizi", "Piatti & Specialità", "Cantina", "Bar & Cafè", "Extra / Altro"];

      return catsWithIndex.sort((a, b) => {
        const macroA = getMacroCategory(a.it);
        const macroB = getMacroCategory(b.it);
        
        const idxMacroA = macroOrder.indexOf(macroA);
        const idxMacroB = macroOrder.indexOf(macroB);
        
        // Se hanno macro differenti
        if (idxMacroA !== idxMacroB) {
            if (idxMacroA === -1) return 1;
            if (idxMacroB === -1) return -1;
            return idxMacroA - idxMacroB;
        }
        
        // Se hanno la STESSA macro, mantieni l'ordine originale dei prodotti
        return a.index - b.index;
      }).map(c => ({ it: c.it, local: c.local }));
    },
    [products, lang]
  );
  
  const availableMacros = React.useMemo(() => {
    const macros = new Set<string>();
    categoriesOriginal.forEach(c => macros.add(getMacroCategory(c.it)));
    const order = ["Food & Sfizi", "Piatti & Specialità", "Cantina", "Bar & Cafè", "Extra / Altro"];
    return Array.from(macros).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [categoriesOriginal]);

  const [takeawayHours, setTakeawayHours] = useState<any>(null);
  const [customerOrdersSettings, setCustomerOrdersSettings] = useState({ allowTableOrders: true, allowTakeawayOrders: true, allowCallWaiter: true });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "takeawayHours"), (snap) => {
      if (snap.exists()) {
        setTakeawayHours(snap.data());
      } else {
        setTakeawayHours({
            mon: { open: "12:00", close: "15:00", closed: true },
            tue: { open: "12:00", close: "15:00", openAfternoon: "18:00", closeAfternoon: "23:00", closed: false },
            wed: { open: "12:00", close: "15:00", openAfternoon: "18:00", closeAfternoon: "23:00", closed: false },
            thu: { open: "12:00", close: "15:00", openAfternoon: "18:00", closeAfternoon: "23:00", closed: false },
            fri: { open: "12:00", close: "15:00", openAfternoon: "18:00", closeAfternoon: "23:00", closed: false },
            sat: { open: "12:00", close: "15:00", openAfternoon: "18:00", closeAfternoon: "23:00", closed: false },
            sun: { open: "18:00", close: "23:00", closed: false },
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "customerOrders"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomerOrdersSettings({
          allowTableOrders: data.allowTableOrders !== false,
          allowTakeawayOrders: data.allowTakeawayOrders !== false,
          allowCallWaiter: data.allowCallWaiter !== false
        });
      }
    });
    return () => unsub();
  }, []);

  const [activeMacroCategory, setActiveMacroCategory] = useState<string>("");
  const [hasStoredTakeaway, setHasStoredTakeaway] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem("lastTakeawayName");
    const storedCode = localStorage.getItem("lastTakeawayCode");
    if (storedName && storedCode) {
      setHasStoredTakeaway(true);
      setRecoveryName(storedName);
      setRecoveryCode(storedCode);
    }
  }, []);

  useEffect(() => {
    if (availableMacros.length > 0 && (!activeMacroCategory || !availableMacros.includes(activeMacroCategory))) {
      setActiveMacroCategory(availableMacros[0]);
    }
  }, [availableMacros, activeMacroCategory]);

  const activeCategoriesOriginal = React.useMemo(() => {
    return categoriesOriginal.filter(c => getMacroCategory(c.it) === activeMacroCategory);
  }, [categoriesOriginal, activeMacroCategory]);

  const allCategories = categoriesOriginal.map(c => c.local);

  const [extrasData, setExtrasData] = useState<Extra[]>([]);
  const [featuredCrossSellProducts, setFeaturedCrossSellProducts] = useState<string[]>([]);
  const [categoryConfig, setCategoryConfig] = useState<Record<string, { isTop: boolean; isDropdown: boolean }>>({});
  const [tableMappings, setTableMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubExtras = onSnapshot(collection(db, "extras"), (snapshot) => {
      setExtrasData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Extra)));
    }, (err) => {
      console.error(err);
    });
    const unsubCrossSell = onSnapshot(doc(db, "settings", "crossSelling"), (doc) => {
      if (doc.exists() && doc.data().featured) {
        setFeaturedCrossSellProducts(doc.data().featured);
      }
    }, (err) => {
      console.error(err);
    });
    const unsubCategoriesConfig = onSnapshot(doc(db, "settings", "categories"), (doc) => {
      if (doc.exists() && doc.data().config) {
        setCategoryConfig(doc.data().config);
      }
    }, (err) => {
      console.error(err);
    });
    const unsubTableMappings = onSnapshot(doc(db, "settings", "tables"), (doc) => {
      if (doc.exists() && doc.data().mappings) {
        setTableMappings(doc.data().mappings);
      }
    }, (err) => {
      console.error("Errore caricamento mappatura tavoli:", err);
    });
    return () => {
      unsubExtras();
      unsubCrossSell();
      unsubCategoriesConfig();
      unsubTableMappings();
    }
  }, []);

  const getActiveTableNumber = () => {
    if (!tableNumber) return "";
    return tableMappings[tableNumber] || tableNumber;
  };

  const getActiveTableLabel = () => {
    if (!tableNumber) return "";
    if (tableNumber === "Asporto") return "Asporto";
    const root = tableMappings[tableNumber] || tableNumber;
    const members = [root];
    Object.entries(tableMappings).forEach(([child, parent]) => {
      if (parent === root) members.push(child);
    });
    const uniqueMembers = Array.from(new Set(members)).sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
        return numA - numB;
    });
    return uniqueMembers.length > 1 ? `Tavolo ${uniqueMembers.join(" e ")}` : `Tavolo ${root}`;
  };

  const [activeCategory, setActiveCategory] = useState<string>("");

  const [showAllergensFAQ, setShowAllergensFAQ] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (allCategories.length > 0 && !activeCategory) {
      setActiveCategory(allCategories[0]);
    }
  }, [allCategories, activeCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const matchedCategory = allCategories.find(
              (c) =>
                c.replace(/\s+/g, "-") ===
                entry.target.id.replace("category-", ""),
            );
            if (matchedCategory) {
              setActiveCategory(matchedCategory);
              
              const matchedObj = categoriesOriginal.find(c => c.local === matchedCategory);
              if (matchedObj) {
                const macro = getMacroCategory(matchedObj.it);
                setActiveMacroCategory(macro);
              }

              const btn = document.getElementById(
                `nav-btn-${matchedCategory.replace(/\s+/g, "-")}`,
              );
              if (btn)
                btn.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
            }
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0.1 },
    );

    allCategories.forEach((cat) => {
      const el = document.getElementById(
        `category-${cat.replace(/\s+/g, "-")}`,
      );
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [allCategories, categoriesOriginal]);

  const [cart, setCart] = useState<OrderItem[]>(initialCart || []);
  const [tableNumber, setTableNumber] = useState<string>(initialTable || "");
  const [customerName, setCustomerName] = useState<string>(initialCustomerName || "");
  const [customerLastName, setCustomerLastName] = useState<string>(initialCustomerLastName || "");
  const [customerPhone, setCustomerPhone] = useState<string>(initialCustomerPhone || "");
  const [isJoined, setIsJoined] = useState<boolean>(!!initialTable || !!editMode);
  const [customerMode, setCustomerMode] = useState<"welcome" | "menuOnly" | "orderTable" | "takeaway" | "callWaiterForm">(
    initialTable === "Asporto" ? "takeaway" : (isManager || initialTable || editMode ? "orderTable" : "welcome")
  );
  const [takeawayTime, setTakeawayTime] = useState<string>(initialTakeawayTime || "");
  const [minTakeawayTimeStr, setMinTakeawayTimeStr] = useState("");

  useEffect(() => {
    if (customerMode === "takeaway") {
      const now = new Date();
      // For customers, enforce 30 minutes. For managers/staff, no extra prep time.
      const prepTimeMinutes = isManager ? 0 : (typeof minPrepTime === 'number' ? minPrepTime : 30);
      
      now.setMinutes(now.getMinutes() + prepTimeMinutes);
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const minTime = `${hours}:${minutes}`;
      
      // Safety check: ensure minTime is not NaN:NaN
      if (hours !== "NaN" && minutes !== "NaN") {
        setMinTakeawayTimeStr(minTime);
      } else {
        // Fallback
        setMinTakeawayTimeStr("00:00");
      }
      
      // If currently selected time is earlier than the new min, reset it
      if (!isManager && takeawayTime && takeawayTime < minTime) {
        setTakeawayTime(minTime);
      } else if (!takeawayTime) {
        // We only set it automatically the first time, to avoid jumping if user clears it. But keeping original behavior:
        setTakeawayTime(minTime);
      }
    }
  }, [customerMode, minPrepTime, isManager, takeawayTime]);

  const isTakeawayClosed = React.useMemo(() => {
    if (!takeawayHours) return false;
    
    // Evaluate based on the selected takeawayTime, or current time if none is selected
    const now = new Date();
    let evaluationTime = now;
    
    if (takeawayTime) {
      const [h, m] = takeawayTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        evaluationTime = new Date(now);
        evaluationTime.setHours(h, m, 0, 0);
      }
    }

    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dayKey = days[evaluationTime.getDay()];
    const config = takeawayHours[dayKey];
    
    if (!config) return false;
    if (config.closed) return true;

    const [hOpen, mOpen] = config.open.split(":").map(Number);
    const [hClose, mClose] = config.close.split(":").map(Number);
    const openTime = new Date(evaluationTime);
    openTime.setHours(hOpen, mOpen, 0, 0);
    const closeTime = new Date(evaluationTime);
    closeTime.setHours(hClose, mClose, 0, 0);
    
    let isOpenAtTime = (evaluationTime >= openTime && evaluationTime <= closeTime);

    if (!isOpenAtTime && config.openAfternoon && config.closeAfternoon) {
        const [hOpenAft, mOpenAft] = config.openAfternoon.split(":").map(Number);
        const [hCloseAft, mCloseAft] = config.closeAfternoon.split(":").map(Number);
        const openAftTime = new Date(evaluationTime);
        openAftTime.setHours(hOpenAft, mOpenAft, 0, 0);
        const closeAftTime = new Date(evaluationTime);
        closeAftTime.setHours(hCloseAft, mCloseAft, 0, 0);
        isOpenAtTime = (evaluationTime >= openAftTime && evaluationTime <= closeAftTime);
    }
    
    return !isOpenAtTime;
  }, [takeawayHours, takeawayTime]);

  const [recoveryName, setRecoveryName] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveredOrder, setRecoveredOrder] = useState<any | null>(null);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveredOrderId, setRecoveredOrderId] = useState<string | null>(null);
  const [checkingTable, setCheckingTable] = useState(false);
  const [orderNotes, setOrderNotes] = useState<string>(initialNotes || "");
  const [tableError, setTableError] = useState<string>("");
  const [globalError, setGlobalError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [sentOrderRecap, setSentOrderRecap] = useState<any[] | null>(null);
  const [sentOrderId, setSentOrderId] = useState<string>("");
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Auto-open cart in edit mode for managers
  useEffect(() => {
    if (editMode && isManager && cart.length > 0) {
      setIsCartOpen(true);
    }
  }, [editMode, isManager]);
  const [myActiveOrders, setMyActiveOrders] = useState<any[]>([]);
  const [managerWaiter, setManagerWaiter] = useState(
    localStorage.getItem("waiter") || "",
  );

  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  const [customerEditingIndex, setCustomerEditingIndex] = useState<number | null>(null);
  const [cartSubItemName, setCartSubItemName] = useState("");
  const [cartSubItemPrice, setCartSubItemPrice] = useState("");

  useEffect(() => {
    let unsubscribe: any = null;
    if (recoveredOrderId) {
      unsubscribe = onSnapshot(doc(db, "orders", recoveredOrderId), (snap: any) => {
        if (snap.exists()) {
          setRecoveredOrder({ id: snap.id, ...snap.data() });
        }
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [recoveredOrderId]);

  useEffect(() => {
    const activeTable = getActiveTableNumber();
    if (activeTable) {
      // Query everything and filter locally for robustness with table mappings
      const q = query(
        collection(db, "orders"),
        limit(300)
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const now = new Date();
          const filtered = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter(o => {
               // Table belongs to this group if its direct number or its mapped number matches activeTable
               const targetOfThisOrder = tableMappings[o.tableNumber] || o.tableNumber;
               if (activeTable === "Asporto") {
                  return targetOfThisOrder === "Asporto" && 
                         o.customerName === customerName.trim() && 
                         (o.takeawayCode === recoveryCode.trim().toUpperCase() || o.takeawayCode === localStorage.getItem("lastTakeawayCode"));
               }
               return targetOfThisOrder === activeTable;
            })
            .sort((a, b) => {
              const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : Date.now());
              const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : Date.now());
              return tB - tA;
            })
            .filter((o) => {
              // No longer filtering by name strictly as requested
              if (["pending", "preparing", "served"].includes(o.status)) return true;
              if (o.status === "paid") {
                if (!o.createdAt) return false;
                const d = new Date(
                  o.createdAt.toMillis ? o.createdAt.toMillis() : o.createdAt,
                );
                return (
                  d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear()
                );
              }
              return false;
            });

          const activeOrders = filtered.filter(o => ["pending", "preparing", "served"].includes(o.status));
          // If we want a fresh start after payment, we don't show paid orders in the active list for customers
          // This allows "starting fresh" automatically.
          const finalOrders: any[] = [];
          
          if (activeOrders.length > 0) {
            const virtualActiveOrder = activeOrders.reduce((acc, curr) => {
              acc.items.push(...curr.items);
              acc.total += curr.total;
              return acc;
            }, { 
              id: activeOrders[0].id, 
              tableNumber, 
              status: activeOrders[0].status, 
              items: [], 
              total: 0, 
              customerName: activeOrders[0].customerName, 
              takeawayCode: activeOrders[0].takeawayCode 
            });
            virtualActiveOrder.tableNumber = activeTable;
            virtualActiveOrder.status = activeOrders.some(x => x.status === "pending") ? "pending" : activeOrders.some(x => x.status === "preparing") ? "preparing" : "served";
            finalOrders.push(virtualActiveOrder);
          }
          
          setMyActiveOrders(finalOrders);
          
          // Never auto-disconnect if the user is in takeaway mode, to prevent blocking them from placing multiple orders or creating a new order.
          // For tables, if they have tracking orders and they all go to paid, we can let them naturally start a new order without kicking them to welcome screen.
          // The manual 'Torna alla Home' handles the reset.
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, "orders");
    },
  );
  return () => unsubscribe();
} else {
  setMyActiveOrders([]);
}
}, [tableNumber, tableMappings]);

  const handleTakeawayConfirm = () => {
    const cName = customerName.trim();
    const cLastName = customerLastName.trim();
    const cPhone = customerPhone.trim();

    if (!cName) {
      setTableError(isManager ? "Inserisci il nome del cliente per continuare." : "Inserisci il tuo nome per continuare.");
      return;
    }

    if (!isManager) {
      if (!cLastName) {
        setTableError("Inserisci il tuo cognome per continuare.");
        return;
      }
      if (!cPhone) {
        setTableError("Inserisci il tuo numero di telefono per continuare.");
        return;
      }
    }

    if (!takeawayTime) {
      setTableError("Inserisci l'orario di ritiro.");
      return;
    }
    if (!isManager && takeawayTime < minTakeawayTimeStr) {
      setTableError(`L'orario minimo di preparazione è ${minTakeawayTimeStr}.`);
      return;
    }
    
    if (isManager && !managerWaiter) {
      setTableError("Seleziona un operatore.");
      return;
    }
    
    if (isTakeawayClosed && !isManager) {
      // Allow joining even if closed so they can see the banner and menu
    }
    
    setTableNumber("Asporto");
    setIsJoined(true);
    setCustomerMode("takeaway");
    localStorage.setItem("tipoOrdine", "asporto");
    localStorage.setItem("customerName", cName);
    localStorage.setItem("takeawayTime", takeawayTime);
  };

  const [callWaiterTable, setCallWaiterTable] = useState("");
  const [callWaiterSent, setCallWaiterSent] = useState(false);
  const [showCallWaiterModal, setShowCallWaiterModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [waiterCooldownRemaining, setWaiterCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(prev => {
        // La differenza tra il punto di attivazione (220) e quello di disattivazione (10)
        // deve essere maggiore della variazione di altezza totale degli elementi header/nav (circa 170px)
        // Questo previene il loop (bounce) dovuto al "scroll anchoring" del browser.
        if (!prev && window.scrollY > 220) return true;
        if (prev && window.scrollY < 10) return false;
        return prev;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (showCallWaiterModal && tableNumber && !callWaiterTable) {
      setCallWaiterTable(tableNumber);
    }
  }, [showCallWaiterModal, tableNumber, callWaiterTable]);

  useEffect(() => {
    let interval: any;
    const checkCooldown = () => {
       const key = `lastWaiterCall_${callWaiterTable || tableNumber}`;
       const lastCallTime = localStorage.getItem(key);
       if (lastCallTime) {
           const timeDiff = Date.now() - parseInt(lastCallTime, 10);
           if (timeDiff < 10 * 60 * 1000) {
               setWaiterCooldownRemaining(Math.ceil((10 * 60 * 1000 - timeDiff) / 1000));
           } else {
               setWaiterCooldownRemaining(0);
           }
       } else {
           setWaiterCooldownRemaining(0);
       }
    };
    checkCooldown();
    interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [callWaiterTable, tableNumber]);

  const handleCallWaiter = async () => {
    if (customerOrdersSettings.allowCallWaiter === false) {
      setTableError("Il servizio di chiamata è temporaneamente disattivato.");
      return;
    }
    const val = parseInt(callWaiterTable, 10);
    if (!(val >= 1 && val <= 10)) {
      setTableError("Inserisci un numero di tavolo valido (1-10)");
      return;
    }
    if (waiterCooldownRemaining > 0) {
      setTableError(`Hai già chiamato il cameriere. Attendi ${Math.ceil(waiterCooldownRemaining/60)} minuti.`);
      return;
    }

    setCheckingTable(true);
    setTableError("");
    try {
      const lastCallTime = localStorage.getItem(`lastWaiterCall_${callWaiterTable}`);
      if (lastCallTime) {
         const timeDiff = Date.now() - parseInt(lastCallTime, 10);
         if (timeDiff < 10 * 60 * 1000) {
             setTableError("Hai già chiamato il cameriere di recente. Attendi 10 minuti.");
             setCheckingTable(false);
             return;
         }
      }

      // Also check Firestore for the last 10 minutes to prevent bypass via localStorage clear
      const { getDocs, query, collection, where } = await import("firebase/firestore");
      const q = query(
        collection(db, "waiterCalls"),
        where("tableNumber", "==", callWaiterTable.toString()),
        where("status", "==", "pending")
      );
      
      const firestoreCheck = await getDocs(q);
      const isRecent = firestoreCheck.docs.some(d => {
         const t = d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : 0;
         return Date.now() - t < 10 * 60 * 1000;
      });

      if (isRecent) {
          setTableError("Hai già chiamato il cameriere di recente. Attendi 10 minuti.");
          setCheckingTable(false);
          const recentDoc = firestoreCheck.docs.sort((a,b) => b.data().createdAt?.toMillis() - a.data().createdAt?.toMillis())[0];
          if (recentDoc && recentDoc.data().createdAt) {
             localStorage.setItem(`lastWaiterCall_${callWaiterTable}`, recentDoc.data().createdAt.toMillis().toString());
          }
          return;
      }

      await addDoc(collection(db, "waiterCalls"), {
        tableNumber: callWaiterTable.toString(),
        status: "pending",
        createdAt: serverTimestamp()
      });
      localStorage.setItem(`lastWaiterCall_${callWaiterTable}`, Date.now().toString());
      setCallWaiterSent(true);
      setTimeout(() => {
        setCallWaiterSent(false);
        setShowCallWaiterModal(false);
        if (customerMode === "callWaiterForm") setCustomerMode("welcome");
      }, 3000);
    } catch(err) {
      setTableError("Errore nell'invio: " + (err as Error).message);
    } finally {
      setCheckingTable(false);
    }
  };

  const handleRecoverOrder = async () => {
    if (!recoveryName.trim() || !recoveryCode.trim()) {
      setRecoveryError("Inserisci nome e codice a 4 cifre.");
      return;
    }
    setIsRecovering(true);
    setRecoveryError("");
    try {
      const { getDocs, query, collection, where } = await import("firebase/firestore");
      const codeToSearch = recoveryCode.trim().toUpperCase().replace("GIG-", "");
      const q = query(
        collection(db, "orders"),
        where("tableNumber", "==", "Asporto"),
        where("customerName", "==", recoveryName.trim()),
        where("takeawayCode", "==", codeToSearch)
      );
      const activeSnap = await getDocs(q);
      const orders = activeSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      
      // Sort by date to get latest
      const order = orders.sort((a,b) => {
         const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
         const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
         return tB - tA;
      })[0];
      
      if (order) {
        setRecoveredOrder(order);
        setRecoveredOrderId(order.id);
        setCart(order.items || []);
        setTableNumber(order.tableNumber || "");
        setCustomerName(order.customerName || "");
        setCustomerLastName(order.customerLastName || "");
        setCustomerPhone(order.customerPhone || "");
        setTakeawayTime(order.takeawayTime || "");
        setCustomerMode(order.tableNumber === "Asporto" ? "takeaway" : "orderTable");
        setIsJoined(true);
      } else {
        setRecoveryError("Ordine non trovato. Verifica il nome e il codice.");
        setRecoveredOrderId(null);
      }
    } catch (err) {
      console.error(err);
      setRecoveryError("Errore durante la ricerca dell'ordine.");
    } finally {
      setIsRecovering(false);
    }
  };

  const handleTableConfirm = async () => {
    const inputTable = document.getElementById(
      "table-input",
    ) as HTMLInputElement;
    const val = parseInt(inputTable.value, 10);
    const cName = customerName.trim();

    if (!(val >= 1 && val <= 10)) {
      setTableError("Inserisci un numero da 1 a 10");
      return;
    }
    
    // Name is no longer required for table orders
    
    if (isManager && !managerWaiter) {
      setTableError("Seleziona il cameriere per continuare.");
      return;
    }

    setCheckingTable(true);
    setTableError("");

    try {
      const activeTable = tableMappings[val.toString()] || val.toString();
      const q = query(
        collection(db, "orders"),
        where("tableNumber", "==", activeTable),
      );
      const snapshot = await getDocs(q);
      const activeOrderDocs = snapshot.docs.filter((d) => {
        const status = d.data().status;
        return (
          status === "pending" || status === "preparing" || status === "served"
        );
      });

      if (activeOrderDocs.length > 0) {
        if (!isManager) {
          // If table redirected or has active orders, we allow joining
          // We won't block based on name anymore as requested
        }
      }

      setTableNumber(val.toString());
      setIsJoined(true);
      localStorage.setItem("tipoOrdine", "tavolo");
      if (isManager) {
        localStorage.setItem("waiter", managerWaiter);
      }
    } catch (err) {
      setTableError(
        "Errore di connessione. Riprova: " + (err as Error).message,
      );
    } finally {
      setCheckingTable(false);
    }
  };
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemNote, setItemNote] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [weightInfo, setWeightInfo] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [bowlSize, setBowlSize] = useState<string>("Dimensione Unica - € 10,50");
  const [bowlBase, setBowlBase] = useState<string>("");
  const [bowlSalume, setBowlSalume] = useState<string>("");
  const [bowlFormaggio, setBowlFormaggio] = useState<string>("");
  const [bowlContorno, setBowlContorno] = useState<string>("");

  const [subItems, setSubItems] = useState<{ name: string; price: number }[]>(
    [],
  );
  const [subItemName, setSubItemName] = useState("");
  const [subItemPrice, setSubItemPrice] = useState("");

  const cancelProductModal = () => {
    setSelectedProduct(null);
  };

  const handleCustomizationToggle = (e: Extra) => {
    setSelectedExtras(prev => 
      prev.find(x => x.id === e.id) 
        ? prev.filter(x => x.id !== e.id) 
        : [...prev, e]
    );
  };

  const handleIngredientRemovalToggle = (ing: string) => {
    setRemovedIngredients(prev =>
      prev.includes(ing)
        ? prev.filter(x => x !== ing)
        : [...prev, ing]
    );
  };

  const [bowlError, setBowlError] = useState("");

  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemNote, setCustomItemNote] = useState("");

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [substitutions, setSubstitutions] = useState<Record<string, string>>({}); // baseIngredientName -> extraId
  const [inferredBaseIngredients, setInferredBaseIngredients] = useState<{name: string, category: string}[]>([]);
  const [manualSubstitution, setManualSubstitution] = useState("");
  const [manualExtras, setManualExtras] = useState<string[]>([]);
  const [customExtraInput, setCustomExtraInput] = useState("");

  const getComputedPrice = (product: Product | null) => {
    let price = 0;
    if (!product) return price;
    if (product.category.it.includes("Puglia Bowl")) {
      price = 10.5;
    } else {
      price = product.price;
    }
    const extrasPrice = selectedExtras.reduce((sum, extra) => sum + (extra.price || 0), 0);
    return price + extrasPrice;
  };

  const isOrderingBlocked = false; // Disabled to allow continuous ordering/merging as requested

  const computedPrice = getComputedPrice(selectedProduct);

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setItemNote("");
    setSpecialRequest("");
    setWeightInfo("");
    setItemQuantity(1);
    setBowlSize("Dimensione Unica - € 10,50");
    setBowlBase("");
    setBowlSalume("");
    setBowlFormaggio("");
    setBowlContorno("");
    setSubItems([]);
    setSubItemName("");
    setSubItemPrice("");
    
    // Auto-open customization if there are options
    const productExtras = extrasData.filter(e => (e.targets || []).includes(product.name.it) || (e.targets || []).includes(product.category.it));
    const hasExistingBase = product.baseIngredients && product.baseIngredients.length > 0;
    
    // Auto-extraction if no base ingredients defined, normalizing to objects
    const rawIngredients = hasExistingBase ? product.baseIngredients! : inferIngredients(product.description.it, extrasData);
    const normalizedIngredients = rawIngredients.map(ing => 
      typeof ing === 'string' ? { name: ing, category: 'varie' } : ing
    );
    
    // De-duplicate normalized ingredients by name (case-insensitive) to prevent duplicate key warning
    const uniqueNormalizedIngredients: typeof normalizedIngredients = [];
    const seenNames = new Set<string>();
    for (const ing of normalizedIngredients) {
      const lowerName = ing.name.toLowerCase().trim();
      if (!seenNames.has(lowerName)) {
        seenNames.add(lowerName);
        uniqueNormalizedIngredients.push(ing);
      }
    }
    setInferredBaseIngredients(uniqueNormalizedIngredients);
    
    setIsCustomizing(false);

    setSelectedExtras([]);
    setRemovedIngredients([]);
    setSubstitutions({});
    setManualSubstitution("");
    setManualExtras([]);
    setCustomExtraInput("");
  };

  const editCustomerCartItem = (index: number) => {
    const item = cart[index];
    if (item.productId.startsWith('custom-')) {
       // Cannot currently edit custom items from the modal easily, as they are completely manual.
       // We'll skip or we could open the custom modal. Let's just open custom modal if it's custom.
       setCustomItemName(item.name);
       setCustomItemPrice(item.price.toString());
       setCustomItemNote(item.notes || "");
       setCustomerEditingIndex(index);
       setIsCustomItemOpen(true);
       setIsCartOpen(false); // Close cart to see the modal properly
       return;
    }
    
    const product = products.find(p => p.id === item.productId);
    if (!product) return; // shouldn't happen unless product deleted
    
    openProductModal(product); // initialize default state
    setCustomerEditingIndex(index);
    setIsCartOpen(false); // Close cart to see the modal
    
    // Override defaults with the data saved in customizationOptions if available
    if (item.customizationOptions) {
      setItemQuantity(item.quantity);
      setItemNote(item.customizationOptions.itemNote || "");
      setSpecialRequest(item.customizationOptions.specialRequest || "");
      setWeightInfo(item.customizationOptions.weightInfo || "");
      setBowlSize(item.customizationOptions.bowlSize || "Dimensione Unica - € 10,50");
      setBowlBase(item.customizationOptions.bowlBase || "");
      setBowlSalume(item.customizationOptions.bowlSalume || "");
      setBowlFormaggio(item.customizationOptions.bowlFormaggio || "");
      setBowlContorno(item.customizationOptions.bowlContorno || "");
      setSelectedExtras(item.customizationOptions.selectedExtras || []);
      setRemovedIngredients(item.customizationOptions.removedIngredients || []);
      setSubstitutions(item.customizationOptions.substitutions || {});
      setManualSubstitution(item.customizationOptions.manualSubstitution || "");
      setManualExtras(item.customizationOptions.manualExtras || []);
      
      const hasCustomizations = (item.customizationOptions.removedIngredients && item.customizationOptions.removedIngredients.length > 0) ||
                                (item.customizationOptions.selectedExtras && item.customizationOptions.selectedExtras.length > 0) ||
                                (item.customizationOptions.manualExtras && item.customizationOptions.manualExtras.length > 0) ||
                                (item.customizationOptions.manualSubstitution && item.customizationOptions.manualSubstitution.length > 0);
      if (hasCustomizations) {
         setIsCustomizing(true);
      }
    } else {
      setItemQuantity(item.quantity);
    }
  };
  const openCustomItemModal = () => {
    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemNote("");
    setIsCustomItemOpen(true);
  };

  const addCustomItemToCart = () => {
    if (!customItemName.trim()) {
      return;
    }

    const price = customItemPrice.trim() ? parseFloat(customItemPrice) : 0;
    if (isNaN(price)) return;

    setCart((prev) => {
      if (customerEditingIndex !== null) {
         const updatedCart = [...prev];
         const existingItem = updatedCart[customerEditingIndex];
         updatedCart[customerEditingIndex] = {
           ...existingItem,
           name: customItemName,
           price: price,
           notes: customItemNote,
         };
         return updatedCart;
      }
      const newItem: OrderItem = {
        productId: `custom-${customItemName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`,
        name: customItemName,
        price: price,
        quantity: 1,
        notes: customItemNote,
      };
      return [...prev, newItem];
    });
    setCustomerEditingIndex(null);
    setIsCustomItemOpen(false);
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;

    if (selectedProduct.category.it === "Le Formule Aperitivo" && !itemNote) {
      setBowlError("Seleziona una bevanda per l'aperitivo.");
      return;
    }
    if (selectedProduct.options && selectedProduct.options.length > 0 && !itemNote) {
      setBowlError("Seleziona un'opzione obbligatoria.");
      return;
    }

    let finalNote = specialRequest;
    if (selectedProduct.name.it.toLowerCase().includes("focaccia farcita")) {
      if (!bowlSalume && !bowlFormaggio && itemNote !== "vuota") {
        setBowlError("Focaccia: Scegli un salume/formaggio oppure specifica 'Senza niente (vuota)'.");
        return;
      }
      if (itemNote === "vuota") {
        finalNote = `Focaccia Vuota${finalNote ? ` | Note: ${finalNote}` : ""}`;
      } else {
        const parts = [];
        if (bowlSalume) parts.push(`Salume: ${bowlSalume}`);
        if (bowlFormaggio) parts.push(`Formaggio: ${bowlFormaggio}`);
        finalNote = `${parts.join(" | ")}${finalNote ? ` | Note: ${finalNote}` : ""}`;
      }
    } else if (itemNote && (selectedProduct.category.it === "Le Formule Aperitivo" || (selectedProduct.options && selectedProduct.options.length > 0))) {
      finalNote = finalNote ? `Opzione: ${itemNote} | Note: ${finalNote}` : `Opzione: ${itemNote}`;
    } else if (itemNote && !finalNote) {
      // Fallback in case itemNote has some value that isn't from options (e.g. legacy logic)
      finalNote = itemNote;
    }

    if (selectedProduct.requiresWeight) {
      if (!weightInfo) {
        setBowlError("Inserisci il peso o la porzione desiderata.");
        return;
      }
      setBowlError("");
      finalNote = `Peso: ${weightInfo}${finalNote ? ` | Note: ${finalNote}` : ""}`;
    } else if (selectedProduct.category.it.includes("Puglia Bowl")) {
      if (!bowlBase) {
        setBowlError(
          "Devi selezionare la Base per la Puglia Bowl (Frisa o Crostoni).",
        );
        return;
      }
      setBowlError("");
      let bowlDetails = `Dimensione: ${bowlSize.split(" -")[0]}`;
      bowlDetails += ` | Base: ${bowlBase}`;
      if (selectedProduct.name.it.includes("Componibile")) {
        bowlDetails += ` | Salume: ${bowlSalume || "Nessuno"} | Formaggio: ${bowlFormaggio || "Nessuno"} | Contorno: ${bowlContorno || "Nessuno"}`;
      }
      finalNote = finalNote
        ? `${bowlDetails} | Note: ${finalNote}`
        : bowlDetails;
    } else if (selectedProduct.name.it.toLowerCase().includes("focaccia farcita")) {
      setBowlError("");
      const focacciaDetails = (!bowlSalume && !bowlFormaggio) 
        ? "Focaccia vuota" 
        : `Focaccia con: ${bowlSalume || "no salume"} e ${bowlFormaggio || "no formaggio"}`;
      finalNote = finalNote
        ? `${focacciaDetails} | Note: ${finalNote}`
        : focacciaDetails;
    }

    if (removedIngredients.length > 0) {
      finalNote += finalNote ? ` | SENZA: ${removedIngredients.join(", ")}` : `SENZA: ${removedIngredients.join(", ")}`;
    }
    
    if (manualSubstitution.trim()) {
      finalNote += finalNote ? ` | SOST: ${manualSubstitution}` : `SOST: ${manualSubstitution}`;
    }

    const allExtras = selectedExtras.map(e => e.name);

    if (allExtras.length > 0) {
      finalNote += finalNote ? ` | EXTRA: ${allExtras.join(", ")}` : `EXTRA: ${allExtras.join(", ")}`;
    }

    const customizationOptions = {
      itemNote,
      specialRequest,
      weightInfo,
      bowlSize,
      bowlBase,
      bowlSalume,
      bowlFormaggio,
      bowlContorno,
      selectedExtras,
      removedIngredients,
      substitutions,
      manualSubstitution,
      manualExtras
    };

    setCart((prev) => {
      if (customerEditingIndex !== null) {
         // Update existing item at index
         const updatedCart = [...prev];
         const existingItem = updatedCart[customerEditingIndex];
         updatedCart[customerEditingIndex] = {
           ...existingItem,
           productId: selectedProduct.id!,
           name: selectedProduct.name[lang] || selectedProduct.name.it,
           price: computedPrice,
           quantity: itemQuantity,
           notes: finalNote,
           customizationOptions,
         };
         return updatedCart;
      }
      
      const existingKey = prev.find(
        (item) =>
          item.productId === selectedProduct.id &&
          item.notes === finalNote &&
          item.price === computedPrice,
      );
      if (existingKey) {
        return prev.map((item) =>
          item === existingKey
            ? { ...item, quantity: item.quantity + itemQuantity }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: selectedProduct.id!,
          name: selectedProduct.name[lang] || selectedProduct.name.it,
          price: computedPrice,
          quantity: itemQuantity,
          notes: finalNote,
          customizationOptions,
        },
      ];
    });
    setCustomerEditingIndex(null);
    setSelectedProduct(null);
  };

  const removeFromCart = (itemToRemove: OrderItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item === itemToRemove);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item === itemToRemove
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        );
      }
      return prev.filter((item) => item !== itemToRemove);
    });
  };

  const generateReceiptPDF = async (order: any) => {
    const doc = new jsPDF();
    doc.setFont("helvetica");

    const img = new window.Image();
    img.src = unnamedLogo;

    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const drawHeader = (pdfDoc: any, startY: number) => {
      let currentY = startY;
      try {
        if (img.width > 0) {
          const pageWidth = pdfDoc.internal.pageSize.getWidth();
          const imgWidth = 80;
          const imgHeight = (img.height * imgWidth) / img.width;
          pdfDoc.addImage(img, "PNG", (pageWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 10;
        } else {
          pdfDoc.setFontSize(22);
          pdfDoc.text("Gigliola", 105, currentY + 10, { align: "center" });
          currentY += 25;
        }
      } catch (e) {
        pdfDoc.setFontSize(22);
        pdfDoc.text("Gigliola", 105, currentY + 10, { align: "center" });
        currentY += 25;
      }
      return currentY;
    };

    let y = drawHeader(doc, 10);

    doc.setFontSize(12);
    doc.text(`Tavolo: ${order.tableNumber}`, 20, y);
    doc.text(`Data: ${new Date().toLocaleDateString("it-IT")}`, 140, y);
    y += 10;
    doc.text(`Cliente: ${order.customerName || "Sconosciuto"}`, 20, y);
    y += 10;

    doc.text(
      "----------------------------------------------------------------",
      20,
      y,
    );
    y += 10;

    const pageHeight = doc.internal.pageSize.getHeight();

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 20) {
        doc.addPage();
        y = drawHeader(doc, 10);
        doc.setFontSize(12);
        doc.text("----------------------------------------------------------------", 20, y);
        y += 10;
      }
    };

    order.items.forEach((item: any) => {
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      const nameLines = doc.splitTextToSize(`${item.quantity}x ${item.name}`, 140);
      doc.text(nameLines, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(`€ ${(item.price * item.quantity).toFixed(2)}`, 170, y, {
        align: "right",
      });
      y += 6 * nameLines.length;
      
      const cleanNotes = item.notes?.replace("[AGGIUNTA]", "").trim();
      if (cleanNotes) {
        checkPageBreak(10);
        doc.setFontSize(10);
        const noteLines = doc.splitTextToSize(`Note: ${cleanNotes}`, 140);
        doc.text(noteLines, 25, y);
        doc.setFontSize(12);
        y += 6 * noteLines.length;
      }
      if (item.subItems && item.subItems.length > 0) {
        doc.setFontSize(10);
        item.subItems.forEach((si: any) => {
          checkPageBreak(8);
          const subItemLines = doc.splitTextToSize(`- ${si.name}`, 130);
          doc.text(subItemLines, 30, y);
          doc.text(`€ ${si.price.toFixed(2)}`, 170, y, { align: "right" });
          y += 6 * subItemLines.length;
        });
        doc.setFontSize(12);
      }
      y += 2;
    });

    checkPageBreak(30);

    doc.text(
      "----------------------------------------------------------------",
      20,
      y,
    );
    y += 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Totale", 20, y);
    doc.text(`€ ${order.total.toFixed(2)}`, 170, y, { align: "right" });

    doc.save(`Ricevuta_Tavolo_${order.tableNumber}_${order.takeawayCode ? order.takeawayCode : order.id.slice(-4).toUpperCase()}.pdf`);
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const [isCrossSellModalOpen, setIsCrossSellModalOpen] = useState(false);
  const [crossSellSuggestions, setCrossSellSuggestions] = useState<Product[]>([]);

  const handleOrderInitiation = () => {
    if (!tableNumber || (!isManager && customerMode !== "menuOnly")) {
      // Name is optional now
    }
    if (cart.length === 0) return;
    
    if (editMode || isManager) {
      submitOrder();
      return;
    }

    const cartCategoryNames = cart.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product?.category.it || "";
    }).filter(Boolean);

    const hasDrinks = cartCategoryNames.some(cat => 
      cat.toLowerCase().includes("acqu") || 
      cat.toLowerCase().includes("bibite") ||
      cat.toLowerCase().includes("bevande") ||
      cat.toLowerCase().includes("vini") ||
      cat.toLowerCase().includes("birr") ||
      cat.toLowerCase().includes("drinks") ||
      cat.toLowerCase().includes("bollicine") ||
      cat.toLowerCase().includes("gin") ||
      cat.toLowerCase().includes("cocktail") ||
      cat.toLowerCase().includes("cantina")
    );

    const hasFood = cartCategoryNames.some(cat => 
      !cat.toLowerCase().includes("acqu") &&
      !cat.toLowerCase().includes("bibite") &&
      !cat.toLowerCase().includes("bevande") &&
      !cat.toLowerCase().includes("vini") &&
      !cat.toLowerCase().includes("birr") &&
      !cat.toLowerCase().includes("drinks") &&
      !cat.toLowerCase().includes("bollicine") &&
      !cat.toLowerCase().includes("gin") &&
      !cat.toLowerCase().includes("cocktail") &&
      !cat.toLowerCase().includes("cantina") &&
      !cat.toLowerCase().includes("caff") &&
      !cat.toLowerCase().includes("dolc") &&
      !cat.toLowerCase().includes("dessert")
    );

    let suggestions: Product[] = [];
    const shuffleArray = (arr: any[]) => [...arr].sort(() => 0.5 - Math.random());

    if (!hasDrinks && hasFood) {
      const drinks = products.filter(p => {
        const cat = p.category.it.toLowerCase();
        return (cat.includes("bevande") || cat.includes("birr") || cat.includes("vini") || cat.includes("cocktail") || cat.includes("acqua")) && p.available && !cart.some(c => c.productId === p.id);
      });
      suggestions = shuffleArray(drinks).slice(0, 2);
    } else if (hasDrinks && !hasFood) {
      const foods = products.filter(p => {
        const cat = p.category.it.toLowerCase();
        return !cat.includes("acqu") && !cat.includes("bevande") && !cat.includes("vini") && !cat.includes("birr") && !cat.includes("cocktail") && !cat.includes("cantina") && p.available && p.price > 0 && !cart.some(c => c.productId === p.id);
      });
      suggestions = shuffleArray(foods).slice(0, 2);
    } else {
      const missingCategories = Array.from(new Set(products.map(p => p.category.it))).filter(cat => !cartCategoryNames.includes(cat));
      const otherProducts = products.filter(p => missingCategories.includes(p.category.it) && p.available && p.price > 0 && !cart.some(c => c.productId === p.id));
      suggestions = shuffleArray(otherProducts).slice(0, 2);
    }

    if (suggestions.length < 2 && featuredCrossSellProducts.length > 0) {
      const featured = products.filter(p => featuredCrossSellProducts.includes(p.name.it) && p.available && !suggestions.find(s => s.id === p.id));
      suggestions = [...suggestions, ...featured].slice(0, 2);
    }

    if (suggestions.length > 0) {
      setCrossSellSuggestions(suggestions);
      setIsCrossSellModalOpen(true);
    } else {
      submitOrder();
    }
  };

  const addCrossSellItem = (product: Product) => {
    setCart((prev) => [
      ...prev,
      {
        productId: product.id!,
        name: product.name[lang] || product.name.it,
        price: product.price,
        quantity: 1,
        notes: "",
      },
    ]);
  };

  const submitOrder = async (additionalItem?: OrderItem) => {
    const activeCart = additionalItem ? [...cart, additionalItem] : cart;
    const activeTotal = activeCart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const ordersPath = "orders";
    const activeWaiter =
      localStorage.getItem("waiter") || "Sconosciuto/Cliente";
    
    const activeTable = getActiveTableNumber();
    const isTakeaway = activeTable === "Asporto";
    if (!activeTable) {
      setTableError(t("enterTable", lang));
      return;
    }

    if (!isManager) {
      if (isTakeaway && customerOrdersSettings.allowTakeawayOrders === false) {
        setGlobalError("Gli ordini da asporto sono temporaneamente disattivati.");
        return;
      }
      if (!isTakeaway && customerOrdersSettings.allowTableOrders === false) {
        setGlobalError("Gli ordini dal tavolo sono temporaneamente disattivati.");
        return;
      }
    }

    if (isTakeawayClosed && !isManager && isTakeaway) {
      setGlobalError("Siamo spiacenti, gli ordini da asporto non sono disponibili per l'orario richiesto. Verifica gli orari di apertura o scegli un altro orario.");
      return;
    }
    if (activeCart.length === 0) return;

    setIsSubmitting(true);
    
    // If table is redirected, add a note to the order
    let redirectionNote = "";
    if (activeTable !== tableNumber && tableNumber !== "Asporto") {
      redirectionNote = ` [ORDINE DA TAVOLO ${tableNumber} UNITO A ${activeTable}]`;
    }

    try {
      const { doc, updateDoc, getDocs, query, collection, where } =
        await import("firebase/firestore");

        if (editMode && orderId) {
          // Update existing order
          await updateDoc(doc(db, ordersPath, orderId), {
            tableNumber: activeTable,
            customerName: isTakeaway ? customerName.trim() : "",
            customerLastName: isTakeaway ? customerLastName.trim() : "",
            customerPhone: isTakeaway ? customerPhone.trim() : "",
            takeawayTime: isTakeaway ? takeawayTime : "",
            items: activeCart.map(item => ({ 
              ...item, 
              deliveredQuantity: (item as any).deliveredQuantity || 0,
              originOrderId: (item as any).originOrderId || orderId
            })),
            notes: (isTakeaway && !orderNotes.includes("PER ASPORTO")) 
              ? `PER ASPORTO ALLE ORE ${takeawayTime}${orderNotes ? ' | ' + orderNotes : ''}${redirectionNote}`
              : orderNotes + redirectionNote,
            total: activeTotal,
            updatedAt: serverTimestamp(),
          });

          // Cleanup: For table orders, if there are other active orders for the same table, 
          // mark them as linked to avoid duplication in manager view after this consolidated edit.
          if (!isTakeaway && isManager) {
            const qOthers = query(
              collection(db, ordersPath),
              where("tableNumber", "==", activeTable),
              where("status", "in", ["pending", "preparing", "served"])
            );
            const othersSnap = await getDocs(qOthers);
            const othersToLink = othersSnap.docs.filter(d => d.id !== orderId);
            if (othersToLink.length > 0) {
              await Promise.all(othersToLink.map(d => updateDoc(d.ref, { 
                status: "linked" as OrderStatus, 
                updatedAt: serverTimestamp() 
              })));
            }
          }

          if (onEditComplete) {
            onEditComplete();
          } else if (onNavigateManager) {
            onNavigateManager("dashboard", "orders");
          }
          return; // Exit here for edits
        } else {
        const { getDocs, query, collection, where, updateDoc, doc, serverTimestamp, addDoc } = await import("firebase/firestore");
        
        // 1. Check for existing active order for this table
        // For takeaway, NEVER auto-merge based on local storage. Only merge if the user explicitly recovered an order (recoveredOrderId).
        const mergeByTable = !isTakeaway;
        let generatedTakeawayCode: string | null = null;
        
        let existingOrderDoc = null;
        let isAddition = false;
        if (mergeByTable || recoveredOrderId) {
          const qActive = mergeByTable 
            ? query(
                collection(db, ordersPath),
                where("tableNumber", "==", activeTable),
                where("status", "in", ["pending", "preparing", "served"])
              )
            : query(
                collection(db, ordersPath),
                where("__name__", "==", recoveredOrderId)
              );
              
          const activeSnap = await getDocs(qActive);
          if (!activeSnap.empty) {
             isAddition = true;
             // For tables, we only do this to check if ordering is blocked. We will NOT merge.
             // For takeaway, we WILL merge into existingOrderDoc.
             if (isTakeaway) {
                existingOrderDoc = activeSnap.docs[0];
             }
          }
        }
        
        if (existingOrderDoc) {
            const existingData = existingOrderDoc.data();
            
            // CONSTRAINT: Block if previous items are not yet delivered (served)
            // But only for customers, managers can always add
            if (isOrderingBlocked) {
                setIsSubmitting(false);
                return;
            }

            const existingItems = existingData.items || [];
            
            // Mark new items
            const cartWithAdditions = activeCart.map(item => ({
                ...item,
                notes: item.notes ? `${item.notes} | [AGGIUNTA]${redirectionNote}` : `[AGGIUNTA]${redirectionNote}`
            }));
            
            await updateDoc(doc(db, ordersPath, existingOrderDoc.id), {
                items: [...existingItems, ...cartWithAdditions],
                total: existingOrderDoc.data().total + activeTotal,
                status: "pending",
                updatedAt: serverTimestamp()
            });
            setSentOrderId(existingOrderDoc.data().takeawayCode || existingOrderDoc.id);
        } else {
            // Create new order
            // Re-check blocking for tables if needed (handled by isOrderingBlocked using state)
            if (isOrderingBlocked) {
                setIsSubmitting(false);
                return;
            }

            const baseNotes = isTakeaway ? `PER ASPORTO ALLE ORE ${takeawayTime}${orderNotes ? ' | ' + orderNotes : ''}` : orderNotes;
            const additionNote = isAddition && !isTakeaway ? ' [AGGIUNTA]' : '';
            const finalNotes = baseNotes + redirectionNote + additionNote;
            generatedTakeawayCode = isTakeaway ? Math.floor(1000 + Math.random() * 9000).toString() : null;
            
            const cartForNewOrder = activeCart.map(item => ({
                ...item,
                notes: isAddition && !isTakeaway ? (item.notes ? `${item.notes} | [AGGIUNTA]` : '[AGGIUNTA]') : item.notes
            }));

            const docRef = await addDoc(collection(db, ordersPath), {
                waiter: activeWaiter,
                tableNumber: activeTable,
                customerName: isTakeaway ? customerName.trim() : "",
                customerLastName: isTakeaway ? customerLastName.trim() : "",
                customerPhone: isTakeaway ? customerPhone.trim() : "",
                takeawayTime: isTakeaway ? takeawayTime : null,
                notes: finalNotes,
                items: cartForNewOrder.map(item => ({ ...item, deliveredQuantity: 0 })),
                total: activeTotal,
                status: "pending" as OrderStatus,
                takeawayCode: generatedTakeawayCode,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            
            await updateDoc(docRef, {
                items: cartForNewOrder.map(item => ({ ...item, deliveredQuantity: 0, originOrderId: docRef.id }))
            });
            
            console.log("New order created successfully", docRef.id);
            setSentOrderId(generatedTakeawayCode || docRef.id);
            
            if (isTakeaway && !recoveredOrderId) {
                const { setDoc, doc } = await import("firebase/firestore");
                await setDoc(doc(db, "takeaway", docRef.id), {
                   orderId: docRef.id,
                   code: docRef.id.slice(-4).toUpperCase(),
                   createdAt: serverTimestamp()
                });
            }
        }
        
        setSentOrderRecap(activeCart);
        if (isTakeaway) {
          localStorage.setItem("lastTakeawayName", customerName.trim());
          const code = generatedTakeawayCode || (existingOrderDoc?.data()?.takeawayCode);
          if (code) {
            localStorage.setItem("lastTakeawayCode", code);
          }
        }
        setCart([]);
        setOrderNotes("");
        if (isManager) {
          setTableNumber("");
          setIsJoined(false);
        }
        setOrderSent(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, ordersPath);
    } finally {
      setIsSubmitting(false);
    }
  };

  const btnClasses = "w-10 h-10 flex items-center justify-center bg-transparent border-2 border-brand-black text-brand-black rounded-full hover:bg-brand-black hover:text-brand-gold active:scale-90 transition-all focus:outline-none";

  const relevantExtras = selectedProduct ? extrasData.filter(e => (e.targets || []).includes(selectedProduct.name.it) || (e.targets || []).includes(selectedProduct.category.it)) : [];
  const canCustomize = inferredBaseIngredients.length > 0 || relevantExtras.length > 0;



  return {
    lang, setLang, onOpenAdmin, editMode, isManager, minPrepTime, onNavigateManager, initialCart, initialTable, initialNotes, orderId, onEditComplete,
    products,categoriesOriginal,availableMacros,activeMacroCategory,setActiveMacroCategory,hasStoredTakeaway,setHasStoredTakeaway,activeCategoriesOriginal,allCategories,extrasData,setExtrasData,featuredCrossSellProducts,setFeaturedCrossSellProducts,categoryConfig,setCategoryConfig,tableMappings,setTableMappings,getActiveTableNumber,getActiveTableLabel,activeCategory,setActiveCategory,showAllergensFAQ,setShowAllergensFAQ,showCategoryDropdown,setShowCategoryDropdown,isDrawerOpen,setIsDrawerOpen,cart,setCart,tableNumber,setTableNumber,customerName,setCustomerName,customerLastName,setCustomerLastName,customerPhone,setCustomerPhone,isJoined,setIsJoined,customerMode,setCustomerMode,takeawayTime,setTakeawayTime,minTakeawayTimeStr,setMinTakeawayTimeStr,recoveryName,setRecoveryName,recoveryCode,setRecoveryCode,isRecovering,setIsRecovering,recoveredOrder,setRecoveredOrder,recoveryError,setRecoveryError,recoveredOrderId,setRecoveredOrderId,checkingTable,setCheckingTable,orderNotes,setOrderNotes,tableError,setTableError,globalError,setGlobalError,isSubmitting,setIsSubmitting,orderSent,setOrderSent,sentOrderRecap,setSentOrderRecap,sentOrderId,setSentOrderId,isCartOpen,setIsCartOpen,myActiveOrders,setMyActiveOrders,managerWaiter,setManagerWaiter,editingCartIndex,setEditingCartIndex,customerEditingIndex,setCustomerEditingIndex,editCustomerCartItem,cartSubItemName,setCartSubItemName,cartSubItemPrice,setCartSubItemPrice,handleTakeawayConfirm,callWaiterTable,setCallWaiterTable,callWaiterSent,setCallWaiterSent,showCallWaiterModal,setShowCallWaiterModal,isScrolled,setIsScrolled,handleCallWaiter,handleRecoverOrder,handleTableConfirm,selectedProduct,setSelectedProduct,itemNote,setItemNote,specialRequest,setSpecialRequest,weightInfo,setWeightInfo,itemQuantity,setItemQuantity,bowlSize,setBowlSize,bowlBase,setBowlBase,bowlSalume,setBowlSalume,bowlFormaggio,setBowlFormaggio,bowlContorno,setBowlContorno,subItems,setSubItems,subItemName,setSubItemName,subItemPrice,setSubItemPrice,cancelProductModal,handleCustomizationToggle,handleIngredientRemovalToggle,bowlError,setBowlError,isCustomItemOpen,setIsCustomItemOpen,customItemName,setCustomItemName,customItemPrice,setCustomItemPrice,customItemNote,setCustomItemNote,isCustomizing,setIsCustomizing,selectedExtras,setSelectedExtras,removedIngredients,setRemovedIngredients,substitutions,setSubstitutions,inferredBaseIngredients,setInferredBaseIngredients,manualSubstitution,setManualSubstitution,manualExtras,setManualExtras,customExtraInput,setCustomExtraInput,getComputedPrice,isOrderingBlocked,computedPrice,openProductModal,openCustomItemModal,addCustomItemToCart,confirmAddToCart,removeFromCart,generateReceiptPDF,total,isCrossSellModalOpen,setIsCrossSellModalOpen,crossSellSuggestions,setCrossSellSuggestions,handleOrderInitiation,addCrossSellItem,submitOrder,btnClasses,relevantExtras,canCustomize,isTakeawayClosed,takeawayHours,waiterCooldownRemaining,customerOrdersSettings
  };
}
