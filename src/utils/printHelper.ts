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

/**
 * Generates and prints a clean, full-page A4 poster for physical Polling Booths (Bilik Suara)
 * featuring School Kop, QR Code, and step-by-step voting instructions.
 */
export function printPollingBoothPoster({
  schoolName,
  eventTitle,
  academicYear,
  schoolAddress,
  schoolLogo,
  voteUrl,
  boothNumber,
  onSuccess,
  onError,
}: {
  schoolName: string;
  eventTitle: string;
  academicYear: string;
  schoolAddress?: string;
  schoolLogo?: string;
  voteUrl: string;
  boothNumber?: number | string;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}): void {
  const safeSchool = escapeHtml(schoolName || 'PANITIA PEMILIHAN OSIS');
  const safeEvent = escapeHtml(eventTitle || 'PEMILIHAN KETUA & WAKIL KETUA OSIS');
  const safeYear = escapeHtml(academicYear || '2026/2027');
  const safeAddress = escapeHtml(schoolAddress || 'Sekretariat Panitia KPU OSIS');
  const safeVoteUrl = escapeHtml(voteUrl);
  const boothTag = boothNumber ? `BILIK SUARA NO. ${boothNumber}` : 'BILIK SUARA E-VOTING';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(voteUrl)}&margin=10`;

  const posterHtml = `
    <div style="width: 100%; min-height: 280mm; display: flex; flex-direction: column; justify-content: space-between; border: 4px double #000; padding: 8mm; box-sizing: border-box; background: #ffffff;">
      
      <!-- Kop Header -->
      <div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 16px;">
          ${
            schoolLogo
              ? `<img src="${escapeHtml(schoolLogo)}" style="width: 65px; height: 65px; object-fit: contain;" alt="Logo" />`
              : `<div style="width: 60px; height: 60px; border: 2px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px;">🗳️</div>`
          }
          <div style="text-align: center;">
            <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">${safeSchool}</h1>
            <h2 style="font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 2px 0; color: #1e293b;">${safeEvent}</h2>
            <p style="font-size: 12px; font-weight: 600; margin: 0; color: #475569;">TAHUN PELAJARAN ${safeYear} • ${safeAddress}</p>
          </div>
        </div>

        <!-- Banner Bilik -->
        <div style="background-color: #0f172a; color: #ffffff; text-align: center; padding: 10px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #38bdf8;">— PETUNJUK RESMI PEMILIH —</div>
          <div style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">${boothTag}</div>
        </div>
      </div>

      <!-- Main Content: QR Code & Call to Action -->
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex-grow: 1; text-align: center; margin: 10px 0;">
        
        <p style="font-size: 15px; font-weight: 800; color: #000; margin-bottom: 12px;">
          ARAHKAN KAMERA SMARTPHONE ANDA KE QR CODE DI BAWAH INI UNTUK MEMBUKA HALAMAN VOTING:
        </p>

        <!-- Container QR Code -->
        <div style="border: 3px solid #000; border-radius: 12px; padding: 14px; background: #ffffff; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <img src="${qrImageUrl}" style="width: 250px; height: 250px; display: block;" alt="QR Code Bilik Suara" />
        </div>

        <div style="margin-top: 10px; background: #f1f5f9; border: 1px border #cbd5e1; border-radius: 6px; padding: 6px 14px; display: inline-block;">
          <span style="font-size: 11px; font-weight: 700; color: #334155;">URL Alternatif: </span>
          <span style="font-size: 12px; font-weight: 800; font-family: monospace; color: #0f172a;">${safeVoteUrl}</span>
        </div>
      </div>

      <!-- Step by Step Instructions -->
      <div style="border-top: 2px solid #000; padding-top: 14px; margin-top: 10px;">
        <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 0 0 10px 0; text-align: center; letter-spacing: 0.5px; color: #0f172a;">
          📍 TATA CARA PEMILIHAN DI BILIK SUARA (4 LANGKAH MUDAH):
        </h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="border: 1px solid #000; border-radius: 6px; padding: 8px 10px; background: #fafafa; display: flex; items-center; gap: 8px;">
            <div style="width: 24px; height: 24px; background: #000; color: #fff; font-weight: 900; font-size: 13px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink: 0;">1</div>
            <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2;">
              <strong>Scan QR Code</strong> di atas menggunakan kamera HP / Pemindai QR.
            </div>
          </div>

          <div style="border: 1px solid #000; border-radius: 6px; padding: 8px 10px; background: #fafafa; display: flex; items-center; gap: 8px;">
            <div style="width: 24px; height: 24px; background: #000; color: #fff; font-weight: 900; font-size: 13px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink: 0;">2</div>
            <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2;">
              <strong>Masukkan Username & Password</strong> yang ada pada Kartu Pemilih Anda.
            </div>
          </div>

          <div style="border: 1px solid #000; border-radius: 6px; padding: 8px 10px; background: #fafafa; display: flex; items-center; gap: 8px;">
            <div style="width: 24px; height: 24px; background: #000; color: #fff; font-weight: 900; font-size: 13px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink: 0;">3</div>
            <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2;">
              <strong>Pilih Paslon Ketua & Wakil</strong> pilihan Anda sesuai nurani.
            </div>
          </div>

          <div style="border: 1px solid #000; border-radius: 6px; padding: 8px 10px; background: #fafafa; display: flex; items-center; gap: 8px;">
            <div style="width: 24px; height: 24px; background: #000; color: #fff; font-weight: 900; font-size: 13px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink: 0;">4</div>
            <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.2;">
              Klik <strong>"Kirim Suara"</strong>. Hak suara Anda otomatis tersimpan secara anonim!
            </div>
          </div>
        </div>

        <!-- Footer Note -->
        <div style="margin-top: 14px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 10px; font-weight: 700; color: #475569;">
          🔒 JAMINAN KERAHASIAAN • SISTEM E-VOTING MENGGUNAKAN ANONYMOUS SECRET BALLOT (ASAS LUBER & JURDIL)
        </div>
      </div>

    </div>
  `;

  printDocument({
    title: `Poster A4 Bilik Suara - ${safeSchool}`,
    contentHtml: posterHtml,
    onSuccess,
    onError,
  });
}

