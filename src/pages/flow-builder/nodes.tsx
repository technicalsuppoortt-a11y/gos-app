import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META } from './types'
import { outputs, type StartData, type StepData } from './graph'

export function StartNode({ data, selected }: NodeProps) {
  const { triggers } = data as StartData
  return (
    <div className={`fb-node fb-start ${selected ? 'is-selected' : ''}`}>
      <div className="fb-node-head"><span className="fb-dot tone-orange" aria-hidden="true" />When…</div>
      {triggers.length === 0 && <p className="fb-muted">Add a keyword trigger</p>}
      {triggers.map((t, i) => (
        <div key={i} className="fb-chip-row">
          <span className="fb-chip-label">{t.match === 'any_message' ? 'Any message' : `Message ${t.match}`}</span>
          <span className="fb-chips">{t.keywords.map(k => <span key={k} className="fb-chip">{k}</span>)}</span>
        </div>
      ))}
      <div className="fb-out"><span>Then</span><Handle type="source" id="next" position={Position.Right} /></div>
    </div>
  )
}

export function StepNode({ data, selected }: NodeProps) {
  const { node, stats } = data as StepData
  const meta = NODE_META[node.type]
  return (
    <div className={`fb-node ${node.type === 'comment' ? 'fb-comment' : ''} ${selected ? 'is-selected' : ''}`}>
      {node.type !== 'comment' && <Handle type="target" position={Position.Left} />}
      <div className="fb-node-head">
        <span className={`fb-dot tone-${meta.tone}`} aria-hidden="true" />
        {meta.label}
        {stats && <span className="fb-stat" title="Contacts that reached this step">{stats.sent}</span>}
      </div>
      <Summary data={data as StepData} />
      {outputs(node).map(o => (
        <div key={o.id} className="fb-out"><span>{o.label}</span><Handle type="source" id={o.id} position={Position.Right} /></div>
      ))}
    </div>
  )
}

function Summary({ data: { node } }: { data: StepData }) {
  switch (node.type) {
    case 'send_message':
    case 'question':
    case 'comment':
      return <p className="fb-text" dir="auto">{node.text || <span className="fb-muted">Empty</span>}</p>
    case 'actions':
      return <ul className="fb-list">{(node.items ?? []).map((a, i) => <li key={i}>{a.type.replace('_', ' ')} {a.tag ?? a.field ?? ''}</li>)}</ul>
    case 'condition':
      return <ul className="fb-list">{(node.rules ?? []).map((r, i) => <li key={i}>{r.key} {r.op.replace(/_/g, ' ')} {r.value ?? ''}</li>)}</ul>
    case 'smart_delay':
      return <p className="fb-text">Wait {node.value} {node.unit}</p>
    case 'ai_agent':
      return <p className="fb-text">{node.endpoint ? 'External agent' : <span className="fb-muted">Placeholder agent (no endpoint yet)</span>}</p>
  }
}

export const nodeTypes = { start: StartNode, step: StepNode }
