import { TablePagination } from './TablePagination';
import { useTablePagination } from './useTablePagination';
import sarah from '../../assets/inbox/sarah.jpg';
import omar from '../../assets/inbox/omar.jpg';
import lina from '../../assets/inbox/lina.jpg';
import nour from '../../assets/inbox/nour.jpg';
import karim from '../../assets/inbox/karim.jpg';
import mona from '../../assets/inbox/mona.jpg';
import youssef from '../../assets/inbox/youssef.jpg';
import diana from '../../assets/inbox/diana.jpg';
import { useRef, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { Card, Dialog, Field, Select } from './primitives';
import type { Student } from './model';
import type { FormProps } from './TypeForms';

const avatars: Record<string, string> = { sarah, omar, lina, nour, karim, mona, youssef, diana };

export function StudentManager({ config: c, configure, editing, experience: e }: FormProps) {
  const students = c.students ?? []; const [query, setQuery] = useState(''); const [status, setStatus] = useState('All statuses');
  const [draft, setDraft] = useState<Student | null>(null); const [error, setError] = useState(''); const [deleting, setDeleting] = useState<Student | null>(null);
  const visible = students.filter(s => (status === 'All statuses' || s.status === status) && `${s.name} ${s.email}`.toLowerCase().includes(query.trim().toLowerCase()));
  const table = useRef<HTMLDivElement>(null);
  const pagination = useTablePagination(visible.length);
  const rows = visible.slice(pagination.offset, pagination.offset + pagination.pageSize);
  function edit(student?: Student) { setError(''); setDraft(student ? { ...student } : { id: '', name: '', email: '', status: 'Pending', progress: 0, enrolledAt: new Date().toISOString().slice(0, 10) }); }
  function save() {
    if (!draft) return;
    const name = draft.name.trim(), email = draft.email.trim().toLowerCase();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a name and valid email address.');
    if (students.some(s => s.id !== draft.id && s.email.toLowerCase() === email)) return setError('This student is already enrolled.');
    if (!draft.id && e.studentLimit && students.length >= e.studentLimit) return setError('Student capacity reached. Increase the limit in access settings.');
    if (!Number.isFinite(draft.progress) || draft.progress < 0 || draft.progress > 100) return setError('Progress must be between 0 and 100.');
    const student = { ...draft, id: draft.id || crypto.randomUUID(), name, email, progress: draft.status === 'Completed' ? 100 : draft.progress };
    configure({ students: draft.id ? students.map(s => s.id === draft.id ? student : s) : [...students, student], activities: [{ id: crypto.randomUUID(), title: `${name}: enrollment ${draft.id ? 'updated' : 'created'}`, at: new Date().toISOString() }, ...(c.activities ?? [])].slice(0, 100) }); setDraft(null);
  }
  return <Card className="ce-records-card ce-students-card" title="Students" subtitle={`${students.length} enrolled · Changes persist with Save Changes`} action={<button className="cw-button primary" disabled={!editing} onClick={() => edit()}><Plus size={14}/>Add student</button>}><div className="ce-student-metrics"><span><b>{students.filter(s => s.status === 'Active').length}</b>Active</span><span><b>{students.filter(s => s.status === 'Completed').length}</b>Completed</span><span><b>{students.length ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length) : 0}%</b>Average progress</span></div><div className="ce-toolbar"><label><Search size={15}/><input aria-label="Search students" placeholder="Search name or email" value={query} onChange={event => { setQuery(event.target.value); pagination.setPage(0); }}/></label><Select value={status} options={['All statuses', 'Active', 'Pending', 'Completed', 'Suspended']} onChange={value => { setStatus(value); pagination.setPage(0); }}/></div><div className="ce-table-wrap" ref={table}><table className="ce-table"><thead><tr><th>Student</th><th>Enrollment</th><th>Progress</th><th>Enrolled</th><th>Actions</th></tr></thead><tbody>{rows.map(student => <tr key={student.id}><td><div className="ce-student-person">{student.avatar && avatars[student.avatar] ? <img src={avatars[student.avatar]} alt=""/> : <span className="ce-avatar-initials">{student.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>}<div><b>{student.name}</b><small>{student.email}{student.sample ? ' · Sample' : ''}</small></div></div></td><td><span className={`ce-status ${student.status.toLowerCase()}`}>{student.status}</span></td><td><div className="ce-progress" role="progressbar" aria-label={`${student.name} course progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={student.progress}><span style={{ width: `${student.progress}%` }}/></div><small>{student.progress}% complete</small></td><td>{student.enrolledAt}</td><td><button className="cw-icon-button" disabled={!editing} aria-label={`Edit ${student.name}`} onClick={() => edit(student)}><Pencil size={14}/></button><button className="cw-icon-button" disabled={!editing} aria-label={`Delete ${student.name}`} onClick={() => setDeleting(student)}><Trash2 size={14}/></button></td></tr>)}</tbody></table>{!visible.length && <div className="ce-empty"><Users size={26}/><p>No matching students. Add an enrollment or adjust your filters.</p></div>}</div><TablePagination onNavigate={() => { if (table.current) table.current.scrollTop = 0; }} pagination={pagination} noun="students" sizes={[10, 25, 50]}/>{draft && <Dialog title={draft.id ? 'Edit enrollment' : 'Add student'} onClose={() => setDraft(null)}><form onSubmit={event => { event.preventDefault(); save(); }}><Field label="Student name"><input required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></Field><Field label="Email address"><input required type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })}/></Field><div className="cw-form-grid"><Field label="Enrollment status"><Select value={draft.status} options={['Active', 'Pending', 'Completed', 'Suspended']} onChange={value => setDraft({ ...draft, status: value as Student['status'] })}/></Field><Field label="Progress (%)"><input type="number" min="0" max="100" required value={draft.progress} onChange={event => setDraft({ ...draft, progress: Number(event.target.value) })}/></Field><Field label="Enrollment date"><input type="date" required value={draft.enrolledAt} onChange={event => setDraft({ ...draft, enrolledAt: event.target.value })}/></Field></div>{error && <p className="cw-errors" role="alert">{error}</p>}<button type="submit" className="cw-button primary">Apply enrollment</button></form></Dialog>}{deleting && <Dialog title="Delete student enrollment?" onClose={() => setDeleting(null)}><p>Remove {deleting.name} and their progress from this course?</p><div className="cw-header-actions"><button className="cw-button" onClick={() => setDeleting(null)}>Cancel</button><button className="cw-button primary" onClick={() => { configure({ students: students.filter(s => s.id !== deleting.id), activities: [{ id: crypto.randomUUID(), title: `${deleting.name}: enrollment removed`, at: new Date().toISOString() }, ...(c.activities ?? [])].slice(0, 100) }); setDeleting(null); }}>Remove student</button></div></Dialog>}</Card>;
}
