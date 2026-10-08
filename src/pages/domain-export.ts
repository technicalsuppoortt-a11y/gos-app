import type { Domain, Workspace } from './asset-model';

export type DomainReportRow = {
  domain: string;
  connectionStatus: Domain['status'];
  assignedAsset: string | null;
  assetType: string | null;
  sslState: Domain['ssl'];
  renewalAt: string | null;
  isDefault: boolean;
};
export function domainReportRows(domains: Domain[], workspace: Workspace): DomainReportRow[] {
  return domains.map(domain => {
    const asset = workspace.assets.find(asset => asset.id === domain.assetId);
    const renewal = domain.renewalAt && !Number.isNaN(Date.parse(domain.renewalAt)) ? new Date(domain.renewalAt).toISOString() : null;
    return { domain: domain.name, connectionStatus: domain.status, assignedAsset: asset?.name ?? null, assetType: asset ? (asset.kind === 'funnel' ? 'Funnel' : 'Website') : null, sslState: domain.ssl, renewalAt: renewal, isDefault: domain.default };
  });
}

/** Prevent spreadsheet applications from interpreting exported text as formulas. */
function csvCell(value: string) {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function domainCSV(rows: DomainReportRow[]) {
  const header = ['Domain', 'Connection status', 'Assigned asset', 'Asset type', 'SSL state', 'Renewal timestamp (UTC)', 'Default'];
  const values = rows.map(row => [row.domain, row.connectionStatus, row.assignedAsset ?? 'Not assigned', row.assetType ?? 'Not assigned', row.sslState, row.renewalAt ?? 'Not available', row.isDefault ? 'Yes' : 'No']);
  return '\uFEFF' + [header, ...values].map(row => row.map(csvCell).join(',')).join('\r\n');
}
export function domainJSON(rows: DomainReportRow[], generatedAt = new Date().toISOString()) {
  return JSON.stringify({ report: 'GOS Domains Summary', generatedAt, count: rows.length, domains: rows }, null, 2);
}

const pageWidth = 842, pageHeight = 595;
const columns = [180, 85, 238, 100, 159];
const perPage = 9;
function textLines(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of Array.from(text)) {
    if (context.measureText(line + char).width > width && line) { lines.push(line); line = char; }
    else line += char;
  }
  if (line) lines.push(line);
  return lines;
}

/** Canvas preserves the workspace's Unicode names without adding a PDF dependency. */
export function renderDomainReportPage(rows: DomainReportRow[], pageIndex: number, generatedAt: string, totalRows: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = pageWidth * 2; canvas.height = pageHeight * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser does not support PDF report rendering.');
  context.scale(2, 2);
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, pageWidth, pageHeight);
  context.fillStyle = '#6366f1'; context.fillRect(40, 34, 4, 43);
  context.fillStyle = '#0f172a'; context.font = 'bold 22px Arial, sans-serif'; context.fillText('Domains Summary', 57, 54);
  context.font = '11px Arial, sans-serif'; context.fillStyle = '#64748b';
  context.fillText(`GOS · ${totalRows} ${totalRows === 1 ? 'domain' : 'domains'} · Workspace report`, 57, 74);
  const date = new Date(generatedAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' });
  context.fillText(`Generated ${date} (Cairo)`, 40, 104);
  context.fillStyle = '#eef2ff'; context.fillRect(40, 121, 762, 31);
  context.font = 'bold 10px Arial, sans-serif'; context.fillStyle = '#475569';
  let left = 40;
  ['Domain', 'Status', 'Assigned asset', 'SSL state', 'Renewal timestamp (UTC)'].forEach((label, index) => { context.fillText(label, left + 10, 141); left += columns[index]; });
  rows.forEach((row, index) => {
    const top = 152 + index * 42;
    context.fillStyle = index % 2 ? '#f8fafc' : '#ffffff'; context.fillRect(40, top, 762, 42);
    context.strokeStyle = '#e2e8f0'; context.beginPath(); context.moveTo(40, top + 42); context.lineTo(802, top + 42); context.stroke();
    const values = [row.domain, row.connectionStatus, row.assignedAsset ? `${row.assetType} · ${row.assignedAsset}` : 'Not assigned', row.sslState, row.renewalAt ?? 'Not available'];
    left = 40; context.font = '10px Arial, sans-serif';
    values.forEach((value, column) => {
      context.fillStyle = column === 1 ? (row.connectionStatus === 'Connected' ? '#169b76' : row.connectionStatus === 'Pending' ? '#b7791f' : '#be123c') : '#334155';
      let size = 10, lines = textLines(context, value, columns[column] - 20);
      // Wrap long names inside their cell rather than bleeding into adjacent columns.
      while (lines.length > 2 && size > 6) {
        size--; context.font = `${size}px Arial, sans-serif`;
        lines = textLines(context, value, columns[column] - 20);
      }
      const spacing = Math.min(size + 3, 32 / Math.max(1, lines.length));
      const firstLine = top + 21 - (lines.length - 1) * spacing / 2 + size / 3;
      lines.forEach((line, lineIndex) => context.fillText(line, left + 10, firstLine + lineIndex * spacing));
      context.font = '10px Arial, sans-serif';
      left += columns[column];
    });
  });
  context.fillStyle = '#64748b'; context.font = '10px Arial, sans-serif';
  context.fillText('Renewal dates are included when available; missing dates are not estimated.', 40, 556);
  context.fillText(`GOS · Page ${pageIndex + 1} of ${Math.max(1, Math.ceil(totalRows / perPage))}`, 680, 556);
  return canvas;
}

/** Embed one high-resolution JPEG per report page in a standards-compliant PDF. */
export function domainPDF(rows: DomainReportRow[], generatedAt = new Date().toISOString()): Blob {
  const encoder = new TextEncoder(), chunks: Uint8Array[] = [], offsets: number[] = [0];
  let length = 0;
  const append = (value: string | Uint8Array) => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id: number, body: string | Uint8Array, prefix = '', suffix = '') => { offsets[id] = length; append(`${id} 0 obj\n${prefix}`); append(body); append(`${suffix}\nendobj\n`); };
  const count = Math.max(1, Math.ceil(rows.length / perPage));
  append('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${count} /Kids [${Array.from({ length: count }, (_, index) => `${3 + index * 3} 0 R`).join(' ')}] >>`);
  for (let index = 0; index < count; index++) {
    const page = 3 + index * 3, image = page + 1, content = page + 2;
    const canvas = renderDomainReportPage(rows.slice(index * perPage, (index + 1) * perPage), index, generatedAt, rows.length);
    const data = atob(canvas.toDataURL('image/jpeg', .95).split(',')[1]);
    const bytes = Uint8Array.from(data, char => char.charCodeAt(0));
    object(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Report ${image} 0 R >> >> /Contents ${content} 0 R >>`);
    object(image, bytes, `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`, '\nendstream');
    const commands = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Report Do Q\n`;
    object(content, commands, `<< /Length ${encoder.encode(commands).length} >>\nstream\n`, 'endstream');
  }
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach(offset => append(`${String(offset).padStart(10, '0')} 00000 n \n`));
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export function downloadDomainReport(rows: DomainReportRow[], format: 'csv' | 'json' | 'pdf') {
  const generatedAt = new Date().toISOString();
  const blob = format === 'pdf' ? domainPDF(rows, generatedAt) : new Blob([format === 'csv' ? domainCSV(rows) : domainJSON(rows, generatedAt)], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `gos-domains-${generatedAt.slice(0, 10)}.${format}`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
