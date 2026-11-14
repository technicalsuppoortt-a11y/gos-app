// Minimal dependency-free XML helpers tailored to Namecheap's flat attribute-heavy responses.

export function attrMap(attrString = '') {
  const out = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

export function getAllTags(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}([^>]*?)\\/?>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push(attrMap(m[1]));
  }
  return out;
}

export function getTagBlocks(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push({ attrs: attrMap(m[1]), inner: m[2] });
  }
  return out;
}

export function getApiStatus(xml) {
  const m = /<ApiResponse[^>]*Status="([^"]*)"/i.exec(xml);
  return m ? m[1].toUpperCase() : '';
}

export function getApiErrors(xml) {
  const errors = [];
  const re = /<Error[^>]*Number="([^"]*)"[^>]*>([\s\S]*?)<\/Error>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    errors.push({ number: m[1], message: m[2].trim() });
  }
  if (!errors.length) {
    const loose = /<Error[^>]*>([\s\S]*?)<\/Error>/gi;
    while ((m = loose.exec(xml)) !== null) {
      errors.push({ number: '', message: m[1].trim() });
    }
  }
  return errors;
}

// Customer-safe error mapping. Never expose raw Namecheap account / IP / balance details to end users.
export function publicRegistrarError(errors = []) {
  const joined = errors.map(e => `${e.number}:${e.message}`).join(' | ');
  if (/insufficient|balance/i.test(joined)) {
    return 'The registrar could not complete this purchase. Please contact support.';
  }
  if (/not available|unavailable/i.test(joined)) {
    return 'This domain is no longer available.';
  }
  if (/timeout|timed out/i.test(joined)) {
    return 'The registrar timed out. Please try again.';
  }
  if (/invalid.*contact|phone|address|postal/i.test(joined)) {
    return 'Contact details are incomplete or invalid. Update Domain Settings and retry.';
  }
  if (/tld|extension/i.test(joined)) {
    return 'This domain extension is not supported yet.';
  }
  return 'We could not complete the registrar request. Please try again or contact support.';
}
