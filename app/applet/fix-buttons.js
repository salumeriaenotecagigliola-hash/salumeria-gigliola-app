const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerInterface.tsx', 'utf-8');

const target = `                       {order.status === "paid" && (
                         <button
                           onClick={() => updateStatus(order.id, "delivered", "paid")}
                           className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                         >
                           <Truck size={20} /> SEGNALA COME CONSEGNATO
                         </button>
                       )}
                       {order.status === "delivered" && (
                         <button
                           onClick={() => updateStatus(order.id, "paid", "delivered")}
                           className="w-full bg-brand-gold text-brand-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                         >
                           <Receipt size={20} /> SEGNALA COME PAGATO
                         </button>
                       )}`;

const replacement = `                       {(order.status === "paid" || order.status === "delivered") && (
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
                       )}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ManagerInterface.tsx', code);
  console.log('Replaced buttons');
} else {
  console.log('target not found!');
}
