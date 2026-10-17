import { Blocks, Building2, Lightbulb, Link2, ShieldAlert, ShieldCheck, UserRound, Users, Wallet } from 'lucide-react';
export const settingsTabs = [
  { slug: 'profile', name: 'Profile', icon: UserRound },
  { slug: 'business', name: 'Business', icon: Building2 },
  { slug: 'team', name: 'Team & roles', icon: Users },
  { slug: 'knowledge', name: 'Knowledge', icon: Lightbulb },
  { slug: 'tools', name: 'Tools', icon: Blocks },
  { slug: 'integrations', name: 'Integrations', icon: Link2 },
  { slug: 'billing', name: 'Billing & Payments', icon: Wallet },
  { slug: 'security', name: 'Security', icon: ShieldCheck },
  { slug: 'privacy', name: 'Privacy Policy', icon: ShieldAlert },
];
export const settingsAliases: Record<string, string> = { 
  payments: 'billing', 
  'billing-payments': 'billing', 
  'billing-wallet': 'billing', 
  'billing-and-wallet': 'billing', 
  'team-roles': 'team', 
  'team-and-roles': 'team',
  'privacy-policy': 'privacy'
};
