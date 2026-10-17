import { useUILanguage, uiDirection } from '../../i18n/display';
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { motion } from 'framer-motion';

interface ShellProps {
  sidebarItems: { name: string; href: string; icon: React.ElementType }[];
  basePath: string;
}

export const Shell: React.FC<ShellProps> = ({ sidebarItems, basePath }) => {
  useUILanguage();

  useEffect(() => {
    document.documentElement.classList.add('layout-locked');
    document.body.classList.add('layout-locked');
    return () => {
      document.documentElement.classList.remove('layout-locked');
      document.body.classList.remove('layout-locked');
    };
  }, []);

  return (
    <div 
      className={`role-shell flex h-screen max-h-screen overflow-hidden bg-slate-50 dark:bg-dark-bg transition-colors duration-300 ${basePath === '/super-admin' ? 'super-admin-shell' : ''}`}
      dir={uiDirection()}
    >
      <Sidebar items={sidebarItems} basePath={basePath} />
      
      <div className="role-shell-main flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-hidden">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden min-h-0">
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
