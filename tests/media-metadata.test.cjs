const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const context = { exports: {}, URL };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/pages/commerce/mediaMetadata.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const media = context.exports;
test('YouTube and Drive source normalization supports share/embed URLs and rejects spoofed hosts', () => {
  for (const url of ['https://youtu.be/M7lc1UVf-VE', 'https://www.youtube.com/watch?v=M7lc1UVf-VE&t=10', 'https://www.youtube.com/shorts/M7lc1UVf-VE', 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE']) assert.equal(media.youtubeId(url), 'M7lc1UVf-VE');
  assert.equal(media.youtubeId('https://evil.example/youtube.com/watch?v=M7lc1UVf-VE'), '');
  assert.equal(media.driveId('https://drive.google.com/file/d/file-id/view'), 'file-id');
  assert.equal(media.videoEmbedUrl('https://drive.google.com/open?id=file-id'), 'https://drive.google.com/file/d/file-id/preview');
  assert.equal(media.videoEmbedUrl('https://drive.google.com.evil.test/file/d/private/view'), '');
});
test('detected durations and file sizes produce readable metadata without inventing values', () => {
  assert.equal(media.durationLabel(98.5), '01:39'); assert.equal(media.durationLabel(3661), '1:01:01');
  assert.equal(media.durationLabel(Infinity), ''); assert.equal(media.durationLabel(0), '');
  assert.equal(media.sizeLabel(50), '50 B'); assert.equal(media.sizeLabel(2048), '2.0 KB'); assert.equal(media.sizeLabel(2097152), '2.0 MB');
});
