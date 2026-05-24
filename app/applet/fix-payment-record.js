const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerInterface.tsx', 'utf-8');

const target = `    const newPaymentRecord: any = JSON.parse(JSON.stringify({
      id: Date.now().toString(),
      amount: amountToPay,
      method: paymentMethod,
      documentType,
      invoiceData: documentType === 'fattura' ? invoiceData : null,
      timestamp: new Date().toISOString()
    }));
    
    if (isRomana) {
        newPaymentRecord.isRomana = true;
    }`;

const replacement = `    let detailDescription = "Pagamento parziale/totale";
    if (isRomana) {
       detailDescription = "Quota alla Romana";
    } else if (itemsToMarkAsPaid.length > 0) {
       detailDescription = "Articoli: " + itemsToMarkAsPaid.map(it => \`\${it.qty}x \${paymentOrder.items[it.idx].name}\`).join(', ');
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
    }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ManagerInterface.tsx', code);
  console.log('Replaced newPaymentRecord');
} else {
  console.log('Target not found');
}
