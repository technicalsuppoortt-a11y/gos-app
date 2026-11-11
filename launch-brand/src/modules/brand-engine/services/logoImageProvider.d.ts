export const logoImageModel: 'gemini-2.5-flash-image';
export const openAILogoImageModels: readonly ['gpt-image-1.5', 'gpt-image-1', 'dall-e-3'];
export function logoImageModelFor(provider: string): string;
export type LogoImageContentType = 'image/png' | 'image/jpeg' | 'image/webp';
export type LogoImageReferencePart = { text: string } | { inlineData: { mimeType: string; data: string } };
export type LogoImageConnection = {
  provider: string;
  apiKey: string;
  model?: string;
  request?: (url: string, init: RequestInit, fetcher: typeof fetch,
    request: (url: string, init: RequestInit, fetcher?: typeof fetch) => Promise<Record<string, unknown>>) => Promise<Record<string, unknown>>;
};
export function generateLogoImage(connection: LogoImageConnection, options: {
  prompt: string;
  referenceParts?: LogoImageReferencePart[];
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
}, fetcher?: typeof fetch): Promise<{
  dataUrl: string;
  contentType: LogoImageContentType;
  model: string;
  text: string;
  usage: Record<string, unknown>;
}>;
