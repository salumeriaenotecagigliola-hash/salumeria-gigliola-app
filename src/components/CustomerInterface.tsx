import React, { useEffect, useState } from "react";
import { useCustomerState, getMacroCategory } from "../hooks/useCustomerState";
import { ShoppingCart, Plus, Minus, Send, ClipboardList, Info, X, Download, Settings, ChevronDown, Menu, Globe, ListChecks, CheckCircle2, ArrowRightLeft, ArrowLeft, Bell, Search, MapPin, Clock, Facebook, Instagram, Star } from "lucide-react";
import Logo from "./Logo";
import PullToRefresh from "./PullToRefresh";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../lib/i18n";
import Portal from "./Portal";
import { Extra, Product, OrderItem, Language, OrderStatus } from "../types";
import { allergenIcons } from "../lib/allergenIcons";
import { useAllergenInteraction } from "../hooks/useAllergenInteraction";

export interface Props {
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
  onCancel?: () => void;
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

/**
 * CustomerInterface (UI Component)
 * Responsabilità: Rendering dell'interfaccia utente (UI) separata dalla logica.
 */
export default function CustomerInterface(props: Props) {
  const state = useCustomerState(props);
  const {
    lang, setLang, onOpenAdmin, editMode, isManager, onNavigateManager,
    products,categoriesOriginal,availableMacros,activeMacroCategory,setActiveMacroCategory,hasStoredTakeaway,setHasStoredTakeaway,activeCategoriesOriginal,allCategories,extrasData,setExtrasData,featuredCrossSellProducts,setFeaturedCrossSellProducts,categoryConfig,setCategoryConfig,tableMappings,setTableMappings,getActiveTableNumber,getActiveTableLabel,activeCategory,setActiveCategory,showAllergensFAQ,setShowAllergensFAQ,showCategoryDropdown,setShowCategoryDropdown,isDrawerOpen,setIsDrawerOpen,cart,setCart,tableNumber,setTableNumber,customerName,setCustomerName,customerLastName,setCustomerLastName,customerPhone,setCustomerPhone,isJoined,setIsJoined,customerMode,setCustomerMode,takeawayTime,setTakeawayTime,minTakeawayTimeStr,setMinTakeawayTimeStr,recoveryName,setRecoveryName,recoveryCode,setRecoveryCode,isRecovering,setIsRecovering,recoveredOrder,setRecoveredOrder,recoveryError,setRecoveryError,recoveredOrderId,setRecoveredOrderId,checkingTable,setCheckingTable,orderNotes,setOrderNotes,tableError,setTableError,globalError,setGlobalError,isSubmitting,setIsSubmitting,orderSent,setOrderSent,sentOrderRecap,setSentOrderRecap,sentOrderId,setSentOrderId,isCartOpen,setIsCartOpen,myActiveOrders,setMyActiveOrders,managerWaiter,setManagerWaiter,editingCartIndex,setEditingCartIndex,customerEditingIndex,setCustomerEditingIndex,editCustomerCartItem,cartSubItemName,setCartSubItemName,cartSubItemPrice,setCartSubItemPrice,handleTakeawayConfirm,callWaiterTable,setCallWaiterTable,callWaiterSent,setCallWaiterSent,showCallWaiterModal,setShowCallWaiterModal,isScrolled,setIsScrolled,handleCallWaiter,handleRecoverOrder,handleTableConfirm,selectedProduct,setSelectedProduct,itemNote,setItemNote,specialRequest,setSpecialRequest,weightInfo,setWeightInfo,itemQuantity,setItemQuantity,bowlSize,setBowlSize,bowlBase,setBowlBase,bowlSalume,setBowlSalume,bowlFormaggio,setBowlFormaggio,bowlContorno,setBowlContorno,subItems,setSubItems,subItemName,setSubItemName,subItemPrice,setSubItemPrice,cancelProductModal,handleCustomizationToggle,handleIngredientRemovalToggle,bowlError,setBowlError,isCustomItemOpen,setIsCustomItemOpen,customItemName,setCustomItemName,customItemPrice,setCustomItemPrice,customItemNote,setCustomItemNote,isCustomizing,setIsCustomizing,selectedExtras,setSelectedExtras,removedIngredients,setRemovedIngredients,substitutions,setSubstitutions,inferredBaseIngredients,setInferredBaseIngredients,manualSubstitution,setManualSubstitution,manualExtras,setManualExtras,customExtraInput,setCustomExtraInput,getComputedPrice,isOrderingBlocked,computedPrice,openProductModal,openCustomItemModal,addCustomItemToCart,confirmAddToCart,removeFromCart,generateReceiptPDF,total,isCrossSellModalOpen,setIsCrossSellModalOpen,crossSellSuggestions,setCrossSellSuggestions,handleOrderInitiation,addCrossSellItem,submitOrder,btnClasses,relevantExtras,canCustomize,isTakeawayClosed,takeawayHours,waiterCooldownRemaining,customerOrdersSettings
  } = state;

  const [missingTableError, setMissingTableError] = useState(false);
  const [closedWarningDismissed, setClosedWarningDismissed] = useState(false);
  const [expandedExtraCategory, setExpandedExtraCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Derive search results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return products.filter(p => !p.isHidden && (
      p.name.it.toLowerCase().includes(q) || 
      (p.name.en?.toLowerCase().includes(q)) || 
      (p.description?.it?.toLowerCase().includes(q))
    )).slice(0, 10);
  }, [searchQuery, products]);

  const allergenInteraction = useAllergenInteraction(() => setShowAllergensFAQ(true));

  React.useEffect(() => {
    if (!isTakeawayClosed) {
      setClosedWarningDismissed(false);
    }
  }, [isTakeawayClosed]);

  const onConfirmOrder = () => {
    if (customerMode === "orderTable" && !tableNumber && !isManager) {
      setMissingTableError(true);
      setCustomerMode("welcome");
      setIsCartOpen(false);
      setTimeout(() => setMissingTableError(false), 5000);
      return;
    }
    setIsCartOpen(false);
    handleOrderInitiation();
  };

  const onConfirmCrossSell = () => {
    if (customerMode === "orderTable" && !tableNumber && !isManager) {
      setMissingTableError(true);
      setCustomerMode("welcome");
      setIsCrossSellModalOpen(false);
      setTimeout(() => setMissingTableError(false), 5000);
      return;
    }
    setIsCrossSellModalOpen(false);
    submitOrder();
  };

