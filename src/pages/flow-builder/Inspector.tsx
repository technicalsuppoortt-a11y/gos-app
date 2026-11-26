import { MessageSquare, Tag } from 'lucide-react'
import { translateText } from '../../i18n/display';
import { useRef, useState } from 'react'
import type { ActionItem, FlowNode, Limits, Rule, Trigger } from './types'
import { formatSize, uploadToLibrary, useLibraryFiles } from './files'
import { NODE_META } from './types'
import { uid } from './graph'

type Props =
  | { kind: 'start'; triggers: Trigger[]; onTriggers: (t: Trigger[]) => void; limits: Limits | null; onLimits: (l: Limits | null) => void }
  | { kind: 'step'; id: string; node: FlowNode; onChange: (n: FlowNode) => void; onDelete: () => void }

export function Inspector(props: Props) {
  if (props.kind === 'start') return <TriggerEditor triggers={props.triggers} onChange={props.onTriggers} limits={props.limits} onLimits={props.onLimits} />
  const { node, onChange, onDelete, id } = props
  const set = (patch: Partial<FlowNode>) => onChange({ ...node, ...patch })

  return (
    <div className="fb-inspector-body">
      <p className="fb-eyebrow">{translateText(NODE_META[node.type].label)}</p>
      <p className="fb-muted">{translateText(NODE_META[node.type].hint)}</p>

      {(node.type === 'send_message' || node.type === 'question' || node.type === 'comment') && (
        <Field label={node.type === 'comment' ? translateText("Note") : translateText("Message")} id={`${id}-text`}>
          <textarea id={`${id}-text`} dir="auto" rows={4} value={node.text ?? ''} onChange={e => set({ text: e.target.value })} />
          {node.type !== 'comment' && <small className="fb-muted">{translateText("Use ")}{'{{first_name}}'}, {'{{fields.phone}}'}{translateText(" or a date field as time: ")}{'{{fields.booking_at|time}}'}</small>}
        </Field>
      )}

      {node.type === 'send_message' && (
        <fieldset className="fb-group">
          <legend>{translateText("Buttons (max 3)")}</legend>
          {(node.buttons ?? []).map((b, i) => (
            <div key={b.id} className="fb-row-card">
              <input aria-label={translateText("Button title")} value={b.title} dir="auto" onChange={e => set({ buttons: node.buttons!.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} />
              <select aria-label={translateText("Button type")} value={b.type} onChange={e => set({ buttons: node.buttons!.map((x, j) => j === i ? { ...x, type: e.target.value as 'node' | 'url' } : x) })}>
                <option value="node">{translateText("Go to step")}</option>
                <option value="url">{translateText("Open link")}</option>
              </select>
              {b.type === 'url' && <input aria-label={translateText("Button URL")} placeholder="https://" value={b.url ?? ''} onChange={e => set({ buttons: node.buttons!.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} />}
              <button type="button" className="fb-link-danger" onClick={() => set({ buttons: node.buttons!.filter((_, j) => j !== i) })}>{translateText("Remove")}</button>
            </div>
          ))}
          {(node.buttons?.length ?? 0) < 3 && (
            <button type="button" className="fb-btn fb-btn-soft" onClick={() => set({ buttons: [...(node.buttons ?? []), { id: uid('b'), title: 'Button', type: 'node' }] })}>{translateText("Add button")}</button>
          )}
        </fieldset>
      )}

      {node.type === 'question' && (
        <>
          <Field label={translateText("Answer type")} id={`${id}-rt`}>
            <select id={`${id}-rt`} value={node.replyType} onChange={e => set({ replyType: e.target.value as FlowNode['replyType'] })}>
              <option value="text">{translateText("Text")}</option><option value="phone">{translateText("Phone")}</option><option value="email">{translateText("Email")}</option><option value="number">{translateText("Number")}</option>
            </select>
          </Field>
          <Field label={translateText("Save answer to field")} id={`${id}-field`}>
            <input id={`${id}-field`} value={node.field ?? ''} onChange={e => set({ field: e.target.value })} />
          </Field>
          <Field label={translateText("Message on invalid answer")} id={`${id}-retry`}>
            <input id={`${id}-retry`} dir="auto" value={node.retryText ?? ''} onChange={e => set({ retryText: e.target.value })} />
          </Field>
        </>
      )}

      {node.type === 'actions' && (
        <fieldset className="fb-group">
          <legend>{translateText("Actions")}</legend>
          {(node.items ?? []).map((a, i) => <ActionRow key={i} item={a} onChange={v => set({ items: node.items!.map((x, j) => j === i ? v : x) })} onRemove={() => set({ items: node.items!.filter((_, j) => j !== i) })} />)}
          <button type="button" className="fb-btn fb-btn-soft" onClick={() => set({ items: [...(node.items ?? []), { type: 'add_tag', tag: '' }] })}>{translateText("Add action")}</button>
        </fieldset>
      )}

      {node.type === 'condition' && (
        <fieldset className="fb-group">
          <legend>{translateText("Rules")}</legend>
          <Field label={translateText("Match")} id={`${id}-match`}>
            <select id={`${id}-match`} value={node.match ?? 'all'} onChange={e => set({ match: e.target.value as 'all' | 'any' })}>
              <option value="all">{translateText("All rules")}</option><option value="any">{translateText("Any rule")}</option>
            </select>
          </Field>
          {(node.rules ?? []).map((r, i) => <RuleRow key={i} rule={r} onChange={v => set({ rules: node.rules!.map((x, j) => j === i ? v : x) })} onRemove={() => set({ rules: node.rules!.filter((_, j) => j !== i) })} />)}
          <button type="button" className="fb-btn fb-btn-soft" onClick={() => set({ rules: [...(node.rules ?? []), { op: 'is_set', key: '' }] })}>{translateText("Add rule")}</button>
        </fieldset>
      )}

      {node.type === 'smart_delay' && (
        <div className="fb-inline">
          <Field label={translateText("Wait")} id={`${id}-v`}><input id={`${id}-v`} type="number" min={1} value={node.value ?? 1} onChange={e => set({ value: Number(e.target.value) })} /></Field>
          <Field label={translateText("Unit")} id={`${id}-u`}>
            <select id={`${id}-u`} value={node.unit} onChange={e => set({ unit: e.target.value as FlowNode['unit'] })}>
              <option value="minutes">{translateText("Minutes")}</option><option value="hours">{translateText("Hours")}</option><option value="days">{translateText("Days")}</option>
            </select>
          </Field>
        </div>
      )}

      {node.type === 'wait_until' && (
        <>
          <Field label={translateText("Date field")} id={`${id}-wf`}>
            <input id={`${id}-wf`} placeholder="booking_at" value={node.field ?? ''} onChange={e => set({ field: e.target.value.trim() })} />
            <small className="fb-muted">{translateText("Any contact field that holds a date and time, e.g. 2026-11-25 20:30.")}</small>
          </Field>
          <div className="fb-inline">
            <Field label={translateText("Amount")} id={`${id}-wv`}><input id={`${id}-wv`} type="number" min={0} value={node.value ?? 0} onChange={e => set({ value: Math.max(0, Number(e.target.value)) })} /></Field>
            <Field label={translateText("Unit")} id={`${id}-wu`}>
              <select id={`${id}-wu`} value={node.unit} onChange={e => set({ unit: e.target.value as FlowNode['unit'] })}>
                <option value="minutes">{translateText("Minutes")}</option><option value="hours">{translateText("Hours")}</option><option value="days">{translateText("Days")}</option>
              </select>
            </Field>
            <Field label={translateText("When")} id={`${id}-wd`}>
              <select id={`${id}-wd`} value={node.direction} onChange={e => set({ direction: e.target.value as 'before' | 'after' })}>
                <option value="before">{translateText("Before the date")}</option><option value="after">{translateText("After the date")}</option>
              </select>
            </Field>
          </div>
          <Field label={translateText("If that time has already passed")} id={`${id}-wp`}>
            <select id={`${id}-wp`} value={node.ifPassed ?? 'skip'} onChange={e => set({ ifPassed: e.target.value as 'skip' | 'now' })}>
              <option value="skip">{translateText("Skip: go to “Time passed”")}</option><option value="now">{translateText("Continue now")}</option>
            </select>
          </Field>
          <p className="fb-muted">{translateText("If the date changes while waiting, the wait moves with it. An empty field goes to “Time passed”.")}</p>
        </>
      )}

      {node.type === 'send_file' && <FilePicker id={id} node={node} set={set} />}

      {node.type === 'ai_agent' && (
        <>
          <Field label={translateText("Agent endpoint (https)")} id={`${id}-ep`}>
            <input id={`${id}-ep`} placeholder={translateText("Leave empty to use the placeholder agent")} value={node.endpoint ?? ''} onChange={e => set({ endpoint: e.target.value })} />
          </Field>
          <Field label={translateText("Agent id")} id={`${id}-ag`}><input id={`${id}-ag`} value={node.agentId ?? ''} onChange={e => set({ agentId: e.target.value })} /></Field>
          <Field label={translateText("Instructions sent to the agent")} id={`${id}-ins`}>
            <textarea id={`${id}-ins`} dir="auto" rows={4} value={node.instructions ?? ''} onChange={e => set({ instructions: e.target.value })} />
          </Field>
          <Field label={translateText("Hand off after this many replies")} id={`${id}-mt`}>
            <input id={`${id}-mt`} type="number" min={1} max={50} value={node.maxTurns ?? 10} onChange={e => set({ maxTurns: Number(e.target.value) })} />
          </Field>
          <p className="fb-muted">{translateText("The agent answers ")}<code>{'{ reply, fields, exit }'}</code>. <code>exit</code>{translateText(" “done” or “handoff” moves the flow on.")}</p>
        </>
      )}

      <button type="button" className="fb-btn fb-btn-danger" onClick={onDelete}>{translateText("Delete step")}</button>
    </div>
  )
}

function TriggerEditor({ triggers, onChange, limits, onLimits }: { triggers: Trigger[]; onChange: (t: Trigger[]) => void; limits: Limits | null; onLimits: (l: Limits | null) => void }) {
  const replace = (i: number, t: Trigger) => onChange(triggers.map((x, j) => j === i ? t : x))
  const setLimit = (key: keyof Limits, raw: string) => {
    const next: Limits = { ...(limits ?? {}) }
    if (raw === '' || Number(raw) <= 0) delete next[key]; else next[key] = Math.floor(Number(raw))
    onLimits(Object.keys(next).length ? next : null)
  }
  return (
    <div className="fb-inspector-body">
      <p className="fb-eyebrow">{translateText("Trigger")}</p>
      <p className="fb-muted">{translateText("Start this flow when a message matches, or when a conversation’s labels or fields change.")}</p>
      {triggers.map((t, i) => (
        <div key={i} className="fb-row-card fb-trigger-card">
          <div className="fb-trigger-top"><strong>{translateText("Trigger")} {i + 1}</strong><button type="button" className="fb-link-danger" onClick={() => onChange(triggers.filter((_, j) => j !== i))}>{translateText("Remove")}</button></div>
          <div className="fb-choice" role="radiogroup" aria-label={translateText("Start when")}>
            <button type="button" role="radio" aria-checked={t.type === 'keyword'} className={t.type === 'keyword' ? 'on' : ''}
              onClick={() => t.type !== 'keyword' && replace(i, { type: 'keyword', match: 'contains', keywords: [], rules: t.rules, ruleMatch: t.ruleMatch })}>
              <MessageSquare size={18} /><span><b>{translateText("A message arrives")}</b><small>{translateText("Keyword or any message")}</small></span>
            </button>
            <button type="button" role="radio" aria-checked={t.type === 'contact_updated'} className={t.type === 'contact_updated' ? 'on' : ''}
              onClick={() => t.type !== 'contact_updated' && replace(i, { type: 'contact_updated', rules: t.rules?.length ? t.rules : [{ op: 'has_tag', key: '' }], ruleMatch: t.ruleMatch })}>
              <Tag size={18} /><span><b>{translateText("Conversation updated")}</b><small>{translateText("A label or field changes")}</small></span>
            </button>
          </div>
          {t.type === 'keyword' && (
            <div className="fb-seg" role="radiogroup" aria-label={translateText("Match")}>
              {([['contains', 'Contains'], ['equals', 'Is exactly'], ['any_message', 'Any message']] as const).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={t.match === v} className={t.match === v ? 'on' : ''} onClick={() => replace(i, { ...t, match: v })}>{translateText(l)}</button>
              ))}
            </div>
          )}
          {t.type === 'keyword' && t.match !== 'any_message' && (
            <div className="fb-field">{translateText("Keywords")}
              <div className="fb-chip-input">
                {t.keywords.map(k => <span key={k} className="fb-chip" dir="auto">{k}<button type="button" aria-label={translateText("Remove") + ' ' + k} onClick={() => replace(i, { ...t, keywords: t.keywords.filter(x => x !== k) })}>×</button></span>)}
                <input dir="auto" aria-label={translateText("Add keyword")} placeholder={translateText("Type a word and press Enter")}
                  onKeyDown={e => { const v = e.currentTarget.value.trim(); if ((e.key === 'Enter' || e.key === ',' || e.key === '،') && v) { e.preventDefault(); if (!t.keywords.includes(v)) replace(i, { ...t, keywords: [...t.keywords, v] }); e.currentTarget.value = '' } }}
                  onBlur={e => { const v = e.target.value.trim(); if (v && !t.keywords.includes(v)) replace(i, { ...t, keywords: [...t.keywords, v] }); e.target.value = '' }} />
              </div>
            </div>
          )}
          <fieldset className="fb-group">
            <legend>{translateText(t.type === 'contact_updated' ? "Start when these match" : "Only if (optional)")}</legend>
            {(t.rules ?? []).length > 1 && (
              <select aria-label={translateText("Match")} value={t.ruleMatch ?? 'all'} onChange={e => replace(i, { ...t, ruleMatch: e.target.value as 'all' | 'any' })}>
                <option value="all">{translateText("All rules")}</option><option value="any">{translateText("Any rule")}</option>
              </select>
            )}
            {(t.rules ?? []).map((r, k) => <RuleRow key={k} rule={r} onChange={v => replace(i, { ...t, rules: t.rules!.map((x, j) => j === k ? v : x) })} onRemove={() => replace(i, { ...t, rules: t.rules!.filter((_, j) => j !== k) })} />)}
            <button type="button" className="fb-btn fb-btn-soft" onClick={() => replace(i, { ...t, rules: [...(t.rules ?? []), { op: 'has_tag', key: '' }] })}>{translateText("Add rule")}</button>
          </fieldset>
        </div>
      ))}
      <button type="button" className="fb-btn fb-btn-soft" onClick={() => onChange([...triggers, { type: 'keyword', match: 'contains', keywords: [] }])}>+ {translateText(triggers.length ? "Add another trigger" : "Add trigger")}</button>

      <fieldset className="fb-group">
        <legend>{translateText("Repeat protection (per contact)")}</legend>
        <div className="fb-inline">
          <Field label={translateText("Max runs")} id="lim-max"><input id="lim-max" type="number" min={1} placeholder={translateText("No limit")} value={limits?.maxRuns ?? ''} onChange={e => setLimit('maxRuns', e.target.value)} /></Field>
          <Field label={translateText("Min hours between runs")} id="lim-int"><input id="lim-int" type="number" min={1} placeholder={translateText("None")} value={limits?.minIntervalHours ?? ''} onChange={e => setLimit('minIntervalHours', e.target.value)} /></Field>
        </div>
      </fieldset>
    </div>
  )
}

function FilePicker({ id, node, set }: { id: string; node: FlowNode; set: (patch: Partial<FlowNode>) => void }) {
  const { files, error } = useLibraryFiles()
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true); setUploadError(null)
    try { set({ fileId: (await uploadToLibrary(file)).id }) } catch (e) { setUploadError((e as Error).message) } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <>
      <Field label={translateText("File")} id={`${id}-file`}>
        <select id={`${id}-file`} value={node.fileId ?? ''} onChange={e => set({ fileId: e.target.value })}>
          <option value="">{files === null ? translateText("Loading…") : translateText("Choose a file")}</option>
          {files?.map(f => <option key={f.id} value={f.id}>{f.name} · {translateText(f.kind)} · {formatSize(f.size)}</option>)}
        </select>
      </Field>
      <div className="fb-inline">
        <button type="button" className="fb-btn fb-btn-soft" disabled={busy} onClick={() => input.current?.click()}>{busy ? translateText("Uploading…") : translateText("Upload new file")}</button>
        <input ref={input} type="file" hidden accept=".mp4,.3gp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.mp3,.m4a,.ogg,.aac,.amr" onChange={e => upload(e.target.files?.[0])} />
      </div>
      <small className="fb-muted">{translateText("WhatsApp limits: video and audio 16 MB, images 5 MB, documents 100 MB.")}</small>
      {(error || uploadError) && <p className="fb-error" role="alert">{uploadError ?? error}</p>}
      <Field label={translateText("Caption (optional)")} id={`${id}-cap`}>
        <input id={`${id}-cap`} dir="auto" value={node.caption ?? ''} onChange={e => set({ caption: e.target.value })} />
      </Field>
    </>
  )
}

