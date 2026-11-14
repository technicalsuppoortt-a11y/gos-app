import type { BillingInvoice } from '../backend/billing';

export interface InvoiceBrandResolved {
  brandName: string;
  logoUrl: string;
  email?: string;
  roleLabel: string;
}

function formatMoneyFallback(amount: number, currency: string, _ar = false): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount ?? 0).replace(/\u00A0/g, ' ');
  } catch {
    return `${(amount ?? 0).toFixed(2)} ${(currency || 'USD').toUpperCase()}`;
  }
}

function formatDateStr(iso?: string | null, ar = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

async function loadSafeCanvasImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  const load = (useCors: boolean) =>
    new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      if (useCors && !src.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const img = await load(true);
  if (!img) return null;
  // Verify drawing this image doesn't taint the canvas
  try {
    const probe = document.createElement('canvas');
    probe.width = 4;
    probe.height = 4;
    const pctx = probe.getContext('2d');
    pctx?.drawImage(img, 0, 0, 4, 4);
    probe.toDataURL('image/png');
    return img;
  } catch {
    return null;
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encodes a single-page JPEG image stream into a valid PDF 1.4 binary document (A4: 595 x 842 pt). */
function encodeJpegAsPdfA4(jpegBytes: Uint8Array, pixelWidth: number, pixelHeight: number): Blob {
  const encoder = new TextEncoder();
  const pageWidthPt = 595;
  const pageHeightPt = 842;

  const chunks: Uint8Array[] = [];
  let offset = 0;
  const offsets: number[] = [0]; // index 0 is free entry

  const pushStr = (str: string) => {
    const encoded = encoder.encode(str);
    chunks.push(encoded);
    offset += encoded.length;
  };
  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  // Header + binary marker comment per PDF 1.4 spec
  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object 1: Catalog
  offsets.push(offset);
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  offsets.push(offset);
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Object 3: Page
  offsets.push(offset);
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  // Object 4: Image XObject (DCTDecode JPEG)
  offsets.push(offset);
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  // Object 5: Content stream
  const contentStream = `q ${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm /Im0 Do Q\n`;
  const contentBytes = encoder.encode(contentStream);
  offsets.push(offset);
  pushStr(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushStr('endstream\nendobj\n');

  // XRef table
  const xrefOffset = offset;
  pushStr(`xref\n0 ${offsets.length}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < offsets.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  // Trailer
  pushStr(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export async function downloadInvoicePdf(
  invoice: BillingInvoice,
  brand: InvoiceBrandResolved,
  options: {
    ar?: boolean;
    formatMoney?: (amount: number, currency: string) => string;
  } = {},
): Promise<void> {
  const ar = Boolean(options.ar);
  const fmt = (val: number, cur: string) =>
    options.formatMoney ? options.formatMoney(val, cur) : formatMoneyFallback(val, cur, ar);

  const W = 1654;
  const H = 2339;
  const PAD = 110;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const fontSans = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif';

  // White paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Subtle top brand accent bar
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, '#4f46e5');
  topGrad.addColorStop(0.5, '#7c3aed');
  topGrad.addColorStop(1, '#2563eb');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 16);

  // Header: Brand Logo + Brand Name on Left, INVOICE Title + Status Stamp on Right
  let y = 100;
  const logoImg = await loadSafeCanvasImage(brand.logoUrl);
  let brandTextX = PAD;

  if (logoImg && logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
    const maxLogoH = 74;
    const maxLogoW = 210;
    const ratio = Math.min(maxLogoW / logoImg.naturalWidth, maxLogoH / logoImg.naturalHeight);
    const drawW = Math.round(logoImg.naturalWidth * ratio);
    const drawH = Math.round(logoImg.naturalHeight * ratio);
    ctx.drawImage(logoImg, PAD, y, drawW, drawH);
    brandTextX = PAD + drawW + 24;
  } else {
    // Clean brand monogram badge fallback
    drawRoundedRect(ctx, PAD, y, 72, 72, 18);
    ctx.fillStyle = '#4f46e5';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 34px ${fontSans}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((brand.brandName || 'U').trim().charAt(0).toUpperCase(), PAD + 36, y + 37);
    brandTextX = PAD + 94;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 36px ${fontSans}`;
  ctx.fillText(brand.brandName || 'Upclick', brandTextX, y + 6);

  ctx.fillStyle = '#64748b';
  ctx.font = `600 20px ${fontSans}`;
  ctx.fillText(brand.roleLabel, brandTextX, y + 50);

  // Right side: INVOICE & Number + Status badge
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 48px ${fontSans}`;
  ctx.fillText(ar ? 'فاتورة ضريبية / إيصال' : 'INVOICE', W - PAD, y - 4);

  ctx.fillStyle = '#475569';
  ctx.font = `600 24px ${fontSans}`;
  ctx.fillText(`#${invoice.invoiceNumber}`, W - PAD, y + 56);

  // Status Stamp
  const statusStyles: Record<
    BillingInvoice['status'],
    { bg: string; border: string; fg: string; en: string; ar: string }
  > = {
    paid: { bg: '#ecfdf5', border: '#6ee7b7', fg: '#047857', en: 'PAID', ar: 'مدفوعة' },
    pending: { bg: '#fffbeb', border: '#fcd34d', fg: '#b45309', en: 'PENDING', ar: 'قيد المراجعة' },
    rejected: { bg: '#fef2f2', border: '#fca5a5', fg: '#b91c1c', en: 'REJECTED', ar: 'مرفوضة' },
    cancelled: { bg: '#f1f5f9', border: '#cbd5e1', fg: '#475569', en: 'CANCELLED', ar: 'ملغاة' },
  };
  const st = statusStyles[invoice.status] || statusStyles.pending;
  const stText = ar ? st.ar : st.en;
  ctx.font = `700 20px ${fontSans}`;
  const stWidth = Math.max(130, ctx.measureText(stText).width + 44);
  const stX = W - PAD - stWidth;
  const stY = y + 96;
  drawRoundedRect(ctx, stX, stY, stWidth, 42, 21);
  ctx.fillStyle = st.bg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = st.border;
  ctx.stroke();
  ctx.fillStyle = st.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stText, stX + stWidth / 2, stY + 22);

  // Divider
  y = 278;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  // Two-column Party Cards: Issued By & Billed To
  y = 316;
  const cardGap = 36;
  const cardW = (W - PAD * 2 - cardGap) / 2;
  const cardH = 210;

  // Issued By card
  drawRoundedRect(ctx, PAD, y, cardW, cardH, 20);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#64748b';
  ctx.font = `700 18px ${fontSans}`;
  ctx.fillText(ar ? 'صادرة من (المزوّد)' : 'ISSUED BY', PAD + 32, y + 28);

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 28px ${fontSans}`;
  ctx.fillText(brand.brandName || 'Upclick', PAD + 32, y + 66);

  ctx.fillStyle = '#475569';
  ctx.font = `500 21px ${fontSans}`;
  ctx.fillText(brand.roleLabel, PAD + 32, y + 110);
  if (brand.email) {
    ctx.fillStyle = '#64748b';
    ctx.font = `400 20px ${fontSans}`;
    ctx.fillText(brand.email, PAD + 32, y + 146);
  }

  // Billed To card
  const rightCardX = PAD + cardW + cardGap;
  drawRoundedRect(ctx, rightCardX, y, cardW, cardH, 20);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = `700 18px ${fontSans}`;
  ctx.fillText(ar ? 'فاتورة إلى (العميل)' : 'BILLED TO', rightCardX + 32, y + 28);

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 28px ${fontSans}`;
  ctx.fillText(
    invoice.customer?.name || invoice.customer?.email || invoice.subscriberId,
    rightCardX + 32,
    y + 66,
  );

  ctx.fillStyle = '#475569';
  ctx.font = `500 21px ${fontSans}`;
  ctx.fillText(
    invoice.subscriberRole === 'ADMIN'
      ? ar
        ? 'مسؤول مساحة عمل (Admin)'
        : 'Workspace Administrator'
      : ar
      ? 'حساب مستخدم (User)'
      : 'Workspace Subscriber',
    rightCardX + 32,
    y + 110,
  );
  if (invoice.customer?.email) {
    ctx.fillStyle = '#64748b';
    ctx.font = `400 20px ${fontSans}`;
    ctx.fillText(invoice.customer.email, rightCardX + 32, y + 146);
  }

  // Metadata Strip (Issue Date, Paid Date, Payment Method, Currency)
  y = 564;
  drawRoundedRect(ctx, PAD, y, W - PAD * 2, 112, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  const metaCols = [
    {
      label: ar ? 'تاريخ الإصدار' : 'ISSUE DATE',
      value: formatDateStr(invoice.issuedAt, ar),
    },
    {
      label: ar ? 'تاريخ السداد' : 'PAID DATE',
      value: invoice.paidAt ? formatDateStr(invoice.paidAt, ar) : '—',
    },
    {
      label: ar ? 'طريقة الدفع' : 'PAYMENT METHOD',
      value: invoice.paymentMethod || (invoice.paymentType === 'wallet' ? 'From Wallet' : 'Direct Pay'),
    },
    {
      label: ar ? 'العملة' : 'CURRENCY',
      value: invoice.currency || 'USD',
    },
  ];
  const metaColW = (W - PAD * 2) / metaCols.length;
  metaCols.forEach((m, idx) => {
    const mx = PAD + idx * metaColW + 32;
    ctx.fillStyle = '#64748b';
    ctx.font = `700 16px ${fontSans}`;
    ctx.fillText(m.label, mx, y + 26);
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 22px ${fontSans}`;
    ctx.fillText(String(m.value).slice(0, 26), mx, y + 58);
  });

  // Line Items Table
  y = 720;
  const tableW = W - PAD * 2;
  drawRoundedRect(ctx, PAD, y, tableW, 68, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 19px ${fontSans}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(ar ? 'البند / الوصف' : 'DESCRIPTION', PAD + 32, y + 34);
  ctx.textAlign = 'center';
  ctx.fillText(ar ? 'الكمية' : 'QTY', PAD + tableW * 0.58, y + 34);
  ctx.textAlign = 'right';
  ctx.fillText(ar ? 'سعر الوحدة' : 'UNIT PRICE', PAD + tableW * 0.78, y + 34);
  ctx.fillText(ar ? 'الإجمالي' : 'AMOUNT', PAD + tableW - 32, y + 34);

  y += 76;
  const rows = invoice.items?.length
    ? invoice.items
    : [
        {
          description: { en: 'Billing Item', ar: 'بند فوترة' },
          quantity: 1,
          unitPrice: invoice.total,
          total: invoice.total,
        },
      ];

  rows.slice(0, 8).forEach((item, index) => {
    const rowH = item.credits || item.emailCredits ? 96 : 78;
    if (index % 2 === 1) {
      drawRoundedRect(ctx, PAD, y, tableW, rowH, 10);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
    }
    const title = ar
      ? item.description?.ar || item.description?.en || 'بند'
      : item.description?.en || item.description?.ar || 'Item';

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 23px ${fontSans}`;
    ctx.fillText(String(title).slice(0, 52), PAD + 32, y + 18);

    if ((item.credits ?? 0) > 0 || (item.emailCredits ?? 0) > 0) {
      const badges: string[] = [];
      if ((item.credits ?? 0) > 0) {
        badges.push(
          ar
            ? `+${item.credits?.toLocaleString('en-US')} رصيد ذكاء اصطناعي`
            : `+${item.credits?.toLocaleString('en-US')} AI Credits`,
        );
      }
      if ((item.emailCredits ?? 0) > 0) {
        badges.push(
          ar
            ? `+${item.emailCredits?.toLocaleString('en-US')} رصيد بريد`
            : `+${item.emailCredits?.toLocaleString('en-US')} Email Credits`,
        );
      }
      ctx.fillStyle = '#4f46e5';
      ctx.font = `600 18px ${fontSans}`;
      ctx.fillText(badges.join(' · '), PAD + 32, y + 54);
    }

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#334155';
    ctx.font = `600 22px ${fontSans}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(item.quantity ?? 1), PAD + tableW * 0.58, y + rowH / 2);

    ctx.textAlign = 'right';
    ctx.fillText(fmt(item.unitPrice ?? 0, invoice.currency), PAD + tableW * 0.78, y + rowH / 2);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 23px ${fontSans}`;
    ctx.fillText(fmt(item.total ?? 0, invoice.currency), PAD + tableW - 32, y + rowH / 2);

    ctx.beginPath();
    ctx.moveTo(PAD, y + rowH);
    ctx.lineTo(PAD + tableW, y + rowH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    y += rowH;
  });

  // Totals Summary Box on the right
  y += 44;
  const sumW = 580;
  const sumX = W - PAD - sumW;
  let sumY = y;

  const drawSummaryLine = (label: string, val: string, highlight = false, green = false) => {
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = highlight ? '#0f172a' : '#64748b';
    ctx.font = `${highlight ? 800 : 600} ${highlight ? 26 : 22}px ${fontSans}`;
    ctx.fillText(label, sumX + 28, sumY);

    ctx.textAlign = 'right';
    ctx.fillStyle = green ? '#059669' : '#0f172a';
    ctx.font = `${highlight ? 800 : 700} ${highlight ? 30 : 22}px ${fontSans}`;
    ctx.fillText(val, sumX + sumW - 28, sumY);
    sumY += highlight ? 54 : 42;
  };

  drawSummaryLine(ar ? 'المجموع الفرعي' : 'Subtotal', fmt(invoice.subtotal ?? invoice.total, invoice.currency));
  if ((invoice.discount ?? 0) > 0) {
    drawSummaryLine(
      ar ? `الخصم${invoice.couponCode ? ` (${invoice.couponCode})` : ''}` : `Discount${invoice.couponCode ? ` (${invoice.couponCode})` : ''}`,
      `-${fmt(invoice.discount, invoice.currency)}`,
      false,
      true,
    );
  }

  sumY += 8;
  drawRoundedRect(ctx, sumX, sumY - 12, sumW, 74, 16);
  ctx.fillStyle = '#f1f5f9';
  ctx.fill();
  sumY += 10;
  drawSummaryLine(ar ? 'الإجمالي المستحق' : 'Total', fmt(invoice.total, invoice.currency), true);

  if (invoice.paymentType === 'wallet' && invoice.walletCharged !== undefined) {
    sumY += 10;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#047857';
    ctx.font = `600 19px ${fontSans}`;
    ctx.fillText(
      ar
        ? `تم الخصم من المحفظة: ${fmt(invoice.walletCharged, invoice.walletCurrency || 'EUR')}`
        : `Deducted from Wallet: ${fmt(invoice.walletCharged, invoice.walletCurrency || 'EUR')}`,
      sumX + sumW - 12,
      sumY,
    );
  }

  // Notes / Reference Box on the left if present
  if (invoice.transactionId || invoice.note) {
    let noteY = y;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = `700 18px ${fontSans}`;
    ctx.fillText(ar ? 'مراجع الدفع والملاحظات' : 'PAYMENT DETAILS & NOTES', PAD, noteY);
    noteY += 34;
    if (invoice.transactionId) {
      ctx.fillStyle = '#334155';
      ctx.font = `600 20px ${fontSans}`;
      ctx.fillText(
        `${ar ? 'رقم المرجع:' : 'Reference ID:'} ${invoice.transactionId}`,
        PAD,
        noteY,
      );
      noteY += 32;
    }
    if (invoice.note) {
      ctx.fillStyle = '#475569';
      ctx.font = `400 20px ${fontSans}`;
      ctx.fillText(String(invoice.note).slice(0, 68), PAD, noteY);
    }
  }

  // Footer
  const footerY = H - 150;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY);
  ctx.lineTo(W - PAD, footerY);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#64748b';
  ctx.font = `600 19px ${fontSans}`;
  ctx.fillText(
    ar
      ? `تم إنشاء هذه الفاتورة إلكترونيًا بواسطة ${brand.brandName}.`
      : `Computer-generated official billing statement issued by ${brand.brandName}.`,
    PAD,
    footerY + 28,
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 18px ${fontSans}`;
  ctx.fillText(`${invoice.invoiceNumber} · Page 1 of 1`, W - PAD, footerY + 28);

  // Export JPEG -> PDF 1.4 Blob -> Download
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.94);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
  const pdfBlob = encodeJpegAsPdfA4(jpegBytes, W, H);

  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoice.invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
