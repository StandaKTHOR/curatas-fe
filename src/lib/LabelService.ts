import { QRCodeSVG } from 'qrcode.react';
import React from 'react';
import { renderToString } from 'react-dom/server';

export const printItemLabel = (item: any) => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) return;

    const publicUrl = `${window.location.origin}/detail/${item.id}`;

    // Rozměry z legacyData
    const dims = item.legacyData
        ? `${item.legacyData.vyska || '?'} x ${item.legacyData.sirka || '?'} x ${item.legacyData.hloubka || '?'} cm`
        : '';

    printWindow.document.write(`
    <html>
      <head>
        <title>Štítek: ${item.inventoryNumber}</title>
        <style>
          @page { size: 62mm 29mm; margin: 0; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; padding: 2mm;
            display: flex; align-items: center; 
            width: 58mm; height: 25mm; overflow: hidden;
          }
          .qr-box { width: 22mm; height: 22mm; margin-right: 2mm; }
          .info-box { flex: 1; display: flex; flex-direction: column; justify-content: center; }
          .inv { font-size: 10pt; font-weight: bold; margin: 0; border-bottom: 0.2mm solid #000; }
          .title { font-size: 8pt; margin: 1mm 0 0.5mm 0; line-height: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .meta { font-size: 7pt; color: #444; }
        </style>
      </head>
      <body>
        <div class="qr-box">
          ${renderToString(React.createElement(QRCodeSVG, { value: publicUrl, size: 80 }))}
        </div>
        <div class="info-box">
          <div class="inv">${item.inventoryNumber || item.accessionNumber}</div>
          <div class="title">${item.title}</div>
          <div class="meta">
            ${item.author ? `Autor: ${item.author}<br/>` : ''}
            ${dims}
          </div>
        </div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 250);
        </script>
      </body>
    </html>
  `);

    printWindow.document.close();
};