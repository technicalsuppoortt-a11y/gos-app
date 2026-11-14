export function attrMap(attrString = '') {
  const attrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

export function getAllTags(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}([^>]*)\\/?>`, 'gi');
  let m;
  while ((m = re.exec(String(xml || '')))) {
    out.push(attrMap(m[1] || ''));
  }
  return out;
}

export function getTagBlocks(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let m;
  while ((m = re.exec(String(xml || '')))) {
    out.push({ attrs: attrMap(m[1] || ''), inner: m[2] || '' });
  }
  return out;
}

export function getApiStatus(xml) {
  const m = String(xml || '').match(/<ApiResponse[^>]*Status="([^"]+)"/i);
  return m ? m[1] : '';
}

export function getApiErrors(xml) {
  const errors = [];
  const re = /<Error[^>]*Number="([^"]*)"[^>]*>([\s\S]*?)<\/Error>/gi;
  let m;
  while ((m = re.exec(String(xml || '')))) {
    errors.push({ number: m[1], message: String(m[2] || '').trim() });
  }
  if (!errors.length) {
    const loose = /<Error[^>]*>([\s\S]*?)<\/Error>/i.exec(String(xml || ''));
    if (loose) errors.push({ number: '', message: String(loose[1] || '').trim() });
  }
  return errors;
}

export function publicRegistrarError(errors = []) {
  const text = errors.map((e) => e.message).join(' ').toLowerCase();
  if (/insufficient|balance/i.test(text)) return 'The registrar could not complete this purchase. Please contact support.';
  if (/not available|unavailable/i.test(text)) return 'This domain is no longer available.';
  if (/timeout|timed out/i.test(text)) return 'The registrar timed out. Please try again.';
  if (/invalid.*contact|phone|address|postal/i.test(text)) return 'Contact details are incomplete or invalid. Update Domain Settings and retry.';
  if (/tld|extension/i.test(text)) return 'This domain extension is not supported yet.';
  return 'We could not complete the registrar request. Please try again or contact support.';
}
