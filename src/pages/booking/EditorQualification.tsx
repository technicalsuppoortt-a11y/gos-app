import { useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { translateText as t } from '../../i18n/display';
import { MAX_SCREENING_CHOICE, MAX_SCREENING_CHOICES, MAX_SCREENING_LABEL, MAX_SCREENING_QUESTIONS, validQualificationQuestions } from '../../../functions/booking-qualification.js';
import type { QualificationQuestion } from '../../../functions/booking-qualification.js';
import { BookingSelect } from './BookingSelect';
import { Modal } from './ui';
import { uid } from './model';

export function EditorQualification({ questions, change }: {
  questions: QualificationQuestion[];
  change: (questions: QualificationQuestion[]) => void;
}) {
  const [editing, setEditing] = useState<QualificationQuestion | null>(null);
  return <section className="bk-card bk-form bk-section-form">
    <h3>{t('Pre-booking screening')}</h3>
    <p>{t('Visitors must pass every screening question before choosing a time. Remove all screening questions to allow anyone to continue.')}</p>
    {questions.map(question => <div className="bk-field-row" key={question.id}>
      <button type="button" className="bk-field-title" onClick={() => setEditing(question)}>
        <b>{question.label}</b>
        <small>{question.type === 'minimum' ? t('Minimum amount') : t('Qualifying choices')}</small>
      </button>
      <div className="bk-row-actions">
        <button type="button" className="bk-icon" aria-label={t('Edit screening question') + ' — ' + question.label} onClick={() => setEditing(question)}><Pencil size={14}/></button>
        <button type="button" className="bk-icon danger" aria-label={t('Remove screening question') + ' — ' + question.label} onClick={() => change(questions.filter(item => item.id !== question.id))}><Trash2 size={14}/></button>
      </div>
    </div>)}
    <button type="button" className="bk-button" disabled={questions.length >= MAX_SCREENING_QUESTIONS}
      onClick={() => setEditing({ id: uid(), label: '', type: 'minimum', minimum: 0 })}>
      <Plus size={14}/>{t('Add screening question')}
    </button>
    {editing && <QualificationDialog question={editing} close={() => setEditing(null)} save={question => {
      change(questions.some(item => item.id === question.id)
        ? questions.map(item => item.id === question.id ? question : item)
        : [...questions, question]);
      setEditing(null);
    }}/>}
  </section>;
}

function QualificationDialog({ question, close, save }: {
  question: QualificationQuestion;
  close: () => void;
  save: (question: QualificationQuestion) => void;
}) {
  const [label, setLabel] = useState(question.label);
  const [type, setType] = useState(question.type);
  const [minimum, setMinimum] = useState(question.type === 'minimum' && question.label ? String(question.minimum) : '');
  const [choices, setChoices] = useState(() => question.type === 'choice'
    ? question.options.map(label => ({ id: uid(), label, accepted: question.accepted.includes(label) }))
    : Array.from({ length: 2 }, () => ({ id: uid(), label: '', accepted: false })));
  const [error, setError] = useState('');
  return <Modal title={t(question.label ? 'Edit screening question' : 'Add screening question')} close={close}>
    <form onSubmit={event => {
      event.preventDefault();
      const base = { id: question.id, label: label.trim() };
      const next: QualificationQuestion = type === 'minimum'
        ? { ...base, type, minimum: minimum.trim() ? Number(minimum) : NaN }
        : { ...base, type, options: choices.map(choice => choice.label.trim()), accepted: choices.filter(choice => choice.accepted).map(choice => choice.label.trim()) };
      if (!validQualificationQuestions([next])) {
        setError(t(!base.label ? 'Enter a question.' : type === 'minimum' ? 'Enter a valid minimum amount.' : 'Enter distinct choices and mark at least one as qualifying.'));
        return;
      }
      save(next);
    }}>
      <div className="bk-dialog-body bk-form bk-qual-dialog-body">
        <label className="bk-qual-field">
          <span>{t('Screening question')}</span>
          <input autoFocus required maxLength={MAX_SCREENING_LABEL} value={label} onChange={event => setLabel(event.target.value)} placeholder={t('What is your project budget in USD?')}/>
        </label>
        <label className="bk-qual-field">
          <span>{t('Qualification rule')}</span>
          <BookingSelect aria-label={t('Qualification rule')} value={type} onChange={event => setType(event.target.value === 'choice' ? 'choice' : 'minimum')}>
            <option value="minimum">{t('Minimum amount')}</option>
            <option value="choice">{t('Qualifying choices')}</option>
          </BookingSelect>
        </label>
        {type === 'minimum' ? (
          <label className="bk-qual-field">
            <span>{t('Minimum accepted amount')}</span>
            <input required type="number" min="0" step="any" value={minimum} onChange={event => setMinimum(event.target.value)} placeholder="0"/>
          </label>
        ) : (
          <div className="bk-qual-choices-section">
            <div className="bk-qual-choices-head">
              <p className="bk-muted">{t('Mark each choice that should let a visitor continue.')}</p>
              <span className="bk-qual-counter">
                {choices.filter(c => c.accepted).length}/{choices.length} {t('Qualifies')}
              </span>
            </div>
            <div className="bk-qual-choices-list">
              {choices.map((choice, index) => (
                <div className={`bk-question bk-qual-choice-card ${choice.accepted ? 'is-accepted' : ''}`} key={choice.id}>
                  <div className="bk-qual-choice-top">
                    <label className="bk-qual-choice-label">
                      <span className="bk-qual-choice-title">
                        <i className="bk-qual-choice-badge">{index + 1}</i>
                        {t('Choice')} {index + 1}
                      </span>
                      <input
                        required
                        maxLength={MAX_SCREENING_CHOICE}
                        value={choice.label}
                        placeholder={`${t('Choice')} ${index + 1}`}
                        onChange={event => setChoices(choices.map(item => item.id === choice.id ? { ...item, label: event.target.value } : item))}
                      />
                    </label>
                  </div>
                  <div className="bk-question-footer bk-qual-choice-footer">
                    <label className={`bk-checkbox bk-qual-check-pill ${choice.accepted ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={choice.accepted}
                        onChange={event => setChoices(choices.map(item => item.id === choice.id ? { ...item, accepted: event.target.checked } : item))}
                      />
                      <span className="bk-qual-check-box" aria-hidden="true">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span>{t('Qualifies')}</span>
                    </label>
                    <button
                      type="button"
                      className="bk-icon danger bk-qual-remove-btn"
                      aria-label={t('Remove choice') + ' ' + (index + 1)}
                      title={t('Remove choice') + ' ' + (index + 1)}
                      disabled={choices.length <= 2}
                      onClick={() => setChoices(choices.filter(item => item.id !== choice.id))}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="bk-button bk-qual-add-choice"
              disabled={choices.length >= MAX_SCREENING_CHOICES}
              onClick={() => setChoices([...choices, { id: uid(), label: '', accepted: false }])}
            >
              <Plus size={15}/>
              {t('Add choice')}
            </button>
          </div>
        )}
        {error && <p className="bk-error" role="alert">{error}</p>}
      </div>
      <footer className="bk-dialog-footer">
        <button type="button" className="bk-button" onClick={close}>{t('Cancel')}</button>
        <button className="bk-button primary">{t('Save question')}</button>
      </footer>
    </form>
  </Modal>;
}
