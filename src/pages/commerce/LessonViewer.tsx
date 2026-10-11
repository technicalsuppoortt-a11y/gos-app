import { useEffect, useState } from 'react';
import { Check, PlayCircle } from 'lucide-react';
import type { Lesson } from './model';
import { readStoredFile } from './files';
import { Dialog } from './primitives';

export function LessonViewer({ lesson, completed, onComplete, onClose }: { lesson: Lesson; completed: boolean; onComplete: () => void; onClose: () => void }) {
  const [source, setSource] = useState(lesson.url); const [error, setError] = useState('');
  useEffect(() => {
    let active = true, objectUrl = '';
    if (lesson.storageId) void readStoredFile(lesson.storageId).then(blob => { if (active) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); } }).catch(() => { if (active) setError('The uploaded lesson file is unavailable. Upload it again or add a resource URL.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [lesson.storageId]);
  const safe = /^(https?:|blob:)/i.test(source);
  const youtube = source.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  const vimeo = source.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  return <Dialog title={lesson.title || 'Lesson preview'} onClose={onClose} wide><div className="cp-lesson-viewer"><p>{lesson.kind} · {lesson.duration || 'Self-paced'} · Student preview</p>{error ? <p role="alert">{error}</p> : !safe ? <div className="cp-lesson-empty"><PlayCircle size={40}/><h3>Lesson content coming soon</h3><p>Add a video URL or upload a lesson file in the curriculum editor.</p></div> : lesson.kind === 'Video' ? youtube || vimeo ? <iframe title={lesson.title} src={youtube ? `https://www.youtube-nocookie.com/embed/${youtube[1]}` : `https://player.vimeo.com/video/${vimeo![1]}`} allow="fullscreen; picture-in-picture" allowFullScreen/> : <video controls src={source} onEnded={() => { if (!completed) onComplete(); }} preload="metadata">Your browser does not support video playback.</video> : lesson.kind === 'PDF' ? <><iframe title={lesson.title} src={source}/><a href={source} target="_blank" rel="noopener noreferrer">Open lesson resource</a></> : <a href={source} target="_blank" rel="noopener noreferrer">Read lesson resource</a>}<button className="cw-button primary" onClick={onComplete}><Check size={15}/>{completed ? 'Completed · Mark incomplete' : 'Mark lesson complete'}</button><small>Completion here only affects this preview.</small></div></Dialog>;
}