  return (
    <PullToRefresh onRefresh={() => window.location.reload()}>
      <AnimatePresence>
        {globalError && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-brand-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-red-600 text-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border-4 border-red-500 overflow-hidden relative"
              >
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40">
                    <Info size={32} />
                  </div>
                  <h3 className="font-black uppercase tracking-widest text-lg">Attenzione</h3>
                  <p className="font-bold text-sm leading-relaxed opacity-90">
                    {globalError}
                  </p>
                  
                  {takeawayHours && (
                    <div className="bg-white/10 rounded-2xl w-full p-4 mt-2 text-left text-xs mb-2 shadow-inner">
                      <p className="font-bold uppercase tracking-widest text-[10px] mb-2 opacity-70 border-b border-white/20 pb-2">Orari di Apertura</p>
                      <div className="grid grid-cols-1 gap-1">
                        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                          const config = takeawayHours[day];
                          if (!config) return null;
                          const dayNames: any = { mon: "Lunedì", tue: "Martedì", wed: "Mercoledì", thu: "Giovedì", fri: "Venerdì", sat: "Sabato", sun: "Domenica" };
                          return (
                            <div key={day} className="flex justify-between items-center py-1">
                              <span className="font-bold">{dayNames[day]}</span>
                              <span className="opacity-90">
                                {config.closed ? "Chiuso" : `${config.open} - ${config.close}${config.openAfternoon ? ` / ${config.openAfternoon} - ${config.closeAfternoon}` : ''}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setGlobalError("")}
                    className="mt-2 w-full bg-white text-red-600 font-black uppercase tracking-widest text-sm p-4 rounded-xl shadow-lg active:scale-95 transition-all outline-none"
                  >
                    Ho Capito
                  </button>
                  <button onClick={() => setGlobalError("")} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                    <X size={20} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {missingTableError && (
          <Portal>
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 left-4 right-4 z-[9999] bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3"
            >
              <Info size={24} className="flex-shrink-0" />
              <p className="font-bold text-sm leading-tight uppercase tracking-wider">
                Attenzione: Inserisci il numero del tuo tavolo per poter ordinare
              </p>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
      <div className="max-w-md mx-auto p-4 sm:p-6 pb-2 flex flex-col gap-6">

      {/* Header Area */}
      <header id="main-header" className={`sticky top-0 z-40 bg-brand-paper/95 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 flex items-center justify-between border-b border-brand-black/5 transition-all duration-300 ${isScrolled ? "py-1 shadow-sm min-h-[52px]" : "py-3 mb-2 min-h-[90px]"}`}>
        <div className="flex gap-2 w-12 shrink-0">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="p-1 sm:p-2 bg-transparent text-brand-black hover:text-brand-gold transition-all active:scale-95 z-50 relative"
            aria-label="Menu"
          >
            <Menu size={28} strokeWidth={1.5} />
          </button>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button 
            className="pointer-events-auto hover:opacity-80 transition-opacity active:scale-95"
            onClick={() => {
              if (isManager) {
                if (onNavigateManager) onNavigateManager("dashboard", "orders");
                return;
              }
              if (customerMode !== "welcome") {
                 setCustomerMode("welcome");
                 setTableNumber("");
                 setIsJoined(false);
              }
            }}
          >
            <Logo size={isScrolled ? "xs" : "md"} />
          </button>
        </div>

        <div className="flex gap-2 w-12 shrink-0 justify-end z-50">
          {isManager && (
            <button
              onClick={() => {
                if (editMode && props.onEditComplete) {
                  props.onEditComplete();
                } else if (onNavigateManager) {
                  onNavigateManager("dashboard", "orders");
                }
              }}
              className="p-1 sm:p-2 bg-brand-black/5 hover:bg-red-50 text-brand-black/40 hover:text-red-500 rounded-full transition-all active:scale-95 flex items-center justify-center"
              title="Esci dalla modifica"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </header>

      {/* Drawer Menu */}
      {/* Drawer Menu */}
      <Portal><AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-brand-black/40 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-brand-paper shadow-2xl z-[210] flex flex-col pt-10 pb-8 px-5 border-r border-brand-gold/10 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-10 border-b border-brand-black/5 pb-6">
                <Logo size="md" />
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-full hover:bg-brand-black/5 text-brand-black/50 hover:text-brand-black transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Navigation Primary */}
              <div className="flex flex-col gap-3 mb-8">
                {isManager ? (
                  <>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/30 mb-2 ml-1">{t("staffArea", lang)}</h3>
                    <div className="flex flex-col gap-2">
                      {[
                        { view: "dashboard", tab: "orders", label: "Gestione Ordini", icon: ListChecks },
                        { view: "dashboard", tab: "tables", label: "Unione Tavoli", icon: Settings },
                        { view: "dashboard", tab: "menu", label: t("manageMenu", lang), icon: Settings },
                        { view: "dashboard", tab: "categories", label: t("manageCategories", lang), icon: Settings },
                        { view: "dashboard", tab: "customization", label: t("manageExtra", lang), icon: Settings },
                        { view: "dashboard", tab: "crossSelling", label: t("manageCrossSelling", lang), icon: Settings },
                        { view: "dashboard", tab: "stats", label: "Statistiche", icon: Settings },
                        { view: "dashboard", tab: "settings", label: t("settings", lang), icon: Settings },
                      ].map((item) => (
                        <button
                          key={item.tab}
                          onClick={() => {
                            if (onNavigateManager) {
                              onNavigateManager(item.view, item.tab);
                            }
                            setIsDrawerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all bg-white hover:bg-brand-gold/10 text-brand-black/70 hover:text-brand-black border border-brand-black/5`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/30 mb-2 ml-1">{t("navigation", lang)}</h3>
                    
                    <button 
                      onClick={() => { setCustomerMode("menuOnly"); setIsJoined(true); setIsDrawerOpen(false); }} 
                      className={`w-full text-left p-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${customerMode === "menuOnly" ? "bg-brand-gold text-brand-black shadow-lg" : "bg-white hover:bg-brand-gold/10 text-brand-black/70 hover:text-brand-black border border-brand-black/5"}`}
                    >
                      {t("viewMenuBtn", lang)}
                    </button>
                    {customerOrdersSettings.allowTableOrders !== false && (
                      <button 
                        onClick={() => { setCustomerMode("orderTable"); setIsDrawerOpen(false); }} 
                        className={`w-full text-left p-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${customerMode === "orderTable" ? "bg-brand-black text-brand-gold shadow-lg" : "bg-white hover:bg-brand-gold/10 text-brand-black/70 hover:text-brand-black border border-brand-black/5"}`}
                      >
                        {t("orderTableBtn", lang)}
                      </button>
                    )}
                    {customerOrdersSettings.allowTakeawayOrders !== false && (
                      <button 
                        onClick={() => { setCustomerMode("takeaway"); setIsDrawerOpen(false); }} 
                        className={`w-full text-left p-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${customerMode === "takeaway" ? "bg-brand-black text-brand-gold shadow-lg" : "bg-white hover:bg-brand-gold/10 text-brand-black/70 hover:text-brand-black border border-brand-black/5"}`}
                      >
                        {t("takeawayBtn", lang)}
                      </button>
                    )}
                    {(!customerOrdersSettings || customerOrdersSettings.allowCallWaiter !== false) && (customerMode === "menuOnly" || customerMode === "orderTable") && (
                      <button 
                        onClick={() => { setShowCallWaiterModal(true); setIsDrawerOpen(false); }} 
                        className={`w-full text-left p-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${showCallWaiterModal ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-white hover:bg-amber-50 text-brand-black/70 hover:text-amber-900 border border-brand-black/5"}`}
                      >
                        {t("callWaiterBtn", lang)}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Language Selector inside Drawer */}
              {setLang && (
                <div className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/30 mb-4 ml-1">{t("selectLanguage", lang) || "Language"}</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { code: "it", label: "IT" },
                      { code: "en", label: "EN" },
                      { code: "de", label: "DE" },
                      { code: "fr", label: "FR" },
                    ].map((l) => (
                      <button
                        key={l.code}
                        onClick={() => setLang(l.code as Language)}
                        className={`py-3 rounded-xl font-black transition-all border text-xs ${lang === l.code ? "bg-brand-black text-brand-gold border-brand-black shadow-md scale-105" : "bg-white text-brand-black/50 border-brand-black/5 hover:border-brand-gold/50 hover:text-brand-black"}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto space-y-3 pt-6 border-t border-brand-black/5">
                <button 
                  onClick={() => { setShowAllergensFAQ(true); setIsDrawerOpen(false); }} 
                  className="w-full text-left p-4 rounded-2xl bg-brand-gold/10 text-brand-black/80 hover:bg-brand-gold hover:text-brand-black transition-colors font-black uppercase tracking-widest text-xs flex items-center justify-between"
                >
                  {t("allergensFAQ", lang)} <Info size={16} />
                </button>
                
                {onOpenAdmin && (
                  <button 
                    onClick={() => { onOpenAdmin(); setIsDrawerOpen(false); }} 
                    className="w-full text-left p-4 rounded-2xl bg-brand-black/5 text-brand-black/40 hover:text-brand-black transition-colors font-black uppercase tracking-widest text-[10px] flex items-center justify-between mb-4"
                  >
                    {t("staffArea", lang)} <Settings size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence></Portal>

      {/* Call Waiter Modal */}
      <Portal><AnimatePresence>
        {showCallWaiterModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!checkingTable && !callWaiterSent) setShowCallWaiterModal(false); }}
              className="fixed inset-0 bg-brand-black/60 backdrop-blur-md z-[300]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-[15%] md:left-1/2 md:-ml-[160px] md:w-[320px] bg-brand-paper rounded-[2.5rem] shadow-2xl z-[310] overflow-hidden border border-brand-gold/30"
            >
              <div className="p-8 flex flex-col items-center text-center relative">
                <button
                  onClick={() => setShowCallWaiterModal(false)}
                  disabled={checkingTable || callWaiterSent}
                  className="absolute top-6 right-6 p-2 bg-brand-black/5 hover:bg-brand-black/10 rounded-full transition-colors text-brand-black/40 hover:text-brand-black z-10"
                >
                  <X size={20} />
                </button>
                <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mb-6 text-brand-gold">
                  <Menu size={32} />
                </div>
                
                <h3 className="text-xl font-serif font-black mb-2 text-brand-black">
                  {t("callWaiterBtn", lang)}
                </h3>
                <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-8 leading-relaxed">
                  {t("callWaiterLabel", lang)}
                </p>

                <div className="w-full space-y-4">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      disabled={callWaiterSent || checkingTable}
                      value={callWaiterTable}
                      onChange={(e) => setCallWaiterTable(e.target.value)}
                      placeholder={t("callWaiterPlaceholder", lang)}
                      className="w-full text-center py-5 px-6 bg-white border-2 border-brand-black/5 rounded-2xl focus:border-brand-gold outline-none font-black text-2xl text-brand-black transition-all shadow-inner"
                    />
                    {!callWaiterTable && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 font-black text-2xl">
                        #
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCallWaiter}
                    disabled={checkingTable || callWaiterSent || !callWaiterTable || waiterCooldownRemaining > 0}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none ${
                        callWaiterSent ? "bg-green-600 text-white" :
                        waiterCooldownRemaining > 0 ? "bg-brand-black/10 text-brand-black" :
                        "bg-brand-gold text-brand-black"
                    }`}
                  >
                    {checkingTable ? t("verify", lang) : 
                     callWaiterSent ? t("callSent", lang) : 
                     waiterCooldownRemaining > 0 ? `ATTENDI ${Math.ceil(waiterCooldownRemaining / 60)} MIN` :
                     t("callWaiterSend", lang)}
                  </button>

                  <button
                    onClick={() => setShowCallWaiterModal(false)}
                    disabled={checkingTable || callWaiterSent}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/40 hover:text-brand-black transition-colors"
                  >
                    {t("cancel", lang)}
                  </button>
                </div>
                
                {tableError && (
                  <p className="mt-4 text-red-500 text-xs font-black uppercase tracking-wider bg-red-50 px-4 py-2 rounded-lg">
                    {tableError}
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence></Portal>

      {(!isJoined && ["welcome", "orderTable", "takeaway", "callWaiterForm"].includes(customerMode)) && (
        <div className="bg-brand-paper px-5 py-8 mx-2.5 my-5 rounded-[2.5rem] shadow-2xl shadow-brand-black/5 border border-brand-gold/20 flex flex-col gap-4">
          <div className="flex justify-center mb-2 mt-2">
            <Logo size="lg" />
          </div>
          {isManager ? (
            <>
              <h2 className="text-2xl font-serif text-center font-bold mb-4">Nuovo Ordine</h2>
              <button onClick={() => setCustomerMode("orderTable")} className="p-4 mb-3 bg-white border border-brand-black/10 text-brand-black rounded-2xl font-black uppercase tracking-widest hover:bg-brand-paper hover:scale-[1.02] active:scale-95 transition-all shadow-sm">Ordina dal Tavolo</button>
              <button onClick={() => setCustomerMode("takeaway")} className="p-4 mb-3 bg-white border border-brand-black/10 text-brand-black rounded-2xl font-black uppercase tracking-widest hover:bg-brand-paper hover:scale-[1.02] active:scale-95 transition-all shadow-sm">Asporto</button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-serif text-center font-bold mb-4 mt-2">{t("welcome", lang)}</h2>
              <button onClick={() => { setCustomerMode("menuOnly"); setIsJoined(true); }} className="p-4 mb-8 bg-white border border-brand-black/10 text-brand-black rounded-2xl font-black uppercase tracking-widest hover:bg-brand-paper hover:scale-[1.02] active:scale-95 transition-all shadow-sm">{t("viewMenuBtn", lang)}</button>
              {(!customerOrdersSettings || customerOrdersSettings.allowTableOrders) && (
                <button onClick={() => setCustomerMode("orderTable")} className="p-4 mb-3 bg-white border border-brand-black/10 text-brand-black rounded-2xl font-black uppercase tracking-widest hover:bg-brand-paper hover:scale-[1.02] active:scale-95 transition-all shadow-sm">{t("orderTableBtn", lang)}</button>
              )}
              {(!customerOrdersSettings || customerOrdersSettings.allowTakeawayOrders) && (
                <>
                  <button onClick={() => setCustomerMode("takeaway")} className="p-4 mb-3 bg-white border border-brand-black/10 text-brand-black rounded-2xl font-black uppercase tracking-widest hover:bg-brand-paper hover:scale-[1.02] active:scale-95 transition-all shadow-sm">{t("takeawayBtn", lang)}</button>
                  <div className="h-px bg-brand-black/5 my-4" />
                  <button onClick={() => { setCustomerMode("takeaway"); setRecoveryError(""); }} className="p-4 bg-brand-paper border border-brand-black/10 text-brand-black/60 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-brand-black/5 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <ClipboardList size={16} /> {t("recoverOrderBtn", lang)}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer Informazioni / Contatti */}
      {!isJoined && !isManager && customerMode === 'welcome' && (
        <div className="px-5 pb-10 flex flex-col gap-10 text-center text-brand-black w-full max-w-sm mx-auto opacity-90">
          {/* Address */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-brand-gold/40 flex items-center justify-center bg-brand-gold/10 text-brand-gold-dark shadow-inner">
              <MapPin size={24} />
            </div>
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] opacity-50">{t("whereWeAre", lang)}</h3>
            <p className="font-serif text-lg leading-tight">Via Milo, 72019<br/>San Vito dei Normanni (BR)</p>
          </div>

          {/* Opening Hours moved to the end */}

          {/* Socials */}
          <div className="flex flex-col items-center gap-3">
            <h3 className="font-black uppercase tracking-[0.2em] text-[10px] opacity-50">{t("followUs", lang)}</h3>
            <div className="flex gap-4">
              <a href="https://www.facebook.com/gigliolaenotecasalumeria/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center bg-brand-black text-brand-gold rounded-full hover:bg-brand-gold hover:text-brand-black shadow-lg transition-all active:scale-95">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/gigliola_enotecasalumeria/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center bg-brand-black text-brand-gold rounded-full hover:bg-brand-gold hover:text-brand-black shadow-lg transition-all active:scale-95">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Reviews Link */}
          <div className="mt-2 text-brand-black w-full px-2">
            <a href="https://g.page/r/CVIqEMmh_uKJEAE/review" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 bg-white hover:bg-brand-paper hover:scale-[1.02] active:scale-95 transition-all py-6 px-4 rounded-[2rem] border border-brand-black/5 shadow-xl select-none">
              <div className="flex gap-1.5 text-amber-400 drop-shadow-sm">
                <Star size={24} fill="currentColor" />
                <Star size={24} fill="currentColor" />
                <Star size={24} fill="currentColor" />
                <Star size={24} fill="currentColor" />
                <Star size={24} fill="currentColor" />
              </div>
              <h3 className="font-black uppercase tracking-[0.1em] text-[11px] opacity-70 mt-1 px-4 leading-relaxed">{t("leaveReview", lang)}</h3>
            </a>
          </div>

          {/* Opening Hours */}
          <div className="w-full mt-6 flex flex-col items-center">
            <div className="w-full max-w-sm bg-white p-6 rounded-[2rem] border border-brand-black/5 shadow-xl flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full border-2 border-brand-gold flex items-center justify-center bg-brand-gold/10 text-brand-gold-dark shadow-inner">
                <Clock size={28} />
              </div>
              <h3 className="font-black uppercase tracking-[0.2em] text-[12px] text-brand-black">{t("openingHours", lang)}</h3>
              {takeawayHours ? (
                <div className="flex flex-col gap-2 w-full mt-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                    const config = takeawayHours[day];
                    if (!config) return null;
                    const dayNames: any = {
                      mon: "Lunedì", tue: "Martedì", wed: "Mercoledì", 
                      thu: "Giovedì", fri: "Venerdì", sat: "Sabato", sun: "Domenica"
                    };
                    const isToday = new Date().getDay() === (day === 'sun' ? 0 : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day) + 1);
                    return (
                      <div key={day} className={`flex justify-between py-2 border-b border-brand-black/10 last:border-0 items-start ${isToday ? 'bg-brand-gold/5 -mx-4 px-4 rounded-lg border-b-0' : ''}`}>
                        <span className={`font-black uppercase tracking-widest text-[11px] mt-0.5 ${isToday ? 'text-brand-gold-dark' : 'opacity-60'}`}>{dayNames[day]}</span>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-bold text-[14px] ${isToday ? 'text-brand-black' : 'text-brand-black/80'}`}>{config.closed ? "CHIUSO" : `${config.open} - ${config.close}`}</span>
                          {!config.closed && config.openAfternoon && config.closeAfternoon && (
                            <span className={`font-bold text-[14px] ${isToday ? 'text-brand-black' : 'text-brand-black/80'}`}>{`${config.openAfternoon} - ${config.closeAfternoon}`}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm font-bold opacity-50 italic py-4">Orari non disponibili</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Portal><AnimatePresence>
        {!isJoined && customerMode === "callWaiterForm" && !isManager && (
          <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-4 bg-brand-black/40 backdrop-blur-sm">
            <motion.div initial={{y: 100, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: 100, opacity: 0}} className="bg-brand-paper p-8 rounded-[2.5rem] shadow-2xl relative w-full max-w-md mx-auto">
              <button onClick={() => setCustomerMode("welcome")} className="absolute top-6 right-6 opacity-30 hover:opacity-100 z-10"><X size={24}/></button>
            <label className="block text-center text-xs font-black mb-6 uppercase tracking-[0.2em] opacity-40">
              {t("callWaiterLabel", lang)}
            </label>
            <div className="flex flex-col gap-4">
               <input
                 type="number"
                 min="1"
                 max="10"
                 disabled={callWaiterSent}
                 value={callWaiterTable}
                 onChange={(e) => setCallWaiterTable(e.target.value)}
                 placeholder={t("callWaiterPlaceholder", lang)}
                 className="w-full text-center p-5 bg-white border border-brand-gold/30 rounded-2xl focus:border-brand-gold outline-none font-bold text-brand-black placeholder:opacity-30 transition-all text-lg shadow-inner"
               />
               <button
                 onClick={handleCallWaiter}
                 disabled={checkingTable || callWaiterSent || !callWaiterTable || waiterCooldownRemaining > 0}
                 className={`px-6 py-5 mt-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 ${
                     callWaiterSent ? "bg-green-600 text-white" : 
                     waiterCooldownRemaining > 0 ? "bg-brand-black/10 text-brand-black" :
                     "bg-amber-500 text-brand-black"
                 }`}
               >
                 {checkingTable ? t("verify", lang) : 
                  callWaiterSent ? t("callSent", lang) : 
                  waiterCooldownRemaining > 0 ? `ATTENDI ${Math.ceil(waiterCooldownRemaining / 60)} MIN` :
                  t("callWaiterSend", lang)}
               </button>
               {tableError && <p className="text-red-500 text-center text-sm font-bold mt-2">{tableError}</p>}
            </div>
             </motion.div>
           </motion.div>
         )}
      </AnimatePresence></Portal>

      {/* Takeaway Order Form */}
      <Portal><AnimatePresence>
       {(!isJoined || (customerMode === "takeaway" && (!customerName || (!isManager && (!customerLastName || !customerPhone)) || !takeawayTime))) && customerMode === "takeaway" && !(isManager && editMode) && (
         <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 z-50 overflow-y-auto pt-10 pb-20 px-4 bg-brand-black/40 backdrop-blur-sm">
           <motion.div initial={{y: 50, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: 50, opacity: 0}} className="flex flex-col gap-6 w-full max-w-md mx-auto relative">
             <div className="bg-brand-paper p-8 rounded-[2.5rem] shadow-2xl relative">
               <button 
                 onClick={() => {
                   setCustomerMode("welcome");
                   setTableError("");
                 }} 
                 className="absolute top-6 right-6 p-2 bg-brand-black/5 hover:bg-brand-black/10 rounded-full transition-colors text-brand-black/40 hover:text-brand-black z-10"
               >
                 <X size={20}/>
               </button>

             {isManager && (
               <button 
                 onClick={() => setCustomerMode("orderTable")} 
                 className="mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/40 flex items-center gap-2 hover:text-brand-gold transition-colors"
               >
                 <ArrowRightLeft size={14}/> Passa ad Ordine al Tavolo
               </button>
             )}

             <div className="flex flex-col items-center text-center mb-8">
               <div className="w-12 h-12 bg-brand-gold/10 rounded-full flex items-center justify-center mb-4 text-brand-gold">
                 <Download size={24} className="rotate-180" />
               </div>
               <h3 className="font-serif text-2xl font-black text-brand-black mb-1">
                 {isManager ? t("newStaffTakeaway", lang) : t("takeawayLabel", lang)}
               </h3>
               <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                 {isManager ? t("enterTakeawayDetails", lang) : t("completeDetails", lang)}
               </p>
             </div>

             <div className="flex flex-col gap-4">
                <div className="space-y-4">
                   <div className="relative group">
                     <input
                       type="text"
                       placeholder={isManager ? "Nome Cliente" : t("firstName", lang)}
                       value={customerName}
                       onChange={(e) => setCustomerName(e.target.value)}
                       className="w-full text-center p-5 bg-white border-2 border-brand-black/5 rounded-2xl focus:border-brand-gold outline-none font-bold text-brand-black placeholder:opacity-30 transition-all text-lg shadow-inner"
                     />
                   </div>

                   {!isManager && (
                     <>
                       <div className="relative group">
                         <input
                           type="text"
                           placeholder={t("lastName", lang)}
                           value={customerLastName}
                           onChange={(e) => setCustomerLastName(e.target.value)}
                           className="w-full text-center p-5 bg-white border-2 border-brand-black/5 rounded-2xl focus:border-brand-gold outline-none font-bold text-brand-black placeholder:opacity-30 transition-all text-lg shadow-inner"
                         />
                       </div>
                       <div className="relative group">
                         <input
                           type="tel"
                           placeholder={t("phone", lang)}
                           value={customerPhone}
                           onChange={(e) => setCustomerPhone(e.target.value)}
                           className="w-full text-center p-5 bg-white border-2 border-brand-black/5 rounded-2xl focus:border-brand-gold outline-none font-bold text-brand-black placeholder:opacity-30 transition-all text-lg shadow-inner"
                         />
                       </div>
                     </>
                   )}

                   <div className="bg-brand-paper/50 p-6 rounded-3xl border border-brand-black/5 flex flex-col items-center gap-3">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t("pickupTime", lang)}</span>
                     <input
                       type="time"
                       value={takeawayTime}
                       min={minTakeawayTimeStr}
                       onChange={(e) => setTakeawayTime(e.target.value)}
                       className="w-full text-center p-4 bg-white border-2 border-brand-gold/20 rounded-2xl focus:border-brand-gold outline-none font-black text-brand-black text-3xl font-mono shadow-inner tracking-wider"
                     />
                   </div>
                </div>

                {isManager && (
                  <div className="mt-4 pt-6 border-t border-brand-black/5">
                    <label className="block text-center text-[10px] font-black mb-3 uppercase tracking-[0.2em] opacity-40">
                      {t("waiterLabel", lang)}
                    </label>
                    <div className="relative">
                      <select
                        value={managerWaiter}
                        onChange={(e) => setManagerWaiter(e.target.value)}
                        className="w-full text-center p-5 bg-white border-2 border-brand-gold/10 rounded-2xl focus:border-brand-gold outline-none font-black text-brand-black shadow-inner appearance-none pr-10"
                      >
                        <option value="">{t("operatorSelect", lang)}</option>
                        <option value="Francesco">Francesco</option>
                        <option value="Annarita">Annarita</option>
                        <option value="Marcello">Marcello</option>
                        <option value="Beatrice">Beatrice</option>
                        <option value="Samuele">Samuele</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTakeawayConfirm}
                  className="bg-brand-black text-brand-gold w-full py-5 mt-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all border border-brand-gold/10"
                >
                  {isManager ? t("openMenuCommand", lang) : t("takeawayConfirmBtn", lang)}
                </button>

                {tableError && (
                  <motion.p 
                    initial={{opacity: 0, y: -10}} 
                    animate={{opacity: 1, y: 0}} 
                    className="text-red-500 text-center text-[10px] font-black uppercase tracking-widest mt-4 bg-red-50 py-3 rounded-xl border border-red-100"
                  >
                    ⚠️ {tableError}
                  </motion.p>
                )}
             </div>
           </div>

           {!isManager && (
             <div className="bg-brand-paper p-8 rounded-[2.5rem] shadow-2xl border border-brand-black/5">
               <div className="flex items-center gap-3 mb-6">
                 <ClipboardList size={20} className="text-brand-black opacity-30" />
                 <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">
                   {t("alreadyOrdered", lang)}
                 </h4>
               </div>
               <div className="flex flex-col gap-4">
                 <input
                   type="text"
                   placeholder={t("orderName", lang)}
                   value={recoveryName}
                   onChange={(e) => setRecoveryName(e.target.value)}
                   className="w-full text-center p-4 bg-white border border-brand-black/5 rounded-2xl focus:border-brand-gold outline-none font-bold text-brand-black placeholder:opacity-30 transition-all text-sm"
                 />
                 <input
                   type="number"
                   placeholder={t("pickupCode4", lang)}
                   value={recoveryCode}
                   onChange={(e) => setRecoveryCode(e.target.value)}
                   className="w-full text-center p-4 bg-white border border-brand-black/5 rounded-2xl focus:border-brand-gold outline-none font-black text-brand-black placeholder:opacity-30 font-mono transition-all text-xl tracking-widest"
                 />
                 <button
                   onClick={handleRecoverOrder}
                   disabled={isRecovering}
                   className="bg-brand-gold text-brand-black w-full py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-[11px] shadow-lg active:scale-95 transition-all disabled:opacity-50"
                 >
                   {isRecovering ? t("searching", lang) : t("recoverOrderStatus", lang)}
                 </button>
                 {recoveryError && <p className="text-red-500 text-center text-[10px] font-black uppercase tracking-widest mt-2">{recoveryError}</p>}
                </div>
              </div>
            )}
           </motion.div>
         </motion.div>
       )}
      </AnimatePresence></Portal>

      <Portal><AnimatePresence>
        {recoveredOrder && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/40 backdrop-blur-sm">
                <div className="bg-brand-paper p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative">
                   <button onClick={() => { setRecoveredOrder(null); setRecoveredOrderId(null); }} className="absolute top-6 right-6 opacity-50 hover:opacity-100"><X size={24}/></button>
                   <div className="text-center">
                      <div className="w-16 h-16 bg-brand-gold/20 text-brand-gold-dark rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardList size={32} />
                      </div>
                      <h3 className="font-logo text-2xl mb-2">Stato Ordine</h3>
                      <p className="font-serif italic opacity-70 mb-6 text-brand-gold-dark">Codice: {recoveredOrder.takeawayCode || recoveredOrder.id.slice(-4).toUpperCase()}</p>
                      
                      <div className={`p-4 rounded-full font-black uppercase tracking-widest text-sm mb-6 ${recoveredOrder.status === 'pending' ? 'bg-amber-100 text-amber-800' : recoveredOrder.status === 'preparing' ? 'bg-brand-gold/30 text-brand-gold-dark' : recoveredOrder.status === 'paid' ? 'bg-brand-black text-brand-gold' : 'bg-green-100 text-green-800'}`}>
                         {recoveredOrder.status === 'pending' ? t("processing", lang) : recoveredOrder.status === 'preparing' ? t("preparingU", lang) : recoveredOrder.status === 'paid' ? "Pagato" : recoveredOrder.status === 'served' ? t("readyForPickup", lang) : recoveredOrder.status}
                      </div>

                      <div className="text-left bg-brand-paper p-4 rounded-2xl">
                         <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">{t("details", lang)}</h4>
                         {recoveredOrder.items?.map((item: any, i: number) => (
                            <div key={i} className="text-sm font-bold flex justify-between mb-1">
                               <span>{item.quantity}x {item.name}</span>
                               <span>€ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                         ))}
                         <div className="mt-3 pt-2 border-t border-brand-black/10 flex justify-between font-black">
                            <span>Totale</span>
                            <span>€ {recoveredOrder.total?.toFixed(2)}</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}
      </AnimatePresence></Portal>

      <Portal><AnimatePresence>
      {(!isJoined || (customerMode === "orderTable" && !tableNumber)) && customerMode === "orderTable" && !(isManager && editMode) && (
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 z-50 flex flex-col justify-center items-center p-4 bg-brand-black/40 backdrop-blur-sm">
          <motion.div initial={{y: 50, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: 50, opacity: 0}} className="bg-brand-paper p-8 rounded-[2.5rem] shadow-2xl relative w-full max-w-sm mt-auto mb-auto">
             <button 
               onClick={() => {
                 setCustomerMode("welcome");
                 setTableError("");
                 if (props.onCancel) props.onCancel();
               }} 
               className="absolute top-4 right-4 p-3 bg-brand-black/5 hover:bg-brand-black/10 rounded-full transition-colors text-brand-black/60 hover:text-brand-black z-[100]"
             >
               <X size={20}/>
             </button>
          {isManager && (
            <button 
              onClick={() => setCustomerMode("takeaway")} 
              className="mb-6 text-xs font-black uppercase tracking-widest opacity-50 flex items-center gap-2 hover:opacity-100 transition-opacity"
            >
              <ArrowRightLeft size={14}/> Passa ad Ordine da Asporto
            </button>
          )}
          <label className="block text-center text-xs font-black mb-6 uppercase tracking-[0.2em] opacity-40">
            {t("tableNumber", lang)}
          </label>
          <div className="flex flex-col gap-4">
            <input
              id="table-input"
              type="number"
              min="1"
              max="10"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder={t("callWaiterPlaceholder", lang)}
              className="w-full text-center p-5 bg-white border border-brand-gold/30 rounded-2xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none text-2xl font-serif italic text-brand-black placeholder:opacity-30 shadow-inner transition-all"
              onFocus={() => setTableError("")}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleTableConfirm();
              }}
            />
            {isManager && (
              <>
                <label className="block text-center text-xs font-black mt-4 mb-2 uppercase tracking-[0.2em] opacity-40">
                  {t("waiterLabel", lang)}
                </label>
                <select
                  value={managerWaiter}
                  onChange={(e) => setManagerWaiter(e.target.value)}
                  className="w-full text-center p-5 bg-white border border-brand-gold/30 rounded-2xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none font-bold text-brand-black placeholder:opacity-30 shadow-inner transition-all appearance-none"
                  onFocus={() => setTableError("")}
                >
                  <option value="">{t("operatorSelect", lang)}</option>
                  <option value="Francesco">Francesco</option>
                  <option value="Annarita">Annarita</option>
                  <option value="Marcello">Marcello</option>
                  <option value="Beatrice">Beatrice</option>
                  <option value="Samuele">Samuele</option>
                  <option value="Admin">Admin</option>
                </select>
              </>
            )}
            <button
              onClick={handleTableConfirm}
              disabled={checkingTable}
              className="bg-brand-black text-brand-gold px-6 py-5 mt-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {checkingTable ? t("verify", lang) : t("confirm", lang)}
            </button>
            {tableError && (
              <p className="text-red-500 text-center text-sm font-bold mt-2">
                {tableError}
              </p>
            )}
          </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence></Portal>
      
      <Portal><AnimatePresence>
        {isJoined && customerMode === "takeaway" && isTakeawayClosed && !isManager && !closedWarningDismissed && (
          <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-brand-black/40 backdrop-blur-sm">
            <motion.div initial={{y: 50, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: 50, opacity: 0}} className="bg-red-600 text-white p-6 rounded-3xl shadow-2xl flex flex-col gap-4 border-2 border-red-400 relative max-w-sm w-full">
              <button 
                onClick={() => setClosedWarningDismissed(true)} 
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Chiudi"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 pr-8">
                <Info size={24} className="shrink-0" />
                <h3 className="font-black uppercase tracking-widest text-sm">Locale Chiuso per Asporto</h3>
              </div>
              <p className="text-xs font-medium leading-relaxed opacity-90">
                Siamo spiacenti, gli ordini da asporto non rientrano negli orari di apertura per l'orario richiesto. Puoi inserire i prodotti nel carrello, ma per proseguire dovrai modificare l'orario di ritiro (min. {minTakeawayTimeStr}).
              </p>
              <button 
                onClick={() => { setCustomerMode("takeaway"); setIsJoined(false); setTableNumber(""); }}
                className="bg-white text-red-600 font-bold uppercase text-xs py-3 rounded-xl mt-1 tracking-widest active:scale-95 transition-all"
              >
                Modifica Orario
              </button>
              
              <div className="bg-black/20 rounded-2xl p-4 text-[10px]">
                {takeawayHours && ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                  const config = takeawayHours[day];
                  if (!config) return null;
                  const dayNames: any = {
                    mon: "Lun", tue: "Mar", wed: "Mer", 
                    thu: "Gio", fri: "Ven", sat: "Sab", sun: "Dom"
                  };
                  return (
                    <div key={day} className="flex justify-between py-1.5 border-b border-white/10 last:border-0 items-start">
                      <span className="font-bold uppercase opacity-60 mt-0.5">{dayNames[day]}</span>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-black">{config.closed ? "CHIUSO" : `${config.open} - ${config.close}`}</span>
                        {!config.closed && config.openAfternoon && config.closeAfternoon && (
                            <span className="font-black">{`${config.openAfternoon} - ${config.closeAfternoon}`}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></Portal>

      {isJoined && (
        <div className="space-y-12">
          {customerMode === "takeaway" ? (
            <div className="flex justify-between items-center bg-brand-black text-brand-gold p-4 sm:p-5 rounded-2xl shadow-xl mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-black tracking-widest opacity-60 leading-none mb-1">
                  Ordine da Asporto
                  {isManager && <span className="ml-1">• {localStorage.getItem("waiter") || t("unknown", lang)}</span>}
                </span>
                <span className="font-bold text-sm leading-none opacity-90">
                  {customerName} {customerLastName}
                </span>
                {customerPhone && (
                  <span className="font-bold text-sm leading-none opacity-90">
                    Tel: {customerPhone}
                  </span>
                )}
                <span className="text-xl font-black leading-none mt-1">
                  Ritiro: {takeawayTime}
                </span>
              </div>
              {(!editMode || !isManager) && (
                <button
                  onClick={() => {
                    setIsJoined(false);
                    setCustomerMode("takeaway");
                  }}
                  className="text-[10px] font-black uppercase tracking-widest bg-brand-gold text-brand-black px-4 py-2 rounded-full shadow-lg active:scale-95 transition-all hover:scale-105 shrink-0 ml-2"
                >
                  Modifica Dati
                </button>
              )}
            </div>
          ) : customerMode !== "menuOnly" ? (
            <div className="flex justify-between items-center bg-brand-black text-brand-gold p-4 sm:p-5 rounded-2xl shadow-xl mt-2">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black tracking-widest opacity-60 leading-none mb-1">
                  {t("tableNumber", lang)}
                  {isManager && <span className="ml-1">• {localStorage.getItem("waiter") || t("unknown", lang)}</span>}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-2xl font-black leading-none">
                    {getActiveTableLabel()}
                  </span>
                  {tableNumber !== getActiveTableNumber() && (
                    <span className="bg-brand-gold text-brand-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                      Unito al {getActiveTableNumber()}
                    </span>
                  )}
                </div>
              </div>
              {(!editMode || !isManager) && (
                <button
                  onClick={() => {
                    setTableNumber("");
                    setCustomerMode("orderTable");
                    setIsJoined(false);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest bg-brand-gold text-brand-black px-4 py-2 rounded-full shadow-lg active:scale-95 transition-all hover:scale-105"
                >
                  {t("changeTable", lang)}
                </button>
              )}
            </div>
          ) : null}

          {!isManager && myActiveOrders.length > 0 && (
            <div className="bg-brand-gold/10 border-2 border-brand-gold/40 rounded-2xl p-5 mb-8">
              <h3 className="text-xl font-serif font-black text-brand-black mb-3">
                {t("activeOrders", lang)}
              </h3>
              <div className="space-y-4">
                {myActiveOrders
                  .map((o) => (
                    <div
                      key={o.id}
                      className="bg-white p-4 rounded-xl shadow-sm border border-brand-black/5"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-brand-black/60">
                          Ordine {o.id.slice(-4).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-full ${o.status === "pending" ? "bg-amber-100 text-amber-800" : o.status === "preparing" ? "bg-brand-gold/20 text-brand-gold-dark" : o.status === "paid" ? "bg-brand-black text-brand-gold" : "bg-green-100 text-green-800"}`}
                        >
                          {o.status === "pending"
                            ? t("pendingU", lang)
                            : o.status === "preparing"
                              ? t("preparingU", lang)
                              : o.status === "paid"
                                ? t("paidArchived", lang)
                                : t("servedU", lang)}
                        </span>
                      </div>
                      <ul className="text-sm font-medium opacity-80 space-y-1">
                        {o.items.map((item: any, i: number) => (
                          <li key={i}>
                            <div className="flex justify-between">
                              <span>
                                {item.quantity}x {item.name}
                              </span>
                              <span>
                                €{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                            {item.subItems && item.subItems.length > 0 && (
                              <div className="pl-4 mt-1 text-xs opacity-70">
                                {item.subItems.map((si: any, j: number) => (
                                  <div key={j} className="flex justify-between">
                                    <span>- {si.name}</span>
                                    <span>€{si.price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.notes && (
                              <div className="pl-4 mt-1 text-[10px] font-mono opacity-60 leading-tight">
                                {item.notes}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-4 border-t border-brand-black/10 flex flex-col gap-4">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Totale</span>
                          <span className="font-mono font-black text-2xl text-brand-black">
                            €{o.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-2 w-full">
                          {o.status === "pending" && (
                            <button
                              onClick={() => {
                                setIsCartOpen(false);
                                document.getElementById('category-navigation')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="flex-1 justify-center text-[11px] font-black uppercase tracking-widest bg-brand-paper border border-brand-black/10 text-brand-black px-3 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-all"
                            >
                              <Plus size={14} /> Aggiungi
                            </button>
                          )}
                          <button
                            onClick={() => generateReceiptPDF(o)}
                            className="flex-1 justify-center text-[11px] font-black uppercase tracking-widest bg-brand-black text-brand-gold px-3 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-all"
                          >
                            <Download size={14} /> {t("receiptPdf", lang)}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {customerMode !== "menuOnly" && (
            <p className="font-serif italic text-center opacity-40 mb-6 mt-4">
              {t("orderFromTable", lang)}
            </p>
          )}

          {isManager && (
            <div className="flex justify-center mt-4 mb-2">
              <button
                onClick={openCustomItemModal}
                className="bg-brand-gold text-brand-black px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 flex items-center gap-2"
              >
                <Plus size={16} /> {t("addCustomBtn", lang)}
              </button>
            </div>
          )}

          {/* Search Bar */}
          {(isManager || customerMode !== "menuOnly") && (
            <div className={`relative px-1 ${isScrolled ? "hidden" : "mb-6"}`}>
              <div className={`flex items-center bg-white border ${searchFocused ? "border-brand-gold shadow-md" : "border-brand-black/10 shadow-sm"} rounded-2xl px-4 py-3 transition-all relative z-40`}>
                <Search size={20} className="text-brand-black/40 min-w-5 mr-3" />
                <input 
                  type="text" 
                  placeholder={t("searchProducts", lang)} 
                  className="w-full bg-transparent outline-none text-brand-black font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-brand-black/40 hover:text-brand-black p-1 ml-2">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search Suggestions Dropdown */}
              <AnimatePresence>
                {searchFocused && searchQuery.trim() && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-brand-black/10 rounded-2xl shadow-xl z-50 max-h-[300px] overflow-y-auto"
                  >
                    {searchResults.length > 0 ? (
                      <div className="flex flex-col py-2">
                        {searchResults.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSearchQuery("");
                              setSearchFocused(false);
                              openProductModal(p);
                            }}
                            className="flex flex-col text-left px-5 py-3 hover:bg-brand-paper transition-all active:bg-brand-black/5 border-b border-brand-black/5 last:border-0"
                          >
                            <span className="font-bold text-brand-black text-base">{p.name[lang] || p.name.it}</span>
                            <span className="text-brand-black/40 text-[10px] uppercase font-black tracking-widest mt-0.5">{p.category[lang] || p.category.it}</span>
                            <span className="text-brand-black/70 text-sm mt-1 font-medium">€ {p.price.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 py-6 text-center text-brand-black/40 text-sm italic font-bold">
                        {t("noProductsFound", lang)}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Combined Sticky Navigation */}
          <div id="category-navigation" className={`sticky z-30 bg-brand-paper/95 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-brand-black/5 shadow-sm flex flex-col transition-all duration-300 ${
            isScrolled 
              ? "top-[52px] pt-1 pb-1 gap-1 mb-2" 
              : "top-[90px] pt-4 pb-6 gap-6 mb-10"
          }`}>            
            {/* Macro Categories - 2 Lines Grid */}
            <div className={`grid grid-cols-2 transition-all duration-300 ${isScrolled ? "gap-1" : "gap-3 sm:gap-4"}`}>
              {availableMacros.map(macro => (
                <button
                  key={macro}
                  onClick={() => {
                    setActiveMacroCategory(macro);
                    const firstCat = categoriesOriginal.find(c => getMacroCategory(c.it) === macro);
                    if (firstCat) {
                      setActiveCategory(firstCat.local);
                      setTimeout(() => {
                        document
                          .getElementById(`category-${firstCat.local.replace(/\s+/g, "-")}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }
                  }}
                  className={`relative px-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all text-center border ${
                    isScrolled ? "py-1" : "py-3.5"
                  } ${
                    activeMacroCategory === macro
                      ? "bg-brand-black text-brand-gold border-brand-black shadow-md"
                      : "bg-white text-brand-black/40 border-brand-black/10 hover:border-brand-gold hover:text-brand-black/80"
                  }`}
                >
                  {t(({
                    "Food & Sfizi": "macroFood",
                    "Piatti & Specialità": "macroDishes",
                    "Cantina": "macroWine",
                    "Bar & Cafè": "macroBar",
                    "Extra / Altro": "macroExtra"
                  } as any)[macro] || "macroExtra", lang)}
                  {activeMacroCategory === macro && (
                    <motion.div 
                      layoutId="macro-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gold"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Sub-Category Navigation - Dropdown */}
            {activeCategoriesOriginal.length > 0 && (
              <div className={`relative flex justify-center transition-all duration-300 ${isScrolled ? "mt-0" : "mt-1"}`}>
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="inline-flex min-w-[200px] items-center justify-between gap-4 px-5 py-2.5 bg-white border border-brand-black/5 hover:border-brand-gold/30 rounded-xl text-sm font-black tracking-wide text-brand-black shadow-sm transition-all active:scale-[0.98]"
                >
                  <span className="truncate flex items-center gap-2">
                    <ListChecks size={18} className="text-brand-gold" />
                    {activeCategory || t("viewCategories", lang)}
                  </span>
                  <ChevronDown size={18} className={`transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180 text-brand-gold' : 'opacity-40'}`} />
                </button>

                <Portal><AnimatePresence>
                  {showCategoryDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 bg-black/5" 
                        onClick={() => setShowCategoryDropdown(false)} 
                      />
                    </>
                  )}
                </AnimatePresence></Portal>
              </div>
            )}
          </div>

          {allCategories.map((cat) => (
            <section
              key={cat}
              id={`category-${cat.replace(/\s+/g, "-")}`}
              className="mb-10 scroll-mt-[190px]"
            >
              <h2 className="font-logo text-4xl mb-2 text-brand-black px-1 border-b-[3px] border-brand-gold pb-3">
                {cat}
              </h2>
              {(cat.includes("Vini") ||
                cat.includes("Wines") ||
                cat.includes("Weine") ||
                cat.includes("Vino") ||
                cat.includes("Wine") ||
                cat.includes("Wein") ||
                cat.includes("Cantina") ||
                cat.includes("Cellar") ||
                cat.includes("Weinkeller") ||
                cat.includes("Bollicine") ||
                cat.includes("Bubbles") ||
                cat.includes("Schaumwein") ||
                cat.includes("Prosecchi") ||
                cat.includes("Prosecco") ||
                cat.includes("Proseccos")) && (
                <p className="text-[17px] font-serif italic text-brand-black/70 px-1 mb-6 leading-relaxed">
                  {t("wineNotice", lang) || "Questa è solo una breve selezione dei nostri vini consigliati. Essendo in Enoteca, abbiamo un'ampia scelta a scaffale, da poter prendere e stuzzicare!"}
                </p>
              )}
              <div className="grid grid-cols-1 gap-6 sm:gap-8">
                {products
                  .filter((p) => (p.category[lang] || p.category.it) === cat)
                  .map((product) => (
                    <div
                      key={product.id}
                      className="group bg-white p-6 sm:p-8 rounded-[2.5rem] border border-brand-black/[0.03] shadow-sm hover:shadow-elegant transition-all duration-500 relative"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-serif text-[22px] tracking-wide text-brand-black flex-1">
                            {product.name[lang] || product.name.it}
                          </h3>
                          <div className="text-right flex flex-col items-end shrink-0 pt-0.5">
                            <span className="font-mono font-black text-[17px] tracking-wide text-brand-gold-dark whitespace-nowrap">
                              {product.category.it.includes("Puglia Bowl")
                                ? "da € 8.50"
                                : product.isPricePerKg
                                  ? `€ ${product.price.toFixed(2)} / KG`
                                : product.price === 0
                                  ? t("aPeso", lang) || "A peso"
                                : `€ ${product.price.toFixed(2)}${product.category.it === "Le Formule Aperitivo" ? ` / ${t("person", lang)}` : ""}`}
                            </span>
                          </div>
                        </div>

                        {(product.description[lang] || product.description.it) && (
                          <p className="text-[14px] font-sans text-brand-black/60 leading-relaxed font-normal mt-1 mb-1">
                            {product.description[lang] || product.description.it}
                          </p>
                        )}

                        {!product.available && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold uppercase tracking-wider w-fit mb-2 mt-1">
                            <X size={12} /> {t("soldOut", lang) || "Esaurito"}
                          </div>
                        )}
                        
                        <div className="mt-1 flex flex-row items-end sm:items-center justify-between gap-3">
                          {product.allergens && product.allergens.length > 0 ? (
                            <div className="flex flex-row items-center gap-1.5 flex-wrap flex-1">
                              {product.allergens.map((alg) => (
                                <div
                                  key={alg}
                                  className="w-8 h-8 relative bg-brand-paper border border-brand-black/5 rounded-xl flex items-center justify-center text-[18px] shadow-sm hover:border-brand-gold hover:shadow-md transition-all group/alg cursor-pointer"
                                  {...allergenInteraction.handlers(alg)}
                                >
                                  <span className="group-hover/alg:scale-110 transition-transform">
                                    {allergenIcons[alg] || "⚠️"}
                                  </span>
                                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none transition-opacity bg-brand-black text-brand-gold text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl whitespace-nowrap z-20 ${allergenInteraction.activeTooltip === alg ? 'opacity-100' : 'opacity-0 md:group-hover/alg:opacity-100'}`}>
                                    {alg}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-brand-black"></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <div className="flex-1" />}

                          <div className="flex justify-end shrink-0 ml-auto">
                            {customerMode !== "menuOnly" && (
                              <button
                                onClick={() => product.available ? openProductModal(product) : null}
                                disabled={!product.available}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all focus:outline-none active:scale-95 shrink-0 ${
                                    product.available 
                                    ? "bg-brand-black text-brand-gold shadow-lg shadow-brand-black/10 hover:bg-brand-gold hover:text-brand-black" 
                                    : "bg-black/5 text-black/20 cursor-not-allowed shadow-none"
                                }`}
                              >
                                <Plus size={16} strokeWidth={3} />
                                <span className="hidden sm:inline">{t("addToCart", lang) || t("addToCart", lang)}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Product Modal */}
      <Portal><AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-brand-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white text-brand-black w-full max-w-md max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border border-brand-gold/10 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {isCustomizing ? (
                  <div className="flex flex-col gap-6 py-4">
                    <div className="bg-brand-black text-brand-gold p-6 rounded-3xl shadow-xl">
                      <h4 className="font-logo text-2xl uppercase tracking-wider mb-1">Crea il tuo piatto</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Personalizza ingredienti ed extra</p>
                    </div>

                    <div className="space-y-6">
                      {/* Ingredienti da togliere */}
                      {inferredBaseIngredients.length > 0 && (
                        <div className="bg-brand-paper/50 p-6 rounded-[2.5rem] border border-brand-black/5 shadow-sm">
                          <h5 className="font-black text-[11px] uppercase tracking-widest text-brand-black/60 mb-5 flex items-center gap-2">
                            <span className="w-5 h-5 bg-brand-black text-brand-gold rounded-full flex items-center justify-center text-[9px]">1</span>
                            Cosa vuoi togliere?
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {inferredBaseIngredients.map(ing => (
                              <button
                                key={ing.name}
                                onClick={() => handleIngredientRemovalToggle(ing.name)}
                                className={`px-4 py-3 rounded-2xl text-xs font-bold border transition-all ${
                                  removedIngredients.includes(ing.name)
                                    ? "bg-red-500 text-white border-red-600 shadow-md scale-95"
                                    : "bg-white text-brand-black/70 border-brand-black/5 hover:border-red-200"
                                }`}
                              >
                                {removedIngredients.includes(ing.name) ? `SENZA ${ing.name}` : ing.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sostituzioni via nota */}
                      <div className="bg-brand-paper/50 p-6 rounded-[2.5rem] border border-brand-black/5 shadow-sm">
                        <h5 className="font-black text-[11px] uppercase tracking-widest text-brand-black/60 mb-5 flex items-center gap-2">
                          <span className="w-5 h-5 bg-brand-black text-brand-gold rounded-full flex items-center justify-center text-[9px]">2</span>
                          Sostituzioni (Gratis)
                        </h5>
                        <p className="text-[10px] opacity-50 px-2 leading-tight mb-3 italic">
                          Es: "Invece del cotto metti il crudo"
                        </p>
                        <textarea
                          value={manualSubstitution}
                          onChange={(e) => setManualSubstitution(e.target.value)}
                          placeholder="Scrivi qui la tua richiesta..."
                          className="w-full bg-white p-4 rounded-3xl border border-brand-black/10 text-sm font-bold resize-none h-24 focus:border-brand-gold outline-none shadow-sm"
                        />
                      </div>

                      {/* Extra */}
                      {relevantExtras.length > 0 && (
                        <div className="bg-brand-paper/50 p-6 rounded-[2.5rem] border border-brand-black/5 shadow-sm">
                          <h5 className="font-black text-[11px] uppercase tracking-widest text-brand-black/60 mb-5 flex items-center gap-2">
                            <span className="w-5 h-5 bg-brand-black text-brand-gold rounded-full flex items-center justify-center text-[9px]">3</span>
                            {t("manualExtrasTitle", lang)}
                          </h5>
                          <div className="flex flex-col gap-3">
                            {Object.entries(
                              relevantExtras.reduce((acc: Record<string, Extra[]>, extra) => {
                                const cat = extra.category ? extra.category.trim() : 'Varie';
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(extra);
                                return acc;
                              }, {} as Record<string, Extra[]>)
                            ).map(([categoryName, extrasInCatAny]) => {
                              const extrasInCat = extrasInCatAny as Extra[];
                              const selectedCount = extrasInCat.filter(e => selectedExtras.some(sel => sel.id === e.id)).length;
                              return (
                                <div key={categoryName} className="bg-white rounded-2xl border border-brand-black/10 overflow-hidden shadow-sm">
                                  <button
                                    onClick={() => setExpandedExtraCategory(prev => prev === categoryName ? null : categoryName)}
                                    className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-brand-gold/10 transition-colors"
                                  >
                                    <span className="font-black text-sm uppercase tracking-wide text-brand-black/80">
                                      {categoryName} <span className="opacity-50 font-medium normal-case text-xs ml-1">({selectedCount > 0 ? `${selectedCount} sel.` : `${extrasInCat.length} opzioni`})</span>
                                    </span>
                                    <ChevronDown
                                      size={18}
                                      className={`text-brand-gold transition-transform duration-300 ${expandedExtraCategory === categoryName ? 'rotate-180' : ''}`}
                                    />
                                  </button>
                                  <AnimatePresence>
                                    {expandedExtraCategory === categoryName && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-brand-black/5"
                                      >
                                        <div className="p-4 flex flex-wrap gap-2 bg-brand-paper/30">
                                          {extrasInCat.map(extra => (
                                            <button
                                              key={extra.id}
                                              onClick={() => handleCustomizationToggle(extra)}
                                              className={`px-4 py-3 rounded-2xl text-xs font-bold border transition-all ${
                                                selectedExtras.some(e => e.id === extra.id)
                                                  ? "bg-brand-black text-brand-gold border-brand-black shadow-md scale-95"
                                                  : "bg-white text-brand-black/70 border-brand-black/10 hover:border-brand-gold"
                                              }`}
                                            >
                                              {extra.name} {extra.price > 0 ? `(+€${extra.price.toFixed(2)})` : ''}
                                            </button>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        {selectedProduct.allergens && selectedProduct.allergens.length > 0 && (
                          <div className="flex flex-row items-center justify-center gap-1.5 flex-wrap mb-4">
                            {selectedProduct.allergens.map((alg) => (
                              <div
                                key={alg}
                                className="w-8 h-8 relative bg-brand-gold/10 text-brand-gold-dark border border-brand-gold/30 rounded-full flex items-center justify-center text-[16px] shadow-sm hover:scale-110 transition-all cursor-pointer group/alg"
                                {...allergenInteraction.handlers(alg)}
                              >
                                <span>{allergenIcons[alg] || "⚠️"}</span>
                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none transition-opacity bg-brand-black text-brand-gold text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl whitespace-nowrap z-20 ${allergenInteraction.activeTooltip === alg ? 'opacity-100' : 'opacity-0 md:group-hover/alg:opacity-100'}`}>
                                  {alg}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-brand-black"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <h3 className="font-serif text-[28px] leading-tight mb-2 text-center">
                          {selectedProduct.name[lang] || selectedProduct.name.it}
                        </h3>
                        <p className="text-[15px] font-sans text-brand-black/60 leading-relaxed font-normal mb-2 text-center">
                          {selectedProduct.description[lang] || selectedProduct.description.it}
                        </p>
                        <div className="text-center mb-4">
                          <span className="font-mono font-black text-2xl text-brand-gold-dark">
                            {selectedProduct.isPricePerKg
                              ? `€ ${computedPrice.toFixed(2)} / KG`
                              : computedPrice === 0
                              ? t("aPeso", lang) || "A peso"
                              : `€ ${computedPrice.toFixed(2)}${selectedProduct.category.it === "Le Formule Aperitivo" ? ` / ${t("person", lang)}` : ""}`}
                          </span>
                        </div>
                      </div>

                      {selectedProduct.category.it.includes("Puglia Bowl") ? (
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                              {t("sizeLabel", lang)}
                            </label>
                            <select
                              value={bowlSize}
                              onChange={(e) => setBowlSize(e.target.value)}
                              className="w-full bg-white p-4 rounded-xl border border-brand-black/10 focus:border-brand-gold outline-none font-bold"
                            >
                              <option value="Piccola (Light) - € 8,50">
                                Piccola (Light) - € 8,50
                              </option>
                              <option value="Media (Standard) - € 10,50">
                                Media (Standard) - € 10,50
                              </option>
                              <option value="Grande (Extra) - € 12,50">
                                Grande (Extra) - € 12,50
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                              {t("baseLabel", lang)}
                            </label>
                            <select
                              value={bowlBase}
                              onChange={(e) => { setBowlBase(e.target.value); if(e.target.value) setBowlError(""); }}
                              className={`w-full p-4 rounded-xl border outline-none font-medium transition-all ${bowlError && !bowlBase && bowlError.includes("Base") ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/20" : "bg-white border-brand-black/10 focus:border-brand-gold"}`}
                            >
                              <option value="">{t("selectPlaceholder", lang)}</option>
                              <option value="Frisa Salentina spezzettata">
                                Frisa Salentina spezzettata
                              </option>
                              <option value="Crostoni di pane tostato">
                                Crostoni di pane tostato
                              </option>
                            </select>
                          </div>
                          {selectedProduct.name.it.includes("Componibile") && (
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Salume (es. Prosciutto crudo...)"
                                value={bowlSalume}
                                onChange={(e) => setBowlSalume(e.target.value)}
                                className="w-full bg-white p-4 rounded-xl border border-brand-black/10 focus:border-brand-gold outline-none text-sm font-bold"
                              />
                              <input
                                type="text"
                                placeholder="Formaggio (es. Stracciatella...)"
                                value={bowlFormaggio}
                                onChange={(e) => setBowlFormaggio(e.target.value)}
                                className="w-full bg-white p-4 rounded-xl border border-brand-black/10 focus:border-brand-gold outline-none text-sm font-bold"
                              />
                              <input
                                type="text"
                                placeholder="Verdura (es. Rucola...)"
                                value={bowlContorno}
                                onChange={(e) => setBowlContorno(e.target.value)}
                                className="w-full bg-white p-4 rounded-xl border border-brand-black/10 focus:border-brand-gold outline-none text-sm font-bold"
                              />
                            </div>
                          )}
                        </div>
                      ) : selectedProduct.category.it === "Le Formule Aperitivo" ? (
                        <div className="flex flex-col gap-3">
                          <label className="block text-[10px] font-black uppercase tracking-widest opacity-40">
                            {t("chooseDrink", lang) || "Scegli la tua bevanda"}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(selectedProduct.name.it === "Aperitivo Alcolico"
                              ? ALCOHOLIC_OPTIONS
                              : NON_ALCOHOLIC_OPTIONS
                            ).map((opt) => (
                              <button
                                key={opt}
                                onClick={() => { setItemNote(opt); setBowlError(""); }}
                                className={`px-4 py-3 rounded-2xl text-xs border transition-all ${
                                  itemNote === opt
                                    ? "bg-brand-black text-brand-gold border-brand-black shadow-md font-black"
                                    : bowlError && !itemNote && bowlError.includes("bevanda") ? "bg-red-50 text-red-700 border-red-500 font-bold ring-2 ring-red-500/20" : "bg-white text-brand-black/60 border-brand-black/10 hover:border-brand-gold font-bold"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : selectedProduct.name.it.toLowerCase().includes("focaccia farcita") ? (
                        <div className="flex flex-col gap-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest opacity-40">Configura Focaccia</label>
                          <div className={`space-y-3 p-3 rounded-2xl transition-all ${bowlError && bowlError.includes("Focaccia") ? "bg-red-50 ring-2 ring-red-500/20" : ""}`}>
                            <input
                              type="text"
                              placeholder={t("whichSalume", lang)}
                              value={bowlSalume}
                              onChange={(e) => { setBowlSalume(e.target.value); setItemNote(""); setBowlError(""); }}
                              className={`w-full bg-white p-4 rounded-xl border focus:border-brand-gold outline-none text-sm font-bold shadow-sm transition-all ${bowlError && bowlError.includes("Focaccia") ? "border-red-500 text-red-700 placeholder-red-300" : "border-brand-black/10"}`}
                            />
                            <input
                              type="text"
                              placeholder={t("whichCheese", lang)}
                              value={bowlFormaggio}
                              onChange={(e) => { setBowlFormaggio(e.target.value); setItemNote(""); setBowlError(""); }}
                              className={`w-full bg-white p-4 rounded-xl border focus:border-brand-gold outline-none text-sm font-bold shadow-sm transition-all ${bowlError && bowlError.includes("Focaccia") ? "border-red-500 text-red-700 placeholder-red-300" : "border-brand-black/10"}`}
                            />
                            <button
                              onClick={() => {
                                setBowlSalume("");
                                setBowlFormaggio("");
                                setItemNote("vuota");
                                setBowlError("");
                              }}
                              className={`w-full py-3 rounded-xl text-xs font-black uppercase border transition-all ${
                                itemNote === "vuota" && !bowlSalume && !bowlFormaggio
                                  ? "bg-brand-black text-brand-gold border-brand-black shadow-md"
                                  : "bg-white text-brand-black/40 border-brand-black/5 hover:border-brand-black/20"
                              }`}
                            >
                              Senza niente (vuota)
                            </button>
                          </div>
                        </div>
                      ) : selectedProduct.options && selectedProduct.options.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          <label className="block text-[10px] font-black uppercase tracking-widest opacity-40">Seleziona opzione</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => { setItemNote(opt); setBowlError(""); }}
                                className={`px-4 py-3 rounded-2xl text-xs border transition-all ${
                                  itemNote === opt
                                    ? "bg-brand-black text-brand-gold border-brand-black shadow-md font-black"
                                    : bowlError && !itemNote && bowlError.includes("opzione") ? "bg-red-50 text-red-700 border-red-500 font-bold ring-2 ring-red-500/20" : "bg-white text-brand-black/60 border-brand-black/10 hover:border-brand-gold font-bold"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : selectedProduct.requiresWeight && (
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest opacity-40">Peso desiderato</label>
                          <input
                            type="text"
                            placeholder={t("weightPlaceholder", lang)}
                            value={weightInfo}
                            onChange={(e) => { setWeightInfo(e.target.value); if(e.target.value) setBowlError(""); }}
                            className={`w-full p-4 rounded-xl border outline-none font-bold text-sm shadow-sm transition-all ${bowlError && !weightInfo && (bowlError.includes("peso") || bowlError.includes("porzione")) ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/20" : "bg-white border-brand-black/10 focus:border-brand-gold"}`}
                          />
                        </div>
                      )}

                      {!isCustomizing && 
                       !selectedProduct.category.it.includes("Le Formule Aperitivo") && 
                       !selectedProduct.category.it.includes("Puglia Bowl") && (
                        <button
                          onClick={() => setIsCustomizing(true)}
                          className="w-full py-5 mt-4 bg-brand-gold/10 text-brand-gold-dark border-2 border-brand-gold/30 border-dashed rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-brand-gold/20 transition-all active:scale-[0.98]"
                        >
                          <ArrowRightLeft size={16} />
                          Personalizza ed Extra
                        </button>
                      )}

                      <div className="pt-4 space-y-3">
                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40">
                          {t("notes", lang) || t("generalNotes", lang)}
                        </label>
                        <textarea
                          rows={2}
                          placeholder={t("specialRequestsPlaceholder", lang)}
                          value={specialRequest}
                          onChange={(e) => setSpecialRequest(e.target.value)}
                          className="w-full bg-brand-paper p-5 rounded-3xl border border-brand-black/5 text-sm italic focus:border-brand-gold outline-none resize-none shadow-inner"
                        ></textarea>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Modal */}
              <div className="p-6 sm:p-8 pt-4 sm:pt-6 border-t border-brand-black/5 bg-white shrink-0">
                {isCustomizing ? (
                  <button
                    onClick={() => setIsCustomizing(false)}
                    className="w-full py-6 bg-brand-black text-brand-gold font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-center"
                  >
                    Fatto e continua
                  </button>
                ) : (
                  <>
                    {(selectedExtras.length > 0 || removedIngredients.length > 0 || manualSubstitution || Object.keys(substitutions).length > 0) && (
                      <div className="mb-6 p-4 bg-brand-gold/10 rounded-2xl border border-brand-gold/30">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-black/60 mb-2">Riepilogo Personalizzazioni</h4>
                        <ul className="text-sm font-medium opacity-80 leading-snug space-y-1">
                          {selectedExtras.map(e => (
                            <li key={e.name}>+ {e.name} {e.price > 0 ? `(+€${(e.price || 0).toFixed(2)})` : ''}</li>
                          ))}
                          {removedIngredients.map(ing => (
                            <li key={ing} className="line-through text-red-500/80">- Senza {ing}</li>
                          ))}
                          {Object.entries(substitutions).map(([original, newIng]) => {
                            const newIngAny = newIng as any;
                            return (
                              <li key={original}>↔ {original} sostituito con {newIngAny.name} ({(newIngAny.priceDiff > 0 ? '+' : '') + (newIngAny.priceDiff || 0).toFixed(2)}€)</li>
                            );
                          })}
                          {manualSubstitution && (
                            <li>↔ {manualSubstitution.original} sostituito con {manualSubstitution.new} (+€{(manualSubstitution.price || 0).toFixed(2)})</li>
                          )}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-col gap-6 mb-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center shrink-0 gap-3 sm:gap-5 bg-brand-paper py-2 sm:py-3 px-3 sm:px-4 rounded-full border border-brand-black/5 shadow-inner">
                          <button
                            onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-full shadow-md text-brand-black active:scale-90 transition-transform"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-5 sm:w-6 text-center font-black text-xl sm:text-2xl">{itemQuantity}</span>
                          <button
                            onClick={() => setItemQuantity(itemQuantity + 1)}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-brand-black text-brand-gold rounded-full shadow-md active:scale-90 transition-transform"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center items-end gap-0 sm:gap-2 shrink-0">
                          <span className="text-[10px] font-black uppercase opacity-40 tracking-widest whitespace-nowrap">Totale</span>
                          <span className="font-mono font-black text-2xl sm:text-3xl text-brand-black whitespace-nowrap">
                            €{(computedPrice * itemQuantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {bowlError && (
                      <div className="mb-4 text-red-500 text-xs font-black uppercase tracking-wider text-center bg-red-50 py-3 px-4 rounded-xl border border-red-100 flex items-center justify-center gap-2">
                        <span>⚠️</span> {bowlError}
                      </div>
                    )}
                    <div className="flex gap-4">
                      <button
                        onClick={cancelProductModal}
                        className="flex-1 py-5 text-[12px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all text-center"
                      >
                        {t("cancel", lang) || "Annulla"}
                      </button>
                      {customerMode !== "menuOnly" && (
                        <button
                          onClick={confirmAddToCart}
                          className="flex-[3] py-6 bg-brand-black text-brand-gold font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:scale-[1.03] active:scale-95 transition-all text-center border border-brand-gold/20"
                        >
                          {customerEditingIndex !== null ? "Aggiorna Scelte" : (t("addToCart", lang) || "Aggiungi")}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></Portal>

      {/* Custom Item Modal */}
      <Portal><AnimatePresence>
        {isCustomItemOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-brand-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-brand-paper w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-[2.5rem] overflow-hidden shadow-2xl relative"
            >
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <button
                  onClick={() => setIsCustomItemOpen(false)}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-brand-black/5 hover:bg-brand-black/10 rounded-full transition-colors text-brand-black/40"
                >
                  <X size={20} />
                </button>
                <h3 className="font-logo text-3xl mb-6 text-brand-black">
                  {t("addCustomTitle", lang)}
                </h3>

                <div className="mb-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                    {t("customNameLabel", lang)}
                  </label>
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder={t("customNamePlaceholder", lang)}
                    className="w-full bg-brand-black/5 p-4 rounded-xl border-none outline-none font-bold"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                    {t("customPriceLabel", lang)}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    placeholder="es. 15.00"
                    className="w-full bg-brand-black/5 p-4 rounded-xl border-none outline-none font-bold"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                    {t("customNoteLabel", lang)}
                  </label>
                  <input
                    type="text"
                    value={customItemNote}
                    onChange={(e) => setCustomItemNote(e.target.value)}
                    placeholder="es. Modifica fatta dal gestore"
                    className="w-full bg-brand-black/5 p-3 rounded-xl border-none outline-none text-sm"
                  />
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-white border-t border-brand-black/5 flex flex-col gap-3">
                <button
                  onClick={() => {
                    addCustomItemToCart();
                    setIsCustomItemOpen(false);
                  }}
                  disabled={!customItemName.trim()}
                  className="w-full bg-brand-black text-brand-gold px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {customerEditingIndex !== null ? "Aggiorna Scelte" : t("addAndClose", lang)}
                </button>
                {customerEditingIndex === null && (
                  <button
                    onClick={() => {
                      addCustomItemToCart();
                      // Clear the inputs but leave the modal open
                      setCustomItemName("");
                      setCustomItemPrice("");
                      setCustomItemNote("");
                    }}
                    disabled={!customItemName.trim()}
                    className="w-full bg-brand-gold/20 text-brand-gold-dark px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-inner active:scale-95 transition-all disabled:opacity-50"
                  >
                    {t("addAndNext", lang)}
                  </button>
                )}
                <button
                  onClick={() => setIsCustomItemOpen(false)}
                  className="mt-2 text-brand-black/40 text-[10px] uppercase font-black tracking-widest"
                >
                  {t("cancel", lang)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></Portal>

      {isOrderingBlocked && (
        <div className="fixed bottom-24 sm:bottom-32 left-4 right-4 z-50">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-black text-brand-gold p-5 rounded-3xl shadow-elegant border border-brand-gold/20 flex items-center gap-4 max-w-md mx-auto"
          >
            <div className="w-10 h-10 bg-brand-gold/10 rounded-full flex items-center justify-center shrink-0">
               <Info className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Status Ordine</p>
               <p className="text-[12px] font-medium leading-relaxed opacity-90">
                 Il tuo ordine è in preparazione. Potrai ordinare altri piatti non appena lo staff avrà effettuato la consegna.
               </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cart FAB & Modal */}
      <Portal><AnimatePresence>
        {cart.length > 0 && !isCartOpen && (customerMode === "orderTable" || customerMode === "takeaway" || editMode) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center z-40 pointer-events-none"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="pointer-events-auto bg-brand-black text-brand-gold px-8 py-4 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center justify-between gap-6 border border-brand-gold/20 hover:scale-105 active:scale-95 transition-all w-[90%] max-w-sm"
            >
              <div className="flex items-center gap-3">
                <div className="bg-brand-gold/20 p-2 rounded-full">
                  <ShoppingCart size={20} />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] uppercase font-black tracking-widest opacity-60 leading-none mb-1">
                    {editMode ? "Modifica Ordine" : (t("yourOrder", lang) || "Carrello")}
                  </span>
                  <span className="font-serif text-lg italic leading-none">
                    {cart.length} {t("items", lang) || "prodotti"}
                  </span>
                </div>
              </div>
              <div className="text-xl font-mono font-black">€ {total.toFixed(2)}</div>
            </button>
          </motion.div>
        )}
      </AnimatePresence></Portal>

      <Portal><AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-brand-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-brand-black text-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-6 border border-brand-gold/20 safe-bottom max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-brand-gold text-brand-black p-3 rounded-2xl shadow-xl shadow-brand-gold/20">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest opacity-40 mb-1">
                      {editMode ? "Modifica Ordine" : (t("yourOrder", lang) || "Carrello")}
                    </span>
                    <span className="font-serif text-2xl italic leading-none">
                      {cart.length} {t("items", lang) || "prodotti"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-all text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1">
                {cart.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="flex flex-col py-2 border-b border-white/5 last:border-0 pb-4"
                  >
                    <div className="flex justify-between items-start w-full group">
                      <div className="flex-1 pr-4">
                        <button onClick={() => editCustomerCartItem(idx)} className="text-left focus:outline-none">
                          <span className="font-bold text-xl leading-tight block hover:text-brand-gold transition-colors">
                            {item.name}
                          </span>
                          {item.notes && item.notes.replace("[AGGIUNTA]", "").trim() && (
                            <span className="block text-xs text-brand-gold/80 italic mt-1 leading-snug">
                              Note: {item.notes.replace("[AGGIUNTA]", "").trim()}
                            </span>
                          )}
                          <span className="text-[10px] mt-1 font-bold text-brand-gold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                             Modifica scelte 
                          </span>
                        </button>
                        {item.subItems && item.subItems.length > 0 && (
                          <div className="mt-2 pl-2 border-l border-brand-gold/30">
                            {item.subItems.map((si, i) => (
                              <div
                                key={i}
                                className="text-[10px] flex justify-between font-medium opacity-70"
                              >
                                <span>- {si.name}</span>
                                <div>
                                  <span className="mr-2">
                                    € {si.price.toFixed(2)}
                                  </span>
                                  {isManager && (
                                    <button
                                      onClick={() => {
                                        setCart((prev) =>
                                          prev.map((cItem, cIdx) => {
                                            if (cIdx !== idx) return cItem;
                                            const newSub =
                                              cItem.subItems!.filter(
                                                (_, subIdx) => subIdx !== i,
                                              );
                                            const sumSub = newSub.reduce(
                                              (acc, curr) => acc + curr.price,
                                              0,
                                            );
                                            const origPrice =
                                              (cItem as any).originalPrice ??
                                              cItem.price;
                                            return {
                                              ...cItem,
                                              subItems: newSub,
                                              price: origPrice + sumSub,
                                              originalPrice: origPrice,
                                            };
                                          }),
                                        );
                                      }}
                                      className="text-red-500 hover:text-red-400"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] opacity-40 font-mono mt-1 block">
                          € {item.price.toFixed(2)} {products.find(p => p.id === item.productId)?.isPricePerKg ? '/ KG' : '/ cad'}
                        </span>
                        {isManager && (
                          <button
                            onClick={() =>
                              setEditingCartIndex(
                                editingCartIndex === idx ? null : idx,
                              )
                            }
                            className="text-[10px] mt-2 uppercase font-black text-brand-gold underline underline-offset-4"
                          >
                            {editingCartIndex === idx
                              ? "Chiudi Modifica"
                              : "Modifica Prodotto / Extra"}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-lg font-mono font-black text-brand-gold mb-1">
                          € {(item.price * item.quantity).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 p-1 px-2 rounded-2xl border border-white/5">
                          <button
                            onClick={() => removeFromCart(item)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-4 text-center font-black text-sm text-brand-gold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              setCart((prev) =>
                                prev.map((i) =>
                                  i === item
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i,
                                ),
                              );
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    {isManager && editingCartIndex === idx && (
                      <div className="mt-4 bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-gold opacity-80">{t("customNameLabel", lang)}</label>
                          <input 
                            type="text" 
                            value={item.name} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => prev.map((c, i) => i === idx ? { ...c, name: val } : c));
                            }}
                            className="bg-white/10 p-2.5 rounded-lg text-sm outline-none focus:border focus:border-brand-gold text-white"
                          />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-gold opacity-80">Prezzo Unitario Totale (€)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            min="0"
                            value={item.price} 
                            onChange={(e) => {
                              const parseFloatVal = parseFloat(e.target.value);
                              const val = isNaN(parseFloatVal) ? 0 : parseFloatVal;
                              setCart(prev => prev.map((c, i) => i === idx ? { ...c, price: val, originalPrice: val } : c));
                            }}
                            className="bg-white/10 p-2.5 rounded-lg text-sm outline-none focus:border focus:border-brand-gold text-white font-mono"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-gold opacity-80">Note / Ingredienti Esclusi / Extra</label>
                          <textarea 
                            value={item.notes || ""} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => prev.map((c, i) => i === idx ? { ...c, notes: val } : c));
                            }}
                            rows={3}
                            placeholder="Note e modifiche (es. aggiungere Extra, togliere formaggio, ecc.)..."
                            className="bg-white/10 p-2.5 rounded-lg text-sm outline-none focus:border focus:border-brand-gold resize-none text-white leading-relaxed"
                          />
                        </div>

                        <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-gold">
                            {t("addWeightItem", lang)}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={t("weightItemPlaceholder", lang)}
                              value={cartSubItemName}
                              onChange={(e) => setCartSubItemName(e.target.value)}
                              className="flex-[3] min-w-0 bg-white/10 p-2.5 rounded-lg text-xs outline-none focus:border focus:border-brand-gold text-white"
                            />
                            <input
                              type="number"
                              placeholder="€"
                              min="0"
                              step="0.1"
                              value={cartSubItemPrice}
                              onChange={(e) => setCartSubItemPrice(e.target.value)}
                              className="flex-[1] min-w-0 bg-white/10 p-2.5 rounded-lg text-xs outline-none focus:border focus:border-brand-gold text-white font-mono"
                            />
                            <button
                              onClick={() => {
                                const p = parseFloat(cartSubItemPrice);
                                if (cartSubItemName.trim() && !isNaN(p) && p >= 0) {
                                  setCart((prev) =>
                                    prev.map((cItem, cIdx) => {
                                      if (cIdx !== idx) return cItem;
                                      const newSub = [
                                        ...(cItem.subItems || []),
                                        {
                                          name: cartSubItemName.trim(),
                                          price: p,
                                        },
                                      ];
                                      const sumSub = newSub.reduce((acc, curr) => acc + curr.price, 0);
                                      const origPrice = (cItem as any).originalPrice ?? cItem.price;
                                      return {
                                        ...cItem,
                                        subItems: newSub,
                                        price: origPrice + sumSub,
                                        originalPrice: origPrice,
                                      };
                                    }),
                                  );
                                  setCartSubItemName("");
                                  setCartSubItemPrice("");
                                }
                              }}
                              className="bg-brand-gold text-brand-black w-10 h-10 flex shrink-0 items-center justify-center rounded-lg shadow-sm hover:bg-brand-gold/80 hover:scale-105 active:scale-95 transition-all"
                            >
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 mt-auto">
                <div className="mb-4">
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:border-brand-gold focus:outline-none resize-none transition-colors"
                    placeholder={
                      t("specialRequests", lang) || "Note per l'ordine..."
                    }
                    rows={1}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="block text-[10px] uppercase font-black tracking-widest opacity-60 mb-1">
                    {editMode ? "Totale Modificato" : t("total", lang)}
                  </span>
                  <span className="text-4xl font-mono font-black text-brand-gold leading-none">
                    € {total.toFixed(2)}
                  </span>
                </div>
                
                {tableError && (
                  <motion.div 
                    initial={{opacity: 0, y: -10}} 
                    animate={{opacity: 1, y: 0}} 
                    className="mb-4 bg-red-600/20 border border-red-500 rounded-2xl p-4 text-center"
                  >
                    <p className="text-red-400 font-bold text-sm leading-tight">{tableError}</p>
                  </motion.div>
                )}

                <button
                  disabled={isSubmitting || isOrderingBlocked}
                  onClick={onConfirmOrder}
                  className="w-full bg-brand-gold text-brand-black font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 disabled:opacity-50 shadow-2xl shadow-brand-gold/10 text-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {isOrderingBlocked ? (
                    "Attendi Consegna"
                  ) : isSubmitting ? (
                    editMode ? "Salvataggio..." : t("sending", lang)
                  ) : (
                    <>
                      {editMode ? <CheckCircle2 size={24} /> : <Send size={24} />}
                      {editMode ? "Salva Modifiche" : t("sendOrder", lang)}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></Portal>

      {orderSent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => { 
            setOrderSent(false); 
            setSentOrderRecap(null);
            if (customerMode === "takeaway" && isJoined) {
               // We don't automatically disconnect here if they close it, they can still view their active orders
            }
          }}
          className="fixed inset-0 flex items-center justify-center p-6 z-[100] bg-brand-black/40 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-brand-black relative text-brand-gold p-8 rounded-[3rem] shadow-2xl text-center max-w-sm border-2 border-brand-gold/30 flex flex-col max-h-[90vh]"
          >
            <button 
              onClick={() => {
                setOrderSent(false);
                setSentOrderRecap(null);
              }}
              className="absolute top-6 right-6 opacity-50 hover:opacity-100 z-10 transition-opacity"
            >
              <X size={24}/>
            </button>
            <div className="w-20 h-20 border-2 border-brand-gold/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-gold/20 shrink-0 mt-2">
              <ClipboardList size={40} />
            </div>
            <h2 className="text-3xl font-logo mb-2 shrink-0">{t("orderSent", lang)}</h2>
            <p className="font-serif italic text-lg opacity-80 mb-6 shrink-0">
              {t("preparingForYou", lang)}
            </p>

            {customerMode === "takeaway" && sentOrderId && !isManager && (
              <div className="bg-brand-gold p-6 rounded-3xl border-2 border-white shadow-2xl mb-6 text-center animate-bounce-slow">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-black/60 mb-2">CODICE RECUPERO ORDINE</p>
                <p className="text-5xl font-mono font-black tracking-widest text-brand-black">{sentOrderId.slice(-4).toUpperCase()}</p>
                <div className="h-px bg-brand-black/10 my-4" />
                <p className="text-[9px] font-bold uppercase tracking-tight text-brand-black/50 leading-tight">
                  Segnati questo codice. Lo trovi sempre qui o premendo "Recupera Ordine" nella Home.
                </p>
                <button 
                  onClick={() => {
                    const code = `${sentOrderId.slice(-4).toUpperCase()}`;
                    const text = `Gigliola Enoteca - Codice Recupero Ordine: ${code}`;
                    if (navigator.share) {
                      navigator.share({ title: 'Gigliola Enoteca', text }).catch(() => {
                        navigator.clipboard.writeText(code).then(() => alert("Codice copiato negli appunti: " + code));
                      });
                    } else {
                      navigator.clipboard.writeText(code).then(() => alert("Codice copiato negli appunti: " + code))
                        .catch(() => alert("Segnati il codice: " + code));
                    }
                  }}
                  className="mt-4 bg-brand-black/10 hover:bg-brand-black/20 text-brand-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Download size={12} /> Salva Codice
                </button>
              </div>
            )}
            
            {/* Recap */}
            {sentOrderRecap && sentOrderRecap.length > 0 && (
              <div className="mb-8 overflow-y-auto min-h-0 text-left bg-brand-gold/5 rounded-2xl p-4 border border-brand-gold/10">
                 <h3 className="text-xs font-black uppercase tracking-widest text-brand-gold/60 mb-3 text-center">RIEPILOGO ORDINE INVIATO</h3>
                 <div className="space-y-3">
                    {sentOrderRecap.map((item, i) => (
                      <div key={i} className="text-sm">
                         <div className="flex justify-between font-bold">
                            <span>{item.quantity}x {item.name}</span>
                            <span>€ {(item.price * item.quantity).toFixed(2)}</span>
                         </div>
                         {item.notes && item.notes.replace("[AGGIUNTA]", "").trim() && <div className="text-[10px] italic opacity-70">Note: {item.notes.replace("[AGGIUNTA]", "").trim()}</div>}
                         {item.subItems && item.subItems.length > 0 && (
                           <div className="mt-1 pl-2 border-l border-brand-gold/20 text-[10px] opacity-70">
                              {item.subItems.map((si: any, j: number) => (
                                 <div key={j}>- {si.name}</div>
                              ))}
                           </div>
                         )}
                      </div>
                    ))}
                 </div>
                 <div className="mt-4 pt-3 border-t border-brand-gold/20 flex justify-between font-black uppercase tracking-widest text-sm">
                    <span>{t("total", lang)}</span>
                    <span>€ {sentOrderRecap.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toFixed(2)}</span>
                 </div>
              </div>
            )}
            
            <button 
              onClick={() => { 
                setOrderSent(false); 
                setSentOrderRecap(null);
                if (customerMode === "takeaway") {
                  setCustomerMode("welcome");
                  setIsJoined(false);
                  setTableNumber("");
                }
              }}
              className="mt-auto shrink-0 w-full bg-brand-gold text-brand-black px-6 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
            >
              {customerMode === "takeaway" ? "Torna alla Home" : "Ok"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Cross-Sell Modal */}
      <Portal><AnimatePresence>
        {isCrossSellModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-brand-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-paper w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col items-center"
            >
              <h3 className="font-logo text-3xl mb-4 text-center text-brand-black">
                Sei sicuro di aver preso tutto?
              </h3>
              <p className="opacity-60 text-sm mb-6 text-center">
                Dai un'occhiata qui:
              </p>
              
              <div className="flex flex-col gap-4 w-full mb-8">
                {crossSellSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="bg-white p-4 rounded-3xl border border-brand-black/10 flex items-center justify-between shadow-sm">
                    <div>
                      <h4 className="font-bold text-lg text-brand-black">{suggestion.name[lang] || suggestion.name.it}</h4>
                      <p className="font-mono text-brand-gold-dark font-black">€ {suggestion.price.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => {
                        addCrossSellItem(suggestion);
                      }}
                      className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
                        cart.some(item => item.productId === suggestion.id)
                          ? "bg-brand-gold text-brand-black scale-95 opacity-50"
                          : "bg-brand-black text-brand-gold hover:scale-105 active:scale-95 shadow-lg"
                      }`}
                    >
                      {cart.some(item => item.productId === suggestion.id) ? "Aggiunto!" : t("addToCart", lang)}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={onConfirmCrossSell}
                  className="w-full py-5 bg-brand-black text-brand-gold rounded-full font-black uppercase tracking-widest text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Conferma e Invia Ordine
                </button>
                
                <button
                  onClick={() => {
                    setIsCrossSellModalOpen(false);
                  }}
                  className="w-full py-4 text-brand-black/40 hover:text-brand-black font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft size={14} /> Torna all'ordine / Modifica
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></Portal>

      {/* Allergens FAQ Modal */}
      <Portal><AnimatePresence>
        {showAllergensFAQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-brand-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-paper w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setShowAllergensFAQ(false)}
                className="absolute top-6 right-6 p-2 rounded-full border border-brand-black/10 hover:bg-brand-black hover:text-brand-gold transition-all"
              >
                <X size={20} />
              </button>
              <h2 className="font-logo text-3xl mb-6 text-brand-black">{t("allergensFAQ", lang)}</h2>
              <div className="overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(allergenIcons).map(([name, icon]) => (
                  <div key={name} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-brand-black/5 shadow-sm">
                    <div className="w-10 h-10 flex items-center justify-center bg-brand-gold/10 text-brand-gold-dark rounded-full text-xl shadow-inner border border-brand-gold/30">
                      {icon}
                    </div>
                    <span className="font-bold text-sm tracking-wide text-brand-black">{name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></Portal>

      {/* Category Dropdown Modal */}
      <Portal><AnimatePresence>
        {showCategoryDropdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-brand-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => setShowCategoryDropdown(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-paper w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-brand-black/5"
            >
              <div className="p-4 sm:p-6 border-b border-brand-black/5 bg-white/50 flex items-center justify-between">
                <h3 className="font-black text-sm uppercase tracking-widest text-brand-black">{t("otherCategories", lang)}</h3>
                <button onClick={() => setShowCategoryDropdown(false)} className="p-2 -mr-2 text-brand-black/40 hover:text-brand-black bg-brand-black/5 hover:bg-brand-black/10 rounded-full transition-colors relative z-10">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-4 pb-12 sm:pb-6 flex flex-col gap-3">
                {activeCategoriesOriginal.map(catObj => (
                  <button
                    key={catObj.local}
                    onClick={() => {
                      setActiveCategory(catObj.local);
                      document
                        .getElementById(`category-${catObj.local.replace(/\s+/g, "-")}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      setShowCategoryDropdown(false);
                    }}
                    className={`p-4 sm:p-5 rounded-2xl text-left font-black text-base uppercase tracking-widest transition-all ${
                      activeCategory === catObj.local 
                        ? "bg-brand-gold text-brand-black shadow-md scale-[1.02]" 
                        : "bg-white text-brand-black/60 border border-brand-black/5 hover:border-brand-gold hover:text-brand-black scale-100"
                    }`}
                  >
                    {catObj.local}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></Portal>

      {/* Floating Call Waiter Button */}
      {(!customerOrdersSettings || customerOrdersSettings.allowCallWaiter !== false) && (customerMode === "menuOnly" || customerMode === "orderTable") && !editMode && !isManager && (
        <button
          onClick={() => setShowCallWaiterModal(true)}
          className={`fixed right-4 z-[45] bg-brand-gold text-brand-black w-14 h-14 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.3)] flex items-center justify-center active:scale-95 transition-all outline outline-4 outline-white hover:scale-105 ${
            cart.length > 0 && (customerMode === "orderTable" || customerMode === "takeaway") 
              ? "bottom-[calc(6rem+env(safe-area-inset-bottom))]" 
              : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
          }`}
          title={t("callWaiterBtn", lang)}
        >
          <Bell size={24} />
        </button>
      )}
    </div>
  </PullToRefresh>
);
}

