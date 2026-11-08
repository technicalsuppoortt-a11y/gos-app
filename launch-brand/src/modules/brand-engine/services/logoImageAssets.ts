import { auth } from '../firebase';
import { uploadBrandImage } from './brandAssets';
import type { BrandIdentity } from '../data/types';
import { resolveBrandLogoImage } from './brandLogo';
import { transparentLogoPng } from './logoTransparency';

export async function prepareGeneratedLogoImage(dataUrl: string) {
  dataUrl = await transparentLogoPng(dataUrl);
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('The image model returned an unsupported logo image.');
  const bytes = Uint8Array.from(atob(match[2]!), character => character.charCodeAt(0));
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('The generated logo exceeds the 5 MB image limit.');
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const width = image.naturalWidth, height = image.naturalHeight;
  if (!width || !height || width * height > 40_000_000) throw new Error('The generated logo has invalid dimensions.');
  const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1]!.split('/')[1];
  return { file: new File([bytes], `generated-logo.${extension}`, { type: match[1] }), width, height, dataUrl };
}

export async function persistGeneratedLogoImage(file: File, identity: BrandIdentity) {
  const uid = auth.currentUser?.uid;
  const image = identity.logo?.image;
  if (!uid || !image || image.ownerUid !== uid) throw new Error('The signed-in account changed.');
  const asset = await uploadBrandImage(file, 'logo', {
    metadata: { origin: 'generated_logo', imageModel: image.model, width: image.width, height: image.height },
    // A suggestion becomes the active logo only after the user chooses it.
    activate: () => false,
  });
  if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
  const { dataUrl: _temporaryBytes, ...reference } = image;
  const assetId = (asset as Record<string, unknown>)['assetId'];
  if (typeof assetId !== 'string' || !assetId) throw new Error('The generated logo image could not be saved.');
  return { ...reference, assetId };
}

export async function rasterLogoPngFile(identity: BrandIdentity) {
  const dataUrl = await resolveBrandLogoImage(identity);
  if (!dataUrl) throw new Error('The generated logo image could not be loaded.');
  const name = `${identity.name.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60) || 'brand'}-logo.png`;
  if (dataUrl.startsWith('data:image/png;')) {
    return new File([await (await fetch(dataUrl)).blob()], name, { type: 'image/png' });
  }
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is unavailable.');
  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image export failed.')), 'image/png'));
  return new File([blob], name, { type: 'image/png' });
}
