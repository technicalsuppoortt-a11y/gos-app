export const BRAND_IMAGE_LIMIT = 5 * 1024 * 1024;
export const BRAND_IMAGE_CHUNK_LENGTH = 512000;
export const BRAND_IMAGE_ENCODING = "chunked-data-url-v1";
const imagePrefix = /^data:image\/(png|jpeg|webp|svg\+xml);base64,/;
const maxEncodedLength = Math.ceil(BRAND_IMAGE_LIMIT / 3) * 4 + 40;

export function splitBrandImage(url: string) {
  if (!imagePrefix.test(url) || url.length > maxEncodedLength)
    throw new Error("Invalid logo image.");
  const parts: string[] = [];
  for (let offset = 0; offset < url.length; offset += BRAND_IMAGE_CHUNK_LENGTH)
    parts.push(url.slice(offset, offset + BRAND_IMAGE_CHUNK_LENGTH));
  return parts;
}

export function brandImageManifest(data: Record<string, unknown>) {
  const { chunkCount, encodedLength, size, contentType } = data;
  if (
    data["encoding"] !== BRAND_IMAGE_ENCODING ||
    !Number.isInteger(chunkCount) ||
    Number(chunkCount) < 2 ||
    Number(chunkCount) > Math.ceil(maxEncodedLength / BRAND_IMAGE_CHUNK_LENGTH) ||
    !Number.isInteger(encodedLength) ||
    Number(encodedLength) > maxEncodedLength ||
    Math.ceil(Number(encodedLength) / BRAND_IMAGE_CHUNK_LENGTH) !== chunkCount ||
    !Number.isInteger(size) ||
    Number(size) <= 0 ||
    Number(size) > BRAND_IMAGE_LIMIT ||
    !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(String(contentType)) ||
    typeof data["sha256"] !== "string" ||
    !/^[a-f0-9]{64}$/.test(data["sha256"])
  )
    throw new Error("The saved logo is incomplete. Upload it again.");
  return {
    chunkCount: Number(chunkCount),
    encodedLength: Number(encodedLength),
    size: Number(size),
    contentType: String(contentType),
    sha256: data["sha256"],
  };
}

export function joinBrandImage(
  assetId: string,
  data: Record<string, unknown>,
  parts: Record<string, unknown>[],
) {
  const manifest = brandImageManifest(data);
  if (
    parts.length !== manifest.chunkCount ||
    parts.some(
      (part, index) =>
        part["kind"] !== "firestore_image" ||
        part["parentAssetId"] !== assetId ||
        part["index"] !== index ||
        typeof part["dataUrl"] !== "string" ||
        part["dataUrl"].length !==
          Math.min(
            BRAND_IMAGE_CHUNK_LENGTH,
            manifest.encodedLength - index * BRAND_IMAGE_CHUNK_LENGTH,
          ),
    )
  )
    throw new Error("The saved logo is incomplete. Upload it again.");
  const url = parts.map((part) => part["dataUrl"]).join("");
  const prefix = `data:${manifest.contentType};base64,`;
  const bytes = url.slice(prefix.length);
  const decodedSize =
    (bytes.length / 4) * 3 - (bytes.endsWith("==") ? 2 : bytes.endsWith("=") ? 1 : 0);
  if (
    !url.startsWith(prefix) ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(bytes) ||
    bytes.length % 4 ||
    decodedSize !== manifest.size
  )
    throw new Error("The saved logo is damaged. Upload it again.");
  return url;
}
