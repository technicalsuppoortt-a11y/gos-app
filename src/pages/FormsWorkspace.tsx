import { BookingSelect as DashboardSelect } from './booking/BookingSelect';
import { resolveFormTheme } from './form-theme';
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { createPageAsset } from './page-templates';
import type { Asset, Workspace } from './asset-model';
import type { BuilderSection } from './BuilderWorkspace';
import { CRMRouting } from './CRMRouting';
import { publishWorkspaceAsset, unpublishWorkspaceAsset, deleteWorkspaceAsset } from '../backend/hosting';
import { backendError } from '../backend/firebase';
import { showToast } from '../utils/toast';
import { pageTemplates, type FormField, type FormFieldType, FORM_BACKGROUND_PRESETS, type FormBackgroundPreset } from './page-template-data';
import {
  Plus,
  Search,
  Globe,
  Share2,
  Trash2,
  Copy,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Settings2,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowLeft,
  X,
  ExternalLink,
  Code2,
  SlidersHorizontal,
  FileText,
  Mail,
  Phone,
  Hash,
  AlignLeft,
  ListFilter,
  CheckSquare,
  CircleDot,
  Send,
  LoaderCircle,
  HelpCircle,
  Star,
  Check,
  Palette
} from 'lucide-react';
import './form-fields.css';

export type { FormField, FormFieldType };

interface FormsWorkspaceProps {
  workspace: Workspace;
  save: (update: (w: Workspace) => Workspace) => Promise<unknown>;
  go: (path: string) => void;
}

const PRESET_OPTIONS: Record<string, string[]> = {
  'Inquiry Topics': ['General Inquiry', 'Sales & Pricing', 'Technical Support', 'Partnership Opportunity'],
  'Budget Ranges': ['Under $1,000', '$1,000 - $5,000', '$5,000 - $15,000', '$15,000+'],
  'Timeline Urgency': ['Immediately (Within 1-2 weeks)', 'This Month', 'Next Quarter', 'Flexible / Exploring options'],
  'Satisfaction Rating': ['⭐⭐⭐⭐⭐ 5 - Outstanding', '⭐⭐⭐⭐ 4 - Very Good', '⭐⭐⭐ 3 - Average', '⭐⭐ 2 - Needs Improvement', '⭐ 1 - Unsatisfactory'],
  'Yes / No': ['Yes', 'No'],
  'Contact Preference': ['Email', 'Phone call', 'WhatsApp', 'SMS text message']
};

