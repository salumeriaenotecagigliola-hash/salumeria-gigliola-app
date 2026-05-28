import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where,
  limit,
  getDoc,
  deleteField
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { getMenu } from "../lib/menuService";
import { generateReceiptPdfBlob, generateFullOrderReceiptPdf } from "../lib/pdfExport";
import { Order, OrderStatus, Language } from "../types";
import CustomizationManager from "./CustomizationManager";
import CrossSellingManager from "./CrossSellingManager";
import CategoryManager from "./CategoryManager";
import MenuManager from "./MenuManager";
import {
  CheckCircle2,
  Truck,
  Receipt,
  Trash2,
  XCircle,
  ClipboardList,
  Plus,
  Coins,
  Split,
  ListChecks,
  ChevronDown,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Menu,
  X,
  Edit2,
  Edit,
  Share2,
  Lock as LockIcon,
  CreditCard,
  Landmark,
  Download
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../lib/i18n";
import { LogoG } from "./Logo";
import CustomerInterface from "./CustomerInterface";
import PullToRefresh from "./PullToRefresh";

interface Props {
  lang: Language;
  user?: any;
  onLogout?: () => void;
  minPrepTime?: number;
  onUpdateMinPrepTime?: (val: number) => void;
}

export default function ManagerInterface({ lang, user, onLogout, minPrepTime, onUpdateMinPrepTime }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const rawOrdersRef = useRef<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [managerView, setManagerView] = useState<
    "dashboard" | "takeOrder" | "editOrder"
  >("dashboard");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{type: "single" | "all", orderId?: string} | null>(null);
  const [takeOrderKey, setTakeOrderKey] = useState<number>(Date.now());
  const [isStatsUnlocked, setIsStatsUnlocked] = useState(false);
  const [statsPassword, setStatsPassword] = useState("1234");
  const [statsPasswordObj, setStatsPasswordObj] = useState({
    value: "",
    error: "",
  });

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmCancelPayments, setConfirmCancelPayments] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);

  // Keep paymentOrder in sync
  useEffect(() => {
    if (paymentOrder) {
      const updatedOrder = orders.find(o => o.id === paymentOrder.id);
      if (updatedOrder) {
        // Only update if something changed to prevent infinite loops / render tearing
        if (updatedOrder.paidAmount !== paymentOrder.paidAmount || 
            updatedOrder.status !== paymentOrder.status || 
            updatedOrder.payments?.length !== paymentOrder.payments?.length || 
            JSON.stringify(updatedOrder.items) !== JSON.stringify(paymentOrder.items) ||
            JSON.stringify(updatedOrder.romana) !== JSON.stringify(paymentOrder.romana)) {
           setPaymentOrder(updatedOrder);
        }
      }
    }
  }, [orders, paymentOrder]);

  const [pendingPayment, setPendingPayment] = useState<{ amount: number; items: { idx: number; qty: number }[]; isRomana?: boolean } | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"contanti" | "pos" | "bonifico">("contanti");
  const [documentType, setDocumentType] = useState<"nessuno" | "scontrino" | "fattura">("nessuno");
  const [whatsappReceipt, setWhatsappReceipt] = useState(false);
  const [whatsappPrefix, setWhatsappPrefix] = useState("+39");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [invoiceData, setInvoiceData] = useState({
    ragioneSociale: "",
    cf: "",
    piva: "",
    indirizzo: "",
    email: "",
    telefono: "",
    pec: "",
    sdi: ""
  });
  const [paymentTab, setPaymentTab] = useState<"totale" | "romana" | "items">("totale");
  const [splitCount, setSplitCount] = useState(2);
  const [selectedItemsForPayment, setSelectedItemsForPayment] = useState<
    { idx: number; qty: number }[]
  >([]);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const [tableMappings, setTableMappings] = useState<Record<string, string>>({});

  const updateTableMapping = async (childTable: string, parentTable: string | null) => {
    const newMappings = { ...tableMappings };
    if (parentTable === null || parentTable === "" || childTable === parentTable) {
      delete newMappings[childTable];
    } else {
      newMappings[childTable] = parentTable;
    }
    
    try {
      await updateDoc(doc(db, "settings", "tables"), {
        mappings: newMappings
      });
    } catch (e) {
      // In case the doc doesn't exist yet
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "settings", "tables"), { mappings: newMappings });
    }
  };

  const handlePayAmount = async (
    amountToPay: number,
    itemsToMarkAsPaid: { idx: number; qty: number }[] = [],
    isRomana: boolean = false
  ) => {
    if (!paymentOrder) return;
    setIsProcessingPayment(true);
    
    // Virtual order (grouped) logic
    const isGrouped = paymentOrder.id.startsWith("table_");
    const orderIdsToUpdate = (paymentOrder.allOrderIds || [paymentOrder.id]).filter(id => !id.startsWith("table_"));

    const currentPaid = paymentOrder.paidAmount || 0;
    const newPaidAmount = currentPaid + amountToPay;
    const isFullyPaid = newPaidAmount >= paymentOrder.total - 0.01;
    const newStatus = isFullyPaid ? "paid" : paymentOrder.status;

    let detailDescription = "Pagamento parziale/totale";
    if (isRomana) {
       detailDescription = "Quota alla Romana";
    } else if (itemsToMarkAsPaid.length > 0) {
       detailDescription = "Articoli: " + itemsToMarkAsPaid.map(it => it.qty + "x " + paymentOrder.items[it.idx].name).join(", ");
    } else if (isFullyPaid) {
       detailDescription = "Saldo totale";
    }

    const newPaymentRecord: any = JSON.parse(JSON.stringify({
      id: Date.now().toString(),
      amount: amountToPay,
      method: paymentMethod,
      documentType,
      invoiceData: documentType === 'fattura' ? invoiceData : null,
      timestamp: new Date().toISOString(),
      description: detailDescription
    }));
    
    if (isRomana) {
        newPaymentRecord.isRomana = true;
    }

    let romanaUpdate: any = {};
    let updatedRomana = paymentOrder.romana;
    if (isRomana && paymentOrder.romana) {
        updatedRomana = { ...paymentOrder.romana, paidQuotas: paymentOrder.romana.paidQuotas + 1 };
        romanaUpdate.romana = updatedRomana;
    }

    try {
      let newLocalItems = [...paymentOrder.items];
      itemsToMarkAsPaid.forEach(({ idx, qty }) => {
         if (newLocalItems[idx]) {
            newLocalItems[idx] = {
               ...newLocalItems[idx],
               paidQuantity: (newLocalItems[idx].paidQuantity || 0) + qty,
            };
         }
      });

      if (!isGrouped) {
          // Standard single order
          await updateDoc(doc(db, "orders", paymentOrder.id), {
            ...romanaUpdate,
            paidAmount: newPaidAmount,
            status: newStatus,
            paymentGroupId: isFullyPaid ? Date.now().toString() : paymentOrder.paymentGroupId || null,
            items: newLocalItems,
            updatedAt: serverTimestamp(),
            payments: [...(paymentOrder.payments || []), newPaymentRecord]
          });
      } else {
          // Grouped orders: split payment proportionately? 
          // For simplicity, we mark all as paid if it's a full payment.
          // For items, it's more complex, but we prioritize the origins.
          
          if (isFullyPaid) {
              const paymentGroupId = Date.now().toString();
              await Promise.all(orderIdsToUpdate.map(async (id, idx) => {
                  const docSnap = await getDoc(doc(db, "orders", id));
                  const oldPayments = docSnap.exists() ? (docSnap.data().payments || []) : [];
                  // Only add the main receipt logic details to the first order to avoid duplicating invoices
                  const orderPaymentRecord = idx === 0 ? newPaymentRecord : { ...newPaymentRecord, note: 'linked' };
                  
                  await updateDoc(doc(db, "orders", id), {
                      status: "paid",
                      paymentGroupId: paymentGroupId,
                      paidAmount: docSnap.exists() ? docSnap.data().total : 999999,
                      updatedAt: serverTimestamp(),
                      payments: [...oldPayments, orderPaymentRecord]
                  });
              }));
          } else {
              if (itemsToMarkAsPaid.length > 0) {
                 const updatesByOriginId: Record<string, any[]> = {};
                 itemsToMarkAsPaid.forEach(({idx, qty}) => {
                    const itemInGroup = paymentOrder.items[idx];
                    const originId = itemInGroup.originOrderId;
                    if (!originId) return;
                    if (!updatesByOriginId[originId]) updatesByOriginId[originId] = [];
                    updatesByOriginId[originId].push({ itemInGroup, qty });
                 });

                 await Promise.all(Object.entries(updatesByOriginId).map(async ([originId, updates]) => {
                    const docSnap = await getDoc(doc(db, "orders", originId));
                    if (!docSnap.exists()) return;
                    
                    const originalOrderData = docSnap.data();
                    let updatedItems = [...(originalOrderData.items || [])];
                    
                    updates.forEach(({ itemInGroup, qty }) => {
                       const matchIdx = updatedItems.findIndex(it => 
                          it.productId === itemInGroup.productId && 
                          it.name === itemInGroup.name &&
                          it.price === itemInGroup.price
                       );
                       if (matchIdx >= 0) {
                          updatedItems[matchIdx] = {
                             ...updatedItems[matchIdx],
                             paidQuantity: (updatedItems[matchIdx].paidQuantity || 0) + qty
                          };
                       }
                    });
                    
                    await updateDoc(doc(db, "orders", originId), {
                        items: updatedItems,
                        updatedAt: serverTimestamp()
                    });
                 }));
              }

              // Partial payment on a group: update the first order as recipient of the payment info
              const firstOrderDoc = await getDoc(doc(db, "orders", orderIdsToUpdate[0]));
              const firstOrderPayments = firstOrderDoc.exists() ? (firstOrderDoc.data().payments || []) : [];

              await updateDoc(doc(db, "orders", orderIdsToUpdate[0]), {
                  ...romanaUpdate,
                  paidAmount: newPaidAmount,
                  updatedAt: serverTimestamp(),
                  payments: [...firstOrderPayments, newPaymentRecord]
              });
          }
      }

      if (isFullyPaid && paymentOrder.linkedTables && paymentOrder.linkedTables.length > 0) {
         // Temporarily linked tables should be separated now
         paymentOrder.linkedTables.forEach(childTable => {
             updateTableMapping(childTable, null);
         });
      }



      setTimeout(() => {
        setIsProcessingPayment(false);
        if (isFullyPaid) {
          setPaymentOrder(null);
        } else {
          setPaymentOrder({
            ...paymentOrder,
            paidAmount: newPaidAmount,
            status: newStatus,
            items: newLocalItems
          });
          setSelectedItemsForPayment([]);
        }
      }, 500);
    } catch (error) {
      setIsProcessingPayment(false);
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `orders/${orderIdsToUpdate.join(",")}`,
      );
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!paymentOrder) return;
    try {
      const isGrouped = paymentOrder.id.startsWith("table_");
      
      if (!isGrouped) {
          const payments = paymentOrder.payments || [];
          const paymentToDelete = payments.find(p => p.id === paymentId);
          if (!paymentToDelete) return;

          const updatedPayments = payments.filter(p => p.id !== paymentId);
          const newPaidAmount = paymentOrder.paidAmount > 900000 ? 0 : Math.max(0, (paymentOrder.paidAmount || 0) - paymentToDelete.amount);
          
          let romanaUpdate: any = {};
          if (paymentToDelete.isRomana && paymentOrder.romana) {
              romanaUpdate.romana = { 
                  ...paymentOrder.romana, 
                  paidQuotas: Math.max(0, paymentOrder.romana.paidQuotas - 1) 
              };
          }

          await updateDoc(doc(db, "orders", paymentOrder.id), {
              ...romanaUpdate,
              payments: updatedPayments,
              paidAmount: newPaidAmount,
              status: paymentOrder.status === "paid" ? "delivered" : paymentOrder.status,
              updatedAt: serverTimestamp()
          });

          // Optimistically update the UI
          setPaymentOrder({
              ...paymentOrder,
              ...romanaUpdate,
              payments: updatedPayments,
              paidAmount: newPaidAmount,
              status: paymentOrder.status === "paid" ? "delivered" : paymentOrder.status
          });
      } else {
          const orderIdsToUpdate = (paymentOrder.allOrderIds || [paymentOrder.id]).filter(id => !id.startsWith("table_"));
          for (const orderId of orderIdsToUpdate) {
              const docSnap = await getDoc(doc(db, "orders", orderId));
              if (docSnap.exists()) {
                  const data = docSnap.data();
                  const payments = data.payments || [];
                  const paymentToDelete = payments.find((p: any) => p.id === paymentId);
                  
                  if (paymentToDelete) {
                      const updatedPayments = payments.filter((p: any) => p.id !== paymentId);
                      const currentPaid = data.paidAmount || 0;
                      const newPaidAmount = currentPaid > 900000 ? 0 : Math.max(0, currentPaid - paymentToDelete.amount);
                      
                      let romanaUpdate: any = {};
                      if (paymentToDelete.isRomana && data.romana) {
                          romanaUpdate.romana = { 
                              ...data.romana, 
                              paidQuotas: Math.max(0, data.romana.paidQuotas - 1) 
                          };
                      }

                      await updateDoc(doc(db, "orders", orderId), {
                          ...romanaUpdate,
                          payments: updatedPayments,
                          paidAmount: newPaidAmount,
                          status: data.status === "paid" ? "delivered" : data.status,
                          paymentGroupId: null,
                          updatedAt: serverTimestamp()
                      });
                      
                      // Optimistically update the UI for grouped order
                      const currentPayments = paymentOrder.payments || [];
                      const updatedModalPayments = currentPayments.filter((p: any) => p.id !== paymentId);
                      const currentModalPaid = paymentOrder.paidAmount || 0;
                      const newModalPaidAmount = Math.max(0, currentModalPaid - paymentToDelete.amount);
                      
                      setPaymentOrder({
                         ...paymentOrder,
                         ...romanaUpdate,
                         payments: updatedModalPayments,
                         paidAmount: newModalPaidAmount,
                         status: paymentOrder.status === "paid" ? "delivered" : paymentOrder.status
                      });
                      break;
                  }
              }
          }
      }
    } catch (e) {
      console.error("Error deleting payment", e);
    }
  };

  const handleUpdatePayment = async (updatedPayment: any) => {
    if (!paymentOrder) return;
    try {
      const isGrouped = paymentOrder.id.startsWith("table_");
      
      const updatePaymentsList = (payments: any[]) => 
         payments.map(p => p.id === updatedPayment.id ? { ...p, ...updatedPayment } : p);

      if (!isGrouped) {
          const payments = paymentOrder.payments || [];
          const updatedPayments = updatePaymentsList(payments);

          await updateDoc(doc(db, "orders", paymentOrder.id), {
              payments: updatedPayments,
              updatedAt: serverTimestamp()
          });

      } else {
          const orderIdsToUpdate = (paymentOrder.allOrderIds || [paymentOrder.id]).filter(id => !id.startsWith("table_"));
          for (const orderId of orderIdsToUpdate) {
              const docSnap = await getDoc(doc(db, "orders", orderId));
              if (docSnap.exists()) {
                  const data = docSnap.data();
                  const payments = data.payments || [];
                  const paymentToEdit = payments.find((p: any) => p.id === updatedPayment.id);
                  if (paymentToEdit) {
                      const updatedPayments = updatePaymentsList(payments);
                      await updateDoc(doc(db, "orders", orderId), {
                          payments: updatedPayments,
                          updatedAt: serverTimestamp()
                      });
                      break;
                  }
              }
          }
      }
      
      const currentModalPayments = paymentOrder.payments || [];
      const newModalPayments = updatePaymentsList(currentModalPayments);
      setPaymentOrder({
         ...paymentOrder,
         payments: newModalPayments,
      });

      setEditingPayment(null);
    } catch (e) {
      console.error("Error updating payment", e);
    }
  };

  const [movingOrderId, setMovingOrderId] = useState<string | null>(null);
  const [linkingOrderId, setLinkingOrderId] = useState<string | null>(null);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [linkTableNumber, setLinkTableNumber] = useState("");
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [viewingItemProductData, setViewingItemProductData] = useState<any | null>(null);
  const [viewingTableOrder, setViewingTableOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (viewingItem) {
       const menu = getMenu();
       let product = menu.find(p => p.id === viewingItem.productId);
       if (!product) {
         product = menu.find(p => p.name.it === viewingItem.name || p.name === viewingItem.name);
       }
       if (product) {
          setViewingItemProductData(product);
       } else {
          setViewingItemProductData(null);
       }
    } else {
       setViewingItemProductData(null);
    }
  }, [viewingItem]);

  const changeTableNumber = async (orderId: string, newTable: string) => {
    if (!newTable.trim()) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const orderIdsToUpdate = (order.allOrderIds || [order.id]).filter(id => !id.startsWith("table_"));

    try {
      await Promise.all(orderIdsToUpdate.map(id => 
        updateDoc(doc(db, "orders", id), {
          tableNumber: newTable.trim(),
          updatedAt: serverTimestamp(),
        })
      ));
      setMovingOrderId(null);
      setNewTableNumber("");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderIdsToUpdate.join(",")}`);
    }
  };

  const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
  const [takeawayHours, setTakeawayHours] = useState<any>(null);
  const [localTakeawayHours, setLocalTakeawayHours] = useState<any>(null);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const [newCallAlert, setNewCallAlert] = useState<any | null>(null);
  const [customerOrdersSettings, setCustomerOrdersSettings] = useState({ allowTableOrders: true, allowTakeawayOrders: true, allowCallWaiter: true });
  const [localCustomerOrdersSettings, setLocalCustomerOrdersSettings] = useState({ allowTableOrders: true, allowTakeawayOrders: true, allowCallWaiter: true });
  const [isSavingCustomerOrdersSettings, setIsSavingCustomerOrdersSettings] = useState(false);

  const prevOrdersRef = useRef<Order[]>([]);

  useEffect(() => {
    // 1. Separate listener for table mappings
    const unsubMappings = onSnapshot(doc(db, "settings", "tables"), (snap) => {
        const mappings = snap.exists() ? (snap.data().mappings || {}) : {};
        setTableMappings(mappings);
    });
    
    // 2. Listener for takeaway hours
    const unsubHours = onSnapshot(doc(db, "settings", "takeawayHours"), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setTakeawayHours(data);
            if (!localTakeawayHours) setLocalTakeawayHours(data);
        } else {
            // Default hours if none exist
            const defaultHours = {
                mon: { open: "18:00", close: "23:00", closed: false },
                tue: { open: "18:00", close: "23:00", closed: false },
                wed: { open: "18:00", close: "23:00", closed: false },
                thu: { open: "18:00", close: "23:00", closed: false },
                fri: { open: "18:00", close: "23:00", closed: false },
                sat: { open: "18:00", close: "23:00", closed: false },
                sun: { open: "18:00", close: "23:00", closed: false },
            };
            setTakeawayHours(defaultHours);
            if (!localTakeawayHours) setLocalTakeawayHours(defaultHours);
        }
    });

    // 3. Listener for security settings (password)
    const unsubSecurity = onSnapshot(doc(db, "settings", "security"), (snap) => {
        if (snap.exists() && snap.data().statsPassword) {
            setStatsPassword(snap.data().statsPassword);
        }
    }, (err) => {
        console.error("Security snapshot error:", err);
    });

    // 4. Listener for customer orders settings
    const unsubCustomerOrders = onSnapshot(doc(db, "settings", "customerOrders"), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const s = {
                allowTableOrders: data.allowTableOrders !== false,
                allowTakeawayOrders: data.allowTakeawayOrders !== false,
                allowCallWaiter: data.allowCallWaiter !== false
            };
            setCustomerOrdersSettings(s);
            setLocalCustomerOrdersSettings(s);
        }
    }, (err) => {
        console.error("Customer orders settings snapshot error:", err);
    });

    return () => {
        unsubMappings();
        unsubHours();
        unsubSecurity();
        unsubCustomerOrders();
    };
  }, []); // Stable effect for settings listeners

  useEffect(() => {
    const ordersPath = "orders";
    const q = query(
      collection(db, ordersPath), 
      limit(1000)
    );
    
    setLastUpdate(new Date());
    
    const unsubscribeOrders = onSnapshot(
      q,
      (snapshot) => {
        setLastUpdate(new Date());
        const rawItems: Order[] = [];
        snapshot.forEach((doc) => {
          rawItems.push({ id: doc.id, ...doc.data() } as Order);
        });
        
        rawOrdersRef.current = [...rawItems];

        rawItems.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : Date.now() + 1000);
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : Date.now() + 1000);
          return tB - tA;
        });

        const groups: Record<string, Order> = {};
        const separateItems: Order[] = [];
        const groupedPaidOrders: Record<string, Order> = {};

        // Pre-calculate membership groups for labels
        const tableGroups: Record<string, string[]> = {};
        // 1. Identify all unique roots representing active groups
        const activeTableNumbers = rawItems.filter(o => o.status !== "paid" && o.status !== "cancelled" && o.status !== "linked").map(o => o.tableNumber);
        const uniqueRoots = new Set(activeTableNumbers.map(tn => tableMappings[tn] || tn));
        
        uniqueRoots.forEach(r => {
            const members = [r];
            Object.entries(tableMappings).forEach(([child, parent]) => {
                if (parent === r) members.push(child);
            });
            tableGroups[r] = Array.from(new Set(members)).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
                return numA - numB;
            });
        });

        rawItems.forEach(o => {
          if (o.status === "paid" && o.paymentGroupId) {
              const pgId = o.paymentGroupId;
              if (!groupedPaidOrders[pgId]) {
                  groupedPaidOrders[pgId] = { ...o, allOrderIds: [o.id] };
              } else {
                  // Merge items
                  groupedPaidOrders[pgId].items = [...groupedPaidOrders[pgId].items, ...o.items];
                  groupedPaidOrders[pgId].total += o.total;
                  groupedPaidOrders[pgId].paidAmount = (groupedPaidOrders[pgId].paidAmount || 0) + (o.paidAmount || 0);
                  groupedPaidOrders[pgId].allOrderIds!.push(o.id);
              }
              return;
          }

          if (o.status === "paid" || o.status === "cancelled") {
              separateItems.push({ ...o, allOrderIds: [o.id] });
              return;
          }
          
          if (o.tableNumber && o.tableNumber !== "Asporto" && o.status !== "linked") {
            const root = tableMappings[o.tableNumber] || o.tableNumber;
            const groupMembers = tableGroups[root] || [o.tableNumber];
            const targetLabel = groupMembers.length > 1 ? groupMembers.join(" e ") : root;
            const groupKey = `${targetLabel}_${o.status}`;
            
            if (!groups[groupKey]) {
              groups[groupKey] = { 
                ...o, 
                tableNumber: targetLabel,
                id: `table_${root}_${o.status}`,
                allOrderIds: [o.id],
                linkedTables: groupMembers.filter(m => m !== root),
                items: o.items.map(item => ({ ...item, originOrderId: item.originOrderId || o.id, originStatus: o.status as any }))
              };
            } else {
              const g = groups[groupKey];
              const taggedItems = o.items.map(item => ({
                  ...item,
                  originOrderId: item.originOrderId || o.id,
                  originStatus: o.status as any,
                  notes: o.tableNumber !== root ? (item.notes ? `${item.notes} [TAVOLO ${o.tableNumber}]` : `[TAVOLO ${o.tableNumber}]`) : item.notes
              }));
              
              g.items = [...g.items, ...taggedItems];
              g.total += o.total;
              g.paidAmount = (g.paidAmount || 0) + (o.paidAmount || 0);
              if (!g.allOrderIds) g.allOrderIds = [];
              g.allOrderIds.push(o.id);
              if (o.romana) {
                  g.romana = o.romana;
              }
            }
          } else if (o.status !== "linked") {
            separateItems.push({ ...o, allOrderIds: [o.id] });
          }
        });
        
        const items = [...Object.values(groups), ...Object.values(groupedPaidOrders), ...separateItems];
        
        items.sort((a,b) => {
           const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
           const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
           return tB - tA;
        });
        
        const prev = prevOrdersRef.current;
        if (prev.length > 0 && items.length > 0) {
           const prevPending = prev.filter(o => o.status === "pending").map(o => o.id);
           const currentPending = items.filter(o => o.status === "pending");
           
           const newPendingOrders = currentPending.filter(o => !prevPending.includes(o.id));
           const hasNewPending = newPendingOrders.length > 0;
           const updatedPendingOrders = currentPending.filter(curr => {
              const p = prev.find(x => ((x.allOrderIds || [x.id]).includes(curr.id) || (curr.allOrderIds || [curr.id]).includes(x.id)));
              return p && p.status === "pending" && curr.total > p.total;
           });
           const hasUpdatedPending = updatedPendingOrders.length > 0;

           if (hasNewPending || hasUpdatedPending) {
              const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
              audio.play().catch(e => console.log("Audio play failed:", e));
              
              if (hasNewPending) {
                setNewOrderAlert(newPendingOrders[0]);
              } else if (hasUpdatedPending) {
                setNewOrderAlert(updatedPendingOrders[0]);
              }
           }
        }
        prevOrdersRef.current = items;
        setOrders(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, ordersPath);
      },
    );

    const qCalls = query(collection(db, "waiterCalls"), where("status", "==", "pending"));
    const unsubscribeCalls = onSnapshot(
      qCalls,
      (snapshot) => {
        const calls: any[] = [];
        snapshot.forEach((doc) => {
          calls.push({ id: doc.id, ...doc.data() });
        });
        
        setWaiterCalls(prev => {
          const newCalls = calls.filter(call => !prev.find(c => c.id === call.id));
          if (newCalls.length > 0) {
              new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play().catch(() => {});
              setNewCallAlert(newCalls[0]);
          }
          return calls.sort((a,b) => {
             const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
             const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
             return tB - tA;
          });
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "waiterCalls");
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeCalls();
    };
  }, [tableMappings]);

  const markItemAsDelivered = async (orderId: string, itemIdx: number) => {
    // In our UI, grouped order.id is usually "table_X", but we need the item's originOrderId
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const newItems = [...order.items];
    const item = newItems[itemIdx];
    if (!item.originOrderId) return; // Should not happen

    // Update only this item in its specific original order
    const originalOrder = rawOrdersRef.current.find(o => o.id === item.originOrderId);
    if (!originalOrder) return;
    
    const updatedOrderItems = originalOrder.items.map(it => 
       it === item ? { ...it, deliveredQuantity: it.quantity } : it
    );
    
    // Auto-mark order as served if all items are delivered
    const allServed = updatedOrderItems.every(i => (i.deliveredQuantity || 0) === i.quantity);
    
    try {
      await updateDoc(doc(db, "orders", item.originOrderId), {
        items: updatedOrderItems,
        status: allServed && originalOrder.status !== "paid" ? "served" : originalOrder.status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${item.originOrderId}`);
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus, originStatusFilter?: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    let orderIdsToUpdate = (order.allOrderIds || [order.id]).filter(id => !id.startsWith("table_"));
    
    // Limit updates to only the original sub-orders that match the current UI tab
    if (originStatusFilter) {
       const relevantOriginIds = new Set(
          order.items
             .filter(i => (i as any).originStatus === originStatusFilter)
             .map(i => i.originOrderId)
             .filter(Boolean)
       );
       if (relevantOriginIds.size > 0) {
          orderIdsToUpdate = orderIdsToUpdate.filter(id => relevantOriginIds.has(id as string));
       }
    }

    if (orderIdsToUpdate.length === 0) return; // Nothing to update

    try {
      if (status === "served") {
        // Mark items as delivered only for the relevant orders
        await Promise.all(orderIdsToUpdate.map(async id => {
           const subOrder = rawOrdersRef.current.find((o) => o.id === id); // Separate item
           if (!subOrder) return;
           const updatedItems = subOrder.items.map(item => ({ ...item, deliveredQuantity: item.quantity }));
           await updateDoc(doc(db, "orders", id), {
               items: updatedItems,
               status: "served",
               updatedAt: serverTimestamp()
           });
        }));
      } else {
        await Promise.all(orderIdsToUpdate.map(id => 
          updateDoc(doc(db, "orders", id), {
            status,
            updatedAt: serverTimestamp(),
          })
        ));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderIdsToUpdate.join(",")}`);
    }
  };

  const deleteOrder = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    
    const orderIdsToDelete = (order.allOrderIds || [order.id]).filter(id => !id.startsWith("table_"));

    try {
      await Promise.all(orderIdsToDelete.map(id => deleteDoc(doc(db, "orders", id))));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderIdsToDelete.join(",")}`);
    }
  };

  const deleteOrderPermanently = async (orderId: string) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      const orderIdsToDelete = order?.allOrderIds?.length 
        ? order.allOrderIds.filter(id => !id.startsWith("table_"))
        : [orderId];

      if (orderIdsToDelete.length > 0) {
        await Promise.all(orderIdsToDelete.map(id => deleteDoc(doc(db, "orders", id))));
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Errore durante l'eliminazione: " + (error instanceof Error ? error.message : "Sconosciuto"));
      setDeleteConfirm(null);
      handleFirestoreError(error, OperationType.DELETE, `orders`);
    }
  };

  const deleteAllCancelledOrdersPermanently = async () => {
    const cancelledOrders = orders.filter(o => o.status === "cancelled");
    try {
      for (const order of cancelledOrders) {
         const orderIdsToDelete = (order.allOrderIds || [order.id]).filter(id => !id.startsWith("table_"));
         if (orderIdsToDelete.length > 0) {
           await Promise.all(orderIdsToDelete.map(id => deleteDoc(doc(db, "orders", id))));
         }
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting all orders:", error);
      alert("Errore durante l'eliminazione: " + (error instanceof Error ? error.message : "Sconosciuto"));
      setDeleteConfirm(null);
      handleFirestoreError(error, OperationType.DELETE, `orders/batch`);
    }
  };

  const splitTables = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order.allOrderIds) return;

    const originalOrderIds = order.allOrderIds.filter(id => !id.startsWith("table_"));
    if (originalOrderIds.length < 2) return;

    try {
      // 1. Reset the master order
      await updateDoc(doc(db, "orders", originalOrderIds[0]), {
        linkedTables: [],
        updatedAt: serverTimestamp()
      });

      // 2. Restore all other orders to 'pending' (or their supposed status)
      await Promise.all(originalOrderIds.slice(1).map(id => 
        updateDoc(doc(db, "orders", id), {
          status: "pending",
          updatedAt: serverTimestamp()
        })
      ));
      
      alert(t("tablesSplitted", lang));
    } catch (error) {
      console.error("Errore durante la divisione dei tavoli:", error);
      alert(t("errorTablesSplit", lang));
    }
  };

  const deleteItemFromOrder = async (orderId: string, itemToDelete: any) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // We must find the original order using item.originOrderId
    if (!itemToDelete.originOrderId) return;
    
    const originalOrder = orders.find(o => o.id === itemToDelete.originOrderId);
    if (!originalOrder) return;

    // Check by a unique combination since we don't have item IDs.
    const newItems = originalOrder.items.filter(it => it !== itemToDelete && JSON.stringify(it) !== JSON.stringify(itemToDelete));

    const newTotal = newItems.reduce(
      (acc, item) => acc + item.price * item.quantity + (item.subItems?.reduce((s, si) => s + si.price, 0) || 0) * item.quantity,
      0,
    );

    try {
      if (newItems.length === 0) {
        await updateDoc(doc(db, "orders", itemToDelete.originOrderId), {
          items: newItems,
          total: newTotal,
          status: "cancelled", // Automatically cancel if no items left
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "orders", itemToDelete.originOrderId), {
          items: newItems,
          total: newTotal,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${itemToDelete.originOrderId}`);
    }
  };

  const [paidPeriod, setPaidPeriod] = useState<
    "today" | "week" | "month" | "all" | "custom"
  >("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Helper to split an order into distinct parts based on status
  const splitOrderByStatus = (o: Order) => {
    const splits = [];
    if (o.status === "paid" || o.status === "cancelled" || o.status === "linked" || o.status === "delivered") return splits;
    
    const pendingItems = o.items.filter(i => (i as any).originStatus === "pending" || (!(i as any).originStatus && o.status === "pending"));
    if (pendingItems.length > 0) splits.push({ ...o, items: pendingItems, total: pendingItems.reduce((acc, i) => acc + (i.price * i.quantity) + (i.subItems?.reduce((subAcc, si) => subAcc + si.price, 0) || 0) * i.quantity, 0), status: "pending" as OrderStatus, originalGroupedOrder: o });

    const preparingItems = o.items.filter(i => (i as any).originStatus === "preparing" || (!(i as any).originStatus && o.status === "preparing"));
    if (preparingItems.length > 0) splits.push({ ...o, items: preparingItems, total: preparingItems.reduce((acc, i) => acc + (i.price * i.quantity) + (i.subItems?.reduce((subAcc, si) => subAcc + si.price, 0) || 0) * i.quantity, 0), status: "preparing" as OrderStatus, originalGroupedOrder: o });

    const servedItems = o.items.filter(i => (i as any).originStatus === "served" || (!(i as any).originStatus && o.status === "served"));
    if (servedItems.length > 0) splits.push({ ...o, items: servedItems, total: servedItems.reduce((acc, i) => acc + (i.price * i.quantity) + (i.subItems?.reduce((subAcc, si) => subAcc + si.price, 0) || 0) * i.quantity, 0), status: "served" as OrderStatus, originalGroupedOrder: o });

    return splits;
  };

  // Compute category counts
  const categoryCounts = useMemo(() => {
    let allCount = 0;
    let pendingCount = 0;
    let preparingCount = 0;
    let servedCount = 0;
    let paidCount = 0;
    let deletedCount = 0;
    let deliveredCount = 0;

    orders.forEach(o => {
      if (o.status === "paid") { paidCount++; return; }
      if (o.status === "cancelled") { deletedCount++; return; }
      if (o.status === "delivered") { deliveredCount++; return; }
      
      const splits = splitOrderByStatus(o);
      allCount += splits.length; // Number of "Attivi" boxes
      if (splits.some(s => s.status === "pending")) pendingCount++;
      if (splits.some(s => s.status === "preparing")) preparingCount++;
      if (splits.some(s => s.status === "served")) servedCount++;
    });

    return { all: allCount, pending: pendingCount, toDeliver: preparingCount, served: servedCount, paid: paidCount, deleted: deletedCount, delivered: deliveredCount };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result: Order[] = [];
    if (filter === "all") {
      orders.forEach(o => result.push(...splitOrderByStatus(o)));
    } else if (filter === "paid") {
      result = orders.filter((o) => o.status === "paid");
    } else if (filter === ("deleted" as any)) {
      result = orders.filter((o) => o.status === "cancelled");
    } else if (filter === "pending") {
      // Pending is merged into toDeliver now, no longer a standalone button, but keep for fallback
      orders.forEach(o => {
        const splits = splitOrderByStatus(o);
        const match = splits.find(s => s.status === "pending");
        if (match) result.push(match);
      });
    } else if (filter === ("toDeliver" as any)) {
      orders.forEach(o => {
        const splits = splitOrderByStatus(o);
        const pendingMatch = splits.find(s => s.status === "pending");
        const preparingMatch = splits.find(s => s.status === "preparing");
        if (pendingMatch) result.push(pendingMatch);
        if (preparingMatch) result.push(preparingMatch);
      });
    } else if (filter === "served") {
       orders.forEach(o => {
        const splits = splitOrderByStatus(o);
        const match = splits.find(s => s.status === "served");
        if (match) result.push(match);
      });
    } else {
      result = orders.filter((o) => o.status === filter);
    }
    
    // Apply 14 days deletion for cancelled orders
    if (filter === "deleted" as any) {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      result = result.filter(o => {
        const orderTime = o.createdAt?.toMillis ? o.createdAt.toMillis() : Date.now();
        return orderTime >= fourteenDaysAgo.getTime();
      });
    }

    // Apply period filter for paid orders
    if (filter === "paid") {
      const periodStart = new Date();
      if (paidPeriod === "today") {
        periodStart.setHours(0, 0, 0, 0);
      } else if (paidPeriod === "week") {
        periodStart.setDate(periodStart.getDate() - 7);
      } else if (paidPeriod === "month") {
        periodStart.setMonth(periodStart.getMonth() - 1);
      } else if (paidPeriod === "all") {
        periodStart.setTime(0);
      }
      
      result = result.filter(o => {
        const orderTime = o.createdAt?.toMillis ? o.createdAt.toMillis() : Date.now();
        if (paidPeriod === "custom") {
          let isValid = true;
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (orderTime < start.getTime()) isValid = false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (orderTime > end.getTime()) isValid = false;
          }
          return isValid;
        }
        return orderTime >= periodStart.getTime();
      });
    }
    
    return result.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
      return timeA - timeB; // Oldest waiting first
    });
  }, [orders, filter, paidPeriod, customStartDate, customEndDate]);

  // Force re-render every minute for waiting times
  const [nowMillis, setNowMillis] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMillis(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-delete cancelled orders older than 14 days
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    
    let hasRun = false;
    const cleanupOldOrders = async () => {
      if (hasRun) return;
      hasRun = true;
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const ordersToDelete = orders.filter(o => {
        if (o.status !== "cancelled") return false;
        const orderTime = o.createdAt?.toMillis ? o.createdAt.toMillis() : Date.now();
        return orderTime < fourteenDaysAgo.getTime();
      });
      
      for (const order of ordersToDelete) {
        try {
          const orderIdsToDelete = (order.allOrderIds || [order.id]).filter(id => !id.startsWith("table_"));
          await Promise.all(orderIdsToDelete.map(id => deleteDoc(doc(db, "orders", id))));
        } catch (error) {
          console.error("Error auto-deleting order", order.id, error);
        }
      }
    };
    
    cleanupOldOrders();
  }, [orders]);

  const [managerTab, setManagerTab] = useState<
    "orders" | "stats" | "menu" | "customization" | "crossSelling" | "categories" | "tables" | "settings"
  >("orders");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<
    "today" | "week" | "month" | "all"
  >("today");

  const stats = React.useMemo(() => {
    const now = new Date();
    const periodStart = new Date();
    if (statsPeriod === "today") {
      periodStart.setHours(0, 0, 0, 0);
    } else if (statsPeriod === "week") {
      periodStart.setDate(now.getDate() - 7);
    } else if (statsPeriod === "month") {
      periodStart.setMonth(now.getMonth() - 1);
    } else {
      periodStart.setTime(0); // all time
    }

    const periodOrders = orders.filter((o) => {
      if (o.status !== "paid") return false;
      const orderDate = o.createdAt
        ? new Date(o.createdAt.toMillis())
        : new Date();
      return orderDate >= periodStart;
    });

    const mStats: Record<
      string,
      { name: string; income: number; orders: number; sortKey: string }
    > = {};
    orders
      .filter((o) => o.status === "paid")
      .forEach((o) => {
        const date = o.createdAt
          ? new Date(o.createdAt.toMillis())
          : new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = date.toLocaleString("default", {
          month: "short",
          year: "2-digit",
        });
        if (!mStats[monthKey]) {
          mStats[monthKey] = {
            name: monthLabel,
            income: 0,
            orders: 0,
            sortKey: monthKey,
          };
        }
        mStats[monthKey].income += o.total;
        mStats[monthKey].orders += 1;
      });
    const monthlyData = Object.values(mStats).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey),
    );

    const totalIncome = periodOrders.reduce((acc, o) => acc + o.total, 0);
    const totalOrders = periodOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalIncome / totalOrders : 0;

    const waiterStats: Record<string, { count: number; total: number }> = {};
    const topItems: Record<string, number> = {};
    const tableStats: Record<string, number> = {};

    periodOrders.forEach((o) => {
      const w =
        o.waiter && o.waiter.trim() !== "" ? o.waiter : "Sconosciuto/Cliente";
      if (!waiterStats[w]) waiterStats[w] = { count: 0, total: 0 };
      waiterStats[w].count += 1;
      waiterStats[w].total += o.total;

      o.items.forEach((item) => {
        topItems[item.name] = (topItems[item.name] || 0) + item.quantity;
      });

      const t = o.tableNumber || "N/A";
      tableStats[t] = (tableStats[t] || 0) + 1;
    });

    return {
      totalIncome,
      totalOrders,
      avgOrderValue,
      monthlyData,
      topItems: Object.entries(topItems)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      busiestTables: Object.entries(tableStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      waiterStats: Object.entries(waiterStats).sort(
        (a, b) => b[1].total - a[1].total,
      ),
    };
  }, [orders, statsPeriod]);

  if (managerView === "takeOrder" || managerView === "editOrder") {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <header className="mb-8 flex items-center justify-between">
          <button
            onClick={() => {
              setManagerView("dashboard");
              setEditingOrder(null);
            }}
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-brand-black/40 hover:text-brand-black transition-colors"
          >
            ← {t("backToDashboard", lang)}
          </button>
          <div className="bg-brand-black text-brand-gold px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
            {managerView === "editOrder"
              ? `${t("edit", lang)} Ord. ${editingOrder?.tableNumber}`
              : "MODALITÀ CAMERIERE"}
          </div>
        </header>
        <div className="bg-brand-paper rounded-[3rem] border-2 border-dashed border-brand-gold/30 p-2 min-h-[100dvh]">
          {managerView === "takeOrder" ? (
            <div key={takeOrderKey} className="h-full">
              <CustomerInterface
                lang={lang}
                isManager={true}
                onNavigateManager={(view, tab) => {
                  setManagerView(view as any);
                  setManagerTab(tab as any);
                }}
                onCancel={() => {
                  setManagerView("dashboard");
                  setEditingOrder(null);
                }}
              />
            </div>
          ) : editingOrder ? (
            <CustomerInterface
              lang={lang}
              editMode={true}
              initialCart={editingOrder.items}
              initialTable={editingOrder.tableNumber}
              initialNotes={editingOrder.notes}
              initialCustomerName={editingOrder.customerName || ""}
              initialCustomerLastName={editingOrder.customerLastName || ""}
              initialCustomerPhone={editingOrder.customerPhone || ""}
              initialTakeawayTime={editingOrder.takeawayTime || ""}
              orderId={editingOrder.id.startsWith("table_") ? (editingOrder.allOrderIds && editingOrder.allOrderIds.length > 0 ? editingOrder.allOrderIds[0] : null) : editingOrder.id}
              onNavigateManager={(view, tab) => {
                setManagerView(view as any);
                setManagerTab(tab as any);
              }}
              onEditComplete={() => {
                setManagerView("dashboard");
                setEditingOrder(null);
              }}
              onCancel={() => {
                setManagerView("dashboard");
                setEditingOrder(null);
              }}
              isManager={true}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => window.location.reload()}>
      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-brand-paper z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-brand-black/5 flex items-center justify-between">
                <LogoG size="sm" />
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 bg-brand-black/5 rounded-full hover:bg-brand-black/10 transition-colors"
                >
                  <X size={20} className="text-brand-black/60" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                {[
                  { id: "orders", label: "Comande", icon: "📋" },
                  { id: "stats", label: "Statistiche", icon: "📊" },
                  { id: "menu", label: "Menu", icon: "🍴" },
                  { id: "categories", label: t("manageCategories", lang), icon: "📁" },
                  { id: "customization", label: t("manageExtra", lang), icon: "✨" },
                  { id: "crossSelling", label: "Cross-Sell", icon: "💎" },
                  { id: "tables", label: "Gestione Tavoli", icon: "🪑" },
                  { id: "settings", label: t("settingsStaff", lang), icon: "⚙️" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setManagerTab(item.id as any);
                      setIsSidebarOpen(false);
                    }}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${managerTab === item.id ? "bg-brand-black text-brand-gold shadow-lg" : "text-brand-black/60 hover:bg-black/5"}`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="p-6 border-t border-brand-black/5 space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-brand-black/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sync Start</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-60">{lastUpdate.toLocaleTimeString()}</span>
                </div>
                
                <button
                  onClick={onLogout}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all group"
                >
                  <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
        <div className={`sticky top-0 z-40 bg-brand-paper/95 backdrop-blur-sm pt-4 sm:pt-6 lg:pt-8 transition-all duration-300 ${isScrolled ? "pb-3 sm:pb-4 border-b border-brand-black/5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 shadow-sm mb-5" : "pb-8"}`}>
          <header className={`flex flex-wrap items-center justify-between gap-4 transition-all duration-300 ${isScrolled ? "scale-[0.96] origin-left" : ""}`}>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1">
          <button 
             onClick={() => setIsSidebarOpen(true)}
             className="p-3 bg-brand-paper hover:bg-brand-black/5 rounded-xl border border-brand-black/5 transition-colors shadow-sm active:scale-95"
          >
             <Menu size={24} className="text-brand-black" />
          </button>
          
          <div className="hidden sm:block">
            <LogoG size="sm" />
          </div>
          
          <div className="hidden sm:block">
            <h1 className="font-logo text-2xl sm:text-3xl text-brand-black leading-none py-1">
              {t("management", lang)}
            </h1>
          </div>
          
          <div className="bg-brand-black/5 px-4 py-2 rounded-full font-black uppercase tracking-widest text-[10px] ml-0 sm:ml-2 text-brand-black/60 hidden md:block">
             {managerTab === "orders" ? "Comande" : managerTab === "stats" ? "Statistiche" : managerTab === "menu" ? "Menu" : managerTab === "categories" ? t("manageCategories", lang) : managerTab === "customization" ? t("manageExtra", lang) : managerTab === "crossSelling" ? "Cross Sell" : managerTab === "tables" ? "Tavoli" : t("settings", lang)}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <button
            onClick={() => window.location.reload()}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-brand-paper border border-brand-black/5 text-brand-black/40 hover:text-brand-black transition-all shadow-sm flex items-center justify-center active:scale-95"
            title="Aggiorna"
          >
            <RefreshCw size={20} className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              setTakeOrderKey(Date.now());
              setManagerView("takeOrder");
            }}
            className="bg-brand-black text-brand-gold px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3"
          >
            <Plus size={18} className="w-5 h-5" /> 
            <span className="hidden sm:inline">{t("newOrder", lang)}</span>
            <span className="sm:hidden">Nuovo</span>
          </button>
        </div>
      </header>
      </div>

      {waiterCalls.length > 0 && (
        <div className="bg-amber-100 border-2 border-amber-300 rounded-[2rem] p-6 mb-8 flex items-center justify-between shadow-xl shadow-amber-900/5">
          <div className="w-full">
            <h3 className="text-amber-900 font-bold uppercase tracking-widest text-xs mb-2">Chiamate Cameriere Ricevute</h3>
            <div className="flex flex-wrap gap-4 pb-2">
               {waiterCalls.map(c => (
                  <div key={c.id} className="bg-white px-5 py-3 rounded-xl shadow-sm text-brand-black flex items-center gap-4 border border-amber-200 shrink-0">
                     <span className="font-serif font-black text-xl italic whitespace-nowrap">Tavolo {c.tableNumber}</span>
                     <button
                        onClick={async () => {
                           await updateDoc(doc(db, "waiterCalls", c.id), { status: "resolved", resolvedAt: serverTimestamp() });
                        }}
                        className="bg-brand-black text-brand-gold px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all whitespace-nowrap"
                     >
                        Gestita
                     </button>
                  </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {managerTab === "stats" ? (
        <div className="bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl border border-brand-gold/20">
          {!isStatsUnlocked ? (
            <div className="flex flex-col items-center justify-center py-10 text-center max-w-sm mx-auto">
              <div className="bg-brand-black/5 p-8 rounded-full mb-8">
                <ShieldCheck size={48} className="text-brand-black opacity-20" />
              </div>
              <h2 className="font-logo text-3xl sm:text-5xl text-brand-black mb-4">
                Area Protetta
              </h2>
              <p className="font-serif italic text-lg opacity-60 mb-8 leading-relaxed">
                Questa zona contiene dati sensibili di incasso.<br />Inserisci la password dello staff.
              </p>
              
              <div className="w-full space-y-4">
                <input
                  type="password"
                  value={statsPasswordObj.value}
                  onChange={(e) =>
                    setStatsPasswordObj({ value: e.target.value, error: "" })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (statsPasswordObj.value === statsPassword) {
                        setIsStatsUnlocked(true);
                      } else {
                        setStatsPasswordObj((prev) => ({
                          ...prev,
                          error: t("wrongPassword", lang),
                        }));
                      }
                    }
                  }}
                  placeholder="••••"
                  className="w-full bg-brand-paper p-6 rounded-[2rem] border-2 border-brand-gold/20 text-center text-3xl font-black tracking-[0.3em] focus:border-brand-gold outline-none shadow-inner"
                />
                
                {statsPasswordObj.error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 font-black text-[10px] uppercase tracking-widest bg-red-50 py-2 rounded-lg"
                  >
                    ⚠️ {statsPasswordObj.error}
                  </motion.p>
                )}

                <button
                  onClick={() => {
                    if (statsPasswordObj.value === statsPassword) {
                      setIsStatsUnlocked(true);
                    } else {
                      setStatsPasswordObj((prev) => ({
                        ...prev,
                        error: `Password errata. Se l'hai persa, usa il tasto reset qui sotto`,
                      }));
                    }
                  }}
                  className="w-full bg-brand-black text-brand-gold py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Sblocca Area Protetta
                </button>
              </div>
              
              <div className="mt-12 pt-8 border-t border-brand-black/5 w-full">
                <p className="text-[10px] uppercase font-black tracking-widest text-brand-black/20 mb-4">
                  Account Staff: <span className="text-brand-black/40">{user?.email || "Non rilevato"}</span>
                </p>
                
                <button
                  onClick={async () => {
                    if (window.confirm("Attenzione: Vuoi riportare la password a '1234'? Solo lo staff autorizzato può farlo.")) {
                      try {
                        await setDoc(doc(db, "settings", "security"), { statsPassword: "1234" }, { merge: true });
                        setStatsPassword("1234");
                        setStatsPasswordObj({ value: "", error: "" });
                        alert("Password ripristinata a '1234'. Ora puoi entrare!");
                      } catch (e: any) {
                        console.error("Errore reset:", e);
                        alert(`Errore: ${e.message || "Permesso negato."} Controlla la tua email staff.`);
                      }
                    }
                  }}
                  className="text-[10px] uppercase font-black tracking-widest text-brand-black/30 hover:text-brand-gold transition-all"
                >
                  Hai dimenticato la password? <span className="underline">Resetta a '1234'</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-6">
                <h2 className="font-logo text-3xl sm:text-5xl text-brand-black">
                  {t("orderStats", lang)}
                </h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsStatsUnlocked(false)}
                    className="text-[10px] uppercase font-black tracking-widest text-brand-black/40 hover:text-brand-black transition-colors px-4 py-3 bg-brand-black/5 rounded-xl"
                  >
                    Blocca
                  </button>
                  <select
                    value={statsPeriod}
                    onChange={(e) => setStatsPeriod(e.target.value as any)}
                    className="p-4 bg-brand-paper border-2 border-brand-gold/20 rounded-2xl font-black text-brand-black focus:border-brand-gold outline-none"
                  >
                    <option value="today">{t("today", lang)}</option>
                    <option value="week">{t("week", lang)}</option>
                    <option value="month">{t("month", lang)}</option>
                    <option value="all">{t("allTime", lang)}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-brand-black rounded-[2.5rem] p-8 text-center text-brand-gold shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                    {t("totalIncome", lang)} (
                    {statsPeriod === "today"
                      ? t("today", lang)
                      : statsPeriod === "week"
                        ? t("week", lang)
                        : statsPeriod === "month"
                          ? t("month", lang)
                          : t("allTime", lang)}
                    )
                  </p>
                  <p className="font-serif text-4xl sm:text-6xl italic">
                    € {stats.totalIncome.toFixed(2)}
                  </p>
                </div>
                <div className="bg-brand-paper rounded-[2.5rem] p-8 text-center text-brand-black shadow-inner border border-brand-black/5 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                    {t("totalOrdersStats", lang)}
                  </p>
                  <p className="font-sans text-3xl sm:text-5xl font-black">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="bg-brand-gold/10 rounded-[2.5rem] p-8 text-center text-brand-black shadow-inner border border-brand-gold/20 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                    {t("avgOrderValue", lang)}
                  </p>
                  <p className="font-mono text-3xl sm:text-5xl font-black tracking-tighter">
                    € {stats.avgOrderValue.toFixed(2)}
                  </p>
                </div>
              </div>

              {stats.monthlyData && stats.monthlyData.length > 0 && (
                <div className="mb-12 bg-brand-paper p-8 rounded-[2.5rem] border border-brand-black/5 shadow-inner">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-black/40 mb-6 px-2">
                    Andamento Mensile Storico
                  </h3>
                  <div className="h-80 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.monthlyData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#00000010"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fontSize: 12,
                            fill: "#00000060",
                            fontWeight: "bold",
                          }}
                          dy={10}
                        />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          stroke="#000000"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fontSize: 12,
                            fill: "#00000060",
                            fontWeight: "bold",
                          }}
                          tickFormatter={(val) => `€${val}`}
                          dx={-10}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#D1B054"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fontSize: 12,
                            fill: "#00000060",
                            fontWeight: "bold",
                          }}
                          dx={10}
                        />
                        <Tooltip
                          cursor={{ fill: "#00000005" }}
                          contentStyle={{
                            borderRadius: "1rem",
                            border: "1px solid #00000010",
                            boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            paddingTop: "20px",
                          }}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="income"
                          name="Incasso mensile (€)"
                          fill="#000000"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="orders"
                          name="Ordini totali"
                          fill="#D1B054"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-black/40 mb-6 px-4">
                    {t("topItems", lang)}
                  </h3>
                  <div className="grid gap-3">
                    {stats.topItems.map(([name, qty]) => (
                      <div
                        key={name}
                        className="flex justify-between items-center bg-brand-paper p-5 rounded-2xl border border-brand-black/5"
                      >
                        <p className="font-bold text-brand-black">{name}</p>
                        <div className="bg-brand-black text-brand-gold px-3 py-1 rounded-full text-xs font-black">
                          {qty} {t("pieces", lang)}
                        </div>
                      </div>
                    ))}
                    {stats.topItems.length === 0 && (
                      <p className="text-center italic opacity-30 py-4">
                        {t("noOrders", lang)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-black/40 mb-6 px-4">
                    {t("busiestTables", lang)}
                  </h3>
                  <div className="grid gap-3">
                    {stats.busiestTables.map(([table, count]) => (
                      <div
                        key={table}
                        className="flex justify-between items-center bg-brand-paper p-5 rounded-2xl border border-brand-black/5"
                      >
                        <p className="font-serif italic font-bold text-xl text-brand-black">
                          {t("table", lang)} {table}
                        </p>
                        <p className="text-sm font-bold opacity-50">
                          {count} {t("ordersCount", lang)}
                        </p>
                      </div>
                    ))}
                    {stats.busiestTables.length === 0 && (
                      <p className="text-center italic opacity-30 py-4">
                        {t("noOrders", lang)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-black/40 mb-6 px-4">
                {t("operatorPerformance", lang)}
              </h3>
              <div className="grid gap-4 bg-brand-paper p-4 rounded-3xl border border-brand-black/5">
                {stats.waiterStats.map(([w, data]) => (
                  <div
                    key={w}
                    className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-gold/20 text-brand-black rounded-full flex items-center justify-center font-black">
                        {w.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-brand-black">{w}</p>
                        <p className="text-xs opacity-50 font-bold">
                          {data.count} {t("handledOrders", lang)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-xl text-brand-black">
                        € {data.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : managerTab === "menu" ? (
        <MenuManager />
      ) : managerTab === "customization" ? (
        <CustomizationManager />
      ) : managerTab === "crossSelling" ? (
        <CrossSellingManager />
      ) : managerTab === "categories" ? (
        <CategoryManager />
      ) : managerTab === "settings" ? (
        <div className="bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl border border-brand-gold/20">
            <h2 className="font-logo text-3xl sm:text-5xl text-brand-black mb-8 text-center uppercase tracking-tighter">Impostazioni Staff</h2>
            
            <div className="max-w-md mx-auto space-y-8">
                {/* Account Info Card */}
                <div className="bg-brand-gold/5 p-6 rounded-3xl border border-brand-gold/20 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/40 mb-1">Account Staff Attivo</p>
                        <p className="font-black text-brand-black">{user?.email || "Nessun account"}</p>
                    </div>
                    <div className="bg-green-100 text-green-700 p-2 rounded-full">
                        <CheckCircle2 size={20} />
                    </div>
                </div>

                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-black/5 shadow-inner">
                    <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-4 px-2">
                        Modifica Password Area Protetta
                    </label>
                    <div className="flex flex-col gap-3">
                        <div className="space-y-2">
                          <input
                              type="password"
                              value={currentPasswordInput}
                              onChange={(e) => setCurrentPasswordInput(e.target.value)}
                              placeholder={t("currentPassword", lang)}
                              className="w-full bg-white p-4 rounded-2xl border-2 border-brand-black/5 focus:border-brand-gold outline-none font-bold shadow-sm"
                          />
                          <input
                              type="password"
                              value={newPasswordInput}
                              onChange={(e) => setNewPasswordInput(e.target.value)}
                              placeholder={t("newPassword", lang)}
                              className="w-full bg-white p-4 rounded-2xl border-2 border-brand-black/5 focus:border-brand-gold outline-none font-bold shadow-sm"
                          />
                        </div>
                        
                        <button
                            disabled={isUpdatingPassword || !newPasswordInput || !currentPasswordInput}
                            onClick={async () => {
                                if (currentPasswordInput !== statsPassword) {
                                    alert("La password attuale inserita non è corretta.");
                                    return;
                                }
                                
                                setIsUpdatingPassword(true);
                                try {
                                    await setDoc(doc(db, "settings", "security"), { statsPassword: newPasswordInput }, { merge: true });
                                    setStatsPassword(newPasswordInput);
                                    setNewPasswordInput("");
                                    setCurrentPasswordInput("");
                                    alert("Password aggiornata correttamente!");
                                } catch (e: any) {
                                    console.error("Errore aggiornamento password:", e);
                                    alert(`Errore: ${e.message || "Permesso negato."} Controlla che la tua email sia autorizzata.`);
                                } finally {
                                    setIsUpdatingPassword(false);
                                }
                            }}
                            className="bg-brand-black text-brand-gold px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg disabled:opacity-30 flex items-center justify-center gap-2"
                        >
                            {isUpdatingPassword ? <RefreshCw size={14} className="animate-spin" /> : null}
                            Salva Nuova Password
                        </button>
                        
                        <div className="pt-4 mt-2 border-t border-brand-black/5">
                          <button
                            onClick={async () => {
                                if (window.confirm(t("changePasswordMsg", lang))) {
                                  try {
                                      await setDoc(doc(db, "settings", "security"), { statsPassword: "1234" }, { merge: true });
                                      setStatsPassword("1234");
                                      alert("Password resettata a '1234'!");
                                  } catch (e: any) {
                                      alert(`Errore nel reset: ${e.message || "Permesso negato."}`);
                                  }
                                }
                            }}
                            className="w-full py-4 rounded-2xl border-2 border-dashed border-brand-black/5 text-brand-black/40 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95 shadow-sm"
                          >
                            Reset d'emergenza (1234)
                          </button>
                        </div>
                    </div>
                    <p className="text-[9px] mt-4 opacity-40 uppercase font-bold tracking-wider px-2">
                        Questa password protegge l'accesso alle statistiche e all'area sensibile dello staff. È una password locale, diversa da quella del tuo account Google.
                    </p>
                </div>

                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-black/5 shadow-inner">
                    <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-4 px-2">
                        Seleziona Operatore Corrente
                    </label>
                    <select
                        value={localStorage.getItem("waiter") || ""}
                        onChange={(e) => {
                          localStorage.setItem("waiter", e.target.value);
                          // Force re-render if needed, but ManagerInterface uses it via takeOrder
                          window.location.reload(); // Quick way to sync since it's global staff state
                        }}
                        className="w-full bg-white p-5 rounded-2xl border-2 border-brand-black/5 focus:border-brand-gold outline-none font-bold text-lg shadow-sm"
                    >
                        <option value="">Nessun operatore</option>
                        <option value="Francesco">Francesco</option>
                        <option value="Annarita">Annarita</option>
                        <option value="Marcello">Marcello</option>
                        <option value="Beatrice">Beatrice</option>
                        <option value="Samuele">Samuele</option>
                    </select>
                    <p className="text-[9px] mt-4 opacity-40 uppercase font-bold tracking-wider px-2">
                        Questo nome verrà salvato su questo dispositivo per i nuovi ordini.
                    </p>
                </div>

                <div className="bg-brand-paper p-4 sm:p-6 rounded-[1.5rem] sm:rounded-3xl border border-brand-black/5 shadow-inner">
                    <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-4 px-2">
                        Tempo min. prep. Asporto (minuti)
                    </label>
                    <div className="flex items-center">
                        <input
                            type="number"
                            value={minPrepTime || 30}
                            onChange={(e) => onUpdateMinPrepTime?.(Number(e.target.value))}
                            className="w-full bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-brand-black/5 focus:border-brand-gold outline-none font-mono font-black text-xl sm:text-2xl shadow-sm text-center min-w-0"
                        />
                    </div>
                    <p className="text-[9px] mt-4 opacity-40 uppercase font-bold tracking-wider px-2">
                        Imposta il tempo minimo che i clienti vedranno per il ritiro dell'asporto.
                    </p>
                </div>

                <div className="bg-brand-paper p-4 sm:p-6 rounded-[1.5rem] sm:rounded-3xl border border-brand-black/5 shadow-inner">
                    <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-4 px-2">
                        Funzioni Ordini Clienti
                    </label>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-brand-black/5">
                            <span className="font-bold text-sm">Ordini dal Tavolo (da cliente)</span>
                            <button
                                onClick={() => {
                                    setLocalCustomerOrdersSettings(prev => ({ ...prev, allowTableOrders: !prev.allowTableOrders }));
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!localCustomerOrdersSettings.allowTableOrders ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                            >
                                {localCustomerOrdersSettings.allowTableOrders ? "ATTIVO" : "DISATTIVATO"}
                            </button>
                        </div>
                        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-brand-black/5">
                            <span className="font-bold text-sm">Ordini da Asporto (da cliente)</span>
                            <button
                                onClick={() => {
                                    setLocalCustomerOrdersSettings(prev => ({ ...prev, allowTakeawayOrders: !prev.allowTakeawayOrders }));
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!localCustomerOrdersSettings.allowTakeawayOrders ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                            >
                                {localCustomerOrdersSettings.allowTakeawayOrders ? "ATTIVO" : "DISATTIVATO"}
                            </button>
                        </div>
                        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-brand-black/5">
                            <span className="font-bold text-sm">Chiama Cameriere (da cliente)</span>
                            <button
                                onClick={() => {
                                    setLocalCustomerOrdersSettings(prev => ({ ...prev, allowCallWaiter: !prev.allowCallWaiter }));
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!localCustomerOrdersSettings.allowCallWaiter ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                            >
                                {localCustomerOrdersSettings.allowCallWaiter ? "ATTIVO" : "DISATTIVATO"}
                            </button>
                        </div>
                    </div>
                    <div className="mt-4">
                        <button
                            disabled={isSavingCustomerOrdersSettings}
                            onClick={async () => {
                                setIsSavingCustomerOrdersSettings(true);
                                try {
                                    await setDoc(doc(db, "settings", "customerOrders"), localCustomerOrdersSettings);
                                    alert("Impostazioni ordini salvate correttamente!");
                                } catch (e) {
                                    console.error("Errore salvataggio impostazioni ordini:", e);
                                    alert("Errore durante il salvataggio.");
                                } finally {
                                    setIsSavingCustomerOrdersSettings(false);
                                }
                            }}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2 ${JSON.stringify(customerOrdersSettings) === JSON.stringify(localCustomerOrdersSettings) ? "bg-white text-brand-black/40 border border-brand-black/5" : "bg-brand-black text-brand-gold"}`}
                        >
                            {isSavingCustomerOrdersSettings ? <RefreshCw size={14} className="animate-spin" /> : null}
                            Salva Impostazioni Ordini
                        </button>
                    </div>
                </div>

                <div className="bg-brand-paper p-4 sm:p-6 rounded-[1.5rem] sm:rounded-3xl border border-brand-black/5 shadow-inner">
                    <label className="block text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-4 px-2">
                        Orari Apertura Asporto
                    </label>
                    <div className="space-y-4">
                        {localTakeawayHours && ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                            const config = localTakeawayHours[day];
                            if (!config) return null;
                            const dayNames: any = {
                                mon: "Lunedì", tue: "Martedì", wed: "Mercoledì", 
                                thu: "Giovedì", fri: "Venerdì", sat: "Sabato", sun: "Domenica"
                            };
                            return (
                                <div key={day} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 bg-white p-4 rounded-2xl shadow-sm border border-brand-black/5">
                                    <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-4 mt-2">
                                      <span className="font-bold text-sm w-20">{dayNames[day]}</span>
                                      <button
                                          onClick={() => {
                                              setLocalTakeawayHours({ ...localTakeawayHours, [day]: { ...config, closed: !config.closed } });
                                          }}
                                          className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${config.closed ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"} sm:order-last`}
                                      >
                                          {config.closed ? "CHIUSO" : "APERTO"}
                                      </button>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto relative">
                                          <span className="text-[10px] uppercase font-black opacity-40 absolute -top-4 sm:-left-16 sm:top-2.5 hidden sm:block">Mattina</span>
                                          <input 
                                              type="time" 
                                              value={config.open} 
                                              disabled={config.closed}
                                              onChange={(e) => {
                                                  setLocalTakeawayHours({ ...localTakeawayHours, [day]: { ...config, open: e.target.value } });
                                              }}
                                              className="w-full sm:w-auto bg-brand-paper p-2 rounded-lg text-xs font-bold border border-brand-black/5 outline-none focus:border-brand-gold disabled:opacity-30"
                                          />
                                          <span className="opacity-20">-</span>
                                          <input 
                                              type="time" 
                                              value={config.close} 
                                              disabled={config.closed}
                                              onChange={(e) => {
                                                  setLocalTakeawayHours({ ...localTakeawayHours, [day]: { ...config, close: e.target.value } });
                                              }}
                                              className="w-full sm:w-auto bg-brand-paper p-2 rounded-lg text-xs font-bold border border-brand-black/5 outline-none focus:border-brand-gold disabled:opacity-30"
                                          />
                                      </div>
                                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto relative">
                                          <span className="text-[10px] uppercase font-black opacity-40 absolute -top-4 sm:-left-24 sm:top-2.5 hidden sm:block">Pomeriggio</span>
                                          <input 
                                              type="time" 
                                              value={config.openAfternoon || ""} 
                                              disabled={config.closed}
                                              onChange={(e) => {
                                                  setLocalTakeawayHours({ ...localTakeawayHours, [day]: { ...config, openAfternoon: e.target.value } });
                                              }}
                                              className="w-full sm:w-auto bg-brand-paper p-2 rounded-lg text-xs font-bold border border-brand-black/5 outline-none focus:border-brand-gold disabled:opacity-30"
                                          />
                                          <span className="opacity-20">-</span>
                                          <input 
                                              type="time" 
                                              value={config.closeAfternoon || ""} 
                                              disabled={config.closed}
                                              onChange={(e) => {
                                                  setLocalTakeawayHours({ ...localTakeawayHours, [day]: { ...config, closeAfternoon: e.target.value } });
                                              }}
                                              className="w-full sm:w-auto bg-brand-paper p-2 rounded-lg text-xs font-bold border border-brand-black/5 outline-none focus:border-brand-gold disabled:opacity-30"
                                          />
                                      </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-8">
                        <button
                            disabled={isSavingHours}
                            onClick={async () => {
                                setIsSavingHours(true);
                                try {
                                    await setDoc(doc(db, "settings", "takeawayHours"), localTakeawayHours);
                                    setTakeawayHours(localTakeawayHours);
                                    alert("Orari salvati correttamente!");
                                } catch (e) {
                                    console.error("Errore salvataggio orari:", e);
                                    alert("Errore durante il salvataggio degli orari.");
                                } finally {
                                    setIsSavingHours(false);
                                }
                            }}
                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3 ${JSON.stringify(takeawayHours) === JSON.stringify(localTakeawayHours) ? "bg-brand-paper text-brand-black/20 border border-brand-black/5" : "bg-brand-black text-brand-gold"}`}
                        >
                            {isSavingHours ? t("savingHours", lang) : t("saveTakeawayHours", lang)}
                        </button>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-3 p-6 rounded-2xl bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors shadow-sm"
                >
                    <LogOut size={20} /> Disconnetti Account Staff
                </button>
            </div>
        </div>
      ) : (managerTab as any) === "tables" ? (
        <div className="bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl border border-brand-gold/20">
            <h2 className="font-logo text-3xl sm:text-5xl text-brand-black mb-8 text-center uppercase tracking-tighter">Unione Tavoli</h2>
            <p className="text-center italic opacity-60 mb-12 font-serif text-lg">Collega permanentemente un tavolo ad un altro per unire i pagamenti automaticamente.</p>
            
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-brand-paper p-4 sm:p-8 rounded-[1.5rem] sm:rounded-3xl border-2 border-dashed border-brand-gold/30">
                    <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-center opacity-40">Aggiungi Collegamento</h3>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase opacity-40 px-2 tracking-widest">Tavolo "Figlio" (quello da muovere)</label>
                            <input 
                                id="childTableInput"
                                type="text" 
                                placeholder="Esempio: 5" 
                                className="w-full p-4 sm:p-5 bg-white rounded-xl sm:rounded-2xl border-2 border-brand-black/5 outline-none focus:border-brand-gold font-serif italic text-xl sm:text-2xl shadow-inner min-w-0"
                            />
                        </div>
                        <div className="flex flex-col gap-2 text-center py-2">
                           <div className="w-8 h-8 bg-brand-gold rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                              <ChevronDown size={16} className="text-brand-black" />
                           </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase opacity-40 px-2 tracking-widest">Tavolo "Master" (quello principale)</label>
                            <input 
                                id="parentTableInput"
                                type="text" 
                                placeholder="Esempio: 2" 
                                className="w-full p-4 sm:p-5 bg-white rounded-xl sm:rounded-2xl border-2 border-brand-black/5 outline-none focus:border-brand-gold font-serif italic text-xl sm:text-2xl shadow-inner min-w-0"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                const child = (document.getElementById("childTableInput") as HTMLInputElement).value;
                                const parent = (document.getElementById("parentTableInput") as HTMLInputElement).value;
                                if (child && parent) {
                                    updateTableMapping(child, parent);
                                    (document.getElementById("childTableInput") as HTMLInputElement).value = "";
                                    (document.getElementById("parentTableInput") as HTMLInputElement).value = "";
                                }
                            }}
                            className="bg-brand-black text-brand-gold py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
                        >
                            Unisci Tavoli
                        </button>
                    </div>
                </div>

                <div className="bg-brand-paper p-4 sm:p-8 rounded-[1.5rem] sm:rounded-3xl border border-brand-black/5 shadow-inner">
                    <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-center opacity-40">Tavoli Uniti Attualmente</h3>
                    <div className="space-y-4">
                        {Object.entries(tableMappings).length > 0 ? (
                            Object.entries(tableMappings).map(([child, parent]) => (
                                <div key={child} className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-brand-black/5 group hover:border-brand-gold transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-brand-black text-brand-gold rounded-full flex items-center justify-center font-serif italic text-xl">
                                          {child}
                                        </div>
                                        <span className="opacity-20">→</span>
                                        <div className="w-12 h-12 bg-brand-gold text-brand-black rounded-full flex items-center justify-center font-serif italic text-2xl shadow-md">
                                          {parent}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => updateTableMapping(child, null)}
                                        className="bg-red-50 text-red-500 p-4 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                        title="Scollega"
                                    >
                                        <Split size={20} className="rotate-180" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                              <Split size={40} className="mx-auto opacity-10 mb-4" />
                              <p className="opacity-30 italic font-serif text-lg">Nessun accoppiamento attivo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-2 bg-brand-paper p-1.5 rounded-2xl shadow-inner border border-brand-black/5 overflow-hidden">
            {[
              { id: "all", label: "🔥 Attivi", count: categoryCounts.all },
              { id: "toDeliver", label: "🏃 In preparazione", count: categoryCounts.pending + categoryCounts.toDeliver },
              { id: "served", label: "✅ Serviti", count: categoryCounts.served },
              { id: "paid", label: "💰 Pagati", count: categoryCounts.paid },
              { id: "deleted", label: "🗑️ Eliminati", count: categoryCounts.deleted },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setFilter(s.id as any);
                }}
                className={`w-full flex-1 px-2 py-3 rounded-xl text-[9px] sm:text-[10px] font-black tracking-widest transition-all text-center flex items-center justify-between gap-1 overflow-hidden ${filter === s.id ? "bg-brand-black text-brand-gold shadow-2xl" : "hover:bg-brand-black/5"}`}
              >
                <span className="truncate whitespace-nowrap">{s.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] bg-white/10 ${filter !== s.id && "bg-brand-black/10 text-brand-black"}`}>{s.count}</span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {filter === "paid" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <div className="flex flex-col gap-3 max-w-md mx-auto">
                  <div className="flex bg-white rounded-2xl p-1 border border-brand-black/10 shadow-sm">
                    {(["today", "week", "month", "custom", "all"] as const).map(
                      (period) => (
                        <button
                          key={period}
                          onClick={() => setPaidPeriod(period)}
                          className={`flex-1 py-3 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                            paidPeriod === period
                              ? "bg-brand-black text-brand-gold shadow-md"
                              : "text-brand-black/50 hover:bg-brand-black/5"
                          }`}
                        >
                          {period === "today"
                            ? "Oggi"
                            : period === "week"
                            ? "7 GG"
                            : period === "month"
                            ? "30 GG"
                            : period === "custom"
                            ? "Custom"
                            : "Tutti"}
                        </button>
                      )
                    )}
                  </div>

                  <AnimatePresence>
                    {paidPeriod === "custom" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white p-3 rounded-2xl border border-brand-black/10 shadow-sm flex items-center justify-between gap-3 overflow-hidden"
                      >
                         <div className="flex flex-col flex-1">
                           <label className="text-[9px] font-black uppercase tracking-widest text-brand-black/50 ml-2 mb-1">Da</label>
                           <input 
                             type="date" 
                             value={customStartDate}
                             onChange={(e) => setCustomStartDate(e.target.value)}
                             className="bg-brand-paper px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border border-brand-black/10 focus:outline-none focus:border-brand-gold"
                           />
                         </div>
                         <div className="flex flex-col flex-1">
                           <label className="text-[9px] font-black uppercase tracking-widest text-brand-black/50 ml-2 mb-1">A</label>
                           <input 
                             type="date" 
                             value={customEndDate}
                             onChange={(e) => setCustomEndDate(e.target.value)}
                             className="bg-brand-paper px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border border-brand-black/10 focus:outline-none focus:border-brand-gold"
                           />
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {filter === ("deleted" as any) && filteredOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 flex justify-center"
              >
                <button
                  onClick={() => setDeleteConfirm({ type: "all" })}
                  className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm"
                >
                  <Trash2 size={16} /> ELIMINA TUTTI (DEFINITIVO)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {filter === "all" ? (
             <div className="bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl border border-brand-gold/20">
                <h3 className="font-logo text-2xl sm:text-4xl text-brand-black mb-8 text-center uppercase tracking-tighter">Recap Tavoli Attivi</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredOrders.filter(o => o.status !== "linked").map(order => {
                      const isPending = order.items.some(i => (i as any).originStatus === 'pending' || (!(i as any).originStatus && order.status === 'pending'));
                      const isPreparing = order.items.some(i => (i as any).originStatus === 'preparing' || (!(i as any).originStatus && order.status === 'preparing'));
                      const statusMsg = order.status === "cancelled" ? "ANNULLATO" : order.status === "paid" ? "PAGATO" : order.status === "delivered" ? "CONSEGNATO" : isPending ? "IN ATTESA" : isPreparing ? "IN PREPARAZIONE" : "SERVITO";
                      
                      return (
                      <div key={`${order.id}-${order.status}`} className="bg-brand-paper p-6 rounded-3xl shadow-sm border border-brand-black/5 flex flex-col items-center justify-center text-center hover:border-brand-gold transition-all hover:-translate-y-1 cursor-pointer" onClick={() => setViewingTableOrder(order)}>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center font-serif italic text-2xl font-bold mb-3 shadow-inner border border-brand-black/10 ${isPending ? 'bg-amber-100 text-amber-700 animate-pulse' : isPreparing ? 'bg-amber-50 text-amber-600' : 'bg-green-100 text-green-700'}`}>
                            {order.tableNumber}
                          </div>
                          <span className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-1 max-w-full truncate px-2 leading-tight">
                            {order.customerName ? `${order.customerName} ${order.customerLastName || ''}`.trim() : 'Ospite'}
                            {order.customerPhone && <><br/>{order.customerPhone}</>}
                          </span>
                          <span className="font-mono font-bold text-brand-black text-sm">€{order.total.toFixed(2)}</span>
                          <span className={`mt-2 text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded-md ${isPending ? 'bg-amber-100 text-amber-700' : isPreparing ? 'bg-amber-50 text-amber-600' : 'bg-green-100 text-green-700'}`}>
                             {statusMsg}
                          </span>
                          <div className="mt-3 text-[8px] uppercase tracking-widest font-black opacity-30 flex gap-1 items-center justify-center">
                              <span>{order.items.length} {t("pieces", lang)}</span>
                          </div>
                      </div>
                  )})}
                  {filteredOrders.length === 0 && (
                    <div className="col-span-full py-12 text-center text-brand-black/30 font-bold uppercase tracking-widest text-sm">
                      Nessun tavolo occupato attualmente.
                    </div>
                  )}
                </div>
             </div>
          ) : (
             <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredOrders.map((order) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={`${order.id}-${order.status}`}
                  className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-brand-gold/10 relative overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:shadow-brand-gold/5"
                >
                  {/* Status Indicator Bar */}
                  <div
                    className={`absolute top-0 left-0 w-full h-1.5 ${
                      order.status === "pending" || order.status === "preparing"
                        ? "bg-amber-500"
                        : order.status === "served"
                            ? "bg-green-600"
                            : "bg-brand-black"
                    }`}
                  />
                  
                  {/* Removed merging selector as table mappings handle it now */}

                  <div className="flex justify-between items-start mb-4 sm:mb-6 pt-2">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-serif italic text-brand-black leading-none flex items-center flex-wrap gap-2">
                        {t("table", lang)} {order.tableNumber}
                        <button
                          onClick={() => {
                            setMovingOrderId(movingOrderId === order.id ? null : order.id);
                            if (movingOrderId !== order.id) setNewTableNumber(order.tableNumber);
                            setLinkingOrderId(null);
                          }}
                          className="p-1 ml-1 text-brand-black/30 hover:text-brand-black hover:bg-brand-black/5 rounded-full transition-colors"
                          title="Modifica N. Tavolo"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setLinkingOrderId(linkingOrderId === order.id ? null : order.id);
                            setLinkTableNumber("");
                            setMovingOrderId(null);
                          }}
                          className="p-1 text-brand-black/30 hover:text-brand-black hover:bg-brand-black/5 rounded-full transition-colors"
                          title="Accorpa con Tavolo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </button>
                        {order.linkedTables && order.linkedTables.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-sans font-black bg-brand-gold text-brand-black px-2 py-1 rounded uppercase tracking-tighter shadow-sm">
                              + {order.linkedTables.join(", ")}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                order.linkedTables?.forEach(child => {
                                    updateTableMapping(child, null);
                                });
                              }}
                              className="p-1 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                              title="Scollega tavoli"
                            >
                              <Split size={14} className="rotate-180" />
                            </button>
                          </div>
                        )}
                      </h3>
                      {movingOrderId === order.id && (
                        <div className="flex gap-2 mt-3 mb-1">
                          <input
                            type="text"
                            value={newTableNumber}
                            onChange={(e) => setNewTableNumber(e.target.value)}
                            placeholder="N. tavolo"
                            className="border border-brand-black/20 rounded-lg px-3 py-1.5 text-sm w-32 focus:border-brand-black focus:ring-1 focus:ring-brand-black outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              changeTableNumber(order.id, newTableNumber);
                              setMovingOrderId(null);
                            }}
                            className="bg-brand-black text-brand-gold px-4 py-1.5 text-xs rounded-lg font-bold hover:scale-105 transition-transform"
                          >
                            Salva
                          </button>
                        </div>
                      )}
                      {linkingOrderId === order.id && (
                        <div className="flex gap-2 mt-3 mb-1">
                          <input
                            type="text"
                            value={linkTableNumber}
                            onChange={(e) => setLinkTableNumber(e.target.value)}
                            placeholder="Tavolo da accorpare"
                            className="border border-brand-black/20 rounded-lg px-3 py-1.5 text-sm w-40 focus:border-brand-black focus:ring-1 focus:ring-brand-black outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (linkTableNumber.trim()) {
                                 const root = order.tableNumber.split(" e ")[0]; // just in case it's already a group label
                                 updateTableMapping(linkTableNumber.trim(), root);
                                 setLinkingOrderId(null);
                              }
                            }}
                            className="bg-brand-gold text-brand-black px-4 py-1.5 text-xs rounded-lg font-bold hover:scale-105 transition-transform"
                          >
                            Accorpa
                          </button>
                        </div>
                      )}
                      {order.status !== "paid" && order.createdAt && (
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${(() => {
                           const minutes = Math.floor((nowMillis - (order.createdAt?.toMillis ? order.createdAt.toMillis() : Date.now())) / 60000);
                           if (minutes >= 20) return "text-red-500";
                           if (minutes >= 10) return "text-orange-500";
                           return "text-brand-black/40";
                        })()}`}>
                           In attesa da: {Math.max(0, Math.floor((nowMillis - (order.createdAt?.toMillis ? order.createdAt.toMillis() : Date.now())) / 60000))} min
                        </p>
                      )}
                      {(order.customerName || order.customerLastName || order.customerPhone) && (
                        <p className="font-bold text-sm text-brand-black/60 mt-1 uppercase tracking-wider leading-tight">
                          {order.customerName ? `${order.customerName} ${order.customerLastName || ''}`.trim() : 'Ospite'}
                          {order.customerPhone && <><br /><span className="text-[10px] font-mono tracking-widest">{order.customerPhone}</span></>}
                        </p>
                      )}
                      <p className="font-mono text-[10px] opacity-30 mt-3 uppercase tracking-[0.2em]">
                        {order.id.slice(-6).toUpperCase()}
                      </p>
                    </div>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus((order as any).originalGroupedOrder?.id || order.id, e.target.value as OrderStatus, order.status)}
                      className={`appearance-none outline-none flex items-center justify-center gap-2 px-6 py-2 rounded-full border border-b-2 font-black uppercase tracking-widest text-[10px] cursor-pointer shadow-sm hover:opacity-80 transition-opacity ${
                        order.status === "pending" || order.status === "preparing"
                          ? "bg-amber-50 border-amber-300 text-amber-700"
                          : order.status === "served"
                              ? "bg-green-50 border-green-300 text-green-700"
                              : "bg-gray-50 border-gray-300 text-gray-700"
                      }`}
                    >
                        <option value="pending">IN ATTESA</option>
                        <option value="preparing">IN PREPARAZIONE</option>
                        <option value="served">SERVITO</option>
                        <option value="paid">PAGATO</option>
                        <option value="cancelled">ANNULLATO</option>
                    </select>
                  </div>

                  <ul className="space-y-4 mb-4 border-t border-b border-brand-gold/10 py-6 flex-grow">
                    {order.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-start group/item pl-1 pr-1"
                      >
                        <div className="flex gap-4 flex-1 items-start">
                          <div className="w-6 shrink-0 pt-0.5 text-left">
                            <span className="text-brand-gold font-black font-mono text-lg leading-none">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-1 text-left pt-1 cursor-pointer hover:bg-brand-black/5 p-2 -ml-2 rounded-xl transition-colors" onClick={() => setViewingItem(item)}>
                            <div className="font-bold text-brand-black leading-tight flex items-center gap-2 text-left">
                              <span>{item.name}</span>
                              {item.variant && (
                                <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-md font-black">
                                  {item.variant}
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <span className="block text-xs text-brand-gold/80 italic mt-1 leading-snug">
                                Note: {item.notes.replace("[AGGIUNTA]", "").trim()}
                              </span>
                            )}
                            {item.subItems && item.subItems.length > 0 && (
                              <div className="mt-1 pl-2 border-l border-brand-gold/30">
                                {item.subItems.map((si, i) => (
                                  <div
                                    key={i}
                                    className="text-xs text-brand-black/70 flex justify-between gap-4"
                                  >
                                    <span>- {si.name}</span>
                                    <span>€ {si.price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <span className="text-[10px] opacity-40 font-medium block mt-1">
                              {getMenu().find(p => p.id === item.productId)?.isPricePerKg ? 'al kg ' : 'cad. '}€ {item.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 shrink-0 pt-1">
                          <span className="font-black text-brand-black font-mono whitespace-nowrap min-w-[70px] text-right">
                            € {(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            onClick={() => deleteItemFromOrder(order.id, item)}
                            className="text-red-400 opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-50 rounded-full transition-all shrink-0 -mt-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <div className="mb-6 p-4 bg-brand-gold/10 rounded-2xl border border-brand-gold/30">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold-dark mb-1">
                        {t("orderNotes", lang)}
                      </p>
                      <p className="text-sm font-medium italic text-brand-black">
                        {order.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-8 bg-brand-paper p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30">
                      {order.createdAt?.toDate().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-brand-black leading-none">
                        € {order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-brand-gold/5">
                    {/* Primary Actions */}
                    <div className="flex flex-col gap-2">
                       {order.status === "pending" && (
                         <button
                           onClick={() => updateStatus(order.id, "preparing", "pending")}
                           className="w-full bg-brand-gold text-brand-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all border border-brand-gold/20"
                         >
                           <Truck size={20} /> {t("startPrep", lang)}
                         </button>
                       )}
                       {order.status === "preparing" && (
                         <button
                           onClick={() => updateStatus(order.id, "served", "preparing")}
                           className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                         >
                           <CheckCircle2 size={20} /> {t("markServed", lang)}
                         </button>
                       )}
                       {order.status === "served" && (
                         <button
                           onClick={() => {
                             const originalOrder = (order as any).originalGroupedOrder || orders.find(o => o.id === order.id) || order;
                             setPaymentOrder(originalOrder);
                             setSelectedItemsForPayment([]);
                           }}
                           className="w-full bg-brand-black text-brand-gold py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all border border-brand-gold/20"
                         >
                           <Receipt size={20} /> GESTISCI PAGAMENTO
                         </button>
                       )}
                       {(order.status === "paid" || order.status === "delivered") && (
                         <>
                           <button
                             onClick={() => {
                               const originalOrder = (order as any).originalGroupedOrder || orders.find(o => o.id === order.id) || order;
                               setPaymentOrder(originalOrder);
                               setSelectedItemsForPayment([]);
                             }}
                             className="w-full bg-brand-gold text-brand-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all border border-brand-black/10"
                           >
                             <ClipboardList size={20} /> STORICO PAGAMENTI
                           </button>
                           <button
                             onClick={async () => {
                               const originalOrder = (order as any).originalGroupedOrder || orders.find(o => o.id === order.id) || order;
                               await generateFullOrderReceiptPdf(originalOrder);
                             }}
                             className="w-full mt-2 bg-brand-black/5 text-brand-black/60 hover:text-brand-black hover:bg-brand-black/10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-colors"
                           >
                             <Download size={20} /> SCARICA RICEVUTA PDF
                           </button>
                         </>
                       )}
                    </div>

                    {/* Secondary Actions Shelf */}
                    <div className={`grid ${order.status === "cancelled" ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
                      <button
                        onClick={() => {
                          setEditingOrder(order);
                          setManagerView("editOrder");
                        }}
                        className="bg-brand-paper py-3 rounded-xl font-black text-[9px] uppercase tracking-tighter flex flex-col items-center justify-center gap-1 opacity-60 hover:opacity-100 transition-colors border border-brand-black/5"
                        title={t("edit", lang)}
                      >
                         <ClipboardList size={16} />
                         <span>MODIFICA</span>
                      </button>

                      {order.status === "cancelled" ? (
                        <>
                          <button
                            onClick={() => updateStatus(order.id, "pending")}
                            className="bg-green-50 text-green-700 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 hover:bg-green-100 transition-colors border border-green-200"
                          >
                            <RefreshCw size={16} /> <span className="leading-tight text-center">RIPRISTINA</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: "single", orderId: order.id })}
                            className="bg-red-50 text-red-600 py-3 rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 hover:bg-red-500 hover:text-white transition-all border border-red-200"
                            title="Elimina Definitivamente"
                          >
                            <Trash2 size={16} /> <span className="leading-tight text-center">ELIMINA<br/>DEFINITIVO</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            updateStatus(order.id, "cancelled", order.status);
                          }}
                          className="bg-red-50 text-red-500 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 hover:bg-red-500 hover:text-white transition-all border border-red-100"
                        >
                          <Trash2 size={16} /> <span className="leading-tight text-center">ELIMINA</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredOrders.length === 0 && (
              <div className="col-span-full py-32 text-center opacity-20">
                <ClipboardList size={80} className="mx-auto mb-4" />
                <p className="text-2xl font-serif">{t("noOrders", lang)}</p>
              </div>
            )}
          </div>
          )}
        </>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white max-w-sm w-full rounded-[2.5rem] p-8 shadow-2xl relative">
            <h2 className="font-logo text-2xl sm:text-3xl mb-4 text-brand-black leading-none">
              Conferma Eliminazione
            </h2>
            <p className="text-sm font-bold text-brand-black/70 mb-8 leading-relaxed">
              {deleteConfirm.type === "all" 
                ? "Sei sicuro di voler eliminare DEFINITIVAMENTE tutti gli ordini nel cestino? Questa operazione è IRREVERSIBILE."
                : "Sei sicuro di voler eliminare DEFINITIVAMENTE questo ordine? Questa operazione è IRREVERSIBILE."}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-4 bg-brand-paper hover:bg-brand-black/5 rounded-xl font-black text-xs uppercase tracking-widest text-brand-black border border-brand-black/10 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === "all") {
                    deleteAllCancelledOrdersPermanently();
                  } else if (deleteConfirm.orderId) {
                    deleteOrderPermanently(deleteConfirm.orderId);
                  }
                }}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-colors border border-red-600 shadow-md"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-[3rem] p-8 shadow-2xl relative">
            <button
              onClick={() => setPaymentOrder(null)}
              className="absolute top-6 right-6 p-4 bg-brand-black/5 hover:bg-brand-black/10 rounded-full transition-colors"
            >
              <XCircle size={24} className="text-brand-black" />
            </button>
            <h2 className="font-logo text-3xl sm:text-4xl mb-6 pr-12 text-brand-black leading-none">
              Gestione Pagamento
            </h2>
            <div className="mb-6 p-4 sm:p-6 bg-brand-gold/10 border-2 border-brand-gold/30 rounded-3xl grid grid-cols-3 gap-2 sm:gap-4 items-center text-brand-black overflow-hidden">
              <div className="text-left flex flex-col items-start min-w-0 pr-2">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 truncate w-full">
                  Totale
                </p>
                <p className="font-mono text-base sm:text-2xl lg:text-3xl font-black">
                  € {paymentOrder.total.toFixed(2)}
                </p>
              </div>
              <div className="text-center flex flex-col items-center border-l border-r border-brand-black/10 px-2 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-green-700 mb-1 opacity-70 truncate w-full">
                  Già Pagato
                </p>
                <p className="font-mono text-base sm:text-2xl lg:text-3xl font-black text-green-700">
                  € {(paymentOrder.paidAmount > 900000 ? paymentOrder.total : (paymentOrder.paidAmount || 0)).toFixed(2)}
                </p>
              </div>
              <div className="text-right flex flex-col items-end min-w-0 pl-2">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-700 mb-1 opacity-70 truncate w-full">
                  Da Pagare
                </p>
                <p className="font-mono text-base sm:text-2xl lg:text-3xl font-black text-red-600">
                  € {Math.max(0, paymentOrder.total - (paymentOrder.paidAmount > 900000 ? paymentOrder.total : (paymentOrder.paidAmount || 0))).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Mobile Dropdown */}
            <div className="sm:hidden mb-8 relative">
              <select 
                value={paymentTab} 
                onChange={(e) => setPaymentTab(e.target.value as "totale" | "romana" | "items")}
                className="w-full appearance-none bg-brand-paper py-4 px-5 rounded-2xl text-sm font-black uppercase tracking-widest text-brand-black border-2 border-brand-black/5 outline-none focus:border-brand-gold/50"
              >
                <option value="totale">Totale</option>
                <option value="romana">Romana</option>
                <option value="items">Prodotti</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <ChevronDown size={20} />
              </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden sm:flex gap-1.5 sm:gap-2 bg-brand-paper p-1.5 sm:p-2 rounded-2xl mb-8 w-full">
              <button
                onClick={() => setPaymentTab("totale")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${paymentTab === "totale" ? "bg-brand-black text-brand-gold shadow-md" : "text-brand-black/40 hover:bg-brand-black/5"}`}
              >
                <Coins size={16} /> Totale
              </button>
              <button
                onClick={() => setPaymentTab("romana")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${paymentTab === "romana" ? "bg-brand-black text-brand-gold shadow-md" : "text-brand-black/40 hover:bg-brand-black/5"}`}
              >
                <Split size={16} /> Romana
              </button>
              <button
                onClick={() => setPaymentTab("items")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${paymentTab === "items" ? "bg-brand-black text-brand-gold shadow-md" : "text-brand-black/40 hover:bg-brand-black/5"}`}
              >
                <ListChecks size={16} /> Prodotti
              </button>
            </div>

            {paymentTab === "totale" && (
              <div className="bg-brand-paper p-8 rounded-3xl border border-brand-black/5 text-center">
                <p className="text-sm font-bold opacity-60 mb-4">
                  Incassa l'intero saldo ancora da pagare
                </p>
                <p className="font-mono text-5xl font-black mb-8">
                  €{" "}
                  {Math.max(
                    0,
                    paymentOrder.total - (paymentOrder.paidAmount > 900000 ? paymentOrder.total : (paymentOrder.paidAmount || 0)),
                  ).toFixed(2)}
                </p>
                <button
                  onClick={() =>
                    setPendingPayment({
                      amount: Math.max(
                        0,
                        paymentOrder.total - (paymentOrder.paidAmount > 900000 ? paymentOrder.total : (paymentOrder.paidAmount || 0)),
                      ),
                      items: [],
                    })
                  }
                  className="w-full bg-green-600 text-white py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-green-500 active:scale-95 transition-all"
                >
                  <CheckCircle2 size={24} /> Incassa Tutto
                </button>
              </div>
            )}

            {paymentTab === "romana" && (
              <div className="bg-brand-paper p-8 rounded-3xl border border-brand-black/5">
                {paymentOrder.romana ? (
                  <div className="text-center">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-brand-gold text-brand-black px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest mx-auto flex items-center gap-2">
                         <Split size={14} /> Romana Bloccata
                      </div>
                    </div>
                    <p className="text-sm font-bold text-brand-black mb-2 opacity-60">
                      Valore della quota
                    </p>
                    <p className="text-4xl font-black font-mono mb-4 text-brand-gold-dark">
                      € {paymentOrder.romana.quotaValue.toFixed(2)}
                    </p>
                    <div className="bg-white rounded-2xl p-4 mb-8 shadow-sm">
                       <p className="text-sm font-bold uppercase tracking-widest text-brand-black/50 mb-2">Stato Quote</p>
                       <p className="font-mono text-2xl font-black">
                         {paymentOrder.romana.paidQuotas} <span className="opacity-40">/ {paymentOrder.romana.totalQuotas} pagate</span>
                       </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <button
                        onClick={() => setPendingPayment({ amount: paymentOrder.romana!.quotaValue, items: [], isRomana: true })}
                        disabled={paymentOrder.romana.paidQuotas >= paymentOrder.romana.totalQuotas}
                        className="w-full bg-brand-gold text-brand-black py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <Coins size={20} /> Incassa Quota ({paymentOrder.romana.totalQuotas - paymentOrder.romana.paidQuotas} Rimanenti)
                      </button>
                      <button
                        onClick={async () => {
                           const isGrouped = paymentOrder.id.startsWith("table_");
                           if (!isGrouped) {
                              await updateDoc(doc(db, "orders", paymentOrder.id), { romana: deleteField() });
                           } else {
                              const orderIdsToUpdate = (paymentOrder.allOrderIds || [paymentOrder.id]).filter(id => !id.startsWith("table_"));
                              await Promise.all(orderIdsToUpdate.map(async (id) => {
                                 await updateDoc(doc(db, "orders", id), { romana: deleteField() });
                              }));
                           }
                           setPaymentOrder({ ...paymentOrder, romana: undefined });
                        }}
                        className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-[1.5rem] font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all"
                      >
                        Sblocca Romana
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="block text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">
                      Dividi l'importo rimanente per
                    </label>
                    <div className="flex items-center justify-center gap-6 mb-8">
                      <button
                        onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                        className="w-16 h-16 bg-white rounded-2xl shadow-sm text-brand-black font-black flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-all outline-none"
                      >
                        -
                      </button>
                      <span className="font-serif italic text-4xl sm:text-6xl text-brand-black">
                        {splitCount}
                      </span>
                      <button
                        onClick={() => setSplitCount(splitCount + 1)}
                        className="w-16 h-16 bg-white rounded-2xl shadow-sm text-brand-black font-black flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-all outline-none"
                      >
                        +
                      </button>
                    </div>
                    
                    {(() => {
                      const remainingAmount = Math.max(0, paymentOrder.total - (paymentOrder.paidAmount > 900000 ? paymentOrder.total : (paymentOrder.paidAmount || 0)));
                      const valQuota = remainingAmount / splitCount;

                      return (
                        <div className="text-center mb-4">
                          <p className="text-sm font-bold text-brand-black mb-2 opacity-60">
                            Valore della quota
                          </p>
                          <p className="text-3xl sm:text-4xl font-black font-mono">
                            € {valQuota.toFixed(2)}
                          </p>

                          <div className="mt-8">
                            <button
                               onClick={async () => {
                                  const baseRomana = {
                                     totalQuotas: splitCount,
                                     paidQuotas: 0,
                                     quotaValue: valQuota
                                  };
                                  const isGrouped = paymentOrder.id.startsWith("table_");
                                  if (!isGrouped) {
                                     await updateDoc(doc(db, "orders", paymentOrder.id), { romana: baseRomana });
                                  } else {
                                     const orderIdsToUpdate = (paymentOrder.allOrderIds || [paymentOrder.id]).filter(id => !id.startsWith("table_"));
                                     await Promise.all(orderIdsToUpdate.map(async (id) => {
                                        await updateDoc(doc(db, "orders", id), { romana: baseRomana });
                                     }));
                                  }
                                  setPaymentOrder({ ...paymentOrder, romana: baseRomana });
                               }}
                               disabled={remainingAmount <= 0}
                               className="w-full bg-brand-black text-brand-gold py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                               <LockIcon size={20} /> Blocca Romana e Inizia
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {paymentTab === "items" && (
              <div className="bg-brand-paper p-6 rounded-3xl border border-brand-black/5">
                {paymentOrder.items.map((item, idx) => {
                  const availQty = item.quantity - (item.paidQuantity || 0);
                  const selQtyObj = selectedItemsForPayment.find(
                    (s) => s.idx === idx,
                  );
                  const selQty = selQtyObj ? selQtyObj.qty : 0;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 mb-3 border bg-white rounded-2xl overflow-hidden ${availQty === 0 ? "opacity-40 grayscale" : "hover:border-brand-gold/50 transition-colors"}`}
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-brand-gold/20 text-brand-black flex items-center justify-center font-black font-mono mt-0.5 sm:mt-0 text-sm sm:text-base">
                          {item.quantity}
                        </div>
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-brand-black leading-tight text-base sm:text-lg break-words">
                            {item.name}
                            {item.variant && <span className="block text-sm opacity-60 font-medium">({item.variant})</span>}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                            <span className="text-xs font-semibold opacity-50">
                              {item.paidQuantity || 0} pagati, {availQty} da pagare
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-brand-black/5 mt-2 sm:mt-0">
                        <span className="font-mono font-black text-brand-black whitespace-nowrap sm:mr-4">
                           € {item.price.toFixed(2)}{" "}
                           <span className="opacity-40 text-[10px] uppercase">{getMenu().find(p => p.id === item.productId)?.isPricePerKg ? 'al kg' : 'cad.'}</span>
                        </span>
                        {availQty > 0 ? (
                          <div className="flex items-center gap-2 sm:gap-3 border border-brand-black/10 rounded-full p-1 bg-brand-paper shrink-0">
                            <button
                              onClick={() => {
                                setSelectedItemsForPayment((prev) => {
                                  const existing = prev.find(
                                    (p) => p.idx === idx,
                                  );
                                  if (!existing || existing.qty === 0)
                                    return prev;
                                  return prev
                                    .map((p) =>
                                      p.idx === idx
                                        ? { ...p, qty: p.qty - 1 }
                                        : p,
                                    )
                                    .filter((p) => p.qty > 0);
                                });
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-full font-black text-brand-black shadow-sm active:scale-95 transition-transform"
                            >
                              -
                            </button>
                            <span className="font-black text-base sm:text-lg w-4 text-center">
                              {selQty}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedItemsForPayment((prev) => {
                                  const existing = prev.find(
                                    (p) => p.idx === idx,
                                  );
                                  if (existing) {
                                    if (existing.qty < availQty) {
                                      return prev.map((p) =>
                                        p.idx === idx
                                          ? { ...p, qty: p.qty + 1 }
                                          : p,
                                      );
                                    }
                                    return prev;
                                  }
                                  return [...prev, { idx, qty: 1 }];
                                });
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-full font-black text-brand-black shadow-sm active:scale-95 transition-transform"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0">
                            Pagato
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="mt-8 pt-6 border-t-2 border-brand-black/5 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">
                      Totale Selezionato
                    </p>
                    <p className="font-mono text-4xl sm:text-3xl font-black text-brand-black">
                      €{" "}
                      {selectedItemsForPayment
                        .reduce(
                          (acc, sel) =>
                            acc + paymentOrder.items[sel.idx].price * sel.qty,
                          0,
                        )
                        .toFixed(2)}
                    </p>
                  </div>
                  <button
                    disabled={selectedItemsForPayment.length === 0}
                    onClick={() => {
                      const amount = selectedItemsForPayment.reduce(
                        (acc, sel) =>
                          acc + paymentOrder.items[sel.idx].price * sel.qty,
                        0,
                      );
                      setPendingPayment({ amount, items: selectedItemsForPayment });
                    }}
                    className={`w-full sm:w-auto justify-center px-8 py-5 sm:py-5 sm:px-8 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center gap-3 transition-all ${selectedItemsForPayment.length > 0 ? "bg-brand-black text-brand-gold shadow-xl hover:scale-105 active:scale-95" : "bg-brand-black/10 text-brand-black/40 cursor-not-allowed"}`}
                  >
                    <Coins size={20} /> Incassa Sel.
                  </button>
                </div>
              </div>
            )}

            {Math.max(0, paymentOrder.total - (paymentOrder.paidAmount > 900000 ? paymentOrder.total : (paymentOrder.paidAmount || 0))) >
              0 && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() =>
                    setPendingPayment({
                      amount: Math.max(
                        0,
                        paymentOrder.total - (paymentOrder.paidAmount > 900000 ? paymentOrder.total : (paymentOrder.paidAmount || 0)),
                      ),
                      items: [],
                    })
                  }
                  className="w-full sm:w-auto justify-center bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-green-500 active:scale-95 transition-all text-center"
                >
                  <CheckCircle2 size={18} /> SALDA INTERO RIMANENTE
                </button>
              </div>
            )}

            {Math.max(0, paymentOrder.total - (paymentOrder.paidAmount > 900000 ? paymentOrder.total : (paymentOrder.paidAmount || 0))) <= 0 && (
              <div className="mt-8 border-2 border-brand-black/10 bg-brand-black/5 p-6 lg:p-8 rounded-[2rem] flex flex-col items-center gap-4 text-center">
                 <CheckCircle2 size={48} className="text-green-600 mb-2" />
                 <h3 className="text-2xl font-serif font-black text-brand-black">Ordine Saldato</h3>
                 <p className="text-xs font-black uppercase tracking-widest text-brand-black/40 mb-2">L'ordine è stato incassato interamente.</p>
                 <button
                  onClick={async () => {
                     await generateFullOrderReceiptPdf(paymentOrder);
                  }}
                  className="w-full sm:w-auto px-8 py-5 bg-brand-black text-brand-gold rounded-2xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-95"
                >
                  <Download size={20} /> Scarica Ricevuta Completa
                </button>
              </div>
            )}

            {paymentOrder.payments && paymentOrder.payments.length > 0 && (
              <div className="mt-12 pt-8 border-t border-brand-black/10">
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-black/50 mb-6 flex items-center gap-2">
                  <ClipboardList size={16} /> Storico Pagamenti
                </h4>
                <div className="space-y-3">
                  {paymentOrder.payments.filter(p => !p.note || p.note !== 'linked').map((payment, idx) => (
                    <div key={idx} className="bg-brand-paper p-4 rounded-2xl flex flex-col justify-center text-sm border border-brand-black/5 group relative gap-3">
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <p className="font-bold text-brand-black">€ {payment.amount.toFixed(2)}</p>
                          <p className="text-[10px] font-medium text-brand-black/50 mt-1 uppercase">
                            {new Date(payment.timestamp).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-block px-2 py-1 bg-brand-black/5 rounded font-black text-[10px] uppercase">
                              {payment.method === 'pos' ? 'POS' : payment.method === 'bonifico' ? 'Bonifico' : 'Contanti'}
                            </span>
                            {payment.documentType && payment.documentType !== 'nessuno' && (
                              <span className="inline-block px-2 py-1 bg-brand-gold/20 text-brand-black rounded font-black text-[10px] uppercase">
                                {payment.documentType}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                               setEditingPayment(payment);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-brand-black/5 text-brand-black rounded-full hover:bg-brand-black/10 transition-all shrink-0"
                            title="Modifica Pagamento"
                          >
                             <Edit2 size={16} />
                          </button>
                          <button
                            onClick={async () => {
                               try {
                                   const blob = await generateReceiptPdfBlob(paymentOrder, payment.amount, payment.method, payment.description || "");
                                   const file = new File([blob], `ricevuta_${paymentOrder.tableNumber}_${Date.now()}.pdf`, { type: 'application/pdf' });
                                   
                                   if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                                       await navigator.share({
                                           files: [file],
                                           title: 'Ricevuta di Pagamento',
                                           text: 'Ecco la ricevuta del tuo pagamento.'
                                       });
                                   } else {
                                       const url = URL.createObjectURL(blob);
                                       const a = document.createElement('a');
                                       a.href = url;
                                       a.download = file.name;
                                       document.body.appendChild(a);
                                       a.click();
                                       document.body.removeChild(a);
                                       URL.revokeObjectURL(url);
                                   }
                               } catch (e) {
                                   console.error(e);
                                   alert("Errore durante la generazione della ricevuta.");
                               }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-brand-gold/10 text-brand-gold-dark rounded-full hover:bg-brand-gold/20 transition-all shrink-0"
                            title="Condividi Ricevuta"
                          >
                             <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                               setPaymentToDelete(payment.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-all shrink-0"
                            title="Elimina Pagamento"
                          >
                             <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {paymentToDelete === payment.id && (
                        <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm rounded-[1rem] flex flex-col justify-center items-center gap-3 p-4 shadow-lg border-2 border-red-500/20">
                          <p className="text-sm font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                            <XCircle size={16} /> Elimina questo pagamento?
                          </p>
                          <div className="flex gap-3 w-full max-w-[250px]">
                             <button
                               onClick={() => {
                                 handleDeletePayment(payment.id);
                                 setPaymentToDelete(null);
                               }}
                               className="flex-1 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-red-600 active:scale-95 transition-all"
                             >
                               Conferma
                             </button>
                             <button
                               onClick={() => setPaymentToDelete(null)}
                               className="flex-1 py-2 bg-brand-black/5 text-brand-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-black/10 active:scale-95 transition-all"
                             >
                               Annulla
                             </button>
                          </div>
                        </div>
                      )}

                      {payment.documentType === 'fattura' && payment.invoiceData && (
                        <div className="mt-2 pt-3 border-t border-brand-black/10 grid grid-cols-2 gap-2 text-xs">
                           <div><span className="font-bold opacity-60">Ragione Sociale:</span> {payment.invoiceData.ragioneSociale || '-'}</div>
                           <div><span className="font-bold opacity-60">P.IVA:</span> {payment.invoiceData.piva || '-'}</div>
                           <div><span className="font-bold opacity-60">C.F.:</span> {payment.invoiceData.cf || '-'}</div>
                           <div><span className="font-bold opacity-60">SDI:</span> {payment.invoiceData.sdi || '-'}</div>
                           <div className="col-span-2"><span className="font-bold opacity-60">PEC:</span> {payment.invoiceData.pec || '-'}</div>
                           <div className="col-span-2"><span className="font-bold opacity-60">Indirizzo:</span> {payment.invoiceData.indirizzo || '-'}</div>
                           <div><span className="font-bold opacity-60">Email:</span> {payment.invoiceData.email || '-'}</div>
                           <div><span className="font-bold opacity-60">Telefono:</span> {payment.invoiceData.telefono || '-'}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <button
                   onClick={async () => {
                      if (!confirmCancelPayments) {
                         setConfirmCancelPayments(true);
                         setTimeout(() => setConfirmCancelPayments(false), 3000);
                         return;
                      }
                      
                      try {
                        const isGrouped = paymentOrder.id.startsWith("table_");
                        const orderIdsToUpdate = (paymentOrder.allOrderIds || [paymentOrder.id]).filter(id => !id.startsWith("table_"));
                        
                        for (const id of orderIdsToUpdate) {
                          const docSnap = await getDoc(doc(db, "orders", id));
                          if (docSnap.exists()) {
                             const data = docSnap.data();
                             const resetItems = (data.items || []).map((i: any) => ({ ...i, paidQuantity: 0 }));
                             await updateDoc(doc(db, "orders", id), {
                                paidAmount: 0,
                                status: data.status === "paid" ? "delivered" : data.status,
                                paymentGroupId: null,
                                payments: [],
                                items: resetItems,
                                updatedAt: serverTimestamp()
                             });
                          }
                        }
                        setPaymentOrder(null);
                        setConfirmCancelPayments(false);
                      } catch(e) {
                        console.error(e);
                      }
                   }}
                   className={`w-full mt-6 py-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${confirmCancelPayments ? "bg-red-500 border-red-500 text-white" : "border-red-500/20 text-red-500 hover:bg-red-50"}`}
                >
                   <RefreshCw size={14} /> {confirmCancelPayments ? "CONFERMA ANNULLAMENTO INCASSI" : "Annulla tutti i pagamenti"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {viewingTableOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white max-w-sm w-full rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setViewingTableOrder(null)}
              className="absolute top-6 right-6 p-2 bg-brand-paper hover:bg-brand-black/5 text-brand-black/40 hover:text-brand-black rounded-full transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
            <h2 className="font-serif text-2xl mb-1 text-brand-black leading-none break-words pr-8 flex-shrink-0">
              Tavolo {viewingTableOrder.tableNumber}
            </h2>
            <p className="text-[10px] flex-shrink-0 uppercase font-black tracking-widest opacity-40 mb-4">{viewingTableOrder.customerName || 'Ospite'} {viewingTableOrder.customerPhone ? `- ${viewingTableOrder.customerPhone}` : ''}</p>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-2">
              <ul className="space-y-3">
                 {viewingTableOrder.items.map((item, idx) => {
                    const itemStatus = (item as any).originStatus || viewingTableOrder.status;
                    const statusStr = itemStatus === 'pending' ? 'IN ATTESA' : itemStatus === 'preparing' ? 'IN PREPARAZIONE' : 'SERVITO';
                    const statusColor = itemStatus === 'pending' ? 'text-amber-700 bg-amber-100' : itemStatus === 'preparing' ? 'text-amber-600 bg-amber-50' : 'text-green-700 bg-green-100';

                    return (
                    <li key={idx} className="flex justify-between items-start gap-2 border-b border-brand-black/5 pb-2">
                       <span className="font-bold text-sm bg-brand-black/5 rounded flex-shrink-0 w-6 h-6 flex justify-center items-center">{item.quantity}</span>
                       <div className="flex-1 text-left">
                          <p className="font-bold text-brand-black text-sm leading-tight uppercase font-black">{item.name}</p>
                          {item.variant && <p className="text-[10px] font-black uppercase text-brand-gold">{item.variant}</p>}
                          {item.notes && <p className="text-[9px] font-bold text-brand-black/60 truncate italic">{item.notes.replace("[AGGIUNTA]", "").trim()}</p>}
                       </div>
                       <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                           <span className="font-mono font-bold text-sm">€{(item.price * item.quantity).toFixed(2)}</span>
                           <span className={`text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded ${statusColor}`}>{statusStr}</span>
                       </div>
                    </li>
                 )})}
              </ul>
              
              {viewingTableOrder.notes && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-1">Note Ordine</h4>
                   <p className="text-xs font-bold text-amber-900">{viewingTableOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-brand-black/10 flex justify-between items-center px-1 mb-6 flex-shrink-0">
                <span className="font-black uppercase tracking-widest text-xs opacity-50">Totale</span>
                <span className="font-serif italic text-2xl font-bold text-brand-black">€{viewingTableOrder.total.toFixed(2)}</span>
            </div>
            
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => {
                   setEditingOrder(viewingTableOrder);
                   setManagerView("editOrder");
                   setViewingTableOrder(null);
                }}
                className="w-full py-4 bg-brand-gold text-brand-black rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={16} /> Modifica Ordine
              </button>
              {(viewingTableOrder.status === 'served' || viewingTableOrder.status === 'pending' || viewingTableOrder.status === 'preparing') && (
                <button
                  onClick={() => {
                     setPaymentOrder(viewingTableOrder);
                     setViewingTableOrder(null);
                  }}
                  className="w-full py-4 bg-brand-black text-brand-gold rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                >
                  <Receipt size={16} /> Gestisci Pagamento
                </button>
              )}
              {(viewingTableOrder.status === 'paid' || viewingTableOrder.status === 'delivered') && (
                <button
                  onClick={async () => {
                     await generateFullOrderReceiptPdf(viewingTableOrder);
                  }}
                  className="w-full py-4 bg-brand-black/5 text-brand-black/60 hover:text-brand-black hover:bg-brand-black/10 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Scarica Ricevuta PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {viewingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white max-w-sm w-full rounded-[2.5rem] p-8 shadow-2xl relative">
            <button
              onClick={() => setViewingItem(null)}
              className="absolute top-6 right-6 p-2 bg-brand-paper hover:bg-brand-black/5 text-brand-black/40 hover:text-brand-black rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="font-serif text-2xl mb-4 text-brand-black leading-none break-words pr-8">
              {viewingItem.name} {viewingItem.variant && <span className="text-sm border ml-2 text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-md align-middle inline-block">{viewingItem.variant}</span>}
            </h2>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 pb-2">
              {viewingItemProductData && (
                <div className="mb-4">
                  <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-md font-black uppercase tracking-widest">
                    {viewingItemProductData.category?.it || viewingItemProductData.category}
                  </span>
                  {viewingItemProductData.description && (
                    <p className="text-sm font-medium text-brand-black/60 mt-2 leading-relaxed">
                      {viewingItemProductData.description?.it || viewingItemProductData.description}
                    </p>
                  )}
                  {viewingItemProductData.ingredients && viewingItemProductData.ingredients.length > 0 && (
                     <div className="mt-2">
                       <h4 className="text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-1">Incluso:</h4>
                       <p className="text-xs text-brand-black/70">{viewingItemProductData.ingredients.join(', ')}</p>
                     </div>
                  )}
                </div>
              )}
            
              {viewingItem.notes && (
                <div>
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-brand-black/40 mt-4 mb-2 border-b pb-1">Note Cliente / Modifiche</h4>
                  <ul className="text-sm font-medium text-brand-black/80 space-y-1">
                    {viewingItem.notes.split(' | ').map((notePart: string, idx: number) => {
                      if (notePart.trim().startsWith('SENZA:')) {
                         return <li key={idx} className="text-red-500 font-bold">{notePart}</li>
                      }
                      if (notePart.trim().startsWith('SOST:')) {
                         return <li key={idx} className="text-amber-500 font-bold">{notePart}</li>
                      }
                      if (notePart.trim().startsWith('EXTRA:')) {
                         return <li key={idx} className="text-green-600 font-bold">{notePart}</li>
                      }
                      return <li key={idx}>• {notePart}</li>
                    })}
                  </ul>
                </div>
              )}
              {viewingItem.subItems && viewingItem.subItems.length > 0 && (
                <div className="pt-2 border-t border-brand-black/10">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-brand-black/40 mb-2">Aggiunte / Extra</h4>
                  <ul className="text-sm space-y-1">
                    {viewingItem.subItems.map((si: any, idx: number) => (
                      <li key={idx} className="flex justify-between">
                        <span>+ {si.name}</span>
                        <span className="text-brand-black/50">€ {si.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="mt-8">
              <button
                onClick={() => setViewingItem(null)}
                className="w-full py-4 bg-brand-black hover:bg-black text-brand-gold rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {managerView === "dashboard" && (
        <button
          onClick={() => {
            setTakeOrderKey(Date.now());
            setManagerView("takeOrder");
          }}
          className="md:hidden fixed bottom-6 right-6 z-[90] bg-brand-black text-brand-gold w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex items-center justify-center active:scale-90 transition-transform"
          title="Nuovo Ordine"
        >
          <Plus size={28} />
        </button>
      )}

      {newOrderAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-black/90 backdrop-blur-md">
          <div className="bg-brand-paper max-w-sm w-full rounded-[3rem] p-10 text-center shadow-2xl relative border-4 border-brand-gold">
            <div className="w-24 h-24 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="font-serif italic font-black text-6xl">!</span>
            </div>
            <h2 className="font-serif font-bold text-3xl mb-4 text-brand-black">Nuovo Ordine</h2>
            <p className="text-xl font-medium text-brand-black/70 mb-8 font-mono">
              Tavolo: <span className="font-black text-brand-gold text-4xl">{newOrderAlert.tableNumber}</span>
            </p>
            <button
               onClick={() => setNewOrderAlert(null)}
               className="w-full bg-brand-black text-brand-gold py-6 rounded-2xl font-black text-lg uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
               Controlla
            </button>
          </div>
        </div>
      )}

      {newCallAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-black/90 backdrop-blur-md">
          <div className="bg-amber-100 max-w-sm w-full rounded-[3rem] p-10 text-center shadow-2xl relative border-4 border-amber-400">
            <div className="w-24 h-24 bg-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="font-serif italic font-black text-5xl">🛎️</span>
            </div>
            <h2 className="font-serif font-bold text-3xl mb-4 text-amber-900 leading-tight">Chiamata Cameriere</h2>
            <p className="text-xl font-medium text-amber-900/70 mb-8 font-mono">
               Tavolo: <span className="font-black text-amber-900 text-4xl">{newCallAlert.tableNumber}</span>
            </p>
            <button
               onClick={() => setNewCallAlert(null)}
               className="w-full bg-amber-900 text-amber-100 py-6 rounded-2xl font-black text-lg uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
               Chiudi
            </button>
          </div>
        </div>
      )}

      {pendingPayment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-paper w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 sm:p-8 shadow-2xl relative border-4 border-brand-black/5">
            <button
              onClick={() => setPendingPayment(null)}
              className="absolute top-4 right-4 p-3 bg-brand-black/5 hover:bg-brand-black/10 rounded-full transition-colors"
            >
              <X size={20} className="opacity-60" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-widest mb-6 border-b border-brand-black/10 pb-4 text-brand-black">Dettagli Incasso</h2>
            
            <p className="text-center font-mono text-4xl font-black mb-8 text-brand-black">
              € {pendingPayment.amount.toFixed(2)}
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest opacity-50 mb-3">Metodo di Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'contanti', label: 'Contanti' },
                    { id: 'pos', label: 'POS' },
                    { id: 'bonifico', label: 'Bonifico' }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`py-3 px-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${paymentMethod === method.id ? "bg-brand-black text-brand-gold shadow-md" : "bg-white text-brand-black/60 border border-brand-black/10"}`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest opacity-50 mb-3">Tipo Documento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'nessuno', label: 'Nessuno' },
                    { id: 'scontrino', label: 'Scontrino' },
                    { id: 'fattura', label: 'Fattura' }
                  ].map(docType => (
                    <button
                      key={docType.id}
                      onClick={() => setDocumentType(docType.id as any)}
                      className={`py-3 px-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${documentType === docType.id ? "bg-brand-black text-brand-gold shadow-md" : "bg-white text-brand-black/60 border border-brand-black/10"}`}
                    >
                      {docType.label}
                    </button>
                  ))}
                </div>
              </div>

              {documentType === 'fattura' && (
                <div className="bg-white p-4 rounded-2xl border border-brand-black/10 space-y-3 mt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Dati Fatturazione</p>
                  <input
                    type="text"
                    placeholder="Ragione Sociale o Nome Cognome"
                    value={invoiceData.ragioneSociale}
                    onChange={(e) => setInvoiceData({...invoiceData, ragioneSociale: e.target.value})}
                    className="w-full bg-brand-paper px-4 py-3 rounded-xl text-sm font-medium placeholder-brand-black/30 border border-brand-black/10 focus:border-brand-gold outline-none transition-all"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Codice Fiscale"
                      value={invoiceData.cf}
                      onChange={(e) => setInvoiceData({...invoiceData, cf: e.target.value})}
                      className="w-full bg-brand-paper px-4 py-3 rounded-xl text-sm font-medium placeholder-brand-black/30 border border-brand-black/10 focus:border-brand-gold outline-none transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Partita IVA"
                      value={invoiceData.piva}
                      onChange={(e) => setInvoiceData({...invoiceData, piva: e.target.value})}
                      className="w-full bg-brand-paper px-4 py-3 rounded-xl text-sm font-medium placeholder-brand-black/30 border border-brand-black/10 focus:border-brand-gold outline-none transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Indirizzo Completo"
                    value={invoiceData.indirizzo}
                    onChange={(e) => setInvoiceData({...invoiceData, indirizzo: e.target.value})}
                    className="w-full bg-brand-paper px-4 py-3 rounded-xl text-sm font-medium placeholder-brand-black/30 border border-brand-black/10 focus:border-brand-gold outline-none transition-all"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={invoiceData.email}
                      onChange={(e) => setInvoiceData({...invoiceData, email: e.target.value})}
                      className="w-full bg-brand-paper px-4 py-3 rounded-xl text-sm font-medium placeholder-brand-black/30 border border-brand-black/10 focus:border-brand-gold outline-none transition-all"
                    />
                    <input
                      type="email"
                      placeholder="PEC"
                      value={invoiceData.pec}
                      onChange={(e) => setInvoiceData({...invoiceData, pec: e.target.value})}
                      className="w-full bg-brand-paper px-4 py-3 rounded-xl text-sm font-medium placeholder-brand-black/30 border border-brand-black/10 focus:border-brand-gold outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Codice SDI"
                      maxLength={7}
                      value={invoiceData.sdi}
                      onChange={(e) => setInvoiceData({...invoiceData, sdi: e.target.value})}
                      className="w-full bg-brand-paper px-4 py-3 rounded-xl text-sm font-medium placeholder-brand-black/30 border border-brand-black/10 focus:border-brand-gold outline-none uppercase transition-all"
                    />
                    <input
                      type="tel"
                      placeholder="Telefono"
                      value={invoiceData.telefono}
                      onChange={(e) => setInvoiceData({...invoiceData, telefono: e.target.value})}
                      className="w-full bg-brand-paper px-4 py-3 rounded-xl text-sm font-medium placeholder-brand-black/30 border border-brand-black/10 focus:border-brand-gold outline-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
               onClick={() => {
                 handlePayAmount(pendingPayment.amount, pendingPayment.items, pendingPayment.isRomana).then(() => {
                   setPendingPayment(null);
                 });
               }}
               disabled={isProcessingPayment}
               className={`w-full mt-8 bg-brand-gold text-brand-black py-5 rounded-[1.5rem] font-black text-sm sm:text-base uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${isProcessingPayment ? "opacity-70 cursor-not-allowed" : "hover:bg-yellow-400 active:scale-95"}`}
            >
               {isProcessingPayment ? (
                 <>
                   <RefreshCw className="animate-spin" size={24} /> ELABORAZIONE...
                 </>
               ) : (
                 <>
                   <CheckCircle2 size={24} /> Conferma Incasso
                 </>
               )}
            </button>
          </div>
        </div>
      )}

      {editingPayment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-paper w-full max-w-lg overflow-y-auto rounded-[2rem] p-6 sm:p-8 shadow-2xl relative border-4 border-brand-black/5">
            <button
              onClick={() => setEditingPayment(null)}
              className="absolute top-4 right-4 p-3 bg-brand-black/5 hover:bg-brand-black/10 rounded-full transition-colors"
            >
              <X size={20} className="opacity-60" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-widest mb-6 border-b border-brand-black/10 pb-4 text-brand-black">Modifica Pagamento</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">
                  Metodo di Pagamento
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPayment({ ...editingPayment, method: "contanti" })}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border ${editingPayment.method === "contanti" ? "bg-brand-black text-brand-gold border-brand-black" : "bg-white text-brand-black/60 border-brand-black/10 hover:border-brand-gold"}`}
                  >
                    <Coins size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Contanti</span>
                  </button>
                  <button
                    onClick={() => setEditingPayment({ ...editingPayment, method: "pos" })}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border ${editingPayment.method === "pos" ? "bg-brand-black text-brand-gold border-brand-black" : "bg-white text-brand-black/60 border-brand-black/10 hover:border-brand-gold"}`}
                  >
                    <CreditCard size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">POS</span>
                  </button>
                  <button
                     onClick={() => setEditingPayment({ ...editingPayment, method: "bonifico" })}
                     className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border ${editingPayment.method === "bonifico" ? "bg-brand-black text-brand-gold border-brand-black" : "bg-white text-brand-black/60 border-brand-black/10 hover:border-brand-gold"}`}
                   >
                     <Landmark size={24} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Bonifico</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">
                  Documento Fiscale
                </label>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                        setEditingPayment({
                            ...editingPayment, 
                            documentType: "nessuno",
                            invoiceData: null
                        });
                    }}
                    className={`flex-1 py-3 px-2 text-[10px] text-center rounded-xl border font-black uppercase tracking-widest transition-all ${editingPayment.documentType === "nessuno" || !editingPayment.documentType ? "bg-brand-black text-brand-gold border-brand-black shadow-md" : "bg-white text-brand-black/60 hover:bg-brand-black/5 border-brand-black/10"}`}
                  >
                    Nessuno
                  </button>
                  <button
                    onClick={() => {
                        setEditingPayment({
                            ...editingPayment, 
                            documentType: "scontrino",
                            invoiceData: null
                        });
                    }}
                    className={`flex-1 py-3 px-2 text-[10px] text-center rounded-xl border font-black uppercase tracking-widest transition-all ${editingPayment.documentType === "scontrino" ? "bg-brand-black text-brand-gold border-brand-black shadow-md" : "bg-white text-brand-black/60 hover:bg-brand-black/5 border-brand-black/10"}`}
                  >
                    Scontrino
                  </button>
                  <button
                    onClick={() => {
                        const newDoc = "fattura";
                        setEditingPayment({
                            ...editingPayment, 
                            documentType: newDoc,
                            invoiceData: newDoc === "fattura" ? (editingPayment.invoiceData || invoiceData) : null
                        });
                    }}
                    className={`flex-1 py-3 px-2 text-[10px] text-center rounded-xl border font-black uppercase tracking-widest transition-all ${editingPayment.documentType === "fattura" ? "bg-brand-black text-brand-gold border-brand-black shadow-md" : "bg-white text-brand-black/60 hover:bg-brand-black/5 border-brand-black/10"}`}
                  >
                    Fattura
                  </button>
                </div>
                {editingPayment.documentType === "fattura" && (
                    <div className="space-y-3 bg-brand-black/5 p-4 rounded-xl mt-4">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-brand-black/60 mb-2 border-b border-brand-black/10 pb-2">Dati Fatturazione</h4>
                      <input 
                         type="text" 
                         placeholder="Ragione Sociale" 
                         value={editingPayment.invoiceData?.ragioneSociale || ""}
                         onChange={(e) => setEditingPayment({...editingPayment, invoiceData: {...editingPayment.invoiceData, ragioneSociale: e.target.value}})}
                         className="w-full text-sm p-3 rounded-lg border border-brand-black/10 focus:border-brand-gold outline-none bg-white"
                      />
                      <div className="flex gap-2">
                        <input 
                           type="text" 
                           placeholder="P.IVA" 
                           value={editingPayment.invoiceData?.piva || ""}
                           onChange={(e) => setEditingPayment({...editingPayment, invoiceData: {...editingPayment.invoiceData, piva: e.target.value}})}
                           className="w-1/2 text-sm p-3 rounded-lg border border-brand-black/10 focus:border-brand-gold outline-none bg-white font-mono"
                        />
                        <input 
                           type="text" 
                           placeholder="C.F." 
                           value={editingPayment.invoiceData?.cf || ""}
                           onChange={(e) => setEditingPayment({...editingPayment, invoiceData: {...editingPayment.invoiceData, cf: e.target.value}})}
                           className="w-1/2 text-sm p-3 rounded-lg border border-brand-black/10 focus:border-brand-gold outline-none bg-white font-mono"
                        />
                      </div>
                      <input 
                         type="text" 
                         placeholder="Indirizzo Completo" 
                         value={editingPayment.invoiceData?.indirizzo || ""}
                         onChange={(e) => setEditingPayment({...editingPayment, invoiceData: {...editingPayment.invoiceData, indirizzo: e.target.value}})}
                         className="w-full text-sm p-3 rounded-lg border border-brand-black/10 focus:border-brand-gold outline-none bg-white font-mono"
                      />
                      <div className="flex gap-2">
                        <input 
                           type="email" 
                           placeholder="Email" 
                           value={editingPayment.invoiceData?.email || ""}
                           onChange={(e) => setEditingPayment({...editingPayment, invoiceData: {...editingPayment.invoiceData, email: e.target.value}})}
                           className="w-1/2 text-sm p-3 rounded-lg border border-brand-black/10 focus:border-brand-gold outline-none bg-white font-mono"
                        />
                        <input 
                           type="tel" 
                           placeholder="Telefono" 
                           value={editingPayment.invoiceData?.telefono || ""}
                           onChange={(e) => setEditingPayment({...editingPayment, invoiceData: {...editingPayment.invoiceData, telefono: e.target.value}})}
                           className="w-1/2 text-sm p-3 rounded-lg border border-brand-black/10 focus:border-brand-gold outline-none bg-white font-mono"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input 
                           type="text" 
                           placeholder="PEC" 
                           value={editingPayment.invoiceData?.pec || ""}
                           onChange={(e) => setEditingPayment({...editingPayment, invoiceData: {...editingPayment.invoiceData, pec: e.target.value}})}
                           className="w-1/2 text-sm p-3 rounded-lg border border-brand-black/10 focus:border-brand-gold outline-none bg-white font-mono"
                        />
                        <input 
                           type="text" 
                           maxLength={7}
                           placeholder="Codice SDI" 
                           value={editingPayment.invoiceData?.sdi || ""}
                           onChange={(e) => setEditingPayment({...editingPayment, invoiceData: {...editingPayment.invoiceData, sdi: e.target.value}})}
                           className="w-1/2 text-sm p-3 rounded-lg border border-brand-black/10 focus:border-brand-gold outline-none bg-white uppercase font-mono"
                        />
                      </div>
                    </div>
                )}
              </div>

            </div>

            <button
               onClick={() => {
                 handleUpdatePayment(editingPayment);
               }}
               className="w-full mt-8 bg-brand-black text-brand-gold py-5 rounded-[1.5rem] font-black text-sm sm:text-base uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
            >
               <CheckCircle2 size={24} /> Salva Modifiche
            </button>
          </div>
        </div>
      )}

    </div>
  </PullToRefresh>
);
}
