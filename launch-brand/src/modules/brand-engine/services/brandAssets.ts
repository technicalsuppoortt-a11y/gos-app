import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "@/modules/brand-engine/firebase";
import { store } from "@/modules/brand-engine/store";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import {
  BRAND_IMAGE_ENCODING,
  brandImageManifest,
  joinBrandImage,
  splitBrandImage,
} from "@/modules/brand-engine/data/brandImageChunks";

const assetUrls = new Map<string, string>();
export const cachedBrandAssetUrl = (uid: string, assetId: string) =>
  assetUrls.get(`${uid}:${assetId}`);
const cacheAsset = (uid: string, assetId: string, url: string) => {
  assetUrls.set(`${uid}:${assetId}`, url);
  if (assetUrls.size > 100) {
    const oldest = assetUrls.keys().next().value;
    if (oldest) assetUrls.delete(oldest);
  }
};
async function imageDigest(url: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function resolveFirestoreBrandImage(
  uid: string,
  assetId: string,
  data: Record<string, unknown>,
) {
  const checkAccount = () => {
    if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed.");
  };
  checkAccount();
  if (!/^[a-z0-9-]{1,100}$/i.test(assetId) || data["kind"] !== "firestore_image")
    throw new Error("Invalid saved logo reference.");
  let url: string;
  if (data["encoding"] === BRAND_IMAGE_ENCODING) {
    const manifest = brandImageManifest(data);
    const snapshots = await timeout(
      Promise.all(
        Array.from({ length: manifest.chunkCount }, (_, index) =>
          getDoc(doc(db, "users", uid, "assets", `${assetId}-part-${index}`)),
        ),
      ),
      30000,
    );
    checkAccount();
    url = joinBrandImage(
      assetId,
      data,
      snapshots.map((snapshot) => snapshot.data() ?? {}),
    );
    if ((await imageDigest(url)) !== manifest.sha256)
      throw new Error("The saved logo is damaged. Upload it again.");
  } else {
    url = String(data["dataUrl"] ?? "");
    if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(url) || url.length >= 750000)
      throw new Error("The saved logo is missing.");
  }
  checkAccount();
  cacheAsset(uid, assetId, url);
  return url;
}
const types: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};
export function brandImageType(file: Pick<File, "type" | "name">) {
  return file.type || types[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
}
const timeout = <T>(operation: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Saving took too long. Check your connection and retry.")),
      ms,
    );
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
const dataUrl = (file: File, type: string) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;/, `data:${type};`));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
export async function validateBrandImage(file: File) {
  const type = brandImageType(file);
  if (!Object.values(types).includes(type) || file.size > 5 * 1024 * 1024 || !file.size)
    throw new Error("Choose a PNG, JPEG, WebP or SVG logo up to 5 MB.");
  if (type === "image/svg+xml") {
    const source = await file.text();
    if (/<!DOCTYPE|<!ENTITY/i.test(source))
      throw new Error("This SVG contains unsupported content. Export it as PNG and retry.");
    const svg = new DOMParser().parseFromString(source, "image/svg+xml");
    const allowed = new Set([
      "svg",
      "g",
      "path",
      "rect",
      "circle",
      "ellipse",
      "line",
      "polyline",
      "polygon",
      "text",
      "tspan",
      "defs",
      "linearGradient",
      "radialGradient",
      "stop",
      "title",
      "desc",
    ]);
    if (
      svg.querySelector("parsererror") ||
      svg.documentElement.tagName !== "svg" ||
      Array.from(svg.querySelectorAll("*")).some(
        (el) =>
          !allowed.has(el.tagName) ||
          Array.from(el.attributes).some(
            (attr) =>
              /^on/i.test(attr.name) ||
              /href|style/i.test(attr.name) ||
              (/javascript:|data:|https?:|url\(\s*[^#]/i.test(attr.value) &&
                !attr.name.startsWith("xmlns")),
          ),
      )
    )
      throw new Error(
        "Use a simple SVG without scripts or external content, or export your logo as PNG.",
      );
  } else {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000)
        throw new Error("Image dimensions are too large.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
  return type;
}
export function brandUploadError(error: unknown, ar: boolean) {
  const code = (error as { code?: string })?.code ?? "";
  if (code.includes("unauthorized") || code.includes("permission-denied"))
    return ar
      ? "حسابك مش قادر يحفظ اللوجو حاليًا. راجع صلاحيات الحفظ ثم اضغط إعادة المحاولة. المعاينة لم تُحفظ بعد."
      : "Your account could not save this logo. Check upload permissions, then retry. The preview is not saved yet.";
  if (
    code.includes("unavailable") ||
    code.includes("bucket-not-found") ||
    code.includes("retry-limit") ||
    code.includes("canceled")
  )
    return ar
      ? "تعذّر الاتصال بحفظ الصور. تأكد من الاتصال ثم أعد المحاولة. المعاينة الحالية لم تُحفظ بعد."
      : "Image saving is unavailable. Check your connection and retry. This preview has not been saved.";
  return ar
    ? "تعذّر حفظ اللوجو. تأكد من الاتصال، واستخدم PNG أو JPG أو WebP أو SVG بسيط حتى ٥ ميجابايت، ثم أعد المحاولة."
    : error instanceof Error
      ? error.message
      : "Could not save your logo. Check your connection and retry.";
}
// Files are immutable. Reuse preparation across preview, upload and retries.
// Weak keys release the image bytes when the selected File is no longer used.
const preparedImages = new WeakMap<File, Promise<{ contentType: string; url: string }>>();
export function prepareBrandImage(file: File) {
  const existing = preparedImages.get(file);
  if (existing) return existing;
  const type = brandImageType(file);
  if (!Object.values(types).includes(type) || file.size > 5 * 1024 * 1024 || !file.size)
    return Promise.reject(new Error("Choose a PNG, JPEG, WebP or SVG logo up to 5 MB."));
  const preparation = Promise.all([validateBrandImage(file), dataUrl(file, type)])
    .then(([contentType, url]) => ({ contentType, url }))
    .catch((error: unknown) => {
      preparedImages.delete(file);
      throw error;
    });
  preparedImages.set(file, preparation);
  return preparation;
}
export async function uploadBrandImage(
  file: File,
  kind: "logo" | "creative",
  options?: {
    metadata: Record<string, unknown>;
    activate: () => boolean;
    onProgress?: (progress: number) => void;
  },
) {
  const uid = auth.currentUser?.uid;
  if (!uid || store.getState().brand.userProfile?.uid !== uid)
    throw new Error("Sign in before uploading.");
  const { contentType, url } = await prepareBrandImage(file);
  const checkAccount = () => {
    if (auth.currentUser?.uid !== uid || store.getState().brand.userProfile?.uid !== uid)
      throw new Error("The signed-in account changed.");
  };
  checkAccount();
  const assetId = crypto.randomUUID();
  options?.onProgress?.(10);
  const parts = splitBrandImage(url);
  const base = {
    ...options?.metadata,
    assetId,
    contentType,
    originalName: file.name,
    size: file.size,
    kind: "firestore_image",
  };
  const asset: Record<string, unknown> =
    parts.length === 1
      ? { ...base, dataUrl: url }
      : {
          ...base,
          dataUrl: "",
          encoding: BRAND_IMAGE_ENCODING,
          chunkCount: parts.length,
          encodedLength: url.length,
          sha256: await imageDigest(url),
        };
  checkAccount();
  const batch = writeBatch(db);
  batch.set(doc(db, "users", uid, "assets", assetId), { ...asset, createdAt: serverTimestamp() });
  if (parts.length > 1)
    parts.forEach((part, index) => {
      batch.set(doc(db, "users", uid, "assets", `${assetId}-part-${index}`), {
        kind: "firestore_image",
        dataUrl: part,
        parentAssetId: assetId,
        index,
        createdAt: serverTimestamp(),
      });
    });
  options?.onProgress?.(50);
  checkAccount();
  // One atomic commit: no saved manifest can point at partially written chunks.
  await timeout(batch.commit(), 30000);
  checkAccount();
  cacheAsset(uid, assetId, url);
  // Image bytes remain in assets; page drafts store a small reference only.
  const { dataUrl: _bytes, ...referenceAsset } = asset;
  const activated = !options || options.activate();
  if (activated)
    store.dispatch(
      actions.setPageParameter({
        pageId: kind === "logo" ? "branding" : "marketing",
        key: kind === "logo" ? "uploadedLogo" : "creativeAsset",
        value: referenceAsset,
      }),
    );
  options?.onProgress?.(100);
  return { ...referenceAsset, url, activated };
}
