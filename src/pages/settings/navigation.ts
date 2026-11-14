import { Globe, Headset, Landmark, Radio, Building2, Link2, ShieldAlert, ShieldCheck, UserRound, Users, Wallet } from 'lucide-react';

export const settingsTabs = [
  { slug: 'profile', name: 'Profile', icon: UserRound },
  { slug: 'business', name: 'Business', icon: Building2 },
  { slug: 'domains', name: 'Domains', icon: Globe },
  { slug: 'billing', name: 'Plans & Billing', icon: Wallet },
  { slug: 'payment-methods', name: 'Payment Methods', icon: Landmark },
  { slug: 'integrations', name: 'Integrations', icon: Link2 },
  { slug: 'team', name: 'Team & roles', icon: Users },
  { slug: 'support-team', name: 'Support Team', icon: Headset },
  { slug: 'pixel', name: 'Pixel', icon: Radio },
  { slug: 'security', name: 'Security', icon: ShieldCheck },
  { slug: 'privacy', name: 'Privacy Policy', icon: ShieldAlert },
];

export const settingsAliases: Record<string, string> = { 
  payments: 'payment-methods', 
  'payment-gateways': 'payment-methods',
  wallet: 'billing',
  'billing-payments': 'billing', 
  'billing-wallet': 'billing', 
  'billing-and-wallet': 'billing', 
  'team-roles': 'team', 
  'team-and-roles': 'team',
  'support-routing': 'support-team',
  'support-agents': 'support-team',
  'privacy-policy': 'privacy',
  plans: 'billing',
  'plans-pricing': 'billing',
  'plans-and-pricing': 'billing',
  pricing: 'billing',
  domain: 'domains',
  'custom-domains': 'domains',
};

