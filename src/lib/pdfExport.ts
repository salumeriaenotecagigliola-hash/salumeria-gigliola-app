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
    img.src = '/unnamed.png';
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

export async function generateReceiptPdfBlob(order: any, paymentAmount: number, paymentMethod: string, logoUrl: string = '/unnamed.png') {
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
  currentY += 15;
  
  doc.setFont("helvetica", "italic");
  doc.text("Grazie per averci scelto!", 40, currentY, { align: "center" });
  
  return doc.output('blob');
}
