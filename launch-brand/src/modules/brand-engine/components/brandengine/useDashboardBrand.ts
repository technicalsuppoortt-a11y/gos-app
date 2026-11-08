import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/modules/brand-engine/firebase";
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import { dashboardBrand } from "@/modules/brand-engine/data/dashboardBrand";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from '../../../../lib/firebase';
import { cachedBrandAssetUrl, resolveFirestoreBrandImage } from "@/modules/brand-engine/services/brandAssets";
import { brandLogoImageUrl, resolveBrandLogoImage } from '../../services/brandLogo';
import type { BrandIdentity } from '../../data/types';

type BrandLogoAsset = { assetId?: string; url?: string; origin?: string; identity?: BrandIdentity };
export function useDashboardBrand(assetOverride?: BrandLogoAsset) {
  const state = useAppSelector((root) => root.brand);
  const uid = state.userProfile?.uid;
  const asset =
    assetOverride ??
    (state.pageParameters["branding"]?.["uploadedLogo"] as BrandLogoAsset | undefined);
  const assetId = asset?.assetId;
  const [logo, setLogo] = useState<{ key: string; url: string } | null>(null);
  const [logoError, setLogoError] = useState(false);
  const key = `${uid}:${assetId}`;
  const nativeIdentity = asset?.origin === 'generated_logo' && asset.identity?.logo?.image?.assetId === assetId ? asset.identity : undefined;
  const cachedUrl = nativeIdentity ? brandLogoImageUrl(nativeIdentity) : uid && assetId ? cachedBrandAssetUrl(uid, assetId) : undefined;
  useEffect(() => {
    setLogoError(false);
    if (!uid || !assetId || cachedUrl) return;
    let active = true;
    if (nativeIdentity) {
      resolveBrandLogoImage(nativeIdentity).then(url => { if (active) setLogo({ key, url }); })
        .catch(() => { if (active) setLogoError(true); });
      return () => { active = false; };
    }
    getDoc(doc(db, "users", uid, "assets", assetId))
      .then(async (snapshot) => {
        const data = snapshot.data();
        const path = data?.["storagePath"];
        const dataUrl =
          data?.["kind"] === "storage_image" &&
          typeof path === "string" &&
          path.startsWith(`users/${uid}/brandAssets/${assetId}/`)
            ? await getDownloadURL(ref(storage, path))
            : data
              ? await resolveFirestoreBrandImage(uid, assetId, data)
              : undefined;
        if (!active) return;
        if (
          typeof dataUrl === "string" &&
          (/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(dataUrl) ||
            /^https:\/\//.test(dataUrl))
        )
          setLogo({ key, url: dataUrl });
        else setLogoError(true);
      })
      .catch(() => {
        if (active) setLogoError(true);
      });
    return () => {
      active = false;
    };
  }, [uid, assetId, key, cachedUrl, nativeIdentity]);
  return {
    ...dashboardBrand(state),
    logoUrl: cachedUrl || (logo?.key === key ? logo.url : undefined),
    logoError,
    generatedLogo: asset?.origin === "generated_logo",
    setLogoError,
  };
}
