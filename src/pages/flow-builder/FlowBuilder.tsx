import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, addEdge, useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api, ApiError } from './api'
import { nodeTypes } from './nodes'
import { Inspector } from './Inspector'
import { Simulator } from './Simulator'
import { Channels } from './Channels'
import { START, newNode, toCanvas, toGraph, uid, type StartData, type StepData } from './graph'
import { NODE_META, type Flow, type FlowNode, type NodeType } from './types'

import './flowBuilder.css'

type View = 'automation' | 'channels'
const Nav = createContext<{ view: View; go: (view: View) => void }>({ view: 'automation', go: () => {} })

/** The Flow Builder tab of AI Follow-Up. State lives in the URL: ?tab=flows[&flow=id] or ?tab=channels. */
export function FlowBuilderTab() {
  const params = new URLSearchParams(location.search)
  const [view, setView] = useState<View>(params.get('tab') === 'channels' ? 'channels' : 'automation')
  const [openId, setOpenId] = useState<string | null>(params.get('flow'))
  const setUrl = (query: string) => history.replaceState(history.state, '', `${location.pathname}?${query}`)
  const open = (id: string | null) => {
    setUrl(id ? `tab=flows&flow=${encodeURIComponent(id)}` : 'tab=flows')
    setOpenId(id)
  }
  const go = (next: View) => {
    setUrl(next === 'channels' ? 'tab=channels' : 'tab=flows')
    setOpenId(null)
    setView(next)
  }
  return (
    <div className={`fb-root${view === 'automation' && openId ? ' fb-root-builder' : ''}`}>
      <Nav.Provider value={{ view, go }}>
        {view === 'channels'
          ? <div className="fb-shell"><Sidebar /><Channels /></div>
          : openId
            ? <ReactFlowProvider><Builder flowId={openId} onBack={() => open(null)} /></ReactFlowProvider>
            : <FlowList onOpen={open} />}
      </Nav.Provider>
    </div>
  )
}

