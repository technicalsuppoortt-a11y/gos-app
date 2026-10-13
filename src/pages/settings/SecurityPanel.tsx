import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useCallback, useEffect, useState } from 'react';
import { Clock3, KeyRound, Monitor, ShieldCheck } from 'lucide-react';
import { Badge, Card, Field, Modal, PanelHeading, Toggle } from './kit';
import { friendlyError, safeExternalUrl, settingsApiEnabled, settingsRequest } from './data';
import { changeDemoPassword, readSecurity, saveLocal } from './localState';
import type { SecurityState, Session } from './localState';
function MockQr() {
  useUILanguage();
 const cells = Array.from({ length: 441 }, (_, index) => { const x = index % 21, y = Math.floor(index / 21); const finder = (left: number, top: number) => x >= left && x < left + 7 && y >= top && y < top + 7 && (x === left || x === left + 6 || y === top || y === top + 6 || (x >= left + 2 && x <= left + 4 && y >= top + 2 && y <= top + 4)); return finder(0, 0) || finder(14, 0) || finder(0, 14) || (x > 7 && y > 7 && ((x * 7 + y * 11) % 5 < 2)); });
 return <svg className="st-mock-qr" viewBox="-2 -2 25 25" role="img" aria-label={translateText("Mock authenticator QR illustration")}><rect x="-2" y="-2" width="25" height="25" fill="white"/>{localizeNode(cells.map((filled, index) => filled && <rect key={index} x={index % 21} y={Math.floor(index / 21)} width="1" height="1" fill="#25264b"/>))}</svg>;
}
export function SecurityPanel() {
  useUILanguage();
 const [security, setSecurity] = useState<SecurityState>(() => settingsApiEnabled ? { sessions: [], history: [], mfa: false } : readSecurity());
 const [password, setPassword] = useState(''), [nextPassword, setNextPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
 const [verification, setVerification] = useState<{ enabled: boolean; challenge: string } | null>(null), [code, setCode] = useState(''), [revoke, setRevoke] = useState<Session | null>(null);
 const closeVerification = useCallback(() => { setVerification(null); setCode(''); setError(''); }, []);
 const closeRevoke = useCallback(() => setRevoke(null), []);
 const load = useCallback(async () => { if (!settingsApiEnabled) return; try { setSecurity(await settingsRequest<SecurityState>('/security')); } catch (e) { setError(friendlyError(e)); } }, []);
 useEffect(() => { void load(); }, [load]);
 function persist(next: SecurityState) { saveLocal('security', next); setSecurity(next); }
 async function action(path: string, body?: unknown) {
   setBusy(true); setError(''); setMessage('');
   try { const result = await settingsRequest<{ url?: string; message?: string }>(path, body ?? {}); if (result?.url) window.location.assign(safeExternalUrl(result.url)); else { setMessage(result?.message ?? 'Security settings updated.'); await load(); } return true; }
   catch (e) { setError(friendlyError(e)); return false; } finally { setBusy(false); }
 }
 async function changePassword() {
   setError(''); setMessage('');
   if (nextPassword !== confirmation) { setError('The new passwords do not match.'); return; }
   if (nextPassword.length < 12) { setError('Use at least 12 characters.'); return; }
   if (settingsApiEnabled) { if (!await action('/security/password', { currentPassword: password, newPassword: nextPassword })) return; }
   else {
     setBusy(true);
     try { persist(await changeDemoPassword(security, password, nextPassword)); setMessage('Demo password updated on this device. Your sign-in password is unchanged.'); }
     catch (e) { setError(friendlyError(e)); return; } finally { setBusy(false); }
   }
   setPassword(''); setNextPassword(''); setConfirmation('');
 }
 function startVerification(enabled: boolean) {
   if (settingsApiEnabled) { void action('/security/mfa/setup'); return; }
   const random = new Uint32Array(1); crypto.getRandomValues(random);
   setError(''); setCode(''); setVerification({ enabled, challenge: String(100000 + random[0] % 900000) });
 }
 return <><PanelHeading title={translateText("Security")} description="Protect your account and review sign-in activity."/>{localizeNode(!settingsApiEnabled && <p className="st-note">{translateText("Local security demo · sessions and 2FA are simulated. These controls do not change your authentication account.")}</p>)}{localizeNode(error && !verification && !revoke && <p className="st-error" role="alert">{localizeNode(error)}</p>)}{localizeNode(message && <p className="st-success" role="status">{localizeNode(message)}</p>)}
 <form onSubmit={e => { e.preventDefault(); void changePassword(); }}><Card title={translateText("Password")} description="Use a strong, unique password for your account."><div className="st-form-grid"><Field label="Current password"><input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></Field><Field label="New password"><input required type="password" autoComplete="new-password" minLength={12} value={nextPassword} onChange={e => setNextPassword(e.target.value)}/></Field><Field label="Confirm new password"><input required type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)}/></Field></div><p className="st-note">{translateText("Use at least 12 characters.")}{localizeNode(!settingsApiEnabled && !security.passwordHash && <>{translateText(" Initial demo password: ")}<code>DemoPassword123!</code></>)}</p><button className="st-primary" disabled={busy}><KeyRound size={15}/>{localizeNode(busy ? 'Updating…' : 'Update Password')}</button></Card></form>
 <Card title={translateText("Two-factor authentication")} description="Verify an authenticator code before enabling 2FA."><div className="st-row"><span className="st-service-icon purple"><ShieldCheck size={24}/></span><div><b>{localizeNode(security.mfa ? 'Enabled' : 'Not enabled')}</b><p>{localizeNode(settingsApiEnabled ? 'Configure your authenticator through the secure account service.' : 'Try the QR and verification cycle using a demo code.')}</p></div><Toggle label="Two-factor authentication" checked={security.mfa} disabled={busy} onChange={startVerification}/></div></Card>
 <Card title={translateText("Active sessions")} description={settingsApiEnabled ? 'Devices signed in to your account.' : 'Sample devices for testing session management.'}>{localizeNode(security.sessions.map(session => <div className="st-row" key={session.id}><Monitor size={22}/><div><b>{localizeNode(session.device)}</b><p>{localizeNode(session.lastActive)}</p></div>{localizeNode(session.current ? <Badge>{translateText("Current")}</Badge> : <button disabled={busy} className="st-danger" onClick={() => { setError(''); setRevoke(session); }}>{translateText("Revoke")}</button>)}</div>))}{localizeNode(!security.sessions.length && <p className="st-note">{translateText("No sessions found.")}</p>)}</Card>
 <Card title={translateText("Login history")} description="Recent sign-ins and security changes.">{localizeNode(security.history.slice(0, 15).map((entry, index) => <div className="st-row" key={index}><Clock3 size={17}/><span>{localizeNode(entry)}</span></div>))}{localizeNode(!security.history.length && <p className="st-note">{translateText("No login history available.")}</p>)}</Card>
 {localizeNode(settingsApiEnabled && <Card title={translateText("API access")} description="Manage API keys in your secure workspace portal."><button className="st-secondary" disabled={busy} onClick={() => void action('/security/api-keys/portal')}>{translateText("Manage API Keys")}</button></Card>)}
 {localizeNode(verification && <Modal title={translateText(verification.enabled ? 'Set up two-factor authentication' : 'Disable two-factor authentication')} close={closeVerification}><form onSubmit={e => { e.preventDefault(); if (code !== verification.challenge) { setError('Enter the six-digit demo verification code shown below.'); return; } try { persist({ ...security, mfa: verification.enabled, history: [`${new Date().toLocaleString('en-GB')} · Demo 2FA ${verification.enabled ? 'enabled' : 'disabled'}`, ...security.history] }); setMessage(`Demo two-factor authentication ${verification.enabled ? 'enabled' : 'disabled'}.`); closeVerification(); } catch (failure) { setError(friendlyError(failure)); } }}>{localizeNode(verification.enabled && <div className="st-qr-preview"><MockQr/><p>{translateText("Mock QR illustration · no authenticator account is created.")}</p></div>)}<p className="st-note">{translateText("Demo verification code: ")}<strong>{localizeNode(verification.challenge)}</strong></p><Field label="Verification code"><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder={translateText("6-digit code")}/></Field>{localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}<div className="st-modal-actions"><button type="button" className="st-secondary" onClick={closeVerification}>{translateText("Cancel")}</button><button className="st-primary">{localizeNode(verification.enabled ? 'Verify & enable' : 'Verify & disable')}</button></div></form></Modal>)}
 {localizeNode(revoke && <Modal title={translateText("Revoke session")} close={closeRevoke}><p>{translateText("Sign out ")}{localizeNode(revoke.device)}?</p>{localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}<div className="st-modal-actions"><button className="st-secondary" disabled={busy} onClick={closeRevoke}>{translateText("Cancel")}</button><button className="st-danger" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { if (settingsApiEnabled) { await settingsRequest(`/security/sessions/${encodeURIComponent(revoke.id)}`, undefined, 'DELETE'); await load(); } else persist({ ...security, sessions: security.sessions.filter(session => session.id !== revoke.id), history: [`${new Date().toLocaleString('en-GB')} · Demo session revoked · ${revoke.device}`, ...security.history] }); setMessage(settingsApiEnabled ? 'Session revoked.' : 'Demo session revoked.'); closeRevoke(); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}>{localizeNode(busy ? 'Revoking…' : 'Revoke session')}</button></div></Modal>)}</>;
}
