import { Globe, Radio, Blocks, Building2, Layers, Link2, ShieldAlert, ShieldCheck, UserRound, Users, Wallet } from 'lucide-react';

export const settingsTabs = [
  { slug: 'profile', name: 'Profile', icon: UserRound },
  { slug: 'business', name: 'Business', icon: Building2 },
  { slug: 'domains', name: 'Domains', icon: Globe },
  { slug: 'plans', name: 'Plans & Pricing', icon: Layers },
  { slug: 'billing', name: 'Billing & Payments', icon: Wallet },
  { slug: 'integrations', name: 'Integrations', icon: Link2 },
  { slug: 'tools', name: 'Tools', icon: Blocks },
  { slug: 'team', name: 'Team & roles', icon: Users },
  { slug: 'pixel', name: 'Pixel', icon: Radio },
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
  'privacy-policy': 'privacy',
  'plans-pricing': 'plans',
  'plans-and-pricing': 'plans',
  pricing: 'plans',
  domain: 'domains',
  'custom-domains': 'domains',
};
