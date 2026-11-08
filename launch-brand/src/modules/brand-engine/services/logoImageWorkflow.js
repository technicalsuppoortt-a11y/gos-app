import { generateLogoImage } from './logoImageProvider.js';
import { buildLogoImagePrompt, logoImagePromptVersion } from './logoImagePrompt.js';
import { reviewBrandLogoQuality } from './logoQualityReview.js';

const prepareDefault = async dataUrl => (await import('./logoImageAssets.ts')).prepareGeneratedLogoImage(dataUrl);
const persistDefault = async (file, identity) => (await import('./logoImageAssets.ts')).persistGeneratedLogoImage(file, identity);
const loadPreviousDefault = async identity => (await import('./brandLogo.ts')).resolveBrandLogoImage(identity);

// One native image per request result. A rejected design can be refined once;
// incomplete reviews retry the review itself and never regenerate the artwork.
export async function generateRasterLogo({
  uid, requestId, brief, answers, imageConnection, reviewConnection, referenceParts = [], previousSuggestions = [],
  progress = async () => {}, generate = generateLogoImage, review = reviewBrandLogoQuality,
  generateReview, prepareImage = prepareDefault, persistImage = persistDefault, loadPreviousImage = loadPreviousDefault,
}) {
  const previousImages = await Promise.allSettled(previousSuggestions.filter(candidate => candidate.logo?.image?.ownerUid === uid).slice(-2).map(async candidate => {
    const dataUrl = await loadPreviousImage({ ...candidate, name: brief.name });
    const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl || '');
    return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
  }));
  const previousParts = previousImages.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []);
  const boardImages = referenceParts.filter(part => part.inlineData).slice(0, 1);
  const imageReferences = [
    ...(boardImages.length ? [{ text: 'CRAFT REFERENCE ONLY. Match finish and balance, invent a new identity rather than copying this board.' }, ...boardImages] : []),
    ...(previousParts.length ? [{ text: 'PREVIOUS OUTPUTS FOR THIS BRAND. Create a visibly different concept and silhouette; do not repeat or slightly rotate these designs.' }, ...previousParts] : []),
  ];
  let reviewFeedback = '';
  let fallbackImage;
  for (let attempt = 0; attempt < 2; attempt++) {
    await progress('generating');
    let generated, recovered = false;
    try {
      generated = await generate(imageConnection, {
        prompt: buildLogoImagePrompt({ brief, answers, previousSuggestions, reviewFeedback }),
        referenceParts: imageReferences,
        aspectRatio: '16:9',
      });
    } catch (error) {
      if (fallbackImage) { generated = fallbackImage; recovered = true; }
      else {
        if (error.diagnostic === 'provider-model') throw Object.assign(error, { diagnostic: 'brand-logo-image-model' });
        throw error;
      }
    }
    await progress('validating');
    const prepared = await prepareImage(generated.dataUrl);
    const font = brief.language === 'Arabic' ? brief.theme.typography.arabic : brief.theme.typography.heading;
    const identity = {
      id: `${requestId}-0`, name: brief.name, tagline: brief.tagline || '', palette: brief.theme.paletteId || 'custom',
      typography: font, mark: 'prism', vibe: 'AI IMAGE',
      logo: {
        concept: `${answers.preference || 'Original'} identity for ${brief.name}`.slice(0, 160),
        paths: [], wordmark: { font, weight: 700, letterSpacing: 0, casing: 'original', separator: false, descriptor: '' },
        image: { assetId: '', ownerUid: uid, contentType: prepared.file.type || generated.contentType, model: generated.model,
          width: prepared.width, height: prepared.height, dataUrl: prepared.dataUrl || generated.dataUrl },
      },
    };
    await progress('design-review');
    let qualityStatus = recovered ? 'rejected' : 'approved';
    try {
      if (!recovered) await review({ connection: reviewConnection, brief, answers, identities: [identity], referenceParts, previousParts, generate: generateReview });
    } catch (error) {
      if (attempt === 0 && error.diagnostic === 'brand-weak-logo') {
        reviewFeedback = String(error.message).slice(0, 1600);
        fallbackImage = generated;
        continue;
      }
      // Preserve real artwork when an advisory review fails. Never label it approved
      // or spend a credit; the user can inspect and download the saved design.
      qualityStatus = error.diagnostic === 'brand-weak-logo' ? 'rejected' : 'pending';
    }
    // Save only a small immutable reference in jobs and page drafts, never PNG bytes.
    await progress('saving');
    let image;
    for (let saveAttempt = 0; saveAttempt < 3; saveAttempt++) {
      try { image = await persistImage(prepared.file, identity); break; }
      catch (error) {
        const transient = /unavailable|deadline-exceeded|network-request-failed/.test(error.code || '') || /timed? out|took too long|network/i.test(error.message || '');
        if (!transient || saveAttempt === 2) throw Object.assign(error, { diagnostic: error.diagnostic || 'brand-logo-image-save' });
      }
    }
    return {
      qualityStatus,
      suggestions: [{ id: identity.id, rationale: identity.logo.concept, mark: identity.mark, qualityStatus,
        logo: { ...identity.logo, image } }],
      model: generated.model, provider: 'gemini', imagePromptVersion: logoImagePromptVersion,
    };
  }
}
