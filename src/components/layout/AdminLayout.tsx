import { useUILanguage } from '../../i18n/display';
import React from 'react';
import { Shell } from './Shell';
import { LayoutDashboard, Settings, Users, Puzzle, DollarSign } from 'lucide-react';

const adminItems = [
  { name: 'Dashboard', href: '', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Integrations', href: '/integrations', icon: Puzzle },
  { name: 'Billing', href: '/billing', icon: DollarSign },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  useUILanguage();
  return <Shell sidebarItems={adminItems} basePath="/admin" />;
};
