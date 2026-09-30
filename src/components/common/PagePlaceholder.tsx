import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const PagePlaceholder: React.FC<{ title: string }> = ({ title }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/auth/login');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border p-8 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
            {title.replace('-', ' ')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t('welcome')}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 font-medium transition-colors"
        >
          {t('logout')}
        </button>
      </div>

      <div className="flex-1 rounded-xl border-2 border-dashed border-slate-200 dark:border-dark-border flex flex-col items-center justify-center p-12 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-4"
        >
          <span className="text-3xl text-primary-500">✨</span>
        </motion.div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Coming Soon
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          This is a placeholder for the {title.replace('-', ' ')} module. In a real application, this would contain the actual feature implementation.
        </p>
        
        {/* Placeholder Skeleton */}
        <div className="w-full max-w-2xl mt-12 space-y-4">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-3/4 mx-auto animate-pulse"></div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-1/2 mx-auto animate-pulse"></div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-5/6 mx-auto animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
