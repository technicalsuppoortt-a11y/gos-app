import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLogoImage, logoImageModel, openAILogoImageModels } from '../launch-brand/src/modules/brand-engine/services/logoImageProvider.js';
import { buildLogoImagePrompt } from '../launch-brand/src/modules/brand-engine/services/logoImagePrompt.js';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const image = { mimeType: 'image/png', data: png };
const brief = {
  name: 'مدار', niche: 'Design', businessDescription: 'A creative brand studio',
  theme: { light: { primary: '#007D70', secondary: '#005EBB' }, typography: { arabic: 'Cairo' } },
};
const prompt = buildLogoImagePrompt({ brief, answers: { preference: 'Minimal', detail: 'No crowns' } });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('the logo brief carries the exact brand name, chosen colors, Arabic lettering and client exclusions', () => {
  for (const value of ['مدار', '#007D70', '#005EBB', 'connected letterforms', 'No crowns', 'pure white']) assert.ok(prompt.includes(value), value);
});

test('Gemini requests a real 2K logo image, preserves visual references and ignores thought images', async () => {
  let calls = 0;
  const result = await generateLogoImage({ provider: 'gemini', apiKey: 'test-gemini-key' }, {
    prompt, aspectRatio: '16:9', referenceParts: [{ text: 'Craft reference only' }, { inlineData: image }],
  }, async (url, init) => {
    calls++;
    assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${logoImageModel}:generateContent`);
    assert.equal(init.headers['x-goog-api-key'], 'test-gemini-key');
    const body = JSON.parse(init.body);
    assert.deepEqual(body.generationConfig, { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '16:9', imageSize: '2K' } });
    assert.deepEqual(body.contents[0].parts[1].inlineData, image);
    assert.ok(body.contents[0].parts.at(-1).text.includes(prompt));
    return response({ candidates: [{ content: { parts: [{ thought: true, inlineData: image }, { inlineData: image }] } }] });
  });
  assert.equal(calls, 1);
  assert.equal(result.dataUrl, `data:image/png;base64,${png}`);
  assert.equal(result.model, logoImageModel);
});

test('OpenAI uses high-quality image generation with the complete brand brief', async () => {
  const result = await generateLogoImage({ provider: 'openai', apiKey: 'test-openai-key' }, { prompt, aspectRatio: '16:9' }, async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/images/generations');
    assert.equal(init.headers.Authorization, 'Bearer test-openai-key');
    const body = JSON.parse(init.body);
    assert.equal(body.model, openAILogoImageModels[0]);
    assert.equal(body.quality, 'high');
    assert.equal(body.output_format, 'png');
    assert.equal(body.size, '1536x1024');
    assert.equal(body.n, 1);
    assert.ok(body.prompt.includes(prompt));
    return response({ data: [{ b64_json: png }] });
  });
  assert.equal(result.model, openAILogoImageModels[0]);
  assert.equal(result.dataUrl, `data:image/png;base64,${png}`);
});

test('OpenAI receives the actual reference board and previous logo images through image edits', async () => {
  await generateLogoImage({ provider: 'openai', apiKey: 'test-key' }, {
    prompt, referenceParts: [{ text: 'Invent a different silhouette' }, { inlineData: image }, { inlineData: image }],
  }, async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/images/edits');
    const body = JSON.parse(init.body);
    assert.deepEqual(body.images, [{ image_url: `data:image/png;base64,${png}` }, { image_url: `data:image/png;base64,${png}` }]);
    assert.ok(body.prompt.includes('Invent a different silhouette'));
    return response({ data: [{ b64_json: png }] });
  });
});

test('an unavailable OpenAI model falls back only to another native image model', async () => {
  const models = [];
  const result = await generateLogoImage({ provider: 'openai', apiKey: 'test-key' }, { prompt }, async (_url, init) => {
    models.push(JSON.parse(init.body).model);
    return models.length === 1 ? response({ error: { code: 'model_not_found', message: 'The model is not available' } }, 404) : response({ data: [{ b64_json: png }] });
  });
  assert.deepEqual(models, openAILogoImageModels);
  assert.equal(result.model, openAILogoImageModels[1]);
});

for (const [status, diagnostic] of [[400, 'provider-request'], [401, 'provider-key'], [403, 'provider-permission'], [429, 'provider-quota']]) {
  test(`OpenAI ${status} errors are reported without silently regenerating or using a text model`, async () => {
    let calls = 0;
    await assert.rejects(generateLogoImage({ provider: 'openai', apiKey: 'test-key' }, { prompt }, async () => {
      calls++;
      return response({ error: { message: 'Request failed' } }, status);
    }), { diagnostic });
    assert.equal(calls, 1);
  });
}

test('an uncertain network outcome is not automatically regenerated', async () => {
  let calls = 0;
  await assert.rejects(generateLogoImage({ provider: 'gemini', apiKey: 'test-key' }, { prompt }, async () => {
    calls++;
    throw Object.assign(new Error('Timeout'), { name: 'TimeoutError' });
  }), { diagnostic: 'provider-timeout' });
  assert.equal(calls, 1);
});

test('text-only Gemini responses cannot become fake logo images', async () => {
  await assert.rejects(generateLogoImage({ provider: 'gemini', apiKey: 'test-key' }, { prompt }, async () =>
    response({ candidates: [{ content: { parts: [{ text: '<svg><path d="M0 0"/></svg>' }] } }] })
  ), { diagnostic: 'provider-empty' });
});
