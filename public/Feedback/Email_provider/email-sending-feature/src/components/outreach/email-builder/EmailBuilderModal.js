'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
  Code,
  Sparkles,
  Send,
  Eye,
  Check,
  Undo2,
  Redo2,
  Palette,
  Layers,
  FileText,
  MousePointerClick,
  Heading,
  Type,
  Image as ImageIcon,
  Layout,
  Tag,
  Minus,
  MoveVertical,
  Share2,
  Info,
  HelpCircle,
  ExternalLink,
  GripVertical,
  Save,
  Bookmark,
  Clock,
  Video,
  Star,
  DollarSign,
  FolderHeart,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Search,
  Moon,
  Sun,
  Filter
} from 'lucide-react';
import { BLOCK_TYPES, AVAILABLE_BLOCKS_CATALOG, createDefaultBlock, DEFAULT_EMAIL_THEME } from './defaultBlocks.js';
import { PREBUILT_EMAIL_TEMPLATES } from './emailTemplates.js';
import { compileEmailHtml } from './emailHtmlGenerator.js';

const ICON_MAP = {
  Layout,
  Heading,
  Type,
  MousePointerClick,
  Image: ImageIcon,
  Sparkles,
  Columns: Layers,
  Tag,
  Clock,
  Video,
  Star,
  DollarSign,
  Code,
  Minus,
  MoveVertical,
  Share2,
  Info
};

const COLOR_PALETTE_PRESETS = [
  '#FF6B35', // UpKlick Brand Orange
  '#6C35FF', // Electric Purple
  '#10B981', // Emerald Green
  '#06B6D4', // Cyan Blue
  '#F59E0B', // Amber Gold
  '#F43F5E', // Rose Pink
  '#FFFFFF', // Pure White
  '#CBD5E1', // Slate Light
  '#12121F', // Dark Container
  '#090912'  // Deep Body Background
];

