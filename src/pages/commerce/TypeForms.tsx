import { SlotChips, PageSelector } from './DynamicCheckoutControls';
import { ProductAdvancedAction } from './ProductAdvancedAction';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React from 'react';
import { ArrowDown, ArrowUp, BookOpen, CalendarDays, Check, Download, FileArchive, FileImage, FileText, FileType, FileVideo, GripVertical, ImagePlus, Layers3, MapPin, MonitorPlay, MoreVertical, Plus, Trash2, UploadCloud, UserRound, Video } from 'lucide-react';
import type { CommerceConfig, Product, ProductExperience } from './model';
import { lessonData, productKind } from './model';
import { downloadFile, storeFile } from './files';
import { Card, Description, Field, RichDescription, Select, Toggle } from './primitives';
import { ProviderSelect, ServiceCustomerPreview, ServiceDescription, ServiceGallery, ServiceInformation } from './ServiceWorkspace';
export interface FormProps {
  product: Product; config: CommerceConfig; experience: ProductExperience; products: Product[]; editing: boolean;
  update: (patch: Partial<Product>) => void; configure: (patch: Partial<CommerceConfig> | ((config: CommerceConfig) => Partial<CommerceConfig>)) => void;
  customize: (patch: Partial<ProductExperience>) => void; error: (message: string) => void; busy: (value: boolean) => void;
}

