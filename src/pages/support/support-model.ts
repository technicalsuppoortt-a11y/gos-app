import type { Timestamp } from 'firebase/firestore';
export type Contact = { id: string; name: string; role: string };
export type Attachment = { path: string; name: string; size: number; type: string; duration?: number; waveform?: number[] };
export type Message = { id: string; authorId: string; authorName: string; text: string; files: Attachment[]; createdAt: Timestamp | null; editedAt?: Timestamp; pinned?: boolean; deleted: boolean; hiddenFor?: string[]; reactions?: Record<string, string>; forwarded?: { authorName: string }; replyContext?: { id: string; text: string; authorName: string } };
export type Room = { id: string; lastMessage: string; lastMessageId?: string; lastAuthorId?: string; hiddenPreviewFor?: string[]; updatedAt?: Timestamp; readAt?: Record<string, Timestamp> };
export const roomKey = (a: string, b: string) => [a, b].sort().map(id => encodeURIComponent(id).replaceAll('~', '%7E')).join('~');
export const roleLabel = (role: string, ar = false) => ar ? ({ USER: 'مستخدم', ADMIN: 'مسؤول', SUPER_ADMIN: 'المسؤول الأعلى' }[role] ?? role) : role.replaceAll('_', ' ');
export const formatDuration = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;

export type SupportTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string; href: string };

const SUPPORT_URL_PATTERN =
  /((?:https?:\/\/|www\.)[^\s<]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|io|app|co|me|ai|edu|gov|eg|sa|ae|uk|dev|shop|store|online|site|xyz)(?:\/[^\s<]*)?)/gi;

function splitTrailingUrlPunctuation(raw: string): { clean: string; trailing: string } {
  let clean = raw;
  let trailing = '';
  while (clean.length > 0) {
    const last = clean[clean.length - 1];
    if (/[.,!?;:'"»›\]}]/.test(last)) {
      trailing = last + trailing;
      clean = clean.slice(0, -1);
      continue;
    }
    if (last === ')') {
      const opens = (clean.match(/\(/g) || []).length;
      const closes = (clean.match(/\)/g) || []).length;
      if (closes > opens) {
        trailing = last + trailing;
        clean = clean.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return { clean, trailing };
}

export function tokenizeSupportLinks(text: string): SupportTextSegment[] {
  if (!text) return [];
  const segments: SupportTextSegment[] = [];
  const pushText = (value: string) => {
    if (!value) return;
    const prev = segments[segments.length - 1];
    if (prev?.kind === 'text') prev.value += value;
    else segments.push({ kind: 'text', value });
  };

  let cursor = 0;
  SUPPORT_URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SUPPORT_URL_PATTERN.exec(text)) !== null) {
    const start = match.index;
    const rawMatch = match[0];
    const prevChar = start > 0 ? text[start - 1] : '';
    if (start > cursor) pushText(text.slice(cursor, start));

    if (prevChar && /[@/a-zA-Z0-9_]/.test(prevChar)) {
      pushText(rawMatch);
      cursor = start + rawMatch.length;
      continue;
    }

    const { clean, trailing } = splitTrailingUrlPunctuation(rawMatch);
    let safeHref = '';
    if (clean) {
      const candidate = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
      try {
        const parsed = new URL(candidate);
        if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.')) {
          safeHref = parsed.href;
        }
      } catch {
        safeHref = '';
      }
    }

    if (safeHref) {
      segments.push({ kind: 'link', value: clean, href: safeHref });
      if (trailing) pushText(trailing);
    } else {
      pushText(rawMatch);
    }
    cursor = start + rawMatch.length;
  }

  if (cursor < text.length) pushText(text.slice(cursor));
  return segments;
}

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
