import type { ActionItem, FlowNode, Rule, Trigger } from './types'
import { NODE_META } from './types'
import { uid } from './graph'

type Props =
  | { kind: 'start'; triggers: Trigger[]; onTriggers: (t: Trigger[]) => void }
  | { kind: 'step'; id: string; node: FlowNode; onChange: (n: FlowNode) => void; onDelete: () => void }

export function Inspector(props: Props) {
  if (props.kind === 'start') return <TriggerEditor triggers={props.triggers} onChange={props.onTriggers} />
  const { node, onChange, onDelete, id } = props
  const set = (patch: Partial<FlowNode>) => onChange({ ...node, ...patch })

  return (
    <div className="fb-inspector-body">
      <p className="fb-eyebrow">{NODE_META[node.type].label}</p>
      <p className="fb-muted">{NODE_META[node.type].hint}</p>

      {(node.type === 'send_message' || node.type === 'question' || node.type === 'comment') && (
        <Field label={node.type === 'comment' ? 'Note' : 'Message'} id={`${id}-text`}>
          <textarea id={`${id}-text`} dir="auto" rows={4} value={node.text ?? ''} onChange={e => set({ text: e.target.value })} />
          {node.type !== 'comment' && <small className="fb-muted">Use {'{{first_name}}'} or {'{{fields.phone}}'}</small>}
        </Field>
      )}

      {node.type === 'send_message' && (
        <fieldset className="fb-group">
          <legend>Buttons (max 3)</legend>
          {(node.buttons ?? []).map((b, i) => (
            <div key={b.id} className="fb-row-card">
              <input aria-label="Button title" value={b.title} dir="auto" onChange={e => set({ buttons: node.buttons!.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} />
              <select aria-label="Button type" value={b.type} onChange={e => set({ buttons: node.buttons!.map((x, j) => j === i ? { ...x, type: e.target.value as 'node' | 'url' } : x) })}>
                <option value="node">Go to step</option>
                <option value="url">Open link</option>
              </select>
              {b.type === 'url' && <input aria-label="Button URL" placeholder="https://" value={b.url ?? ''} onChange={e => set({ buttons: node.buttons!.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} />}
              <button type="button" className="fb-link-danger" onClick={() => set({ buttons: node.buttons!.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          ))}
          {(node.buttons?.length ?? 0) < 3 && (
            <button type="button" className="fb-btn fb-btn-soft" onClick={() => set({ buttons: [...(node.buttons ?? []), { id: uid('b'), title: 'Button', type: 'node' }] })}>Add button</button>
          )}
        </fieldset>
      )}

      {node.type === 'question' && (
        <>
          <Field label="Answer type" id={`${id}-rt`}>
            <select id={`${id}-rt`} value={node.replyType} onChange={e => set({ replyType: e.target.value as FlowNode['replyType'] })}>
              <option value="text">Text</option><option value="phone">Phone</option><option value="email">Email</option><option value="number">Number</option>
            </select>
          </Field>
          <Field label="Save answer to field" id={`${id}-field`}>
            <input id={`${id}-field`} value={node.field ?? ''} onChange={e => set({ field: e.target.value })} />
          </Field>
          <Field label="Message on invalid answer" id={`${id}-retry`}>
            <input id={`${id}-retry`} dir="auto" value={node.retryText ?? ''} onChange={e => set({ retryText: e.target.value })} />
          </Field>
        </>
      )}

      {node.type === 'actions' && (
        <fieldset className="fb-group">
          <legend>Actions</legend>
          {(node.items ?? []).map((a, i) => <ActionRow key={i} item={a} onChange={v => set({ items: node.items!.map((x, j) => j === i ? v : x) })} onRemove={() => set({ items: node.items!.filter((_, j) => j !== i) })} />)}
          <button type="button" className="fb-btn fb-btn-soft" onClick={() => set({ items: [...(node.items ?? []), { type: 'add_tag', tag: '' }] })}>Add action</button>
        </fieldset>
      )}

      {node.type === 'condition' && (
        <fieldset className="fb-group">
          <legend>Rules</legend>
          <Field label="Match" id={`${id}-match`}>
            <select id={`${id}-match`} value={node.match ?? 'all'} onChange={e => set({ match: e.target.value as 'all' | 'any' })}>
              <option value="all">All rules</option><option value="any">Any rule</option>
            </select>
          </Field>
          {(node.rules ?? []).map((r, i) => <RuleRow key={i} rule={r} onChange={v => set({ rules: node.rules!.map((x, j) => j === i ? v : x) })} onRemove={() => set({ rules: node.rules!.filter((_, j) => j !== i) })} />)}
          <button type="button" className="fb-btn fb-btn-soft" onClick={() => set({ rules: [...(node.rules ?? []), { op: 'is_set', key: '' }] })}>Add rule</button>
        </fieldset>
      )}

      {node.type === 'smart_delay' && (
        <div className="fb-inline">
          <Field label="Wait" id={`${id}-v`}><input id={`${id}-v`} type="number" min={1} value={node.value ?? 1} onChange={e => set({ value: Number(e.target.value) })} /></Field>
          <Field label="Unit" id={`${id}-u`}>
            <select id={`${id}-u`} value={node.unit} onChange={e => set({ unit: e.target.value as FlowNode['unit'] })}>
              <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option>
            </select>
          </Field>
        </div>
      )}

      {node.type === 'ai_agent' && (
        <>
          <Field label="Agent endpoint (https)" id={`${id}-ep`}>
            <input id={`${id}-ep`} placeholder="Leave empty to use the placeholder agent" value={node.endpoint ?? ''} onChange={e => set({ endpoint: e.target.value })} />
          </Field>
          <Field label="Agent id" id={`${id}-ag`}><input id={`${id}-ag`} value={node.agentId ?? ''} onChange={e => set({ agentId: e.target.value })} /></Field>
          <Field label="Instructions sent to the agent" id={`${id}-ins`}>
            <textarea id={`${id}-ins`} dir="auto" rows={4} value={node.instructions ?? ''} onChange={e => set({ instructions: e.target.value })} />
          </Field>
          <Field label="Hand off after this many replies" id={`${id}-mt`}>
            <input id={`${id}-mt`} type="number" min={1} max={50} value={node.maxTurns ?? 10} onChange={e => set({ maxTurns: Number(e.target.value) })} />
          </Field>
          <p className="fb-muted">The agent answers <code>{'{ reply, fields, exit }'}</code>. <code>exit</code> “done” or “handoff” moves the flow on.</p>
        </>
      )}

      <button type="button" className="fb-btn fb-btn-danger" onClick={onDelete}>Delete step</button>
    </div>
  )
}

function TriggerEditor({ triggers, onChange }: { triggers: Trigger[]; onChange: (t: Trigger[]) => void }) {
  const set = (i: number, patch: Partial<Trigger>) => onChange(triggers.map((t, j) => j === i ? { ...t, ...patch } : t))
  return (
    <div className="fb-inspector-body">
      <p className="fb-eyebrow">Trigger</p>
      <p className="fb-muted">Start this flow when a message matches.</p>
      {triggers.map((t, i) => (
        <div key={i} className="fb-row-card">
          <label className="fb-field" htmlFor={`tr-${i}-m`}>Rule
            <select id={`tr-${i}-m`} value={t.match} onChange={e => set(i, { match: e.target.value as Trigger['match'] })}>
              <option value="contains">Message contains</option><option value="equals">Message is exactly</option><option value="any_message">Any message</option>
            </select>
          </label>
          {t.match !== 'any_message' && (
            <label className="fb-field" htmlFor={`tr-${i}-k`}>Keywords, comma separated
              <input id={`tr-${i}-k`} dir="auto" defaultValue={t.keywords.join('، ')} onBlur={e => set(i, { keywords: e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean) })} />
            </label>
          )}
          <button type="button" className="fb-link-danger" onClick={() => onChange(triggers.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="fb-btn fb-btn-soft" onClick={() => onChange([...triggers, { type: 'keyword', match: 'contains', keywords: [] }])}>Add trigger</button>
    </div>
  )
}

function ActionRow({ item, onChange, onRemove }: { item: ActionItem; onChange: (a: ActionItem) => void; onRemove: () => void }) {
  return (
    <div className="fb-row-card">
      <select aria-label="Action type" value={item.type} onChange={e => onChange({ type: e.target.value as ActionItem['type'] })}>
        <option value="add_tag">Add tag</option><option value="remove_tag">Remove tag</option><option value="set_field">Set field</option>
        <option value="notify_admin">Notify admin</option><option value="webhook">Webhook</option>
      </select>
      {(item.type === 'add_tag' || item.type === 'remove_tag') && <input aria-label="Tag" placeholder="tag" value={item.tag ?? ''} onChange={e => onChange({ ...item, tag: e.target.value })} />}
      {item.type === 'set_field' && <>
        <input aria-label="Field" placeholder="field" value={item.field ?? ''} onChange={e => onChange({ ...item, field: e.target.value })} />
        <input aria-label="Value" placeholder="value" dir="auto" value={item.value ?? ''} onChange={e => onChange({ ...item, value: e.target.value })} />
      </>}
      {item.type === 'notify_admin' && <input aria-label="Notification text" dir="auto" value={item.text ?? ''} onChange={e => onChange({ ...item, text: e.target.value })} />}
      {item.type === 'webhook' && <input aria-label="Webhook URL" placeholder="https://" value={item.url ?? ''} onChange={e => onChange({ ...item, url: e.target.value })} />}
      <button type="button" className="fb-link-danger" onClick={onRemove}>Remove</button>
    </div>
  )
}

function RuleRow({ rule, onChange, onRemove }: { rule: Rule; onChange: (r: Rule) => void; onRemove: () => void }) {
  const needsValue = ['equals', 'not_equals', 'contains'].includes(rule.op)
  return (
    <div className="fb-row-card">
      <select aria-label="Operator" value={rule.op} onChange={e => onChange({ ...rule, op: e.target.value as Rule['op'] })}>
        <option value="has_tag">Has tag</option><option value="not_has_tag">Does not have tag</option>
        <option value="is_set">Field is set</option><option value="not_set">Field is empty</option>
        <option value="equals">Field equals</option><option value="not_equals">Field is not</option><option value="contains">Field contains</option>
      </select>
      <input aria-label="Tag or field" placeholder={rule.op.includes('tag') ? 'tag' : 'field'} value={rule.key} onChange={e => onChange({ ...rule, key: e.target.value })} />
      {needsValue && <input aria-label="Value" dir="auto" value={rule.value ?? ''} onChange={e => onChange({ ...rule, value: e.target.value })} />}
      <button type="button" className="fb-link-danger" onClick={onRemove}>Remove</button>
    </div>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <label className="fb-field" htmlFor={id}>{label}{children}</label>
}
