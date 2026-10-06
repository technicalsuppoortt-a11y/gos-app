import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Copy, FileText, Folder, Globe, GripVertical, MoreHorizontal, Pencil, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { InstagramLogo, LinkedinLogo, YoutubeLogo, TiktokLogo } from '@phosphor-icons/react';
import type { FormProps } from './TypeForms';
import { InstructorCard } from './TypeForms';
import { Card, Dialog, Field, Select } from './primitives';
import { lessonData } from './model';
import type { Lesson } from './model';
import { storeFile } from './files';

const socialNetworks = [
  { name: 'Website', icon: Globe }, { name: 'YouTube', icon: YoutubeLogo },
  { name: 'Instagram', icon: InstagramLogo }, { name: 'LinkedIn', icon: LinkedinLogo },
  { name: 'X', icon: XSocial }, { name: 'TikTok', icon: TiktokLogo },
] as const;
function XSocial({ size = 15 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 3h5l11 18h-5L4 3ZM4 21 20 3" stroke="currentColor" strokeWidth="1.6"/></svg>; }

export function CourseInstructor(props: FormProps) {
  const [open, setOpen] = useState(false), [links, setLinks] = useState<Record<string, string>>({}), [validation, setValidation] = useState('');
  function manage() { setLinks({ ...props.experience.instructorSocials }); setValidation(''); setOpen(true); }
  function save() {
    const cleaned = Object.fromEntries(Object.entries(links).map(([name, value]) => [name, value.trim()]));
    for (const [name, value] of Object.entries(cleaned)) {
      if (!value) continue;
      try { if (!['https:', 'http:'].includes(new URL(value).protocol)) throw new Error(); }
      catch { setValidation(`Enter a valid https:// or http:// URL for ${name}.`); return; }
    }
    props.customize({ instructorSocials: cleaned }); setOpen(false);
  }
  return <div className="course-instructor-card"><InstructorCard {...props}/>
    <button className="cw-icon-button course-social-edit" aria-label="Edit Social Links" onClick={manage}><Pencil size={13}/></button>
    <div className="course-instructor-socials" aria-label="Instructor social profiles">{socialNetworks.map(({ name, icon: Icon }) => <button key={name} type="button" className={props.experience.instructorSocials?.[name] ? 'connected' : ''} aria-label={`Manage instructor ${name} profile`} title={`${name}${props.experience.instructorSocials?.[name] ? ' · Connected' : ' · Add profile'}`} onClick={manage}><Icon size={15}/></button>)}</div>
    {open && <Dialog title="Instructor Social Links" onClose={() => setOpen(false)}><p>Manage the profiles shown below your instructor information.</p><form onSubmit={event => { event.preventDefault(); save(); }}><div className="course-social-modal-fields">{socialNetworks.map(({ name, icon: Icon }) => <Field key={name} label={name} icon={Icon}><input type="url" value={links[name] ?? ''} placeholder={`https://${name === 'Website' ? 'your-website.com' : `${name.toLowerCase()}.com/your-profile`}`} onChange={event => { setValidation(''); setLinks(current => ({ ...current, [name]: event.target.value })); }}/></Field>)}</div>{validation && <p className="cw-errors" role="alert">{validation}</p>}<div className="course-modal-actions"><button type="button" className="cw-button" onClick={() => setOpen(false)}>Cancel</button><button className="cw-button primary" type="submit">Save Social Links</button></div></form></Dialog>}
  </div>;
}

export function CourseCurriculum(props: FormProps) {
  const { config: c, configure, editing } = props;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(c.modules[0] ? [c.modules[0].title] : []));
  const [menu, setMenu] = useState<string | null>(null), [rename, setRename] = useState<number | null>(null), [name, setName] = useState('');
  const [lessonEditor, setLessonEditor] = useState<{ module: number; index: number; lesson: Lesson } | null>(null);
  const [uploading, setUploading] = useState(false), [lessonError, setLessonError] = useState('');
  const dragged = useRef<{ module: number; lesson?: number } | null>(null);
  function toggle(title: string) { setExpanded(current => { const next = new Set(current); if (next.has(title)) next.delete(title); else next.add(title); return next; }); }
  function addModule() { const title = `Module ${c.modules.length + 1}: Untitled`; configure({ modules: [...c.modules, { title, lessons: [] }] }); setExpanded(current => new Set([...current, title])); }
  function openLesson(module: number, index: number) { setMenu(null); setLessonError(''); setLessonEditor({ module, index, lesson: index < c.modules[module].lessons.length ? { ...lessonData(c.modules[module].lessons[index], index) } : { id: crypto.randomUUID(), title: '', kind: 'Video', duration: '', url: '' } }); }
  function saveLesson() {
    if (!lessonEditor || uploading) return;
    if (!lessonEditor.lesson.title.trim()) { setLessonError('Enter a lesson title.'); return; }
    if (lessonEditor.lesson.url) { try { if (!['http:', 'https:'].includes(new URL(lessonEditor.lesson.url).protocol)) throw new Error(); } catch { setLessonError('Enter a valid http:// or https:// resource URL.'); return; } }
    configure(current => ({ modules: current.modules.map((module, i) => { if (i !== lessonEditor.module) return module; const lessons = [...module.lessons]; lessons[lessonEditor.index] = { ...lessonEditor.lesson, title: lessonEditor.lesson.title.trim() }; return { ...module, lessons }; }) }));
    setExpanded(current => new Set([...current, c.modules[lessonEditor.module].title])); setLessonEditor(null);
  }
  async function attach(file?: File) {
    if (!file || uploading) return;
    if (!/\.(pdf|mp4|webm|mov)$/i.test(file.name) || file.size > 5 * 1024 * 1024 * 1024) { setLessonError('Choose a PDF or video file up to 5 GB.'); return; }
    setUploading(true); props.busy(true);
    try { const storageId = await storeFile(file); setLessonEditor(current => current ? { ...current, lesson: { ...current.lesson, storageId, fileName: file.name, kind: /\.pdf$/i.test(file.name) ? 'PDF' : 'Video' } } : current); }
    catch (cause) { setLessonError(cause instanceof Error ? cause.message : 'Could not upload file.'); }
    finally { setUploading(false); props.busy(false); }
  }
  function reorder(module: number, lesson?: number) {
    const source = dragged.current; dragged.current = null;
    if (!editing || !source) return;
    configure(current => { const modules = current.modules.map(m => ({ ...m, lessons: [...m.lessons] }));
      if (source.lesson === undefined && lesson === undefined) { const [item] = modules.splice(source.module, 1); modules.splice(module, 0, item); }
      else if (source.lesson !== undefined) { const [item] = modules[source.module].lessons.splice(source.lesson, 1); modules[module].lessons.splice(lesson ?? modules[module].lessons.length, 0, item); }
      return { modules };
    }); setMenu(null);
  }
  function moduleMove(index: number, direction: number) { dragged.current = { module: index }; reorder(index + direction); }
  function lessonMove(module: number, lesson: number, direction: number) { dragged.current = { module, lesson }; reorder(module, lesson + direction); }
  const currentModule = Math.max(0, c.modules.findIndex(module => expanded.has(module.title)));
  return <Card title="Course Content" subtitle="Organize your course into modules and lessons. Drag and drop to reorder." className="course-builder-card" action={editing && <div className="course-builder-actions"><button className="cw-button small" onClick={addModule}><Plus size={12}/>Add Module</button><button className="cw-button small" disabled={!c.modules.length} onClick={() => openLesson(currentModule, c.modules[currentModule].lessons.length)}><Plus size={12}/>Add Lesson</button></div>}>
    {!c.modules.length && <button className="cw-button" onClick={addModule}><Plus size={13}/>Add your first module</button>}
    <div className="course-module-list">{c.modules.map((module, i) => <section className="course-module" key={`${i}-${module.title}`}>
      <div className="course-module-row" onDragOver={event => { if (editing) event.preventDefault(); }} onDrop={event => { event.preventDefault(); reorder(i); }}>
        <span className="course-drag" draggable={editing} title="Drag to reorder module" onDragStart={event => { dragged.current = { module: i }; event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { dragged.current = null; }}><GripVertical size={13}/></span>
        <button className="course-module-toggle" aria-expanded={expanded.has(module.title)} aria-controls={`course-module-${i}`} onClick={() => toggle(module.title)}><Folder size={18}/><b>{module.title}</b><small>{module.lessons.length} lessons</small><ChevronDown size={12} className={expanded.has(module.title) ? 'expanded' : ''}/></button>
        {editing && <div className="course-row-menu"><button className="cw-icon-button" aria-label={`Module ${i + 1} actions`} aria-expanded={menu === `module-${i}`} onClick={() => setMenu(menu === `module-${i}` ? null : `module-${i}`)}><MoreHorizontal size={15}/></button>{menu === `module-${i}` && <div className="course-row-options"><button onClick={() => openLesson(i, module.lessons.length)}><Plus size={12}/>Add Lesson</button><button onClick={() => { setName(module.title); setRename(i); setMenu(null); }}><Pencil size={12}/>Rename Module</button><button disabled={i === 0} onClick={() => moduleMove(i, -1)}><ArrowUp size={12}/>Move Up</button><button disabled={i === c.modules.length - 1} onClick={() => moduleMove(i, 1)}><ArrowDown size={12}/>Move Down</button><button onClick={() => { configure({ modules: c.modules.filter((_, index) => index !== i) }); setMenu(null); }}><Trash2 size={12}/>Delete Module</button></div>}</div>}
      </div>
      {expanded.has(module.title) && <div id={`course-module-${i}`} className="course-module-lessons">{module.lessons.map((value, j) => { const lesson = lessonData(value, j), Icon = lesson.kind === 'Video' ? PlayCircle : FileText; return <div className="course-lesson-row" key={lesson.id} onDragOver={event => { if (editing) event.preventDefault(); }} onDrop={event => { event.preventDefault(); event.stopPropagation(); reorder(i, j); }}>
        <span className="course-drag" draggable={editing} title="Drag to reorder lesson" onDragStart={event => { dragged.current = { module: i, lesson: j }; event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { dragged.current = null; }}><GripVertical size={12}/></span><Icon size={13}/><button className="course-lesson-title" disabled={!editing} onClick={() => openLesson(i, j)}>{j + 1}. {lesson.title}</button><em className={`tw-lesson-badge ${lesson.kind.toLowerCase()}`}><Icon size={10}/>{lesson.kind}</em><small>{lesson.duration}</small>
        {editing && <div className="course-row-menu"><button className="cw-icon-button" aria-label={`Lesson ${j + 1} actions in module ${i + 1}`} aria-expanded={menu === `lesson-${i}-${j}`} onClick={() => setMenu(menu === `lesson-${i}-${j}` ? null : `lesson-${i}-${j}`)}><MoreHorizontal size={14}/></button>{menu === `lesson-${i}-${j}` && <div className="course-row-options"><button onClick={() => openLesson(i, j)}><Pencil size={12}/>Edit Lesson</button><button onClick={() => { configure({ modules: c.modules.map((m, index) => index === i ? { ...m, lessons: [...m.lessons, { ...lesson, id: crypto.randomUUID(), title: `${lesson.title} (Copy)` }] } : m) }); setMenu(null); }}><Copy size={12}/>Duplicate Lesson</button><button disabled={j === 0} onClick={() => lessonMove(i, j, -1)}><ArrowUp size={12}/>Move Up</button><button disabled={j === module.lessons.length - 1} onClick={() => lessonMove(i, j, 1)}><ArrowDown size={12}/>Move Down</button><button onClick={() => { configure({ modules: c.modules.map((m, index) => index === i ? { ...m, lessons: m.lessons.filter((_, index) => index !== j) } : m) }); setMenu(null); }}><Trash2 size={12}/>Delete Lesson</button></div>}</div>}
      </div>; })}{!module.lessons.length && editing && <button className="cw-text-link" onClick={() => openLesson(i, 0)}><Plus size={12}/>Add a lesson</button>}</div>}
    </section>)}</div>
    {menu && <button className="course-row-scrim" aria-label="Close curriculum actions" onClick={() => setMenu(null)}/>}
    {rename !== null && <Dialog title="Rename Module" onClose={() => setRename(null)}><form onSubmit={event => { event.preventDefault(); if (!name.trim()) return; const previous = c.modules[rename].title; configure({ modules: c.modules.map((m, i) => i === rename ? { ...m, title: name.trim() } : m) }); setExpanded(current => { const next = new Set(current); if (next.delete(previous)) next.add(name.trim()); return next; }); setRename(null); }}><Field label="Module title"><input value={name} onChange={event => setName(event.target.value)} required/></Field><div className="course-modal-actions"><button type="button" className="cw-button" onClick={() => setRename(null)}>Cancel</button><button type="submit" className="cw-button primary">Save Module</button></div></form></Dialog>}
    {lessonEditor && <Dialog title={lessonEditor.index === c.modules[lessonEditor.module].lessons.length ? 'Add Lesson' : 'Edit Lesson'} onClose={() => { if (!uploading) setLessonEditor(null); }}><form onSubmit={event => { event.preventDefault(); saveLesson(); }}><Field label="Lesson title"><input required value={lessonEditor.lesson.title} onChange={event => setLessonEditor({ ...lessonEditor, lesson: { ...lessonEditor.lesson, title: event.target.value } })}/></Field><div className="cw-form-grid"><Field label="Format"><Select value={lessonEditor.lesson.kind} options={['Video', 'PDF', 'Text']} onChange={kind => setLessonEditor({ ...lessonEditor, lesson: { ...lessonEditor.lesson, kind: kind as Lesson['kind'] } })}/></Field><Field label={lessonEditor.lesson.kind === 'PDF' ? 'File size' : 'Duration'}><input value={lessonEditor.lesson.duration} placeholder={lessonEditor.lesson.kind === 'PDF' ? '2.4 MB' : '08:24'} onChange={event => setLessonEditor({ ...lessonEditor, lesson: { ...lessonEditor.lesson, duration: event.target.value } })}/></Field></div><Field label="Resource URL"><input type="url" value={lessonEditor.lesson.url} placeholder="https://" onChange={event => setLessonEditor({ ...lessonEditor, lesson: { ...lessonEditor.lesson, url: event.target.value } })}/></Field><Field label="Attach PDF / Video"><input type="file" accept=".pdf,.mp4,.webm,.mov" disabled={uploading} onChange={event => void attach(event.target.files?.[0])}/>{lessonEditor.lesson.fileName && <small>{lessonEditor.lesson.fileName}</small>}</Field>{lessonError && <p className="cw-errors" role="alert">{lessonError}</p>}<div className="course-modal-actions"><button type="button" className="cw-button" disabled={uploading} onClick={() => setLessonEditor(null)}>Cancel</button><button className="cw-button primary" type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Save Lesson'}</button></div></form></Dialog>}
  </Card>;
}
