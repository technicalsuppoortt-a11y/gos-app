import React from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Link2, LoaderCircle, MoreVertical, Pencil, Plus, RotateCw, Trash2, UploadCloud } from 'lucide-react';
import { Card, Dialog, Field, Select } from './primitives';
import { downloadFile, MAX_DIGITAL_FILE_SIZE, readStoredFile, uploadDigitalFile } from './files';
import type { CommerceConfig } from './model';
import type { FormProps } from './TypeForms';
import { translateText, useUILanguage } from '../../i18n/display';
import { useDigitalFieldError } from './DigitalValidation';
import './digital-editor.css';

type Asset = CommerceConfig['assets'][number];
const resourceTypes = ['Drive', 'YouTube', 'Notion', 'Dropbox', 'External Site'] as const;
export function validDeliveryUrl(value: string) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch { return false; }
}
const assetKey = (asset: Asset, index: number) => asset.id || asset.storageId || `legacy-${index}`;
export function DigitalFilesEditor({ config: c, configure, editing, busy, compact = false, paginate = true }: FormProps & { compact?: boolean; paginate?: boolean }) {
  useUILanguage();
  const [dragging, setDragging] = React.useState(false), [page, setPage] = React.useState(0);
  const [jobs, setJobs] = React.useState<Record<string, number>>({}), [uploadError, setUploadError] = React.useState('');
  const retryFiles = React.useRef(new Map<string, File>()), locks = React.useRef(new Set<string>());
  const [link, setLink] = React.useState<{ key?: string; name: string; url: string; resourceType: Asset['resourceType'] } | null>(null);
  const [linkErrors, setLinkErrors] = React.useState<string[]>([]), [removing, setRemoving] = React.useState<{ key: string; name: string } | null>(null);
  const [menu, setMenu] = React.useState<{ key: string; x: number; y: number } | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null), replacement = React.useRef<HTMLInputElement>(null), replaceKey = React.useRef('');
  const validationError = useDigitalFieldError('assets');
  const currentPage = Math.min(page, Math.max(0, Math.ceil(c.assets.length / 4) - 1));
  React.useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
    const close = () => setMenu(null), key = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null); };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key); window.addEventListener('resize', close); window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [menu]);
  function changeAsset(key: string, patch: Partial<Asset>) { configure(current => ({ assets: current.assets.map((asset, index) => assetKey(asset, index) === key ? { ...asset, ...patch } : asset) })); }
  async function transfer(file: File, key: string) {
    if (locks.current.has(key)) return;
    locks.current.add(key); retryFiles.current.set(key, file); busy(true); setJobs(current => ({ ...current, [key]: 0 }));
    changeAsset(key, { uploadError: '' });
    try {
      const asset = await uploadDigitalFile(file, progress => setJobs(current => ({ ...current, [key]: progress })));
      configure(current => ({ assets: current.assets.map((existing, index) => assetKey(existing, index) === key ? { ...asset, id: key } : existing) }));
      retryFiles.current.delete(key);
    } catch (cause) { changeAsset(key, { uploadError: cause instanceof Error ? cause.message : 'Cloud upload failed. Please try again.' }); }
    finally { locks.current.delete(key); setJobs(current => { const next = { ...current }; delete next[key]; return next; }); busy(false); }
  }
  async function upload(files: FileList | null) {
    if (!editing || !files?.length) return;
    const candidates = Array.from(files);
    if (candidates.some(file => !/\.(zip|pdf|mp4|png|jpe?g|webp|txt|csv|doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name) || !file.size || file.size > MAX_DIGITAL_FILE_SIZE)) { setUploadError('Choose supported, non-empty files up to 100 MB each.'); return; }
    setUploadError('');
    const pending = candidates.map(file => ({ file, id: crypto.randomUUID() }));
    configure(current => ({ assets: [...current.assets, ...pending.map(({ file, id }) => ({ id, name: file.name, url: '', size: file.size, mime: file.type }))] }));
    await Promise.all(pending.map(({ file, id }) => transfer(file, id)));
  }
  async function recover(asset: Asset, key: string) {
    const file = retryFiles.current.get(key);
    if (file) { await transfer(file, key); return; }
    if (asset.storageId?.startsWith('local-')) {
      busy(true);
      try { const blob = await readStoredFile(asset.storageId); await transfer(new File([blob], asset.name, { type: blob.type }), key); }
      catch { changeAsset(key, { uploadError: 'This browser attachment has expired. Choose Replace file to upload it again.' }); }
      finally { busy(false); }
    } else { replaceKey.current = key; replacement.current?.click(); }
  }
  function openLink(asset?: Asset, key?: string) { setMenu(null); setLinkErrors([]); setLink({ key, name: asset?.name || '', url: asset?.storageId?.startsWith('local-') ? '' : asset?.url || '', resourceType: asset?.resourceType || 'External Site' }); }
  function saveLink(event: React.FormEvent) {
    event.preventDefault(); if (!link) return;
    const errors = [!link.name.trim() ? 'Enter a link title.' : '', !validDeliveryUrl(link.url.trim()) ? 'Enter a valid HTTP or HTTPS delivery URL without login credentials.' : ''].filter(Boolean);
    setLinkErrors(errors); if (errors.length) return;
    const asset: Asset = { id: link.key || crypto.randomUUID(), name: link.name.trim(), url: new URL(link.url.trim()).href, resourceType: link.resourceType };
    configure(current => ({ assets: link.key ? current.assets.map((item, index) => assetKey(item, index) === link.key ? asset : item) : [...current.assets, asset] }));
    setPage(Math.floor(c.assets.length / 4)); setLink(null);
  }
  const selected = menu ? c.assets.find((a, index) => assetKey(a, index) === menu.key) : null;
  return <>
    <Card validationField="assets" title={translateText('Digital Files / Assets *')} className={`${compact ? 'dw-files-card ' : ''}dv-files${validationError ? ' dv-invalid' : ''}`} action={<div className="dw-card-actions">{paginate && c.assets.length > 4 && <div className="dw-pagination"><button disabled={!currentPage} onClick={() => setPage(currentPage - 1)} aria-label={translateText('Previous files')}>‹</button><span>{currentPage + 1}/{Math.ceil(c.assets.length / 4)}</span><button disabled={(currentPage + 1) * 4 >= c.assets.length} onClick={() => setPage(currentPage + 1)} aria-label={translateText('Next files')}>›</button></div>}{editing && <button className="cw-text-link" onClick={() => openLink()}><Plus size={12}/>{translateText('Add link')}</button>}</div>}>
      <div className="tw-files-grid"><label className={`tw-file-drop${dragging ? ' dragging' : ''}`} aria-busy={Object.keys(jobs).length > 0} onDragOver={event => { event.preventDefault(); if (editing) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files); }}>
        {Object.keys(jobs).length ? <LoaderCircle size={28} className="dv-spinner"/> : <UploadCloud size={28}/>}<b>{translateText(Object.keys(jobs).length ? 'Uploading files…' : 'Upload your files')}</b><span>{translateText('Drag & drop files here or click to browse')}</span><small>{translateText('ZIP, PDF, MP4, images and office files · Max 100 MB each')}</small>
        {!!Object.keys(jobs).length && <div className="dv-upload-progress" role="status">{translateText('Uploading file…')} {Math.round(Object.values(jobs).reduce((sum, n) => sum + n, 0) / Object.keys(jobs).length)}%<progress max="100" value={Object.values(jobs).reduce((sum, n) => sum + n, 0) / Object.keys(jobs).length}/></div>}
        <input type="file" aria-label={translateText('Upload digital files')} multiple disabled={!editing} accept=".zip,.pdf,.mp4,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={event => { void upload(event.target.files); event.target.value = ''; }}/>
      </label><div className="tw-file-list">{!c.assets.length && <p className="cw-help">{translateText('No files added yet.')}</p>}
        {(compact && paginate ? c.assets.slice(currentPage * 4, currentPage * 4 + 4) : c.assets).map((asset, localIndex) => {
          const index = compact && paginate ? currentPage * 4 + localIndex : localIndex, key = assetKey(asset, index), progress = jobs[key], local = asset.storageId?.startsWith('local-');
          return <div key={key} className={`tw-file-item${asset.uploadError || local || !asset.url && !asset.storageId ? ' dv-file-unresolved' : ''}`}>
            {asset.resourceType ? <Link2 size={18}/> : <FileText size={18}/>}<span>{editing && asset.storageId ? <input aria-label={translateText(`File ${index + 1} name`)} disabled={progress !== undefined} value={asset.name} onChange={event => changeAsset(key, { name: event.target.value })}/> : <b>{asset.name || translateText('Untitled asset')}</b>}<small>{progress !== undefined ? `${translateText('Uploading file…')} ${progress}%` : local ? translateText('Browser attachment · Cloud upload required') : asset.resourceType || (asset.size ? `${(asset.size / 1024 / 1024).toFixed(1)} MB` : translateText('Delivery link'))}</small>{asset.uploadError && <small className="dv-error" role="alert">{asset.uploadError}</small>}{progress !== undefined && <progress aria-label={translateText(`Upload progress for ${asset.name}`)} max="100" value={progress}/>}</span>
            {editing && progress === undefined && (asset.uploadError || local || !asset.url && !asset.storageId) && <button className="cw-icon-button" aria-label={translateText(`Retry cloud upload for ${asset.name}`)} onClick={() => void recover(asset, key)}><RotateCw size={14}/></button>}
            <button className="cw-icon-button" aria-label={translateText(`Download ${asset.name}`)} disabled={progress !== undefined || !asset.storageId && !validDeliveryUrl(asset.url)} onClick={async () => { try { if (asset.storageId) await downloadFile(asset.storageId, asset.name); else window.open(asset.url, '_blank', 'noopener,noreferrer'); } catch (cause) { setUploadError(cause instanceof Error ? cause.message : 'Download failed.'); } }}><Download size={13}/></button>
            {editing && <button className="cw-icon-button" aria-label={translateText(`File actions for ${asset.name || 'file'}`)} aria-expanded={menu?.key === key} aria-haspopup="menu" disabled={progress !== undefined} onClick={event => { const box = event.currentTarget.getBoundingClientRect(); setMenu(menu?.key === key ? null : { key, x: Math.max(8, Math.min(window.innerWidth - 208, box.right - 200)), y: Math.min(box.bottom + 5, window.innerHeight - 170) }); }}><MoreVertical size={14}/></button>}
          </div>;
        })}</div></div>
      {uploadError && <p role="alert" className="dv-error">{uploadError}</p>}{validationError && <p role="alert" className="dv-error">{validationError}</p>}
      <input ref={replacement} hidden type="file" aria-label={translateText('Replace digital file')} onChange={event => { const file = event.target.files?.[0]; if (file) { if (!file.size || file.size > MAX_DIGITAL_FILE_SIZE) setUploadError('Choose a non-empty file up to 100 MB.'); else void transfer(file, replaceKey.current); } event.target.value = ''; }}/>
    </Card>
    {menu && selected && createPortal(<div ref={menuRef} role="menu" className="dv-file-actions" style={{ left: menu.x, top: menu.y }}>{!selected.storageId && <button role="menuitem" onClick={() => openLink(selected, menu.key)}><Pencil size={14}/>{translateText('Edit link')}</button>}<button role="menuitem" onClick={() => { replaceKey.current = menu.key; setMenu(null); replacement.current?.click(); }}><UploadCloud size={14}/>{translateText('Replace file')}</button>{selected.storageId?.startsWith('local-') && <button role="menuitem" onClick={() => openLink(selected, menu.key)}><Link2 size={14}/>{translateText('Replace with delivery link')}</button>}<button role="menuitem" className="dv-destructive" onClick={() => { setRemoving({ key: menu.key, name: selected.name }); setMenu(null); }}><Trash2 size={14}/>{translateText('Remove file')}</button></div>, document.body)}
    {link && <Dialog title={translateText('Add External Asset / Delivery Link')} onClose={() => setLink(null)}><form noValidate onSubmit={saveLink}><Field label="Link Title *"><input autoFocus aria-label={translateText('Link Title')} maxLength={160} value={link.name} className={linkErrors.length && !link.name.trim() ? 'dv-input-error' : ''} onChange={event => setLink({ ...link, name: event.target.value })} placeholder={translateText('Google Drive Master Folder')}/></Field><Field label="Delivery URL *"><input type="url" aria-label={translateText('Delivery URL')} value={link.url} className={linkErrors.length && !validDeliveryUrl(link.url) ? 'dv-input-error' : ''} onChange={event => setLink({ ...link, url: event.target.value })} placeholder="https://drive.google.com/..."/></Field><Field label="Resource Type"><Select value={link.resourceType || 'External Site'} options={resourceTypes} onChange={value => setLink({ ...link, resourceType: value as Asset['resourceType'] })}/></Field>{linkErrors.map(message => <p className="dv-error" role="alert" key={message}>{translateText(message)}</p>)}<div className="dv-dialog-actions"><button type="button" className="cw-button" onClick={() => setLink(null)}>{translateText('Cancel')}</button><button type="submit" className="cw-button primary">{translateText('Save link')}</button></div></form></Dialog>}
    {removing && <Dialog title={translateText('Remove asset?')} onClose={() => setRemoving(null)}><p>{translateText('Remove')} <strong>{removing.name || translateText('this asset')}</strong> {translateText('from this product? You can add it again later.')}</p><div className="dv-dialog-actions"><button className="cw-button" onClick={() => setRemoving(null)}>{translateText('Cancel')}</button><button className="cw-button dv-remove-button" onClick={() => { configure(current => ({ assets: current.assets.filter((a, index) => assetKey(a, index) !== removing.key) })); retryFiles.current.delete(removing.key); setRemoving(null); }}>{translateText('Remove asset')}</button></div></Dialog>}
  </>;
}
