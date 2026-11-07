import test from 'node:test';
import assert from 'node:assert/strict';
import { structureVoice, transcribeVoice, transcriptionMinutes, voiceAudio } from '../copilot-voice.js';

test('transcription bills started minutes from the audio bytes', async () => {
  const rate = 8000;
  const dataLength = rate * 2 * 61;
  const bytes = Buffer.alloc(44 + dataLength);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + dataLength, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(dataLength, 40);
  assert.equal(await transcriptionMinutes({ bytes, mime: 'audio/wav', format: 'wav' }), 2);
  await assert.rejects(transcriptionMinutes({ bytes: Buffer.from('invalid'), mime: 'audio/wav', format: 'wav' }), { code: 'invalid-argument' });
});

test('validates audio payloads before calling the provider and sends a supported multipart file', async () => {
  const source = { format: 'webm', audio: Buffer.from('example audio').toString('base64') };
  for (const bad of [{ ...source, format: '__proto__' }, { ...source, audio: source.audio + '$' }, { ...source, audio: '' }]) {
    assert.throws(() => voiceAudio(bad), { code: 'invalid-argument' });
  }
  const audio = voiceAudio(source);
  const transcript = await transcribeVoice(audio, 'test-key', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions');
    assert.equal(options.body.get('model'), 'gpt-transcribe');
    const file = options.body.get('file');
    assert.equal(file.name, 'voice.webm');
    assert.equal(file.type, 'audio/webm');
    assert.equal(await file.text(), 'example audio');
    return Response.json({ text: '   اتصل بسارة يوم الأحد.   ' });
  });
  assert.equal(transcript, 'اتصل بسارة يوم الأحد.');
  await assert.rejects(transcribeVoice(audio, 'test-key', async () => Response.json({ text: ' ' })), { code: 'invalid-argument' });
});

test('extracts a typed response with nullable fields and rejects incomplete model output', async () => {
  const extraction = { summary: 'Call Sara on Sunday.', intent: null, clientDetails: [{ label: 'Name', value: 'Sara' }], parameters: [], actionItems: [{ task: 'Call Sara', owner: null, due: 'Sunday' }] };
  const reply = (result, status = 'completed') => Response.json({ status, output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  const output = await structureVoice('Call Sara on Sunday.', 'Focus on dates', 'test-key', 'gpt-4o', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body);
    assert.equal(payload.store, false);
    assert.equal(payload.text.format.type, 'json_schema');
    assert.equal(payload.text.format.strict, true);
    assert.deepEqual(JSON.parse(payload.input), { transcript: 'Call Sara on Sunday.', focus: 'Focus on dates' });
    return reply(extraction);
  });
  assert.deepEqual(output.extraction, extraction);
  await assert.rejects(structureVoice('Hello', '', 'test-key', 'gpt-4o', async () => reply(extraction, 'incomplete')), /incomplete/);
  await assert.rejects(structureVoice('Hello', '', 'test-key', 'gpt-4o', async () => reply({ ...extraction, actionItems: [{}] })), /invalid data/);
});