export function InformationForm(props: FormProps) {
  useUILanguage();
  const { product: p, experience: e, editing, update, customize } = props;
  const kind = productKind(p.type);
  if (kind === 'service') return <ServiceInformation {...props}/>;
  const label = kind === 'course' ? 'Course Title' : 'Product Name';
  return <Card title={translateText(kind === 'course' ? 'Course Information' : kind === 'subscription' ? 'Subscription Information' : kind === 'bundle' ? 'Bundle Information' : 'Product Information')}>
    {localizeNode(editing ? <><div><Field label={`${label} *`}><input value={p.name} maxLength={140} onChange={event => update({ name: event.target.value })} placeholder={translateText(`Enter your ${kind === 'course' ? 'course title' : 'product name'}`)}/></Field></div><Field label="Short Description"><textarea rows={2} maxLength={300} value={e.shortDescription} onChange={event => customize({ shortDescription: event.target.value })} placeholder={translateText("A short introduction to your offer")}/></Field><PageSelector product={p} config={props.config} configure={props.configure} editing={editing} kind="sales"/><div className="tw-field-heading">{translateText("Full Description")}</div><RichDescription value={p.description} onChange={description => update({ description })}/></> : <div className="cw-review"><div><span>{localizeNode(label)}</span><b>{localizeNode(p.name)}</b></div><div><span>{translateText("Product Type")}</span><b>{localizeNode(p.type)}</b></div><div><span>{translateText("Short Description")}</span><b>{localizeNode(e.shortDescription || p.description)}</b></div><div><span>{translateText("Tags")}</span><div className="tw-tags">{localizeNode(e.tags.length ? e.tags.map(tag => <span key={tag}>{localizeNode(tag)}</span>) : <small>{translateText("No tags added")}</small>)}</div></div></div>)}
  </Card>;
}
export function DescriptionCard({ product, editing, update }: FormProps) {
  useUILanguage();
  if (productKind(product.type) === 'service') return <ServiceDescription {...{ product, editing, update }}/>;
  return <Card title={translateText("Product Description")}>{localizeNode(editing ? <RichDescription value={product.description} onChange={description => update({ description })}/> : <Description text={product.description || 'Add a description for this offer.'}/>)}</Card>;
}
async function readImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP image under 2 MB.');
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read this image.')); reader.readAsDataURL(file); });
}
export function DigitalHeadingCover({ product, editing, update, error, busy }: FormProps) {
  useUILanguage();
  async function upload(file?: File) {
    if (!file) return;
    busy(true);
    try { update({ image: await readImage(file) }); }
    catch (cause) { error(cause instanceof Error ? cause.message : 'Could not read image.'); }
    finally { busy(false); }
  }
  return <label className={`dw-heading-cover${editing ? '' : ' read-only'}`}>
    {product.image ? <img className="tw-heading-image" src={product.image} alt={translateText(product.name || 'Digital product cover')}/> : <div className="tw-heading-image tw-heading-placeholder"><ImagePlus size={22}/></div>}
    <span><ImagePlus size={10}/>{translateText("Change")}</span>
    <input type="file" aria-label={translateText("Change product thumbnail")} disabled={!editing} accept="image/jpeg,image/png,image/webp" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }}/>
  </label>;
}
export function MediaCard({ product: p, experience: e, editing, update, customize, error, busy, compact = false, title }: FormProps & { compact?: boolean; title?: string }) {
  useUILanguage();
  const kind = productKind(p.type), [selected, setSelected] = React.useState(0), [mediaMenu, setMediaMenu] = React.useState(false);
  const images = [p.image, ...e.gallery].filter((image): image is string => !!image);
  async function upload(files: FileList | null, cover: boolean) {
    if (!files?.length) return; busy(true);
    try {
      const images = await Promise.all(Array.from(files).slice(0, cover ? 1 : 4).map(readImage));
      if (cover || !p.image) { update({ image: images[0] }); customize({ gallery: [...e.gallery, ...images.slice(1)].slice(0, 6) }); setSelected(0); }
      else customize({ gallery: [...e.gallery, ...images].slice(0, 6) });
    } catch (cause) { error(cause instanceof Error ? cause.message : 'Image upload failed.'); } finally { busy(false); }
  }
  if (kind === 'service') return <ServiceGallery {...{ product: p, experience: e, editing, update, customize, error, busy }}/>;
  return <Card title={translateText(title ?? (kind === 'course' ? 'Course Cover' : 'Product Images'))} action={(editing || compact) && <><label className="tw-upload-link"><ImagePlus size={13}/> {localizeNode(compact ? 'Change Cover' : p.image ? 'Change Cover' : 'Add Cover')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!editing} onChange={event => { void upload(event.target.files, true); event.target.value = ''; }}/></label>{localizeNode(compact && <div className="dw-media-menu"><button className="cw-icon-button" aria-label={translateText("Product image actions")} aria-expanded={mediaMenu} onClick={() => setMediaMenu(!mediaMenu)}><MoreVertical size={12}/></button>{localizeNode(mediaMenu && <div><button disabled={!editing || !images.length} onClick={() => { const index = Math.min(selected, images.length - 1); update({ image: images[index] }); customize({ gallery: images.filter((_, i) => i !== index) }); setSelected(0); setMediaMenu(false); }}>{translateText("Set selected image as cover")}</button><button disabled={!editing || !p.image} onClick={() => { update({ image: undefined }); setSelected(0); setMediaMenu(false); }}>{translateText("Remove cover")}</button></div>)}</div>)}</>}>
    <div className="tw-media-cover">{localizeNode(images.length ? <img src={images[Math.min(selected, images.length - 1)]} alt={translateText(`${p.name || p.type} cover`)}/> : <div><ImagePlus size={32}/><span>{localizeNode(kind === 'course' ? 'Upload your course cover' : 'Add product images')}</span><small>{translateText("JPG, PNG or WebP · Up to 2 MB each")}</small></div>)}</div>
    <div className="tw-gallery">{localizeNode(images.map((image, index) => <div key={index}><button className={selected === index ? 'selected' : ''} aria-label={translateText(`View image ${index + 1}`)} onClick={() => setSelected(index)}><img src={image} alt={translateText(`Product image ${index + 1}`)}/></button>{localizeNode(editing && <button className="tw-remove-image" aria-label={translateText(`Remove image ${index + 1}`)} onClick={() => { if (index === 0 && p.image) update({ image: undefined }); else customize({ gallery: e.gallery.filter((_, i) => i !== index - (p.image ? 1 : 0)) }); setSelected(0); }}><Trash2 size={10}/></button>)}</div>))}{localizeNode((editing || compact) && images.length < 7 && <label className="tw-add-media"><Plus size={16}/><span>{localizeNode(kind === 'course' ? 'Add Thumbnail' : 'Add Images')}</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={!editing} onChange={event => { void upload(event.target.files, false); event.target.value = ''; }}/></label>)}</div>
  </Card>;
}
export function InstructorCard({ experience: e, customize, editing, error, busy }: FormProps) {
  useUILanguage();
  async function photo(file?: File) { if (!file) return; busy(true); try { customize({ instructor: { ...e.instructor, image: await readImage(file) } }); } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not read image.'); } finally { busy(false); } }
  return <Card title={translateText("Instructor")}><div className="tw-instructor">{localizeNode(e.instructor.image ? <img src={e.instructor.image} alt={translateText(e.instructor.name || 'Instructor')}/> : <div className="tw-instructor-avatar"><UserRound size={24}/></div>)}<div>{localizeNode(editing ? <><Field label="Instructor Name"><input value={e.instructor.name} onChange={event => customize({ instructor: { ...e.instructor, name: event.target.value } })} placeholder={translateText("Instructor name")}/></Field><Field label="Bio"><textarea rows={2} value={e.instructor.bio} onChange={event => customize({ instructor: { ...e.instructor, bio: event.target.value } })}/></Field></> : <><b>{localizeNode(e.instructor.name || 'Instructor not assigned')}</b><p>{localizeNode(e.instructor.bio || 'Add an instructor profile and introduction.')}</p></>)}</div></div>{localizeNode(editing && <label className="tw-upload-link"><ImagePlus size={13}/>{translateText(" Change profile photo")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void photo(event.target.files?.[0]); event.target.value = ''; }}/></label>)}</Card>;
}
export function CourseBuilder({ config: c, configure, editing, error, busy }: FormProps) {
  useUILanguage();
  const dragged = React.useRef<{ module: number; lesson?: number } | null>(null);
  const [uploading, setUploading] = React.useState(false);
  function drop(moduleIndex: number, lessonIndex?: number) {
    const source = dragged.current; dragged.current = null;
    if (!editing || !source) return;
    configure(current => {
      const modules = current.modules.map(module => ({ ...module, lessons: [...module.lessons] }));
      if (source.lesson === undefined && lessonIndex === undefined) {
        const [module] = modules.splice(source.module, 1); modules.splice(moduleIndex, 0, module);
      } else if (source.lesson !== undefined) {
        const [lesson] = modules[source.module].lessons.splice(source.lesson, 1);
        modules[moduleIndex].lessons.splice(lessonIndex ?? modules[moduleIndex].lessons.length, 0, lesson);
      }
      return { modules };
    });
  }
  function moveLesson(module: number, lesson: number, direction: number) { dragged.current = { module, lesson }; drop(module, lesson + direction); }
  async function attach(moduleIndex: number, lessonId: string, file?: File) {
    if (!file || uploading) return;
    if (!/\.(pdf|mp4|webm|mov)$/i.test(file.name) || file.size > 5 * 1024 * 1024 * 1024) { error('Choose a PDF or video file up to 5 GB.'); return; }
    setUploading(true); busy(true);
    try {
      const storageId = await storeFile(file);
      configure(current => ({ modules: current.modules.map((module, i) => i === moduleIndex ? { ...module, lessons: module.lessons.map((value, j) => { const lesson = lessonData(value, j); return lesson.id === lessonId ? { ...lesson, storageId, fileName: file.name, kind: /\.pdf$/i.test(file.name) ? 'PDF' as const : 'Video' as const } : value; }) } : module) }));
    } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not attach lesson file.'); }
    finally { setUploading(false); busy(false); }
  }
  function addModule() { configure({ modules: [...c.modules, { title: `Module ${c.modules.length + 1}`, lessons: [] }] }); }
  function addLesson(index: number) { configure({ modules: c.modules.map((module, i) => i === index ? { ...module, lessons: [...module.lessons, { id: crypto.randomUUID(), title: '', kind: 'Video', duration: '', url: '' }] } : module) }); }
  function changeLesson(moduleIndex: number, lessonIndex: number, patch: Partial<ReturnType<typeof lessonData>>) { configure({ modules: c.modules.map((module, i) => i === moduleIndex ? { ...module, lessons: module.lessons.map((lesson, j) => j === lessonIndex ? { ...lessonData(lesson, j), ...patch } : lesson) } : module) }); }
  function moveModule(index: number, direction: number) { const modules = [...c.modules]; [modules[index], modules[index + direction]] = [modules[index + direction], modules[index]]; configure({ modules }); }
  return <Card title={translateText("Course Content")} subtitle="Organize your curriculum into modules and lessons." action={editing && <button className="cw-button small" onClick={addModule}><Plus size={13}/>{translateText(" Add Module")}</button>} className="tw-span-all">
    {localizeNode(!c.modules.length && <div className="cw-empty-content"><BookOpen size={26}/><p>{translateText("Build your curriculum with modules and lessons.")}</p>{localizeNode(editing && <button className="cw-button" onClick={addModule}><Plus size={14}/>{translateText(" Add Module")}</button>)}</div>)}
    {c.modules.map((module, index) => <div className="tw-course-module" key={index}><div className="tw-module-heading" onDragOver={event => { if (editing) event.preventDefault(); }} onDrop={event => { event.preventDefault(); drop(index); }}><span draggable={editing} title={translateText("Drag to reorder module")} onDragStart={event => { dragged.current = { module: index }; event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { dragged.current = null; }}><GripVertical size={14}/></span><BookOpen size={18}/>{localizeNode(editing ? <input aria-label={translateText(`Module ${index + 1} title`)} value={module.title} onChange={event => configure({ modules: c.modules.map((m, i) => i === index ? { ...m, title: event.target.value } : m) })}/> : <b>{localizeNode(module.title)}</b>)}<small>{localizeNode(module.lessons.length)}{translateText(" lessons")}</small>{localizeNode(editing && <><button className="cw-icon-button" disabled={index === 0} aria-label={translateText(`Move module ${index + 1} up`)} onClick={() => moveModule(index, -1)}><ArrowUp size={12}/></button><button className="cw-icon-button" disabled={index === c.modules.length - 1} aria-label={translateText(`Move module ${index + 1} down`)} onClick={() => moveModule(index, 1)}><ArrowDown size={12}/></button><button className="cw-icon-button" aria-label={translateText(`Remove module ${index + 1}`)} onClick={() => configure({ modules: c.modules.filter((_, i) => i !== index) })}><Trash2 size={12}/></button><button className="cw-button small" onClick={() => addLesson(index)}><Plus size={13}/>{translateText(" Add Lesson")}</button></>)}</div>{module.lessons.map((value, j) => { const lesson = lessonData(value, j), Icon = lesson.kind === 'Video' ? Video : FileText; return <div className="tw-lesson" key={lesson.id} onDragOver={event => { if (editing) event.preventDefault(); }} onDrop={event => { event.preventDefault(); event.stopPropagation(); drop(index, j); }}>{localizeNode(editing && <span draggable title={translateText("Drag to reorder lesson")} onDragStart={event => { dragged.current = { module: index, lesson: j }; event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { dragged.current = null; }}><GripVertical size={12}/></span>)}<Icon size={15}/>{localizeNode(editing ? <div className="tw-lesson-fields"><input aria-label={translateText(`Lesson ${j + 1} title`)} placeholder={translateText("Lesson title")} value={lesson.title} onChange={event => changeLesson(index, j, { title: event.target.value })}/><label className="tw-lesson-kind"><span className="sr-only">{translateText("Lesson ")}{localizeNode(j + 1)}{translateText(" format")}</span><Select value={lesson.kind} options={['Video', 'PDF', 'Text']} onChange={kind => changeLesson(index, j, { kind: kind as typeof lesson.kind })}/></label><input aria-label={translateText(lesson.kind === 'Video' ? 'Video duration' : 'File size')} placeholder={translateText(lesson.kind === 'Video' ? '08:24' : '2.4 MB')} value={lesson.duration} onChange={event => changeLesson(index, j, { duration: event.target.value })}/><input className="tw-lesson-url" type="url" aria-label={translateText(`Lesson ${j + 1} resource URL`)} placeholder={translateText("Video or resource URL · https://")} value={lesson.url} onChange={event => changeLesson(index, j, { url: event.target.value })}/><label className="tw-upload-link"><UploadCloud size={12}/>{localizeNode(uploading ? 'Uploading…' : lesson.fileName || 'Attach PDF / Video')}<input type="file" aria-label={translateText(`Attach file to lesson ${j + 1}`)} disabled={uploading} accept=".pdf,.mp4,.webm,.mov" onChange={event => { void attach(index, lesson.id, event.target.files?.[0]); event.target.value = ''; }}/></label></div> : <><span>{localizeNode(j + 1)}. {localizeNode(lesson.title)}</span><em className={`tw-lesson-badge ${lesson.kind.toLowerCase()}`}><Icon size={10}/>{localizeNode(lesson.kind)}</em><small>{localizeNode(lesson.duration)}</small></>)}{!editing && lesson.storageId && <button className="cw-icon-button" aria-label={translateText(`Download ${lesson.fileName || lesson.title}`)} onClick={() => { void downloadFile(lesson.storageId!, lesson.fileName || lesson.title).catch(cause => error(cause instanceof Error ? cause.message : 'Could not download file.')); }}><Download size={12}/></button>}{localizeNode(editing && <><button className="cw-icon-button" aria-label={translateText(`Move lesson ${j + 1} up`)} disabled={j === 0} onClick={() => moveLesson(index, j, -1)}><ArrowUp size={12}/></button><button className="cw-icon-button" aria-label={translateText(`Move lesson ${j + 1} down`)} disabled={j === module.lessons.length - 1} onClick={() => moveLesson(index, j, 1)}><ArrowDown size={12}/></button><button className="cw-icon-button" aria-label={translateText(`Remove lesson ${j + 1}`)} onClick={() => configure({ modules: c.modules.map((m, i) => i === index ? { ...m, lessons: m.lessons.filter((_, li) => li !== j) } : m) })}><Trash2 size={12}/></button></>)}</div>; })}</div>)}
  </Card>;
}
function digitalFileIcon(name: string) {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'zip') return FileArchive;
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension ?? '')) return FileImage;
  if (extension === 'mp4') return FileVideo;
  if (extension === 'txt') return FileType;
  return FileText;
}
export function DigitalFiles({ config: c, configure, editing, error, busy, compact = false, paginate = true }: FormProps & { compact?: boolean; paginate?: boolean }) {
  useUILanguage();
  const [dragging, setDragging] = React.useState(false), [uploading, setUploading] = React.useState(false);
  const [page, setPage] = React.useState(0), [fileMenu, setFileMenu] = React.useState<number | null>(null);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(c.assets.length / 4) - 1));
  async function upload(files: FileList | null) {
    if (!files?.length || uploading) return;
    const candidates = Array.from(files), allowed = /\.(zip|pdf|mp4|png|jpe?g|webp|txt|csv|doc|docx|xls|xlsx|ppt|pptx)$/i;
    if (candidates.some(file => !allowed.test(file.name) || file.size > 5 * 1024 * 1024 * 1024)) { error('Upload ZIP, PDF, MP4, images, text or office files up to 5 GB each.'); return; }
    setUploading(true); busy(true);
    try {
      const assets: CommerceConfig['assets'] = [];
      for (const file of candidates) assets.push({ name: file.name, url: '', storageId: await storeFile(file), size: file.size, mime: file.type });
      configure(current => ({ assets: [...current.assets, ...assets] }));
    } catch (cause) { error(cause instanceof Error ? cause.message : 'File upload failed.'); } finally { setUploading(false); busy(false); }
  }
  async function download(asset: CommerceConfig['assets'][number]) { try { if (asset.storageId) await downloadFile(asset.storageId, asset.name); else if (/^https?:\/\//i.test(asset.url)) window.open(asset.url, '_blank', 'noopener,noreferrer'); } catch (cause) { error(cause instanceof Error ? cause.message : 'Download failed.'); } }
  return <Card title={translateText("Digital Files")} className={compact ? 'dw-files-card' : ''} action={compact && <div className="dw-card-actions">{localizeNode(paginate && c.assets.length > 4 && <div className="dw-pagination"><button aria-label={translateText("Previous files")} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>‹</button><span>{localizeNode(currentPage + 1)}/{localizeNode(Math.ceil(c.assets.length / 4))}</span><button aria-label={translateText("Next files")} disabled={(currentPage + 1) * 4 >= c.assets.length} onClick={() => setPage(currentPage + 1)}>›</button></div>)}{localizeNode(editing && <button className="cw-text-link" onClick={() => { setPage(Math.floor(c.assets.length / 4)); configure({ assets: [...c.assets, { name: '', url: '' }] }); }}><Plus size={10}/>{translateText("Add link")}</button>)}</div>} subtitle={compact ? undefined : "Upload the files your customers receive after purchase."}><div className={`tw-files-grid${editing ? '' : ' read-only'}`}>
    {localizeNode((editing || compact) && <label className={`tw-file-drop${dragging ? ' dragging' : ''}`} onDragOver={event => { event.preventDefault(); if (editing) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (editing) void upload(event.dataTransfer.files); }}><UploadCloud size={30}/><b>{localizeNode(uploading ? 'Uploading files…' : 'Upload your files')}</b><span>{translateText("Drag & drop files here or click to browse")}</span><small>{translateText("Supports ZIP, PDF, MP4, PNG, DOC, etc. Max 5GB")}</small><input type="file" multiple disabled={uploading || !editing} accept=".zip,.pdf,.mp4,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={event => { void upload(event.target.files); event.target.value = ''; }}/></label>)}
    <div className="tw-file-list">{localizeNode(!c.assets.length && <p className="cw-help">{translateText("No files added yet.")}</p>)}{localizeNode((compact && paginate ? c.assets.slice(currentPage * 4, currentPage * 4 + 4) : c.assets).map((asset, localIndex) => { const index = compact && paginate ? currentPage * 4 + localIndex : localIndex, FileIcon = compact ? digitalFileIcon(asset.name) : FileText; return <div className="tw-file-item" key={asset.storageId ?? index}><FileIcon size={19} className={compact ? `dw-file-icon dw-file-${asset.name.split('.').pop()?.toLowerCase()}` : undefined}/><span>{localizeNode(editing ? <input aria-label={translateText(`File ${index + 1} name`)} value={asset.name} onChange={event => configure({ assets: c.assets.map((a, i) => i === index ? { ...a, name: event.target.value } : a) })}/> : <b>{localizeNode(asset.name)}</b>)}<small>{localizeNode(asset.size ? asset.size < 1024 * 1024 ? `${Number((asset.size / 1024).toFixed(1))} KB` : `${Number((asset.size / 1024 / 1024).toFixed(1))} MB` : 'Delivery link')} · {localizeNode(asset.name.split('.').pop()?.toUpperCase())}</small>{localizeNode(editing && !compact && !asset.storageId && <input type="url" aria-label={translateText(`File ${index + 1} delivery URL`)} placeholder={translateText("https://")} value={asset.url} onChange={event => configure({ assets: c.assets.map((a, i) => i === index ? { ...a, url: event.target.value } : a) })}/>)}</span><button className="cw-icon-button" aria-label={translateText(`Download ${asset.name}`)} disabled={!asset.storageId && !asset.url} onClick={() => { void download(asset); }}><Download size={13}/></button>{localizeNode(editing && !compact && <button className="cw-icon-button" aria-label={translateText(`Remove ${asset.name || 'file'}`)} onClick={() => configure({ assets: c.assets.filter((_, i) => i !== index) })}><Trash2 size={13}/></button>)}{localizeNode(editing && compact && <div className="dw-file-menu"><button className="cw-icon-button" aria-label={translateText(`File actions for ${asset.name || 'file'}`)} aria-expanded={fileMenu === index} onClick={() => setFileMenu(fileMenu === index ? null : index)}><MoreVertical size={13}/></button>{localizeNode(fileMenu === index && <div>{localizeNode(!asset.storageId && <input type="url" aria-label={translateText(`File ${index + 1} delivery URL`)} value={asset.url} placeholder={translateText("https://")} onChange={event => configure({ assets: c.assets.map((a, i) => i === index ? { ...a, url: event.target.value } : a) })}/>)}<button onClick={() => { configure({ assets: c.assets.filter((_, i) => i !== index) }); setFileMenu(null); }}>{translateText("Remove file")}</button></div>)}</div>)}</div>; }))}</div></div>{localizeNode(editing && !compact && <button className="cw-text-link" onClick={() => configure({ assets: [...c.assets, { name: '', url: '' }] })}><Plus size={13}/>{translateText(" Add a delivery link")}</button>)}</Card>;
}
export function AccessForm(props: FormProps) { const { config: c, experience: e, configure, customize, editing, product } = props;
  useUILanguage();
  const kind = productKind(product.type);
  return <Card title={translateText(kind === 'digital' ? 'Access & Download Settings' : kind === 'course' ? 'Student Limits & Access' : 'Access & Delivery')} action={<ProductAdvancedAction {...props} section="access"/>}>
    {localizeNode(kind === 'digital' && <><Toggle label="Allow direct download after purchase" checked={e.directDownload} disabled={!editing} onChange={directDownload => customize({ directDownload })}/><Toggle label="Watermark files" checked={e.watermark} disabled={!editing} onChange={watermark => customize({ watermark })} hint="Request a customer watermark on supported files at delivery."/></>)}
    <Toggle label="Require account login" checked={e.requireLogin} disabled={!editing} onChange={requireLogin => customize({ requireLogin })}/>
    <div className="cw-form-grid"><Field label="Access duration"><Select disabled={!editing} value={c.access} options={['Lifetime access', '12 months', 'While subscribed']} onChange={access => configure({ access: access as CommerceConfig['access'] })}/></Field><Field label="Delivery method"><Select disabled={!editing} value={c.delivery} options={['Instant', 'After approval']} onChange={delivery => { configure({ delivery: delivery as CommerceConfig['delivery'], enrollment: delivery === 'After approval' ? 'After approval' : 'Automatic' }); customize({ accessRule: delivery === 'After approval' ? 'After manual approval' : 'Immediately after payment' }); }}/></Field>
    {localizeNode(kind === 'digital' && <Field label="Download limit per customer"><input type="number" min="1" disabled={!editing} value={c.downloadLimit} onChange={event => configure({ downloadLimit: Number(event.target.value) })}/></Field>)}
    {localizeNode(kind === 'course' && <><Field label="Student limit" hint="0 means unlimited enrollment."><input type="number" min="0" disabled={!editing} value={e.studentLimit} onChange={event => customize({ studentLimit: Number(event.target.value) })}/></Field><Field label="Student enrollment"><Select disabled={!editing} value={c.enrollment} options={['Automatic', 'After approval']} onChange={enrollment => { configure({ enrollment: enrollment as CommerceConfig['enrollment'], delivery: enrollment === 'After approval' ? 'After approval' : 'Instant' }); customize({ accessRule: enrollment === 'After approval' ? 'After manual approval' : 'Immediately after payment' }); }}/></Field><Field label="Community URL"><input type="url" disabled={!editing} value={c.communityUrl} placeholder={translateText("https://")} onChange={event => configure({ communityUrl: event.target.value })}/></Field></>)}
    {localizeNode(kind === 'subscription' && <Field label="Cancellation access trigger"><Select disabled={!editing} value={c.cancellation} options={['End of billing period', 'Immediately']} onChange={cancellation => configure({ cancellation: cancellation as CommerceConfig['cancellation'] })}/></Field>)}</div>
  </Card>;
}
export function IncludedItems({ experience: e, customize, editing, compact = false, paginate = true }: FormProps & { compact?: boolean; paginate?: boolean }) {
  useUILanguage();
  const [page, setPage] = React.useState(0);
  const items = editing ? e.included : e.included.filter(item => item.enabled);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(items.length / 5) - 1));
  return <Card title={translateText("What's Included")} className={compact ? 'dw-included-card' : ''} action={compact && paginate && items.length > 5 && <div className="dw-pagination"><button aria-label={translateText("Previous included items")} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>‹</button><span>{localizeNode(currentPage + 1)}/{localizeNode(Math.ceil(items.length / 5))}</span><button aria-label={translateText("Next included items")} disabled={(currentPage + 1) * 5 >= items.length} onClick={() => setPage(currentPage + 1)}>›</button></div>}><div className="tw-included-list">{localizeNode(!e.included.length && <p className="cw-help">{translateText("Add the benefits and resources included in this offer.")}</p>)}{localizeNode((compact && paginate ? items.slice(currentPage * 5, currentPage * 5 + 5) : e.included).map(item => <div key={item.id}>{localizeNode(editing ? <><input type="checkbox" aria-label={translateText(`Include ${item.title || 'item'}`)} checked={item.enabled} onChange={event => customize({ included: e.included.map(i => i.id === item.id ? { ...i, enabled: event.target.checked } : i) })}/><input aria-label={translateText("Included item title")} placeholder={translateText("Included benefit or resource")} value={item.title} onChange={event => customize({ included: e.included.map(i => i.id === item.id ? { ...i, title: event.target.value } : i) })}/><button className="cw-icon-button" aria-label={translateText(`Remove ${item.title || 'included item'}`)} onClick={() => customize({ included: e.included.filter(i => i.id !== item.id) })}><Trash2 size={12}/></button></> : item.enabled ? <><span><Check size={11}/></span><b>{localizeNode(item.title)}</b></> : null)}</div>))}</div>{localizeNode((editing || compact) && <button className="cw-button small" disabled={!editing} onClick={() => { if (compact) setPage(Math.floor(e.included.length / 5)); customize({ included: [...e.included, { id: crypto.randomUUID(), title: '', enabled: true }] }); }}><Plus size={12}/>{translateText(" Add Item")}</button>)}</Card>;
}
export function ServiceDetails({ config: c, experience: e, customize, configure, editing }: FormProps) {
  useUILanguage();
  return <Card title={translateText("Service Details")}><span className="tw-field-heading">{translateText("Service Type")}</span><div className="tw-service-modes">{localizeNode(([['Online', MonitorPlay, 'Video call (Zoom, Meet, etc.)'], ['At Location', MapPin, 'In person at your place'], ['Both', UserRound, 'Online or in person']] as const).map(([mode, Icon, hint]) => <button disabled={!editing} key={mode} className={e.serviceMode === mode ? 'selected' : ''} onClick={() => customize({ serviceMode: mode })}><Icon size={18}/><span><b>{localizeNode(mode)}</b><small>{localizeNode(hint)}</small></span></button>))}</div><div className="cw-form-grid"><Field label="Duration"><Select disabled={!editing} value={`${c.duration} minutes`} options={Array.from(new Set([15, 30, 45, 60, 90, 120, c.duration])).sort((a, b) => a - b).map(n => `${n} minutes`)} onChange={value => configure({ duration: parseInt(value) })}/></Field><ProviderSelect {...{ experience: e, editing, customize }}/>{localizeNode(e.serviceMode !== 'Online' && <Field label="Service Location"><input disabled={!editing} value={e.location} placeholder={translateText("Address or location instructions")} onChange={event => customize({ location: event.target.value })}/></Field>)}</div></Card>;
}
export function BookingForm(props: FormProps) { const { config: c, configure, editing, experience: e, customize } = props;
  useUILanguage();
  return <Card title={translateText("Booking Configuration")} action={<ProductAdvancedAction {...props} section="booking"/>} subtitle="Connect your calendar and define how sessions are fulfilled."><Field label="Booking / calendar URL"><input disabled={!editing} type="url" value={c.bookingUrl} placeholder={translateText("https://your-calendar.com/book")} onChange={event => configure({ bookingUrl: event.target.value })}/></Field><Field label="Fulfillment instructions"><textarea disabled={!editing} value={c.fulfillment} onChange={event => configure({ fulfillment: event.target.value })} placeholder={translateText("Describe preparation, availability and confirmation instructions.")}/></Field><SlotChips disabled={!editing || !!c.calendarId} values={c.bookingSlots ?? []} onChange={bookingSlots => configure({ bookingSlots })}/><Field label="Consultant biography"><textarea disabled={!editing} value={e.instructor.bio} onChange={event => customize({ instructor: { ...e.instructor, bio: event.target.value } })}/></Field><div className="cw-notice"><CalendarDays size={17}/>{translateText(" Customers book after payment using your connected calendar.")}</div></Card>;
}
export function ServicePreview(props: FormProps & { onBook: () => void }) {
  useUILanguage();
  return <ServiceCustomerPreview {...props}/>;
}
export function BundleComponents({ products, product: p, config: c, configure, editing }: FormProps) {
  useUILanguage();
  const available = products.filter(item => item.id !== p.id && productKind(item.type) !== 'bundle');
  return <Card title={translateText("Component Products")} subtitle="Combine two or more products into one package."><div className="tw-component-list">{localizeNode(available.filter(item => editing || c.components.includes(item.id)).map(item => <label key={item.id}>{localizeNode(editing && <input type="checkbox" checked={c.components.includes(item.id)} onChange={event => configure({ components: event.target.checked ? [...c.components, item.id] : c.components.filter(id => id !== item.id) })}/>)}<Layers3 size={19}/><span><b>{localizeNode(item.name)}</b><small>{localizeNode(item.type)}</small></span><b>{localizeNode(item.price)}</b></label>))}</div>{localizeNode(!c.components.length && <p className="cw-help">{translateText("Choose component products to define your bundle.")}</p>)}</Card>;
}
