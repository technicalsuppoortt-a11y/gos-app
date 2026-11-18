import fs from 'node:fs/promises';

// Original provider artwork, bundled locally so checkout never depends on hotlinks.
const sources = [
  ['paddle.svg', 'https://www.paddle.com/svg/paddle-logo.svg'],
  ['fawry.png', 'https://www.fawry.com/wp-content/uploads/2023/05/fawry-Logo.png'],
  ['kashier.png', 'https://www.kashier.io/assets/images/logo-nav.png'],
  ['paymob.svg', 'https://www.paymob.com/_next/static/media/logo.f3f26586.svg'],
];
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
await fs.mkdir('public/payment-brands', { recursive: true });
for (const [name, url] of sources) {
  const bytes = await download(url);
  if (name.endsWith('.svg') && (!bytes.toString().includes('<svg') || /<script|<foreignObject|\bon\w+=/i.test(bytes.toString()))) throw new Error(`Invalid SVG: ${name}`);
  if (name.endsWith('.png') && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${name}`);
  await fs.writeFile(`public/payment-brands/${name}`, bytes);
  console.log(`${name}: ${bytes.length} bytes`);
}
// Stripe publishes its wordmark inline in the header rather than as an image URL.
const html = (await download('https://stripe.com')).toString();
const logo = [...html.matchAll(/<svg\b[^>]*[\s\S]*?<\/svg>/g)].find(m => /aria-label="Stripe logo"/.test(m[0]))?.[0];
if (!logo) throw new Error('Official Stripe wordmark not found');
await fs.writeFile('public/payment-brands/stripe.svg', logo.replaceAll('var(--hds-color-text-solid)', '#031323'));
console.log('stripe.svg: official header wordmark');
