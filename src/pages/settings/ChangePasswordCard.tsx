import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { logoutFirebase } from '../../backend/session';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { friendlyError, settingsRequest } from './data';
import { Card, Field } from './kit';

export function ChangePasswordCard({ className = '' }: { className?: string }) {
  const ar = useUILanguage().startsWith('ar');
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');

    if (!currentPassword) {
      setError(ar ? 'يرجى إدخال كلمة المرور الحالية.' : 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError(ar ? 'استخدم 8 أحرف على الأقل لكلمة المرور الجديدة.' : 'Use at least 8 characters for the new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(ar ? 'كلمتا المرور الجديدتان غير متطابقتين.' : 'The new passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError(ar ? 'اختر كلمة مرور جديدة مختلفة عن كلمة المرور الحالية.' : 'Choose a new password different from your current password.');
      return;
    }

    setBusy(true);
    try {
      await settingsRequest('/security/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await logoutFirebase();
      navigate('/auth/login', { replace: true, state: { passwordUpdated: true } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={ar ? 'تغيير كلمة المرور' : translateText('Change Password')}
      description={
        ar
          ? 'قم بتحديث كلمة مرور حسابك. سيتم تسجيل خروجك تلقائياً بعد التحديث لإعادة تسجيل الدخول بأمان.'
          : translateText('Update your account password. For your security, you will be automatically signed out after updating.')
      }
      className={className}
    >
      <form className="st-password-change-form" onSubmit={handleSubmit}>
        <div className="st-form-grid three">
          <Field label={ar ? 'كلمة المرور الحالية' : 'Current Password'}>
            <div className="st-password-input-wrap">
              <input
                required
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder={ar ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                disabled={busy}
              />
              <button
                type="button"
                className="st-password-eye"
                onClick={() => setShowCurrent(v => !v)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label={ar ? 'كلمة المرور الجديدة' : 'New Password'}>
            <div className="st-password-input-wrap">
              <input
                required
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={ar ? '8 أحرف على الأقل' : 'At least 8 characters'}
                disabled={busy}
              />
              <button
                type="button"
                className="st-password-eye"
                onClick={() => setShowNew(v => !v)}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label={ar ? 'تأكيد كلمة المرور الجديدة' : 'Confirm Password'}>
            <div className="st-password-input-wrap">
              <input
                required
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={ar ? 'أعد كتابة كلمة المرور الجديدة' : 'Re-enter new password'}
                disabled={busy}
              />
              <button
                type="button"
                className="st-password-eye"
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
        </div>

        {localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}

        <div className="st-password-footer">
          <span className="st-note" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <ShieldCheck size={15} />
            {ar
              ? 'استخدم 8 أحرف على الأقل. سيتم إنهاء الجلسة الحالية وتحويلك لصفحة تسجيل الدخول فور الحفظ.'
              : translateText('Use at least 8 characters. Updating your password will sign you out and redirect to login.')}
          </span>
          <button type="submit" className="st-primary" disabled={busy}>
            <KeyRound size={15} />
            {ar ? (busy ? 'جاري التحديث…' : 'تحديث كلمة المرور') : localizeNode(busy ? 'Updating…' : 'Update Password')}
          </button>
        </div>
      </form>
    </Card>
  );
}
