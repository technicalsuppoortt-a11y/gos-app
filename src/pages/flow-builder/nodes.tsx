import { translateText, uiDirection, useUILanguage } from '../../i18n/display';
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META } from './types'
import { NodeIcon } from './nodeIcon'
import { outputs, type StartData, type StepData } from './graph'
import { useLibraryFiles } from './files'

export function StartNode({ data, selected }: NodeProps) {
  useUILanguage()
  const { triggers, limits } = data as StartData
  return (
    <div className={`fb-node fb-start ${selected ? 'is-selected' : ''}`}>
      <div className="fb-node-head"><NodeIcon type="start" /><span className="fb-head-text"><span>{translateText("When…")}</span><small>{translateText("Starts this automation")}</small></span>{triggers.length > 0 && <span className="fb-stat">{triggers.length}</span>}</div>
      {triggers.length === 0 && (
        <div className="fb-trigger-empty">
          <strong>{translateText("Add a trigger")}</strong>
          <span>{translateText("A keyword in a message, or a conversation update (label, field). Click to set it up.")}</span>
        </div>
      )}
      {triggers.map((t, i) => (
        <div key={i} className="fb-chip-row">
          <span className="fb-chip-label" dir="auto">{translateText(t.type === 'contact_updated' ? 'Conversation updated' : t.match === 'any_message' ? 'Any message' : t.match === 'contains' ? 'Message contains' : 'Message equals')}</span>
          {t.type === 'keyword' && <span className="fb-chips">{t.keywords.map(k => <span key={k} className="fb-chip">{k}</span>)}</span>}
          {(t.rules ?? []).length > 0 && <ul className="fb-list">{t.rules!.map((r, k) => <li key={k}>{r.op === 'has_tag' || r.op === 'not_has_tag' ? <>{translateText(r.op === 'has_tag' ? 'Has label' : 'Has no label')} <bdi className="fb-chip">{r.key || '…'}</bdi></> : <><bdi>{r.key}</bdi> {translateText(r.op.replaceAll('_', ' '))} <bdi>{r.value ?? ''}</bdi></>}</li>)}</ul>}
        </div>
      ))}
      {limits && (limits.maxRuns || limits.minIntervalHours) ? (
        <p className="fb-muted">{limits.maxRuns ? `${translateText("Max runs")}: ${limits.maxRuns}` : ''}{limits.maxRuns && limits.minIntervalHours ? ' · ' : ''}{limits.minIntervalHours ? `${translateText("Every")} ${limits.minIntervalHours}h` : ''}</p>
      ) : null}
      <div className="fb-out"><span>{translateText("Then")}</span><Handle type="source" id="next" position={Position.Right} /></div>
    </div>
  )
}

export function StepNode({ data, selected }: NodeProps) {
  useUILanguage()
  const { node, stats } = data as StepData
  const meta = NODE_META[node.type]
  return (
    <div className={`fb-node ${node.type === 'comment' ? 'fb-comment' : ''} ${selected ? 'is-selected' : ''}`}>
      {node.type !== 'comment' && <Handle type="target" position={Position.Left} />}
      <div className="fb-node-head">
        <NodeIcon type={node.type} />
        <span dir="auto">{translateText(meta.label)}</span>
        {stats && <span className="fb-stat" title={translateText("Contacts that reached this step")}>{stats.sent}</span>}
      </div>
      <Summary data={data as StepData} />
      {outputs(node).map(o => (
        <div key={o.id} className="fb-out"><span dir="auto">{o.authored ? o.label : translateText(o.label)}</span><Handle type="source" id={o.id} position={Position.Right} /></div>
      ))}
    </div>
  )
}

function Summary({ data: { node } }: { data: StepData }) {
  switch (node.type) {
    case 'send_message':
    case 'question':
    case 'comment':
      return <p className="fb-text" dir="auto">{node.text || <span className="fb-muted">{translateText("Empty")}</span>}</p>
    case 'actions':
      return <ul className="fb-list" dir={uiDirection()}>{(node.items ?? []).map((a, i) => <li key={i}>{translateText(a.type.replaceAll('_', ' '))} <bdi>{a.tag ?? a.field ?? ''}</bdi></li>)}</ul>
    case 'condition':
      return <ul className="fb-list" dir={uiDirection()}>{(node.rules ?? []).map((r, i) => <li key={i}><bdi>{r.key}</bdi> {translateText(r.op.replaceAll('_', ' '))} <bdi>{r.value ?? ''}</bdi></li>)}</ul>
    case 'smart_delay':
      return <p className="fb-text" dir={uiDirection()}>{translateText("Wait ")}{translateText(`${node.value} ${node.unit}`)}</p>
    case 'wait_until':
      return <p className="fb-text" dir={uiDirection()}>{node.field
        ? <>{translateText(`${node.value} ${node.unit}`)} {translateText(node.direction === 'after' ? 'after' : 'before')} <bdi>{node.field}</bdi></>
        : <span className="fb-muted">{translateText("Choose a date field")}</span>}</p>
    case 'send_file':
      return <FileSummary fileId={node.fileId} caption={node.caption} />
    case 'ai_agent':
      return <p className="fb-text">{node.endpoint ? translateText("External agent") : <span className="fb-muted">{translateText("Placeholder agent (no endpoint yet)")}</span>}</p>
  }
}

function FileSummary({ fileId, caption }: { fileId?: string; caption?: string }) {
  const { files } = useLibraryFiles()
  const file = files?.find(f => f.id === fileId)
  if (!fileId) return <p className="fb-text"><span className="fb-muted">{translateText("Choose a file")}</span></p>
  return <p className="fb-text" dir="auto">{file ? `${translateText(file.kind)}: ${file.name}` : files ? translateText("File missing from the library") : '…'}{caption ? ` — ${caption}` : ''}</p>
}

export const nodeTypes = { start: StartNode, step: StepNode }
