import { useState } from 'react';
import { Braces, Check, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Modal } from './settings/kit';
import { AssetSelect } from './AssetControls';
import { domainReportRows, downloadDomainReport } from './domain-export';
import type { Domain, Workspace } from './asset-model';

export function DomainExportDialog({ domains, selected, workspace, close }: { domains: Domain[]; selected: string[]; workspace: Workspace; close: () => void }) {
  const selectedDomains = domains.filter(domain => selected.includes(domain.id));
  const [scope, setScope] = useState(selectedDomains.length ? 'selected' : 'filtered');
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const rows = scope === 'selected' ? selectedDomains : domains;
  return <Modal title="Export domains" close={close}><div className="aw-modal-body aw-export-dialog">
    <p>Download a summary of your domains, their connections, SSL state, and renewal dates.</p>
    <label>Include<AssetSelect label="Export scope" value={scope} onChange={setScope} options={[{ value: 'filtered', label: `Filtered domains (${domains.length})` }, { value: 'selected', label: `Selected domains (${selectedDomains.length})`, disabled: !selectedDomains.length }]}/></label>
    <div className="aw-export-formats" role="radiogroup" aria-label="Export format">{[
      { value: 'csv' as const, label: 'CSV', hint: 'Excel & spreadsheets', Icon: FileSpreadsheet },
      { value: 'json' as const, label: 'JSON', hint: 'Structured data', Icon: Braces },
      { value: 'pdf' as const, label: 'PDF', hint: 'Summary report', Icon: FileText },
    ].map(({ value, label, hint, Icon }) => <button type="button" role="radio" aria-checked={format === value} tabIndex={format === value ? 0 : -1} key={value} className={format === value ? 'active' : ''} onClick={() => setFormat(value)} onKeyDown={event => {
      const options: ('csv' | 'json' | 'pdf')[] = ['csv', 'json', 'pdf'];
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (options.indexOf(format) + direction + 3) % 3;
        setFormat(options[index]); (event.currentTarget.parentElement?.children[index] as HTMLElement)?.focus();
      }
    }}><Icon size={23}/><b>{label}</b><small>{hint}</small>{format === value && <Check className="aw-export-check" size={13}/>}</button>)}</div>
    <div className="aw-export-note"><b>{rows.length} {rows.length === 1 ? 'domain' : 'domains'} ready to export</b><span>Unavailable renewal dates remain empty in JSON and are labeled “Not available” in CSV and PDF.</span></div>
    {error && <p className="aw-error" role="alert">{error}</p>}
    <footer><button className="aw-secondary" onClick={close}>Cancel</button><button className="aw-primary" disabled={busy || !rows.length} onClick={async () => {
      setBusy(true); setError('');
      try { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); downloadDomainReport(domainReportRows(rows, workspace), format); close(); }
      catch (error) { setError(error instanceof Error ? error.message : 'Could not export this report. Try again.'); }
      finally { setBusy(false); }
    }}><Download size={14}/>{busy ? 'Preparing report…' : `Export ${format.toUpperCase()}`}</button></footer>
  </div></Modal>;
}
