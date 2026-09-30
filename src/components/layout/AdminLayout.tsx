import React from 'react';
import { Shell } from './Shell';
import { LayoutDashboard, Settings, Users, Puzzle, DollarSign } from 'lucide-react';

const adminItems = [
  { name: 'dashboard', href: '', icon: LayoutDashboard },
  { name: 'users', href: '/users', icon: Users },
  { name: 'integrations', href: '/integrations', icon: Puzzle },
  { name: 'billing', href: '/billing', icon: DollarSign },
  { name: 'settings', href: '/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  return <Shell sidebarItems={adminItems} basePath="/admin" />;
};
