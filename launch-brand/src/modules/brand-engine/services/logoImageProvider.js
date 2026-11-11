import { aiFailure } from './directProvider.js';

export const logoImageModel = 'gemini-2.5-flash-image';
// OpenAI image models, best first. Later ones are used only when the key's
// project cannot use an earlier one (for example before organization verification).
export const openAILogoImageModels = ['gpt-image-1.5', 'gpt-image-1', 'dall-e-3'];
export const logoImageModelFor = provider => provider === 'openai' ? openAILogoImageModels[0] : logoImageModel;
const maxImageBytes = 5 * 1024 * 1024;
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const aspectRatios = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']);
const failure = (code, diagnostic) => Object.assign(aiFailure(code, 'Logo image generation could not complete.'), { diagnostic });

function imageData(value, diagnostic) {
  const contentType = value?.mimeType || value?.mime_type;
  if (!imageTypes.has(contentType) || typeof value?.data !== 'string' ||
      value.data.length > Math.ceil(maxImageBytes / 3) * 4 + 1024)
    throw failure('failed-precondition', diagnostic);
  const data = value.data.replace(/\s/g, '');
  if (!data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data))
    throw failure('failed-precondition', diagnostic);
  const bytes = data.length / 4 * 3 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  if (bytes <= 0 || bytes > maxImageBytes) throw failure('failed-precondition', diagnostic);
  let signature;
  try { signature = atob(data.slice(0, 24)); }
  catch { throw failure('failed-precondition', diagnostic); }
  const valid = contentType === 'image/png' ? signature.startsWith('\x89PNG\r\n\x1a\n')
    : contentType === 'image/jpeg' ? signature.startsWith('\xff\xd8\xff')
    : signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP';
  if (!valid) throw failure('failed-precondition', diagnostic);
  return { contentType, data };
}

async function imageRequest(url, init, fetcher = fetch) {
  let response;
  // An overloaded model (500/502/503/504) produced no image, so it is safe to ask again.
  for (let attempt = 0; ; attempt++) {
    try { response = await fetcher(url, { ...init, signal: AbortSignal.timeout(120000) }); }
    catch (error) { throw failure('unavailable', ['TimeoutError', 'AbortError'].includes(error?.name) ? 'provider-timeout' : 'provider-network'); }
    if (![500, 502, 503, 504].includes(response.status) || attempt >= 2) break;
    await new Promise(resolve => setTimeout(resolve, attempt ? 4000 : 1500));
  }
  if (!response.ok) {
    const body = typeof response.json === 'function' ? await response.json().catch(() => ({})) : {};
    const reasons = (body.error?.details || []).map(item => item.reason);
    const message = String(body.error?.message || '');
    const diagnostic = response.status === 429 ? 'provider-quota'
      : response.status === 401 || reasons.includes('API_KEY_INVALID') || /API key not valid|API key expired/i.test(message) ? 'provider-key'
      : reasons.some(reason => ['API_KEY_SERVICE_BLOCKED', 'API_KEY_HTTP_REFERRER_BLOCKED', 'SERVICE_DISABLED'].includes(reason)) ? 'provider-restriction'
      : response.status === 403 ? 'provider-permission'
      : response.status === 404 ? 'provider-model'
      : response.status === 400 ? 'provider-request' : 'provider-unavailable';
    throw failure(response.status === 429 ? 'resource-exhausted' : [400, 401, 403, 404].includes(response.status) ? 'failed-precondition' : 'unavailable', diagnostic);
  }
  try { return await response.json(); }
  catch (error) { throw failure('unavailable', ['TimeoutError', 'AbortError'].includes(error?.name) ? 'provider-timeout' : 'provider-invalid-response'); }
}

// Native image generation is separate from the configured text model. The
// connection still supplies the platform credential and tracked request wrapper.
const openAISizes = { wide: ['1536x1024', '1792x1024'], tall: ['1024x1536', '1024x1792'], square: ['1024x1024', '1024x1024'] };
function openAISize(aspectRatio, legacy) {
  const [w, h] = aspectRatio.split(':').map(Number);
  const shape = w > h ? 'wide' : w < h ? 'tall' : 'square';
  return openAISizes[shape][legacy ? 1 : 0];
}

