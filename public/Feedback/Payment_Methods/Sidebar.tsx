import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  BrainCircuit,
  Compass,
  Lightbulb,
  Calendar,
  PenTool,
  Video,
  Mic,
  Palette,
  Camera,
  Images,
  BarChart2,
  Search,
  TrendingUp,
  Bot,
  Dna,
  MessageSquare,
  Zap,
  Hand,
  Link,
  ShoppingBag,
  CreditCard,
  Settings2,
  ChevronDown,
  MonitorPlay,
  FileText,
  Cpu,
  Activity,
  Megaphone,
  Settings as SysSettings,
  Moon,
  Sun,
  Smartphone,
  PanelLeftClose,
  PanelRightClose,
  LogOut,
  Globe,
  DollarSign
} from "lucide-react";
import { IGLogoAnimated } from "./IGLogo";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useToast } from "../../context/ToastContext";
import { logout } from "../../services/auth";
import { LogoutConfirmModal } from "../common/LogoutConfirmModal";

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string;
    pill?: string;
  }[];
}

const getNavGroups = (t: any): NavGroup[] => [
  {
    id: "home",
    label: t("sidebar.home", "اليوم"),
    icon: <Sun size={16} />,
    path: "/",
  },
  {
    id: "strategy",
    label: t("sidebar.strategy", "الاستراتيجي AI"),
    icon: <Compass size={16} />,
    path: "/strategy",
  },
  // { id: 'intelligence', label: t('sidebar.intelligence', 'ذكاء الحساب'), icon: <BrainCircuit size={16} />, path: '/intelligence' },
  {
    id: "agents-center",
    label: t("sidebar.agentsCenter", "مركز الوكلاء"),
    icon: <Bot size={16} />,
    children: [
      {
        id: "agents",
        label: t("sidebar.agents", "وكلاء الذكاء الاصطناعي"),
        icon: <Bot size={16} />,
        path: "/agents",
      },
      {
        id: "execute",
        label: t("sidebar.execute", "نفذها لي"),
        icon: <Hand size={16} />,
        path: "/execute-for-me",
      },
      {
        id: "brandbrain",
        label: t("sidebar.brandbrain", "brain brain"),
        icon: <Dna size={16} />,
        path: "/brandbrain",
      },
    ],
  },
  {
    id: "content",
    label: t("sidebar.planningContent", "التخطيط والمحتوى"),
    icon: <FileText size={16} />,
    children: [
      {
        id: "ideas",
        label: t("sidebar.ideas", "الأفكار"),
        icon: <Lightbulb size={16} />,
        path: "/ideas",
      },
      {
        id: "calendar",
        label: t("sidebar.calendar", "التقويم"),
        icon: <Calendar size={16} />,
        path: "/calendar",
      },
    ],
  },
  {
    id: "studios",
    label: t("sidebar.productionStudios", "استوديوهات الإنتاج"),
    icon: <MonitorPlay size={16} />,
    children: [
      {
        id: "studio",
        label: t("sidebar.studio", "استوديو الإنشاء"),
        icon: <PenTool size={16} />,
        path: "/studio",
      },
      {
        id: "videostudio",
        label: t("sidebar.videostudio", "استوديو إنتاج الفيديو"),
        icon: <Video size={16} />,
        path: "/videostudio",
      },
      {
        id: "voicestudio",
        label: t("sidebar.voicestudio", "استوديو الصوت"),
        icon: <Mic size={16} />,
        path: "/voicestudio",
      },
      {
        id: "designstudio",
        label: t("sidebar.designstudio", "استوديو التصميم"),
        icon: <Palette size={16} />,
        path: "/designstudio",
      },
      {
        id: "camera",
        label: t("sidebar.camera", "الكاميرا"),
        icon: <Camera size={16} />,
        path: "/camera",
      },
      {
        id: "medialibrary",
        label: t("sidebar.medialibrary", "مكتبة الوسائط"),
        icon: <Images size={16} />,
        path: "/medialibrary",
      },
    ],
  },
  {
    id: "analytics-monitoring",
    label: t("sidebar.analyticsMonitoring", "التحليلات والرصد"),
    icon: <BarChart2 size={16} />,
    children: [
      {
        id: "analytics",
        label: t("sidebar.analytics", "التحليلات"),
        icon: <BarChart2 size={16} />,
        path: "/analytics",
      },
      {
        id: "competitors",
        label: t("sidebar.competitors", "المنافسون"),
        icon: <Search size={16} />,
        path: "/competitors",
      },
      {
        id: "trends",
        label: t("sidebar.trends", "الترندات والأخبار"),
        icon: <TrendingUp size={16} />,
        path: "/trends",
      },
    ],
  },
  {
    id: "inbox-group",
    label: t("sidebar.inboxGroup", "صندوق الوارد"),
    icon: <MessageSquare size={16} />,
    children: [
      {
        id: "inbox",
        label: t("sidebar.inbox", "الرسائل"),
        icon: <MessageSquare size={16} />,
        path: "/inbox",
      },
      {
        id: "automation",
        label: t("sidebar.automation", "الأتمتة"),
        icon: <Zap size={16} />,
        path: "/automation",
      },
    ],
  },
  {
    id: "monetization",
    label: t("sidebar.monetization", "المونيتايزيشن"),
    icon: <Megaphone size={16} />,
    children: [
      {
        id: "linkbio",
        label: t("sidebar.linkbio", "الرابط في البايو"),
        icon: <Link size={16} />,
        path: "/linkbio",
      },
      {
        id: "products",
        label: t("sidebar.products", "مكتبة المنتجات"),
        icon: <ShoppingBag size={16} />,
        path: "/products-library",
      },
    ],
  },
  {
    id: "account-settings",
    label: t("sidebar.accountSettings", "الحساب والإعدادات"),
    icon: <SysSettings size={16} />,
    children: [
      {
        id: "usage",
        label: t("sidebar.usage", "الاستخدام والكريدت"),
        icon: <CreditCard size={16} />,
        path: "/usage-credits",
      },
      {
        id: "settings",
        label: t("sidebar.settings", "الإعدادات والفواتير"),
        icon: <Settings2 size={16} />,
        path: "/settings",
      },
      {
        id: "payment",
        label: t("sidebar.paymentMethods", "وسائل الدفع"),
        icon: <CreditCard size={16} />,
        path: "/payment-methods",
      },
    ],
  },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    theme,
    toggleTheme,
    language,
    setLanguage,
    currency,
    setCurrency,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useApp();
  const { role } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleConfirmLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      showToast("تم تسجيل الخروج بنجاح. نلقاك قريباً!", "info");
      navigate("/login");
    } catch (error) {
      showToast("حدث خطأ أثناء تسجيل الخروج", "error");
    } finally {
      setLogoutLoading(false);
      setShowLogoutModal(false);
    }
  };
  const navGroups = getNavGroups(t);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    getNavGroups(t).forEach((group) => {
      if (group.children?.some((c) => c.path === location.pathname)) {
        initialState[group.id] = true;
      }
    });
    return initialState;
  });

  React.useEffect(() => {
    const groups = getNavGroups(t);
    groups.forEach((group) => {
      if (group.children?.some((c) => c.path === location.pathname)) {
        setOpenGroups((prev) =>
          prev[group.id] ? prev : { ...prev, [group.id]: true },
        );
      }
    });
  }, [location.pathname, t]);

  const toggleGroup = (id: string) => {
    if (!isSidebarCollapsed) {
      setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const renderItem = (item: any, isSubItem = false) => {
    const isActive = location.pathname === item.path;
    return (
      <motion.div
        key={item.id}
        onClick={() => {
          navigate(item.path!);
          if (window.innerWidth <= 768) setIsMobileSidebarOpen(false);
        }}
        whileHover={{ x: isSidebarCollapsed ? 0 : 4 }}
        title={isSidebarCollapsed ? item.label : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: isSubItem
            ? isSidebarCollapsed
              ? "8px 10px"
              : "8px 10px 8px 30px"
            : "9px 10px",
          cursor: "pointer",
          borderRadius: 9,
          position: "relative",
          color: isActive ? "var(--text-1)" : "var(--text-2)",
          background: isActive ? "var(--surface-2)" : "transparent",
          boxShadow: isActive
            ? "0 4px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "none",
          border: isActive
            ? "1px solid var(--border)"
            : "1px solid transparent",
          fontWeight: isActive ? 700 : 500,
          fontSize: 13,
          marginBottom: 4,
          transition: "all 0.2s ease-in-out",
          justifyContent: isSidebarCollapsed ? "center" : "flex-start",
        }}
        onMouseEnter={(e) => {
          if (!isActive)
            e.currentTarget.style.backgroundColor = "var(--surface-2)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              style={{
                position: "absolute",
                insetInlineStart: -1,
                top: "50%",
                translateY: "-50%",
                width: 3,
                height: 14,
                borderRadius: 3,
                background: "var(--ig-grad-45)",
                boxShadow: "0 0 8px rgba(46,204,113,0.4)",
              }}
            />
          )}
        </AnimatePresence>
        <div
          style={{
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isActive ? "#fff" : "var(--text-2)",
            background: isActive ? "var(--ig-grad-45)" : "transparent",
            borderRadius: 6,
            boxShadow: isActive ? "0 2px 6px rgba(46,204,113,0.3)" : "none",
            transition: "all 0.2s ease-in-out",
            flexShrink: 0,
          }}
        >
          {item.icon}
        </div>
        {!isSidebarCollapsed && item.label}
        {!isSidebarCollapsed && item.pill && (
          <span
            style={{
              marginInlineStart: "auto",
              background: "var(--surface-2)",
              padding: "2px 6px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {item.pill}
          </span>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${isMobileSidebarOpen ? "visible" : ""}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      <aside
        className={`sidebar-container ${isSidebarCollapsed ? "collapsed" : ""} ${isMobileSidebarOpen ? "mobile-open" : ""}`}
        style={{
          padding: isSidebarCollapsed ? "18px 8px" : "18px 14px",
          gap: 18,
        }}
      >
        <IGLogoAnimated collapsed={isSidebarCollapsed} />

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflowX: "hidden",
          }}
        >
          {navGroups.map((group) => {
            if (group.path) {
              return renderItem(group);
            }

            const isOpen = openGroups[group.id];
            const isGroupActive = group.children?.some(
              (c) => c.path === location.pathname,
            );

            return (
              <div
                key={group.id}
                style={{ marginBottom: 4 }}
                title={isSidebarCollapsed ? group.label : undefined}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarCollapsed
                      ? "center"
                      : "space-between",
                    padding: "9px 10px",
                    color: isGroupActive ? "var(--text-1)" : "var(--text-2)",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 9,
                    cursor: "pointer",
                  }}
                  onClick={() => toggleGroup(group.id)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--surface-2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {group.icon}
                    </div>
                    {!isSidebarCollapsed && group.label}
                  </div>
                  {!isSidebarCollapsed && (
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ cursor: "pointer", padding: 4, margin: -4 }}
                    >
                      <ChevronDown size={14} />
                    </motion.div>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {isOpen && !isSidebarCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ paddingTop: 2 }}>
                        {group.children?.map((child) =>
                          renderItem(child, true),
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: isSidebarCollapsed ? "center" : "stretch",
          }}
        >
          {/* Admin Role Switcher */}
          {(role === "admin" || role === "superadmin") && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/admin")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isSidebarCollapsed ? "center" : "center",
                gap: 8,
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-1)",
                fontSize: 12.5,
                fontWeight: 700,
                padding: 10,
                borderRadius: 10,
                cursor: "pointer",
                border: "1px solid var(--border)",
                fontFamily: "inherit",
                width: "100%",
                marginBottom: 8,
              }}
            >
              <SysSettings size={15} />
              {!isSidebarCollapsed && "لوحة التحكم"}
            </motion.button>
          )}

          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={toggleTheme}
            title={
              theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "space-between",
              background: "var(--surface-2)",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              {!isSidebarCollapsed && (
                <span>
                  {theme === "dark"
                    ? t("sidebar.lightMode")
                    : t("sidebar.darkMode")}
                </span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                {theme === "dark" ? "OFF" : "ON"}
              </span>
            )}
          </motion.div>

          {/* Mobile Language & Currency */}
          <div className="show-on-mobile" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'var(--surface-2)', borderRadius: 10, padding: '9px', fontSize: 12.5, cursor: 'pointer'
              }}
            >
              <Globe size={15} />
              <span className="en">{language?.toUpperCase() || 'AR'}</span>
            </motion.div>
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrency(currency === 'EGP' ? 'USD' : 'EGP')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'var(--surface-2)', borderRadius: 10, padding: '9px', fontSize: 12.5, cursor: 'pointer'
              }}
            >
              <DollarSign size={15} />
              <span className="en">{currency}</span>
            </motion.div>
          </div>

          {!isSidebarCollapsed && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "var(--ig-grad-45)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                padding: 10,
                borderRadius: 10,
                cursor: "pointer",
                border: "none",
                fontFamily: "inherit",
                width: "100%",
              }}
            >
              <Smartphone size={15} />
              {t("sidebar.installApp")}
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "transparent",
              color: "var(--text-2)",
              fontSize: 12.5,
              fontWeight: 700,
              padding: 10,
              borderRadius: 10,
              cursor: "pointer",
              border: "1px solid var(--border)",
              fontFamily: "inherit",
              width: "100%",
            }}
          >
            {isSidebarCollapsed ? (
              language === "ar" ? (
                <PanelLeftClose size={15} />
              ) : (
                <PanelRightClose size={15} />
              )
            ) : language === "ar" ? (
              <PanelRightClose size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
            {!isSidebarCollapsed &&
              (language === "ar" ? "طوي القائمة" : "Collapse")}
          </motion.button>

          {/* Logout Button */}
          <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowLogoutModal(true)}
            title="تسجيل الخروج"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              gap: 8,
              padding: "9px 12px",
              borderRadius: 10,
              cursor: "pointer",
              color: "#F45B69",
              background: "rgba(244, 91, 105, 0.08)",
              border: "1px solid rgba(244, 91, 105, 0.2)",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <LogOut size={15} />
            {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
          </motion.div>
        </div>
      </aside>

      {/* Logout Confirm Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={logoutLoading}
      />
    </>
  );
}
