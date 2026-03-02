import React from 'react';
import { renderToString } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

export interface LabelDto {
    id: number;
    esc: string;
    title: string;
    dating: string; // Opraveno z datingText
    locality: string;
    materialTechnique: string;
    institution: string;
    publicUrl: string;
    condition: string; // Opraveno z objectCondition
}

const generateLabelHtml = (data: LabelDto) => {
    const qrSvg = renderToString(
        <QRCodeSVG
            value={data.publicUrl}
            size={800}
            level="M"
            includeMargin={false}
        />
    );

    return `
    <div class="label-page">
      <div class="header">${data.institution}</div>
      <div class="main-content">
        <div class="details">
          <div class="field"><span class="label">Evidenční číslo (ESČ):</span><span class="value esc">${data.esc}</span></div>
          <div class="field"><span class="label">NÁZEV PŘEDMĚTU:</span><span class="value title">${data.title}</span></div>
          <div class="field"><span class="label">DATACE:</span><span class="value">${data.dating}</span></div>
          <div class="field"><span class="label">MATERIÁL:</span><span class="value">${data.materialTechnique}</span></div>
          <div class="field"><span class="label">STAV:</span><span class="value">${data.condition}</span></div>
          <div class="field"><span class="label">LOKALITA:</span><span class="value">${data.locality}</span></div>
        </div>
        <div class="qr-container">
          ${qrSvg}
          <div class="qr-hint">Skenujte pro detail</div>
        </div>
      </div>
    </div>
    <style>
      @page { size: A5 portrait; margin: 10mm; }
      body { margin: 0; padding: 0; font-family: sans-serif; }
      .label-page { width: 100%; height: 100%; page-break-after: always; display: flex; flex-direction: column; }
      .header { font-size: 18pt; font-weight: bold; text-align: center; border-bottom: 2pt solid #000; padding-bottom: 3mm; margin-bottom: 8mm; text-transform: uppercase; }
      .main-content { display: flex; justify-content: space-between; gap: 10mm; }
      .details { flex: 1; display: flex; flex-direction: column; gap: 6mm; }
      .qr-container { width: 55mm; text-align: center; }
      .qr-container svg { width: 100%; height: auto; }
      .field { display: flex; flex-direction: column; }
      .label { font-size: 10pt; font-weight: bold; color: #555; text-transform: uppercase; }
      .value { font-size: 14pt; }
      .esc { font-size: 20pt; font-weight: bold; }
      .title { font-weight: bold; font-size: 17pt; }
    </style>
  `;
};

/**
 * Tiskne štítky pomocí skrytého iframe, aby se neotevírala nová záložka
 */
export const printLabels = (items: LabelDto | LabelDto[]) => {
    const labelArray = Array.isArray(items) ? items : [items];
    const htmlContent = labelArray.map(item => generateLabelHtml(item)).join('');

    // 1. Vytvoříme skrytý iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    // 2. Zapíšeme obsah do iframe
    doc.write(`
      <!DOCTYPE html>
      <html>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    // 3. Počkáme na načtení (např. SVG) a vyvoláme tisk přímo z iframe
    const iframeWindow = iframe.contentWindow;
    if (iframeWindow) {
        // Některé prohlížeče potřebují krátkou pauzu na vykreslení SVG
        setTimeout(() => {
            iframeWindow.focus();
            iframeWindow.print();

            // 4. Po vytištění/zrušení iframe odstraníme
            // onafterprint nefunguje všude stejně, proto iframe raději chvíli ponecháme a pak smažeme
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    }
};