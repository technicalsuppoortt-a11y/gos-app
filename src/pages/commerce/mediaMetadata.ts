export function youtubeId(value: string) {
  try {
    const url = new URL(value), host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const id = host === 'youtu.be' ? url.pathname.split('/')[1] : ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host) ? url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] : '';
    return id && /^[\w-]{11}$/.test(id) ? id : '';
  } catch { return ''; }
}
export function driveId(value: string) {
  try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || !['drive.google.com', 'docs.google.com'].includes(url.hostname)) return ''; const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id'); return id && /^[\w-]+$/.test(id) ? id : ''; } catch { return ''; }
}
export function videoEmbedUrl(value: string) {
  const youtube = youtubeId(value), drive = driveId(value);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube}`;
  if (drive) return `https://drive.google.com/file/d/${drive}/preview`;
  try { const u = new URL(value); if (['vimeo.com', 'www.vimeo.com'].includes(u.hostname) && /^\/\d+$/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`; } catch { /* Direct media URL. */ }
  return '';
}
export function durationLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.round(seconds), hours = Math.floor(total / 3600), minutes = Math.floor(total / 60) % 60;
  return `${hours ? `${hours}:${String(minutes).padStart(2, '0')}` : String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
export function sizeLabel(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`; }
export function probeVideo(source: File | string, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video'), objectUrl = typeof source !== 'string' ? URL.createObjectURL(source) : '';
    let done = false;
    const clean = () => { clearTimeout(timeout); signal?.removeEventListener('abort', abort); video.onloadedmetadata = null; video.ondurationchange = null; video.onseeked = null; video.onerror = null; video.removeAttribute('src'); video.load(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    const finish = (seconds?: number) => { if (done) return; done = true; clean(); if (seconds && Number.isFinite(seconds)) resolve(seconds); else reject(new Error('Video metadata is unavailable.')); };
    const abort = () => finish();
    const timeout = setTimeout(() => finish(), 12000);
    video.preload = 'metadata'; video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) finish(video.duration);
      else { video.onseeked = () => finish(video.duration); video.ondurationchange = () => { if (Number.isFinite(video.duration) && video.duration > 0) finish(video.duration); }; try { video.currentTime = Number.MAX_SAFE_INTEGER; } catch { finish(); } }
    }; video.onerror = () => finish();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { finish(); return; }
    video.src = objectUrl || source as string;
  });
}
