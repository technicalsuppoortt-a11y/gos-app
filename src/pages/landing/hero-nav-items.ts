import {
  BarChart3,
  CalendarDays,
  Contact,
  CreditCard,
  Filter,
  MessageCircle,
  MessageSquare,
  Send,
  Settings,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const heroNavItems: { name: string; Icon: LucideIcon; dividerBefore?: boolean }[] = [
  { name: 'AI Copilot', Icon: Sparkles },
  { name: 'Dashboard', Icon: MessageSquare },
  { name: 'Funnel & Website', Icon: Filter },
  { name: 'Inbox', Icon: MessageCircle },
  { name: 'CRM & Leads', Icon: Users },
  { name: 'Contacts', Icon: Contact },
  { name: 'Automation & Campaign', Icon: Zap },
  { name: 'AI Follow-Up', Icon: Send },
  { name: 'Booking & Calendar', Icon: CalendarDays },
  { name: 'Products & Payments', Icon: CreditCard },
  { name: 'Analytics', Icon: BarChart3 },
  { name: 'Settings', Icon: Settings, dividerBefore: true },
];

export const HERO_DEFAULT_TAB = 1; // Dashboard
