import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadTsModule(relPath, replacements = []) {
  let source = fs.readFileSync(new URL(relPath, import.meta.url), 'utf8');
  for (const [target, replacement] of replacements) {
    source = source.replace(target, replacement);
  }
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('gosTransport preserves 422 field-level validation details on GosApiError', async () => {
  const { createGosTransport } = await loadTsModule('../src/backend/gosTransport.ts');
  const api = createGosTransport(
    'https://api.upklick.net',
    async () => 'token',
    async () =>
      Response.json(
        {
          success: false,
          error: {
            code: 'validation_failed',
            message: 'يرجى مراجعة الحقول المطلوبة.',
            details: { name: ['يرجى إدخال اسم العميل.'], email: ['البريد الإلكتروني غير صالح.'] },
          },
        },
        { status: 422 },
      ),
  );

  await assert.rejects(api('/ai/copilot/action', { method: 'POST', body: {} }), error => {
    assert.equal(error.status, 422);
    assert.equal(error.code, 'validation_failed');
    assert.deepEqual(error.details, {
      name: ['يرجى إدخال اسم العميل.'],
      email: ['البريد الإلكتروني غير صالح.'],
    });
    return true;
  });
});

test('gosToolPolicy maps all /ai/copilot endpoints to ai-copilot tool policy', async () => {
  const toolPolicySource = fs.readFileSync(new URL('../src/backend/gosToolPolicy.ts', import.meta.url), 'utf8');
  assert.match(toolPolicySource, /path\.startsWith\('\/ai\/copilot'\)\s*\?\s*'ai-copilot'/);
});

test('copilotVoice calls Laravel gosApi directly first and also falls back cleanly on functions/failed-precondition', async () => {
  const voiceCalls = [];
  const gosCalls = [];

  globalThis.__mockCallBackend = async (name, payload) => {
    voiceCalls.push({ name, payload });
    const err = new Error('Voice transcription is unavailable until an administrator configures the AI service.');
    err.code = 'functions/failed-precondition';
    throw err;
  };
  globalThis.__mockGosApi = {
    transcribeCopilotAudio: async payload => {
      gosCalls.push({ fn: 'transcribeCopilotAudio', payload });
      return { transcript: 'عاوز اضيف عميل اسمه سارة رقمها 01012345678' };
    },
    copilotVoice: async payload => {
      gosCalls.push({ fn: 'copilotVoice', payload });
      return {
        transcript: 'عاوز اضيف عميل اسمه سارة رقمها 01012345678',
        conversationId: payload.conversationId,
        user: { id: payload.requestId, role: 'user', text: payload.focus, transcript: 'عاوز اضيف عميل اسمه سارة رقمها 01012345678' },
        assistant: { id: 'a-1', role: 'assistant', text: 'جهزت لك فورم إضافة العميل.' },
        form: {
          id: 'form-1',
          kind: 'create_lead',
          status: 'pending',
          values: { name: 'سارة', phone: '01012345678' },
        },
      };
    },
  };
  globalThis.__mockGosApiError = class GosApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  };

  // Polyfill FileReader for Node environment
  globalThis.FileReader = class {
    readAsDataURL(blob) {
      blob.arrayBuffer().then(buf => {
        this.result = `data:${blob.type || 'audio/webm'};base64,${Buffer.from(buf).toString('base64')}`;
        this.onload?.();
      });
    }
  };

  const { transcribeCopilotVoice, extractCopilotVoice } = await loadTsModule('../src/backend/copilotVoice.ts', [
    ["import { callBackend } from './firebase';", 'const callBackend = globalThis.__mockCallBackend;'],
    [
      "import { gosApi, type CopilotForm, type CopilotHistoryMessage, type CopilotThinkingLevel } from './gosApi';",
      'const gosApi = globalThis.__mockGosApi; type CopilotForm = any; type CopilotHistoryMessage = any; type CopilotThinkingLevel = any;',
    ],
    [
      "import { GosApiError, type GosStreamHandlers } from './gosTransport';",
      'const GosApiError = globalThis.__mockGosApiError; type GosStreamHandlers = any;',
    ],
    [
      "import { MAX_VOICE_BYTES, VOICE_FORMATS } from '../../functions/copilot-voice-model.js';",
      "const MAX_VOICE_BYTES = 15 * 1024 * 1024; const VOICE_FORMATS = { webm: 'audio/webm', mp3: 'audio/mpeg', wav: 'audio/wav' };",
    ],
    ["import type { VoiceTurn } from '../../functions/copilot-voice-model.js';", 'type VoiceTurn = any;'],
  ]);

  const file = new File([Buffer.from('arabic voice sample')], 'voice.webm', { type: 'audio/webm' });

  // 1. Primary path: calls Laravel gosApi directly without touching Cloud Functions
  const tx = await transcribeCopilotVoice(file, 'req-1', { api: globalThis.__mockGosApi });
  assert.equal(tx.transcript, 'عاوز اضيف عميل اسمه سارة رقمها 01012345678');
  assert.equal(voiceCalls.length, 0);

  const turn = await extractCopilotVoice(file, 'conv-1', 'req-2', 'أضف العميل', {
    api: globalThis.__mockGosApi,
    thinkingLevel: 'medium',
    uiLanguage: 'ar',
  });
  assert.equal(turn.form.kind, 'create_lead');
  assert.equal(turn.form.values.name, 'سارة');
  assert.equal(voiceCalls.length, 0);
  assert.equal(gosCalls.length, 2);

  // 2. Fallback path: if api has no voice methods (e.g. legacy mock) and Cloud Function throws failed-precondition [400], falls back to gosApi
  const txFallback = await transcribeCopilotVoice(file, 'req-3', { api: {} });
  assert.equal(txFallback.transcript, 'عاوز اضيف عميل اسمه سارة رقمها 01012345678');
  assert.equal(voiceCalls.length, 1);
  assert.equal(gosCalls.length, 3);
});

test('createGosStreamTransport streams real-time SSE status, deltas, and final form payload across chunk boundaries', async () => {
  const { createGosStreamTransport } = await loadTsModule('../src/backend/gosTransport.ts');
  const encoder = new TextEncoder();
  const chunks = [
    ': padding\n\nevent: status\ndata: {"phase":"generating"}\n\n',
    'event: delta\ndata: {"delta":"أهلاً بك "}\n\nevent: del',
    'ta\ndata: {"delta":"يا محمد!"}\n\n',
    'event: done\ndata: {"conversationId":"c-1","text":"أهلاً بك يا محمد!","form":{"id":"f-1","kind":"create_lead","status":"pending","values":{"name":"أحمد"}}}\n\n',
  ];

  const streamApi = createGosStreamTransport(
    'http://ai-follow-up.test',
    async () => 'firebase-token',
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            for (const c of chunks) controller.enqueue(encoder.encode(c));
            controller.close();
          },
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      ),
  );

  const phases = [];
  let liveText = '';
  const done = await streamApi(
    '/ai/copilot/stream',
    { text: 'ازيك' },
    {
      onStatus: phase => phases.push(phase),
      onDelta: d => {
        liveText += d;
      },
    },
  );

  assert.deepEqual(phases, ['generating']);
  assert.equal(liveText, 'أهلاً بك يا محمد!');
  assert.equal(done.form.kind, 'create_lead');
  assert.equal(done.form.values.name, 'أحمد');
});

