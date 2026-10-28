import type { Timestamp } from 'firebase/firestore';
export type Contact = { id: string; name: string; role: string };
export type Attachment = { path: string; name: string; size: number; type: string; duration?: number; waveform?: number[] };
export type Message = { id: string; authorId: string; authorName: string; text: string; files: Attachment[]; createdAt: Timestamp | null; editedAt?: Timestamp; deleted: boolean; hiddenFor?: string[]; reactions?: Record<string, string>; forwarded?: { authorName: string }; replyContext?: { id: string; text: string; authorName: string } };
export type Room = { id: string; lastMessage: string; lastMessageId?: string; lastAuthorId?: string; hiddenPreviewFor?: string[]; updatedAt?: Timestamp; readAt?: Record<string, Timestamp> };
export const roomKey = (a: string, b: string) => [a, b].sort().map(id => encodeURIComponent(id).replaceAll('~', '%7E')).join('~');
export const roleLabel = (role: string, ar = false) => ar ? ({ USER: 'مستخدم', ADMIN: 'مسؤول', SUPER_ADMIN: 'المسؤول الأعلى' }[role] ?? role) : role.replaceAll('_', ' ');
export const formatDuration = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;
export async function inspectAudio(blob: Blob): Promise<Pick<Attachment, 'duration' | 'waveform'>> {
  if (!blob.type.startsWith('audio/') || !window.AudioContext) return {};
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = buffer.getChannelData(0), bins = 40, size = Math.max(1, Math.floor(samples.length / bins));
    const levels = Array.from({ length: bins }, (_, i) => {
      let peak = 0;
      for (let j = i * size; j < Math.min(samples.length, (i + 1) * size); j += 8) peak = Math.max(peak, Math.abs(samples[j]));
      return peak;
    });
    const max = Math.max(.01, ...levels);
    return { duration: buffer.duration, waveform: levels.map(n => Math.min(1, n / max)) };
  } catch { return {}; } finally { await context.close(); }
}
