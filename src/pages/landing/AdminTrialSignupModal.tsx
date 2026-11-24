import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Crown,
  Eye,
  EyeOff,
  Gift,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import type { Language } from '../../store/slices/uiSlice';
import type { WhiteLabelCopy } from './white-label/white-label-content';
import { registerTrialAdminAccount } from '../../backend/adminTrialSignup';
import { login } from '../../backend/session';
import { startAdminTrialDemoSession } from '../../demo/mode';
import { loginSuccess } from '../../store/slices/authSlice';
import { routeForRole } from '../../router/ProtectedRoute';
import { showToast } from '../../utils/toast';

type Props = {
  open: boolean;
  onClose: () => void;
  copy: WhiteLabelCopy['trialModal'];
  loginUrl: string;
  language: Language;
  brandName?: string;
};

function slugifyBrand(input: string): string {
  const ascii = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const latinOnly = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (latinOnly || (ascii ? 'your-brand' : 'yourbrand')).slice(0, 28);
}

function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0;
  let points = 1;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) points++;
  if (pw.length >= 11 || /[^A-Za-z0-9]/.test(pw)) points++;
  return Math.min(3, points) as 0 | 1 | 2 | 3;
}

function createRequestId(): string {
  return `trial_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const AdminTrialSignupDialog: React.FC<Omit<Props, 'open'>> = ({
  onClose,
  copy,
  loginUrl,
  language,
  brandName,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const busyRef = useRef(false);
  const requestIdRef = useRef<string>(createRequestId());

  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'workspace' | 'email' | 'password' | 'terms', string>>>({});

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    const timer = window.setTimeout(() => nameRef.current?.focus(), 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const previewSlug = useMemo(() => slugifyBrand(workspaceName), [workspaceName]);
  const pwStrength = useMemo(() => passwordScore(password), [password]);

  const clearFieldError = (field: 'name' | 'workspace' | 'email' | 'password' | 'terms') => {
    if (error) setError('');
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const focusFieldInput = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, a')) return;
    event.currentTarget.querySelector<HTMLInputElement>('input')?.focus();
  };

  const mapError = (err: unknown): string => {
    const code = String((err as { code?: string })?.code || '').toLowerCase();
    const message = String((err as { message?: string })?.message || '').toLowerCase();
    if (code.includes('already-exists') || message.includes('already has an account') || message.includes('email-already')) {
      return copy.errors.exists;
    }
    if (code.includes('failed-precondition') || message.includes('paused') || message.includes('disabled')) {
      return copy.errors.paused;
    }
    if (
      code.includes('unavailable') ||
      code.includes('not-found') ||
      code.includes('internal') ||
      code.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('cors') ||
      message.includes('err_failed') ||
      message.includes('network')
    ) {
      return copy.errors.unavailable;
    }
    return copy.errors.generic;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || done) return;
    setError('');

    const cleanName = name.trim();
    const cleanWorkspace = workspaceName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const nextFieldErrors: Partial<Record<'name' | 'workspace' | 'email' | 'password' | 'terms', string>> = {};

    if (cleanName.length < 2) {
      nextFieldErrors.name = copy.errors.name;
    }
    if (cleanWorkspace.length < 2) {
      nextFieldErrors.workspace = copy.errors.workspace;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextFieldErrors.email = copy.errors.email;
    }
    if (password.length < 8 || password.length > 128) {
      nextFieldErrors.password = copy.errors.password;
    }
    if (!accepted) {
      nextFieldErrors.terms = copy.errors.terms;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const firstMessage =
        nextFieldErrors.name ||
        nextFieldErrors.workspace ||
        nextFieldErrors.email ||
        nextFieldErrors.password ||
        nextFieldErrors.terms ||
        '';
      setError(firstMessage);
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      if (!requestIdRef.current) {
        requestIdRef.current = createRequestId();
      }
      const result = await registerTrialAdminAccount({
        name: cleanName,
        workspaceName: cleanWorkspace,
        email: cleanEmail,
        phone: phone.trim(),
        password,
        language,
        acceptTrialTerms: true,
        requestId: requestIdRef.current,
      });

      setDone(true);

      // When running on localhost before `registerTrialAdmin` is deployed to Cloud Functions,
      // launch the isolated Admin Free Trial workspace directly at `/admin/overview`.
      if (result.localTrialFallback) {
        showToast.success(copy.successTitle);
        startAdminTrialDemoSession(
          {
            id: result.id,
            tenantId: result.tenantId,
            name: cleanName,
            workspaceName: cleanWorkspace,
            email: cleanEmail,
            phone: phone.trim() || undefined,
            language,
            trialDays: result.trialDays,
            credits: result.credits,
          },
          '/admin/overview',
        );
        return;
      }

      const session = await login(cleanEmail, password);
      if (session) {
        dispatch(loginSuccess(session));
        showToast.success(copy.successTitle);
        onClose();
        navigate(routeForRole(session.role, session.user.allowedTabs), { replace: true });
        return;
      }
      onClose();
      navigate(`${loginUrl}?email=${encodeURIComponent(cleanEmail)}`, { replace: true });
    } catch (err) {
      setBusy(false);
      setDone(false);
      requestIdRef.current = createRequestId();
      setError(mapError(err));
    }
  };

  return (
    <div
      className="lp-trial-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lp-trial-modal-title"
      aria-describedby="lp-trial-modal-subtitle"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="lp-trial-modal">
        <button
          type="button"
          id="lp-trial-close"
          className="lp-trial-close"
          aria-label={copy.closeLabel}
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>

        {/* Value & Special-Case Free Trial Side Panel */}
        <aside className="lp-trial-side">
          <div className="lp-trial-side__badges">
            <span className="lp-trial-pill">
              <Crown size={13} strokeWidth={2.4} aria-hidden="true" />
              {copy.badge}
            </span>
            <span className="lp-trial-pill is-gift">
              <Gift size={13} strokeWidth={2.4} aria-hidden="true" />
              {copy.specialTag}
            </span>
          </div>

          <h3 className="lp-trial-side__title">
            {brandName ? copy.sideTitle.replace(/\bUpklick\b/gi, brandName) : copy.sideTitle}
          </h3>
          <p className="lp-trial-side__lead">{copy.sideLead}</p>

          <ul className="lp-trial-perks">
            {copy.perks.map((perk, idx) => (
              <li key={idx}>
                <span className="lp-trial-perks__icon" aria-hidden="true">
                  <Check size={12} strokeWidth={3.2} />
                </span>
                <div>
                  <b>{perk.title}</b>
                  <small>{perk.text}</small>
                </div>
              </li>
            ))}
          </ul>

          <div className="lp-trial-terms-box">
            <div className="lp-trial-terms-box__head">
              <ShieldCheck size={15} strokeWidth={2.3} aria-hidden="true" />
              <b>{copy.termsTitle}</b>
            </div>
            <ul>
              {copy.termsList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Admin Account Creation Form Panel */}
        <div className="lp-trial-main">
          {done ? (
            <div className="lp-trial-success" role="status" aria-live="polite">
              <span className="lp-trial-success__icon" aria-hidden="true">
                <BadgeCheck size={36} strokeWidth={2.1} />
              </span>
              <b>{copy.successTitle}</b>
              <p>{copy.successText}</p>
              <LoaderCircle size={20} className="lp-spin" aria-hidden="true" />
            </div>
          ) : (
            <>
              <div className="lp-trial-head">
                <span className="lp-trial-head__eyebrow">
                  <Sparkles size={13} aria-hidden="true" />
                  {copy.specialTag}
                </span>
                <h2 id="lp-trial-modal-title">{copy.formTitle}</h2>
                <p id="lp-trial-modal-subtitle">{copy.formSubtitle}</p>
              </div>

              {error && (
                <div className="lp-trial-error" role="alert">
                  <span aria-hidden="true" />
                  <p>{error}</p>
                </div>
              )}

              <form
                className="lp-trial-form"
                onSubmit={handleSubmit}
                autoComplete="off"
                data-form-type="other"
                data-lpignore="true"
                noValidate
              >
                {/* Inert off-screen trap prevents password/address managers from attaching autofill popovers */}
                <input
                  type="text"
                  name="gos_inert_trap"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                />

                <div className="lp-trial-row-2">
                  <div className={`lp-trial-field${fieldErrors.name ? ' is-invalid' : ''}`} onClick={focusFieldInput}>
                    <span id="lp-trial-lbl-a" className="lp-trial-field__label">{copy.nameLabel}</span>
                    <div className="lp-trial-input-wrap">
                      <UserRound size={15} aria-hidden="true" />
                      <input
                        ref={nameRef}
                        id="lp-trial-f-alpha"
                        name="gos_ws_entry_alpha"
                        type="search"
                        aria-labelledby="lp-trial-lbl-a"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        maxLength={80}
                        placeholder={copy.namePlaceholder}
                        value={name}
                        onChange={e => {
                          setName(e.target.value);
                          clearFieldError('name');
                        }}
                      />
                    </div>
                    {fieldErrors.name && <small className="lp-trial-field__err">{fieldErrors.name}</small>}
                  </div>

                  <div className={`lp-trial-field${fieldErrors.workspace ? ' is-invalid' : ''}`} onClick={focusFieldInput}>
                    <span id="lp-trial-lbl-b" className="lp-trial-field__label">{copy.workspaceLabel}</span>
                    <div className="lp-trial-input-wrap">
                      <Building2 size={15} aria-hidden="true" />
                      <input
                        id="lp-trial-f-beta"
                        name="gos_ws_entry_beta"
                        type="search"
                        aria-labelledby="lp-trial-lbl-b"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        maxLength={80}
                        placeholder={copy.workspacePlaceholder}
                        value={workspaceName}
                        onChange={e => {
                          setWorkspaceName(e.target.value);
                          clearFieldError('workspace');
                        }}
                      />
                    </div>
                    {fieldErrors.workspace && <small className="lp-trial-field__err">{fieldErrors.workspace}</small>}
                  </div>
                </div>

                <div className="lp-trial-domain-chip" aria-live="polite">
                  <Lock size={12} strokeWidth={2.5} aria-hidden="true" />
                  <span>{copy.domainPreview}</span>
                  <b dir="ltr">app.{previewSlug}.com</b>
                </div>

                <div className="lp-trial-row-2">
                  <div className={`lp-trial-field${fieldErrors.email ? ' is-invalid' : ''}`} onClick={focusFieldInput}>
                    <span id="lp-trial-lbl-c" className="lp-trial-field__label">{copy.emailLabel}</span>
                    <div className="lp-trial-input-wrap">
                      <Mail size={15} aria-hidden="true" />
                      <input
                        id="lp-trial-f-gamma"
                        name="gos_ws_entry_gamma"
                        type="search"
                        inputMode="email"
                        aria-labelledby="lp-trial-lbl-c"
                        dir="ltr"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        maxLength={160}
                        placeholder={copy.emailPlaceholder}
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value);
                          clearFieldError('email');
                        }}
                      />
                    </div>
                    {fieldErrors.email && <small className="lp-trial-field__err">{fieldErrors.email}</small>}
                  </div>

                  <div className="lp-trial-field" onClick={focusFieldInput}>
                    <span id="lp-trial-lbl-d" className="lp-trial-field__label">
                      {copy.phoneLabel} <em>({copy.phoneOptional})</em>
                    </span>
                    <div className="lp-trial-input-wrap">
                      <Phone size={15} aria-hidden="true" />
                      <input
                        id="lp-trial-f-delta"
                        name="gos_ws_entry_delta"
                        type="search"
                        inputMode="tel"
                        aria-labelledby="lp-trial-lbl-d"
                        dir="ltr"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        maxLength={32}
                        placeholder={copy.phonePlaceholder}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className={`lp-trial-field${fieldErrors.password ? ' is-invalid' : ''}`} onClick={focusFieldInput}>
                  <span id="lp-trial-lbl-e" className="lp-trial-field__label">{copy.passwordLabel}</span>
                  <div className="lp-trial-input-wrap">
                    <Lock size={15} aria-hidden="true" />
                    <input
                      id="lp-trial-f-secret"
                      name="gos_ws_secret_key"
                      type={showPassword ? 'search' : 'password'}
                      aria-labelledby="lp-trial-lbl-e"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      minLength={8}
                      maxLength={128}
                      placeholder={copy.passwordPlaceholder}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        clearFieldError('password');
                      }}
                    />
                    <button
                      type="button"
                      className="lp-trial-eye"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {fieldErrors.password && <small className="lp-trial-field__err">{fieldErrors.password}</small>}
                  <div className="lp-trial-pw-meta">
                    <div className={`lp-trial-pw-bars level-${password ? pwStrength + 1 : 0}`} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <small>{password ? copy.strengthLabels[pwStrength] : copy.passwordHint}</small>
                  </div>
                </div>

                <label className={`lp-trial-consent${fieldErrors.terms ? ' is-invalid' : ''}`}>
                  <input
                    id="lp-trial-consent-check"
                    type="checkbox"
                    checked={accepted}
                    onChange={e => {
                      setAccepted(e.target.checked);
                      clearFieldError('terms');
                    }}
                  />
                  <span>
                    {copy.agreePrefix}{' '}
                    <Link to="/terms-of-service" onClick={onClose}>
                      {copy.termsLink}
                    </Link>{' '}
                    {copy.andText}{' '}
                    <Link to="/privacy" onClick={onClose}>
                      {copy.privacyLink}
                    </Link>{' '}
                    {copy.agreeTrialSuffix}
                  </span>
                </label>

                <button
                  id="lp-trial-submit"
                  type="submit"
                  className="lp-btn lp-btn--primary lp-btn--lg lp-trial-submit"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={17} className="lp-spin" aria-hidden="true" />
                      <span>{copy.submitting}</span>
                    </>
                  ) : (
                    <>
                      <span>{copy.submit}</span>
                      <ArrowRight size={16} strokeWidth={2.4} className="lp-flip" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <p className="lp-trial-foot">
                <span>{copy.haveAccount}</span>{' '}
                <Link to={loginUrl} onClick={onClose}>
                  {copy.loginCta}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminTrialSignupModal: React.FC<Props> = ({ open, ...rest }) => {
  if (!open) return null;
  return <AdminTrialSignupDialog {...rest} />;
};
