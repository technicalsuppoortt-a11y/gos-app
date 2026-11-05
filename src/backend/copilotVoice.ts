import { callBackend } from './firebase';
import { MAX_VOICE_BYTES, VOICE_FORMATS } from '../../functions/copilot-voice-model.js';
import type { VoiceTurn } from '../../functions/copilot-voice-model.js';

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

export async function transcribeCopilotVoice(file: File, requestId: string) {
  return callBackend<{ transcript: string }>('transcribeCopilotVoice', { ...await encodeAudio(file), requestId }, 90_000);
}

export async function extractCopilotVoice(file: File, conversationId: string, requestId: string, focus: string) {
  if (focus.length > 2000) throw new Error('Keep your voice extraction request under 2,000 characters.');
  return callBackend<VoiceTurn>('extractCopilotVoice', { ...await encodeAudio(file), conversationId, requestId, focus }, 120_000);
}
