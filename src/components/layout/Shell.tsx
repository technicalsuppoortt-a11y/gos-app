import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { motion } from 'framer-motion';

interface ShellProps {
  sidebarItems: { name: string; href: string; icon: React.ElementType }[];
  basePath: string;
}

export const Shell: React.FC<ShellProps> = ({ sidebarItems, basePath }) => {
  return (
    <div className={`role-shell flex min-h-screen bg-slate-50 dark:bg-dark-bg transition-colors duration-300 ${basePath === '/super-admin' ? 'super-admin-shell' : ''}`}>
      <Sidebar items={sidebarItems} basePath={basePath} />
      
      <div className="role-shell-main flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};
