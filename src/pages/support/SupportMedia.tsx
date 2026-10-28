import { useEffect, useRef, useState } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';
import { Download, FileText, Pause, Play, ExternalLink } from 'lucide-react';
import { storage } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';
import { SupportDialog } from './SupportDialog';
import { formatDuration, type Attachment } from './support-model';

export function VoicePlayer({ url, file }: { url: string; file: Attachment }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false), [position, setPosition] = useState(0), [duration, setDuration] = useState(file.duration ?? 0), [error, setError] = useState('');
  const ar = useUILanguage().startsWith('ar');
  useEffect(() => { const element = audio.current; return () => element?.pause(); }, [url]);
  function seek(value: number) { if (audio.current) { audio.current.currentTime = value; setPosition(value); } }
  return <div className="support-voice"><audio ref={audio} src={url} preload="metadata" onLoadedMetadata={() => { if (audio.current && Number.isFinite(audio.current.duration)) setDuration(audio.current.duration); }} onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPosition(0); }} onError={() => setError(ar ? 'تعذر تشغيل الملف الصوتي' : 'Audio could not be played')}/><button type="button" aria-label={ar ? (playing ? 'إيقاف مؤقت' : 'تشغيل التسجيل') : (playing ? 'Pause voice message' : 'Play voice message')} onClick={() => { if (playing) audio.current?.pause(); else void audio.current?.play().catch(() => setError(ar ? 'تعذر تشغيل الملف الصوتي' : 'Audio could not be played')); }}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button><div className="support-voice-track"><div className="support-wave" aria-hidden="true">{file.waveform?.length ? file.waveform.map((level, i) => <i key={i} style={{ height: `${Math.max(8, level * 100)}%` }} className={duration && i / file.waveform!.length <= position / duration ? 'played' : ''}/>) : <span className="support-voice-line" style={{ backgroundSize: `${duration ? position / duration * 100 : 0}% 100%` }}/>}</div><input type="range" min={0} max={Math.max(duration, 1)} step="0.1" value={Math.min(position, duration || 1)} onChange={e => seek(Number(e.target.value))} aria-label={ar ? 'تقديم التسجيل الصوتي' : 'Seek voice message'}/><small>{formatDuration(position)} / {formatDuration(duration)}</small></div>{error && <span role="alert">{error}</span>}</div>;
}

export function SupportMedia({ file }: { file: Attachment }) {
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [preview, setPreview] = useState(false);
  const ar = useUILanguage().startsWith('ar');
  useEffect(() => { let active = true; setUrl(''); setError(''); void getDownloadURL(ref(storage, file.path)).then(url => { if (active) setUrl(url); }).catch(() => { if (active) setError(ar ? 'الملف غير متاح' : 'File unavailable'); }); return () => { active = false; }; }, [file.path, ar]);
  async function download() {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error();
      const blobUrl = URL.createObjectURL(await response.blob()), link = document.createElement('a');
      link.href = blobUrl; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch { setError(ar ? 'استخدم فتح الملف لتنزيله مباشرة.' : 'Use Open file to download directly.'); }
  }
  return <div className="support-attachment">{url && file.type.startsWith('audio/') ? <VoicePlayer url={url} file={file}/> : url && file.type.startsWith('image/') ? <button className="support-image-preview" onClick={() => setPreview(true)} aria-label={`${ar ? 'معاينة' : 'Preview'} ${file.name}`}><img src={url} alt={file.name} loading="lazy"/></button> : <div className="support-file-label"><FileText size={22}/><span>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></span></div>}<div className="support-file-actions">{url && <><button type="button" onClick={() => void download()} aria-label={`${ar ? 'تنزيل' : 'Download'} ${file.name}`}><Download size={14}/>{ar ? 'تنزيل' : 'Download'}</button>{file.type === 'application/pdf' && <button type="button" onClick={() => setPreview(true)}>{ar ? 'معاينة PDF' : 'Preview PDF'}</button>}<a href={url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>{ar ? 'فتح الملف' : 'Open file'}</a></>}{!url && !error && <small role="status">{ar ? 'جار تحميل الملف…' : 'Loading attachment…'}</small>}</div>{error && <small role="status">{error}</small>}{preview && <SupportDialog title={file.name} className="support-file-dialog" onClose={() => setPreview(false)}>{file.type.startsWith('image/') ? <img className="support-full-image" src={url} alt={file.name}/> : <iframe src={url} title={file.name}/>}<a href={url} target="_blank" rel="noreferrer">{ar ? 'فتح الملف' : 'Open file'}</a></SupportDialog>}</div>;
}