interface CustomSelectBoxProps {
  value: string;
  placeholder?: string;
  options: string[];
  onChange: (val: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

function CustomSelectBox({
  value,
  placeholder = 'Select an option...',
  options = [],
  onChange,
  disabled = false,
  required = false,
  id,
  name
}: CustomSelectBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.trim() === (value || '').trim()) || '';

  return (
    <div className="form-custom-select-wrapper" ref={containerRef}>
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        type="button"
        id={id}
        className={`form-custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? '' : 'select-placeholder'}>
          {selectedOption || placeholder}
        </span>
        <ChevronDown size={16} className="select-chevron" />
      </button>

      {isOpen && (
        <div className="form-custom-select-dropdown" role="listbox">
          {placeholder && (
            <div
              className={`form-custom-select-option ${!value ? 'is-selected' : ''}`}
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              <span style={{ color: 'var(--form-text-muted)' }}>{placeholder}</span>
              {!value && <CheckCircle2 size={14} color="#7C3AED" />}
            </div>
          )}
          {options.map((opt, idx) => {
            const isSel = opt.trim() === (value || '').trim();
            return (
              <div
                key={idx}
                className={`form-custom-select-option ${isSel ? 'is-selected' : ''}`}
                role="option"
                aria-selected={isSel}
                onClick={() => {
                  onChange(opt.trim());
                  setIsOpen(false);
                }}
              >
                <span>{opt}</span>
                {isSel && <CheckCircle2 size={14} color="#7C3AED" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DeleteFormModalProps {
  form: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
}

function DeleteFormModal({ form, isOpen, onClose, onConfirm, deleting }: DeleteFormModalProps) {
  if (!isOpen || !form) return null;

  const isPublished = form.document?.funnel?.status === 'Published';
  let fieldCount = 0;
  try {
    const raw = form.document?.pages?.[0]?.sections?.[0]?.content?.customFields;
    fieldCount = raw ? JSON.parse(raw).length : 0;
  } catch {
    fieldCount = 0;
  }

  return createPortal(
    <div className="delete-form-modal-overlay" onClick={onClose}>
      <div className="delete-form-modal-card" onClick={e => e.stopPropagation()}>
        <div className="delete-form-modal-header">
          <div className="delete-form-icon-halo">
            <Trash2 size={24} />
          </div>
          <div className="delete-form-modal-title-wrap">
            <h3>Delete Form Permanently?</h3>
            <p>This will remove the form asset from your workspace.</p>
          </div>
          <button className="delete-form-close-btn" onClick={onClose} title="Cancel">
            <X size={18} />
          </button>
        </div>

        <div className="delete-form-modal-body">
          <div className="delete-form-asset-preview">
            <div className="delete-form-asset-info">
              <span className="delete-form-asset-name">{form.name}</span>
              <div className="delete-form-asset-meta">
                <span>{fieldCount} input {fieldCount === 1 ? 'field' : 'fields'}</span>
                <span>•</span>
                <span>Updated {new Date(form.updated).toLocaleDateString()}</span>
              </div>
            </div>
            <span className={`form-status-pill ${isPublished ? 'published' : 'draft'}`}>
              {isPublished ? 'Published & Live' : 'Draft'}
            </span>
          </div>

          {isPublished ? (
            <div className="delete-form-warning-callout">
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <strong>Warning: This form is currently Live.</strong>
                <div style={{ marginTop: 2 }}>
                  Deleting it will immediately unpublish the form, deactivate its live URL, and remove it from any linked funnels or websites.
                </div>
              </div>
            </div>
          ) : (
            <div className="delete-form-warning-callout">
              <span style={{ fontSize: 16 }}>ℹ️</span>
              <div>
                This form and all configured fields will be permanently deleted from your workspace. This action cannot be undone.
              </div>
            </div>
          )}
        </div>

        <div className="delete-form-modal-footer">
          <button className="delete-btn-cancel" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button className="delete-btn-confirm" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <LoaderCircle size={15} className="animate-spin" />
                Deleting Form...
              </>
            ) : (
              <>
                <Trash2 size={15} />
                Delete Form
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FormsWorkspace({ workspace, save, go }: FormsWorkspaceProps) {
  // Read query param if passed (e.g. ?selected=xxx)
  const querySelected = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('selected') || '';
    } catch {
      return '';
    }
  }, []);

  const [selected, setSelected] = useState<string>(querySelected);
  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft'>('All');

  // Modals & Deletion State
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inspector Bulk Option Input State
  const [bulkOptionMode, setBulkOptionMode] = useState(false);
  const [bulkOptionText, setBulkOptionText] = useState('');

  // Embedding state
  const [targetId, setTargetId] = useState('');
  const [targetPageId, setTargetPageId] = useState('');

  // Interactive preview state
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});

  const handleDeleteForm = async () => {
    if (!formToDelete) return;
    setIsDeleting(true);
    try {
      await deleteWorkspaceAsset(formToDelete.id);
      try {
        await save(w => ({
          ...w,
          assets: w.assets.filter(a => a.id !== formToDelete.id)
        }));
      } catch (saveErr) {
        console.warn('[handleDeleteForm] save sync notice:', saveErr);
      }
      showToast.success(`Form "${formToDelete.name}" deleted successfully.`);
      if (selected === formToDelete.id) {
        setSelected('');
      }
      setFormToDelete(null);
    } catch (err) {
      showToast.error(backendError(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const forms = useMemo(() => workspace.assets.filter(a => a.formAsset && !a.archived), [workspace.assets]);
  const asset = useMemo(() => forms.find(a => a.id === selected), [forms, selected]);
  const block = asset?.document.pages[0]?.sections[0];
  const fields: FormField[] = useMemo(() => {
    try {
      return JSON.parse(block?.content.customFields || '[]');
    } catch {
      return [];
    }
  }, [block?.content.customFields]);

  const targets = useMemo(() => workspace.assets.filter(a => !a.formAsset && !a.archived), [workspace.assets]);
  const target = targets.find(a => a.id === targetId);
  const targetPage = target?.document.pages.find(p => p.id === targetPageId) ?? target?.document.pages[0];

  // Selected field in inspector
  const activeField = useMemo(() => {
    return fields.find(f => f.id === selectedFieldId) || fields[0] || null;
  }, [fields, selectedFieldId]);

  // Asset Update Helper
  const updateAsset = (fn: (a: Asset) => Asset) => {
    return save(w => ({
      ...w,
      assets: w.assets.map(a => (a.id === selected ? fn(a) : a))
    }));
  };

  const changeFields = (next: FormField[]) => {
    return updateAsset(a => ({
      ...a,
      updated: new Date().toISOString(),
      document: {
        ...a.document,
        funnel: { ...a.document.funnel, status: 'Draft' },
        pages: a.document.pages.map((p, i) =>
          i ? p : {
            ...p,
            sections: p.sections.map((s, j) =>
              j ? s : { ...s, content: { ...s.content, customFields: JSON.stringify(next) } }
            )
          }
        )
      }
    }));
  };

  const updateFormContent = (key: 'title' | 'button' | 'successMessage', value: string) => {
    return updateAsset(a => ({
      ...a,
      updated: new Date().toISOString(),
      document: {
        ...a.document,
        funnel: { ...a.document.funnel, status: 'Draft' },
        pages: a.document.pages.map((p, i) =>
          i ? p : {
            ...p,
            headline: key === 'title' ? value : p.headline,
            sections: p.sections.map((s, j) =>
              j ? s : { ...s, content: { ...s.content, [key]: value } }
            )
          }
        )
      }
    }));
  };

  // Field Manipulation
  const addField = (type: FormFieldType) => {
    const id = `${type}_${Date.now().toString(36)}`;
    const defaults: Record<FormFieldType, { label: string; placeholder: string; options: string[] }> = {
      text: { label: 'Single Line Text', placeholder: 'Enter text...', options: [] },
      email: { label: 'Email Address', placeholder: 'name@example.com', options: [] },
      tel: { label: 'Phone Number', placeholder: '+1 (555) 000-0000', options: [] },
      number: { label: 'Numeric Value', placeholder: '0', options: [] },
      textarea: { label: 'Long Description / Message', placeholder: 'Write your message...', options: [] },
      select: { label: 'Select an Option', placeholder: 'Choose an option...', options: ['First Option', 'Second Option', 'Third Option'] },
      radio: { label: 'Select One', placeholder: '', options: ['Option A', 'Option B'] },
      checkbox: { label: 'I agree to the terms and privacy policy', placeholder: '', options: [] }
    };

    const newField: FormField = {
      id,
      label: defaults[type].label,
      type,
      required: false,
      options: defaults[type].options,
      placeholder: defaults[type].placeholder
    };

    const next = [...fields, newField];
    void changeFields(next);
    setSelectedFieldId(id);
    showToast.success(`Added ${newField.label}`);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const next = [...fields];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    void changeFields(next);
  };

  const duplicateField = (field: FormField) => {
    const copy: FormField = {
      ...structuredClone(field),
      id: `${field.type}_${Date.now().toString(36)}`,
      label: `${field.label} (Copy)`
    };
    const next = [...fields, copy];
    void changeFields(next);
    setSelectedFieldId(copy.id);
    showToast.success('Field duplicated');
  };

  const removeField = (id: string) => {
    const next = fields.filter(f => f.id !== id);
    void changeFields(next);
    if (selectedFieldId === id) {
      setSelectedFieldId(next[0]?.id || '');
    }
    showToast.info('Field removed');
  };

  const updateActiveField = (patch: Partial<FormField>) => {
    if (!activeField) return;
    const next = fields.map(f => (f.id === activeField.id ? { ...f, ...patch } : f));
    void changeFields(next);
  };

  // Option Builder Helpers
  const addOption = () => {
    if (!activeField) return;
    const newOptions = [...(activeField.options || []), `Option ${(activeField.options?.length || 0) + 1}`];
    updateActiveField({ options: newOptions });
  };

  const updateOption = (idx: number, val: string) => {
    if (!activeField) return;
    const newOptions = [...(activeField.options || [])];
    newOptions[idx] = val;
    updateActiveField({ options: newOptions });
  };

  const removeOption = (idx: number) => {
    if (!activeField || (activeField.options?.length || 0) <= 1) return;
    const newOptions = (activeField.options || []).filter((_, i) => i !== idx);
    updateActiveField({ options: newOptions });
  };

  const moveOption = (idx: number, direction: 'up' | 'down') => {
    if (!activeField) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= (activeField.options?.length || 0)) return;
    const newOptions = [...(activeField.options || [])];
    const [moved] = newOptions.splice(idx, 1);
    newOptions.splice(targetIdx, 0, moved);
    updateActiveField({ options: newOptions });
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESET_OPTIONS[presetName];
    if (!preset || !activeField) return;
    updateActiveField({ options: [...preset] });
    showToast.success(`Loaded "${presetName}" options`);
  };

  const applyBulkOptions = (text: string) => {
    if (!activeField) return;
    const items = text
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (items.length) {
      updateActiveField({ options: items });
      setBulkOptionMode(false);
      setBulkOptionText('');
      showToast.success(`Loaded ${items.length} choices`);
    }
  };

  // Blank Form Creation
  const createBlank = async (name = 'New Lead Capture Form') => {
    setBusy(true);
    try {
      const a = createPageAsset('form', name);
      await save(w => ({ ...w, assets: [a, ...w.assets] }));
      setSelected(a.id);
      setSelectedFieldId(fields[0]?.id || 'name');
      showToast.success('Form created');
    } catch (e) {
      showToast.error(backendError(e));
    } finally {
      setBusy(false);
    }
  };

  // Template Instantiation
  const applyTemplate = async (templateId: string) => {
    const tmpl = pageTemplates.find(t => t.id === templateId && t.mode === 'form');
    if (!tmpl) return;
    setBusy(true);
    try {
      const a = createPageAsset('form', tmpl.name, tmpl);
      await save(w => ({ ...w, assets: [a, ...w.assets] }));
      setSelected(a.id);
      showToast.success(`Created form from "${tmpl.name}"`);
    } catch (e) {
      showToast.error(backendError(e));
    } finally {
      setBusy(false);
    }
  };

  // Background & Theme Application
  const applyBackground = (preset: FormBackgroundPreset) => {
    void updateAsset(a => ({
      ...a,
      updated: new Date().toISOString(),
      document: {
        ...a.document,
        pages: a.document.pages.map((p, i) =>
          i
            ? p
            : {
                ...p,
                backgroundColor: preset.background,
                sections: p.sections.map((s, j) =>
                  j
                    ? s
                    : {
                        ...s,
                        styles: { ...s.styles, backgroundColor: preset.cardBackground },
                        content: {
                          ...s.content,
                          themeBackgroundId: preset.id,
                          themeCardBg: preset.cardBackground,
                          themeCardBorder: preset.cardBorder,
                          themeTextColor: preset.textColor
                        }
                      }
                )
              }
        )
      }
    }));
    showToast.success(`Theme set to "${preset.name}"`);
    setShowThemeModal(false);
  };

  // Filtered forms in Hub
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Published'
          ? f.document.funnel.status === 'Published'
          : f.document.funnel.status !== 'Published';
      return matchesSearch && matchesStatus;
    });
  }, [forms, searchQuery, statusFilter]);

  // Form Stats
  const publishedCount = useMemo(() => forms.filter(f => f.document.funnel.status === 'Published').length, [forms]);
  const routedCount = useMemo(() => forms.filter(f => Boolean(f.crmRouting?.pipelineId)).length, [forms]);

  // Handle Interactive Preview Submit
  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    for (const f of fields) {
      const val = previewValues[f.id] || '';
      if (f.required && !val.trim()) {
        errors[f.id] = `Please complete ${f.label}`;
      }
      if (f.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[f.id] = 'Enter a valid email address';
      }
    }
    if (Object.keys(errors).length > 0) {
      setPreviewErrors(errors);
      showToast.error('Please resolve required fields');
      return;
    }
    setPreviewErrors({});
    setPreviewSubmitted(true);
  };

  // =========================================================================
  // VIEW: FORM BUILDER STUDIO
  // =========================================================================
  if (selected && asset && block) {
    const isPublished = asset.document.funnel.status === 'Published';
    const formTitle = block.content.title || asset.name;
    const submitBtnText = block.content.button || 'Submit';
    const successMsg = block.content.successMessage || 'Thank you. We will be in touch.';
    const formTheme = resolveFormTheme(asset.document.pages[0], block);
    const currentBg = formTheme.background;
    const currentThemeId = block.content.themeBackgroundId || 'blank';
    const isDarkCanvas = formTheme.dark;

    return (
      <section className="forms-workspace form-studio">
        {/* Top Studio Bar */}
        <header className="form-studio-nav">
          <div className="form-studio-nav-left">
            <button
              className="aw-secondary"
              onClick={() => setSelected('')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={15} /> All Forms
            </button>
            <input
              className="form-title-input"
              value={asset.name}
              onChange={e => void updateAsset(a => ({ ...a, name: e.target.value }))}
              placeholder="Form name..."
              title="Click to rename form"
            />
            <span className={`form-status-pill ${isPublished ? 'published' : 'draft'}`}>
              <span className="form-status-dot" />
              {isPublished ? 'Published' : 'Draft'}
            </span>
          </div>

          <div className="form-studio-nav-tabs">
            <button
              className={`form-studio-nav-tab ${activeTab === 'builder' ? 'active' : ''}`}
              onClick={() => setActiveTab('builder')}
            >
              <SlidersHorizontal size={14} /> Builder
            </button>
            <button
              className={`form-studio-nav-tab ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('preview');
                setPreviewSubmitted(false);
              }}
            >
              <Eye size={14} /> Interactive Preview
            </button>
          </div>

          <div className="form-studio-nav-right">
            <button
              className="aw-secondary"
              onClick={() => setShowThemeModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Palette size={14} color="#7C3AED" />
              Theme & Background
            </button>

            <button
              className="aw-secondary"
              onClick={() => setShowCRMModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Layers size={14} color="#7C3AED" />
              CRM Routing {asset.crmRouting?.pipelineId ? '✓' : ''}
            </button>

            {asset.publishedUrl && (
              <button
                className="aw-secondary"
                onClick={() => setShowShareModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Share2 size={14} /> Share & Embed
              </button>
            )}

            <button
              className="aw-secondary"
              onClick={() => setFormToDelete(asset)}
              title="Delete this form"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#EF4444' }}
            >
              <Trash2 size={14} /> Delete
            </button>

            <button
              className="aw-primary"
              disabled={busy || !fields.length}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await publishWorkspaceAsset(asset.id);
                  showToast.success(`Form live at ${res.url}`);
                } catch (e) {
                  showToast.error(backendError(e));
                } finally {
                  setBusy(false);
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Globe size={15} />}
              {isPublished ? 'Republish Changes' : 'Publish Form'}
            </button>
          </div>
        </header>

        {/* Studio Content */}
        {activeTab === 'builder' ? (
          <div className="form-studio-layout">
            {/* COLUMN 1: FIELD PALETTE */}
            <aside className="form-studio-panel">
              <div className="form-panel-header">
                <h3>
                  <Plus size={15} color="#7C3AED" /> Input Fields
                </h3>
              </div>
              <div className="form-panel-body">
                <div className="form-palette-group">
                  <span className="form-palette-category-label">Text & Contact</span>
                  <button className="form-palette-btn" onClick={() => addField('text')}>
                    <span className="form-palette-btn-icon">
                      <FileText size={16} />
                    </span>
                    <div>
                      <div>Single Line Text</div>
                      <small style={{ color: 'var(--form-text-muted)', fontSize: 11 }}>Names, titles, keywords</small>
                    </div>
                  </button>

                  <button className="form-palette-btn" onClick={() => addField('email')}>
                    <span className="form-palette-btn-icon">
                      <Mail size={16} />
                    </span>
                    <div>
                      <div>Email Address</div>
                      <small style={{ color: 'var(--form-text-muted)', fontSize: 11 }}>Validation enabled</small>
                    </div>
                  </button>

                  <button className="form-palette-btn" onClick={() => addField('tel')}>
                    <span className="form-palette-btn-icon">
                      <Phone size={16} />
                    </span>
                    <div>
                      <div>Phone Number</div>
                      <small style={{ color: 'var(--form-text-muted)', fontSize: 11 }}>Mobile / Telephone</small>
                    </div>
                  </button>

                  <button className="form-palette-btn" onClick={() => addField('number')}>
                    <span className="form-palette-btn-icon">
                      <Hash size={16} />
                    </span>
                    <div>
                      <div>Number Input</div>
                      <small style={{ color: 'var(--form-text-muted)', fontSize: 11 }}>Budgets, ratings, count</small>
                    </div>
                  </button>

                  <button className="form-palette-btn" onClick={() => addField('textarea')}>
                    <span className="form-palette-btn-icon">
                      <AlignLeft size={16} />
                    </span>
                    <div>
                      <div>Paragraph / Textarea</div>
                      <small style={{ color: 'var(--form-text-muted)', fontSize: 11 }}>Multi-line inquiries</small>
                    </div>
                  </button>
                </div>

                <div className="form-palette-group">
                  <span className="form-palette-category-label">Selections & Dropdowns</span>
                  <button className="form-palette-btn" onClick={() => addField('select')}>
                    <span className="form-palette-btn-icon" style={{ background: 'rgba(124, 58, 237, 0.18)' }}>
                      <ListFilter size={16} />
                    </span>
                    <div>
                      <div style={{ color: '#7C3AED', fontWeight: 700 }}>Dropdown Select</div>
                      <small style={{ color: 'var(--form-text-muted)', fontSize: 11 }}>Curated choices menu</small>
                    </div>
                  </button>

                  <button className="form-palette-btn" onClick={() => addField('radio')}>
                    <span className="form-palette-btn-icon">
                      <CircleDot size={16} />
                    </span>
                    <div>
                      <div>Radio Choice</div>
                      <small style={{ color: 'var(--form-text-muted)', fontSize: 11 }}>Single selection group</small>
                    </div>
                  </button>

                  <button className="form-palette-btn" onClick={() => addField('checkbox')}>
                    <span className="form-palette-btn-icon">
                      <CheckSquare size={16} />
                    </span>
                    <div>
                      <div>Checkbox Opt-in</div>
                      <small style={{ color: 'var(--form-text-muted)', fontSize: 11 }}>Agreements & terms</small>
                    </div>
                  </button>
                </div>
              </div>
            </aside>

            {/* COLUMN 2: VISUAL FORM CANVAS */}
            <main
              className={`form-canvas-wrapper ${isDarkCanvas ? 'dark-canvas' : ''}`}
              data-form-theme={isDarkCanvas ? 'dark' : 'light'}
              style={{
                ...formTheme.variables,
                background: currentBg,
                transition: 'background 0.3s ease',
                padding: '24px 20px',
                borderRadius: 16
              }}
            >
              {/* Form Title & Subtitle Card */}
              <div className="form-canvas-header-card">
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#7C3AED', letterSpacing: '0.05em' }}>
                    Form Display Headline
                  </label>
                  <input
                    style={{
                      width: '100%',
                      fontSize: 20,
                      fontWeight: 750,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--form-text)',
                      marginTop: 4
                    }}
                    value={formTitle}
                    onChange={e => void updateFormContent('title', e.target.value)}
                    placeholder="Enter form title..."
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--form-text-muted)' }}>
                  Fields below represent the user-facing form. Click any element to configure its properties.
                </div>
              </div>

              {/* Form Fields Canvas */}
              <div className="form-canvas-fields-list">
                {fields.length === 0 ? (
                  <div
                    style={{
                      padding: 48,
                      textAlign: 'center',
                      borderRadius: 14,
                      border: '2px dashed var(--form-border)',
                      background: 'var(--form-surface)'
                    }}
                  >
                    <Plus size={36} color="#7C3AED" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ margin: '0 0 6px 0', fontSize: 16 }}>No fields in this form</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--form-text-muted)' }}>
                      Click any input from the left palette to add fields to your form.
                    </p>
                  </div>
                ) : (
                  fields.map((field, idx) => {
                    const isSelected = activeField?.id === field.id;
                    return (
                      <div
                        key={field.id}
                        className={`form-field-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedFieldId(field.id)}
                      >
                        <div className="form-field-card-bar">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="form-field-card-type-tag">
                              {field.type === 'select'
                                ? 'Dropdown'
                                : field.type === 'textarea'
                                ? 'Textarea'
                                : field.type}
                            </span>
                            <strong style={{ fontSize: 14 }}>{field.label}</strong>
                            {field.required && (
                              <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 700 }}>* Required</span>
                            )}
                          </div>

                          <div className="form-field-card-actions" onClick={e => e.stopPropagation()}>
                            <button
                              className="form-icon-btn"
                              title="Move Up"
                              disabled={idx === 0}
                              onClick={() => moveField(idx, 'up')}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              className="form-icon-btn"
                              title="Move Down"
                              disabled={idx === fields.length - 1}
                              onClick={() => moveField(idx, 'down')}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              className="form-icon-btn"
                              title="Duplicate Field"
                              onClick={() => duplicateField(field)}
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              className="form-icon-btn danger"
                              title="Remove Field"
                              onClick={() => removeField(field.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Interactive UI Mock on Canvas */}
                        <div>
                          {field.type === 'textarea' ? (
                            <div className="form-field-preview-control" style={{ minHeight: 64, alignItems: 'flex-start' }}>
                              <span>{field.placeholder || 'Long text message...'}</span>
                            </div>
                          ) : field.type === 'select' ? (
                            <div className="form-field-preview-control select-preview">
                              <span>{field.placeholder || 'Choose an option...'}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7C3AED', fontSize: 12 }}>
                                <span>{field.options?.length || 0} choices</span>
                                <ChevronDown size={15} />
                              </div>
                            </div>
                          ) : field.type === 'radio' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
                              {(field.options || []).map((opt, i) => (
                                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                  <input type="radio" disabled checked={i === 0} style={{ accentColor: '#7C3AED' }} />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                              <input type="checkbox" disabled checked style={{ accentColor: '#7C3AED' }} />
                              <span>{field.label}</span>
                            </label>
                          ) : (
                            <div className="form-field-preview-control">
                              <span>{field.placeholder || `Enter ${field.label.toLowerCase()}...`}</span>
                            </div>
                          )}
                          {field.helperText && (
                            <div style={{ fontSize: 11, color: 'var(--form-text-muted)', marginTop: 4 }}>
                              {field.helperText}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Form Footer Configuration (Submit button & Success message) */}
                <div
                  style={{
                    padding: 20,
                    borderRadius: 14,
                    background: 'var(--form-surface)',
                    border: '1px solid var(--form-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--form-text-muted)', display: 'block', marginBottom: 4 }}>
                        Submit Button Text
                      </label>
                      <input
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--form-border)',
                          background: 'var(--form-bg)',
                          fontSize: 13.5
                        }}
                        value={submitBtnText}
                        onChange={e => void updateFormContent('button', e.target.value)}
                        placeholder="Submit"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--form-text-muted)', display: 'block', marginBottom: 4 }}>
                        Post-Submission Message
                      </label>
                      <input
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--form-border)',
                          background: 'var(--form-bg)',
                          fontSize: 13.5
                        }}
                        value={successMsg}
                        onChange={e => void updateFormContent('successMessage', e.target.value)}
                        placeholder="Thank you. We will be in touch."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </main>

            {/* COLUMN 3: ADVANCED FIELD INSPECTOR */}
            <aside className="form-studio-panel">
              <div className="form-panel-header">
                <h3>
                  <Settings2 size={15} color="#7C3AED" /> Field Settings
                </h3>
                {activeField && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: 'rgba(124, 58, 237, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                    {activeField.type.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="form-panel-body">
                {activeField ? (
                  <>
                    <div className="form-inspector-section">
                      <label>
                        Field Label
                        <input
                          value={activeField.label}
                          onChange={e => updateActiveField({ label: e.target.value })}
                          placeholder="e.g. Work Email Address"
                        />
                      </label>
                    </div>

                    <div className="form-inspector-section">
                      <label>
                        CRM / Lead Field Key
                        <input
                          value={activeField.id}
                          onChange={e => updateActiveField({ id: e.target.value.toLowerCase().replace(/[^\w-]/g, '_') })}
                          placeholder="e.g. work_email"
                        />
                      </label>
                      <small style={{ fontSize: 11, color: 'var(--form-text-muted)' }}>
                        Mapped directly to CRM lead properties.
                      </small>
                    </div>

                    <div className="form-inspector-section">
                      <label>
                        Field Input Type
                        <DashboardSelect
                          className="form-select-control"
                          value={activeField.type}
                          onChange={e => updateActiveField({ type: e.target.value as FormFieldType })}
                        >
                          <option value="text">Single Line Text</option>
                          <option value="email">Email Address</option>
                          <option value="tel">Phone / Mobile</option>
                          <option value="number">Number</option>
                          <option value="textarea">Paragraph / Textarea</option>
                          <option value="select">Dropdown Select</option>
                          <option value="radio">Radio Choice</option>
                          <option value="checkbox">Checkbox</option>
                        </DashboardSelect>
                      </label>
                    </div>

                    {activeField.type !== 'checkbox' && activeField.type !== 'radio' && (
                      <div className="form-inspector-section">
                        <label>
                          Placeholder Text
                          <input
                            value={activeField.placeholder || ''}
                            onChange={e => updateActiveField({ placeholder: e.target.value })}
                            placeholder="e.g. Enter your response..."
                          />
                        </label>
                      </div>
                    )}

                    <div className="form-inspector-section">
                      <label>
                        Helper Text / Guide
                        <input
                          value={activeField.helperText || ''}
                          onChange={e => updateActiveField({ helperText: e.target.value })}
                          placeholder="Optional guidance under the field"
                        />
                      </label>
                    </div>

                    <div className="form-inspector-section" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Required Field</span>
                      <input
                        type="checkbox"
                        checked={activeField.required}
                        onChange={e => updateActiveField({ required: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: '#7C3AED', cursor: 'pointer' }}
                      />
                    </div>

                    {/* REDESIGNED DROPDOWN & RADIO OPTION BUILDER */}
                    {(activeField.type === 'select' || activeField.type === 'radio') && (
                      <div className="form-options-builder">
                        <div className="form-options-builder-header">
                          <h4>Choices ({activeField.options?.length || 0})</h4>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="aw-secondary"
                              onClick={() => setBulkOptionMode(!bulkOptionMode)}
                              style={{ padding: '3px 8px', fontSize: 11 }}
                            >
                              {bulkOptionMode ? 'List View' : '📋 Bulk Paste'}
                            </button>
                            <button
                              type="button"
                              className="aw-secondary"
                              onClick={addOption}
                              style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Plus size={12} /> Add
                            </button>
                          </div>
                        </div>

                        {/* Quick Preset Chips */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--form-text-muted)' }}>
                            Quick Presets (Click to load)
                          </span>
                          <div className="form-preset-chips">
                            {Object.keys(PRESET_OPTIONS).map(name => (
                              <button
                                key={name}
                                type="button"
                                className="form-preset-chip"
                                onClick={() => applyPreset(name)}
                                title={`Load ${name}`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bulk Paste Editor */}
                        {bulkOptionMode ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                            <textarea
                              value={bulkOptionText}
                              onChange={e => setBulkOptionText(e.target.value)}
                              placeholder={`Paste choices here (one choice per line or separated by commas)...`}
                              style={{
                                width: '100%',
                                minHeight: 100,
                                fontSize: 12.5,
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--form-border)',
                                background: 'var(--form-bg)',
                                color: 'var(--form-text)',
                                resize: 'vertical'
                              }}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="aw-secondary"
                                onClick={() => {
                                  setBulkOptionMode(false);
                                  setBulkOptionText('');
                                }}
                                style={{ padding: '5px 10px', fontSize: 11.5 }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="aw-primary"
                                disabled={!bulkOptionText.trim()}
                                onClick={() => applyBulkOptions(bulkOptionText)}
                                style={{ padding: '5px 12px', fontSize: 11.5 }}
                              >
                                Apply Options
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Options List */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
                            {(activeField.options || []).map((opt, optIdx) => {
                              const isDefault = activeField.defaultValue === opt;
                              return (
                                <div key={optIdx} className="form-option-row">
                                  <input
                                    value={opt}
                                    onChange={e => updateOption(optIdx, e.target.value)}
                                    placeholder={`Option ${optIdx + 1}`}
                                  />
                                  <div className="form-option-row-actions">
                                    <button
                                      type="button"
                                      className={`form-icon-btn ${isDefault ? 'active' : ''}`}
                                      onClick={() => updateActiveField({ defaultValue: isDefault ? '' : opt })}
                                      title={isDefault ? 'Default selection (active)' : 'Set as default choice'}
                                      style={{ color: isDefault ? '#7C3AED' : undefined }}
                                    >
                                      <Star size={11} fill={isDefault ? '#7C3AED' : 'none'} />
                                    </button>
                                    <button
                                      type="button"
                                      className="form-icon-btn"
                                      disabled={optIdx === 0}
                                      onClick={() => moveOption(optIdx, 'up')}
                                      title="Move option up"
                                    >
                                      <ArrowUp size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      className="form-icon-btn"
                                      disabled={optIdx === (activeField.options?.length || 0) - 1}
                                      onClick={() => moveOption(optIdx, 'down')}
                                      title="Move option down"
                                    >
                                      <ArrowDown size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      className="form-icon-btn danger"
                                      disabled={(activeField.options?.length || 0) <= 1}
                                      onClick={() => removeOption(optIdx)}
                                      title="Delete option"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Default Selected Selector */}
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--form-border)' }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--form-text-muted)', display: 'block', marginBottom: 4 }}>
                            Default Selected Choice
                          </label>
                          <DashboardSelect
                            className="form-select-control"
                            value={activeField.defaultValue || ''}
                            onChange={e => updateActiveField({ defaultValue: e.target.value })}
                            style={{ width: '100%', fontSize: 13, minHeight: 40 }}
                          >
                            <option value="">None (Prompt with placeholder)</option>
                            {(activeField.options || []).map((opt, i) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </DashboardSelect>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--form-text-muted)' }}>
                    Select any field in the canvas to customize its settings.
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : (
          /* =========================================================================
             VIEW: LIVE INTERACTIVE PREVIEW
             ========================================================================= */
          <div
            data-form-theme={isDarkCanvas ? 'dark' : 'light'}
            style={{
              ...formTheme.variables,
              flex: 1,
              width: '100%',
              minHeight: '80vh',
              background: currentBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 16px',
              transition: 'background 0.3s ease'
            }}
          >
            <div
              style={{
                maxWidth: 680,
                width: '100%',
                padding: 36,
                borderRadius: 24,
                ...formTheme.cardStyle
              }}
            >
            {previewSubmitted ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <CheckCircle2 size={56} color="#10B981" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0' }}>Submission Received!</h2>
                <p style={{ color: 'var(--form-text-muted)', fontSize: 15, margin: '0 0 24px 0' }}>
                  {successMsg}
                </p>
                <button
                  className="aw-secondary"
                  onClick={() => {
                    setPreviewValues({});
                    setPreviewSubmitted(false);
                  }}
                >
                  Test Again (Reset Form)
                </button>
              </div>
            ) : (
              <form onSubmit={handlePreviewSubmit} className="fb-demo-form fb-custom-form" style={{ maxWidth: '100%', margin: 0 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0', color: 'var(--form-text)' }}>
                    {formTitle}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--form-text-muted)', margin: 0 }}>
                    Please fill out the details below.
                  </p>
                </div>

                {fields.map(f => {
                  const error = previewErrors[f.id];
                  if (f.type === 'checkbox') {
                    return (
                      <div key={f.id}>
                        <label className="fb-custom-field is-checkbox">
                          <input
                            type="checkbox"
                            checked={previewValues[f.id] === 'true'}
                            onChange={e =>
                              setPreviewValues(prev => ({ ...prev, [f.id]: e.target.checked ? 'true' : '' }))
                            }
                          />
                          <span>
                            {f.label} {f.required && <span style={{ color: '#EF4444' }}>*</span>}
                          </span>
                        </label>
                        {error && <small style={{ color: '#EF4444', fontSize: 12 }}>{error}</small>}
                      </div>
                    );
                  }

                  if (f.type === 'radio') {
                    return (
                      <div key={f.id} className="fb-custom-field">
                        <span className="fb-field-label">
                          {f.label} {f.required && <span style={{ color: '#EF4444' }}>*</span>}
                        </span>
                        <div className="fb-custom-radio-group">
                          {(f.options || []).map((opt, i) => (
                            <label key={i} className="fb-radio-option">
                              <input
                                type="radio"
                                name={f.id}
                                value={opt}
                                checked={previewValues[f.id] === opt}
                                onChange={() => setPreviewValues(prev => ({ ...prev, [f.id]: opt }))}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                        {f.helperText && <small className="fb-field-helper">{f.helperText}</small>}
                        {error && <small style={{ color: '#EF4444', fontSize: 12 }}>{error}</small>}
                      </div>
                    );
                  }

                  return (
                    <label key={f.id} className="fb-custom-field">
                      <span className="fb-field-label">
                        {f.label} {f.required && <span style={{ color: '#EF4444' }}>*</span>}
                      </span>

                      {f.type === 'textarea' ? (
                        <textarea
                          placeholder={f.placeholder || ''}
                          value={previewValues[f.id] || ''}
                          onChange={e => setPreviewValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                        />
                      ) : f.type === 'select' ? (
                        <CustomSelectBox
                          id={f.id}
                          value={previewValues[f.id] ?? (f.defaultValue || '')}
                          placeholder={f.placeholder || 'Choose an option...'}
                          options={f.options || []}
                          onChange={val => setPreviewValues(prev => ({ ...prev, [f.id]: val }))}
                        />
                      ) : (
                        <input
                          type={f.type}
                          placeholder={f.placeholder || ''}
                          value={previewValues[f.id] || ''}
                          onChange={e => setPreviewValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                        />
                      )}

                      {f.helperText && <small className="fb-field-helper">{f.helperText}</small>}
                      {error && <small style={{ color: '#EF4444', fontSize: 12 }}>{error}</small>}
                    </label>
                  );
                })}

                <button className="fb-site-primary" type="submit">
                  <Send size={15} /> {submitBtnText}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

        {/* MODAL: CRM ROUTING */}
        {showCRMModal && createPortal(
          <div className="form-modal-overlay" onClick={() => setShowCRMModal(false)}>
            <div className="form-modal-dialog" onClick={e => e.stopPropagation()}>
              <div className="form-modal-header">
                <h2>CRM & Lead Stage Routing</h2>
                <button className="form-icon-btn" onClick={() => setShowCRMModal(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="form-modal-body">
                <p style={{ margin: 0, fontSize: 14, color: 'var(--form-text-muted)' }}>
                  Route all incoming form submissions directly into your CRM pipelines. When leads submit this form, they will automatically appear in your chosen pipeline and stage.
                </p>
                <CRMRouting
                  value={asset.crmRouting}
                  onChange={crmRouting => void updateAsset(a => ({ ...a, crmRouting }))}
                />
              </div>
              <div className="form-modal-footer">
                <button className="aw-primary" onClick={() => setShowCRMModal(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL: SHARE & EMBED */}
        {showShareModal && asset.publishedUrl && createPortal(
          <div className="form-modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="form-modal-dialog" onClick={e => e.stopPropagation()}>
              <div className="form-modal-header">
                <h2>Share & Embed Form</h2>
                <button className="form-icon-btn" onClick={() => setShowShareModal(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="form-modal-body">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    Direct Shareable Link
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      readOnly
                      value={asset.publishedUrl}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--form-border)',
                        background: 'var(--form-surface)',
                        fontSize: 13
                      }}
                    />
                    <button
                      className="aw-secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(asset.publishedUrl!);
                        showToast.success('Link copied');
                      }}
                    >
                      <Copy size={14} /> Copy
                    </button>
                    <a
                      className="aw-secondary"
                      href={asset.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    Iframe Embed Code
                  </label>
                  <div className="form-code-snippet">
                    {`<iframe src="${asset.publishedUrl}" title="${asset.name}" width="100%" height="650" style="border:0;border-radius:12px;" loading="lazy"></iframe>`}
                    <button
                      className="form-code-copy-btn"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `<iframe src="${asset.publishedUrl}" title="${asset.name}" width="100%" height="650" style="border:0;border-radius:12px;" loading="lazy"></iframe>`
                        );
                        showToast.success('Embed code copied');
                      }}
                    >
                      <Copy size={11} /> Copy Code
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--form-border)', paddingTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    Embed Directly into Existing Funnel or Website Page
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <DashboardSelect
                      className="form-select-control"
                      value={targetId}
                      onChange={e => {
                        setTargetId(e.target.value);
                        setTargetPageId('');
                      }}
                    >
                      <option value="">Select funnel or website...</option>
                      {targets.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.kind})
                        </option>
                      ))}
                    </DashboardSelect>

                    <DashboardSelect
                      className="form-select-control"
                      value={targetPage?.id || ''}
                      onChange={e => setTargetPageId(e.target.value)}
                      disabled={!target}
                    >
                      <option value="">Select destination page...</option>
                      {target?.document.pages.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </DashboardSelect>
                  </div>

                  <button
                    className="aw-primary"
                    disabled={busy || !targetPage}
                    onClick={async () => {
                      if (!target || !targetPage) return;
                      setBusy(true);
                      try {
                        await save(w => ({
                          ...w,
                          assets: w.assets.map(a =>
                            a.id !== target.id
                              ? a
                              : {
                                  ...a,
                                  updated: new Date().toISOString(),
                                  document: {
                                    ...a.document,
                                    funnel: { ...a.document.funnel, status: 'Draft' },
                                    pages: a.document.pages.map(p =>
                                      p.id !== targetPage.id
                                        ? p
                                        : {
                                            ...p,
                                            status: 'Draft',
                                            sections: [
                                              ...p.sections,
                                              {
                                                id: crypto.randomUUID(),
                                                type: 'Form',
                                                content: {
                                                  title: asset.name,
                                                  publishedFormUrl: asset.publishedUrl!
                                                },
                                                styles: { ...block.styles }
                                              }
                                            ]
                                          }
                                    )
                                  }
                                }
                          )
                        }));
                        showToast.success('Form embedded in page successfully!');
                        setShowShareModal(false);
                      } catch (e) {
                        showToast.error(backendError(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Code2 size={14} /> Embed in Selected Page
                  </button>
                </div>
              </div>
              <div className="form-modal-footer">
                <button className="aw-secondary" onClick={() => setShowShareModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL: FORM BACKGROUND & THEME SELECTOR */}
        {showThemeModal && createPortal(
          <div className="form-modal-overlay" onClick={() => setShowThemeModal(false)}>
            <div className="form-modal-dialog" style={{ maxWidth: 740 }} onClick={e => e.stopPropagation()}>
              <div className="form-modal-header">
                <div>
                  <h2>Form Background & Theme</h2>
                  <small style={{ color: 'var(--form-text-muted)', fontSize: 13 }}>
                    Select a professional styling for your form canvas, card container, and published page.
                  </small>
                </div>
                <button className="form-icon-btn" onClick={() => setShowThemeModal(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="form-modal-body" style={{ maxHeight: '70vh' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
                  {FORM_BACKGROUND_PRESETS.map(preset => {
                    const isCurrent = (block.content.themeBackgroundId || 'blank') === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => applyBackground(preset)}
                        style={{
                          padding: 14,
                          borderRadius: 12,
                          border: isCurrent ? '2px solid #7C3AED' : '1.5px solid var(--form-border)',
                          background: 'var(--form-bg)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          transition: 'all 0.15s ease',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(124, 58, 237, 0.15)' : 'none'
                        }}
                      >
                        <div
                          style={{
                            height: 76,
                            borderRadius: 8,
                            background: preset.background,
                            border: `1px solid ${preset.previewBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              padding: '5px 12px',
                              borderRadius: 6,
                              background: preset.cardBackground,
                              border: preset.cardBorder,
                              color: preset.textColor,
                              fontSize: 11,
                              fontWeight: 700,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          >
                            Form Card
                          </div>
                          {isCurrent && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                background: '#7C3AED',
                                color: '#fff',
                                borderRadius: '50%',
                                width: 18,
                                height: 18,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Check size={11} />
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <b style={{ fontSize: 13, color: 'var(--form-text)' }}>{preset.name}</b>
                            {preset.id === 'blank' && (
                              <span style={{ fontSize: 10, fontWeight: 700, background: '#E2E8F0', padding: '1px 5px', borderRadius: 4 }}>
                                BLANK
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--form-text-muted)', lineHeight: 1.35 }}>
                            {preset.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          className={isCurrent ? 'aw-primary' : 'aw-secondary'}
                          style={{ width: '100%', padding: '6px 12px', fontSize: 12, marginTop: 'auto' }}
                        >
                          {isCurrent ? 'Current Theme' : 'Apply Theme'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-modal-footer">
                <button className="aw-secondary" onClick={() => setShowThemeModal(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </section>
    );
  }

  // =========================================================================
  // VIEW: FORMS HUB / OVERVIEW
  // =========================================================================
  return (
    <section className="forms-workspace">
      {/* Forms Hub Header */}
      <div className="forms-hub-header">
        <div className="forms-hub-title">
          <h1>Forms & Lead Capture</h1>
          <p>
            Build high-converting dynamic forms, configure CRM lead pipelines, and share or embed them anywhere.
          </p>
        </div>

        <div className="forms-hub-actions">
          <button
            className="aw-secondary"
            onClick={() => go('funnels?tab=templates&category=Forms')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Sparkles size={16} color="#7C3AED" /> Browse Form Templates
          </button>
          <button
            className="aw-primary"
            disabled={busy}
            onClick={() => void createBlank()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} /> Create Blank Form
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="forms-stats-ribbon">
        <div className="forms-stat-card">
          <div className="forms-stat-icon">
            <FileText size={20} />
          </div>
          <div className="forms-stat-info">
            <span className="forms-stat-val">{forms.length}</span>
            <span className="forms-stat-label">Total Forms Created</span>
          </div>
        </div>

        <div className="forms-stat-card">
          <div className="forms-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <Globe size={20} />
          </div>
          <div className="forms-stat-info">
            <span className="forms-stat-val">{publishedCount}</span>
            <span className="forms-stat-label">Published & Live</span>
          </div>
        </div>

        <div className="forms-stat-card">
          <div className="forms-stat-icon" style={{ background: 'rgba(167, 139, 250, 0.18)', color: '#7C3AED' }}>
            <Layers size={20} />
          </div>
          <div className="forms-stat-info">
            <span className="forms-stat-val">{routedCount}</span>
            <span className="forms-stat-label">CRM Pipelines Connected</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="forms-filter-bar">
        <div className="forms-search-box">
          <Search size={16} />
          <input
            placeholder="Search forms by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ border: 0, background: 'transparent', padding: 2, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="forms-status-tabs">
          {(['All', 'Published', 'Draft'] as const).map(tab => (
            <button
              key={tab}
              className={`forms-status-tab ${statusFilter === tab ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Cards Grid */}
      {filteredForms.length === 0 ? (
        <div
          style={{
            padding: 56,
            textAlign: 'center',
            borderRadius: 16,
            border: '2px dashed var(--form-border)',
            background: 'var(--form-surface)'
          }}
        >
          <FileText size={40} color="#7C3AED" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>
            {searchQuery ? 'No forms match your search' : 'No forms created yet'}
          </h3>
          <p style={{ color: 'var(--form-text-muted)', fontSize: 14, margin: '0 0 20px 0' }}>
            Start with a ready-made template or build a custom form from scratch.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="aw-secondary" onClick={() => go('funnels?tab=templates&category=Forms')}>
              <Sparkles size={15} /> Browse Templates
            </button>
            <button className="aw-primary" onClick={() => void createBlank()}>
              <Plus size={15} /> Create Blank Form
            </button>
          </div>
        </div>
      ) : (
        <div className="forms-cards-grid">
          {filteredForms.map(item => {
            const isPub = item.document.funnel.status === 'Published';
            const itemBlock = item.document.pages[0]?.sections[0];
            let itemFields: FormField[] = [];
            try {
              itemFields = JSON.parse(itemBlock?.content.customFields || '[]');
            } catch {
              itemFields = [];
            }

            return (
              <div key={item.id} className="form-hub-card">
                <div>
                  <div className="form-hub-card-header">
                    <h3 className="form-hub-card-title">{item.name}</h3>
                    <span className={`form-status-pill ${isPub ? 'published' : 'draft'}`}>
                      <span className="form-status-dot" />
                      {isPub ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <div className="form-hub-card-meta">
                    <div className="form-hub-card-pill-row">
                      <span className="form-meta-tag">
                        <FileText size={12} /> {itemFields.length} {itemFields.length === 1 ? 'field' : 'fields'}
                      </span>
                      {item.crmRouting?.pipelineId ? (
                        <span className="form-meta-tag" style={{ color: '#059669', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                          <CheckCircle2 size={12} /> CRM Connected
                        </span>
                      ) : (
                        <span className="form-meta-tag">
                          <HelpCircle size={12} /> Unrouted
                        </span>
                      )}
                    </div>
                    <small style={{ color: 'var(--form-text-muted)', fontSize: 12 }}>
                      Updated {new Date(item.updated).toLocaleDateString()}
                    </small>
                  </div>
                </div>

                <div className="form-hub-card-actions">
                  <button
                    className="aw-primary"
                    onClick={() => {
                      setSelected(item.id);
                      setSelectedFieldId(itemFields[0]?.id || '');
                    }}
                    style={{ flex: 1, padding: '7px 14px', fontSize: 13 }}
                  >
                    Edit & Customize
                  </button>

                  {item.publishedUrl && (
                    <a
                      className="form-icon-btn"
                      href={item.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="View live published form"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}

                  <button
                    className="form-icon-btn danger"
                    title="Delete form"
                    onClick={() => setFormToDelete(item)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: PROFESSIONAL DELETE FORM CONFIRMATION */}
      {formToDelete && (
        <DeleteFormModal
          form={formToDelete}
          isOpen={Boolean(formToDelete)}
          onClose={() => setFormToDelete(null)}
          onConfirm={handleDeleteForm}
          deleting={isDeleting}
        />
      )}
    </section>
  );
}

export default FormsWorkspace;
