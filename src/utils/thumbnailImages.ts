import manifest from './thumbnail-manifest.json';
/** Only bundled sample images have generated variants. User uploads keep their URLs. */
export function thumbnailImageProps(src: string | undefined, sizes = '(max-width: 640px) 100vw, 360px') {
  const srcSet = src && (manifest as Record<string, string>)[src];
  return srcSet ? { srcSet, sizes } : {};
}
