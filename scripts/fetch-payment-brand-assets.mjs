import fs from 'node:fs/promises';
const sources = [
  ['vodafone.svg', 'https://cdn.jsdelivr.net/npm/simple-icons@16/icons/vodafone.svg'],
  ['orange.svg', 'https://cdn.jsdelivr.net/npm/simple-icons@16/icons/orange.svg'],
  ['instapay.png', 'https://www.instapay.eg/wp-content/uploads/2022/03/logo.png'],
  ['stc.svg', 'https://upload.wikimedia.org/wikipedia/commons/2/24/Stc_pay.svg'],
];
await fs.mkdir('public/payment-brands', { recursive: true });
await Promise.all(sources.map(async ([file, url]) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'Upclick-AssetSetup/1.0' } });
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (file.endsWith('.svg') && (!bytes.toString().includes('<svg') || /<script/i.test(bytes.toString()))) throw new Error('Invalid SVG');
  await fs.writeFile(`public/payment-brands/${file}`, bytes);
  console.log(`${file}: ${bytes.length} bytes`);
}));
