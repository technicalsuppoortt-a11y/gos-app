import fs from 'node:fs/promises';
import path from 'node:path';
const { default: sharp } = await import(process.env.SHARP_MODULE || 'sharp');
const manifest = {};
await fs.mkdir('public/thumbnails', { recursive: true });
let originalBytes = 0, thumbnailBytes = 0;
for (const folder of ['dashboard', 'pagefly']) {
  for (const name of await fs.readdir('public/' + folder)) {
    if (!name.endsWith('.png')) continue;
    const input = path.join('public', folder, name);
    const metadata = await sharp(input).metadata();
    const variants = [];
    for (const width of [320, 640]) {
      if (metadata.width <= width) continue;
      const output = '/thumbnails/' + folder + '-' + name.replace('.png', '') + '-' + width + '.webp';
      const info = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile('public' + output);
      thumbnailBytes += info.size;
      variants.push(output + ' ' + width + 'w');
    }
    const source = '/' + folder + '/' + name;
    variants.push(source + ' ' + metadata.width + 'w');
    manifest[source] = variants.join(', ');
    originalBytes += (await fs.stat(input)).size;
  }
}
await fs.writeFile('src/utils/thumbnail-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ originalBytes, thumbnailBytes, images: Object.keys(manifest).length }));
