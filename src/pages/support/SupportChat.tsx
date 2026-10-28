import { SupportAssignments } from './SupportAssignments';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { ArrowLeft, CheckCheck, MessageCircle, Mic, Square, Paperclip, Reply, Send, X, Plus, MoreHorizontal, Copy, Forward, Pencil, Trash2, Smile } from 'lucide-react';
import type { RootState } from '../../store';
import { db, storage, callBackend, backendError } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';
import { SupportDialog } from './SupportDialog';
import { SupportMedia } from './SupportMedia';
import { formatDuration, inspectAudio, roleLabel, roomKey, type Contact, type Attachment, type Message, type Room } from './support-model';
import './support.css';

const request = <T,>(data: Record<string, unknown>) => callBackend<T>('supportChat', data);
const emojis = ['👍', '❤️', '😂', '🎉', '🙏', '👀'];
export function SupportChat() {
  const { user, role } = useSelector((s: RootState) => s.auth);
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [contacts, setContacts] = useState<Contact[]>([]), [selected, setSelected] = useState<Contact | null>(null);
  const [roomId, setRoomId] = useState(''), [messages, setMessages] = useState<Message[]>([]), [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState(''), [text, setText] = useState(''), [files, setFiles] = useState<File[]>([]), [reply, setReply] = useState<Message | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [contactRevision, setContactRevision] = useState(0), [tab, setTab] = useState<'USER' | 'SUPER_ADMIN'>('USER');
  const [picker, setPicker] = useState<'new' | Message | null>(null), [pickerSearch, setPickerSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null), [editText, setEditText] = useState('');
  const [menu, setMenu] = useState<{ id: string; above: boolean } | null>(null), [reactionId, setReactionId] = useState('');
  const [messageLimit, setMessageLimit] = useState(100), [recording, setRecording] = useState(false), [recordingSeconds, setRecordingSeconds] = useState(0);
  const end = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null), menuElement = useRef<HTMLDivElement>(null);
  const pending = useRef<{ signature: string; messageId: string; attachments: Attachment[] } | null>(null);
  const forwarding = useRef<{ source: string; target: string; id: string } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null), mounted = useRef(true), recordingTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const olderScroll = useRef<{ top: number; height: number } | null>(null), serial = useRef(0);
  useEffect(() => {
    serial.current++; setSelected(null); setMessages([]); setRooms([]); setContacts([]); setBusy(false); setError(''); setNotice(''); pending.current = null;
    if (recorder.current?.state === 'recording') recorder.current.stop();
    recorder.current?.stream.getTracks().forEach(track => track.stop());
    clearInterval(recordingTimer.current); setRecording(false);
  }, [user?.id]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearInterval(recordingTimer.current); if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); recorder.current.stream.getTracks().forEach(track => track.stop()); } }; }, []);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuElement.current?.contains(e.target as Node)) { setMenu(null); setReactionId(''); } };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setReactionId(''); } };
    document.addEventListener('click', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', escape); };
  }, [menu]);
  async function voiceNote() {
    if (recording) { recorder.current?.stop(); return; }
    let stream: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error(t('Voice recording is unavailable in this browser.', 'التسجيل الصوتي غير متاح في هذا المتصفح.'));
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const instance = new MediaRecorder(stream), chunks: Blob[] = [], started = Date.now(), generation = serial.current;
      recorder.current = instance;
      clearInterval(recordingTimer.current);
      recordingTimer.current = setInterval(() => { const seconds = Math.floor((Date.now() - started) / 1000); setRecordingSeconds(seconds); if (seconds >= 60 && instance.state !== 'inactive') instance.stop(); }, 250);
      instance.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      instance.onstop = async () => {
        clearInterval(recordingTimer.current); instance.stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: instance.mimeType });
        if (!mounted.current || generation !== serial.current) return;
        setRecording(false); setRecordingSeconds(0);
        if (!blob.size || blob.size > 10485760) { setError(t('Voice note must be under 10 MB.', 'يجب أن يكون التسجيل أقل من ١٠ ميجابايت.')); return; }
        setFiles(previous => [...previous.slice(0, 2), new File([blob], `voice-${Date.now()}.${instance.mimeType.includes('mp4') ? 'm4a' : 'webm'}`, { type: instance.mimeType })]);
      };
      instance.start(); setRecording(true); setRecordingSeconds(0); setError('');
    } catch (e) { stream?.getTracks().forEach(track => track.stop()); setError(backendError(e)); }
  }
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    void request<{ contacts: Contact[] }>({ operation: 'contacts' }).then(r => {
      if (!active) return;
      setContacts(r.contacts);
      if (role === 'USER' && r.contacts.length === 1) setSelected(r.contacts[0]);
    }).catch(e => { if (active) setError(backendError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, role, contactRevision]);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'supportRooms'), where('participants', 'array-contains', user.id)), snap => setRooms(snap.docs.map(d => ({ ...d.data(), id: d.id } as Room))), e => setError(backendError(e)));
  }, [user?.id]);
  useEffect(() => {
    serial.current++; setRoomId(''); setMessages([]); setText(''); setFiles([]); setReply(null); setEditing(null); setMenu(null); setMessageLimit(100); setError(''); pending.current = null;
    if (!selected) return;
    let active = true;
    void request<{ roomId: string }>({ operation: 'open', recipientId: selected.id }).then(r => { if (active) setRoomId(r.roomId); }).catch(e => { if (active) setError(backendError(e)); });
    return () => { active = false; };
  }, [selected?.id]);
  useEffect(() => {
    if (!roomId || !selected) return;
    return onSnapshot(query(collection(db, 'supportRooms', roomId, 'messages'), orderBy('createdAt', 'desc'), limit(messageLimit)), snap => {
      setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id } as Message)).reverse());
      if (document.visibilityState === 'visible') void request({ operation: 'read', recipientId: selected.id }).catch(e => setError(backendError(e)));
    }, e => setError(backendError(e)));
  }, [roomId, selected?.id, messageLimit]);
  useEffect(() => {
    if (olderScroll.current && list.current) { list.current.scrollTop = olderScroll.current.top + list.current.scrollHeight - olderScroll.current.height; olderScroll.current = null; }
    else if (!editing && !menu) end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);
  useEffect(() => {
    if (!roomId || !selected) return;
    const markRead = () => { if (document.visibilityState === 'visible') void request({ operation: 'read', recipientId: selected.id }).catch(e => setError(backendError(e))); };
    document.addEventListener('visibilitychange', markRead); return () => document.removeEventListener('visibilitychange', markRead);
  }, [roomId, selected?.id]);
  function choose(contact: Contact) { if (busy || recording) return; if (role === 'ADMIN' && ['USER', 'SUPER_ADMIN'].includes(contact.role)) setTab(contact.role as 'USER' | 'SUPER_ADMIN'); setSelected(contact); setPicker(null); setPickerSearch(''); }
  function changeTab(value: 'USER' | 'SUPER_ADMIN') { setTab(value); setSelected(null); setSearch(''); }
  async function send() {
    if (!selected || !roomId || busy || recording || (!text.trim() && !files.length)) return;
    setBusy(true); setError('');
    const generation = serial.current;
    const signature = JSON.stringify([selected.id, text, reply?.id, files.map(f => [f.name, f.size, f.lastModified])]);
    if (pending.current?.signature !== signature) pending.current = { signature, messageId: crypto.randomUUID(), attachments: [] };
    const { messageId, attachments } = pending.current;
    try {
      for (const file of files.slice(attachments.length)) {
        const path = `supportAttachments/${roomId}/${user!.id}/${messageId}-${attachments.length}`;
        const audio = await inspectAudio(file);
        await uploadBytes(ref(storage, path), file, { contentType: file.type || 'application/octet-stream' });
        attachments.push({ path, name: file.name, size: file.size, type: file.type, ...audio });
      }
      await request({ operation: 'send', recipientId: selected.id, messageId, text, files: attachments, replyToId: reply?.id ?? '' });
      pending.current = null;
      if (mounted.current && generation === serial.current) { setText(''); setFiles([]); setReply(null); }
    } catch (e) { if (mounted.current && generation === serial.current) setError(backendError(e)); } finally { if (mounted.current && generation === serial.current) setBusy(false); }
  }
  async function mutate(operation: string, message: Message, extra: Record<string, unknown> = {}) {
    if (busy || !selected) return;
    const generation = serial.current;
    setBusy(true); setError('');
    try { await request({ operation, recipientId: selected.id, messageId: message.id, ...extra }); if (mounted.current && generation === serial.current) { if (operation === 'edit') setEditing(null); setMenu(null); setReactionId(''); } }
    catch (e) { if (mounted.current && generation === serial.current) setError(backendError(e)); } finally { if (mounted.current && generation === serial.current) setBusy(false); }
  }
  async function forward(target: Contact) {
    if (!picker || picker === 'new' || !selected || busy) return;
    const source = picker;
    const generation = serial.current;
    if (forwarding.current?.source !== source.id || forwarding.current.target !== target.id) forwarding.current = { source: source.id, target: target.id, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try { await request({ operation: 'forward', recipientId: selected.id, messageId: source.id, targetId: target.id, forwardId: forwarding.current.id }); if (mounted.current && generation === serial.current) { forwarding.current = null; setPicker(null); setNotice(t('Message forwarded.', 'تم تحويل الرسالة.')); } }
    catch (e) { if (mounted.current && generation === serial.current) setError(backendError(e)); } finally { if (mounted.current && generation === serial.current) setBusy(false); }
  }
  async function copy(message: Message) {
    try { await navigator.clipboard.writeText(message.text); setNotice(t('Text copied.', 'تم نسخ النص.')); setMenu(null); }
    catch { setError(t('Clipboard access is unavailable. Select the text to copy it.', 'الحافظة غير متاحة. حدد النص لنسخه.')); }
  }
  const visibleMessages = messages.filter(m => !m.hiddenFor?.includes(user?.id ?? ''));
  const scopedContacts = contacts.filter(c => role !== 'ADMIN' || c.role === tab);
  const getRoom = (c: Contact) => rooms.find(r => r.id === roomKey(user!.id, c.id));
  const listContacts = scopedContacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && (getRoom(c) || selected?.id === c.id || role === 'USER' || c.role === 'SUPER_ADMIN')).sort((a, b) => (getRoom(b)?.updatedAt?.toMillis() ?? 0) - (getRoom(a)?.updatedAt?.toMillis() ?? 0));
  const pickerContacts = (picker === 'new' ? scopedContacts : contacts).filter(c => c.name.toLowerCase().includes(pickerSearch.toLowerCase()));
  const room = rooms.find(r => r.id === roomId), peerRead = selected && room?.readAt?.[selected.id]?.toMillis();
  return <section className={`support-chat${selected ? ' has-thread' : ''}`} dir={ar ? 'rtl' : 'ltr'}>
    <aside className="support-contacts"><header><MessageCircle size={22}/><h1>{t('Support', 'الدعم')}</h1></header>
      {role === 'SUPER_ADMIN' && <SupportAssignments onSaved={() => { setSelected(null); setContactRevision(n => n + 1); }}/>}
      {role === 'ADMIN' && <div className="support-role-tabs" role="tablist" aria-label={t('Conversation groups', 'مجموعات المحادثات')}>{(['USER', 'SUPER_ADMIN'] as const).map(value => <button type="button" role="tab" key={value} aria-selected={tab === value} disabled={busy || recording} onClick={() => changeTab(value)}>{value === 'USER' ? t('Users', 'المستخدمون') : t('Super Admin', 'المسؤول الأعلى')}<span>{contacts.filter(c => c.role === value).length}</span></button>)}</div>}
      <div className="support-search-row"><input aria-label={t('Search contacts', 'بحث جهات الاتصال')} placeholder={t('Search conversations…', 'بحث المحادثات…')} value={search} onChange={e => setSearch(e.target.value)}/><button type="button" className="support-new-chat" aria-label={t('New Chat', 'محادثة جديدة')} title={t('New Chat', 'محادثة جديدة')} disabled={busy || recording || loading} onClick={() => { setPickerSearch(''); setContactRevision(n => n + 1); setPicker('new'); }}><Plus size={20}/></button></div>
      {loading && <p role="status">{t('Loading contacts…', 'جار التحميل…')}</p>}
      {!loading && !listContacts.length && <div className="support-no-chats"><p>{!scopedContacts.length ? t('No assigned contacts in this section.', 'لا توجد جهات اتصال معيّنة في هذا القسم.') : t('No conversations yet. Start a new chat.', 'لا توجد محادثات بعد. ابدأ محادثة جديدة.')}</p>{scopedContacts.length > 0 && <button type="button" onClick={() => setPicker('new')}><Plus size={16}/>{t('New Chat', 'محادثة جديدة')}</button>}</div>}
      {listContacts.map(c => { const r = getRoom(c), unread = !!r?.lastAuthorId && r.lastAuthorId !== user?.id && r?.updatedAt && (!r.readAt?.[user!.id] || r.updatedAt.toMillis() > r.readAt[user!.id].toMillis()); return <button key={c.id} disabled={busy || recording} className={selected?.id === c.id ? 'active' : ''} onClick={() => choose(c)}><span className="support-avatar">{c.name.slice(0, 2)}</span><span><b>{c.name}</b><span className={`support-role-badge role-${c.role.toLowerCase()}`}>{roleLabel(c.role, ar)}</span><small>{r?.hiddenPreviewFor?.includes(user!.id) ? '' : r?.lastMessage}</small></span>{unread && <i className="support-unread"/>}</button>; })}
    </aside>
    <div className="support-thread">{selected ? <><header><button type="button" aria-label={t('Back to contacts', 'عودة')} onClick={() => setSelected(null)} disabled={busy || recording}><ArrowLeft size={18}/></button><span className="support-avatar">{selected.name.slice(0, 2)}</span><div><b>{selected.name}</b><small>{t('Private support conversation', 'محادثة دعم خاصة')}</small></div><span className={`support-role-badge role-${selected.role.toLowerCase()}`}>{roleLabel(selected.role, ar)}</span></header>
      <div ref={list} className="support-messages" role="log" aria-label={t('Messages', 'الرسائل')}>
        {messages.length >= messageLimit && <button type="button" className="support-load-older" onClick={() => { if (list.current) olderScroll.current = { top: list.current.scrollTop, height: list.current.scrollHeight }; setMessageLimit(n => n + 100); }}>{t('Load earlier messages', 'تحميل الرسائل السابقة')}</button>}
        {!messages.length && roomId && <p className="support-first-message">{t('Start your conversation. Messages are private to this support thread.', 'ابدأ محادثتك. الرسائل خاصة بجهات الاتصال في هذه المحادثة.')}</p>}
        {visibleMessages.map(m => { const own = m.authorId === user?.id, parent = m.replyContext && messages.find(p => p.id === m.replyContext!.id); return <article id={`message-${m.id}`} key={m.id} className={`support-message${own ? ' own' : ''}`}>
          {m.forwarded && <small className="support-forwarded"><Forward size={12}/>{t('Forwarded', 'رسالة محوّلة')}</small>}
          {m.replyContext && !m.deleted && <button type="button" className="support-quote" onClick={() => { const parentNode = document.getElementById(`message-${m.replyContext!.id}`); if (parentNode) { parentNode.scrollIntoView({ block: 'center', behavior: 'smooth' }); parentNode.classList.add('support-highlight'); setTimeout(() => parentNode.classList.remove('support-highlight'), 1400); } else { if (list.current) olderScroll.current = { top: list.current.scrollTop, height: list.current.scrollHeight }; setMessageLimit(n => n + 100); setNotice(t('Loading earlier messages. Select the reply again to jump to its parent.', 'جار تحميل الرسائل السابقة. اضغط الرد مجددًا للانتقال للرسالة الأصلية.')); } }}><b>{m.replyContext.authorName}</b>{parent?.deleted || parent?.hiddenFor?.includes(user!.id) ? t('Message unavailable', 'الرسالة غير متاحة') : parent?.text ?? m.replyContext.text}</button>}
          {editing === m.id ? <form className="support-inline-edit" onSubmit={e => { e.preventDefault(); void mutate('edit', m, { text: editText }); }}><textarea autoFocus aria-label={t('Edit message', 'تعديل الرسالة')} maxLength={5000} value={editText} onChange={e => setEditText(e.target.value)} disabled={busy}/><div><button type="button" disabled={busy} onClick={() => setEditing(null)}>{t('Cancel', 'إلغاء')}</button><button type="submit" disabled={busy || !editText.trim()}>{t('Save edit', 'حفظ التعديل')}</button></div></form> : <p>{m.deleted ? t('Message deleted', 'تم حذف الرسالة') : m.text}</p>}
          {!m.deleted && m.files.map(f => <SupportMedia file={f} key={f.path}/>)}
          {!m.deleted && Object.keys(m.reactions ?? {}).length > 0 && <div className="support-reactions">{Array.from(new Set(Object.values(m.reactions ?? {}))).map(emoji => <button type="button" key={emoji} aria-label={`${t('React', 'تفاعل')} ${emoji}`} aria-pressed={m.reactions?.[user!.id] === emoji} disabled={busy} onClick={() => void mutate('react', m, { emoji })}>{emoji} <span>{Object.values(m.reactions ?? {}).filter(e => e === emoji).length}</span></button>)}</div>}
          <footer>{m.editedAt && !m.deleted && <span>{t('edited', 'معدّلة')}</span>}<time>{m.createdAt?.toDate().toLocaleTimeString(ar ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}</time>{own && <CheckCheck size={14} className={peerRead && m.createdAt && peerRead >= m.createdAt.toMillis() ? 'read' : ''}/>}{!m.deleted && <button type="button" aria-label={t('Reply', 'رد')} disabled={busy} onClick={() => setReply(m)}><Reply size={14}/></button>}<button type="button" aria-label={t('Message actions', 'إجراءات الرسالة')} disabled={busy} onClick={e => { e.stopPropagation(); const bottom = list.current?.getBoundingClientRect().bottom ?? innerHeight; setMenu(menu?.id === m.id ? null : { id: m.id, above: e.currentTarget.getBoundingClientRect().bottom + 300 > bottom }); setReactionId(''); }}><MoreHorizontal size={16}/></button></footer>
          {menu?.id === m.id && <div ref={menuElement} className={`support-message-actions ${menu.above ? 'above' : 'below'}`} role="group" aria-label={t('Message actions', 'إجراءات الرسالة')}>
            {!m.deleted && <><button type="button" onClick={() => { setReply(m); setMenu(null); }}><Reply size={15}/>{t('Reply to message', 'الرد على الرسالة')}</button><button type="button" onClick={() => setReactionId(reactionId ? '' : m.id)}><Smile size={15}/>{t('Add reaction', 'إضافة تفاعل')}</button>{reactionId === m.id && <div className="support-emoji-picker">{emojis.map(emoji => <button type="button" key={emoji} aria-label={`${t('React', 'تفاعل')} ${emoji}`} disabled={busy} onClick={() => void mutate('react', m, { emoji })}>{emoji}</button>)}</div>}{m.text && <button type="button" onClick={() => void copy(m)}><Copy size={15}/>{t('Copy text', 'نسخ النص')}</button>}<button type="button" onClick={() => { setPicker(m); setPickerSearch(''); setMenu(null); }}><Forward size={15}/>{t('Forward message', 'تحويل الرسالة')}</button>{own && <button type="button" onClick={() => { setEditing(m.id); setEditText(m.text); setMenu(null); }}><Pencil size={15}/>{t('Edit message', 'تعديل الرسالة')}</button>}</>}
            <button type="button" disabled={busy} onClick={() => void mutate('delete', m, { scope: 'me' })}><Trash2 size={15}/>{t('Delete for me', 'حذف لدي')}</button>{own && !m.deleted && <button type="button" className="support-danger" disabled={busy} onClick={() => void mutate('delete', m, { scope: 'everyone' })}><Trash2 size={15}/>{t('Delete for everyone', 'حذف لدى الجميع')}</button>}
          </div>}
        </article>; })}<div ref={end}/>
      </div>
      {reply && <div className="support-reply"><span><b>{reply.authorName}</b>{reply.text.slice(0, 100) || t('Attachment', 'مرفق')}</span><button type="button" aria-label={t('Cancel reply', 'إلغاء الرد')} onClick={() => setReply(null)} disabled={busy}><X size={14}/></button></div>}
      {files.length > 0 && <div className="support-reply">{files.map(f => f.name).join(', ')}<button type="button" aria-label={t('Remove attachments', 'إزالة المرفقات')} onClick={() => setFiles([])} disabled={busy}><X size={14}/></button></div>}
      {recording && <div className="support-recording" role="status"><i/>{t('Recording voice note', 'تسجيل رسالة صوتية')} {formatDuration(recordingSeconds)} / 1:00</div>}
      <form className="support-composer" onSubmit={e => { e.preventDefault(); void send(); }}><label aria-label={t('Attach files', 'إرفاق ملفات')}><Paperclip size={20}/><input type="file" multiple disabled={busy || recording || !roomId} onChange={e => { const next = Array.from(e.target.files ?? []); if (next.length > 3 || next.some(f => f.size > 10485760 || !f.size)) setError(t('Choose up to 3 files, each under 10 MB.', 'اختر ٣ ملفات بحد أقصى ١٠ ميجابايت لكل ملف.')); else { setFiles(next); setError(''); } e.target.value = ''; }}/></label><textarea aria-label={t('Message', 'رسالة')} maxLength={5000} placeholder={t('Type a message…', 'اكتب رسالة…')} value={text} disabled={busy || recording || !roomId} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/><button type="button" onClick={() => void voiceNote()} disabled={busy || !roomId} aria-label={recording ? t('Stop recording', 'إيقاف التسجيل') : t('Record voice note', 'تسجيل صوتي')}>{recording ? <Square size={18}/> : <Mic size={18}/>}</button><button type="submit" disabled={recording || busy || !roomId || (!text.trim() && !files.length)} aria-label={t('Send message', 'إرسال')}><Send size={19}/></button></form>
    </> : <div className="support-empty"><MessageCircle size={48}/><h2>{t('Your support workspace', 'مساحة الدعم')}</h2><p>{t('Choose a conversation or start a new chat.', 'اختر محادثة أو ابدأ محادثة جديدة.')}</p></div>}</div>
    {error && <div className="support-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label={t('Dismiss error', 'إغلاق الخطأ')}><X size={16}/></button></div>}
    {notice && <div className="support-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label={t('Dismiss notice', 'إغلاق التنبيه')}><X size={14}/></button></div>}
    {picker && <SupportDialog title={picker === 'new' ? t('New Chat', 'محادثة جديدة') : t('Forward message', 'تحويل الرسالة')} onClose={() => { if (!busy) setPicker(null); }}><input className="support-picker-search" aria-label={t('Find a contact', 'بحث جهة اتصال')} placeholder={t('Search available contacts…', 'ابحث في جهات الاتصال المتاحة…')} value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}/><div className="support-picker-list">{pickerContacts.map(c => <button type="button" key={c.id} disabled={busy} onClick={() => picker === 'new' ? choose(c) : void forward(c)}><span className="support-avatar">{c.name.slice(0, 2)}</span><span><b>{c.name}</b><small>{roleLabel(c.role, ar)}</small></span>{picker !== 'new' && <Forward size={16}/>}</button>)}{!pickerContacts.length && <p>{t('No eligible contacts found.', 'لا توجد جهات اتصال متاحة.')}</p>}</div>{busy && <p role="status">{t('Saving…', 'جار الحفظ…')}</p>}{error && <p className="support-dialog-error" role="alert">{error}</p>}</SupportDialog>}
  </section>;
}
