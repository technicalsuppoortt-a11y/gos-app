import { useEffect, useId, useRef } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import type { ScreeningQuestion } from '../../../functions/booking-qualification.js';
import { translateText } from '../../i18n/display';
import { resolveDisplayTranslation } from '../../i18n/translate';
import { BookingSelect } from './BookingSelect';
import { Avatar } from './ui';
import type { BookingPage } from './model';

export function screeningText(language: BookingPage['language'], copy: string) {
  return language === 'ar' ? resolveDisplayTranslation(copy) ?? copy : translateText(copy);
}

export function BookingScreeningView({ page, questions, answers, setAnswer, submit, saving, error, focusOnMount = true }: {
  page: BookingPage;
  questions: ScreeningQuestion[];
  answers: Record<string, string>;
  setAnswer: (id: string, answer: string) => void;
  submit: (event: FormEvent) => void;
  saving: boolean;
  error: string;
  focusOnMount?: boolean;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const t = (copy: string) => screeningText(page.language, copy);
  useEffect(() => { if (focusOnMount) heading.current?.focus({ preventScroll: true }); }, [focusOnMount]);
  return <div className="bk-public-grid">
    <aside className="bk-public-details">
      {page.image ? <div className="bk-public-media">{page.mediaType === 'video'
        ? <video src={page.image} controls playsInline style={{ borderRadius: page.imageRound ? '50%' : 12 }}/>
        : <img src={page.image} alt={page.titleOverride || page.name} style={{ borderRadius: page.imageRound ? '50%' : 12 }}/>}</div>
        : <Avatar name={page.hostName}/>}
      <span className="bk-muted">{page.hostName}</span>
      <h1>{page.titleOverride || page.name}</h1>
      <p>{page.description}</p>
    </aside>
    <section className="bk-public-wizard" aria-labelledby={id}>
      <nav className="bk-wizard-steps" aria-label={t('Booking steps')}>
        <span className="active" aria-current="step"><i>1</i>{t('Screening')}</span>
        <span><i>2</i>{t('Date & time')}</span>
        <span><i>3</i>{t('Your details')}</span>
        <span><i>4</i>{t('Confirmation')}</span>
      </nav>
      <h2 id={id} ref={heading} tabIndex={-1}>{t('Before you book')}</h2>
      <p className="bk-muted">{t('Answer these required questions to see if this appointment is a fit.')}</p>
      <form className="bk-form bk-screening-form" onSubmit={submit}>
        {questions.map(question => <label key={question.id} htmlFor={id + question.id}>{question.label}
          {question.type === 'minimum'
            ? <input id={id + question.id} type="number" inputMode="decimal" required min="0" step="any" disabled={saving} value={answers[question.id] ?? ''} onChange={event => setAnswer(question.id, event.target.value)}/>
            : <BookingSelect id={id + question.id} required disabled={saving} value={answers[question.id] ?? ''} onChange={event => setAnswer(question.id, event.target.value)}>
              {question.options.map(option => <option value={option} key={option}>{option}</option>)}
            </BookingSelect>}
        </label>)}
        {error && <p role="alert" className="bk-error">{error}</p>}
        <button className="bk-button primary bk-next" disabled={saving}>
          {t(saving ? 'Checking answers…' : 'Continue to availability')}<ArrowRight size={15}/>
        </button>
      </form>
    </section>
  </div>;
}

export function BookingScreeningExit({ language, restart }: { language: BookingPage['language']; restart?: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <section className="bk-state-card">
    <div className="bk-state-orb"><ClipboardList size={26}/></div>
    <h2 tabIndex={-1} ref={heading}>{screeningText(language, 'Thank you for your interest')}</h2>
    <p>{screeningText(language, 'We’re unable to offer an appointment based on your answers. Thank you for taking the time to tell us about your needs.')}</p>
    {restart && <button className="bk-button" onClick={restart}>{screeningText(language, 'Preview screening again')}</button>}
  </section>;
}
