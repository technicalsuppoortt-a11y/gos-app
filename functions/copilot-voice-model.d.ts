export type VoiceExtraction = {
  summary: string;
  intent: string | null;
  clientDetails: { label: string; value: string }[];
  parameters: { label: string; value: string }[];
  actionItems: { task: string; owner: string | null; due: string | null }[];
};
export type VoiceTurn = {
  user: { id: string; role: 'user'; text: string; transcript: string };
  assistant: { id: string; role: 'assistant'; text: string; voiceExtraction: VoiceExtraction | null };
};

export const MAX_VOICE_BYTES: number;
export const VOICE_FORMATS: Readonly<Record<string, string>>;
