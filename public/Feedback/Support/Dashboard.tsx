import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Handshake,
  LayoutDashboard,
  BarChart3,
  Settings,
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  ChevronDown,
  LogOut,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  MessageSquare,
  Plus,
  Trash2,
  Calendar,
  Lock,
  Menu,
  X,
  ShieldAlert,
  Search,
  Check,
  Languages,
  BookOpen,
  Package,
  MessageCircle,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Trophy,
  CreditCard,
  Radar,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useAppState } from "../context/StateContext";
import { db, firestore } from "../config/firebase";
import FloatingChatWidget from "../components/FloatingChatWidget";
import LoadingScreen from "../components/LoadingScreen";
import { useTrackingScripts } from "../hooks/useTrackingScripts";
import { InstallPWAModal } from "../components/InstallPWAModal";

// Tab sections:
import OverviewSection from "./tabs/OverviewSection";
import SalesSection from "./tabs/SalesSection";
import { ContactsSection } from "./tabs/ContactsSection";

import BookingSection from "./tabs/BookingSection";
import LeaderboardSection from "./tabs/LeaderboardSection";
import TrainingSection from "./tabs/TrainingSection";
import PackagesSection from "./tabs/PackagesSection";
import CommunitySection from "./tabs/CommunitySection";
import FinanceSection from "./tabs/FinanceSection";
import SettingsSection from "./tabs/SettingsSection";
import PaymentMethodsSection from "./tabs/PaymentMethodsSection";
import UserManagementSection from "./tabs/UserManagementSection";
import AnalyticsSection from "./tabs/AnalyticsSection";
import { CRMSection } from "./tabs/CRMSection";
import TasksSection from "./tabs/TasksSection";
import RulesSection from "./tabs/RulesSection";
import AdminRulesSection from "./tabs/AdminRulesSection";
import { CreativeLibrary } from "./tabs/CreativeLibrary";
import { AdminCreativeSection } from "./tabs/AdminCreativeSection";
import AffiliateLevelsSection from "./tabs/AffiliateLevelsSection";
import AdminAffiliateLevelsSection from "./tabs/AdminAffiliateLevelsSection";
import MarketingTrackingSection from "./tabs/MarketingTrackingSection";
import SubscriptionPlansSection from "./tabs/SubscriptionPlansSection";
import AdminSubscriptionPlansSection from "./tabs/AdminSubscriptionPlansSection";
import AdminPaymentsSection from "./tabs/AdminPaymentsSection";
import AdminTemplatesSection from "./tabs/AdminTemplatesSection";
import PartnerTemplatesSection from "./tabs/PartnerTemplatesSection";
import AdminSalesRepsSection from "./tabs/AdminSalesRepsSection";
import AdminMarketersSection from "./tabs/AdminMarketersSection";
export default function Dashboard({ initialTab }: { initialTab?: string } = {}) {
  const navigate = useNavigate();
  const { state, updateState, fmtMoney, loading: stateLoading } = useAppState();
  const { userProfile, loading: authLoading, logOut, isAdmin, hasPermission } = useAuth();

  if (authLoading || stateLoading || !state) {
    return <LoadingScreen />;
  }

  const isRtl = state.settings.language === "ar";
  const t = (ar: string, en: string) => (isRtl ? ar : en);

  // Inject global pixel scripts (Meta/GA4) from admin tracking config.
  // Called here — after auth is confirmed — so no permission-denied errors.
  useTrackingScripts();

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialTab) return initialTab;
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path === "/rules" || path === "/affiliate-rules") return "rules";
    return localStorage.getItem("partner_portal_active_tab") || "dashboard";
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    localStorage.setItem("partner_portal_active_tab", activeTab);
    setSearchQuery("");
  }, [activeTab]);

  const [mobileOpen, setMobileOpen] = useState(false);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Check if event was already captured globally before this component mounted
    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      setIsInstallable(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleCustomPromptReady = (e: any) => {
      setDeferredPrompt(e.detail);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handleCustomPromptReady);
    
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handleCustomPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      toast.info(t("كيفية تثبيت التطبيق", "How to install"), {
        description: t("اضغط على أيقونة المشاركة ثم 'إضافة إلى الشاشة الرئيسية'", "Tap Share icon, then select 'Add to Home Screen'"),
        duration: 5000,
      });
      return;
    }

    const promptEvent = deferredPrompt || (window as any).deferredPWAInstallPrompt;

    if (promptEvent) {
      setIsInstallModalOpen(true);
    } else {
      toast.info(t("كيفية تثبيت التطبيق", "How to install"), {
        description: t("يمكنك تثبيت التطبيق من إعدادات المتصفح", "You can install the app from your browser settings"),
      });
    }
  };

  const handleActualInstall = () => {
    const promptEvent = deferredPrompt || (window as any).deferredPWAInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as any).deferredPWAInstallPrompt = null;
          setIsInstallable(false);
        }
        setIsInstallModalOpen(false);
      });
    }
  };

  // Dropdown states
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Refs for click outside
  const currencyRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const msgRef2 = useRef<HTMLDivElement>(null); // dummy ref if needed
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (currencyRef.current && !currencyRef.current.contains(target)) setCurrencyOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (msgRef.current && !msgRef.current.contains(target)) setMsgOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (langRef.current && !langRef.current.contains(target)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Strict route guard: redirect users away from restricted tabs they lack permissions for
  useEffect(() => {
    if (!userProfile) return;

    // User management and Tasks are strictly Admin only
    if (
      (activeTab === "user-management" || activeTab === "tasks") &&
      userProfile.role !== "admin"
    ) {
      setActiveTab("dashboard");
      toast.error(t("غير مسموح بالدخول", "Access Denied"), {
        description: t(
          "لا تملك الصلاحية للوصول",
          "You do not have permission to access this section.",
        ),
      });
      return;
    }

    // Finance is strictly Admin only
    if (activeTab === "finance" && userProfile.role !== "admin") {
      setActiveTab("dashboard");
      toast.error(t("غير مسموح بالدخول", "Access Denied"), {
        description: t(
          "لا تملك الصلاحية للوصول للأرباح والعمولات",
          "You do not have permission to access Finance.",
        ),
      });
      return;
    }

    // Permission checks for specific tabs
    const guards: Record<string, { perm: string; name: string }> = {
      crm: { perm: "show:crm", name: t("إدارة علاقات العملاء (CRM)", "CRM Board") },
      training: { perm: "read:academy", name: t("أكاديمية التدريب", "Academy") },
      community: { perm: "read:support", name: t("الدعم الفني", "Support") },
      finance: { perm: "read:transactions", name: t("الأرباح والعمولات", "Finance") },
      leaderboard: { perm: "read:leaderboard", name: t("لوحة الصدارة", "Leaderboard") },
      booking: { perm: "show:booking", name: t("الحجوزات و المكالمات", "Bookings & Calls") },
    };

    const guard = guards[activeTab];
    if (guard && !hasPermission(guard.perm)) {
      setActiveTab("dashboard");
      toast.error(t("غير مسموح بالدخول", "Access Denied"), {
        description: t(
          `ليس لديك صلاحية لعرض ${guard.name}.`,
          `You do not have permission to view ${guard.name}.`,
        ),
      });
    }
  }, [activeTab, userProfile]);

  // ─── Subscription Lockout Logic ──────────────────────────────────────────
  let isGracePeriod = false;
  let isLockedOut = false;

  if (userProfile && userProfile.role !== "admin" && userProfile.subscription?.currentPeriodEnd) {
    const now = new Date();
    const currentEnd = userProfile.subscription.currentPeriodEnd;
    const endDate = currentEnd.toDate ? currentEnd.toDate() : new Date(currentEnd);
    const graceDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours grace
    
    if (now > endDate && now <= graceDate) {
      isGracePeriod = true;
    } else if (now > graceDate) {
      isLockedOut = true;
    }
  }

  // Force redirect to subscription-plans if locked out
  useEffect(() => {
    if (isLockedOut && activeTab !== "subscription-plans" && userProfile?.role !== "admin") {
      setActiveTab("subscription-plans");
      toast.error(t("الاشتراك منتهي", "Subscription Expired"), {
        description: t(
          "انتهى اشتراكك. يرجى التجديد للوصول إلى المنصة.",
          "Your subscription has expired. Please renew to access the platform."
        ),
      });
    }
  }, [isLockedOut, activeTab, userProfile]);

  const handleLogout = async () => {
    try {
      await logOut();
      localStorage.removeItem("partner_portal_active_tab");
      navigate("/login");
    } catch (err) {
      toast.error("Error logging out");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = state.notifications.filter((n) => !n.read);
      if (unread.length === 0) return;

      const promises = unread.map((notif) => {
        return firestore.updateDoc(firestore.doc(db, "notifications", String(notif.id)), {
          read: true,
          isRead: true,
        });
      });
      await Promise.all(promises);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  // Automatically mark notifications as read when tray is opened
  useEffect(() => {
    if (notifOpen) {
      const unreadCount = state.notifications.filter((n) => !n.read).length;
      if (unreadCount > 0) {
        handleMarkAllRead();
      }
    }
  }, [notifOpen, state.notifications]);

  const [globalSyncLoading, setGlobalSyncLoading] = useState(false);

  const handleSelectLanguage = async (newLang: "ar" | "en") => {
    setGlobalSyncLoading(true);
    try {
      await updateState((draft) => {
        draft.settings.language = newLang;
      });
      document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = newLang;
      setLangOpen(false);
      toast.success(
        newLang === "ar" ? "تم تحويل الواجهة للغة العربية" : "Dashboard UI switched to English",
      );
    } catch (err) {
      toast.error("Error setting language");
    } finally {
      setGlobalSyncLoading(false);
    }
  };

  const handleSelectCurrency = async (curr: string) => {
    setGlobalSyncLoading(true);
    try {
      await updateState((draft) => {
        draft.settings.currency = curr;
      });
      setCurrencyOpen(false);
      toast.success(t(`تم تغيير العملة إلى ${curr}`, `Currency changed to ${curr}`));
    } catch (err) {
      toast.error("Error setting currency");
    } finally {
      setGlobalSyncLoading(false);
    }
  };

  const currencies = ["USD", "AED", "SAR", "EGP", "KWD", "QAR", "EUR", "GBP"];

  const currencyLabels: Record<string, string> = {
    USD: "$ USD",
    AED: "د.إ AED",
    SAR: "ر.س SAR",
    EGP: "ج.م EGP",
    KWD: "د.ك KWD",
    QAR: "ر.ق QAR",
    EUR: "€ EUR",
    GBP: "£ GBP",
  };

  const unreadNotifs = state.notifications.filter((n) => !n.read);
  const unreadMessagesCount = state.messages.length; // messages is treated as alerts list

  // Render sidebar items grouping
  const sidebarGroups = [
    {
      label: "",
      items: [{ key: "dashboard", label: t("الرئيسية", "Overview"), icon: LayoutDashboard }],
    },
    {
      label: t("المبيعات والعملاء", "Sales & CRM"),
      items: [
        { key: "sales", label: t("قمع المبيعات", "Sales Funnel"), icon: TrendingUp },
        ...(hasPermission("show:crm")
          ? [{ key: "crm", label: t("إدارة علاقات العملاء (CRM)", "CRM Board"), icon: Activity }]
          : []),
        { key: "contacts", label: t("جهات الاتصال", "Contacts"), icon: Users },
        { key: "packages", label: t("الباقات والسكربتات", "Packages & Scripts"), icon: Package },
        ...(userProfile?.role !== "admin"
          ? [
              { key: "landing-pages", label: t("صفحات الهبوط والقوالب", "Landing Pages Management"), icon: LucideIcons.LayoutTemplate },
            ]
          : []),
      ],
    },
    {
      label: t("النمو والتطوير", "Growth & Learning"),
      items: [
        ...(hasPermission("show:booking")
          ? [
              {
                key: "booking",
                label: t("الحجوزات و المكالمات", "Bookings & Calls"),
                icon: Calendar,
              },
            ]
          : []),
        ...(hasPermission("read:leaderboard") || isAdmin
          ? [{ key: "leaderboard", label: t("لوحة الصدارة", "Leaderboard"), icon: Trophy }]
          : []),
        ...(hasPermission("read:academy")
          ? [{ key: "training", label: t("أكاديمية التدريب", "Academy"), icon: BookOpen }]
          : []),
        ...(hasPermission("read:support")
          ? [{ key: "community", label: t("الدعم الفني", "Support"), icon: MessageCircle }]
          : []),
        { key: "creatives", label: t("مكتبة المحتوى الإبداعي", "Creative Library"), icon: Sparkles },
        ...(userProfile?.role !== "admin"
          ? [{ key: "affiliate-levels", label: t("مستويات الشراكة", "Affiliate Levels"), icon: LucideIcons.BarChart3 }]
          : []),
        ...(userProfile?.role !== "admin"
          ? [{ key: "rules", label: t("قواعد المسوقين", "Affiliate Rules"), icon: ShieldAlert }]
          : []),
      ],
    },

    {
      label: t("النظام والمالية", "System & Finance"),
      items: [
        ...(userProfile?.role === "admin"
          ? [
              {
                key: "finance",
                label: t("الأرباح والعمولات", "Finance & Commissions"),
                icon: DollarSign,
              },
              {
                key: "admin-landing-pages",
                label: t("إدارة قوالب صفحات الهبوط", "Landing Page Templates"),
                icon: LucideIcons.LayoutTemplate,
              },
              {
                key: "tasks",
                label: t("إدارة المهام", "Tasks Management"),
                icon: LucideIcons.ClipboardList,
              },
              {
                key: "admin-affiliate-levels",
                label: t("إدارة مستويات الشراكة", "Manage Levels"),
                icon: LucideIcons.BarChart3,
              },
              {
                key: "admin-rules",
                label: t("إدارة القواعد", "Rules Management"),
                icon: ShieldAlert,
              },
              {
                key: "admin-subscription-plans",
                label: t("إدارة خطط الاشتراك", "Subscription Plans"),
                icon: LucideIcons.Crown,
              },
              {
                key: "admin-sales-reps",
                label: t("المندوبين المسؤولين", "Sales Representatives"),
                icon: Users,
              },
              {
                key: "admin-marketers",
                label: t("المسوقين المسؤولين", "Marketers"),
                icon: Users,
              },
              {
                key: "admin-payments",
                label: t("طلبات الدفع", "Payment Requests"),
                icon: LucideIcons.CreditCard,
              },
              // {
              //   key: "admin-creatives",
              //   label: t("مراجعة التصاميم", "Admin Creative Queue"),
              //   icon: LucideIcons.CheckSquare,
              // },
            ]
          : []),
        { key: "settings", label: t("إعدادات الحساب", "Settings"), icon: Settings },
        ...(userProfile?.role === "admin"
          ? [
              {
                key: "user-management",
                label: t("إدارة المستخدمين", "User Management"),
                icon: Lock,
              },
            ]
          : []),
        { key: "payment-methods", label: t("طرق الدفع", "Payment Methods"), icon: CreditCard },
        { key: "marketing-tracking", label: t("تتبع التسويق", "Marketing Tracking"), icon: Radar },
        ...(userProfile?.role !== "admin"
          ? [
              { key: "subscription-plans", label: t("خطط الاشتراك", "Subscription Plans"), icon: LucideIcons.Crown },
            ]
          : []),
      ],
    },
  ];

  const renderSection = () => {
    switch (activeTab) {
      case "dashboard":
        return <OverviewSection onNavigate={setActiveTab} />;
      case "sales":
        return <SalesSection defaultView="funnel" />;
      case "crm":
        return hasPermission("show:crm") ? (
          <CRMSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "payment-methods":
        return <PaymentMethodsSection />;
      case "contacts":
        return <ContactsSection searchQuery={searchQuery} />;
      case "booking":
        return hasPermission("show:booking") ? (
          <BookingSection searchQuery={searchQuery} />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "leaderboard":
        return hasPermission("read:leaderboard") || isAdmin ? (
          <LeaderboardSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "training":
        return hasPermission("read:academy") ? (
          <TrainingSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "packages":
        return <PackagesSection />;
      case "community":
        return hasPermission("read:support") ? (
          <CommunitySection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "creatives":
        return <CreativeLibrary />;
      case "admin-creatives":
        return userProfile?.role === "admin" || isAdmin ? (
          <AdminCreativeSection />
        ) : (
          <CreativeLibrary />
        );
      case "admin-payments":
        return userProfile?.role === "admin" || isAdmin ? (
          <AdminPaymentsSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "finance":
        return userProfile?.role === "admin" ? (
          <FinanceSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "admin-landing-pages":
        return userProfile?.role === "admin" || isAdmin ? (
          <AdminTemplatesSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "landing-pages":
        return userProfile?.role !== "admin" ? (
          <PartnerTemplatesSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "settings":
        return <SettingsSection />;
      case "user-management":
        return userProfile?.role === "admin" ? (
          <UserManagementSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "tasks":
        return userProfile?.role === "admin" ? (
          <TasksSection searchQuery={searchQuery} />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "rules":
        return <RulesSection />;
      case "affiliate-levels":
        return <AffiliateLevelsSection />;
      case "admin-rules":
        return userProfile?.role === "admin" || isAdmin ? (
          <AdminRulesSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "admin-affiliate-levels":
        return userProfile?.role === "admin" || isAdmin ? (
          <AdminAffiliateLevelsSection isRtl={isRtl} t={t} />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "marketing-tracking":
        return (
          <MarketingTrackingSection
            isAdmin={userProfile?.role === "admin" || isAdmin}
            userId={userProfile?.uid || ""}
            isRtl={isRtl}
            t={t}
          />
        );
      case "subscription-plans":
        return <SubscriptionPlansSection />;
      case "admin-subscription-plans":
        return userProfile?.role === "admin" || isAdmin ? (
          <AdminSubscriptionPlansSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "admin-sales-reps":
        return userProfile?.role === "admin" || isAdmin ? (
          <AdminSalesRepsSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      case "admin-marketers":
        return userProfile?.role === "admin" || isAdmin ? (
          <AdminMarketersSection />
        ) : (
          <OverviewSection onNavigate={setActiveTab} />
        );
      default:
        return <OverviewSection onNavigate={setActiveTab} />;
    }
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#090a0f] dark:text-slate-100 transition-colors duration-300 font-sans"
    >
      {/* 1. SIDEBAR (Desktop) */}
      <aside
        className="hidden lg:flex flex-col w-64 border-r dark:border-r-0 dark:border-l backdrop-blur-md shrink-0 sticky top-0 h-screen z-20"
        style={{ backgroundColor: "var(--bg-2)", borderColor: "var(--line)" }}
      >
        {/* Brand details */}
        <div
          className="h-16 flex items-center gap-2.5 px-6 border-b"
          style={{ borderColor: "var(--line)" }}
        >
          <svg
            className="h-9 w-9 hover:scale-105 transition-transform duration-200"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--green)" />
                <stop offset="100%" stopColor="var(--txt)" />
              </linearGradient>
            </defs>
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="url(#logo-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="50 15"
              className="animate-[spin_20s_linear_infinite]"
            />
            <path
              d="M11 11h3.5v9a2.5 2.5 0 01-5 0"
              stroke="url(#logo-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17.5 11h4a3 3 0 010 6h-4v5"
              stroke="url(#logo-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <span className="text-sm font-black tracking-tight block text-slate-900 dark:text-white">
              {state.settings.companyName || t("جو بارتنر", "Joe Partner")}
            </span>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest leading-none mt-0.5">
              {t("مركز القيادة", "Command Center")}
            </span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {sidebarGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              {group.label && (
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pb-1">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const IconComp = item.icon;
                const isSelected = activeTab === item.key;
                const isAffiliateLocked = userProfile?.role !== "admin" && userProfile?.affiliateRulesAccepted === false && item.key !== "rules";
                const isSubscriptionLocked = isLockedOut && item.key !== "subscription-plans";
                const isLocked = isAffiliateLocked || isSubscriptionLocked;

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key === "ai-coach") {
                        window.dispatchEvent(new Event("toggle-ai-coach"));
                      } else {
                        if (isSubscriptionLocked) {
                          toast.error(t("الاشتراك منتهي", "Subscription Expired"), {
                            description: t("الرجاء تجديد اشتراكك للوصول إلى هذه الصفحة", "Please renew your subscription to access this page"),
                          });
                          setActiveTab("subscription-plans");
                          return;
                        }
                        if (isAffiliateLocked) {
                          toast.error(t("الرجاء الموافقة على القواعد", "Please Accept Rules"), {
                            description: t("يجب الموافقة على قواعد المسوقين أولاً للوصول إلى هذه الصفحة", "You must accept the affiliate rules to access this page"),
                          });
                          setActiveTab("rules");
                          return;
                        }
                        setActiveTab(item.key);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 border hover:bg-white/5 hover:text-white"
                    style={
                      isSelected
                        ? {
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            borderColor: "rgba(16, 185, 129, 0.2)",
                            color: "var(--green)",
                          }
                        : {
                            backgroundColor: "transparent",
                            borderColor: "transparent",
                            color: "var(--txt-dim)",
                          }
                    }
                  >
                    <IconComp className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {isLocked && <Lock className="h-3.5 w-3.5 shrink-0 ml-auto opacity-50 text-amber-500" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User profile section at the bottom */}
        <div className="p-4 border-t" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-md border"
              style={{
                background: "var(--panel-b)",
                borderColor: "var(--line)",
                color: "var(--green)",
              }}
            >
              {userProfile?.name?.slice(0, 2).toUpperCase() || "JP"}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black block truncate text-slate-900 dark:text-white">
                {userProfile?.name || "Partner"}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block truncate capitalize">
                {userProfile?.role === "admin"
                  ? t("المدير العام", "Administrator")
                  : t("شريك معتمد", "Certified Partner")}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition shrink-0"
              title={t("تسجيل الخروج", "Sign Out")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE NAV DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-[100000] flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: isRtl ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative flex flex-col w-72 max-w-[80%] border-r h-full p-5 space-y-6 z-50 shadow-2xl"
              style={{ backgroundColor: "var(--bg-2)", borderColor: "var(--line)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-8 w-8"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="logo-gradient-mobile" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--green)" />
                        <stop offset="100%" stopColor="var(--txt)" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="url(#logo-gradient-mobile)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="50 15"
                      className="animate-[spin_20s_linear_infinite]"
                    />
                    <path
                      d="M11 11h3.5v9a2.5 2.5 0 01-5 0"
                      stroke="url(#logo-gradient-mobile)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M17.5 11h4a3 3 0 010 6h-4v5"
                      stroke="url(#logo-gradient-mobile)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-black">{t("جو بارتنر", "Joe Partner")}</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto space-y-5 pr-1">
                {sidebarGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1">
                    {group.label && (
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2.5">
                        {group.label}
                      </div>
                    )}
                    {group.items.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = activeTab === item.key;
                      const isAffiliateLocked = userProfile?.role !== "admin" && userProfile?.affiliateRulesAccepted === false && item.key !== "rules";
                      const isSubscriptionLocked = isLockedOut && item.key !== "subscription-plans";
                      const isLocked = isAffiliateLocked || isSubscriptionLocked;
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            if (item.key === "ai-coach") {
                              window.dispatchEvent(new Event("toggle-ai-coach"));
                            } else {
                              if (isSubscriptionLocked) {
                                toast.error(t("الاشتراك منتهي", "Subscription Expired"), {
                                  description: t("الرجاء تجديد اشتراكك للوصول إلى هذه الصفحة", "Please renew your subscription to access this page"),
                                });
                                setActiveTab("subscription-plans");
                                setMobileOpen(false);
                                return;
                              }
                              if (isAffiliateLocked) {
                                toast.error(t("الرجاء الموافقة على القواعد", "Please Accept Rules"), {
                                  description: t("يجب الموافقة على قواعد المسوقين أولاً للوصول إلى هذه الصفحة", "You must accept the affiliate rules to access this page"),
                                });
                                setActiveTab("rules");
                                setMobileOpen(false);
                                return;
                              }
                              setActiveTab(item.key);
                            }
                            setMobileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-all hover:bg-white/5 hover:text-white"
                          style={
                            isSelected
                              ? {
                                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                                  color: "var(--green)",
                                }
                              : { backgroundColor: "transparent", color: "var(--txt-dim)" }
                          }
                        >
                          <IconComp className="h-4 w-4" />
                          <span>{item.label}</span>
                          {isLocked && <Lock className="h-3.5 w-3.5 shrink-0 ml-auto opacity-50 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div
                className="pt-4 border-t flex items-center justify-between"
                style={{ borderColor: "var(--line)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border"
                    style={{
                      background: "var(--panel-b)",
                      borderColor: "var(--line)",
                      color: "var(--green)",
                    }}
                  >
                    {userProfile?.name?.slice(0, 2).toUpperCase() || "JP"}
                  </div>
                  <span className="text-xs font-bold">{userProfile?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* TOPBAR HEADER */}
        <header
          className="sticky top-0 z-30 h-16 border-b backdrop-blur-md flex items-center justify-between px-2 sm:px-6 lg:px-8"
          style={{ backgroundColor: "var(--bg-2)", borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick search input */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-1.5 rounded-xl w-60 text-xs">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={t("بحث سريع...", "Quick search...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2.5">
            {/* GET APP BUTTON */}
            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-bold rounded-xl transition shadow-sm animate-fade-in"
              >
                <LucideIcons.Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{t("تثبيت التطبيق", "Get App")}</span>
              </button>
            )}

            {/* PROFESSIONAL LANGUAGE SELECTOR */}
            <div className="relative animate-fade-in" ref={langRef}>
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 px-1.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl hover:border-slate-400 dark:hover:border-slate-700 transition"
              >
                <Languages className="h-3.5 w-3.5 text-slate-550 dark:text-slate-400" />
                <span>{state.settings.language === "ar" ? "العربية" : "English"}</span>
                <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />
              </button>

              {langOpen && (
                <div
                  className={`fixed top-16 left-1/2 -translate-x-1/2 md:absolute md:top-auto md:translate-x-0 ${
                    isRtl ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
                  } mt-2 w-32 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 shadow-lg z-30 animate-fade-in`}
                >
                  <div className="p-1.5 space-y-1">
                    <button
                      onClick={() => handleSelectLanguage("ar")}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition ${
                        state.settings.language === "ar"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-400"
                      }`}
                    >
                      <span>العربية</span>
                      {state.settings.language === "ar" && (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSelectLanguage("en")}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition ${
                        state.settings.language === "en"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-400"
                      }`}
                    >
                      <span>English</span>
                      {state.settings.language === "en" && (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 1. CUSTOM CURRENCY DROPDOWN SELECTOR */}
            <div className="relative animate-fade-in" ref={currencyRef}>
              <button
                onClick={() => setCurrencyOpen((o) => !o)}
                className="flex items-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl hover:border-slate-400 dark:hover:border-slate-700 transition"
              >
                <span>
                  {currencyLabels[state.settings.currency || "USD"] ||
                    state.settings.currency ||
                    "USD"}
                </span>
                <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />
              </button>

              {currencyOpen && (
                <div
                  className={`fixed top-16 left-1/2 -translate-x-1/2 md:absolute md:top-auto md:translate-x-0 ${
                    isRtl ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
                  } mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 shadow-lg z-30`}
                >
                  <div className="p-1.5 space-y-1">
                    {currencies.map((curr) => (
                      <button
                        key={curr}
                        onClick={() => handleSelectCurrency(curr)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition ${
                          state.settings.currency === curr
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-400"
                        }`}
                      >
                        <span className="font-sans" dir="ltr">
                          {currencyLabels[curr] || curr}
                        </span>
                        {state.settings.currency === curr && (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* 2. MESSAGES DROPDOWN */}
            <div className="relative animate-fade-in" ref={msgRef}>
              <button
                onClick={() => setMsgOpen((o) => !o)}
                className="p-1.5 sm:p-2 text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-900 rounded-xl transition relative"
              >
                <MessageSquare className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-slate-550 dark:text-slate-400" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#090a0f]" />
                )}
              </button>

              {msgOpen && (
                <div
                  className={`fixed top-16 left-4 right-4 w-auto md:absolute md:top-auto md:translate-x-0 ${
                    isRtl ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
                  } mt-2 md:w-80 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 shadow-xl z-30`}
                >
                  <div className="border-b border-slate-100 dark:border-slate-850 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-850 dark:text-white">
                      {t("صندوق الرسائل والتنبيهات", "Message Box")}
                    </span>
                    <span className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-black">
                      {unreadMessagesCount} {t("جديد", "New")}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-900/60 max-h-64 overflow-y-auto">
                    {state.messages.length > 0 ? (
                      state.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-900/20 transition cursor-pointer"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {msg.name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {msg.time}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {msg.preview}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        {t("لا توجد رسائل واردة حالياً", "No messages at this time")}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/20">
                    <button
                      onClick={() => {
                        setActiveTab("community");
                        setMsgOpen(false);
                      }}
                      className="w-full py-2 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:text-purple-400 rounded-xl transition flex items-center justify-center gap-1.5 border border-purple-100 dark:border-purple-900/45 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                      <span>{t("محادثة الدعم الفني", "Open Support Chat")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. NOTIFICATIONS DROPDOWN */}
            <div className="relative animate-fade-in" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="p-1.5 sm:p-2 text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-900 rounded-xl transition relative"
              >
                <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-slate-550 dark:text-slate-400" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#090a0f]" />
                )}
              </button>

              {notifOpen && (
                <div
                  className={`fixed top-16 left-4 right-4 w-auto md:absolute md:top-auto md:translate-x-0 ${
                    isRtl ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
                  } mt-2 md:w-80 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 shadow-xl z-30`}
                >
                  <div className="border-b border-slate-100 dark:border-slate-850 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-850 dark:text-white">
                      {t("الإشعارات المستلمة", "Notifications")}
                    </span>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-blue-500 hover:text-blue-600 font-bold"
                      >
                        {t("تحديد الكل كمقروء", "Mark all read")}
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-900/60 max-h-64 overflow-y-auto">
                    {state.notifications.length > 0 ? (
                      state.notifications.map((notif) => {
                        const IconComponent = (LucideIcons as any)[notif.icon] || Bell;
                        return (
                          <div
                            key={notif.id}
                            onClick={async () => {
                              if (!notif.read || !notif.isRead) {
                                try {
                                  await firestore.updateDoc(
                                    firestore.doc(db, "notifications", String(notif.id)),
                                    {
                                      read: true,
                                      isRead: true,
                                    },
                                  );
                                } catch (err) {
                                  console.error("Failed to mark notification as read:", err);
                                }
                              }
                            }}
                            className={`p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-900/20 transition cursor-pointer flex gap-3 ${
                              !notif.read ? "bg-blue-500/[0.02] dark:bg-blue-500/[0.01]" : ""
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl h-9 w-9 shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-550 dark:text-slate-400`}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate pr-2">
                                  {notif.title}
                                </span>
                                <span className="text-[9px] text-slate-400 shrink-0 font-medium">
                                  {notif.time}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                                {notif.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        {t("لا توجد إشعارات جديدة", "No new notifications")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 4. PROFILE POPUP DROPDOWN */}
            <div className="relative animate-fade-in" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 p-1 sm:py-1 sm:pl-1 sm:pr-2.5 text-xs shadow-sm hover:border-slate-400 dark:hover:border-slate-700 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-green-900 to-green-950 text-xs font-black text-white shadow-sm">
                  {userProfile?.name?.slice(0, 2).toUpperCase() || "JP"}
                </div>
                <span className="hidden font-bold sm:inline text-slate-700 dark:text-slate-350">
                  {userProfile?.name || "Partner"}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:inline" />
              </button>

              {profileOpen && (
                <div
                  className={`fixed top-16 left-4 right-4 w-auto md:absolute md:top-auto md:translate-x-0 ${
                    isRtl ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
                  } mt-2 md:w-52 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 shadow-xl z-30`}
                >
                  <div className="border-b border-slate-100 dark:border-slate-850 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {userProfile?.name}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate mt-0.5">
                      {userProfile?.email}
                    </div>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-450 dark:hover:bg-slate-900 rounded-lg transition"
                    >
                      <User className="h-4 w-4" />
                      <span>{t("ملفي الشخصي", "My Profile")}</span>
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t("تسجيل الخروج", "Sign Out")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* WORKSPACE PAGE VIEW */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* GRACE PERIOD BANNER */}
            {isGracePeriod && (
              <div className="mb-6 bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl p-4 flex items-start sm:items-center gap-4 shadow-sm">
                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("تنبيه: انتهى اشتراكك!", "Warning: Your subscription has expired!")}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {t(
                      "يرجى تجديد اشتراكك خلال 24 ساعة لتجنب فقدان الوصول إلى ميزات المنصة.",
                      "Please renew your subscription within 24 hours to avoid losing access to your features."
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("subscription-plans")}
                  className="whitespace-nowrap px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  {t("تجديد الآن", "Renew Now")}
                </button>
              </div>
            )}

            {/* FREE TRIAL & SUBSCRIPTION BANNER */}
            {userProfile?.subscription?.status === 'trial' && (
              <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
                    <LucideIcons.Hourglass className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t("فترة تجريبية نشطة", "Free Trial Active")}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t(
                        `متبقي ${Math.max(0, Math.ceil(((userProfile.subscription.endDate || 0) - Date.now()) / (1000 * 60 * 60 * 24)))} يوم على انتهاء الفترة التجريبية`,
                        `${Math.max(0, Math.ceil(((userProfile.subscription.endDate || 0) - Date.now()) / (1000 * 60 * 60 * 24)))} Days Remaining until trial expires`
                      )}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('subscription-plans')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition"
                >
                  {t("الترقية للباقة الاحترافية", "Upgrade to Pro")}
                </button>
              </div>
            )}
            
            {userProfile?.subscription?.status === 'expired' && (
              <div className="mb-6 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg text-red-600 dark:text-red-400">
                    <LucideIcons.AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t("انتهت الفترة التجريبية", "Trial Expired")}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t("يرجى ترقية حسابك للاستمرار في استخدام المنصة", "Please upgrade your account to continue using the platform")}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('subscription-plans')}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition"
                >
                  {t("الترقية الآن", "Upgrade Now")}
                </button>
              </div>
            )}

            {renderSection()}
          </div>
        </main>
      </div>

      {/* Floating sales coach assistant widget */}
      <FloatingChatWidget />

      {/* Centered Global Loading Overlay */}
      <AnimatePresence>
        {globalSyncLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800">
              <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-350">
                {t("جاري التحديث...", "Updating...")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InstallPWAModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstall={handleActualInstall}
      />
    </div>
  );
}
