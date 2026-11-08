// Remove only the white matte connected to the image boundary. Enclosed white
// details and colored artwork remain intact; existing alpha is preserved.
export function removeLogoWhiteMatte(pixels: Uint8ClampedArray, width: number, height: number) {
  if (pixels.length !== width * height * 4 || width < 1 || height < 1) throw new Error('Invalid logo pixels.');
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let head = 0, tail = 0, changed = false;
  const visit = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    const r = pixels[offset]!, g = pixels[offset + 1]!, b = pixels[offset + 2]!;
    if (pixels[offset + 3] !== 0 && (Math.min(r, g, b) < 240 || Math.max(r, g, b) - Math.min(r, g, b) > 20)) return;
    if (pixels[offset + 3] !== 0) { pixels[offset + 3] = 0; changed = true; }
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++]!;
    if (index % width) visit(index - 1);
    if (index % width !== width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index + width < width * height) visit(index + width);
  }
  return changed;
}

export async function transparentLogoPng(dataUrl: string): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const width = image.naturalWidth, height = image.naturalHeight;
  if (!width || !height || width * height > 40_000_000) throw new Error('Invalid logo dimensions.');
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Logo transparency is unavailable.');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height);
  const changed = removeLogoWhiteMatte(pixels.data, width, height);
  if (!changed && dataUrl.startsWith('data:image/png;')) return dataUrl;
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}