function ActionRow({ item, onChange, onRemove }: { item: ActionItem; onChange: (a: ActionItem) => void; onRemove: () => void }) {
  return (
    <div className="fb-row-card">
      <select aria-label={translateText("Action type")} value={item.type} onChange={e => onChange({ type: e.target.value as ActionItem['type'] })}>
        <option value="add_tag">{translateText("Add tag")}</option><option value="remove_tag">{translateText("Remove tag")}</option><option value="set_field">{translateText("Set field")}</option>
        <option value="notify_admin">{translateText("Notify admin")}</option><option value="webhook">{translateText("Webhook")}</option>
      </select>
      {(item.type === 'add_tag' || item.type === 'remove_tag') && <input aria-label={translateText("Tag")} placeholder={translateText("tag")} value={item.tag ?? ''} onChange={e => onChange({ ...item, tag: e.target.value })} />}
      {item.type === 'set_field' && <>
        <input aria-label={translateText("Field")} placeholder={translateText("field")} value={item.field ?? ''} onChange={e => onChange({ ...item, field: e.target.value })} />
        <input aria-label={translateText("Value")} placeholder={translateText("value")} dir="auto" value={item.value ?? ''} onChange={e => onChange({ ...item, value: e.target.value })} />
      </>}
      {item.type === 'notify_admin' && <input aria-label={translateText("Notification text")} dir="auto" value={item.text ?? ''} onChange={e => onChange({ ...item, text: e.target.value })} />}
      {item.type === 'webhook' && <input aria-label={translateText("Webhook URL")} placeholder="https://" value={item.url ?? ''} onChange={e => onChange({ ...item, url: e.target.value })} />}
      <button type="button" className="fb-link-danger" onClick={onRemove}>{translateText("Remove")}</button>
    </div>
  )
}

