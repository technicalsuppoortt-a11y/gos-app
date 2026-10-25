import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Zap, Bell, Shield, Smartphone } from "lucide-react";
import { useAppState } from "../context/StateContext";

interface InstallPWAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export const InstallPWAModal: React.FC<InstallPWAModalProps> = ({
  isOpen,
  onClose,
  onInstall,
}) => {
  const { state } = useAppState();
  
  // A simple translation helper specifically for this component if needed
  // Alternatively we can just hardcode or use the state's language if available
  const t = (ar: string, en: string) => (state.settings.language === "ar" ? ar : en);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-900/30"
          >
            {/* Header Area with Logo / Gradient */}
            <div className="relative h-32 bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 flex items-center justify-center overflow-hidden">
              {/* Abstract circles for design */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5" />
              
              <div className="relative z-10 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center p-3">
                <img src="/icon-192.png" alt="App Icon" className="w-full h-full object-contain" />
              </div>
              
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  {t("تثبيت التطبيق", "Install App")}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t(
                    "احصل على تجربة أفضل وأسرع مباشرة من شاشتك الرئيسية.",
                    "Get a better and faster experience directly from your home screen."
                  )}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t("وصول سريع وسلس", "Fast & Seamless Access")}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("تجربة مستخدم محسنة وبدون تأخير", "Optimized user experience with no delay")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t("يعمل كأنه تطبيق أصلي", "Feels Like a Native App")}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("وضع ملء الشاشة بدون شريط متصفح", "Full screen mode without browser bars")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t("آمن وموثوق", "Secure & Reliable")}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("تشفير كامل وحماية لبياناتك", "Full encryption and data protection")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {t("ليس الآن", "Not Now")}
                </button>
                <button
                  onClick={onInstall}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t("تثبيت الآن", "Install Now")}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
