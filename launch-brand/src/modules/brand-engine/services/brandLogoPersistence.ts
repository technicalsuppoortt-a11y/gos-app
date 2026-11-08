import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { auth, db } from "@/modules/brand-engine/firebase";
import { doc, getDoc } from "firebase/firestore";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { store } from "@/modules/brand-engine/store";
import { resolveBrandTheme } from "@/modules/brand-engine/data/brandTheme";
import {
  createBrandLogoSvg,
  prepareBrandLogoSvg,
  logoPngFile,
  logoVersion,
  logoWidth,
  logoHeight,
  resolveBrandLogoImage,
} from "./brandLogo";
import { uploadBrandImage } from "./brandAssets";
import { logoSelectionVersion } from "@/modules/brand-engine/data/logoSelection";

const pending = new Map<string, Promise<unknown>>();
export function currentLogoIdentity(): BrandIdentity {
  const state = store.getState().brand;
  return {
    ...state.selectedBrandIdentity,
    name: state.brandName.trim() || state.selectedBrandIdentity.name,
    tagline: state.tagline.trim() || state.selectedBrandIdentity.tagline,
    palette: state.brandPalette,
    typography: state.fontPersonality,
  };
}
export const currentLogoFingerprint = () =>
  JSON.stringify({
    version: logoVersion,
    identity: currentLogoIdentity(),
    primary: resolveBrandTheme(store.getState().brand).light.primary,
  });

export async function ensureBrandLogoSaved(): Promise<unknown> {
  const uid = auth.currentUser?.uid;
  if (!uid || store.getState().brand.userProfile?.uid !== uid)
    throw new Error("Sign in before saving your logo.");
  const saved = store.getState().brand.pageParameters["branding"]?.["uploadedLogo"] as
    { fingerprint?: string; origin?: string } | undefined;
  const fingerprint = currentLogoFingerprint();
  const selectionVersion = logoSelectionVersion(uid);
  if (saved && (saved.origin !== "generated_logo" || saved.fingerprint === fingerprint))
    return saved;
  const identity = currentLogoIdentity();
  if (identity.logo?.image) {
    const image = identity.logo.image;
    if (image.ownerUid !== uid) throw new Error("The saved logo belongs to another account.");
    const snapshot = await getDoc(doc(db, "users", uid, "assets", image.assetId));
    const asset = snapshot.data();
    if (!asset || !snapshot.exists()) throw new Error("The generated logo image could not be found.");
    await resolveBrandLogoImage(identity);
    if (auth.currentUser?.uid !== uid || logoSelectionVersion(uid) !== selectionVersion || currentLogoFingerprint() !== fingerprint) return null;
    const { dataUrl: _bytes, ...reference } = asset;
    const selected = { ...reference, fingerprint, origin: "generated_logo", rendererVersion: logoVersion, identity };
    store.dispatch(actions.setPageParameter({ pageId: "branding", key: "uploadedLogo", value: selected }));
    return selected;
  }
  const key = `${uid}:${fingerprint}`;
  const existing = pending.get(key);
  if (existing) {
    await existing;
    return ensureBrandLogoSaved();
  }
  const operation = (async () => {
    const identity = currentLogoIdentity();
    const primary = resolveBrandTheme(store.getState().brand).light.primary;
    const svg = await prepareBrandLogoSvg(identity, primary);
    const file = await logoPngFile(svg, identity.name);
    if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed.");
    if (currentLogoFingerprint() !== fingerprint) return null;
    const asset = await uploadBrandImage(file, "logo", {
      metadata: {
        origin: "generated_logo",
        fingerprint,
        rendererVersion: logoVersion,
        identity,
        colors: { primary, background: "transparent" },
        width: logoWidth,
        height: logoHeight,
        // Keep embedded font bytes in exports, not in the draft/asset metadata.
        svg: createBrandLogoSvg(identity, primary, { embedFonts: false }),
      },
      activate: () => {
        const currentAsset = store.getState().brand.pageParameters["branding"]?.["uploadedLogo"] as
          { origin?: string } | undefined;
        return (
          auth.currentUser?.uid === uid &&
          logoSelectionVersion(uid) === selectionVersion &&
          currentLogoFingerprint() === fingerprint &&
          (!currentAsset || currentAsset.origin === "generated_logo")
        );
      },
    });
    return asset;
  })();
  pending.set(key, operation);
  let result: unknown;
  try {
    result = await operation;
  } finally {
    pending.delete(key);
  }
  if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed.");
  if (currentLogoFingerprint() !== fingerprint) return ensureBrandLogoSaved();
  return result;
}
