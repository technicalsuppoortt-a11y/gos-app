import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, ClipboardCheck, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { BookingSelect } from './BookingSelect';
import { Toggle } from './EditorControls';
import { Modal } from './ui';
import { syncQualificationQuestions, uid } from './model';
import type { BookingPage, Question } from './model';
import {
  MAX_SCREENING_CHOICE,
  MAX_SCREENING_CHOICES,
  MAX_SCREENING_LABEL,
  MAX_SCREENING_QUESTIONS,
} from '../../../functions/booking-qualification.js';

const defaults = ['name', 'email', 'whatsapp'];

export function EditorBookingForm({ page, change }: { page: BookingPage; change: (patch: Partial<BookingPage>) => void }) {
  useUILanguage();
  const [editing, setEditing] = useState<Question | null>(null);
  const [settings, setSettings] = useState<BookingPage['formSettings'] | null>(null);
  const [option, setOption] = useState('');
  const [error, setError] = useState('');

  const applyQuestions = (nextQuestions: Question[], extra?: Partial<BookingPage>) => {
    const qualificationQuestions = syncQualificationQuestions(nextQuestions);
    change({ questions: nextQuestions, qualificationQuestions, ...extra });
  };

  const open = (q: Question) => {
    setEditing(structuredClone(q));
    setSettings(structuredClone(page.formSettings));
    setError('');
    setOption('');
  };

  const update = (id: string, patch: Partial<Question>) =>
    applyQuestions(page.questions.map(q => (q.id === id ? { ...q, ...patch } : q)));

  const move = (id: string, by: number) => {
    const next = [...page.questions];
    const i = next.findIndex(q => q.id === id);
    if (i + by < 0 || i + by >= next.length) return;
    [next[i], next[i + by]] = [next[i + by], next[i]];
    applyQuestions(next);
  };

  const typeSummary = (q: Question) => {
    const base =
      q.type === 'text-block'
        ? translateText('Text block')
        : defaults.includes(q.id)
          ? translateText('Default field')
          : q.type === 'radio'
            ? translateText('Multiple choice')
            : q.type === 'select'
              ? translateText('Dropdown')
              : q.type === 'number'
                ? translateText('Number')
                : q.type === 'textarea'
                  ? translateText('Long answer')
                  : translateText('Short answer');
    if (!q.isScreening) return base;
    const isChoice = q.screeningType === 'choice' || q.type === 'select' || q.type === 'radio';
    const ruleInfo = isChoice
      ? `${(q.accepted ?? []).length} ${translateText('of')} ${q.options.length} ${translateText('qualify')}`
      : `${translateText('Minimum')}: ${q.minimum ?? 0}`;
    return `${base} · ${ruleInfo}`;
  };

  const isChoiceScreening = Boolean(editing?.isScreening && (editing.screeningType === 'choice' || ['select', 'radio'].includes(editing.type)));

  return (
    <section className="bk-form bk-booking-form-editor">
      {localizeNode(
        page.questions.map((q, i) => (
          <div className={`bk-field-row ${q.isScreening ? 'is-screening' : ''}`} key={q.id}>
            <div className="bk-order-buttons">
              <button type="button" className="bk-icon" aria-label={translateText(`Move ${q.label} up`)} disabled={i === 0} onClick={() => move(q.id, -1)}>
                <ArrowUp size={13} />
              </button>
              <button type="button" className="bk-icon" aria-label={translateText(`Move ${q.label} down`)} disabled={i === page.questions.length - 1} onClick={() => move(q.id, 1)}>
                <ArrowDown size={13} />
              </button>
            </div>
            <button type="button" className="bk-field-title" onClick={() => open(q)}>
              <b>
                {localizeNode(q.label)}
                {localizeNode((q.required || q.isScreening) && ' *')}
                {localizeNode(
                  q.isScreening && (
                    <span className="bk-screening-pill">
                      <ClipboardCheck size={11} />
                      {translateText('Screening')}
                    </span>
                  )
                )}
              </b>
              <small>{localizeNode(typeSummary(q))}</small>
            </button>
            <Toggle label={`Show ${q.label}`} checked={q.active !== false} disabled={q.id === 'name'} change={active => update(q.id, { active })} />
            <div className="bk-row-actions">
              <button type="button" className="bk-icon" aria-label={translateText(`Edit ${q.label}`)} onClick={() => open(q)}>
                <Pencil size={14} />
              </button>
              {localizeNode(
                !defaults.includes(q.id) && (
                  <>
                    <button
                      type="button"
                      className="bk-icon"
                      aria-label={translateText(`Duplicate ${q.label}`)}
                      onClick={() => applyQuestions([...page.questions, { ...structuredClone(q), id: uid(), label: q.label + ' (copy)' }])}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="bk-icon danger"
                      aria-label={translateText(`Delete ${q.label}`)}
                      onClick={() => applyQuestions(page.questions.filter(v => v.id !== q.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )
              )}
            </div>
          </div>
        ))
      )}

      <div className="bk-field-row">
        <div className="bk-field-title">
          <b>{localizeNode(page.formSettings.guestsLabel)}</b>
          <small>{translateText('Guest details')}</small>
        </div>
        <Toggle label="Show guests" checked={page.formSettings.guestsActive} change={guestsActive => change({ formSettings: { ...page.formSettings, guestsActive } })} />
        <button
          type="button"
          className="bk-icon"
          aria-label={translateText('Edit guests')}
          onClick={() => {
            setEditing({ id: 'guests', label: page.formSettings.guestsLabel, type: 'text', required: page.formSettings.guestsRequired, options: [] });
            setSettings(structuredClone(page.formSettings));
            setError('');
          }}
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className="bk-row-actions">
        <button
          type="button"
          className="bk-button"
          onClick={() => open({ id: uid(), label: '', type: 'text', required: false, active: true, options: [] })}
        >
          <Plus size={14} />
          {translateText('Add question')}
        </button>
        <button
          type="button"
          className="bk-button"
          onClick={() =>
            open({
              id: uid(),
              label: '',
              type: 'select',
              required: true,
              active: true,
              options: ['', ''],
              isScreening: true,
              screeningType: 'choice',
              accepted: [],
              minimum: 100,
            })
          }
        >
          <ClipboardCheck size={14} />
          {translateText('Add screening question')}
        </button>
        <button
          type="button"
          className="bk-text-action"
          onClick={() => open({ id: uid(), label: '', type: 'text-block', text: '', required: false, active: true, options: [] })}
        >
          {translateText('+ Add text block')}
        </button>
      </div>

      {localizeNode(
        editing && settings && (
          <Modal
            title={translateText(
              editing.id === 'guests'
                ? 'Guest field settings'
                : defaults.includes(editing.id)
                  ? `${editing.label} field settings`
                  : editing.type === 'text-block'
                    ? 'Text block'
                    : page.questions.some(q => q.id === editing.id)
                      ? 'Edit question'
                      : 'New question'
            )}
            close={() => setEditing(null)}
          >
            <form
              onSubmit={e => {
                e.preventDefault();
                const label = editing.label.trim();
                if (!label) {
                  setError('Enter a field label.');
                  return;
                }
                if (editing.id === 'name' && settings.nameType === 'firstlast' && (!settings.firstNameLabel.trim() || !settings.lastNameLabel.trim())) {
                  setError('Enter first and last name labels.');
                  return;
                }
                if (editing.id === 'guests') {
                  change({ formSettings: { ...settings, guestsLabel: label, guestsRequired: editing.required } });
                  setEditing(null);
                  return;
                }

                const cleanOptions = editing.options.map(o => o.trim()).filter(Boolean);
                if (editing.isScreening) {
                  const otherScreeningCount = page.questions.filter(q => q.id !== editing.id && q.active !== false && q.isScreening).length;
                  if (otherScreeningCount >= MAX_SCREENING_QUESTIONS) {
                    setError(`Add up to ${MAX_SCREENING_QUESTIONS} screening questions per booking page.`);
                    return;
                  }
                  if (label.length > MAX_SCREENING_LABEL) {
                    setError(`Keep screening questions under ${MAX_SCREENING_LABEL} characters.`);
                    return;
                  }
                  const choiceMode = editing.screeningType === 'choice' || ['select', 'radio'].includes(editing.type);
                  if (choiceMode) {
                    if (cleanOptions.length < 2 || cleanOptions.length > MAX_SCREENING_CHOICES || new Set(cleanOptions).size !== cleanOptions.length || cleanOptions.some(o => o.length > MAX_SCREENING_CHOICE)) {
                      setError('Enter at least two distinct choices.');
                      return;
                    }
                    const cleanAccepted = (editing.accepted ?? []).map(o => o.trim()).filter(o => cleanOptions.includes(o));
                    if (!cleanAccepted.length) {
                      setError('Mark at least one qualifying choice.');
                      return;
                    }
                    const question: Question = {
                      ...editing,
                      label,
                      type: ['select', 'radio'].includes(editing.type) ? editing.type : 'select',
                      required: true,
                      isScreening: true,
                      screeningType: 'choice',
                      options: cleanOptions,
                      accepted: cleanAccepted,
                    };
                    const nextQuestions = page.questions.some(q => q.id === editing.id)
                      ? page.questions.map(q => (q.id === editing.id ? question : q))
                      : [...page.questions, question];
                    applyQuestions(nextQuestions);
                    setEditing(null);
                    return;
                  } else {
                    const minimum = Number(editing.minimum);
                    if (!Number.isFinite(minimum) || minimum < 0) {
                      setError('Enter a minimum amount of 0 or greater.');
                      return;
                    }
                    const question: Question = {
                      ...editing,
                      label,
                      type: 'number',
                      required: true,
                      isScreening: true,
                      screeningType: 'minimum',
                      minimum,
                      options: [],
                      accepted: [],
                    };
                    const nextQuestions = page.questions.some(q => q.id === editing.id)
                      ? page.questions.map(q => (q.id === editing.id ? question : q))
                      : [...page.questions, question];
                    applyQuestions(nextQuestions);
                    setEditing(null);
                    return;
                  }
                }

                if (['radio', 'select'].includes(editing.type) && !cleanOptions.length) {
                  setError('Add at least one choice.');
                  return;
                }
                const question: Question = {
                  ...editing,
                  label,
                  isScreening: false,
                  required: editing.type === 'text-block' ? false : editing.required,
                  options: cleanOptions,
                };
                delete question.minimum;
                delete question.accepted;
                delete question.screeningType;
                const nextQuestions = page.questions.some(q => q.id === editing.id)
                  ? page.questions.map(q => (q.id === editing.id ? question : q))
                  : [...page.questions, question];
                applyQuestions(nextQuestions, editing.id === 'name' ? { formSettings: settings } : undefined);
                setEditing(null);
              }}
            >
              <div className="bk-dialog-body bk-form">
                <label>
                  {localizeNode(editing.type === 'text-block' ? 'Block label' : editing.isScreening ? 'Screening question' : 'Field label')}
                  <input
                    autoFocus
                    required
                    maxLength={editing.isScreening ? MAX_SCREENING_LABEL : undefined}
                    placeholder={translateText(editing.isScreening ? 'e.g. What is your monthly marketing budget?' : '')}
                    value={editing.label}
                    onChange={e => setEditing({ ...editing, label: e.target.value })}
                  />
                </label>

                {localizeNode(
                  editing.id === 'name' && (
                    <>
                      <label>
                        {translateText('Name format')}
                        <BookingSelect
                          aria-label={translateText('Name format')}
                          value={settings.nameType}
                          onChange={e => setSettings({ ...settings, nameType: e.target.value as 'name' | 'firstlast' })}
                        >
                          <option value="name">{translateText('Full name')}</option>
                          <option value="firstlast">{translateText('First name / last name')}</option>
                        </BookingSelect>
                      </label>
                      {localizeNode(
                        settings.nameType === 'firstlast' && (
                          <div className="bk-form-grid">
                            <label>
                              {translateText('First name label')}
                              <input required value={settings.firstNameLabel} onChange={e => setSettings({ ...settings, firstNameLabel: e.target.value })} />
                            </label>
                            <label>
                              {translateText('Last name label')}
                              <input required value={settings.lastNameLabel} onChange={e => setSettings({ ...settings, lastNameLabel: e.target.value })} />
                            </label>
                          </div>
                        )
                      )}
                    </>
                  )
                )}

                {localizeNode(
                  editing.id === 'guests' ? (
                    <>
                      <Toggle label="Require at least one guest" checked={editing.required} change={required => setEditing({ ...editing, required })} />
                      <Toggle label="Show guest counter" checked={settings.guestsShowCounter} change={guestsShowCounter => setSettings({ ...settings, guestsShowCounter })} />
                      {localizeNode(
                        settings.guestDetails.map(g => (
                          <div className="bk-question bk-form" key={g.id}>
                            <label>
                              {translateText('Guest ')}
                              {localizeNode(g.id)}
                              {translateText(' label')}
                              <input required value={g.label} onChange={e => setSettings({ ...settings, guestDetails: settings.guestDetails.map(v => (v.id === g.id ? { ...v, label: e.target.value } : v)) })} />
                            </label>
                            <Toggle label={`Show guest ${g.id}`} checked={g.active} change={active => setSettings({ ...settings, guestDetails: settings.guestDetails.map(v => (v.id === g.id ? { ...v, active } : v)) })} />
                            <Toggle label={`Require guest ${g.id}`} checked={g.required} change={required => setSettings({ ...settings, guestDetails: settings.guestDetails.map(v => (v.id === g.id ? { ...v, required } : v)) })} />
                          </div>
                        ))
                      )}
                    </>
                  ) : editing.type === 'text-block' ? (
                    <label>
                      {translateText('Text block content')}
                      <textarea rows={5} value={editing.text || ''} onChange={e => setEditing({ ...editing, text: e.target.value })} />
                    </label>
                  ) : (
                    <>
                      <div className="bk-form-grid">
                        {localizeNode(
                          !defaults.includes(editing.id) && (
                            <label>
                              {translateText('Answer type')}
                              <BookingSelect
                                aria-label={translateText('Answer type')}
                                value={editing.type}
                                onChange={e => {
                                  const nextType = e.target.value as Question['type'];
                                  if (editing.isScreening) {
                                    const nextChoice = ['select', 'radio'].includes(nextType);
                                    const nextOpts = nextChoice ? (editing.options.length >= 2 ? editing.options : ['', '']) : [];
                                    setEditing({
                                      ...editing,
                                      type: nextChoice ? nextType : 'number',
                                      screeningType: nextChoice ? 'choice' : 'minimum',
                                      options: nextOpts,
                                      minimum: editing.minimum ?? 100,
                                    });
                                  } else {
                                    setEditing({ ...editing, type: nextType });
                                  }
                                }}
                              >
                                {localizeNode(
                                  (editing.isScreening
                                    ? [
                                        ['select', 'Dropdown (qualifying choices)'],
                                        ['radio', 'Multiple choice (qualifying choices)'],
                                        ['number', 'Number (minimum threshold)'],
                                      ]
                                    : [
                                        ['text', 'Short answer'],
                                        ['textarea', 'Long answer'],
                                        ['number', 'Number'],
                                        ['radio', 'Multiple choice'],
                                        ['select', 'Dropdown'],
                                        ['email', 'Email'],
                                        ['tel', 'Phone'],
                                      ]
                                  ).map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {localizeNode(label)}
                                    </option>
                                  ))
                                )}
                              </BookingSelect>
                            </label>
                          )
                        )}
                        <label>
                          {translateText('Requirement')}
                          <BookingSelect
                            disabled={editing.id === 'name' || Boolean(editing.isScreening)}
                            value={editing.required || editing.isScreening ? 'required' : 'optional'}
                            onChange={e => setEditing({ ...editing, required: e.target.value === 'required' })}
                          >
                            <option value="required">{translateText('Required')}</option>
                            <option value="optional">{translateText('Optional')}</option>
                          </BookingSelect>
                        </label>
                      </div>

                      {localizeNode(
                        !defaults.includes(editing.id) && (
                          <div className={`bk-screening-box ${editing.isScreening ? 'active' : ''}`}>
                            <Toggle
                              label="Lead qualification (screening question)"
                              checked={Boolean(editing.isScreening)}
                              change={enabled => {
                                setError('');
                                if (!enabled) {
                                  setEditing({ ...editing, isScreening: false });
                                  return;
                                }
                                const choiceMode = ['select', 'radio'].includes(editing.type);
                                const nextOpts = choiceMode ? (editing.options.length >= 2 ? editing.options : [...editing.options, ...['', ''].slice(editing.options.length)]) : [];
                                setEditing({
                                  ...editing,
                                  isScreening: true,
                                  required: true,
                                  type: choiceMode ? editing.type : 'number',
                                  screeningType: choiceMode ? 'choice' : 'minimum',
                                  minimum: editing.minimum ?? 100,
                                  options: nextOpts,
                                  accepted: editing.accepted ?? [],
                                });
                              }}
                            />
                            <p className="bk-screening-hint">
                              {translateText(
                                'Shown inside Your details. If an invitee gives a non-qualifying answer, the appointment is not booked, they receive a polite thank-you message, and the lead is saved to CRM as Pending booking.'
                              )}
                            </p>

                            {localizeNode(
                              editing.isScreening && (
                                <div className="bk-screening-rules">
                                  <label className="bk-qual-field">
                                    <span>{translateText('Qualification rule')}</span>
                                    <BookingSelect
                                      aria-label={translateText('Rule type')}
                                      value={isChoiceScreening ? 'choice' : 'minimum'}
                                      onChange={e => {
                                        const mode = e.target.value as 'minimum' | 'choice';
                                        setError('');
                                        if (mode === 'choice') {
                                          const nextOpts = editing.options.length >= 2 ? editing.options : [...editing.options, ...['', ''].slice(editing.options.length)];
                                          setEditing({
                                            ...editing,
                                            screeningType: 'choice',
                                            type: ['select', 'radio'].includes(editing.type) ? editing.type : 'select',
                                            options: nextOpts,
                                            accepted: editing.accepted ?? [],
                                          });
                                        } else {
                                          setEditing({
                                            ...editing,
                                            screeningType: 'minimum',
                                            type: 'number',
                                            minimum: editing.minimum ?? 100,
                                          });
                                        }
                                      }}
                                    >
                                      <option value="choice">{translateText('Qualifying choices')}</option>
                                      <option value="minimum">{translateText('Minimum amount')}</option>
                                    </BookingSelect>
                                  </label>

                                  {localizeNode(
                                    !isChoiceScreening ? (
                                      <label className="bk-qual-field">
                                        <span>{translateText('Minimum accepted amount')}</span>
                                        <input
                                          aria-label={translateText('Minimum accepted amount')}
                                          type="number"
                                          min={0}
                                          step="any"
                                          required
                                          value={editing.minimum ?? 0}
                                          onChange={e => setEditing({ ...editing, minimum: Number(e.target.value) })}
                                        />
                                      </label>
                                    ) : (
                                      <div className="bk-qual-choices-section">
                                        <div className="bk-qual-choices-head">
                                          <p className="bk-muted">{translateText('Add choices and check the answers that qualify to book.')}</p>
                                          <span className="bk-qual-counter">
                                            {localizeNode((editing.accepted ?? []).filter(a => editing.options.includes(a) && a.trim()).length)} {translateText('of')} {localizeNode(editing.options.length)} {translateText('qualify')}
                                          </span>
                                        </div>
                                        <div className="bk-qual-choices-list">
                                          {editing.options.map((opt, index) => {
                                            const acceptedList = editing.accepted ?? [];
                                            const checked = Boolean(opt.trim()) && acceptedList.includes(opt);
                                            return (
                                              <div className={`bk-qual-choice-card ${checked ? 'is-accepted' : ''}`} key={index}>
                                                <div className="bk-qual-choice-top">
                                                  <label className="bk-qual-choice-label">
                                                    <span className="bk-qual-choice-title">
                                                      <i className="bk-qual-choice-badge">{index + 1}</i>
                                                      {translateText('Choice ')}
                                                      {localizeNode(index + 1)}
                                                    </span>
                                                    <input
                                                      required
                                                      maxLength={MAX_SCREENING_CHOICE}
                                                      placeholder={translateText(`Option ${index + 1}`)}
                                                      value={opt}
                                                      onChange={e => {
                                                        const val = e.target.value;
                                                        const nextOpts = editing.options.map((item, idx) => (idx === index ? val : item));
                                                        const nextAcc = acceptedList.map(item => (item === opt ? val : item)).filter(Boolean);
                                                        setEditing({ ...editing, options: nextOpts, accepted: nextAcc });
                                                      }}
                                                    />
                                                  </label>
                                                </div>
                                                <div className="bk-qual-choice-footer">
                                                  <label className={`bk-qual-check-pill ${checked ? 'is-checked' : ''}`}>
                                                    <input
                                                      type="checkbox"
                                                      checked={checked}
                                                      onChange={e => {
                                                        if (!opt.trim()) return;
                                                        const nextAcc = e.target.checked
                                                          ? [...new Set([...acceptedList, opt])]
                                                          : acceptedList.filter(item => item !== opt);
                                                        setEditing({ ...editing, accepted: nextAcc });
                                                      }}
                                                    />
                                                    <span className="bk-qual-check-box" aria-hidden="true">
                                                      <Check size={11} strokeWidth={3} />
                                                    </span>
                                                    <span>{translateText('Qualifies')}</span>
                                                  </label>
                                                  <button
                                                    type="button"
                                                    className="bk-icon danger bk-qual-remove-btn"
                                                    disabled={editing.options.length <= 2}
                                                    aria-label={translateText(`Remove choice ${index + 1}`)}
                                                    onClick={() =>
                                                      setEditing({
                                                        ...editing,
                                                        options: editing.options.filter((_, idx) => idx !== index),
                                                        accepted: acceptedList.filter(item => item !== opt),
                                                      })
                                                    }
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        <button
                                          type="button"
                                          className="bk-button bk-qual-add-choice"
                                          disabled={editing.options.length >= MAX_SCREENING_CHOICES}
                                          onClick={() => setEditing({ ...editing, options: [...editing.options, ''] })}
                                        >
                                          <Plus size={14} />
                                          {translateText('Add choice')}
                                        </button>
                                      </div>
                                    )
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )
                      )}
                    </>
                  )
                )}

                {localizeNode(
                  !editing.isScreening && ['radio', 'select'].includes(editing.type) && (
                    <div className="bk-form">
                      <label>
                        {translateText('Add choice')}
                        <div className="bk-choice-add">
                          <input
                            aria-label={translateText('Add choice')}
                            value={option}
                            onChange={e => setOption(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (option.trim()) {
                                  setEditing({ ...editing, options: [...editing.options, option.trim()] });
                                  setOption('');
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="bk-button"
                            onClick={() => {
                              if (option.trim()) {
                                setEditing({ ...editing, options: [...editing.options, option.trim()] });
                                setOption('');
                              }
                            }}
                          >
                            {translateText('Add')}
                          </button>
                        </div>
                      </label>
                      {localizeNode(
                        editing.options.map((o, i) => (
                          <div className="bk-choice-add" key={i}>
                            <input
                              aria-label={translateText(`Choice ${i + 1}`)}
                              value={o}
                              onChange={e => setEditing({ ...editing, options: editing.options.map((v, n) => (n === i ? e.target.value : v)) })}
                            />
                            <button
                              type="button"
                              className="bk-icon"
                              aria-label={translateText(`Remove choice ${i + 1}`)}
                              onClick={() => setEditing({ ...editing, options: editing.options.filter((_, n) => n !== i) })}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )
                )}

                {localizeNode(error && <p role="alert" className="bk-error">{localizeNode(error)}</p>)}
              </div>
              <footer className="bk-dialog-footer">
                <button type="button" className="bk-button" onClick={() => setEditing(null)}>
                  {translateText('Cancel')}
                </button>
                <button className="bk-button primary">{translateText(editing.isScreening ? 'Save question' : 'Save')}</button>
              </footer>
            </form>
          </Modal>
        )
      )}
    </section>
  );
}
