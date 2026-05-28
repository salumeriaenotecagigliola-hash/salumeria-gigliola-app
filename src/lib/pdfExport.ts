import jsPDF from 'jspdf';
import { Product } from '../types';

export async function generateMenuPdf(
  products: Product[],
  maxPages: number,
  columns: number
) {
  // 1. Fetch logo
  const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${import.meta.env.BASE_URL}logo-192.png`;
  });

  const categories = Array.from(new Set(products.map(p => p.category.it)));
  const productsByCategory: Record<string, Product[]> = {};
  categories.forEach(c => {
    productsByCategory[c] = products.filter(p => p.category.it === c);
  });

  const renderLayout = (doc: jsPDF, scale: number, isDryRun: boolean) => {
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const columnWidth = (contentWidth - (columns - 1) * 5) / columns; // 5mm gutter

    const s = scale;

    let currentY = margin;
    let currentX = margin;
    let currentColumn = 0;
    let currentPage = 1;

    // Render Logo on top
    if (logoImg) {
      const ratio = logoImg.width / logoImg.height;
      const logoH = 25 * s;
      const logoW = logoH * ratio;
      if (!isDryRun && currentPage <= maxPages) {
        doc.addImage(logoImg, 'PNG', pageWidth/2 - logoW/2, currentY, logoW, logoH);
      }
      currentY += logoH + 10 * s;
    } else {
      currentY += 15 * s; // fallback space
    }
    const startYFirstPage = currentY;

    const nextColumn = () => {
      currentColumn++;
      if (currentColumn >= columns) {
        currentPage++;
        currentColumn = 0;
        currentX = margin;
        currentY = margin + 10;
        if (!isDryRun && currentPage <= maxPages) {
          doc.addPage();
        }
      } else {
        currentX = margin + currentColumn * (columnWidth + 5);
        currentY = currentPage === 1 ? startYFirstPage : margin + 10; 
      }
    };

    Object.entries(productsByCategory).forEach(([category, catProducts]) => {
      if (currentY + 15 * s > pageHeight - margin) {
        nextColumn();
      }

      if (!isDryRun && currentPage <= maxPages) {
        doc.setTextColor(26, 26, 26); // brand-black
        doc.setFontSize(16 * s);
        doc.setFont("helvetica", "bold");
        doc.text(category.toUpperCase(), currentX, currentY, { maxWidth: columnWidth });
      }
      currentY += 10 * s;

      catProducts.forEach(product => {
        doc.setFontSize(12 * s);
        doc.setFont("helvetica", "bold");
        // leave some space for price when calculating wrapping
        const nameLines = doc.splitTextToSize(product.name.it, columnWidth - 22 * s); 
        
        doc.setFontSize(9 * s);
        doc.setFont("helvetica", "italic");
        const descLines = product.description.it ? doc.splitTextToSize(product.description.it, columnWidth) : [];
        
        const blockHeight = 5 * s + (nameLines.length * 5 * s) + (descLines.length * 4 * s) + 2 * s;

        if (currentY + blockHeight > pageHeight - margin) {
          nextColumn();
          if (!isDryRun && currentPage <= maxPages) {
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(16 * s);
            doc.setFont("helvetica", "bold");
            doc.text(`${category.toUpperCase()} (cont.)`, currentX, currentY, { maxWidth: columnWidth });
          }
          currentY += 10 * s;
        }

        if (!isDryRun && currentPage <= maxPages) {
          // Render Name
          doc.setTextColor(26, 26, 26);
          doc.setFontSize(12 * s);
          doc.setFont("helvetica", "bold");
          doc.text(nameLines, currentX, currentY);
          
          // Render Price
          doc.setTextColor(212, 175, 55); // brand-gold
          doc.setFont("courier", "bold"); // monospaced style with dot/slash in zero
          doc.text(`€${product.price.toFixed(2)}`, currentX + columnWidth, currentY, { align: "right" });
          
          currentY += nameLines.length * 5 * s;

          // Render Description
          if (product.description.it) {
            doc.setTextColor(100, 100, 100); 
            doc.setFontSize(9 * s);
            doc.setFont("helvetica", "italic");
            doc.text(descLines, currentX, currentY);
            currentY += descLines.length * 4 * s + 2 * s;
          } else {
            currentY += 2 * s;
          }
        } else {
          // Dry run just calculates Y
          currentY += nameLines.length * 5 * s + (product.description.it ? descLines.length * 4 * s + 2 * s : 2 * s);
        }
      });

      currentY += 5 * s; // space between categories
    });

    return currentPage;
  };

  // Binary search for the right scale factor to fit exactly in maxPages
  let minScale = 0.3;
  let maxScale = 1.0;
  let bestScale = 0.3;

  const testDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  for (let i = 0; i < 15; i++) {
    const testScale = (minScale + maxScale) / 2;
    const pagesUsed = renderLayout(testDoc, testScale, true);
    if (pagesUsed <= maxPages) {
      bestScale = testScale;
      minScale = testScale; // Try larger
    } else {
      maxScale = testScale; // Shrink
    }
  }

  // Generate final PDF using best scale
  const finalDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderLayout(finalDoc, bestScale, false);
  finalDoc.save("Menu.pdf");
}

export async function generateFullOrderReceiptPdf(order: any) {
  const doc = new jsPDF();
  doc.setFont("helvetica");

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = `${import.meta.env.BASE_URL}logo-192.png`;

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
}

export async function generateReceiptPdfBlob(order: any, paymentAmount: number, paymentMethod: string, paymentDescription: string = "", logoUrl: string = `${import.meta.env.BASE_URL}logo-192.png`) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] }); // standard receipt thermal printer format width 80mm
  
  const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });

  let currentY = 10;
  
  if (logoImg) {
    const ratio = logoImg.width / logoImg.height;
    const logoH = 20;
    const logoW = logoH * ratio;
    doc.addImage(logoImg, 'PNG', 40 - logoW / 2, currentY, logoW, logoH);
    currentY += logoH + 10;
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RICEVUTA DI PAGAMENTO", 40, currentY, { align: "center" });
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Tavolo: ${order.tableNumber}`, 40, currentY, { align: "center" });
  currentY += 6;
  doc.text(`Data: ${new Date().toLocaleString('it-IT')}`, 40, currentY, { align: "center" });
  currentY += 10;
  
  doc.setFont("helvetica", "bold");
  doc.text("Dettaglio Ordine", 5, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  
  order.items.forEach((item: any) => {
     const line1 = `${item.quantity}x ${item.name}`;
     const line2 = `€ ${(item.price * item.quantity).toFixed(2)}`;
     
     const titleLines = doc.splitTextToSize(line1, 55);
     doc.text(titleLines, 5, currentY);
     doc.text(line2, 75, currentY, { align: "right" });
     currentY += (titleLines.length * 4) + 2;
  });
  
  currentY += 5;
  doc.line(5, currentY, 75, currentY);
  currentY += 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Totale Ordine:", 5, currentY);
  doc.text(`€ ${order.total.toFixed(2)}`, 75, currentY, { align: "right" });
  currentY += 8;
  
  doc.text("Importo Pagato:", 5, currentY);
  doc.text(`€ ${paymentAmount.toFixed(2)}`, 75, currentY, { align: "right" });
  currentY += 6;
  
  doc.setFontSize(10);
  doc.text(`Metodo: ${paymentMethod.toUpperCase()}`, 5, currentY);
  currentY += 6;
  if (paymentDescription) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(`Nota: ${paymentDescription}`, 70);
    doc.text(descLines, 5, currentY);
    currentY += (descLines.length * 4) + 6;
  } else {
    currentY += 9;
  }
  
  doc.setFont("helvetica", "italic");
  doc.text("Grazie per averci scelto!", 40, currentY, { align: "center" });
  
  return doc.output('blob');
}
