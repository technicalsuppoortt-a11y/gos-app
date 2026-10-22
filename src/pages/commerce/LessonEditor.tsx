import { useEffect, useRef, useState } from 'react';
import type { Lesson } from './model';
import { Dialog, Field, Select } from './primitives';
import { uploadDigitalFile, MAX_DIGITAL_FILE_SIZE } from './files';
import { driveId, durationLabel, probeVideo, sizeLabel, videoEmbedUrl, youtubeId } from './mediaMetadata';
import { YouTubeMetadataPreview } from './YouTubeMetadataPreview';
import { translateText, useUILanguage } from '../../i18n/display';
import './digital-editor.css';
import './authoring-controls.css';

type Source = NonNullable<Lesson['videoSource']>;
export function LessonEditor({ lesson, title, onChange, onSave, onClose, busy }: { lesson: Lesson; title: string; onChange: (next: Lesson | ((current: Lesson) => Lesson)) => void; onSave: () => void; onClose: () => void; busy: (value: boolean) => void }) {
  useUILanguage();
  const [uploading, setUploading] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState(''), [attempted, setAttempted] = useState(false), [metadataNote, setMetadataNote] = useState('');
  const current = useRef(lesson), inFlight = useRef(false), fileRef = useRef<HTMLInputElement>(null);
  current.current = lesson;
  const source: Source = lesson.videoSource || (lesson.storageId ? 'Local Upload' : youtubeId(lesson.url) ? 'YouTube' : driveId(lesson.url) ? 'Google Drive' : 'External URL');
  function change(patch: Partial<Lesson>) { onChange(current => ({ ...current, ...patch })); }
  const titleError = attempted && !lesson.title.trim() ? 'Enter a lesson title.' : '';
  const validUrl = (() => { try { const url = new URL(lesson.url); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } })();
  const resourceError = attempted && (lesson.storageId?.startsWith('local-') || !lesson.storageId && !validUrl || lesson.kind === 'Video' && (source === 'YouTube' && !youtubeId(lesson.url) || source === 'Google Drive' && !driveId(lesson.url) || source === 'Local Upload' && !lesson.storageId)) ? 'Add a valid source URL or upload this lesson to cloud storage.' : '';
  useEffect(() => {
    if (lesson.kind !== 'Video' || !validUrl || youtubeId(lesson.url) || source === 'Local Upload') return;
    const controller = new AbortController(), url = lesson.url;
    const timer = setTimeout(() => {
      setMetadataNote('Reading video metadata…');
      const resource = driveId(url) ? `https://drive.google.com/uc?export=download&id=${driveId(url)}` : url;
      probeVideo(resource, controller.signal).then(seconds => {
        if (!controller.signal.aborted && current.current.url === url) { onChange(current => ({ ...current, duration: durationLabel(seconds), durationSeconds: seconds })); setMetadataNote('Duration detected automatically'); }
      }).catch(() => { if (!controller.signal.aborted) setMetadataNote('This provider does not expose video metadata. Check sharing permissions or upload the video to detect duration automatically.'); });
    }, 650);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [lesson.url, lesson.kind, source, validUrl]);
  useEffect(() => {
    if (!validUrl || lesson.kind === 'Video' || lesson.kind === 'Text' || lesson.size || driveId(lesson.url)) return;
    const controller = new AbortController(), url = lesson.url;
    const timeout = setTimeout(() => controller.abort(), 8000);
    const timer = setTimeout(() => {
      fetch(url, { method: 'HEAD', signal: controller.signal, credentials: 'omit' }).then(response => {
        const bytes = Number(response.headers.get('content-length'));
        if (response.ok && bytes > 0 && !response.headers.get('content-type')?.includes('text/html') && current.current.url === url && !controller.signal.aborted) {
          onChange(current => ({ ...current, size: bytes, duration: sizeLabel(bytes) })); setMetadataNote('File size detected automatically');
        }
      }).catch(() => { /* Some delivery providers do not expose metadata headers. */ });
    }, 650);
    return () => { clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [lesson.url, lesson.kind, lesson.size, validUrl]);
  async function attach(file?: File) {
    if (!file || inFlight.current) return;
    if (!/\.(pdf|mp4|webm|mov|zip)$/i.test(file.name) || !file.size || file.size > MAX_DIGITAL_FILE_SIZE) { setError('Choose a non-empty PDF, video or ZIP file up to 100 MB.'); return; }
    inFlight.current = true; setUploading(true); setError(''); setProgress(0); busy(true);
    try {
      const video = /\.(mp4|webm|mov)$/i.test(file.name);
      const metadata = video ? probeVideo(file).catch(() => 0) : Promise.resolve(0);
      const asset = await uploadDigitalFile(file, setProgress), seconds = await metadata;
      onChange(current => ({ ...current, url: asset.url, storageId: asset.storageId, fileName: file.name, size: file.size, mime: file.type, kind: video ? 'Video' : /\.pdf$/i.test(file.name) ? 'PDF' : 'File', title: current.title.trim() ? current.title : file.name.replace(/\.[^.]+$/, ''), videoSource: video ? 'Local Upload' : undefined, durationSeconds: seconds || undefined, duration: video ? durationLabel(seconds) || current.duration : sizeLabel(file.size) }));
      setMetadataNote(video && !seconds ? 'Video uploaded. This file does not expose duration metadata; you may enter a duration manually.' : 'File metadata detected automatically');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cloud upload failed. Please try again.'); }
    finally { inFlight.current = false; setUploading(false); busy(false); }
  }
  function submit(event: React.FormEvent) {
    event.preventDefault(); setAttempted(true);
    if (uploading || error) return;
    if (!lesson.title.trim() || lesson.storageId?.startsWith('local-') || !lesson.storageId && !validUrl || lesson.kind === 'Video' && (source === 'YouTube' && !youtubeId(lesson.url) || source === 'Google Drive' && !driveId(lesson.url) || source === 'Local Upload' && !lesson.storageId)) { requestAnimationFrame(() => document.querySelector<HTMLElement>('.lesson-editor [aria-invalid=true]')?.focus()); return; }
    onSave();
  }
  return <Dialog title={title} onClose={() => { if (!uploading) onClose(); }}><form className="lesson-editor" noValidate onSubmit={submit}>
    <Field label="Lesson Title *" error={titleError}><input disabled={uploading} value={lesson.title} maxLength={180} onChange={event => change({ title: event.target.value })}/></Field>
    <div className="cw-form-grid"><Field label="Format *"><Select label="Lesson format" disabled={uploading} value={lesson.kind} options={['Video', 'PDF', 'Text', 'File']} onChange={kind => change({ kind: kind as Lesson['kind'] })}/></Field><Field label={lesson.kind === 'PDF' || lesson.kind === 'File' ? 'File size' : 'Duration'} hint="Detected automatically when available."><input aria-label={translateText(lesson.kind === 'PDF' || lesson.kind === 'File' ? 'File size' : 'Duration')} readOnly={!!lesson.size && lesson.kind !== 'Video'} value={lesson.duration} placeholder={lesson.kind === 'PDF' || lesson.kind === 'File' ? 'Detected on upload' : '08:24'} onChange={event => change({ duration: event.target.value, durationSeconds: undefined })}/></Field></div>
    {lesson.kind === 'Video' && <Field label="Video source *"><Select label="Video source" disabled={uploading} value={source === 'Local Upload' ? 'Local Video Upload' : source} options={['YouTube', 'Google Drive', 'Local Video Upload', 'External URL']} onChange={videoSource => { setError(''); setMetadataNote(''); change({ videoSource: videoSource === 'Local Video Upload' ? 'Local Upload' : videoSource as Source }); }}/></Field>}
    {(lesson.kind !== 'Video' || source !== 'Local Upload') && <Field label="Resource URL *" error={resourceError}><input disabled={uploading} type="url" value={lesson.url} placeholder={source === 'YouTube' ? 'https://www.youtube.com/watch?v=...' : source === 'Google Drive' ? 'https://drive.google.com/file/d/.../view' : 'https://'} onChange={event => { setError(''); setMetadataNote(''); change({ url: event.target.value, storageId: undefined, fileName: undefined, size: undefined, duration: '', durationSeconds: undefined, videoSource: youtubeId(event.target.value) ? 'YouTube' : driveId(event.target.value) ? 'Google Drive' : lesson.videoSource }); }}/></Field>}
    {lesson.kind === 'Video' && youtubeId(lesson.url) && source === 'YouTube' && <YouTubeMetadataPreview videoId={youtubeId(lesson.url)} onDuration={seconds => { const url = lesson.url; onChange(current => current.url === url ? { ...current, duration: durationLabel(seconds), durationSeconds: seconds } : current); }}/>} 
    {lesson.kind === 'Video' && source === 'Google Drive' && driveId(lesson.url) && <div className="lesson-media-preview"><iframe title={translateText('Google Drive lesson preview')} src={videoEmbedUrl(lesson.url)} allow="fullscreen" allowFullScreen/><small>{translateText('Make sure enrolled students have access to this Drive file.')}</small></div>}
    <div className={resourceError && source === 'Local Upload' ? 'dv-invalid' : ''}><span className="tw-field-heading">{translateText('Attach PDF / Video / ZIP')} {source === 'Local Upload' && <span className="dv-required text-red-500">*</span>}</span><div className="lesson-cloud-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void attach(event.dataTransfer.files[0]); }}><input ref={fileRef} aria-label={translateText('Attach PDF / Video / ZIP')} type="file" accept=".pdf,.mp4,.webm,.mov,.zip" disabled={uploading} onChange={event => { void attach(event.target.files?.[0]); event.target.value = ''; }}/><small>{lesson.fileName || translateText('Drop a file here or choose a file · Max 100 MB')}</small>{uploading && <><span role="status">{translateText('Uploading file…')} {progress}%</span><progress max={100} value={progress}/></>}</div>{resourceError && source === 'Local Upload' && <p className="dv-error">{translateText(resourceError)}</p>}</div>
    {metadataNote && <small className="lesson-metadata-note" role="status">{translateText(metadataNote)}</small>}{error && <p className="dv-error" role="alert">{translateText(error)}</p>}
    <div className="course-modal-actions"><button type="button" disabled={uploading} className="cw-button" onClick={onClose}>{translateText('Cancel')}</button><button className="cw-button primary" type="submit" disabled={uploading}>{translateText(uploading ? 'Uploading…' : 'Save Lesson')}</button></div>
  </form></Dialog>;
}
