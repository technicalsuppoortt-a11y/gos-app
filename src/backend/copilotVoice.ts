import { callBackend } from './firebase';
import { gosApi, type CopilotForm, type CopilotHistoryMessage, type CopilotReplyStyle, type CopilotThinkingLevel } from './gosApi';
import { GosApiError, type GosStreamHandlers } from './gosTransport';
import { MAX_VOICE_BYTES, VOICE_FORMATS } from '../../functions/copilot-voice-model.js';
import type { VoiceTurn } from '../../functions/copilot-voice-model.js';

export type CopilotVoiceTurn = VoiceTurn & {
  form?: CopilotForm | null;
  draft?: Record<string, unknown> | null;
  leads?: unknown[] | null;
  href?: string | null;
  hrefLabel?: string | null;
  conversation?: Record<string, unknown> | null;
};

type GosVoiceApi = {
  transcribeCopilotAudio?: (body: { audio: string; format: string; language?: string }) => Promise<{ transcript: string }>;
  copilotVoice?: (body: {
    audio: string;
    format: string;
    conversationId?: string;
    requestId?: string;
    focus?: string;
    thinkingLevel?: CopilotThinkingLevel;
    replyStyle?: CopilotReplyStyle;
    useEmojis?: boolean;
    uiLanguage?: string;
    language?: string;
    isNewConversation?: boolean;
    history?: CopilotHistoryMessage[];
  }) => Promise<unknown>;
  copilotVoiceStream?: (
    body: {
      audio: string;
      format: string;
      conversationId?: string;
      requestId?: string;
      focus?: string;
      thinkingLevel?: CopilotThinkingLevel;
      uiLanguage?: string;
      language?: string;
      isNewConversation?: boolean;
      history?: CopilotHistoryMessage[];
    },
    handlers?: GosStreamHandlers,
  ) => Promise<unknown>;
};

export function audioFormat(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (Object.hasOwn(VOICE_FORMATS, extension)) return extension;
  const mime = file.type.split(';')[0].toLowerCase();
  return Object.keys(VOICE_FORMATS).find(format => VOICE_FORMATS[format] === mime);
}

async function encodeAudio(file: File) {
  const format = audioFormat(file);
  if (!format || !file.size || file.size > MAX_VOICE_BYTES) throw new Error('Choose a supported audio file up to 15 MB.');
  const audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject(new Error('Could not read this audio file.'));
    reader.onerror = () => reject(new Error('Could not read this audio file.'));
    reader.readAsDataURL(file);
  });
  return { audio, format };
}

function shouldFallbackToGosVoice(error: unknown): boolean {
  const code = String((error as { code?: string })?.code ?? '');
  const message = String((error as { message?: string })?.message ?? '');
  return (
    [
      'functions/not-found',
      'functions/failed-precondition',
      'functions/unavailable',
      'functions/internal',
      'functions/unimplemented',
    ].includes(code) ||
    /CORS|Failed to fetch|NetworkError|net::ERR|404|not exist|until an administrator configures/i.test(message)
  );
}

function shouldFallbackToCloudFunction(error: unknown): boolean {
  return error instanceof GosApiError && error.status === 404;
}

export async function transcribeCopilotVoice(
  file: File,
  requestId: string,
  optionsOrLanguage?: string | { api?: GosVoiceApi; language?: string },
) {
  const encoded = await encodeAudio(file);
  const language = typeof optionsOrLanguage === 'string' ? optionsOrLanguage : optionsOrLanguage?.language;
  const api = typeof optionsOrLanguage === 'object' && optionsOrLanguage && 'api' in optionsOrLanguage
    ? optionsOrLanguage.api
    : gosApi;

  if (typeof api?.transcribeCopilotAudio === 'function') {
    try {
      return await api.transcribeCopilotAudio({ ...encoded, ...(language ? { language } : {}) });
    } catch (error) {
      if (!shouldFallbackToCloudFunction(error)) throw error;
    }
  }

  try {
    return await callBackend<{ transcript: string }>('transcribeCopilotVoice', { ...encoded, requestId }, 90_000);
  } catch (error) {
    if (!shouldFallbackToGosVoice(error) || typeof gosApi?.transcribeCopilotAudio !== 'function') {
      throw error;
    }
    return gosApi.transcribeCopilotAudio({ ...encoded, ...(language ? { language } : {}) });
  }
}

export async function extractCopilotVoice(
  file: File,
  conversationId: string,
  requestId: string,
  focus: string,
  options?: {
    api?: GosVoiceApi;
    thinkingLevel?: CopilotThinkingLevel;
    replyStyle?: CopilotReplyStyle;
    useEmojis?: boolean;
    uiLanguage?: string;
    language?: string;
    isNewConversation?: boolean;
    history?: CopilotHistoryMessage[];
    streamHandlers?: GosStreamHandlers;
  },
): Promise<CopilotVoiceTurn> {
  if (focus.length > 2000) throw new Error('Keep your voice extraction request under 2,000 characters.');
  const encoded = await encodeAudio(file);
  const api = options && 'api' in options ? options.api : gosApi;
  const payload = {
    ...encoded,
    conversationId,
    requestId,
    focus,
    thinkingLevel: options?.thinkingLevel,
    replyStyle: options?.replyStyle,
    useEmojis: options?.useEmojis,
    uiLanguage: options?.uiLanguage,
    language: options?.language,
    isNewConversation: options?.isNewConversation,
    history: options?.history,
  };

  if (options?.streamHandlers && typeof api?.copilotVoiceStream === 'function') {
    try {
      return (await api.copilotVoiceStream(payload, options.streamHandlers)) as CopilotVoiceTurn;
    } catch (error) {
      if (!shouldFallbackToCloudFunction(error)) throw error;
    }
  }

  if (typeof api?.copilotVoice === 'function') {
    try {
      return (await api.copilotVoice(payload)) as CopilotVoiceTurn;
    } catch (error) {
      if (!shouldFallbackToCloudFunction(error)) throw error;
    }
  }

  try {
    return await callBackend<CopilotVoiceTurn>('extractCopilotVoice', { ...encoded, conversationId, requestId, focus }, 120_000);
  } catch (error) {
    if (!shouldFallbackToGosVoice(error) || typeof gosApi?.copilotVoice !== 'function') {
      throw error;
    }
    return (await gosApi.copilotVoice({
      ...encoded,
      conversationId,
      requestId,
      focus,
      thinkingLevel: options?.thinkingLevel,
      uiLanguage: options?.uiLanguage,
      language: options?.language,
    })) as CopilotVoiceTurn;
  }
}