function RuleRow({ rule, onChange, onRemove }: { rule: Rule; onChange: (r: Rule) => void; onRemove: () => void }) {
  const needsValue = ['equals', 'not_equals', 'contains'].includes(rule.op)
  return (
    <div className="fb-row-card">
      <select aria-label={translateText("Operator")} value={rule.op} onChange={e => onChange({ ...rule, op: e.target.value as Rule['op'] })}>
        <option value="has_tag">{translateText("Has label")}</option><option value="not_has_tag">{translateText("Has no label")}</option>
        <option value="is_set">{translateText("Field is set")}</option><option value="not_set">{translateText("Field is empty")}</option>
        <option value="equals">{translateText("Field equals")}</option><option value="not_equals">{translateText("Field is not")}</option><option value="contains">{translateText("Field contains")}</option>
      </select>
      <input aria-label={translateText("Tag or field")} dir="auto" placeholder={rule.op.includes('tag') ? translateText("tag") : translateText("field")} value={rule.key} onChange={e => onChange({ ...rule, key: e.target.value })} />
      {needsValue && <input aria-label={translateText("Value")} dir="auto" value={rule.value ?? ''} onChange={e => onChange({ ...rule, value: e.target.value })} />}
      <button type="button" className="fb-link-danger" onClick={onRemove}>{translateText("Remove")}</button>
    </div>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <label className="fb-field" htmlFor={id}>{label}{children}</label>
}
