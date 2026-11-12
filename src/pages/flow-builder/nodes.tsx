import { translateText, uiDirection, useUILanguage } from '../../i18n/display';
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META } from './types'
import { outputs, type StartData, type StepData } from './graph'

export function StartNode({ data, selected }: NodeProps) {
  useUILanguage()
  const { triggers } = data as StartData
  return (
    <div className={`fb-node fb-start ${selected ? 'is-selected' : ''}`}>
      <div className="fb-node-head"><span className="fb-dot tone-orange" aria-hidden="true" />{translateText("When…")}</div>
      {triggers.length === 0 && <p className="fb-muted">{translateText("Add a keyword trigger")}</p>}
      {triggers.map((t, i) => (
        <div key={i} className="fb-chip-row">
          <span className="fb-chip-label" dir="auto">{translateText(t.match === 'any_message' ? 'Any message' : t.match === 'contains' ? 'Message contains' : 'Message equals')}</span>
          <span className="fb-chips">{t.keywords.map(k => <span key={k} className="fb-chip">{k}</span>)}</span>
        </div>
      ))}
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
        <span className={`fb-dot tone-${meta.tone}`} aria-hidden="true" />
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
    case 'ai_agent':
      return <p className="fb-text">{node.endpoint ? translateText("External agent") : <span className="fb-muted">{translateText("Placeholder agent (no endpoint yet)")}</span>}</p>
  }
}

export const nodeTypes = { start: StartNode, step: StepNode }
