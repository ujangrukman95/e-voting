/**
 * Universal & Safe Print Helper for Web & iFrame Environments
 * Handles standard printing, embedded iframe sandbox restrictions,
 * hidden printable frames, and popout printable documents.
 */

export interface PrintOptions {
  title: string;
  contentHtml: string;
  customCss?: string;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function printDocument({ title, contentHtml, customCss = '', onSuccess, onError }: PrintOptions): void {
  try {
    const safeTitle = escapeHtml(title);
    // 1. Prepare clean print HTML template with full styles and print-ready layout
    const printDoc = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${safeTitle}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.3;
            }
            #printable-cards-container {
              display: flex !important;
              flex-direction: column !important;
              gap: 3mm !important;
              width: 100% !important;
            }
            .voter-card-print-item {
              background-color: #ffffff !important;
              background: #ffffff !important;
              color: #000000 !important;
              border: 1.5px solid #000000 !important;
              border-radius: 4px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              height: 65mm !important;
              max-height: 66mm !important;
              min-height: 63mm !important;
              padding: 2mm 3.5mm 1mm 3.5mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              margin-bottom: 0 !important;
            }
            .voter-card-print-item img {
              filter: grayscale(100%) contrast(125%) !important;
              -webkit-filter: grayscale(100%) contrast(125%) !important;
            }
            .voter-card-print-item:nth-child(4n) {
              page-break-after: always !important;
              break-after: page !important;
            }
            #printable-official-report {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              line-height: 1.4 !important;
            }
            .print-page-a4 {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto;
            }
            .no-print {
              display: none !important;
            }
            ${customCss}
          </style>
        </head>
        <body class="bg-white text-black p-4">
          <div class="print-page-a4">
            ${contentHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                try {
                  window.focus();
                  window.print();
                } catch(e) {
                  console.error('Print trigger error:', e);
                }
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    // 2. Try Method A: Direct window.open popup (Best for preview and full browser tab)
    const printWindow = window.open('', '_blank', 'width=900,height=750,menubar=no,toolbar=no,location=no,status=no');
    
    if (printWindow && !printWindow.closed) {
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
      if (onSuccess) onSuccess();
      return;
    }

    // 3. Try Method B: Hidden Iframe in current document (For embedded views)
    const existingFrame = document.getElementById('__isolated_print_frame__');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = '__isolated_print_frame__';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.zIndex = '-9999';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(printDoc);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          if (onSuccess) onSuccess();
        } catch (iframeErr) {
          console.warn('Iframe print blocked, falling back to window.print():', iframeErr);
          // Fallback to standard window.print()
          window.print();
          if (onSuccess) onSuccess();
        }
      }, 500);
      return;
    }

    // 4. Try Method C: Direct window.print()
    window.print();
    if (onSuccess) onSuccess();
  } catch (err) {
    console.error('Safe print execution error:', err);
    try {
      window.print();
      if (onSuccess) onSuccess();
    } catch (fallbackErr) {
      if (onError) onError(fallbackErr);
    }
  }
}

/**
 * Downloads the printable document directly as an HTML file
 * when browser / sandbox completely prevents popups & print dialogs
 */
export function downloadPrintableHtml(filename: string, contentHtml: string, title: string): void {
  const safeTitle = escapeHtml(title);
  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 portrait; margin: 6mm 8mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { background: #fff !important; color: #000 !important; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 12px; font-size: 11px; line-height: 1.3; }
    #printable-cards-container { display: flex !important; flex-direction: column !important; gap: 3mm !important; width: 100% !important; }
    .voter-card-print-item { background: #fff !important; color: #000 !important; border: 1.5px solid #000000 !important; border-radius: 4px !important; page-break-inside: avoid !important; height: 65mm !important; max-height: 66mm !important; min-height: 63mm !important; padding: 2mm 3.5mm 1mm 3.5mm !important; box-sizing: border-box !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; margin-bottom: 0 !important; }
    .voter-card-print-item img { filter: grayscale(100%) contrast(125%) !important; -webkit-filter: grayscale(100%) contrast(125%) !important; }
    .voter-card-print-item:nth-child(4n) { page-break-after: always !important; }
    #printable-official-report { page-break-inside: avoid !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; line-height: 1.4 !important; }
    @media print { .no-print-btn { display: none !important; } body { padding: 0 !important; } }
  </style>
</head>
<body>
  <div class="no-print-btn mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
    <span class="font-bold text-blue-900">📄 File Siap Cetak (A4) - ${safeTitle}</span>
    <button onclick="window.print()" class="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg cursor-pointer">🖨️ Cetak Dokumen Sekarang</button>
  </div>
  ${contentHtml}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
