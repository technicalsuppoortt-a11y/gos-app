export type NodeType = 'send_message' | 'question' | 'actions' | 'condition' | 'smart_delay' | 'wait_until' | 'send_file' | 'ai_agent' | 'comment'

export type Button = { id: string; title: string; type: 'node' | 'url'; url?: string; targetId?: string | null }
export type ActionItem = { type: 'add_tag' | 'remove_tag' | 'set_field' | 'notify_admin' | 'webhook'; tag?: string; field?: string; value?: string; text?: string; url?: string }
export type Rule = { op: 'has_tag' | 'not_has_tag' | 'equals' | 'not_equals' | 'contains' | 'is_set' | 'not_set'; key: string; value?: string }

export type FlowNode = {
  type: NodeType
  text?: string
  buttons?: Button[]
  replyType?: 'text' | 'phone' | 'email' | 'number'
  field?: string
  retryText?: string
  items?: ActionItem[]
  match?: 'all' | 'any'
  rules?: Rule[]
  value?: number
  unit?: 'minutes' | 'hours' | 'days'
  /** wait_until: before/after the date in `field`; ifPassed when that time is already gone (or the field is empty). */
  direction?: 'before' | 'after'
  ifPassed?: 'skip' | 'now'
  pastId?: string | null
  /** send_file: a file from the library. */
  fileId?: string
  caption?: string
  endpoint?: string
  agentId?: string
  instructions?: string
  maxTurns?: number
  targetId?: string | null
  trueId?: string | null
  falseId?: string | null
  exits?: { done?: string | null; handoff?: string | null }
}

/** Rules on a trigger are checked before the flow starts (labels, fields). */
export type Trigger =
  | { type: 'keyword'; match: 'equals' | 'contains' | 'any_message'; keywords: string[]; rules?: Rule[]; ruleMatch?: 'all' | 'any' }
  | { type: 'contact_updated'; rules?: Rule[]; ruleMatch?: 'all' | 'any' }

/** Per contact: at most maxRuns runs, and at least minIntervalHours between two runs. */
export type Limits = { maxRuns?: number; minIntervalHours?: number }

export type LibraryFile = { id: string; name: string; kind: 'video' | 'document' | 'image' | 'audio'; size: number }

export type Graph = {
  triggers: Trigger[]
  rootId: string | null
  nodes: Record<string, FlowNode>
  coordinates: Record<string, { x: number; y: number }>
  limits?: Limits | null
}

export type Flow = {
  id: string
  name: string
  status: 'draft' | 'live' | 'stopped'
  draft: Graph
  live: Graph | null
  has_unpublished_changes: boolean
  updated_at: string
}

export const NODE_META: Record<NodeType, { label: string; hint: string; tone: string }> = {
  send_message: { label: 'Send message', hint: 'Text and up to 3 buttons', tone: 'blue' },
  question: { label: 'Question', hint: 'Ask and save the answer', tone: 'teal' },
  actions: { label: 'Actions', hint: 'Tags, fields, notify, webhook', tone: 'amber' },
  condition: { label: 'Condition', hint: 'Split by tag or field', tone: 'orange' },
  smart_delay: { label: 'Smart delay', hint: 'Wait before the next step', tone: 'slate' },
  wait_until: { label: 'Wait until date', hint: 'Wait until a time before or after a date field', tone: 'slate' },
  send_file: { label: 'Send file', hint: 'Video, PDF or image from the file library', tone: 'blue' },
  ai_agent: { label: 'AI agent', hint: 'Hand the chat to the AI agent', tone: 'violet' },
  comment: { label: 'Comment', hint: 'Note on the canvas', tone: 'note' },
}
