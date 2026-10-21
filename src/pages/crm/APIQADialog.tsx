import { qaAssertions } from './qaAssertions';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { gosRequest } from '../../backend/gosApi';
import { GosApiError } from '../../backend/gosTransport';
import { apiRequests } from './apiRequests';
import { Dialog } from './CRMDialogs';
import { CustomSelect } from './CRMPrimitives';
import { CRMActionBoundary } from './CRMActions';
import { useCRMActions } from './useCRMActions';

export function APIQADialog({ pipelineId, leadId, close }: { pipelineId: string; leadId?: string; close: () => void }) {
  const actions = useCRMActions();
  const [index, setIndex] = useState(0);
  const request = apiRequests[index];
  const [body, setBody] = useState<string>(request.body);
  const [variables, setVariables] = useState<Record<string, string>>({ pipelineId, leadId: leadId ?? '', sourceId: '', conversationId: '', playgroundTestId: '', externalMessageId: 'qa-' + crypto.randomUUID() });
  const [file, setFile] = useState<File>();
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<Record<number, string>>({});
  const login = request.url.startsWith('https://identitytoolkit');
  const mutates = request.method !== 'GET';
  function substitute(text: string) {
    return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
      if (key === '$timestamp') return String(Date.now());
      if (!variables[key]) throw new Error('Enter ' + key + ' before running this request.');
      return variables[key];
    });
  }
  function record(status: string, value: unknown) {
    setResult(JSON.stringify(value, null, 2));
    setHistory(previous => ({ ...previous, [index]: status }));
  }
  async function run() {
    await actions.run(async () => {
      const path = substitute(request.url.replace('{{baseUrl}}/api/v1', ''));
      if (!/^\/(health|auth|firestore|crm|ai|inbox)(\/|\?|$)/.test(path)) throw new Error('Unsupported QA request path.');
      let payload: unknown = body ? JSON.parse(substitute(body)) : undefined;
      if (request.multipart) {
        if (!file) throw new Error('Choose a knowledge file first.');
        const form = new FormData(); form.set('name', file.name); form.set('type', 'file'); form.set('file', file); payload = form;
      }
      try {
        let responseStatus = 0;
        const data = await gosRequest<Record<string, any> | string>(path, { method: request.method, body: payload, public: path === '/health', csv: path.startsWith('/crm/leads/export'), onResponse: status => { responseStatus = status; } });
        if (request.expected.some(code => code >= 400)) {
          record('FAIL: expected rejection', { error: 'The API accepted a request that the collection expects to reject.', data });
          return;
        }
        const failures = qaAssertions(request.name, data);
        if (request.expected.length && !request.expected.some(code => code === responseStatus)) failures.unshift('Unexpected HTTP status ' + responseStatus + '.');
        record(failures.length ? 'FAIL: assertions' : 'PASS', { httpStatus: responseStatus, checks: failures.length ? failures : ['Passed'], data });
        if (typeof data === 'object' && data) setVariables(previous => ({ ...previous,
          ...(data.lead?.id ? { leadId: String(data.lead.id) } : {}),
          ...(data.pipeline?.id ? { pipelineId: String(data.pipeline.id) } : {}),
          ...(data.source?.id ? { sourceId: String(data.source.id) } : {}),
          ...(data.test?.id ? { playgroundTestId: String(data.test.id) } : {}),
          ...(data.conversation?.id ? { conversationId: String(data.conversation.id) } : {}),
        }));
      } catch (error) {
        const status = error instanceof GosApiError ? error.status : undefined;
        const expected = status !== undefined && request.expected.some(code => code === status);
        record(expected ? 'PASS: expected rejection' : 'FAIL', { status, message: (error as Error).message });
      }
    });
  }
  return <CRMActionBoundary busy={actions.busy}><Dialog title="GOS API QA — 42 collection requests" close={() => { if (!actions.busy) close(); }}>
    <div className="crm-dialog-content">
      <p className="crm-muted">Requests run individually against your signed-in workspace. Examples are editable. Changes affect real records. IDs from successful responses fill the next request’s variables.</p>
      <label className="crm-field">Collection request<CustomSelect aria-label="Collection request" value={String(index)} onChange={value => { const next = Number(value); setIndex(next); setBody(apiRequests[next].body); setResult(''); setFile(undefined); setConfirmed(false); }} options={apiRequests.map((item, i) => ({ value: String(i), label: `${i + 1}. ${item.name}${history[i] ? ' · ' + history[i] : ''}` }))}/></label>
      <p><code>{request.method} {request.url}</code></p>
      {login ? <p>Firebase password sign-in is available on the <Link to="/login">login screen</Link>. This QA dialog uses your existing Firebase session and never collects passwords.</p> : <>
        <div className="crm-form-grid">{Object.entries(variables).map(([key, value]) => <label key={key}>{key}<input aria-label={key} value={value} onChange={event => setVariables({ ...variables, [key]: event.target.value })}/></label>)}</div>
        {request.multipart ? <label className="crm-field">Knowledge file<input type="file" accept=".txt,.md,.csv,.pdf" onChange={event => setFile(event.target.files?.[0])}/></label> : request.body && <label className="crm-field">JSON body<textarea className="crm-note-input" aria-label="QA JSON body" rows={8} value={body} onChange={event => setBody(event.target.value)}/></label>}
        {mutates && <label className="crm-qa-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/><span>I confirm this request may change or delete workspace data.</span></label>}
      </>}
      {result && <pre className="crm-note" role="status" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 260, overflow: 'auto' }}>{result}</pre>}
      <p className="crm-muted">{Object.keys(history).length} / 41 API examples attempted here; password sign-in is verified on the login screen. PASS checks expected HTTP status and key collection scenarios. Inspect returned fields before continuing.</p>
    </div><div className="crm-dialog-footer"><button className="crm2-btn-secondary" onClick={close}>Close</button><button className="crm2-btn-primary" disabled={login || actions.busy || (mutates && !confirmed)} onClick={run}>Run request</button></div>
  </Dialog></CRMActionBoundary>;
}
