import type { Edge, Node } from '@xyflow/react'
import type { FlowNode, Graph, Trigger } from './types'

export const START = '__start'

export type StepData = { node: FlowNode; stats?: { sent: number; clicked: number } }
export type StartData = { triggers: Trigger[] }

/** Handles each step exposes; the edge's sourceHandle says which link it is. */
export function outputs(n: FlowNode): { id: string; label: string }[] {
  switch (n.type) {
    case 'send_message': {
      const btns = (n.buttons ?? []).filter(b => b.type === 'node').map(b => ({ id: `btn:${b.id}`, label: b.title || 'Button' }))
      return [...btns, { id: 'next', label: 'Next step' }]
    }
    case 'condition': return [{ id: 'true', label: 'Matches' }, { id: 'false', label: 'Otherwise' }]
    case 'ai_agent': return [{ id: 'done', label: 'Done' }, { id: 'handoff', label: 'Handoff' }]
    case 'comment': return []
    default: return [{ id: 'next', label: 'Next step' }]
  }
}

export function toCanvas(graph: Graph): { nodes: Node[]; edges: Edge[] } {
  const pos = (id: string, i: number) => graph.coordinates?.[id] ?? { x: 320 + i * 300, y: 80 }
  const nodes: Node[] = [
    { id: START, type: 'start', position: graph.coordinates?.[START] ?? { x: 0, y: 80 }, data: { triggers: graph.triggers ?? [] } satisfies StartData, deletable: false },
    ...Object.entries(graph.nodes ?? {}).map(([id, node], i) => ({ id, type: 'step', position: pos(id, i), data: { node } satisfies StepData })),
  ]

  const edges: Edge[] = []
  const link = (source: string, handle: string, target?: string | null) => {
    if (target) edges.push({ id: `${source}:${handle}`, source, sourceHandle: handle, target })
  }
  link(START, 'next', graph.rootId)
  for (const [id, n] of Object.entries(graph.nodes ?? {})) {
    link(id, 'next', n.targetId)
    n.buttons?.forEach(b => b.type === 'node' && link(id, `btn:${b.id}`, b.targetId))
    link(id, 'true', n.trueId)
    link(id, 'false', n.falseId)
    link(id, 'done', n.exits?.done)
    link(id, 'handoff', n.exits?.handoff)
  }
  return { nodes, edges }
}

export function toGraph(nodes: Node[], edges: Edge[]): Graph {
  const start = nodes.find(n => n.id === START)
  const graph: Graph = {
    triggers: (start?.data as StartData | undefined)?.triggers ?? [],
    rootId: null,
    nodes: {},
    coordinates: {},
  }
  for (const n of nodes) {
    graph.coordinates[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
    if (n.id === START) continue
    const node: FlowNode = structuredClone((n.data as StepData).node)
    delete node.targetId; delete node.trueId; delete node.falseId
    if (node.exits) node.exits = {}
    node.buttons = node.buttons?.map(b => ({ ...b, targetId: null }))
    if (node.buttons?.length === 0) delete node.buttons
    graph.nodes[n.id] = node
  }
  for (const e of edges) {
    const target = e.target
    if (e.source === START) { graph.rootId = target; continue }
    const node = graph.nodes[e.source]
    if (!node || !graph.nodes[target]) continue
    const h = e.sourceHandle ?? 'next'
    if (h === 'next') node.targetId = target
    else if (h === 'true') node.trueId = target
    else if (h === 'false') node.falseId = target
    else if (h === 'done' || h === 'handoff') node.exits = { ...node.exits, [h]: target }
    else if (h.startsWith('btn:')) {
      const b = node.buttons?.find(b => `btn:${b.id}` === h)
      if (b) b.targetId = target
    }
  }
  return graph
}

export function newNode(type: FlowNode['type']): FlowNode {
  switch (type) {
    case 'send_message': return { type, text: 'Hi {{first_name}}!', buttons: [] }
    case 'question': return { type, text: 'What is your phone number?', replyType: 'phone', field: 'phone', retryText: 'Please send a valid answer.' }
    case 'actions': return { type, items: [{ type: 'add_tag', tag: 'lead' }] }
    case 'condition': return { type, match: 'all', rules: [{ op: 'has_tag', key: 'lead' }] }
    case 'smart_delay': return { type, value: 1, unit: 'hours' }
    case 'ai_agent': return { type, endpoint: '', instructions: '', maxTurns: 10, exits: {} }
    case 'comment': return { type, text: 'Note' }
  }
}

export const uid = (p = 'n') => `${p}_${Math.random().toString(36).slice(2, 10)}`