const STOCK_BANNER_PRESETS = [
  { label: 'فريق وعمل', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80' },
  { label: 'تكنولوجيا وتحليلات', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80' },
  { label: 'تخفيضات ومبيعات', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80' },
  { label: 'شروحات وفيديو', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80' },
  { label: 'احتفال وإنجاز', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80' }
];

const TEMPLATE_CATEGORIES = [
  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
  { id: 'welcome', labelAr: 'ترحيب بالمشتركين', labelEn: 'Welcome' },
  { id: 'promo', labelAr: 'عروض وتخفيضات', labelEn: 'Promotions' },
  { id: 'newsletter', labelAr: 'نشرات وتحديثات', labelEn: 'Newsletters' },
  { id: 'custom', labelAr: 'قوالب مخصصة', labelEn: 'Custom' }
];

async function adminFetch(path, { method = 'GET', body } = {}) {
  try {
    const { auth } = await import('../../../lib/firebase');
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    const res = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    console.warn('[EmailBuilder adminFetch]', err.message);
    throw err;
  }
}

export default function EmailBuilderModal({
  isOpen,
  onClose,
  initialBlocks,
  initialTheme,
  campaignName = '',
  onSave,
  onSendTestEmail,
  onTemplatesUpdated,
  isRTL = true
}) {
  const [blocks, setBlocks] = useState([]);
  const [theme, setTheme] = useState(DEFAULT_EMAIL_THEME);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [activeSideTab, setActiveSideTab] = useState('elements'); // 'elements' | 'templates' | 'my-templates' | 'tokens' | 'theme'
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop' | 'mobile' | 'code'
  const [previewDarkClient, setPreviewDarkClient] = useState(true); // Toggle client dark/light preview
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [deleteBlockConfirmId, setDeleteBlockConfirmId] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);
  const [htmlCopied, setHtmlCopied] = useState(false);

  // Custom Saved Templates State
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [savedTemplatesSearch, setSavedTemplatesSearch] = useState('');
  const [savedTemplatesCat, setSavedTemplatesCat] = useState('all');
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateCat, setNewTemplateCat] = useState('custom');
  const [newTemplateIcon, setNewTemplateIcon] = useState('🎨');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState('');
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState(null);

  // Drag and Drop States
  const [draggedCatalogType, setDraggedCatalogType] = useState(null);
  const [draggedCanvasIndex, setDraggedCanvasIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null); // index where block will be inserted
  const [quickInsertIndex, setQuickInsertIndex] = useState(null); // when user clicks '+' between blocks

  const fileInputRef = useRef(null);
  const t = (ar, en) => (isRTL ? ar : en);

  // Load Custom Saved Templates
  const loadCustomTemplates = async () => {
    let localList = [];
    try {
      const cached = localStorage.getItem('upklick_saved_email_templates');
      if (cached) {
        localList = JSON.parse(cached) || [];
        if (Array.isArray(localList) && localList.length > 0) {
          setSavedTemplates(localList);
        }
      }
    } catch {}

    try {
      const data = await adminFetch('/api/admin/outreach/templates');
      if (data.templates && Array.isArray(data.templates)) {
        const map = new Map();
        data.templates.forEach((item) => map.set(item.id, item));
        localList.forEach((item) => {
          if (!map.has(item.id)) map.set(item.id, item);
        });
        const merged = Array.from(map.values());
        setSavedTemplates(merged);
        try {
          localStorage.setItem('upklick_saved_email_templates', JSON.stringify(merged));
        } catch {}
        if (onTemplatesUpdated) onTemplatesUpdated(merged);
      }
    } catch {
      // Local list already populated
    }
  };

  // Initialize blocks and theme on open
  useEffect(() => {
    if (isOpen) {
      const initial = initialBlocks && initialBlocks.length > 0
        ? initialBlocks
        : PREBUILT_EMAIL_TEMPLATES[0].blocks;
      const initialTh = initialTheme || DEFAULT_EMAIL_THEME;
      setBlocks(initial);
      setTheme(initialTh);
      setSelectedBlockId(initial[0]?.id || null);
      setHistory([{ blocks: initial, theme: initialTh }]);
      setHistoryIndex(0);
      setTestFeedback(null);
      loadCustomTemplates();
    }
  }, [isOpen, initialBlocks, initialTheme]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S, Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setNewTemplateName(campaignName || t('تصميم بريد جديد', 'Custom Email Design'));
        setSaveTemplateModalOpen(true);
      } else if (e.key === 'Escape') {
        if (saveTemplateModalOpen) setSaveTemplateModalOpen(false);
        else if (testModalOpen) setTestModalOpen(false);
        else if (pendingTemplate) setPendingTemplate(null);
        else if (deleteBlockConfirmId) setDeleteBlockConfirmId(null);
        else if (deleteTemplateConfirm) setDeleteTemplateConfirm(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, historyIndex, history, saveTemplateModalOpen, testModalOpen, pendingTemplate, deleteBlockConfirmId, deleteTemplateConfirm]);

  const recordHistory = (newBlocks, newTheme = theme) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push({ blocks: newBlocks, theme: newTheme });
    if (nextHistory.length > 30) nextHistory.shift();
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setBlocks(prev.blocks);
      setTheme(prev.theme);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setBlocks(next.blocks);
      setTheme(next.theme);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const selectedBlock = useMemo(() => {
    return blocks.find((b) => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  const compiledHtml = useMemo(() => {
    return compileEmailHtml(blocks, theme);
  }, [blocks, theme]);

  const handleAddBlock = (type, insertAtIndex = null) => {
    const newBlock = createDefaultBlock(type);
    let updated;
    if (insertAtIndex !== null && insertAtIndex >= 0) {
      updated = [...blocks.slice(0, insertAtIndex), newBlock, ...blocks.slice(insertAtIndex)];
    } else {
      updated = [...blocks, newBlock];
    }
    setBlocks(updated);
    setSelectedBlockId(newBlock.id);
    recordHistory(updated);
    setQuickInsertIndex(null);
  };

  const handleUpdateBlock = (id, updates) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setBlocks(updated);
    recordHistory(updated);
  };

  const handleDeleteBlock = (id, e) => {
    if (e) e.stopPropagation();
    if (blocks.length <= 1) return;
    const updated = blocks.filter((b) => b.id !== id);
    setBlocks(updated);
    if (selectedBlockId === id) {
      setSelectedBlockId(updated[0]?.id || null);
    }
    recordHistory(updated);
    setDeleteBlockConfirmId(null);
  };

  const handleDuplicateBlock = (id, e) => {
    if (e) e.stopPropagation();
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const original = blocks[idx];
    const clone = {
      ...JSON.parse(JSON.stringify(original)),
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    };
    const updated = [...blocks.slice(0, idx + 1), clone, ...blocks.slice(idx + 1)];
    setBlocks(updated);
    setSelectedBlockId(clone.id);
    recordHistory(updated);
  };

  const handleMoveBlock = (id, direction, e) => {
    if (e) e.stopPropagation();
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === blocks.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...blocks];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    setBlocks(updated);
    recordHistory(updated);
  };

  // Drag and drop handlers
  const handleDragStartCatalog = (type, e) => {
    setDraggedCatalogType(type);
    setDraggedCanvasIndex(null);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartCanvas = (index, e) => {
    setDraggedCanvasIndex(index);
    setDraggedCatalogType(null);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCanvasSlot = (index, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedCatalogType ? 'copy' : 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDropCanvasSlot = (index, e) => {
    e.preventDefault();
    setDropTargetIndex(null);

    // Dropping from catalog
    if (draggedCatalogType) {
      handleAddBlock(draggedCatalogType, index);
      setDraggedCatalogType(null);
      return;
    }

    // Reordering canvas blocks
    if (draggedCanvasIndex !== null && draggedCanvasIndex !== undefined) {
      if (draggedCanvasIndex === index || draggedCanvasIndex === index - 1) {
        setDraggedCanvasIndex(null);
        return;
      }
      const updated = [...blocks];
      const [movedItem] = updated.splice(draggedCanvasIndex, 1);
      const targetPos = index > draggedCanvasIndex ? index - 1 : index;
      updated.splice(targetPos, 0, movedItem);
      setBlocks(updated);
      setSelectedBlockId(movedItem.id);
      recordHistory(updated);
      setDraggedCanvasIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedCatalogType(null);
    setDraggedCanvasIndex(null);
    setDropTargetIndex(null);
  };

  const handleApplyTemplate = (tmpl) => {
    setPendingTemplate(tmpl);
  };

  // Save Current Design as Custom Template in Library
  const handleSaveAsCustomTemplate = async () => {
    if (!newTemplateName.trim()) return;
    setSavingTemplate(true);
    try {
      const payload = {
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim(),
        category: newTemplateCat || 'custom',
        thumbnail: newTemplateIcon || '🎨',
        blocks,
        theme
      };
      const res = await adminFetch('/api/admin/outreach/templates', { method: 'POST', body: payload });
      const saved = res.template || { ...payload, id: `local_${Date.now()}` };
      const updated = [saved, ...savedTemplates.filter((p) => p.id !== saved.id)];
      setSavedTemplates(updated);
      try {
        localStorage.setItem('upklick_saved_email_templates', JSON.stringify(updated));
      } catch {}
      if (onTemplatesUpdated) onTemplatesUpdated(updated);
      setSaveTemplateModalOpen(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      setSavedFeedback(t('تم حفظ التصميم في مكتبة القوالب بنجاح! 🎉', 'Template saved to your library! 🎉'));
      setTimeout(() => setSavedFeedback(''), 4500);
    } catch {
      const local = {
        id: `local_${Date.now()}`,
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim(),
        category: newTemplateCat || 'custom',
        thumbnail: newTemplateIcon || '🎨',
        blocks,
        theme,
        createdAt: new Date().toISOString()
      };
      const updated = [local, ...savedTemplates];
      setSavedTemplates(updated);
      try {
        localStorage.setItem('upklick_saved_email_templates', JSON.stringify(updated));
      } catch {}
      if (onTemplatesUpdated) onTemplatesUpdated(updated);
      setSaveTemplateModalOpen(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      setSavedFeedback(t('تم حفظ التصميم محلياً بنجاح! 🎉', 'Template saved locally! 🎉'));
      setTimeout(() => setSavedFeedback(''), 4500);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete Custom Saved Template
  const handleDeleteSavedTemplate = async (tmplId) => {
    try {
      await adminFetch(`/api/admin/outreach/templates/${tmplId}`, { method: 'DELETE' });
    } catch {}
    const updated = savedTemplates.filter((t) => t.id !== tmplId);
    setSavedTemplates(updated);
    try {
      localStorage.setItem('upklick_saved_email_templates', JSON.stringify(updated));
    } catch {}
    if (onTemplatesUpdated) onTemplatesUpdated(updated);
    setDeleteTemplateConfirm(null);
  };

  // Export Design as JSON File
  const handleExportTemplateJson = (tmpl = null) => {
    const dataToExport = tmpl || {
      name: campaignName || 'Email-Design',
      blocks,
      theme,
      exportedAt: new Date().toISOString()
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', jsonStr);
    dlAnchor.setAttribute('download', `${(dataToExport.name || 'email_template').replace(/\s+/g, '_')}.json`);
    dlAnchor.click();
  };

  // Import JSON File Template
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          setBlocks(parsed.blocks);
          if (parsed.theme) setTheme(parsed.theme);
          setSelectedBlockId(parsed.blocks[0]?.id || null);
          recordHistory(parsed.blocks, parsed.theme || theme);
          setSavedFeedback(t('تم استيراد التصميم بنجاح! ✨', 'Template imported successfully! ✨'));
          setTimeout(() => setSavedFeedback(''), 4000);
        }
      } catch {
        alert(t('ملف غير صالح', 'Invalid JSON template file'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(compiledHtml);
    setHtmlCopied(true);
    setTimeout(() => setHtmlCopied(false), 2000);
  };

  const handleSendTest = async () => {
    if (!testEmailInput.trim()) return;
    setTestSending(true);
    setTestFeedback(null);
    try {
      if (onSendTestEmail) {
        await onSendTestEmail({ testEmail: testEmailInput.trim(), htmlBody: compiledHtml });
        setTestFeedback({ ok: true, msg: t('تم إرسال البريد التجريبي بنجاح! تفقد بريدك الوارد.', 'Test email sent successfully! Check your inbox.') });
      } else {
        setTestFeedback({ ok: true, msg: t('تم إرسال بريد تجريبي إلى: ' + testEmailInput, 'Sent test email to: ' + testEmailInput) });
      }
    } catch (err) {
      setTestFeedback({ ok: false, msg: err.message || t('فشل إرسال البريد التجريبي', 'Failed to send test email') });
    } finally {
      setTestSending(false);
    }
  };

  const handleFinalSave = () => {
    if (onSave) {
      onSave({
        blocks,
        theme,
        htmlBody: compiledHtml
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const filteredSavedTemplates = savedTemplates.filter((st) => {
    if (savedTemplatesCat !== 'all' && st.category && st.category !== savedTemplatesCat) return false;
    if (!savedTemplatesSearch.trim()) return true;
    const term = savedTemplatesSearch.trim().toLowerCase();
    return (st.name || '').toLowerCase().includes(term) || (st.description || '').toLowerCase().includes(term);
  });

  const MERGE_TOKENS = [
    { tag: '{{name}}', labelAr: 'اسم المشترك', labelEn: 'Contact Name', sample: 'أحمد علي' },
    { tag: '{{email}}', labelAr: 'البريد الإلكتروني', labelEn: 'Contact Email', sample: 'user@example.com' },
    { tag: '{{phone}}', labelAr: 'رقم الهاتف', labelEn: 'Phone Number', sample: '+96650000000' },
    { tag: '{{credits}}', labelAr: 'رصيد الكريدت', labelEn: 'Credit Balance', sample: '500' },
    { tag: '{{plan}}', labelAr: 'اسم الباقة', labelEn: 'Plan Name', sample: 'Growth Pro' },
    { tag: '{{dashboard_url}}', labelAr: 'رابط لوحة التحكم', labelEn: 'Dashboard URL', sample: 'https://upklick.net/dashboard' },
    { tag: '{{unsubscribe_url}}', labelAr: 'رابط إلغاء الاشتراك', labelEn: 'Unsubscribe Link', sample: 'https://upklick.net/unsub' }
  ];

  return (
    <div
      className="email-builder-overlay"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: '#090912',
        display: 'flex',
        flexDirection: 'column',
        color: '#f1f5f9',
        overflow: 'hidden',
        fontFamily: 'inherit'
      }}
    >
      {/* Hidden File Input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJson}
        accept=".json,application/json"
        style={{ display: 'none' }}
      />

      {/* Top Navigation Bar */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#0e0e1a',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 4px 14px rgba(255, 107, 53, 0.4)'
            }}
          >
            ✉️
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{t('مصمم الإيميلات المرئي الذكي', 'Visual Drag & Drop Email Designer')}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {campaignName ? `${t('الحملة:', 'Campaign:')} ${campaignName}` : t('محرر السحب والإفلات وقوالب الإيميل الجاهزة', 'Interactive Drag & Drop Canvas & Templates')}
            </div>
          </div>
        </div>

        {/* Viewport, Dark/Light simulator and History Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Viewport Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={() => setViewportMode('desktop')}
              style={{
                background: viewportMode === 'desktop' ? '#FF6B35' : 'transparent',
                color: viewportMode === 'desktop' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.15s ease'
              }}
              title={t('عرض شاشة الكمبيوتر (600px)', 'Desktop preview (600px)')}
            >
              <Monitor size={14} />
              <span>{t('كمبيوتر', 'Desktop')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('mobile')}
              style={{
                background: viewportMode === 'mobile' ? '#FF6B35' : 'transparent',
                color: viewportMode === 'mobile' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.15s ease'
              }}
              title={t('عرض هاتف الجوال (375px)', 'Mobile phone preview (375px)')}
            >
              <Smartphone size={14} />
              <span>{t('موبايل', 'Mobile')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('code')}
              style={{
                background: viewportMode === 'code' ? '#FF6B35' : 'transparent',
                color: viewportMode === 'code' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.15s ease'
              }}
              title={t('عرض كود HTML المصدر', 'HTML Source Code')}
            >
              <Code size={14} />
              <span>HTML</span>
            </button>
          </div>

          {/* Email Client Dark/Light Simulator Switch */}
          <button
            type="button"
            onClick={() => setPreviewDarkClient((prev) => !prev)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: previewDarkClient ? '#f59e0b' : '#38bdf8',
              borderRadius: '8px',
              padding: '7px 11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 700
            }}
            title={t('تبديل مظهر العميل (فاتح / داكن)', 'Toggle email client preview (Light/Dark mode)')}
          >
            {previewDarkClient ? <Moon size={14} /> : <Sun size={14} />}
            <span>{previewDarkClient ? t('داكن', 'Dark') : t('فاتح', 'Light')}</span>
          </button>

          {/* Undo / Redo */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: historyIndex <= 0 ? '#475569' : '#e2e8f0',
                borderRadius: '8px',
                padding: '7px 11px',
                cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer'
              }}
              title={t('تراجع (Ctrl+Z)', 'Undo (Ctrl+Z)')}
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: historyIndex >= history.length - 1 ? '#475569' : '#e2e8f0',
                borderRadius: '8px',
                padding: '7px 11px',
                cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer'
              }}
              title={t('إعادة (Ctrl+Y)', 'Redo (Ctrl+Y)')}
            >
              <Redo2 size={15} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Save as Custom Template Button */}
          <button
            type="button"
            onClick={() => {
              setNewTemplateName(campaignName || t('تصميم بريد احترافي', 'Custom Email Design'));
              setSaveTemplateModalOpen(true);
            }}
            style={{
              background: 'rgba(108, 53, 255, 0.18)',
              border: '1px solid rgba(108, 53, 255, 0.45)',
              color: '#c4b5fd',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title={t('حفظ التصميم في مكتبة القوالب لإعادة استخدامه وإرساله لاحقاً (Ctrl+S)', 'Save layout as custom template to reuse anytime')}
          >
            <Bookmark size={15} color="#a78bfa" />
            <span>{t('حفظ كقالب مخصص', 'Save as Template')}</span>
          </button>

          {/* Send Test Email Button */}
          <button
            type="button"
            onClick={() => { setTestModalOpen(true); setTestFeedback(null); }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Send size={14} color="#FF6B35" />
            <span>{t('إرسال تجريبي', 'Send Test')}</span>
          </button>

          {/* Apply & Save Button */}
          <button
            type="button"
            onClick={handleFinalSave}
            style={{
              background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '8px 22px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(255, 107, 53, 0.4)'
            }}
          >
            <Check size={16} />
            <span>{t('تطبيق وحفظ التصميم', 'Apply & Save Design')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={t('إغلاق', 'Close')}
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Workspace 3-Column Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Side: Blocks Catalog, Ready Templates, My Templates, Tokens & Theme */}
        <aside
          style={{
            width: '330px',
            borderRight: isRTL ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: isRTL ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            background: '#0e0e1a',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}
        >
          {/* Drawer Tabs (5 Tabs) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '4px' }}>
            {[
              { id: 'elements', label: t('العناصر', 'Blocks'), icon: Layers },
              { id: 'templates', label: t('القوالب', 'Ready'), icon: Sparkles },
              { id: 'my-templates', label: t('تصاميمي', 'Saved'), icon: FolderHeart },
              { id: 'tokens', label: t('المتغيرات', 'Tokens'), icon: Tag },
              { id: 'theme', label: t('السمة', 'Theme'), icon: Palette }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSideTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSideTab(tab.id)}
                  style={{
                    background: isActive ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 2px',
                    color: isActive ? '#FF6B35' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Toast feedback for saved template */}
          {savedFeedback && (
            <div style={{ padding: '8px 14px', background: 'rgba(16, 185, 129, 0.15)', borderBottom: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '11.5px', fontWeight: 700, textAlign: 'center' }}>
              {savedFeedback}
            </div>
          )}

          {/* Drawer Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            
            {/* 1. BLOCKS CATALOG */}
            {activeSideTab === 'elements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t('اسحب العنصر إلى المساحة أو اضغط للإضافة:', 'Drag block to canvas or click to add:')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {AVAILABLE_BLOCKS_CATALOG.map((cat) => {
                    const Icon = ICON_MAP[cat.icon] || Layout;
                    return (
                      <div
                        key={cat.type}
                        draggable={true}
                        onDragStart={(e) => handleDragStartCatalog(cat.type, e)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleAddBlock(cat.type)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '12px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'grab',
                          textAlign: 'center',
                          color: '#e2e8f0',
                          userSelect: 'none',
                          transition: 'all 0.18s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 107, 53, 0.12)';
                          e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FF6B35'
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <span style={{ fontSize: '11.5px', fontWeight: 700 }}>
                          {isRTL ? cat.labelAr : cat.labelEn}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. READY PREBUILT TEMPLATES */}
            {activeSideTab === 'templates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8' }}>
                  {t('قوالب جاهزة عالية التحويل:', 'High-converting ready templates:')}
                </div>
                {PREBUILT_EMAIL_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleApplyTemplate(tmpl)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(108, 53, 255, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(108, 53, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '22px' }}>{tmpl.thumbnail}</span>
                      {tmpl.badge && (
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: 'rgba(255, 107, 53, 0.15)', color: '#FF6B35', border: '1px solid rgba(255, 107, 53, 0.3)' }}>
                          {tmpl.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                        {isRTL ? tmpl.nameAr : tmpl.nameEn}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
                        {isRTL ? tmpl.descriptionAr : tmpl.descriptionEn}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. MY CUSTOM SAVED DESIGNS & TEMPLATES */}
            {activeSideTab === 'my-templates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8' }}>
                    {t('قوالبي وتصاميمي المحفوظة:', 'My Saved Designs & Templates:')}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '3px 7px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={t('استيراد قالب من ملف JSON', 'Import template from JSON file')}
                    >
                      <Upload size={11} />
                      <span>{t('استيراد', 'Import')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTemplateName(campaignName || t('تصميمي المخصص', 'My Custom Design'));
                        setSaveTemplateModalOpen(true);
                      }}
                      style={{ background: 'rgba(255, 107, 53, 0.15)', color: '#FF6B35', border: '1px solid rgba(255, 107, 53, 0.3)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      + {t('حفظ الحالي', 'Save Current')}
                    </button>
                  </div>
                </div>

                {/* Search Bar for Saved Templates */}
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', top: '9px', [isRTL ? 'right' : 'left']: '10px', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder={t('بحث في تصاميمي...', 'Search my saved designs...')}
                    value={savedTemplatesSearch}
                    onChange={(e) => setSavedTemplatesSearch(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: isRTL ? '6px 30px 6px 10px' : '6px 10px 6px 30px',
                      fontSize: '11.5px',
                      color: '#ffffff'
                    }}
                  />
                </div>

                {/* Category Filter Chips */}
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSavedTemplatesCat(cat.id)}
                      style={{
                        background: savedTemplatesCat === cat.id ? '#6C35FF' : 'rgba(255,255,255,0.04)',
                        color: savedTemplatesCat === cat.id ? '#ffffff' : '#94a3b8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isRTL ? cat.labelAr : cat.labelEn}
                    </button>
                  ))}
                </div>

                {filteredSavedTemplates.length === 0 ? (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b', fontSize: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <Bookmark size={24} style={{ margin: '0 auto 8px', color: '#a78bfa' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>{t('لا توجد تصاميم محفوظة تطابق بحثك', 'No matching saved designs')}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px' }}>{t('احفظ تصميمك الحالي لإعادة استخدامه في حملاتك القادمة!', 'Save any design to reuse across campaigns!')}</p>
                  </div>
                ) : (
                  filteredSavedTemplates.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '22px' }}>{st.thumbnail || '🎨'}</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '13px', color: '#ffffff' }}>
                              {st.name}
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                              {st.blocks?.length || 0} {t('عناصر', 'blocks')} · {st.createdAt ? new Date(st.createdAt).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons on saved card */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleExportTemplateJson(st)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '3px' }}
                            title={t('تصدير كملف JSON', 'Export as JSON file')}
                          >
                            <Download size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTemplateConfirm(st)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '3px' }}
                            title={t('حذف القالب', 'Delete template')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {st.description && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                          {st.description}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleApplyTemplate({ blocks: st.blocks, theme: st.theme, nameAr: st.name, nameEn: st.name, thumbnail: st.thumbnail })}
                        style={{
                          background: 'rgba(108, 53, 255, 0.15)',
                          border: '1px solid rgba(108, 53, 255, 0.35)',
                          color: '#c4b5fd',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          marginTop: '2px'
                        }}
                      >
                        <Sparkles size={13} />
                        <span>{t('استخدام وتحميل هذا التصميم', 'Load this Design to Canvas')}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. DYNAMIC MERGE TOKENS */}
            {activeSideTab === 'tokens' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px' }}>
                  {t('المتغيرات الديناميكية (Merge Tags):', 'Dynamic Variables (Tokens):')}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                  {t('اضغط على أي متغير لنسخه ولصقه في نصوص أو عناوين البريد الإلكتروني:', 'Click any token to copy and paste it into texts:')}
                </div>
                {MERGE_TOKENS.map((tk) => {
                  const isCopied = copiedToken === tk.tag;
                  return (
                    <div
                      key={tk.tag}
                      onClick={() => handleCopyToken(tk.tag)}
                      style={{
                        background: isCopied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isCopied ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#FF6B35', fontFamily: 'monospace' }}>
                          {tk.tag}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {isRTL ? tk.labelAr : tk.labelEn} · <span style={{ color: '#64748b' }}>({tk.sample})</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: isCopied ? '#10b981' : '#94a3b8', fontWeight: 700 }}>
                        {isCopied ? `✓ ${t('تم النسخ', 'Copied')}` : t('نسخ', 'Copy')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. GLOBAL EMAIL THEME SETTINGS */}
            {activeSideTab === 'theme' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8' }}>
                  {t('الإعدادات العامة للبريد:', 'Global Email Theme:')}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    {t('اتجاه النص (Direction)', 'Text Direction')}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setTheme((prev) => ({ ...prev, direction: 'rtl' }))}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        background: theme.direction === 'rtl' ? '#FF6B35' : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}
                    >
                      RTL (عربي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme((prev) => ({ ...prev, direction: 'ltr' }))}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        background: theme.direction === 'ltr' ? '#FF6B35' : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}
                    >
                      LTR (English)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    {t('لون خلفية المحتوى الداخلي', 'Container Background')}
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={theme.containerBackgroundColor || '#12121f'}
                      onChange={(e) => setTheme((prev) => ({ ...prev, containerBackgroundColor: e.target.value }))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={theme.containerBackgroundColor || '#12121f'}
                      onChange={(e) => setTheme((prev) => ({ ...prev, containerBackgroundColor: e.target.value }))}
                      style={{ flex: 1, fontSize: '12px' }}
                    />
                  </div>
                  {/* Preset Colors */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {COLOR_PALETTE_PRESETS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setTheme((prev) => ({ ...prev, containerBackgroundColor: col }))}
                        style={{ width: '20px', height: '20px', borderRadius: '50%', background: col, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    {t('لون الخلفية الخارجية', 'Outer Body Background')}
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={theme.bodyBackgroundColor || '#090912'}
                      onChange={(e) => setTheme((prev) => ({ ...prev, bodyBackgroundColor: e.target.value }))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={theme.bodyBackgroundColor || '#090912'}
                      onChange={(e) => setTheme((prev) => ({ ...prev, bodyBackgroundColor: e.target.value }))}
                      style={{ flex: 1, fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    {t('عرض الحاوية الأقصى (Max Width)', 'Max Container Width')}
                  </label>
                  <select
                    className="form-control"
                    value={theme.containerMaxWidth || 600}
                    onChange={(e) => setTheme((prev) => ({ ...prev, containerMaxWidth: Number(e.target.value) }))}
                    style={{ fontSize: '12px' }}
                  >
                    <option value={540}>540px ({t('مضغوط', 'Compact')})</option>
                    <option value={600}>600px ({t('القياسي لمعظم الإيميلات', 'Standard 600px')})</option>
                    <option value={660}>660px ({t('واسع', 'Wide')})</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center: Interactive Visual Drag & Drop Canvas */}
        <main
          style={{
            flex: 1,
            background: previewDarkClient ? (theme.bodyBackgroundColor || '#090912') : '#f1f5f9',
            overflowY: 'auto',
            padding: viewportMode === 'mobile' ? '36px 20px' : '24px 20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            transition: 'background 0.25s ease'
          }}
        >
          {viewportMode === 'code' ? (
            <div
              style={{
                maxWidth: '800px',
                width: '100%',
                background: '#12121f',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                  {t('كود HTML المصدر للبريد (مترجم تلقائياً):', 'Compiled HTML Source Code:')}
                </div>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="btn btn-ghost btn-sm"
                  style={{ color: htmlCopied ? '#10b981' : '#FF6B35' }}
                >
                  <Copy size={14} />
                  <span>{htmlCopied ? t('تم نسخ الـ HTML!', 'HTML Copied!') : t('نسخ الكود', 'Copy HTML')}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={compiledHtml}
                rows={22}
                style={{
                  width: '100%',
                  background: '#0a0a14',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '14px',
                  lineHeight: 1.6,
                  resize: 'vertical'
                }}
              />
            </div>
          ) : (
            <div
              className={`email-canvas-viewport ${viewportMode === 'mobile' ? 'is-mobile-frame' : ''}`}
              style={{
                width: viewportMode === 'mobile' ? '375px' : `${theme.containerMaxWidth || 600}px`,
                maxWidth: '100%',
                background: theme.containerBackgroundColor || '#12121f',
                border: viewportMode === 'mobile' ? '12px solid #27273a' : `1px solid ${theme.containerBorderColor || 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: viewportMode === 'mobile' ? '40px' : `${theme.containerBorderRadius || 16}px`,
                padding: viewportMode === 'mobile' ? '24px 16px' : '24px 28px',
                boxShadow: previewDarkClient ? '0 20px 50px rgba(0, 0, 0, 0.6)' : '0 20px 50px rgba(0, 0, 0, 0.15)',
                position: 'relative',
                transition: 'all 0.3s ease',
                direction: theme.direction === 'rtl' ? 'rtl' : 'ltr'
              }}
            >
              {/* Mobile Phone Top Notch / Dynamic Island */}
              {viewportMode === 'mobile' && (
                <div
                  style={{
                    width: '120px',
                    height: '18px',
                    background: '#27273a',
                    borderRadius: '0 0 12px 12px',
                    margin: '-24px auto 16px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#161622' }} />
                  <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: '#161622' }} />
                </div>
              )}

              {/* Blocks Stream with Live Drag & Drop Insertion Slots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                
                {/* Top Drop Slot (Index 0) */}
                <div
                  onDragOver={(e) => handleDragOverCanvasSlot(0, e)}
                  onDrop={(e) => handleDropCanvasSlot(0, e)}
                  style={{
                    height: dropTargetIndex === 0 ? '42px' : '8px',
                    margin: '2px 0',
                    borderRadius: '8px',
                    border: dropTargetIndex === 0 ? '2px dashed #FF6B35' : (draggedCatalogType || draggedCanvasIndex !== null ? '1px dashed rgba(255, 107, 53, 0.3)' : '1px dashed transparent'),
                    background: dropTargetIndex === 0 ? 'rgba(255, 107, 53, 0.2)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: '#FF6B35',
                    fontWeight: 800,
                    boxShadow: dropTargetIndex === 0 ? '0 0 16px rgba(255, 107, 53, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {dropTargetIndex === 0 && `─── 📍 ${t('إفلات العنصر هنا في البداية', 'Drop block here at top')} ───`}
                </div>

                {blocks.map((block, index) => {
                  const isSelected = selectedBlockId === block.id;
                  const isBeingDragged = draggedCanvasIndex === index;
                  return (
                    <React.Fragment key={block.id}>
                      <div
                        onClick={() => setSelectedBlockId(block.id)}
                        className={`email-builder-block ${isSelected ? 'is-selected' : ''}`}
                        style={{
                          position: 'relative',
                          borderRadius: '8px',
                          outline: isSelected ? '2px solid #FF6B35' : '1px dashed transparent',
                          background: isSelected ? 'rgba(255, 107, 53, 0.04)' : 'transparent',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          opacity: isBeingDragged ? 0.35 : 1,
                          transform: isBeingDragged ? 'scale(0.98)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Floating Block Actions Bar on Hover / Selection */}
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-16px',
                              [theme.direction === 'rtl' ? 'left' : 'right']: '10px',
                              zIndex: 20,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#1e1e30',
                              border: '1px solid #FF6B35',
                              borderRadius: '7px',
                              padding: '2px 6px',
                              boxShadow: '0 6px 16px rgba(0,0,0,0.6)'
                            }}
                          >
                            {/* Drag Handle */}
                            <div
                              draggable={true}
                              onDragStart={(e) => handleDragStartCanvas(index, e)}
                              onDragEnd={handleDragEnd}
                              style={{ cursor: 'grab', padding: '2px 4px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                              title={t('اسحب لإعادة الترتيب', 'Drag to reorder')}
                            >
                              <GripVertical size={14} />
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleMoveBlock(block.id, 'up', e)}
                              disabled={index === 0}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: index === 0 ? '#475569' : '#e2e8f0',
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                padding: '2px 4px'
                              }}
                              title={t('تحريك للأعلى', 'Move Up')}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleMoveBlock(block.id, 'down', e)}
                              disabled={index === blocks.length - 1}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: index === blocks.length - 1 ? '#475569' : '#e2e8f0',
                                cursor: index === blocks.length - 1 ? 'not-allowed' : 'pointer',
                                padding: '2px 4px'
                              }}
                              title={t('تحريك للأسفل', 'Move Down')}
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDuplicateBlock(block.id, e)}
                              style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: '2px 4px' }}
                              title={t('تكرار', 'Duplicate')}
                            >
                              <Copy size={13} />
                            </button>
                            {blocks.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setDeleteBlockConfirmId(block.id); }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px' }}
                                title={t('حذف', 'Delete')}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Render block visual representation on canvas */}
                        <RenderCanvasBlock block={block} theme={theme} isRTL={theme.direction === 'rtl'} />
                      </div>

                      {/* Drop Slot & Quick Inserter Between Blocks */}
                      <div
                        onDragOver={(e) => handleDragOverCanvasSlot(index + 1, e)}
                        onDrop={(e) => handleDropCanvasSlot(index + 1, e)}
                        style={{
                          height: dropTargetIndex === index + 1 ? '42px' : '10px',
                          margin: '2px 0',
                          borderRadius: '8px',
                          border: dropTargetIndex === index + 1 ? '2px dashed #FF6B35' : (draggedCatalogType || draggedCanvasIndex !== null ? '1px dashed rgba(255, 107, 53, 0.3)' : '1px dashed transparent'),
                          background: dropTargetIndex === index + 1 ? 'rgba(255, 107, 53, 0.2)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          color: '#FF6B35',
                          fontWeight: 800,
                          boxShadow: dropTargetIndex === index + 1 ? '0 0 16px rgba(255, 107, 53, 0.35)' : 'none',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        {dropTargetIndex === index + 1 ? (
                          `─── 📍 ${t('إفلات العنصر هنا', 'Drop block here')} ───`
                        ) : (
                          <button
                            type="button"
                            onClick={() => setQuickInsertIndex(quickInsertIndex === index + 1 ? null : index + 1)}
                            className="email-canvas-quick-add-btn"
                            style={{
                              position: 'absolute',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#FF6B35',
                              color: '#fff',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '11px',
                              opacity: 0.7,
                              transition: 'opacity 0.15s ease'
                            }}
                            title={t('إضافة عنصر هنا', 'Add block here')}
                          >
                            +
                          </button>
                        )}
                      </div>

                      {/* Quick Insert Blocks Popover */}
                      {quickInsertIndex === index + 1 && (
                        <div
                          style={{
                            background: '#161626',
                            border: '1px solid #FF6B35',
                            borderRadius: '12px',
                            padding: '12px',
                            margin: '6px 0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#FF6B35' }}>
                              {t('اختر عنصراً للإدراج في هذا الموضع:', 'Select block to insert here:')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuickInsertIndex(null)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
                            >
                              ✕
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            {AVAILABLE_BLOCKS_CATALOG.slice(0, 8).map((cat) => (
                              <button
                                key={cat.type}
                                type="button"
                                onClick={() => handleAddBlock(cat.type, index + 1)}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  padding: '6px',
                                  color: '#e2e8f0',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {isRTL ? cat.labelAr : cat.labelEn}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Bottom Inserter Button */}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveSideTab('elements')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px',
                    padding: '8px 18px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FF6B35';
                    e.currentTarget.style.color = '#FF6B35';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <Plus size={14} />
                  <span>{t('إضافة عنصر جديد من القائمة', 'Add New Block from Catalog')}</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right Side: Properties Inspector Panel */}
        <aside
          style={{
            width: '330px',
            borderLeft: isRTL ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRight: isRTL ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            background: '#0e0e1a',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '13px',
              fontWeight: 800,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{t('خصائص وتصميم العنصر', 'Block Properties & Styling')}</span>
            {selectedBlock && (
              <span style={{ fontSize: '11px', color: '#FF6B35', fontWeight: 700, textTransform: 'uppercase' }}>
                {selectedBlock.type}
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {selectedBlock ? (
              <BlockPropertiesEditor
                block={selectedBlock}
                onChange={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
                isRTL={isRTL}
                t={t}
              />
            ) : (
              <div style={{ padding: '40px 10px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <MousePointerClick size={28} style={{ margin: '0 auto 10px', color: '#FF6B35' }} />
                <p style={{ margin: 0, fontWeight: 700 }}>{t('حدد أي عنصر من مساحة العمل لتعديل نصوصه وألوانه', 'Select any block on canvas to edit its properties')}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Save As Custom Template Modal Dialog */}
      {saveTemplateModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSaveTemplateModalOpen(false)}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#12121f',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              direction: isRTL ? 'rtl' : 'ltr'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bookmark size={20} color="#a78bfa" />
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#ffffff' }}>
                  {t('حفظ التصميم في مكتبة القوالب', 'Save to Custom Template Library')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSaveTemplateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
              {t(
                'احفظ هذا التصميم باسم مخصص وتصنيف لتتمكن من إعادة استخدامه وإرساله في أي حملة قادمة بنقرة زر واحدة:',
                'Save this layout so you can load it in future campaigns with 1 click:'
              )}
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                {t('اسم القالب', 'Template Name')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-control"
                placeholder={t('مثال: رسائل الترقية الأسبوعية - الصيف', 'e.g. Weekly Pro Upgrade Offer')}
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                {t('التصنيف', 'Category')}
              </label>
              <select
                className="form-control"
                value={newTemplateCat}
                onChange={(e) => setNewTemplateCat(e.target.value)}
                style={{ fontSize: '12.5px' }}
              >
                <option value="welcome">{t('ترحيب بالمشتركين الجدد', 'Welcome Onboarding')}</option>
                <option value="promo">{t('عروض وتخفيضات وكوبونات', 'Promotions & Coupons')}</option>
                <option value="newsletter">{t('نشرات وتحديثات دورية', 'Newsletters & Updates')}</option>
                <option value="custom">{t('قالب مخصص عام', 'General Custom')}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                {t('وصف مختصر (اختياري)', 'Description (Optional)')}
              </label>
              <input
                className="form-control"
                placeholder={t('وصف سريع لمحتوى واستخدام القالب...', 'Short description...')}
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                {t('أيقونة القالب', 'Template Icon')}
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['🎨', '🚀', '🔥', '✨', '🎁', '⚡', '📢', '🎙️', '⏳', '⭐'].map((ico) => (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setNewTemplateIcon(ico)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      fontSize: '18px',
                      background: newTemplateIcon === ico ? 'rgba(108, 53, 255, 0.3)' : 'rgba(255,255,255,0.04)',
                      border: newTemplateIcon === ico ? '2px solid #6C35FF' : '1px solid var(--line)',
                      cursor: 'pointer'
                    }}
                  >
                    {ico}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSaveTemplateModalOpen(false)}
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAsCustomTemplate}
                disabled={savingTemplate || !newTemplateName.trim()}
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800
                }}
              >
                {savingTemplate ? t('جارٍ الحفظ…', 'Saving…') : t('حفظ التصميم في مكتبتي ✨', 'Save to Library ✨')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Send Email Modal */}
      {testModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setTestModalOpen(false)}
        >
          <div
            style={{
              maxWidth: '460px',
              width: '100%',
              background: '#12121f',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '22px 24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              direction: isRTL ? 'rtl' : 'ltr'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="#FF6B35" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                  {t('إرسال بريد تجريبي فوري', 'Send Instant Test Email')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
              {t(
                'أدخل أي بريد إلكتروني لمعاينة الشكل والتنسيق الحقيقي كما سيظهر في Gmail و Apple Mail و Outlook:',
                'Enter any email address to preview the design as it appears in real inboxes:'
              )}
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                {t('البريد الإلكتروني للمستلم', 'Recipient Email Address')}
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="youremail@domain.com"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                autoFocus
              />
            </div>

            {testFeedback && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  background: testFeedback.ok ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: testFeedback.ok ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: testFeedback.ok ? '#10b981' : '#f87171'
                }}
              >
                {testFeedback.msg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTestModalOpen(false)}
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendTest}
                disabled={testSending || !testEmailInput.trim()}
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)',
                  border: 'none',
                  color: '#ffffff'
                }}
              >
                {testSending ? t('جارٍ الإرسال…', 'Sending…') : t('إرسال الآن 🚀', 'Send Now 🚀')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Applying Templates */}
      {pendingTemplate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPendingTemplate(null)}
        >
          <div
            style={{
              maxWidth: '460px',
              width: '100%',
              background: '#12121f',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '22px 24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              direction: isRTL ? 'rtl' : 'ltr'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255, 107, 53, 0.15)',
                  color: '#FF6B35',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0
                }}
              >
                {pendingTemplate.thumbnail || '✨'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                  {t('تطبيق هذا القالب؟', 'Apply this template?')}
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {isRTL ? pendingTemplate.nameAr || pendingTemplate.name : pendingTemplate.nameEn || pendingTemplate.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingTemplate(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.6 }}>
              {t(
                'هل أنت متأكد من تطبيق هذا القالب؟ سيتم استبدال التصميم الحالي في مساحة العمل بالتصميم الجديد.',
                'Are you sure you want to apply this template? The current canvas layout will be replaced.'
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPendingTemplate(null)}
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '8px 20px'
                }}
                onClick={() => {
                  setBlocks(pendingTemplate.blocks);
                  setTheme(pendingTemplate.theme || DEFAULT_EMAIL_THEME);
                  setSelectedBlockId(pendingTemplate.blocks[0]?.id || null);
                  recordHistory(pendingTemplate.blocks, pendingTemplate.theme || DEFAULT_EMAIL_THEME);
                  setPendingTemplate(null);
                }}
              >
                {t('تطبيق القالب الآن ✨', 'Apply Template Now ✨')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Custom Template Confirmation Modal */}
      {deleteTemplateConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setDeleteTemplateConfirm(null)}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              background: '#12121f',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '22px 24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              direction: isRTL ? 'rtl' : 'ltr'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                {t('حذف القالب المخصص؟', 'Delete Custom Template?')}
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              {t(`هل تريد بالتأكيد حذف القالب "${deleteTemplateConfirm.name}" من مكتبتك؟ لا يمكن التراجع عن هذا الإجراء.`, `Are you sure you want to delete "${deleteTemplateConfirm.name}"? This action cannot be undone.`)}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteTemplateConfirm(null)}
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: '#ef4444', border: 'none', color: '#fff', fontWeight: 800 }}
                onClick={() => handleDeleteSavedTemplate(deleteTemplateConfirm.id)}
              >
                {t('تأكيد الحذف', 'Confirm Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Block Confirmation Modal */}
      {deleteBlockConfirmId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setDeleteBlockConfirmId(null)}
        >
          <div
            style={{
              maxWidth: '400px',
              width: '100%',
              background: '#12121f',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              direction: isRTL ? 'rtl' : 'ltr'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={16} color="#ef4444" />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                {t('حذف هذا العنصر؟', 'Delete this block?')}
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1' }}>
              {t('هل تريد بالتأكيد إزالة هذا العنصر من مساحة العمل؟', 'Are you sure you want to remove this block from the canvas?')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteBlockConfirmId(null)}
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{ background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700 }}
                onClick={() => handleDeleteBlock(deleteBlockConfirmId)}
              >
                {t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RenderCanvasBlock({ block, theme, isRTL }) {
  const dir = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';

  switch (block.type) {
    case BLOCK_TYPES.HEADER:
      return (
        <div style={{ textAlign: block.align || 'center', padding: `${block.paddingTop || 8}px 0 ${block.paddingBottom || 8}px 0` }}>
          {block.logoUrl ? (
            <img src={block.logoUrl} alt={block.logoText || 'Logo'} style={{ maxWidth: `${block.logoWidth || 160}px`, height: 'auto', display: 'inline-block' }} />
          ) : (
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: theme.primaryColor }}>{block.logoText || 'UpKlick'}</h1>
          )}
          {block.showTagline && block.tagline && (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{block.tagline}</div>
          )}
        </div>
      );

    case BLOCK_TYPES.HEADING:
      return (
        <div style={{ textAlign: block.align || textAlign, padding: `${block.paddingTop || 6}px 0 ${block.paddingBottom || 6}px 0`, direction: dir }}>
          <h2 style={{ margin: 0, fontSize: `${block.fontSize || 22}px`, fontWeight: block.fontWeight || 'bold', color: block.color || '#ffffff', lineHeight: 1.35 }}>
            {block.text}
          </h2>
        </div>
      );

    case BLOCK_TYPES.TEXT:
      return (
        <div
          style={{
            textAlign: block.align || textAlign,
            color: block.color || '#cbd5e1',
            fontSize: `${block.fontSize || 15}px`,
            lineHeight: block.lineHeight || 1.7,
            padding: `${block.paddingTop || 4}px 0 ${block.paddingBottom || 6}px 0`,
            direction: dir,
            whiteSpace: 'pre-wrap'
          }}
        >
          {block.content}
        </div>
      );

    case BLOCK_TYPES.BUTTON:
      const btnBg = block.style === 'gradient'
        ? `linear-gradient(135deg, ${block.gradientStart || '#FF6B35'}, ${block.gradientEnd || '#6C35FF'})`
        : (block.backgroundColor || '#FF6B35');
      return (
        <div style={{ textAlign: block.align || 'center', padding: `${block.paddingTop || 12}px 0 ${block.paddingBottom || 12}px 0` }}>
          <span
            style={{
              display: block.width === 'full' ? 'block' : 'inline-block',
              padding: `${block.paddingY || 14}px ${block.paddingX || 32}px`,
              background: btnBg,
              color: block.textColor || '#ffffff',
              fontWeight: block.fontWeight || 'bold',
              fontSize: `${block.fontSize || 15}px`,
              borderRadius: `${block.borderRadius || 12}px`,
              boxShadow: '0 4px 16px rgba(255, 107, 53, 0.35)',
              userSelect: 'none'
            }}
          >
            {block.text}
          </span>
        </div>
      );

    case BLOCK_TYPES.IMAGE:
      return (
        <div style={{ textAlign: block.align || 'center', padding: `${block.paddingTop || 6}px 0 ${block.paddingBottom || 6}px 0` }}>
          <img
            src={block.imageUrl}
            alt={block.altText || ''}
            style={{
              width: `${block.width || 100}%`,
              maxWidth: '100%',
              borderRadius: `${block.borderRadius || 12}px`,
              display: 'inline-block'
            }}
          />
          {block.caption && (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{block.caption}</div>
          )}
        </div>
      );

    case BLOCK_TYPES.CARD:
      return (
        <div
          style={{
            background: block.backgroundColor || 'rgba(255, 107, 53, 0.08)',
            border: `1px solid ${block.borderColor || 'rgba(255, 107, 53, 0.3)'}`,
            borderRadius: `${block.borderRadius || 14}px`,
            padding: `${block.padding || 16}px`,
            margin: `${block.paddingTop || 8}px 0 ${block.paddingBottom || 8}px 0`,
            textAlign: block.align || textAlign,
            direction: dir
          }}
        >
          {block.icon && <div style={{ fontSize: '22px', marginBottom: '6px' }}>{block.icon}</div>}
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: block.titleColor || '#FF6B35', marginBottom: '4px' }}>
            {block.title}
          </div>
          <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: block.textColor || '#e2e8f0', whiteSpace: 'pre-wrap' }}>
            {block.description}
          </div>
        </div>
      );

    case BLOCK_TYPES.COUNTDOWN:
      return (
        <div
          style={{
            background: block.backgroundColor || 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${block.borderColor || 'rgba(239, 68, 68, 0.35)'}`,
            borderRadius: '12px',
            padding: '16px',
            margin: `${block.paddingTop || 8}px 0 ${block.paddingBottom || 8}px 0`,
            textAlign: 'center',
            direction: dir
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: block.titleColor || '#f87171', marginBottom: '6px' }}>
            {block.title}
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '3px',
              color: block.digitsColor || '#ffffff',
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.35)',
              display: 'inline-block',
              padding: '6px 18px',
              borderRadius: '8px'
            }}
          >
            {block.timeDisplay}
          </div>
          {block.subtitle && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{block.subtitle}</div>}
        </div>
      );

    case BLOCK_TYPES.VIDEO:
      return (
        <div style={{ textAlign: 'center', padding: `${block.paddingTop || 8}px 0 ${block.paddingBottom || 8}px 0`, position: 'relative' }}>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <img src={block.thumbnailUrl} alt="Video" style={{ width: '100%', borderRadius: `${block.borderRadius || 12}px` }} />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255, 107, 53, 0.9)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
            >
              ▶
            </div>
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#FF6B35', marginTop: '6px' }}>{block.title}</div>
        </div>
      );

    case BLOCK_TYPES.TESTIMONIAL:
      return (
        <div
          style={{
            background: block.backgroundColor || 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${block.borderColor || 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: '14px',
            padding: '16px',
            margin: `${block.paddingTop || 8}px 0 ${block.paddingBottom || 8}px 0`,
            textAlign: block.align || textAlign,
            direction: dir
          }}
        >
          <div style={{ color: '#f59e0b', fontSize: '15px', marginBottom: '6px' }}>⭐⭐⭐⭐⭐</div>
          <div style={{ fontSize: '13.5px', fontStyle: 'italic', lineHeight: 1.6, color: block.textColor || '#e2e8f0', marginBottom: '8px' }}>
            "{block.quote}"
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#ffffff' }}>{block.authorName}</div>
          {block.authorRole && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{block.authorRole}</div>}
        </div>
      );

    case BLOCK_TYPES.PRICING:
      return (
        <div
          style={{
            background: block.backgroundColor || 'rgba(108, 53, 255, 0.1)',
            border: `2px solid ${block.borderColor || '#6C35FF'}`,
            borderRadius: '16px',
            padding: '20px',
            margin: `${block.paddingTop || 10}px 0 ${block.paddingBottom || 10}px 0`,
            textAlign: 'center',
            direction: dir
          }}
        >
          {block.badge && (
            <span style={{ display: 'inline-block', background: '#6C35FF', color: '#fff', fontSize: '10.5px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '999px', marginBottom: '6px' }}>
              {block.badge}
            </span>
          )}
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{block.planName}</div>
          <div style={{ margin: '6px 0 10px 0' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#FF6B35' }}>{block.price}</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}> {block.period}</span>
          </div>
          <div style={{ fontSize: '12.5px', lineHeight: 1.7, color: '#cbd5e1', textAlign: textAlign, marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
            {block.features}
          </div>
          <span style={{ display: 'inline-block', padding: '10px 24px', background: 'linear-gradient(135deg, #FF6B35, #6C35FF)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
            {block.buttonText}
          </span>
        </div>
      );

    case BLOCK_TYPES.COLUMNS:
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            margin: `${block.paddingTop || 8}px 0 ${block.paddingBottom || 8}px 0`,
            direction: dir
          }}
        >
          <div
            style={{
              background: block.cardBackground || 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${block.borderColor || 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: '12px',
              padding: '12px'
            }}
          >
            {block.col1?.icon && <div style={{ fontSize: '18px', marginBottom: '4px' }}>{block.col1.icon}</div>}
            <div style={{ fontWeight: 'bold', fontSize: '13.5px', color: block.titleColor || '#ffffff', marginBottom: '4px' }}>
              {block.col1?.title}
            </div>
            <div style={{ fontSize: '12px', color: block.textColor || '#94a3b8', lineHeight: 1.5 }}>
              {block.col1?.description}
            </div>
          </div>
          <div
            style={{
              background: block.cardBackground || 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${block.borderColor || 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: '12px',
              padding: '12px'
            }}
          >
            {block.col2?.icon && <div style={{ fontSize: '18px', marginBottom: '4px' }}>{block.col2.icon}</div>}
            <div style={{ fontWeight: 'bold', fontSize: '13.5px', color: block.titleColor || '#ffffff', marginBottom: '4px' }}>
              {block.col2?.title}
            </div>
            <div style={{ fontSize: '12px', color: block.textColor || '#94a3b8', lineHeight: 1.5 }}>
              {block.col2?.description}
            </div>
          </div>
        </div>
      );

    case BLOCK_TYPES.COUPON:
      return (
        <div
          style={{
            background: block.backgroundColor || 'rgba(108, 53, 255, 0.1)',
            border: `2px dashed ${block.borderColor || '#6C35FF'}`,
            borderRadius: '14px',
            padding: '16px',
            margin: `${block.paddingTop || 10}px 0 ${block.paddingBottom || 10}px 0`,
            textAlign: 'center',
            direction: dir
          }}
        >
          <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
            كوبون الخصم الخاص بك
          </div>
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '6px 20px',
              borderRadius: '8px',
              fontSize: '20px',
              fontWeight: 900,
              letterSpacing: '2px',
              color: block.codeColor || '#FF6B35',
              fontFamily: 'monospace',
              margin: '4px 0'
            }}
          >
            {block.code}
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px' }}>{block.discount}</div>
          {block.expiresText && <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>{block.expiresText}</div>}
        </div>
      );

    case BLOCK_TYPES.HTML:
      return (
        <div
          style={{
            padding: `${block.paddingTop || 8}px 0 ${block.paddingBottom || 8}px 0`,
            direction: dir
          }}
          dangerouslySetInnerHTML={{ __html: block.htmlContent || '' }}
        />
      );

    case BLOCK_TYPES.DIVIDER:
      return (
        <div style={{ padding: `${block.paddingTop || 12}px 0 ${block.paddingBottom || 12}px 0` }}>
          <div
            style={{
              width: `${block.width || 100}%`,
              margin: '0 auto',
              borderTop: `${block.thickness || 1}px ${block.style || 'solid'} ${block.color || 'rgba(255,255,255,0.1)'}`
            }}
          />
        </div>
      );

    case BLOCK_TYPES.SPACER:
      return <div style={{ height: `${block.height || 24}px` }} />;

    case BLOCK_TYPES.SOCIAL:
      return (
        <div style={{ textAlign: block.align || 'center', padding: `${block.paddingTop || 10}px 0 ${block.paddingBottom || 10}px 0` }}>
          <div style={{ display: 'inline-flex', gap: '8px' }}>
            {(block.platforms || []).map((p, i) => (
              <span
                key={i}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: '#ffffff'
                }}
              >
                {p.icon || '🔗'}
              </span>
            ))}
          </div>
        </div>
      );

    case BLOCK_TYPES.FOOTER:
      return (
        <div style={{ textAlign: block.align || 'center', padding: `${block.paddingTop || 16}px 0 ${block.paddingBottom || 16}px 0`, fontSize: '11.5px', color: block.textColor || '#64748b', lineHeight: 1.6, direction: dir }}>
          <div>{block.companyName} · {block.address}</div>
          <div style={{ marginTop: '4px' }}>
            {block.unsubscribeText}{' '}
            <span style={{ color: block.linkColor || '#94a3b8', textDecoration: 'underline' }}>{block.unsubscribeLabel}</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function BlockPropertiesEditor({ block, onChange, isRTL, t }) {
  const update = (field, val) => onChange({ [field]: val });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Block Type Header */}
      <div style={{ padding: '8px 12px', background: 'rgba(255, 107, 53, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 107, 53, 0.25)', fontSize: '12px', fontWeight: 700, color: '#FF6B35' }}>
        {t(`تعديل عنصر: ${block.type}`, `Editing block: ${block.type}`)}
      </div>

      {block.type === BLOCK_TYPES.HEADER && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('نص الشعار', 'Logo Text')}</label>
            <input className="form-control" value={block.logoText || ''} onChange={(e) => update('logoText', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('رابط صورة الشعار', 'Logo Image URL')}</label>
            <input className="form-control" value={block.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('عرض الشعار (px)', 'Logo Width')}</label>
            <input type="number" className="form-control" value={block.logoWidth || 160} onChange={(e) => update('logoWidth', Number(e.target.value))} />
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.HEADING && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('نص العنوان', 'Heading Text')}</label>
            <textarea className="form-control" rows={3} value={block.text || ''} onChange={(e) => update('text', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('حجم الخط', 'Font Size')}</label>
              <input type="number" className="form-control" value={block.fontSize || 24} onChange={(e) => update('fontSize', Number(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('المحاذاة', 'Align')}</label>
              <select className="form-control" value={block.align || 'right'} onChange={(e) => update('align', e.target.value)}>
                <option value="right">{t('يمين', 'Right')}</option>
                <option value="center">{t('وسط', 'Center')}</option>
                <option value="left">{t('يسار', 'Left')}</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('لون النص', 'Text Color')}</label>
            <input type="color" value={block.color || '#ffffff'} onChange={(e) => update('color', e.target.value)} style={{ width: '100%', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer' }} />
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.TEXT && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('محتوى الفقرة', 'Paragraph Text')}</label>
            <textarea className="form-control" rows={6} value={block.content || ''} onChange={(e) => update('content', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('حجم الخط', 'Font Size')}</label>
              <input type="number" className="form-control" value={block.fontSize || 15} onChange={(e) => update('fontSize', Number(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('المحاذاة', 'Align')}</label>
              <select className="form-control" value={block.align || 'right'} onChange={(e) => update('align', e.target.value)}>
                <option value="right">{t('يمين', 'Right')}</option>
                <option value="center">{t('وسط', 'Center')}</option>
                <option value="left">{t('يسار', 'Left')}</option>
              </select>
            </div>
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.BUTTON && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('نص الزر', 'Button Text')}</label>
            <input className="form-control" value={block.text || ''} onChange={(e) => update('text', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('الرابط المستهدف (URL)', 'Button URL')}</label>
            <input className="form-control" value={block.url || ''} onChange={(e) => update('url', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('نمط الزر', 'Button Style')}</label>
            <select className="form-control" value={block.style || 'gradient'} onChange={(e) => update('style', e.target.value)}>
              <option value="gradient">{t('تدرج لوني جذاب (Gradient)', 'Gradient')}</option>
              <option value="solid">{t('لون موحد (Solid)', 'Solid')}</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('العرض', 'Width')}</label>
              <select className="form-control" value={block.width || 'auto'} onChange={(e) => update('width', e.target.value)}>
                <option value="auto">{t('تلقائي', 'Auto')}</option>
                <option value="full">{t('عرض كامل (100%)', 'Full Width')}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('انحناء الحواف', 'Border Radius')}</label>
              <input type="number" className="form-control" value={block.borderRadius || 12} onChange={(e) => update('borderRadius', Number(e.target.value))} />
            </div>
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.IMAGE && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('رابط الصورة (URL)', 'Image URL')}</label>
            <input className="form-control" value={block.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} />
          </div>
          {/* Stock Banner Presets */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>{t('صور ونماذج جاهزة بنقرة واحدة:', 'Stock Photo Presets:')}</label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {STOCK_BANNER_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => update('imageUrl', p.url)}
                  style={{ fontSize: '10.5px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('رابط عند الضغط (اختياري)', 'Link URL')}</label>
            <input className="form-control" value={block.linkUrl || ''} onChange={(e) => update('linkUrl', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('العرض (%)', 'Width (%)')}</label>
              <input type="number" className="form-control" value={block.width || 100} onChange={(e) => update('width', Number(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('انحناء الحواف', 'Border Radius')}</label>
              <input type="number" className="form-control" value={block.borderRadius || 12} onChange={(e) => update('borderRadius', Number(e.target.value))} />
            </div>
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.CARD && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('الأيقونة', 'Icon')}</label>
              <input className="form-control" value={block.icon || '⚡'} onChange={(e) => update('icon', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('العنوان', 'Title')}</label>
              <input className="form-control" value={block.title || ''} onChange={(e) => update('title', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('الوصف', 'Description')}</label>
            <textarea className="form-control" rows={3} value={block.description || ''} onChange={(e) => update('description', e.target.value)} />
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.COUNTDOWN && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('عنوان التنبيه', 'Title')}</label>
            <input className="form-control" value={block.title || ''} onChange={(e) => update('title', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('عرض الوقت المتبقي', 'Time Display')}</label>
            <input className="form-control" value={block.timeDisplay || '24 : 00 : 00'} onChange={(e) => update('timeDisplay', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('الوصف الفرعي', 'Subtitle')}</label>
            <input className="form-control" value={block.subtitle || ''} onChange={(e) => update('subtitle', e.target.value)} />
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.VIDEO && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('رابط الصورة المصغرة', 'Thumbnail URL')}</label>
            <input className="form-control" value={block.thumbnailUrl || ''} onChange={(e) => update('thumbnailUrl', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('رابط الفيديو المستهدف (URL)', 'Video Link URL')}</label>
            <input className="form-control" value={block.videoUrl || ''} onChange={(e) => update('videoUrl', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('عنوان الفيديو', 'Video Title')}</label>
            <input className="form-control" value={block.title || ''} onChange={(e) => update('title', e.target.value)} />
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.TESTIMONIAL && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('نص الاقتباس والتقييم', 'Customer Quote')}</label>
            <textarea className="form-control" rows={3} value={block.quote || ''} onChange={(e) => update('quote', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('اسم العميل', 'Author Name')}</label>
              <input className="form-control" value={block.authorName || ''} onChange={(e) => update('authorName', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('الصفة / المنصب', 'Author Role')}</label>
              <input className="form-control" value={block.authorRole || ''} onChange={(e) => update('authorRole', e.target.value)} />
            </div>
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.PRICING && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('اسم الباقة', 'Plan Name')}</label>
              <input className="form-control" value={block.planName || ''} onChange={(e) => update('planName', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('السعر', 'Price')}</label>
              <input className="form-control" value={block.price || '$49'} onChange={(e) => update('price', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('الميزات (ميزة في كل سطر)', 'Features')}</label>
            <textarea className="form-control" rows={4} value={block.features || ''} onChange={(e) => update('features', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('رابط زر الشراء', 'Button URL')}</label>
            <input className="form-control" value={block.buttonUrl || ''} onChange={(e) => update('buttonUrl', e.target.value)} />
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.COUPON && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('رمز الكوبون', 'Coupon Code')}</label>
            <input className="form-control" value={block.code || ''} onChange={(e) => update('code', e.target.value.toUpperCase())} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('قيمة الخصم', 'Discount Text')}</label>
            <input className="form-control" value={block.discount || ''} onChange={(e) => update('discount', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('تنبيه الصلاحية', 'Expiration Notice')}</label>
            <input className="form-control" value={block.expiresText || ''} onChange={(e) => update('expiresText', e.target.value)} />
          </div>
        </>
      )}

      {block.type === BLOCK_TYPES.HTML && (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('كود HTML المخصص', 'Raw Custom HTML')}</label>
          <textarea className="form-control" rows={6} style={{ fontFamily: 'monospace', fontSize: '12px' }} value={block.htmlContent || ''} onChange={(e) => update('htmlContent', e.target.value)} />
        </div>
      )}

      {block.type === BLOCK_TYPES.SPACER && (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('ارتفاع الفراغ (px)', 'Height (px)')}</label>
          <input type="number" className="form-control" value={block.height || 24} onChange={(e) => update('height', Number(e.target.value))} />
        </div>
      )}

      {block.type === BLOCK_TYPES.FOOTER && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('اسم الشركة / المنصة', 'Company Name')}</label>
            <input className="form-control" value={block.companyName || ''} onChange={(e) => update('companyName', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>{t('العنوان / الحقوق', 'Address / Copyright')}</label>
            <input className="form-control" value={block.address || ''} onChange={(e) => update('address', e.target.value)} />
          </div>
        </>
      )}
    </div>
  );
}
