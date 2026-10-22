import { useEffect, useRef, useState } from 'react';
import { translateText } from '../../i18n/display';
type Player = { getDuration: () => number; destroy: () => void };
type YouTube = { Player: new (node: HTMLElement, options: Record<string, unknown>) => Player };
type YoutubeWindow = Window & { YT?: YouTube; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YouTube> | null = null;
function loadApi() {
  const target = window as YoutubeWindow;
  if (target.YT?.Player) return Promise.resolve(target.YT);
  if (!apiPromise) apiPromise = new Promise<YouTube>((resolve, reject) => {
    const prior = target.onYouTubeIframeAPIReady;
    const timer = setTimeout(() => { apiPromise = null; reject(new Error('YouTube metadata unavailable.')); }, 15000);
    target.onYouTubeIframeAPIReady = () => { prior?.(); clearTimeout(timer); if (target.YT) resolve(target.YT); };
    let script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (!script) { script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.async = true; document.head.append(script); }
    script.onerror = () => { clearTimeout(timer); apiPromise = null; script?.remove(); reject(new Error('YouTube metadata unavailable.')); };
  });
  return apiPromise;
}
export function YouTubeMetadataPreview({ videoId, onDuration }: { videoId: string; onDuration: (seconds: number) => void }) {
  const container = useRef<HTMLDivElement>(null), callback = useRef(onDuration);
  const [status, setStatus] = useState('Reading video duration…');
  callback.current = onDuration;
  useEffect(() => {
    let active = true, player: Player | undefined, interval: ReturnType<typeof setInterval> | undefined;
    setStatus('Reading video duration…');
    const timeout = setTimeout(() => { if (active) setStatus('Play the video to detect its duration, or enter it manually if embedding is restricted.'); if (interval) clearInterval(interval); }, 20000);
    const read = () => { if (!active || !player) return; const seconds = player.getDuration(); if (seconds > 0) { callback.current(seconds); setStatus('Duration detected automatically'); clearTimeout(timeout); if (interval) clearInterval(interval); } };
    loadApi().then(api => {
      if (!active || !container.current) return;
      const node = document.createElement('div'); container.current.replaceChildren(node);
      player = new api.Player(node, { host: 'https://www.youtube-nocookie.com', videoId, width: '100%', height: 230, playerVars: { origin: window.location.origin, playsinline: 1 }, events: { onReady: () => { read(); interval = setInterval(read, 500); }, onStateChange: read, onError: () => { if (active) setStatus('YouTube cannot expose metadata for this video. Check sharing and embedding permissions.'); } } });
    }).catch(() => { if (active) setStatus('YouTube metadata is unavailable. You can enter the duration manually.'); });
    return () => { active = false; clearTimeout(timeout); if (interval) clearInterval(interval); player?.destroy(); };
  }, [videoId]);
  return <div className="lesson-media-preview"><div ref={container}/><small role="status">{translateText(status)}</small></div>;
}
