import { Globe, Radio, Blocks, Building2, Link2, ShieldAlert, ShieldCheck, UserRound, Users, Wallet } from 'lucide-react';

export const settingsTabs = [
  { slug: 'profile', name: 'Profile', icon: UserRound },
  { slug: 'business', name: 'Business', icon: Building2 },
  { slug: 'domains', name: 'Domains', icon: Globe },
  { slug: 'billing', name: 'Plans & Billing', icon: Wallet },
  { slug: 'integrations', name: 'Integrations', icon: Link2 },
  { slug: 'tools', name: 'Tools', icon: Blocks },
  { slug: 'team', name: 'Team & roles', icon: Users },
  { slug: 'pixel', name: 'Pixel', icon: Radio },
  { slug: 'security', name: 'Security', icon: ShieldCheck },
  { slug: 'privacy', name: 'Privacy Policy', icon: ShieldAlert },
];

export const settingsAliases: Record<string, string> = { 
  payments: 'billing', 
  wallet: 'billing',
  'billing-payments': 'billing', 
  'billing-wallet': 'billing', 
  'billing-and-wallet': 'billing', 
  'team-roles': 'team', 
  'team-and-roles': 'team',
  'privacy-policy': 'privacy',
  plans: 'billing',
  'plans-pricing': 'billing',
  'plans-and-pricing': 'billing',
  pricing: 'billing',
  domain: 'domains',
  'custom-domains': 'domains',
};
