import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LockKeyhole, Users } from 'lucide-react';
import { AccessForm } from './TypeForms';
import type { FormProps } from './TypeForms';
import { StudentManager } from './StudentManager';

export function CourseStudentsPanel(props: FormProps) {
  useUILanguage();
  const [params, setParams] = useSearchParams(); const id = useId();
  const active = params.get('studentsView') === 'access' ? 'access' : 'students';
  function select(value: string) { setParams(current => { const next = new URLSearchParams(current); next.set('studentsView', value); return next; }, { replace: true }); }
  return <section className="ce-students-workspace"><nav className="ce-students-tabs" role="tablist" aria-label={translateText("Course student management")}>{localizeNode(([['students', 'Students', Users], ['access', 'Access', LockKeyhole]] as const).map(([value, label, Icon]) => <button key={value} id={`${id}-${value}-tab`} role="tab" aria-selected={active === value} aria-controls={`${id}-${value}-panel`} tabIndex={active === value ? 0 : -1} className={active === value ? 'active' : ''} onClick={() => select(value)} onKeyDown={event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'students' : event.key === 'End' ? 'access' : active === 'students' ? 'access' : 'students'; select(next); document.getElementById(`${id}-${next}-tab`)?.focus(); }
  }}><Icon size={14}/>{localizeNode(label)}</button>))}</nav>
    <div id={`${id}-students-panel`} role="tabpanel" aria-labelledby={`${id}-students-tab`} hidden={active !== 'students'} className="ce-students-panel"><StudentManager {...props}/></div>
    <div id={`${id}-access-panel`} role="tabpanel" aria-labelledby={`${id}-access-tab`} hidden={active !== 'access'} className="ce-access-panel"><AccessForm {...props}/></div>
  </section>;
}
