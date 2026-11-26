import { Bot, CalendarClock, Clock, Paperclip, GitBranch, HelpCircle, MessageSquare, Play, StickyNote, Zap, type LucideIcon } from 'lucide-react'
import type { NodeType } from './types'

const ICONS: Record<NodeType | 'start', [LucideIcon, string, string]> = {
  start: [Play, '#FFEDD5', '#C2410C'],
  send_message: [MessageSquare, '#EDE9FE', '#7C3AED'],
  question: [HelpCircle, '#DBEAFE', '#1D4ED8'],
  actions: [Zap, '#FFEDD5', '#C2410C'],
  condition: [GitBranch, '#FCE7F3', '#BE185D'],
  smart_delay: [Clock, '#F1F0F6', '#3F3E55'],
  ai_agent: [Bot, '#DDF3EA', '#1F7A58'],
  comment: [StickyNote, '#FEF3C7', '#B45309'],
  wait_until: [CalendarClock, '#F1F0F6', '#3F3E55'],
  send_file: [Paperclip, '#EDE9FE', '#7C3AED'],
}

export const PALETTE_GROUPS: { label: string; types: NodeType[] }[] = [
  { label: 'Messages', types: ['send_message', 'question', 'send_file'] },
  { label: 'Logic', types: ['condition', 'smart_delay', 'wait_until'] },
  { label: 'Do', types: ['actions', 'ai_agent', 'comment'] },
]

export function NodeIcon({ type, size = 28 }: { type: NodeType | 'start'; size?: number }) {
  const [Icon, bg, fg] = ICONS[type]
  return (
    <span className="fb-icon" aria-hidden="true" style={{ width: size, height: size, background: bg, color: fg }}>
      <Icon size={Math.round(size * 0.55)} strokeWidth={2} />
    </span>
  )
}
