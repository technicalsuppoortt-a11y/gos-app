// Canvas uses the browser's text shaping, including Arabic and mixed-direction values.
export function downloadReportPdf(filename: string, title: string, headings: string[], rows: string[][], rtl: boolean) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const offsets = [0];
  let length = 0;
  function append(value: string | Uint8Array<ArrayBuffer>) {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  }
  function object(body: string, stream?: Uint8Array<ArrayBuffer>) {
    offsets.push(length);
    append(`${offsets.length - 1} 0 obj\n${body}\n`);
    if (stream) { append('stream\n'); append(stream); append('\nendstream\n'); }
    append('endobj\n');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const pageSize = 32;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  append('%PDF-1.4\n');
  object('<< /Type /Catalog /Pages 2 0 R >>');
  object(`<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, page) => `${3 + page * 3} 0 R`).join(' ')}] >>`);
  for (let page = 0; page < pages; page++) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#141c3c';
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 26px system-ui';
    ctx.fillText(title, rtl ? 1180 : 60, 70, 1120);
    const width = 1120 / headings.length;
    const entries = [headings, ...rows.slice(page * pageSize, (page + 1) * pageSize)];
    entries.forEach((row, index) => {
      const y = 125 + index * 45;
      ctx.fillStyle = index === 0 ? '#ede9fe' : index % 2 ? '#f8fafc' : '#fff';
      ctx.fillRect(60, y, 1120, 45);
      ctx.fillStyle = '#141c3c';
      ctx.font = index === 0 ? '700 22px system-ui' : '22px system-ui';
      row.forEach((value, column) => {
        const x = rtl ? 1170 - column * width : 70 + column * width;
        ctx.fillText(value, x, y + 22, width - 20);
      });
    });
    const jpg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', .9).split(',')[1]), char => char.charCodeAt(0));
    const id = 3 + page * 3;
    const content = encoder.encode('q 595 0 0 842 0 0 cm /PageImage Do Q');
    object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /PageImage ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    object(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`, jpg);
    object(`<< /Length ${content.length} >>`, content);
  }
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const url = URL.createObjectURL(new Blob(chunks, { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
