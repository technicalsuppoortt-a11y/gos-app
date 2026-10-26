import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles, LayoutDashboard, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import type { RootState } from '../store';
import { PrivacyPolicyPanel } from './settings/PrivacyPolicyPanel';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useUILanguage, uiDirection, translateText, localizeNode } from '../i18n/display';

export function PrivacyPage() {
  useUILanguage();
  const isRtl = uiDirection() === 'rtl';
  const navigate = useNavigate();
  const auth = useSelector((s: RootState) => s.auth);
  const isAuthenticated = !!auth.token || !!auth.user;
  const appName = import.meta.env.VITE_APP_NAME || 'Upclick Platform';

  return (
    <div className="st-privacy-standalone" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Public Top Navbar with slide-down entrance */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="st-privacy-standalone-header"
      >
        <div className="flex items-center gap-4">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="st-privacy-brand" aria-label={appName}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="st-privacy-brand-logo">
              <ShieldCheck size={20} />
            </motion.div>
            <div>
              <span className="st-privacy-brand-title">{appName}</span>
              <span className="st-privacy-brand-badge ml-2 rtl:mr-2">
                {translateText("Legal & Compliance")}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/dashboard/settings/privacy"
                className="st-privacy-btn secondary flex items-center gap-1.5"
              >
                <LayoutDashboard size={13} />
                <span>{translateText("Open in Settings")}</span>
              </Link>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/login"
                className="st-privacy-btn primary flex items-center gap-1.5"
              >
                <LogIn size={13} />
                <span>{translateText("Sign In")}</span>
              </Link>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Main Container with smooth fade-up entrance */}
      <motion.div 
        className="st-privacy-standalone-shell"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-4 flex items-center justify-between">
          <motion.button
            type="button"
            whileHover={{ x: isRtl ? 3 : -3 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(isAuthenticated ? '/dashboard' : '/');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 transition-colors cursor-pointer"
          >
            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            <span>{translateText("Back")}</span>
          </motion.button>
        </div>

        {/* Embedded Policy Panel */}
        <PrivacyPolicyPanel mode="standalone" />

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-2 text-xs">
            <a href="mailto:technicalsuppoortt@gmail.com" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              technicalsuppoortt@gmail.com
            </a>
            <span>•</span>
            <a href="https://gos-app-3c7fb.web.app/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium">
              https://gos-app-3c7fb.web.app/
            </a>
            <span>•</span>
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              {translateText("Home")}
            </Link>
          </div>
          <p>© {new Date().getFullYear()} {appName}. {translateText("All rights reserved. Dedicated to data privacy and security.")}</p>
        </footer>
      </motion.div>
    </div>
  );
}

export default PrivacyPage;