function FlowList({ onOpen }: { onOpen: (id: string) => void }) {
  const [flows, setFlows] = useState<Awaited<ReturnType<typeof api.list>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  useEffect(() => { api.list().then(setFlows).catch(e => setError(e.message)) }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const flow = await api.create(name.trim())
    onOpen(flow.id)
  }

  return (
    <div className="fb-shell">
      <Sidebar />
      <main className="fb-list-page">
        <h1>Automations</h1>
        <form className="fb-create" onSubmit={create}>
          <label htmlFor="new-name" className="sr-only">Automation name</label>
          <input id="new-name" dir="auto" placeholder="New automation name" value={name} onChange={e => setName(e.target.value)} />
          <button type="submit" className="fb-btn fb-btn-primary">Create</button>
        </form>
        {error && <p className="fb-error" role="alert">Could not load automations: {error}</p>}
        {flows?.length === 0 && <p className="fb-muted">No automations yet. Create the first one above.</p>}
        <ul className="fb-flow-list">
          {flows?.map(f => (
            <li key={f.id}>
              <button type="button" className="fb-flow-row" onClick={() => onOpen(f.id)}>
                <span dir="auto">{f.name}</span>
                <span className={`fb-badge badge-${f.status}`}>{f.status.toUpperCase()}</span>
                {f.has_unpublished_changes && <span className="fb-muted">Unpublished changes</span>}
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

function Builder({ flowId, onBack }: { flowId: string; onBack: () => void }) {
  const [flow, setFlow] = useState<Flow | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const { screenToFlowPosition } = useReactFlow()

  useEffect(() => {
    Promise.all([api.get(flowId), api.stats(flowId).catch(() => ({}))]).then(([f, stats]) => {
      setFlow(f)
      const c = toCanvas(f.draft)
      setNodes(c.nodes.map(n => n.type === 'step' ? { ...n, data: { ...n.data, stats: (stats as Record<string, { sent: number; clicked: number }>)[n.id] } } : n))
      setEdges(c.edges)
    }).catch(e => setNotice({ tone: 'error', text: e.message }))
  }, [flowId, setNodes, setEdges])

  const touch = () => setDirty(true)

  const onConnect = useCallback((c: Connection) => {
    // One link per output handle.
    setEdges(eds => addEdge({ ...c, id: `${c.source}:${c.sourceHandle}` }, eds.filter(e => !(e.source === c.source && e.sourceHandle === c.sourceHandle))))
    touch()
  }, [setEdges])

  const addStep = (type: NodeType) => {
    const id = uid()
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setNodes(ns => [...ns, { id, type: 'step', position: center, data: { node: newNode(type) } satisfies StepData }])
    setSelected(id)
    touch()
  }

  const updateNode = (id: string, node: FlowNode) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, node } } : n))
    // Drop links from buttons that no longer exist.
    const handles = new Set(['next', 'true', 'false', 'done', 'handoff', ...(node.buttons ?? []).filter(b => b.type === 'node').map(b => `btn:${b.id}`)])
    setEdges(es => es.filter(e => e.source !== id || handles.has(e.sourceHandle ?? 'next')))
    touch()
  }

  const save = async (): Promise<boolean> => {
    setBusy('save')
    try {
      const f = await api.saveDraft(flowId, toGraph(nodes, edges), flow?.name)
      setFlow(f)
      setDirty(false)
      setNotice({ tone: 'ok', text: 'Saved' })
      return true
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof ApiError ? [e.message, ...e.errors].join(' · ') : 'Save failed' })
      return false
    } finally {
      setBusy(null)
    }
  }

  const publish = async () => {
    if (dirty && !(await save())) return
    setBusy('publish')
    try {
      setFlow(await api.publish(flowId))
      setNotice({ tone: 'ok', text: 'The automation is live' })
    } catch (e) {
      setNotice({ tone: 'error', text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const sel = useMemo(() => nodes.find(n => n.id === selected) ?? null, [nodes, selected])

  if (!flow) return <div className="fb-shell"><main className="fb-list-page">{notice ? <p className="fb-error">{notice.text}</p> : <p className="fb-muted">Loading…</p>}</main></div>

  return (
    <div className="fb-shell">
      <div className="fb-main">
        <header className="fb-topbar">
          <button type="button" className="fb-btn fb-btn-ghost" onClick={onBack}>Automations</button>
          <span aria-hidden="true" className="fb-muted">/</span>
          <label htmlFor="flow-name" className="sr-only">Automation name</label>
          <input id="flow-name" className="fb-title-input" dir="auto" value={flow.name} onChange={e => { setFlow({ ...flow, name: e.target.value }); touch() }} />
          <span className={`fb-badge badge-${flow.status}`}>{flow.status.toUpperCase()}</span>
          <span className="fb-spacer" />
          {notice && <span className={`fb-notice tone-${notice.tone}`} role="status">{notice.text}</span>}
          {dirty && <span className="fb-muted">Unsaved</span>}
          <button type="button" className="fb-btn fb-btn-secondary" onClick={save} disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button>
          <button type="button" className="fb-btn fb-btn-secondary" onClick={async () => { if (!dirty || await save()) setTesting(true) }}>Test</button>
          {flow.status === 'live'
            ? <button type="button" className="fb-btn fb-btn-secondary" onClick={async () => setFlow(await api.stop(flowId))}>Stop</button>
            : null}
          <button type="button" className="fb-btn fb-btn-primary" onClick={publish} disabled={busy !== null}>
            {flow.status === 'live' && !flow.has_unpublished_changes && !dirty ? 'Live' : busy === 'publish' ? 'Publishing…' : 'Set live'}
          </button>
        </header>

        <div className="fb-work">
          <nav className="fb-palette" aria-label="Add a step">
            <p className="fb-eyebrow">Add step</p>
            {(Object.keys(NODE_META) as NodeType[]).map(t => (
              <button key={t} type="button" className="fb-palette-item" onClick={() => addStep(t)}>
                <span className={`fb-dot tone-${NODE_META[t].tone}`} aria-hidden="true" />
                <span><strong>{NODE_META[t].label}</strong><small>{NODE_META[t].hint}</small></span>
              </button>
            ))}
          </nav>

          <div className="fb-canvas">
            <ReactFlow
              nodes={nodes} edges={edges} nodeTypes={nodeTypes}
              onNodesChange={ch => { onNodesChange(ch); if (ch.some(c => c.type !== 'select' && c.type !== 'dimensions')) touch() }}
              onEdgesChange={ch => { onEdgesChange(ch); if (ch.some(c => c.type === 'remove')) touch() }}
              onConnect={onConnect}
              onSelectionChange={({ nodes }) => setSelected(nodes[0]?.id ?? null)}
              deleteKeyCode={['Delete']}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={22} size={1.2} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          {testing
            ? <Simulator flowId={flowId} onClose={() => setTesting(false)} />
            : (
              <aside className="fb-inspector" aria-label="Step settings">
                {!sel && <p className="fb-muted">Select a step to edit it, or drag from a step’s right dot to link it to the next one.</p>}
                {sel?.id === START && (
                  <Inspector kind="start" triggers={(sel.data as StartData).triggers}
                    onTriggers={t => { setNodes(ns => ns.map(n => n.id === START ? { ...n, data: { triggers: t } } : n)); touch() }} />
                )}
                {sel && sel.id !== START && (
                  <Inspector key={sel.id} kind="step" id={sel.id} node={(sel.data as StepData).node}
                    onChange={n => updateNode(sel.id, n)}
                    onDelete={() => { setNodes(ns => ns.filter(n => n.id !== sel.id)); setEdges(es => es.filter(e => e.source !== sel.id && e.target !== sel.id)); setSelected(null); touch() }} />
                )}
              </aside>
            )}
        </div>
      </div>
    </div>
  )
}

function Sidebar() {
  const { view, go } = useContext(Nav)
  return (
    <nav className="fb-sidebar" aria-label="Flow Builder">
      <button type="button" aria-current={view === 'automation' ? 'page' : undefined} onClick={() => go('automation')}>Automations</button>
      <button type="button" aria-current={view === 'channels' ? 'page' : undefined} onClick={() => go('channels')}>Channels</button>
    </nav>
  )
}
