import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { Link } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Eye, FileText, Loader2, Plus, RefreshCw, Search, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Card, Field, Modal, PanelHeading } from './kit';
import { Select } from '../../components/ui/Select';
import { gosApi, type GosSource } from '../../backend/gosApi';
import { useGosAI } from '../../backend/useGosAI';
import { showToast } from '../../utils/toast';

export function KnowledgePanel() {
  useUILanguage();
  const api = useGosAI();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [draft, setDraft] = useState<{ name: string; content: string } | null>(null);
  const [viewingSource, setViewingSource] = useState<GosSource | null>(null);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const closeDraft = useCallback(() => { setDraft(null); setModalError(''); }, []);
  const closeViewing = useCallback(() => setViewingSource(null), []);

  const filteredSources = api.sources.filter(source => {
    const matchesStatus = statusFilter === 'All' || source.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesQuery = !query.trim() || `${source.name} ${source.content || ''}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const readyCount = api.sources.filter(s => s.status === 'ready').length;
  const pendingCount = api.sources.filter(s => ['queued', 'processing'].includes(s.status)).length;

  async function handleCreateSource(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const name = draft.name.trim();
    const content = draft.content.trim();
    if (!name || !content) {
      setModalError('Enter a title and content.');
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      const result = await gosApi.createSource({
        name,
        type: 'text',
        content,
      });
      showToast.success(`${name} added (${result.source.status}).`);
      setDraft(null);
      api.retry();
    } catch (err) {
      setModalError((err as Error).message || 'Failed to add knowledge source.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSource(source: GosSource) {
    if (!window.confirm(translateText(`Delete ${source.name}?`))) return;
    setDeletingId(source.id);
    try {
      await gosApi.deleteSource(source.id);
      showToast.success(`${source.name} removed.`);
      api.retry();
    } catch (err) {
      showToast.error((err as Error).message || 'Failed to delete knowledge source.');
    } finally {
      setDeletingId(null);
    }
  }

  function renderStatusBadge(status: string) {
    const s = status.toLowerCase();
    if (s === 'ready') {
      return <Badge tone="green"><CheckCircle2 size={12}/> {translateText("Ready")}</Badge>;
    }
    if (s === 'processing') {
      return <Badge tone="purple"><Loader2 size={12} className="animate-spin"/> {translateText("Processing")}</Badge>;
    }
    if (s === 'queued') {
      return <Badge tone="orange"><Clock size={12}/> {translateText("Queued")}</Badge>;
    }
    return <Badge tone="neutral">{localizeNode(status)}</Badge>;
  }

  return (
    <>
      <PanelHeading
        title={translateText("Business knowledge")}
        description="Approved answers, brand guidance and reference documents for your team and AI assistants."
      />

      <div className="st-knowledge-metrics">
        {localizeNode([
          { label: 'Total sources', count: api.sources.length, icon: BookOpen },
          { label: 'Ready & indexed', count: readyCount, icon: Sparkles },
          { label: 'In progress', count: pendingCount, icon: Clock },
        ].map(({ label, count, icon: Icon }) => (
          <Card key={label}>
            <Icon size={22} />
            <b>{localizeNode(count)}</b>
            <span>{translateText(label)}</span>
          </Card>
        )))}
      </div>

      <Card
        title={translateText("Knowledge library")}
        description="Approved knowledge is synced to your workspace and used by AI assistants."
        action={
          <button
            className="st-primary"
            onClick={() => { setModalError(''); setDraft({ name: '', content: '' }); }}
          >
            <Plus size={15} />
            {translateText("Add knowledge")}
          </button>
        }
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <Link className="st-secondary" to="/dashboard/knowledge?tab=templates">
            {translateText("Knowledge templates")}
          </Link>
          <button
            type="button"
            className="st-secondary small"
            disabled={api.loading}
            onClick={api.retry}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={api.loading ? 'animate-spin' : ''} />
            {translateText("Refresh list")}
          </button>
        </div>

        <div className="st-knowledge-toolbar">
          <label className="st-search">
            <Search size={16} />
            <input
              value={query}
              aria-label={translateText("Search knowledge")}
              placeholder={translateText("Search answers and documents…")}
              onChange={e => setQuery(e.target.value)}
            />
          </label>
          <Select
            label="Filter status"
            value={statusFilter}
            onChange={value => setStatusFilter(value)}
            options={['All', 'Ready', 'Processing', 'Queued']}
          />
        </div>

        {localizeNode(api.error && (
          <p className="st-error" role="alert">
            {localizeNode(api.error)}
            <button type="button" className="st-link" onClick={api.retry} style={{ marginInlineStart: 8 }}>
              {translateText("Try again")}
            </button>
          </p>
        ))}

        {localizeNode(api.loading && !api.sources.length ? (
          <div className="st-loading" role="status" aria-label={translateText("Loading knowledge sources")}>
            <div /><div /><div />
          </div>
        ) : (
          <div className="st-table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="text-start">{translateText("Source")}</th>
                  <th className="text-center">{translateText("Type")}</th>
                  <th className="text-center">{translateText("Indexed Chunks")}</th>
                  <th className="text-center">{translateText("Status")}</th>
                  <th className="text-center" style={{ width: 140 }}>{translateText("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map(source => (
                  <tr key={source.id}>
                    <td className="text-start">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="st-service-icon purple" style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }}>
                          <FileText size={16} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <b style={{ display: 'block', fontSize: 13, color: 'var(--st-ink)' }}>{localizeNode(source.name)}</b>
                          <small style={{ color: 'var(--st-muted)', fontSize: 11 }}>
                            {source.content ? source.content.slice(0, 60) + (source.content.length > 60 ? '…' : '') : (source.error || source.id)}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <Badge tone="neutral">{localizeNode(source.type)}</Badge>
                    </td>
                    <td className="text-center">
                      <span>{localizeNode(source.chunk_count !== undefined ? `${source.chunk_count} chunks` : (source.status === 'ready' ? 'Indexed' : '—'))}</span>
                    </td>
                    <td className="text-center">
                      <span role="status">
                        {localizeNode(renderStatusBadge(source.status))}
                      </span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="st-secondary small"
                          aria-label={translateText(`View ${source.name}`)}
                          onClick={() => setViewingSource(source)}
                        >
                          <Eye size={13} />
                          {translateText("View")}
                        </button>
                        <button
                          type="button"
                          className="st-danger"
                          style={{ padding: '5px 8px', minHeight: 27 }}
                          aria-label={translateText(`Delete ${source.name}`)}
                          disabled={deletingId === source.id}
                          onClick={() => void handleDeleteSource(source)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {localizeNode(!api.loading && !filteredSources.length && (
          <p className="st-note" style={{ textAlign: 'center', padding: '24px 0' }}>
            {localizeNode(api.sources.length ? translateText("No knowledge matches your search.") : translateText("No knowledge sources uploaded yet. Click 'Add knowledge' above to add your first source."))}
          </p>
        ))}
      </Card>

      {draft && (
        <Modal title={translateText("Add knowledge")} close={closeDraft}>
          <form onSubmit={handleCreateSource}>
            <Field label="Title">
              <input
                required
                maxLength={150}
                value={draft.name}
                placeholder={translateText("e.g., Return & Refund Policy")}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>

            <Field label="Approved content">
              <textarea
                required
                rows={8}
                value={draft.content}
                placeholder={translateText("Paste verified business information, FAQs, pricing, or guidelines for the AI assistant...")}
                onChange={e => setDraft({ ...draft, content: e.target.value })}
              />
            </Field>

            {localizeNode(modalError && (
              <p className="st-error" role="alert">{localizeNode(modalError)}</p>
            ))}

            <div className="st-modal-actions">
              <button type="button" className="st-secondary" disabled={submitting} onClick={closeDraft}>
                {translateText("Cancel")}
              </button>
              <button type="submit" className="st-primary" disabled={submitting}>
                {localizeNode(submitting ? translateText("Saving…") : translateText("Save knowledge"))}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingSource && (
        <Modal title={viewingSource.name} close={closeViewing}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span><b>{translateText("Status")}:</b></span>
              {renderStatusBadge(viewingSource.status)}
              <span style={{ marginInlineStart: 12 }}><b>{translateText("Type")}:</b> {viewingSource.type}</span>
              {viewingSource.chunk_count !== undefined && (
                <span style={{ marginInlineStart: 12 }}><b>{translateText("Chunks")}:</b> {viewingSource.chunk_count}</span>
              )}
            </div>

            {viewingSource.content ? (
              <Field label="Source content">
                <textarea
                  readOnly
                  rows={10}
                  value={viewingSource.content}
                  style={{ background: 'var(--st-soft)', color: 'var(--st-ink)' }}
                />
              </Field>
            ) : viewingSource.error ? (
              <p className="st-error" role="alert">{viewingSource.error}</p>
            ) : (
              <p className="st-note">{translateText("This source was indexed into embeddings and is active in your assistant's knowledge base.")}</p>
            )}

            <div className="st-modal-actions">
              <button type="button" className="st-secondary" onClick={closeViewing}>
                {translateText("Close")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