// OpenAI: the same one-logo contract, through the Images API. Reference images
// cannot be sent to the generation endpoint, so their written guidance is kept.
async function generateOpenAILogoImage(connection, { prompt, referenceParts, aspectRatio }, fetcher) {
  const guidance = referenceParts.filter(part => typeof part?.text === 'string').map(part => part.text).join('\n');
  const brief = `Create exactly ONE finished, professional brand logo image from this design brief. Clean vector-style artwork, crisp edges, balanced negative space, no mockups, no photos, no grids, no alternatives, no watermark.\n\n${guidance ? guidance + '\n\n' : ''}${prompt.trim()}`;
  let lastError;
  for (const model of openAILogoImageModels) {
    const legacy = model === 'dall-e-3';
    const body = legacy
      ? { model, prompt: brief.slice(0, 3900), n: 1, size: openAISize(aspectRatio, true), quality: 'hd', style: 'natural', response_format: 'b64_json' }
      : { model, prompt: brief.slice(0, 30000), n: 1, size: openAISize(aspectRatio, false), quality: 'high', output_format: 'png' };
    const url = 'https://api.openai.com/v1/images/generations';
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.apiKey.trim()}` }, body: JSON.stringify(body) };
    let result;
    try {
      result = connection.request ? await connection.request(url, init, fetcher, imageRequest) : await imageRequest(url, init, fetcher);
    } catch (error) {
      lastError = error;
      // Only "this model is not available to this key" moves on to the next model;
      // anything else (quota, safety, timeouts) is reported as it is.
      if (['provider-model', 'provider-permission', 'provider-request'].includes(error?.diagnostic) && model !== openAILogoImageModels.at(-1)) continue;
      throw error;
    }
    const images = (result.data || []).filter(item => typeof item?.b64_json === 'string');
    if (!images.length) throw failure('unavailable', 'provider-empty');
    if (images.length !== 1) throw failure('failed-precondition', 'brand-logo-image-count');
    const image = imageData({ mimeType: 'image/png', data: images[0].b64_json }, 'brand-invalid-logo-image');
    return {
      dataUrl: `data:${image.contentType};base64,${image.data}`,
      contentType: image.contentType,
      model,
      text: String(images[0].revised_prompt || '').slice(0, 4000),
      usage: result.usage || {},
    };
  }
  throw lastError || failure('failed-precondition', 'provider-model');
}

export async function generateLogoImage(connection, { prompt, referenceParts = [], aspectRatio = '1:1' }, fetcher = fetch) {
  if (!['gemini', 'openai'].includes(connection?.provider)) throw failure('failed-precondition', 'provider-use-gemini');
  if (typeof connection.apiKey !== 'string' || !connection.apiKey.trim() || ['\r', '\n', '\0'].some(character => connection.apiKey.includes(character)))
    throw failure('invalid-argument', 'provider-key');
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 80000 || !aspectRatios.has(aspectRatio) || !Array.isArray(referenceParts))
    throw aiFailure('invalid-argument', 'Invalid logo image design brief.');
  let referenceImages = 0;
  const references = referenceParts.map(part => {
    if (part?.inlineData) {
      referenceImages++;
      const value = imageData(part.inlineData, 'brand-logo-image-reference');
      return { inlineData: { mimeType: value.contentType, data: value.data } };
    }
    if (typeof part?.text === 'string' && part.text.length <= 8000) return { text: part.text };
    throw aiFailure('invalid-argument', 'Invalid logo image reference.');
  });
  if (referenceImages > 3 || references.length > 12) throw aiFailure('invalid-argument', 'Use at most three logo reference images.');
  if (connection.provider === 'openai') return generateOpenAILogoImage(connection, { prompt, referenceParts: references, aspectRatio }, fetcher);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${logoImageModel}:generateContent`;
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': connection.apiKey.trim() },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [...references, { text: `Create exactly ONE finished logo image from this design brief. Return the actual image, not JSON, SVG code, a grid, alternatives, or a mockup.\n\n${prompt.trim()}` }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio } },
    }),
  };
  // Never retry inference here: a timed-out image request may already be billed.
  const result = connection.request ? await connection.request(url, init, fetcher, imageRequest) : await imageRequest(url, init, fetcher);
  const candidate = result.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') throw failure('unavailable', 'provider-output-limit');
  const blocked = result.promptFeedback?.blockReason ||
    ['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT'].includes(candidate?.finishReason) ||
    candidate?.safetyRatings?.some(rating => rating.blocked);
  if (blocked) throw failure('failed-precondition', 'provider-blocked');
  const parts = (candidate?.content?.parts || []).filter(part => !part.thought);
  const images = parts.flatMap(part => part.inlineData || part.inline_data ? [part.inlineData || part.inline_data] : []);
  if (!images.length) throw failure('unavailable', 'provider-empty');
  if (images.length !== 1) throw failure('failed-precondition', 'brand-logo-image-count');
  const image = imageData(images[0], 'brand-invalid-logo-image');
  return {
    dataUrl: `data:${image.contentType};base64,${image.data}`,
    contentType: image.contentType,
    model: logoImageModel,
    text: parts.filter(part => typeof part.text === 'string').map(part => part.text).join('\n').trim().slice(0, 4000),
    usage: result.usageMetadata || {},
  };
}
