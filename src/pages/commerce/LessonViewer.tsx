import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useEffect, useState } from 'react';
import { Check, PlayCircle } from 'lucide-react';
import type { Lesson } from './model';
import { readStoredFile } from './files';
import { Dialog } from './primitives';
import { videoEmbedUrl } from './mediaMetadata';

export function LessonViewer({ lesson, completed, onComplete, onClose }: { lesson: Lesson; completed: boolean; onComplete: () => void; onClose: () => void }) {
  useUILanguage();
  const [source, setSource] = useState(lesson.url); const [error, setError] = useState('');
  useEffect(() => {
    let active = true, objectUrl = '';
    if (lesson.storageId && (!lesson.url || lesson.storageId.startsWith('local-'))) void readStoredFile(lesson.storageId).then(blob => { if (active) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); } }).catch(() => { if (active) setError('The uploaded lesson file is unavailable. Upload it again or add a resource URL.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [lesson.storageId]);
  const safe = /^(https?:|blob:)/i.test(source);
  const embed = videoEmbedUrl(source);
  return <Dialog title={translateText(lesson.title || 'Lesson preview')} onClose={onClose} wide><div className="cp-lesson-viewer"><p>{localizeNode(lesson.kind)} · {localizeNode(lesson.duration || 'Self-paced')}{translateText(" · Student preview")}</p>{localizeNode(error ? <p role="alert">{localizeNode(error)}</p> : !safe ? <div className="cp-lesson-empty"><PlayCircle size={40}/><h3>{translateText("Lesson content coming soon")}</h3><p>{translateText("Add a video URL or upload a lesson file in the curriculum editor.")}</p></div> : lesson.kind === 'Video' ? embed ? <iframe title={translateText(lesson.title)} src={embed} allow="fullscreen; picture-in-picture" allowFullScreen/> : <video controls src={source} onEnded={() => { if (!completed) onComplete(); }} preload="metadata">{translateText("Your browser does not support video playback.")}</video> : lesson.kind === 'PDF' ? <><iframe title={translateText(lesson.title)} src={source}/><a href={source} target="_blank" rel="noopener noreferrer">{translateText("Open lesson resource")}</a></> : <a href={source} target="_blank" rel="noopener noreferrer">{translateText("Read lesson resource")}</a>)}<button className="cw-button primary" onClick={onComplete}><Check size={15}/>{localizeNode(completed ? 'Completed · Mark incomplete' : 'Mark lesson complete')}</button><small>{translateText("Completion here only affects this preview.")}</small></div></Dialog>;
}
