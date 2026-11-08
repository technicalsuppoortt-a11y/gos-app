// Compare the symbol alone. Center and normalize its visible bounds so moving
// or scaling the same artwork cannot make a new design look distinct.
export function normalizeLogoMask(alpha, width, height, size = 48) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (alpha[y * width + x] < 128) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error("Empty logo artwork.");
  const span = Math.max(right - left + 1, bottom - top + 1);
  const scale = (size - 4) / span;
  const cx = (left + right + 1) / 2, cy = (top + bottom + 1) / 2;
  return Array.from({ length: size * size }, (_, i) => {
    const x = Math.floor(cx + (i % size + .5 - size / 2) / scale);
    const y = Math.floor(cy + (Math.floor(i / size) + .5 - size / 2) / scale);
    return x >= 0 && x < width && y >= 0 && y < height && alpha[y * width + x] >= 128 ? 1 : 0;
  });
}

export function logoMaskSimilarity(a, b, size = 48) {
  let best = 0;
  // Allow one pixel of raster alignment error while counting ink outside the
  // intersection in the union, including shifted edge pixels.
  const inkA = a.reduce((sum, value) => sum + value, 0);
  const inkB = b.reduce((sum, value) => sum + value, 0);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    let intersection = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const bx = x + dx, by = y + dy;
      if (bx >= 0 && bx < size && by >= 0 && by < size && a[y * size + x] && b[by * size + bx]) intersection++;
    }
    const union = inkA + inkB - intersection;
    best = Math.max(best, union ? intersection / union : 0);
  }
  return best;
}
