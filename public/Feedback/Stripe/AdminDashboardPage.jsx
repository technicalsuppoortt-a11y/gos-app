import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "react-i18next";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../firebase";
import { libraryStorage } from "../../firebaseLibrary";
import { JOURNEY_STEPS } from "../../data/database";
import { TOOLS_24H } from "../../data/toolsData";
import { useApp } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import {
  saveAdminOpenAiKey,
  getAdminOpenAiKey,
} from "../../services/creditsService";
import AdminSales from "./AdminSales";
import AdminLibrary from "./AdminLibrary";
import SupportSection from "../SupportSection";
import MarketingTrackingSection from "../../components/Marketing/MarketingTrackingSection";
import AiSettingsPage from "./components/AiSettingsPage";
import AdminReviewsTab from "./components/AdminReviewsTab";
import AdminFailuresTab from "./components/AdminFailuresTab";
import AdminVideoTab from "./components/AdminVideoTab";
import AdminNicheRadarTab from "./components/AdminNicheRadarTab";
import AdminIdentityGeneratorTab from "./components/AdminIdentityGeneratorTab";
import AdminInfrastructureTab from "./components/AdminInfrastructureTab";
import AdminContentFactoryTab from "./components/AdminContentFactoryTab";
import AdminProposalsSniperTab from "./components/AdminProposalsSniperTab";
import AdminGlobalPlatformsTab from "./components/AdminGlobalPlatformsTab";
import AdminMarketingAutomationTab from "./components/AdminMarketingAutomationTab";
import AdminProfitCalculatorTab from "./components/AdminProfitCalculatorTab";
import AdminAiAssistantTab from "./components/AdminAiAssistantTab";
import AdminFinalCtaTab from "./components/AdminFinalCtaTab";
import AdminHeroSectionTab from "./components/AdminHeroSectionTab";
import Pagination from "../../components/common/Pagination";
import PhoneInput from "../../components/PhoneInput";
import PlatformExplanation from "../../components/common/PlatformExplanation";
import {
  DEFAULT_LEGAL_CONTENT,
  DEFAULT_FAQS,
} from "../../utils/defaultLegalContent";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  TrendingUp,
  Tag,
  Gift,
  CreditCard,
  Settings,
  Tv,
  Library,
  LogOut,
  Menu,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Package,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Download,
  UserPlus,
  Eye,
  EyeOff,
  Wallet,
  Smartphone,
  Edit,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Shield,
  User,
  Mail,
  Key,
  Calendar,
  Activity,
  Building,
  AlertTriangle,
  Globe,
  UploadCloud,
  Gem,
  Ban,
  Save,
  Loader2,
  Filter,
  PlusCircle,
  Plus,
  RefreshCw,
  DollarSign,
  List,
  Check,
  Star,
  Lock,
  Unlock,
  Layers,
  Zap,
  Target,
  Wand2,
  ShoppingBag,
  Briefcase,
  Cpu,
  BookOpen,
  Rocket,
  FileText,
  MessageCircle,
  Share2,
  Calculator,
  Image,
  Compass,
  Video,
  Send,
  Bot,
  ExternalLink,
  Power,
  Crosshair,
  Award,
  Mic,
  Bell,
  Copy,
  Laptop,
  Megaphone,
  Tablet,
  Palette,
  Layout,
  Database,
  LayoutTemplate,
  MessageSquare,
  Scale,
  ChevronUp,
  Workflow,
  HelpCircle,
  Webhook,
} from "lucide-react";
import "./Admin.css";
import AdminTemplateManager from "./components/AdminTemplateManager";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

const formatForQuill = (text) => {
  if (!text) return "";
  // Check if it already has basic HTML tags (from Quill)
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  // Otherwise, it's raw text, split by \n and wrap in <p>
  return text
    .split("\n")
    .map((line) => {
      // Preserve empty lines as Quill empty paragraphs
      return line ? `<p>${line}</p>` : `<p><br></p>`;
    })
    .join("");
};

export const THEME_PRESETS = [
  {
    id: "cyber",
    name_en: "Cyber Dark",
    name_ar: "السيبراني الداكن",
    accent: "#3B82F6",
    success: "#10B981",
    bg: "#080C14",
    sidebar: "#0D1220",
    text: "#FFFFFF",
    line: "#1e293b",
    footerBg: "#05080E",
    dots: ["#080C14", "#0D1220", "#3B82F6"],
  },
  {
    id: "teal",
    name_en: "Modern Teal",
    name_ar: "التايل العصري",
    accent: "#06B6D4",
    success: "#10B981",
    bg: "#0B132B",
    sidebar: "#1C2541",
    text: "#FFFFFF",
    line: "#1E3A8A",
    footerBg: "#080E1E",
    dots: ["#0B132B", "#1C2541", "#06B6D4"],
  },
  {
    id: "emerald",
    name_en: "Emerald Luxury",
    name_ar: "الزمردي الملكي",
    accent: "#10B981",
    success: "#34D399",
    bg: "#051C14",
    sidebar: "#0B2E21",
    text: "#F3F4F6",
    line: "#064E3B",
    footerBg: "#051A12",
    dots: ["#051C14", "#0B2E21", "#10B981"],
  },
  {
    id: "purple",
    name_en: "Midnight Purple",
    name_ar: "الأرجواني الفاخر",
    accent: "#8B5CF6",
    success: "#10B981",
    bg: "#0F0B1E",
    sidebar: "#18122B",
    text: "#FFFFFF",
    line: "#2E2342",
    footerBg: "#090614",
    dots: ["#0F0B1E", "#18122B", "#8B5CF6"],
  },
  {
    id: "sunset",
    name_en: "Sunset Crimson",
    name_ar: "الغروب الياقوتي",
    accent: "#F43F5E",
    success: "#F59E0B",
    bg: "#1A090D",
    sidebar: "#2A1017",
    text: "#FFF1F2",
    line: "#4C1D24",
    footerBg: "#120508",
    dots: ["#1A090D", "#2A1017", "#F43F5E"],
  },
];

export const detectMatchingThemePreset = (theme) => {
  if (!theme) return "cyber";
  if (theme.preset && THEME_PRESETS.some((p) => p.id === theme.preset)) {
    return theme.preset;
  }
  const norm = (c) => (c || "").trim().toLowerCase();
  const acc = norm(theme.accent);
  const side = norm(theme.sidebar);
  const bg = norm(theme.bg);

  if (!acc && !side && !bg) return "cyber";

  const matched = THEME_PRESETS.find(
    (p) =>
      norm(p.accent) === acc && (norm(p.sidebar) === side || norm(p.bg) === bg),
  );
  if (matched) return matched.id;

  const accentMatched = THEME_PRESETS.find((p) => norm(p.accent) === acc);
  if (accentMatched) return accentMatched.id;

  return "custom";
};

const getLegalValue = (dbValue, defaultValue, englishDefault = null) => {
  if (!dbValue) return formatForQuill(defaultValue);

  // Strip HTML tags and common HTML spaces to reliably detect if the editor is actually empty
  const textOnly = dbValue
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, "")
    .trim();

  if (textOnly === "") {
    return formatForQuill(defaultValue);
  }

  // Fix for corrupted DB state: If the saved Arabic field accidentally contains the English default text, revert to Arabic default
  if (englishDefault) {
    const englishTextOnly = englishDefault
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, "")
      .trim();
    if (textOnly === englishTextOnly) {
      return formatForQuill(defaultValue);
    }
  }

  return formatForQuill(dbValue);
};

// Counter Component that displays actual value directly without count animation
function AnimatedCounter({ value }) {
  return <span>{value}</span>;
}

// Vector Icon Mapping Helper for Tools & Features (Replaces Emojis)
function getToolVectorIcon(item, size = 18) {
  if (!item) return <Layers size={size} style={{ color: "var(--accent)" }} />;

  const id = (item.id || "").toLowerCase();

  // Specific Unique Vector Icons for Every Tool
  switch (id) {
    case "onboarding":
      return <Rocket size={size} style={{ color: "#3b82f6" }} />;
    case "analysis-identity":
      return <Target size={size} style={{ color: "#06b6d4" }} />;
    case "website-construction":
      return <Globe size={size} style={{ color: "#3b82f6" }} />;
    case "landing-page-content":
      return <FileText size={size} style={{ color: "#8b5cf6" }} />;
    case "legal-pages":
      return <Scale size={size} style={{ color: "#f59e0b" }} />;
    case "social-integration":
      return <Share2 size={size} style={{ color: "#ec4899" }} />;
    case "email-setup":
      return <Mail size={size} style={{ color: "#10b981" }} />;
    case "product-source":
      return <Package size={size} style={{ color: "#f97316" }} />;
    case "profit-calculator":
      return <Calculator size={size} style={{ color: "#10b981" }} />;
    case "social-presence":
      return <MessageCircle size={size} style={{ color: "#06b6d4" }} />;
    case "content-factory":
      return <Image size={size} style={{ color: "#a855f7" }} />;
    case "marketing-plan":
      return <Compass size={size} style={{ color: "#3b82f6" }} />;
    case "ad-creative":
      return <Video size={size} style={{ color: "#f43f5e" }} />;
    case "campaign-launch":
      return <Send size={size} style={{ color: "#10b981" }} />;
    case "smart-ai-assistant":
      return <Bot size={size} style={{ color: "#6366f1" }} />;
    case "external-tools":
      return <ExternalLink size={size} style={{ color: "#64748b" }} />;

    case "brand-library":
      return <Library size={size} style={{ color: "#3b82f6" }} />;
    case "smart-notebook":
      return <BookOpen size={size} style={{ color: "#a855f7" }} />;
    default:
      break;
  }

  // Fallback Keyword Matches
  if (id.includes("niche") || id.includes("target"))
    return <Target size={size} style={{ color: "#06b6d4" }} />;
  if (
    id.includes("product") ||
    id.includes("source") ||
    id.includes("supplier")
  )
    return <Package size={size} style={{ color: "#f97316" }} />;
  if (id.includes("store") || id.includes("shop") || id.includes("cart"))
    return <ShoppingBag size={size} style={{ color: "#ec4899" }} />;
  if (id.includes("ad") || id.includes("creative") || id.includes("copy"))
    return <Sparkles size={size} style={{ color: "#f59e0b" }} />;
  if (id.includes("calc") || id.includes("profit") || id.includes("price"))
    return <Calculator size={size} style={{ color: "#10b981" }} />;
  if (id.includes("ai") || id.includes("bot"))
    return <Bot size={size} style={{ color: "#6366f1" }} />;

  return <Layers size={size} style={{ color: "var(--accent)" }} />;
}

// Custom Glassmorphic Select Component
function CustomSelect({ options, value, onChange, label, badge, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="ad-custom-select-wrapper" ref={containerRef}>
      {label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label className="ad-custom-select-label" style={{ marginBottom: 0 }}>
            {label}
          </label>
          {badge && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: "800",
                color:
                  typeof badge === "object"
                    ? badge.color || "#10B981"
                    : "#10B981",
              }}
            >
              {typeof badge === "object" ? badge.text : badge}
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        className={`ad-custom-select-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            overflow: "hidden",
          }}
        >
          {selectedOption?.icon ? (
            <selectedOption.icon
              size={16}
              style={{ color: "var(--accent)", flexShrink: 0 }}
            />
          ) : Icon ? (
            <Icon size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          ) : null}
          <span className="ad-custom-select-value">
            {selectedOption ? selectedOption.label : ""}
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            color: isOpen ? "var(--accent)" : "var(--text2)",
            flexShrink: 0,
          }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ad-custom-select-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 6, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {options.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = value === option.value;
              return (
                <div
                  key={option.value}
                  className={`ad-custom-select-option ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {OptionIcon && (
                      <OptionIcon
                        size={15}
                        style={{
                          color: isSelected ? "var(--accent)" : "var(--text3)",
                          transition: "color 0.2s",
                        }}
                      />
                    )}
                    <span>{option.label}</span>
                  </div>
                  {isSelected && (
                    <CheckCircle2
                      size={14}
                      style={{ color: "var(--accent)" }}
                    />
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();
  const { adminUserData: userData, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUserDetails, setViewingUserDetails] = useState(null);
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("admin-active-tab") || "users",
  ); // Keep active tab on reload

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem("admin-active-tab", tabId);
    if (isMobile) setIsMobileMenuOpen(false);
  };

  // User Management Advanced Filters & Search
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Custom Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("admin-sidebar-collapsed") === "true",
  );

  const [unreadSupportMsgs, setUnreadSupportMsgs] = useState([]);
  const [isSupportDropdownOpen, setIsSupportDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const LANGUAGES = [
    { code: "ar", label: "العربية", fullLabel: "العربية (Arabic)", flag: "🇸🇦" },
    {
      code: "ar-GCC",
      label: "الخليجية",
      fullLabel: "الخليجية (Khaleeji)",
      flag: "🇦🇪",
    },
    {
      code: "ar-EG",
      label: "المصرية",
      fullLabel: "المصرية (Egyptian)",
      flag: "🇪🇬",
    },
    { code: "en", label: "English", fullLabel: "English", flag: "🇬🇧" },
  ];
  const currentLangObj =
    LANGUAGES.find((l) => l.code === state.language) || LANGUAGES[0];

  useEffect(() => {
    if (!userData?.uid) return;
    // Listen to unread support messages for admin
    const q = query(
      collection(db, "support_chats"),
      where("adminId", "==", userData?.uid),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.read && data.authorId !== (userData?.uid || "999")) {
          msgs.push({ id: doc.id, ...data });
        }
      });
      // Sort by newest first
      msgs.sort((a, b) => b.createdAt - a.createdAt);
      setUnreadSupportMsgs(msgs);
    });
    return () => unsubscribe();
  }, [userData]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [ownerNameForm, setOwnerNameForm] = useState("");
  const [brandNameForm, setBrandNameForm] = useState("");
  const [brandUrlForm, setBrandUrlForm] = useState("");
  const [masterApiKey, setMasterApiKey] = useState("");
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [renewPlanUser, setRenewPlanUser] = useState(null);
  const [renewPlanId, setRenewPlanId] = useState("free");
  const [isRenewing, setIsRenewing] = useState(false);
  const [accentColor, setAccentColor] = useState("#3B82F6");
  const [successColor, setSuccessColor] = useState("#10B981");
  const [bgColor, setBgColor] = useState("#080C14");
  const [sidebarColor, setSidebarColor] = useState("#0D1220");
  const [fontFamily, setFontFamily] = useState("Cairo");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [lineColor, setLineColor] = useState("#1e293b");
  const [footerBgColor, setFooterBgColor] = useState("#05080E");
  const [activeThemePreset, setActiveThemePreset] = useState("cyber");
  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    tiktok: "",
  });
  const [defaultLanguage, setDefaultLanguage] = useState("ar");
  const [landingTemplate, setLandingTemplate] = useState("default");
  const [logoDisplayMode, setLogoDisplayMode] = useState("both");
  const [showWhatsappLoginBtn, setShowWhatsappLoginBtn] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null); // For creating/editing users
  const [photoPreview, setPhotoPreview] = useState(null);

  // Legal & FAQs State
  const [legalTabLang, setLegalTabLang] = useState("ar"); // "ar" or "en"
  const [legalActiveTab, setLegalActiveTab] = useState("terms"); // "terms", "privacy", "security", "faqs"
  const [termsAr, setTermsAr] = useState("");
  const [termsEn, setTermsEn] = useState("");
  const [privacyAr, setPrivacyAr] = useState("");
  const [privacyEn, setPrivacyEn] = useState("");
  const [securityAr, setSecurityAr] = useState("");
  const [securityEn, setSecurityEn] = useState("");
  const [faqs, setFaqs] = useState([]); // [{ id, q_ar, q_en, a_ar, a_en }]
  const [brandFailures, setBrandFailures] = useState([]);
  const [showFailuresSection, setShowFailuresSection] = useState(true);
  const [videoConfig, setVideoConfig] = useState(null);
  const [showVideoSection, setShowVideoSection] = useState(true);
  const [nicheRadar, setNicheRadar] = useState(null);
  const [identityGenerator, setIdentityGenerator] = useState(null);
  const [infrastructureBuilder, setInfrastructureBuilder] = useState(null);
  const [contentFactory, setContentFactory] = useState(null);
  const [proposalsSniper, setProposalsSniper] = useState(null);
  const [globalPlatformsRadar, setGlobalPlatformsRadar] = useState(null);
  const [marketingAutomationEngine, setMarketingAutomationEngine] =
    useState(null);
  const [profitCalculatorSection, setProfitCalculatorSection] = useState(null);
  const [aiAssistantSimulator, setAiAssistantSimulator] = useState(null);
  const [finalCtaSection, setFinalCtaSection] = useState(null);
  const [heroSection, setHeroSection] = useState(null);
  const brandSubTabsScrollRef = useRef(null);
  const themePresetsScrollRef = useRef(null);

  useEffect(() => {
    if (profileImage) {
      const url = URL.createObjectURL(profileImage);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (editingUser?.photoURL) {
      setPhotoPreview(editingUser.photoURL);
    } else {
      setPhotoPreview(null);
    }
  }, [profileImage, editingUser]);

  const handleRemovePhoto = () => {
    setProfileImage(null);
    setPhotoPreview(null);
    const fileInput = document.getElementById("userProfileImg");
    if (fileInput) fileInput.value = "";
  };
  const [adminProfileImage, setAdminProfileImage] = useState(null); // For admin's own profile
  const [phoneNumberForm, setPhoneNumberForm] = useState("");
  const [phoneKeyForm, setPhoneKeyForm] = useState("+20");
  const [whatsappNumberForm, setWhatsappNumberForm] = useState("");
  const [whatsappKeyForm, setWhatsappKeyForm] = useState("+20");
  const [showWhatsappBtn, setShowWhatsappBtn] = useState(true);

  const [iframeKey, setIframeKey] = useState(0);

  // Only apply theme colors to document.documentElement from saved profile settings
  useEffect(() => {
    const isLightMode =
      document.documentElement.classList.contains("light-mode");
    if (userData?.themeConfig) {
      const theme = userData.themeConfig;
      const root = document.documentElement;
      if (theme.accent) root.style.setProperty("--accent", theme.accent);
      if (theme.success) root.style.setProperty("--green", theme.success);
      if (theme.fontFamily || theme.font) {
        const f = theme.fontFamily || theme.font;
        root.style.setProperty("--font-family", `'${f}', sans-serif`);
        root.style.setProperty("--font", `'${f}', sans-serif`);
        root.style.fontFamily = `'${f}', sans-serif`;
        if (document.body)
          document.body.style.fontFamily = `'${f}', sans-serif`;
      }
      if (!isLightMode) {
        if (theme.bg) root.style.setProperty("--bg", theme.bg);
        if (theme.sidebar) {
          root.style.setProperty("--bg2", theme.sidebar);
          root.style.setProperty("--card-bg", theme.sidebar);
          root.style.setProperty("--surface", theme.sidebar);
          root.style.setProperty("--panel", theme.sidebar);
          root.style.setProperty("--sidebar-bg", theme.sidebar);
        }
        if (theme.text) root.style.setProperty("--text", theme.text);
        if (theme.line) root.style.setProperty("--line", theme.line);
        if (theme.footerBg)
          root.style.setProperty("--footer-bg", theme.footerBg);
      }
    }
  }, [userData?.themeConfig]);

  // Debounced auto-refresh for the iframe to fully update subcomponents after color changes stop
  useEffect(() => {
    const handler = setTimeout(() => {
      setIframeKey((prev) => prev + 1);
    }, 1200);
    return () => clearTimeout(handler);
  }, [
    accentColor,
    successColor,
    bgColor,
    sidebarColor,
    fontFamily,
    textColor,
    lineColor,
    footerBgColor,
  ]);

  // Real-time instant injector for live colors in the iframe without waiting for refresh
  useEffect(() => {
    const iframe = document.getElementById("preview-iframe");
    if (iframe && iframe.contentWindow) {
      try {
        const root = iframe.contentWindow.document.documentElement;
        if (root) {
          root.style.setProperty("--accent", accentColor);
          root.style.setProperty("--green", successColor);
          root.style.setProperty("--bg", bgColor);
          root.style.setProperty("--bg2", sidebarColor);
          root.style.setProperty("--font", fontFamily);
          root.style.setProperty("--text", textColor);
          root.style.setProperty("--line", lineColor);
          root.style.setProperty("--footer-bg", footerBgColor);
        }
      } catch (err) {
        // Safe cross-origin check
      }
    }
  }, [
    accentColor,
    successColor,
    bgColor,
    sidebarColor,
    fontFamily,
    textColor,
    lineColor,
    footerBgColor,
  ]);

  const handleIframeLoad = () => {
    const iframe = document.getElementById("preview-iframe");
    if (iframe && iframe.contentWindow) {
      try {
        const root = iframe.contentWindow.document.documentElement;
        if (root) {
          root.style.setProperty("--accent", accentColor);
          root.style.setProperty("--green", successColor);
          root.style.setProperty("--bg", bgColor);
          root.style.setProperty("--bg2", sidebarColor);
          root.style.setProperty("--font", fontFamily);
          root.style.setProperty("--text", textColor);
          root.style.setProperty("--line", lineColor);
        }
      } catch (err) {
        console.error("Failed to inject iframe style:", err);
      }
    }
  };

  const confirm = useConfirm();

  // Plans management
  const [plans, setPlans] = useState([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planName, setPlanName] = useState("");
  const [planNameEn, setPlanNameEn] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planCredits, setPlanCredits] = useState("20");
  const [planCurrency, setPlanCurrency] = useState("EGP");
  const [planFeatures, setPlanFeatures] = useState("");
  const [planFeaturesEn, setPlanFeaturesEn] = useState("");
  const [planDisplayOnWebsite, setPlanDisplayOnWebsite] = useState(true);
  const [planBillingCycle, setPlanBillingCycle] = useState("monthly");
  const [planBadgeAr, setPlanBadgeAr] = useState("");
  const [planBadgeEn, setPlanBadgeEn] = useState("");
  const [planCtaAr, setPlanCtaAr] = useState("");
  const [planCtaEn, setPlanCtaEn] = useState("");
  const [planAllowedTools, setPlanAllowedTools] = useState([]);

  // Plans Filtering, Pagination & Modal States
  const [plansSearchQuery, setPlansSearchQuery] = useState("");
  const [plansCurrencyFilter, setPlansCurrencyFilter] = useState("all");
  const [plansCurrentPage, setPlansCurrentPage] = useState(1);
  const [viewingPlanFeatures, setViewingPlanFeatures] = useState(null);
  const [dynamicFeaturesAr, setDynamicFeaturesAr] = useState([""]);
  const [dynamicFeaturesEn, setDynamicFeaturesEn] = useState([""]);

  // Reset page when filters change
  useEffect(() => {
    setPlansCurrentPage(1);
  }, [plansSearchQuery, plansCurrencyFilter]);

  // Prevent multiple state initializations
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const fetchAdminKey = async () => {
      const key = await getAdminOpenAiKey();
      if (key) setMasterApiKey(key);
    };
    fetchAdminKey();
  }, []);

  // Subscription management for sub-users
  const [subType, setSubType] = useState("monthly");
  const [subDays, setSubDays] = useState(30);
  const [userPlanId, setUserPlanId] = useState("free");

  // Free Trial Settings
  const [enableFreeTrial, setEnableFreeTrial] = useState(true);
  const [freeTrialDays, setFreeTrialDays] = useState(7);
  const [freeTrialCredits, setFreeTrialCredits] = useState(20);
  const [trialPlanNameAr, setTrialPlanNameAr] = useState("");
  const [trialPlanNameEn, setTrialPlanNameEn] = useState("");
  const [trialBadgeAr, setTrialBadgeAr] = useState("");
  const [trialBadgeEn, setTrialBadgeEn] = useState("");
  const [trialCtaAr, setTrialCtaAr] = useState("");
  const [trialCtaEn, setTrialCtaEn] = useState("");
  const [trialFeaturesAr, setTrialFeaturesAr] = useState([""]);
  const [trialFeaturesEn, setTrialFeaturesEn] = useState([""]);
  const [allowedTrialTools, setAllowedTrialTools] = useState([]);

  // ── FIX: REFS TO AVOID STALE CLOSURES DURING FIRESTORE WRITES ──
  const allowedTrialToolsRef = useRef([]);
  useEffect(() => {
    allowedTrialToolsRef.current = allowedTrialTools;
  }, [allowedTrialTools]);

  const planAllowedToolsRef = useRef([]);
  useEffect(() => {
    planAllowedToolsRef.current = planAllowedTools;
  }, [planAllowedTools]);
  // ───────────────────────────────────────────────────────────────
  const [autoIncludeNewTools, setAutoIncludeNewTools] = useState(true);
  const [isTrialPreviewModalOpen, setIsTrialPreviewModalOpen] = useState(false);
  const [previewModalTab, setPreviewModalTab] = useState("all");
  const [expandedTrialGroups, setExpandedTrialGroups] = useState({
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  // Payment Methods Standardized State & DEFAULTS
  const [paymentMethods, setPaymentMethods] = useState({
    manualMethods: [
      { id: "def-1", name: "Vodafone Cash / فودافون كاش", value: "" },
      { id: "def-2", name: "InstaPay / انستا باي", value: "" },
      { id: "def-3", name: "Bank Transfer / تحويل بنكي", value: "" },
    ],
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);

  const [newPayName, setNewPayName] = useState("");
  const [newPayValue, setNewPayValue] = useState("");
  const [editingPayId, setEditingPayId] = useState(null);
  const [editingPayName, setEditingPayName] = useState("");
  const [editingPayValue, setEditingPayValue] = useState("");

  // Tenant Payment Methods Firestore Sync & OAuth Callback
  useEffect(() => {
    const fetchTenantPaymentMethods = async () => {
      const uid = userData?.uid || state?.user?.uid;
      if (!uid) return;

      const DEFAULTS = {
        manualMethods: [
          { id: "def-1", name: "Vodafone Cash / فودافون كاش", value: "" },
          { id: "def-2", name: "InstaPay / انستا باي", value: "" },
          { id: "def-3", name: "Bank Transfer / تحويل بنكي", value: "" },
        ],
      };

      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);

        const searchParams = new URLSearchParams(window.location.search);

        let loadedPM = DEFAULTS;

        if (snap.exists() && snap.data()?.paymentMethods) {
          const pmData = snap.data().paymentMethods;
          loadedPM = {
            stripe: { ...DEFAULTS.stripe, ...(pmData.stripe || {}) },
            manualMethods: pmData.manualMethods || DEFAULTS.manualMethods,
          };
        }

        setPaymentMethods(loadedPM);
      } catch (err) {
        console.error("Error fetching tenant payment methods:", err);
      }
    };

    fetchTenantPaymentMethods();
  }, [userData, state?.user]);

  const handleSavePaymentMethods = async () => {
    const uid = userData?.uid || state?.user?.uid;
    if (!uid) return;

    setPaymentSaving(true);
    setPaymentSaved(false);

    try {
      const fullPaymentMethods = {
        stripe: {
          enabled: paymentMethods.stripe?.enabled ?? false,
          publishableKey:
            paymentMethods.stripe?.publishableKey || stripePublishableKey || "",
          secretKey: paymentMethods.stripe?.secretKey || stripeSecretKey || "",
          paymentLink: paymentMethods.stripe?.paymentLink || "",
          paymentLinkAnnual: paymentMethods.stripe?.paymentLinkAnnual || "",
          // webhookSecret is optional — empty string is valid (unverified mode)
          webhookSecret: (
            paymentMethods.stripe?.webhookSecret ??
            stripeWebhookSecret ??
            ""
          ).trim(),
        },
        manualMethods: paymentMethods.manualMethods || [],
      };

      const publicPaymentMethods = {
        stripe: {
          enabled: paymentMethods.stripe?.enabled ?? false,
          publishableKey:
            paymentMethods.stripe?.publishableKey || stripePublishableKey || "",
          paymentLink: paymentMethods.stripe?.paymentLink || "",
          paymentLinkAnnual: paymentMethods.stripe?.paymentLinkAnnual || "",
        },
        manualMethods: paymentMethods.manualMethods || [],
      };

      // 1. Update tenants document
      const tenantRef = doc(db, "tenants", uid);
      await setDoc(
        tenantRef,
        { paymentMethods: fullPaymentMethods, updatedAt: serverTimestamp() },
        { merge: true },
      );

      // 2. Update users document (with secrets)
      const userRef = doc(db, "users", uid);
      await setDoc(
        userRef,
        { paymentMethods: fullPaymentMethods },
        { merge: true },
      );

      // 3. Update brands document (without secrets)
      if (brandNameForm) {
        const brandRef = doc(db, "brands", brandNameForm);
        await setDoc(
          brandRef,
          { paymentMethods: publicPaymentMethods, adminId: uid },
          { merge: true },
        );
      }

      // 4. Back-fill adminId on all managed users so they can resolve payment data directly
      try {
        const managedUsersQ = query(
          collection(db, "users"),
          where("createdBy", "==", uid),
        );
        const managedSnap = await getDocs(managedUsersQ);
        const backfillPromises = managedSnap.docs
          .filter((d) => !d.data().adminId)
          .map((d) =>
            setDoc(doc(db, "users", d.id), { adminId: uid }, { merge: true }),
          );
        if (backfillPromises.length > 0) {
          await Promise.all(backfillPromises);
          console.log(
            `[Admin] Back-filled adminId for ${backfillPromises.length} users.`,
          );
        }
      } catch (err) {
        // Non-critical — don't block the save
        console.warn(
          "[Admin] Could not back-fill adminId on managed users:",
          err.message,
        );
      }

      setPaymentSaved(true);
      toast(
        state.language === "en"
          ? "Payment settings saved successfully!"
          : "تم حفظ إعدادات طرق الدفع بنجاح!",
        "success",
      );
      setTimeout(() => setPaymentSaved(false), 3000);
    } catch (err) {
      console.error("Error saving payment methods:", err);
      toast(
        state.language === "en"
          ? "Failed to save settings"
          : "فشل حفظ الإعدادات",
        "error",
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  const [isSyncingStripe, setIsSyncingStripe] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentToApprove, setPaymentToApprove] = useState(null);
  const [paymentToReject, setPaymentToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState("");
  const [selectedDurationForPayment, setSelectedDurationForPayment] =
    useState(30);
  const [isStripeSettingsModalOpen, setIsStripeSettingsModalOpen] =
    useState(false);

  // Payment Methods UI/UX Upgrade State
  const [paymentsSubTab, setPaymentsSubTab] = useState("transactions"); // 'transactions' | 'wallets' | 'gateways'
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const [transactionsCurrentPage, setTransactionsCurrentPage] = useState(1);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);
  const [showStripeKey, setShowStripeKey] = useState(false);
  const [stripeModalTab, setStripeModalTab] = useState("settings"); // 'settings' | 'test'
  const [isTestingStripe, setIsTestingStripe] = useState(false);
  const [stripeTestSuccess, setStripeTestSuccess] = useState(false);
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");

  // Brand Settings Modernized UI States
  const [brandSubTab, setBrandSubTab] = useState("personal"); // 'personal' | 'colors' | 'social' | 'templates' | 'preview'
  const [brandPreviewDevice, setBrandPreviewDevice] = useState("desktop"); // 'desktop' | 'tablet' | 'mobile'
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState(null);
  const [isLiveDemoModalOpen, setIsLiveDemoModalOpen] = useState(false);
  const [previewDemoTemplate, setPreviewDemoTemplate] = useState("default");

  // JSON Export for Brand Settings
  const handleExportBrandSettingsJSON = () => {
    const settingsData = {
      ownerName: ownerNameForm,
      brandName: brandNameForm,
      phoneNumber: `${phoneKeyForm}${phoneNumberForm}`,
      whatsappNumber: `${whatsappKeyForm}${whatsappNumberForm}`,
      defaultLanguage,
      logoDisplayMode,
      showWhatsappLoginBtn,
      showWhatsappBtn,
      themeConfig: {
        accent: accentColor,
        success: successColor,
        bg: bgColor,
        sidebar: sidebarColor,
        fontFamily,
        text: textColor,
        line: lineColor,
        footerBg: footerBgColor,
      },
      socialLinks,
      landingTemplate,
    };

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(settingsData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `Brand_Settings_${brandNameForm || "Config"}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    toast(
      state.language === "en"
        ? "Brand Settings exported to JSON successfully!"
        : "تم تصدير إعدادات البراند إلى ملف JSON بنجاح!",
      "success",
    );
  };

  // JSON Import for Brand Settings
  const handleImportBrandSettingsJSON = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (imported.ownerName) setOwnerNameForm(imported.ownerName);
          if (imported.brandName) setBrandNameForm(imported.brandName);
          if (imported.defaultLanguage)
            setDefaultLanguage(imported.defaultLanguage);
          if (imported.logoDisplayMode)
            setLogoDisplayMode(imported.logoDisplayMode);
          if (imported.showWhatsappLoginBtn !== undefined)
            setShowWhatsappLoginBtn(imported.showWhatsappLoginBtn);
          if (imported.showWhatsappBtn !== undefined)
            setShowWhatsappBtn(imported.showWhatsappBtn);
          if (imported.themeConfig) {
            if (imported.themeConfig.accent)
              setAccentColor(imported.themeConfig.accent);
            if (imported.themeConfig.success)
              setSuccessColor(imported.themeConfig.success);
            if (imported.themeConfig.bg) setBgColor(imported.themeConfig.bg);
            if (imported.themeConfig.sidebar)
              setSidebarColor(imported.themeConfig.sidebar);
            if (imported.themeConfig.fontFamily)
              setFontFamily(imported.themeConfig.fontFamily);
            if (imported.themeConfig.text)
              setTextColor(imported.themeConfig.text);
            if (imported.themeConfig.line)
              setLineColor(imported.themeConfig.line);
            if (imported.themeConfig.footerBg)
              setFooterBgColor(imported.themeConfig.footerBg);
            setActiveThemePreset("custom");
          }
          if (imported.socialLinks) setSocialLinks(imported.socialLinks);
          if (imported.landingTemplate)
            setLandingTemplate(imported.landingTemplate);
          toast(
            state.language === "en"
              ? "Brand settings imported from JSON! Click Save to apply changes."
              : "تم استيراد الإعدادات من ملف JSON! اضغط حفظ لتطبيق التغييرات.",
            "success",
          );
        } catch (err) {
          toast(
            state.language === "en"
              ? "Invalid JSON settings file."
              : "ملف الإعدادات غير صالح.",
            "error",
          );
        }
      };
    }
  };

  // Reset Brand Settings to Defaults (Cyber Dark) & Auto-Save to Database
  const handleResetToDefaults = async () => {
    const confirmed = await confirm({
      title:
        state.language === "en"
          ? "Reset Brand Colors?"
          : "إعادة ضبط ألوان البراند",
      message:
        state.language === "en"
          ? "Are you sure you want to reset all brand theme colors to the default values (Cyber Dark)? This will automatically save the default settings."
          : "هل أنت متأكد من إرجاع جميع ألوان البراند إلى القيم الافتراضية (السيبراني الداكن)؟ سيتم حفظ كافة الإعدادات الافتراضية وتطبيقها في وقتها.",
      confirmText:
        state.language === "en" ? "Confirm" : "تأكيد واستعادة الافتراضي",
      cancelText: state.language === "en" ? "Cancel" : "إلغاء",
      type: "warning",
    });

    if (confirmed) {
      const defaultAccent = "#3B82F6";
      const defaultSuccess = "#10B981";
      const defaultBg = "#080C14";
      const defaultSidebar = "#0D1220";
      const defaultFontFamily = "Cairo";
      const defaultText = "#FFFFFF";
      const defaultLine = "#1e293b";
      const defaultFooterBg = "#05080E";

      setAccentColor(defaultAccent);
      setSuccessColor(defaultSuccess);
      setBgColor(defaultBg);
      setSidebarColor(defaultSidebar);
      setFontFamily(defaultFontFamily);
      setTextColor(defaultText);
      setLineColor(defaultLine);
      setFooterBgColor(defaultFooterBg);
      setActiveThemePreset("cyber");
      setLogoDisplayMode("both");
      setShowWhatsappLoginBtn(true);
      setDefaultLanguage("ar");
      setLandingTemplate("default");

      // Instantly apply default styles to document.documentElement
      const root = document.documentElement;
      root.style.setProperty("--accent", defaultAccent);
      root.style.setProperty("--green", defaultSuccess);
      root.style.setProperty(
        "--font-family",
        `"${defaultFontFamily}", sans-serif`,
      );
      root.style.setProperty("--font", `"${defaultFontFamily}", sans-serif`);
      root.style.fontFamily = `"${defaultFontFamily}", sans-serif`;
      root.style.setProperty("--bg", defaultBg);
      root.style.setProperty("--bg2", defaultSidebar);
      root.style.setProperty("--text", defaultText);
      root.style.setProperty("--line", defaultLine);
      root.style.setProperty("--footer-bg", defaultFooterBg);

      setIframeKey((prev) => prev + 1);

      // Auto-save default settings to Database
      try {
        if (userData?.uid) {
          const defaultThemeConfig = {
            accent: defaultAccent,
            success: defaultSuccess,
            bg: defaultBg,
            sidebar: defaultSidebar,
            fontFamily: defaultFontFamily,
            text: defaultText,
            line: defaultLine,
            footerBg: defaultFooterBg,
          };

          // 1. User doc
          await setDoc(
            doc(db, "users", userData.uid),
            {
              themeConfig: defaultThemeConfig,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );

          // 2. Tenant doc
          await setDoc(
            doc(db, "tenants", userData.uid),
            {
              themeConfig: defaultThemeConfig,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );

          // 3. Brand doc by Brand Name
          const currentBrandName = (
            brandNameForm ||
            userData?.brandName ||
            ""
          ).trim();
          if (currentBrandName) {
            await setDoc(
              doc(db, "brands", currentBrandName),
              {
                themeConfig: defaultThemeConfig,
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }

          // 4. Brand doc by Brand URL / Domain
          if (userData?.brandUrl) {
            await setDoc(
              doc(db, "brands", userData.brandUrl.trim().toLowerCase()),
              {
                themeConfig: defaultThemeConfig,
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
          if (brandUrlForm?.trim()) {
            await setDoc(
              doc(db, "brands", brandUrlForm.trim().toLowerCase()),
              {
                themeConfig: defaultThemeConfig,
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          }
        }

        setLastSavedTimestamp(new Date());
        toast(
          state.language === "en"
            ? "Reset and automatically saved Cyber Dark defaults to database!"
            : "تمت استعادة ثيم السيبراني الداكن وحفظ الإعدادات الافتراضية تلقائياً بنجاح!",
          "success",
        );
      } catch (err) {
        console.error("Error auto-saving defaults:", err);
        toast("حدث خطأ أثناء الحفظ التلقائي", "error");
      }
    }
  };

  // Keyboard Shortcut: Ctrl+S / Cmd+S to Save Brand Settings
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (activeTab === "settings") {
          handleUpdateAdminProfile();
          setLastSavedTimestamp(new Date());
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  // Helper function: Copy wallet number with toast feedback
  const handleCopyWallet = (number) => {
    if (!number) return;
    navigator.clipboard.writeText(number);
    toast(
      state.language === "en"
        ? `Copied ${number} to clipboard!`
        : `تم نسخ الرقم ${number} بنجاح!`,
      "success",
    );
  };

  // Helper function: Export Payments CSV
  const handleExportPaymentsCSV = () => {
    const filtered = pendingPayments.filter((p) => {
      const q = paymentSearchQuery.toLowerCase();
      const matchSearch =
        !paymentSearchQuery ||
        (p.userName || "").toLowerCase().includes(q) ||
        (p.userEmail || "").toLowerCase().includes(q) ||
        (p.userPhone || "").toLowerCase().includes(q);
      const matchStatus =
        paymentStatusFilter === "all" || p.status === paymentStatusFilter;
      return matchSearch && matchStatus;
    });

    const headers = [
      "Customer Name",
      "Email",
      "Phone",
      "Plan",
      "Amount",
      "Date",
      "Status",
    ];
    const rows = filtered.map((p) => [
      `"${(p.userName || "").replace(/"/g, '""')}"`,
      `"${(p.userEmail || "").replace(/"/g, '""')}"`,
      `"${(p.userPhone || "").replace(/"/g, '""')}"`,
      `"${(p.planName || p.plan || "Pro").replace(/"/g, '""')}"`,
      `"${p.amount || 0}"`,
      `"${
        p.createdAt?.seconds
          ? new Date(p.createdAt.seconds * 1000).toLocaleDateString("en-US")
          : ""
      }"`,
      `"${p.status || "pending"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Transactions_Report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(
      state.language === "en"
        ? "CSV Report Exported!"
        : "تم تصدير التقرير بنجاح!",
      "success",
    );
  };

  // Reset pagination when payment search/status changes
  useEffect(() => {
    setPaymentCurrentPage(1);
  }, [paymentSearchQuery, paymentStatusFilter, paymentsSubTab]);

  const ALL_STEPS = [...JOURNEY_STEPS, ...TOOLS_24H];
  const TOTAL_STEPS_COUNT = ALL_STEPS.length;

  const ADDITIONAL_RESOURCES = [
    {
      id: "brand-library",
      label_ar: "مكتبة المنتجات",
      label_en: "Product Library",
      section: "additional",
    },
    {
      id: "smart-notebook",
      label_ar: "دفتر الملاحظات الذكي",
      label_en: "Smart Notebook",
      section: "additional",
    },
    {
      id: "settings",
      label_ar: "الإعدادات",
      label_en: "Settings",
      section: "additional",
    },
    {
      id: "tutorial",
      label_ar: "فيديو الشرح",
      label_en: "Tutorial",
      section: "additional",
    },
  ];
  const CHECKLIST_ITEMS = [...ALL_STEPS, ...ADDITIONAL_RESOURCES];

  const DEFAULT_THEME = {
    accent: "#3B82F6",
    success: "#10B981",
    bg: "#080C14",
    sidebar: "#0D1220",
  };

  useEffect(() => {
    if (userData && !isInitialized) {
      setOwnerNameForm(userData.ownerName || "");
      setBrandNameForm(userData.brandName || "");
      setBrandUrlForm(userData.brandUrl || "");
      setDefaultLanguage(state.language || userData.defaultLanguage || "ar");
      setLogoDisplayMode(userData.logoDisplayMode || "both");
      setShowWhatsappLoginBtn(userData.showWhatsappLoginBtn !== false);

      // Robust Phone Number Parsing with country code preservation
      const fullPhone = String(userData.phoneNumber || "");
      const storedPhoneKey = userData.phoneKey || "";
      const storedRawPhone = userData.rawPhoneNumber || "";

      if (storedPhoneKey && storedRawPhone) {
        setPhoneKeyForm(storedPhoneKey);
        setPhoneNumberForm(storedRawPhone);
      } else if (fullPhone) {
        const sortedPrefixes = [
          "+966",
          "+971",
          "+965",
          "+974",
          "+968",
          "+212",
          "+962",
          "+961",
          "+963",
          "+964",
          "+970",
          "+213",
          "+216",
          "+218",
          "+249",
          "+967",
          "+20",
          "+44",
          "+1",
        ];
        const matchedPrefix = sortedPrefixes.find((p) =>
          fullPhone.startsWith(p),
        );
        if (matchedPrefix) {
          setPhoneKeyForm(matchedPrefix);
          setPhoneNumberForm(fullPhone.slice(matchedPrefix.length));
        } else if (fullPhone.startsWith("+")) {
          const match = fullPhone.match(/^(\+\d{1,3})(.*)$/);
          if (match) {
            setPhoneKeyForm(match[1]);
            setPhoneNumberForm(match[2]);
          } else {
            setPhoneKeyForm("+20");
            setPhoneNumberForm(fullPhone.replace(/^\+/, ""));
          }
        } else {
          setPhoneKeyForm("+20");
          setPhoneNumberForm(fullPhone);
        }
      } else {
        setPhoneKeyForm("+20");
        setPhoneNumberForm("");
      }

      const fullWhatsapp = String(userData.whatsappNumber || "");
      const storedWhatsappKey = userData.whatsappKey || "";
      const storedRawWhatsapp = userData.rawWhatsappNumber || "";

      if (storedWhatsappKey && storedRawWhatsapp) {
        setWhatsappKeyForm(storedWhatsappKey);
        setWhatsappNumberForm(storedRawWhatsapp);
      } else if (fullWhatsapp) {
        const sortedPrefixes = [
          "+966",
          "+971",
          "+965",
          "+974",
          "+968",
          "+212",
          "+962",
          "+961",
          "+963",
          "+964",
          "+970",
          "+213",
          "+216",
          "+218",
          "+249",
          "+967",
          "+20",
          "+44",
          "+1",
        ];
        const matchedPrefix = sortedPrefixes.find((p) =>
          fullWhatsapp.startsWith(p),
        );
        if (matchedPrefix) {
          setWhatsappKeyForm(matchedPrefix);
          setWhatsappNumberForm(fullWhatsapp.slice(matchedPrefix.length));
        } else if (fullWhatsapp.startsWith("+")) {
          const match = fullWhatsapp.match(/^(\+\d{1,3})(.*)$/);
          if (match) {
            setWhatsappKeyForm(match[1]);
            setWhatsappNumberForm(match[2]);
          } else {
            setWhatsappKeyForm("+20");
            setWhatsappNumberForm(fullWhatsapp.replace(/^\+/, ""));
          }
        } else {
          setWhatsappKeyForm("+20");
          setWhatsappNumberForm(fullWhatsapp);
        }
      } else {
        setWhatsappKeyForm("+20");
        setWhatsappNumberForm("");
      }

      if (userData.showWhatsappBtn !== undefined) {
        setShowWhatsappBtn(userData.showWhatsappBtn);
      } else {
        setShowWhatsappBtn(true);
      }

      const theme = userData.themeConfig || {};
      setAccentColor(theme.accent || DEFAULT_THEME.accent);
      setSuccessColor(theme.success || DEFAULT_THEME.success);
      setBgColor(theme.bg || "#080C14");
      setSidebarColor(theme.sidebar || "#0D1220");
      setFontFamily(theme.fontFamily || "Cairo");
      setTextColor(theme.text || "#FFFFFF");
      setLineColor(theme.line || "#1e293b");
      setFooterBgColor(theme.footerBg || "#05080E");
      setActiveThemePreset(detectMatchingThemePreset(theme));
      setLandingTemplate(userData.landingTemplate || "default");
      setSocialLinks(
        userData.socialLinks || {
          facebook: "",
          instagram: "",
          twitter: "",
          linkedin: "",
          tiktok: "",
        },
      );

      // Populate Legal & FAQs
      setTermsAr(
        getLegalValue(
          userData.legal?.terms_ar,
          DEFAULT_LEGAL_CONTENT.terms_ar,
          DEFAULT_LEGAL_CONTENT.terms_en,
        ),
      );
      setTermsEn(
        getLegalValue(userData.legal?.terms_en, DEFAULT_LEGAL_CONTENT.terms_en),
      );
      setPrivacyAr(
        getLegalValue(
          userData.legal?.privacy_ar,
          DEFAULT_LEGAL_CONTENT.privacy_ar,
          DEFAULT_LEGAL_CONTENT.privacy_en,
        ),
      );
      setPrivacyEn(
        getLegalValue(
          userData.legal?.privacy_en,
          DEFAULT_LEGAL_CONTENT.privacy_en,
        ),
      );
      setSecurityAr(
        getLegalValue(
          userData.legal?.security_ar,
          DEFAULT_LEGAL_CONTENT.security_ar,
          DEFAULT_LEGAL_CONTENT.security_en,
        ),
      );
      setSecurityEn(
        getLegalValue(
          userData.legal?.security_en,
          DEFAULT_LEGAL_CONTENT.security_en,
        ),
      );
      setFaqs(userData.faqs?.length > 0 ? userData.faqs : DEFAULT_FAQS);
      if (Array.isArray(userData.brandFailures)) {
        setBrandFailures(userData.brandFailures);
      }
      if (userData.showFailuresSection !== undefined) {
        setShowFailuresSection(userData.showFailuresSection);
      }
      if (userData.videoConfig) {
        setVideoConfig(userData.videoConfig);
      }
      if (userData.showVideoSection !== undefined) {
        setShowVideoSection(userData.showVideoSection);
      }
      if (userData.nicheRadar) {
        setNicheRadar(userData.nicheRadar);
      }
      if (userData.identityGenerator) {
        setIdentityGenerator(userData.identityGenerator);
      }
      if (userData.infrastructureBuilder) {
        setInfrastructureBuilder(userData.infrastructureBuilder);
      }
      if (userData.contentFactory) {
        setContentFactory(userData.contentFactory);
      }
      if (userData.proposalsSniper) {
        setProposalsSniper(userData.proposalsSniper);
      }
      if (userData.globalPlatformsRadar) {
        setGlobalPlatformsRadar(userData.globalPlatformsRadar);
      }
      if (userData.marketingAutomationEngine) {
        setMarketingAutomationEngine(userData.marketingAutomationEngine);
      }
      if (userData.profitCalculatorSection) {
        setProfitCalculatorSection(userData.profitCalculatorSection);
      }
      if (userData.aiAssistantSimulator) {
        setAiAssistantSimulator(userData.aiAssistantSimulator);
      }
      if (userData.finalCtaSection) {
        setFinalCtaSection(userData.finalCtaSection);
      }
      if (userData.heroSection) {
        setHeroSection(userData.heroSection);
      }

      const pData = userData.plans;
      setPlans(
        Array.isArray(pData)
          ? pData
          : [
              {
                id: 1,
                name: "الباقة الفضية",
                price: 300,
                features: "دخول لكافة الأدوات\nدعم فني\nتحديثات دورية",
              },
              {
                id: 2,
                name: "الباقة الذهبية",
                price: 600,
                features:
                  "دخول لكافة الأدوات\nدعم فني VIP\nتحديثات دورية\nجلسة استشارية",
              },
            ],
      );

      // Load free trial settings
      setEnableFreeTrial(userData.freeTrialSettings?.enabled ?? true);
      setFreeTrialDays(userData.freeTrialSettings?.days || 7);
      setFreeTrialCredits(userData.freeTrialSettings?.credits || 20);
      setTrialPlanNameAr(userData.freeTrialSettings?.planName_ar || "");
      setTrialPlanNameEn(userData.freeTrialSettings?.planName_en || "");
      setTrialBadgeAr(userData.freeTrialSettings?.badge_ar || "");
      setTrialBadgeEn(userData.freeTrialSettings?.badge_en || "");
      setTrialCtaAr(userData.freeTrialSettings?.cta_ar || "");
      setTrialCtaEn(userData.freeTrialSettings?.cta_en || "");
      setTrialFeaturesAr(userData.freeTrialSettings?.features_ar || [""]);
      setTrialFeaturesEn(userData.freeTrialSettings?.features_en || [""]);
      setAllowedTrialTools(
        userData.freeTrialSettings?.allowedTools ||
          CHECKLIST_ITEMS.map((s) => s.id),
      );
      setAutoIncludeNewTools(
        userData.freeTrialSettings?.autoIncludeNewTools ?? true,
      );

      setStripeSecretKey(userData.paymentMethods?.stripe?.secretKey || "");
      setStripePublishableKey(
        userData.paymentMethods?.stripe?.publishableKey || "",
      );
      setStripeWebhookSecret(
        userData.paymentMethods?.stripe?.webhookSecret || "",
      );

      setIsInitialized(true);
    }
  }, [userData, isInitialized]);

  // Filtered & Paginated Subscription Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Currency filter
      if (plansCurrencyFilter !== "all") {
        if ((plan.currency || "EGP") !== plansCurrencyFilter) {
          return false;
        }
      }
      // Search query filter
      if (plansSearchQuery.trim() !== "") {
        const query = plansSearchQuery.toLowerCase();
        const nameAr = (plan.name_ar || plan.name || "").toLowerCase();
        const nameEn = (plan.name_en || "").toLowerCase();
        const priceStr = String(plan.price || "");
        const featAr =
          typeof (plan.features_ar || plan.features) === "string"
            ? (plan.features_ar || plan.features).toLowerCase()
            : "";
        const featEn =
          typeof plan.features_en === "string"
            ? plan.features_en.toLowerCase()
            : "";

        return (
          nameAr.includes(query) ||
          nameEn.includes(query) ||
          priceStr.includes(query) ||
          featAr.includes(query) ||
          featEn.includes(query)
        );
      }
      return true;
    });
  }, [plans, plansCurrencyFilter, plansSearchQuery]);

  const plansItemsPerPage = 6;
  const totalPlansPages =
    Math.ceil(filteredPlans.length / plansItemsPerPage) || 1;
  const paginatedPlans = useMemo(() => {
    const start = (plansCurrentPage - 1) * plansItemsPerPage;
    return filteredPlans.slice(start, start + plansItemsPerPage);
  }, [filteredPlans, plansCurrentPage]);

  // Free Trial Statistics Calculations
  const activeTrialUsersCount = useMemo(() => {
    return users.filter((u) => {
      const sub = u.subscription || {};
      const type = sub.type || u.subType || "free";
      if (type === "free" || type === "trial") {
        if (sub.status === "stopped") return false;
        const created = u.createdAt?.seconds
          ? u.createdAt.seconds * 1000
          : typeof u.createdAt === "number"
            ? u.createdAt
            : Date.now();
        const days = Number(freeTrialDays) || 7;
        const expireTime = created + days * 24 * 60 * 60 * 1000;
        return Date.now() <= expireTime;
      }
      return false;
    }).length;
  }, [users, freeTrialDays]);

  const expiredTrialUsersCount = useMemo(() => {
    return users.filter((u) => {
      const sub = u.subscription || {};
      const type = sub.type || u.subType || "free";
      if (type === "free" || type === "trial") {
        if (sub.status === "stopped") return true;
        const created = u.createdAt?.seconds
          ? u.createdAt.seconds * 1000
          : typeof u.createdAt === "number"
            ? u.createdAt
            : Date.now();
        const days = Number(freeTrialDays) || 7;
        const expireTime = created + days * 24 * 60 * 60 * 1000;
        return Date.now() > expireTime;
      }
      return false;
    }).length;
  }, [users, freeTrialDays]);

  const handleSyncStripePlans = async () => {
    if (!stripeSecretKey) {
      return toast(
        state.language === "en"
          ? "Please configure your Stripe Secret Key first!"
          : "يرجى إعداد مفتاح Stripe السري أولاً!",
        "error",
      );
    }

    setIsSyncingStripe(true);
    try {
      const baseUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${baseUrl}/api/stripe/sync-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUid: userData.uid,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPlans(data.plans);
        toast(
          state.language === "en"
            ? "Successfully synchronized plans with Stripe!"
            : "تمت مزامنة الباقات مع Stripe بنجاح!",
          "success",
        );
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (err) {
      console.error("Stripe sync error:", err);
      toast(
        state.language === "en"
          ? `Sync failed: ${err.message}`
          : `فشلت المزامنة: ${err.message}`,
        "error",
      );
    } finally {
      setIsSyncingStripe(false);
    }
  };

  const handleSaveSubTabSection = async (newFields) => {
    const uid = userData?.uid;
    if (!uid || !newFields) return;
    try {
      const updatePayload = {
        ...newFields,
        updatedAt: serverTimestamp(),
      };

      const currentBrandName = (
        brandNameForm ||
        userData?.brandName ||
        ""
      ).trim();
      const currentBrandUrl = (brandUrlForm || userData?.brandUrl || "")
        .trim()
        .toLowerCase();

      // Parallel batch write using Promise.all for instant sub-second response
      const promises = [
        setDoc(doc(db, "users", uid), updatePayload, { merge: true }),
        setDoc(doc(db, "tenants", uid), updatePayload, { merge: true }),
        setDoc(doc(db, "brands", uid), updatePayload, { merge: true }),
      ];

      if (currentBrandName && currentBrandName !== uid) {
        promises.push(
          setDoc(doc(db, "brands", currentBrandName), updatePayload, {
            merge: true,
          }),
        );
      }

      if (
        currentBrandUrl &&
        currentBrandUrl !== uid &&
        currentBrandUrl !== currentBrandName
      ) {
        promises.push(
          setDoc(doc(db, "brands", currentBrandUrl), updatePayload, {
            merge: true,
          }),
        );
      }

      await Promise.all(promises);
    } catch (err) {
      console.error("Error in handleSaveSubTabSection:", err);
      throw err;
    }
  };

  const handleUpdateAdminProfile = async (overridePlansOrEvent = null) => {
    if (!userData?.uid) return;

    if (!ownerNameForm.trim()) {
      return toast(
        state.language === "en"
          ? "Please enter owner name before saving settings."
          : "يرجى إدخال اسم المشرف (المالك) قبل حفظ الإعدادات.",
        "error",
      );
    }
    if (!brandNameForm.trim()) {
      return toast(
        state.language === "en"
          ? "Please enter brand name before saving settings."
          : "يرجى إدخال اسم البراند / المشروع قبل حفظ الإعدادات.",
        "error",
      );
    }
    if (!phoneNumberForm.trim()) {
      return toast(
        state.language === "en"
          ? "Please enter contact phone number before saving settings."
          : "يرجى إدخال رقم الهاتف للتواصل قبل حفظ الإعدادات.",
        "error",
      );
    }

    // React onClick passes a synthetic event. Ignore it if it's not an array.
    const actualOverridePlans = Array.isArray(overridePlansOrEvent)
      ? overridePlansOrEvent
      : null;

    setIsUpdatingProfile(true);
    try {
      let photoURL = userData.photoURL;
      if (adminProfileImage) {
        const imgRef = ref(
          libraryStorage,
          `avatars/${Date.now()}_${adminProfileImage.name}`,
        );
        await uploadBytes(imgRef, adminProfileImage);
        photoURL = await getDownloadURL(imgRef);
      }

      const cleanPhoneKey = (phoneKeyForm || "+20").trim();
      const cleanRawPhone = phoneNumberForm.trim().replace(/^\+/, "");
      const fullPhoneNumber = `${cleanPhoneKey}${cleanRawPhone}`;

      const cleanWhatsappKey = (whatsappKeyForm || "+20").trim();
      const cleanRawWhatsapp = whatsappNumberForm.trim().replace(/^\+/, "");
      const fullWhatsappNumber = `${cleanWhatsappKey}${cleanRawWhatsapp}`;

      const updateData = {
        ownerName: ownerNameForm.trim(),
        brandName: brandNameForm.trim(),
        brandUrl: brandUrlForm.trim().toLowerCase(),
        phoneNumber: fullPhoneNumber,
        phoneKey: cleanPhoneKey,
        rawPhoneNumber: cleanRawPhone,
        whatsappNumber: fullWhatsappNumber,
        whatsappKey: cleanWhatsappKey,
        rawWhatsappNumber: cleanRawWhatsapp,
        photoURL: photoURL || "",
        brandLogo:
          photoURL ||
          userData.brandLogo ||
          userData.logoUrl ||
          userData.photoURL ||
          "",
        logoUrl:
          photoURL ||
          userData.logoUrl ||
          userData.brandLogo ||
          userData.photoURL ||
          "",
        logo:
          photoURL ||
          userData.logo ||
          userData.logoUrl ||
          userData.photoURL ||
          "",
        themeConfig: {
          preset: activeThemePreset,
          accent: accentColor,
          success: successColor,
          bg: bgColor,
          sidebar: sidebarColor,
          fontFamily: fontFamily,
          font: fontFamily,
          text: textColor,
          line: lineColor,
          footerBg: footerBgColor,
        },
        socialLinks: socialLinks,
        plans: actualOverridePlans || plans,
        freeTrialSettings: {
          enabled: enableFreeTrial,
          days: Number(freeTrialDays) || 7,
          credits: Number(freeTrialCredits) || 20,
          planName_ar: trialPlanNameAr,
          planName_en: trialPlanNameEn,
          badge_ar: trialBadgeAr,
          badge_en: trialBadgeEn,
          cta_ar: trialCtaAr,
          cta_en: trialCtaEn,
          features_ar: trialFeaturesAr,
          features_en: trialFeaturesEn,
          // Read from ref to avoid async state closure lag, and filter out invalid/duplicate items
          allowedTools: Array.from(
            new Set(allowedTrialToolsRef.current || []),
          ).filter((id) => CHECKLIST_ITEMS.some((item) => item.id === id)),
          autoIncludeNewTools: !!autoIncludeNewTools,
        },
        paymentMethods: {
          // Modern object-based payment config matching new UI
          stripe: {
            enabled: paymentMethods.stripe?.enabled ?? false,
            publishableKey: paymentMethods.stripe?.publishableKey || "",
            secretKey:
              paymentMethods.stripe?.secretKey || stripeSecretKey || "",
            paymentLink: paymentMethods.stripe?.paymentLink || "",
            paymentLinkAnnual: paymentMethods.stripe?.paymentLinkAnnual || "",
          },
          manualMethods: paymentMethods.manualMethods || [],
        },
        defaultLanguage: defaultLanguage,
        landingTemplate: landingTemplate,
        legal: {
          terms_ar: termsAr,
          terms_en: termsEn,
          privacy_ar: privacyAr,
          privacy_en: privacyEn,
          security_ar: securityAr,
          security_en: securityEn,
        },
        faqs: faqs,
        brandFailures: brandFailures || [],
        showFailuresSection:
          showFailuresSection !== undefined ? showFailuresSection : true,
        videoConfig: videoConfig || null,
        showVideoSection:
          showVideoSection !== undefined ? showVideoSection : true,
        heroSection: heroSection || null,
        nicheRadar: nicheRadar || null,
        identityGenerator: identityGenerator || null,
        infrastructureBuilder: infrastructureBuilder || null,
        contentFactory: contentFactory || null,
        proposalsSniper: proposalsSniper || null,
        globalPlatformsRadar: globalPlatformsRadar || null,
        marketingAutomationEngine: marketingAutomationEngine || null,
        profitCalculatorSection: profitCalculatorSection || null,
        aiAssistantSimulator: aiAssistantSimulator || null,
        finalCtaSection: finalCtaSection || null,
        logoDisplayMode: logoDisplayMode,
        showWhatsappLoginBtn: showWhatsappLoginBtn,
        showWhatsappBtn: showWhatsappLoginBtn && showWhatsappBtn,
        showWhatsappLandingBtn: showWhatsappLoginBtn && showWhatsappBtn,
      };

      const publicPaymentMethods = {
        stripe: {
          enabled: paymentMethods.stripe?.enabled ?? false,
          publishableKey:
            paymentMethods.stripe?.publishableKey || stripePublishableKey || "",
          paymentLink: paymentMethods.stripe?.paymentLink || "",
          paymentLinkAnnual: paymentMethods.stripe?.paymentLinkAnnual || "",
        },
        manualMethods: paymentMethods.manualMethods || [],
      };

      // Execute all core document updates in parallel for fast performance
      await Promise.all([
        // 1. Update Admin User document (contains secrets)
        setDoc(doc(db, "users", userData.uid), updateData, { merge: true }),

        // 2. Update/Create Brand document (filtered secrets)
        setDoc(
          doc(db, "brands", brandNameForm.trim()),
          {
            name: brandNameForm.trim(),
            brandName: brandNameForm.trim(),
            ownerName: ownerNameForm.trim(),
            phoneNumber: fullPhoneNumber,
            phoneKey: cleanPhoneKey,
            rawPhoneNumber: cleanRawPhone,
            whatsappNumber: fullWhatsappNumber || fullPhoneNumber,
            whatsappKey: cleanWhatsappKey,
            rawWhatsappNumber: cleanRawWhatsapp,
            domain: updateData.brandUrl,
            adminUid: userData.uid,
            themeConfig: updateData.themeConfig,
            socialLinks: updateData.socialLinks,
            plans: updateData.plans,
            freeTrialSettings: updateData.freeTrialSettings,
            paymentMethods: publicPaymentMethods,
            defaultLanguage: updateData.defaultLanguage,
            landingTemplate: updateData.landingTemplate,
            logoDisplayMode: updateData.logoDisplayMode,
            videoConfig: updateData.videoConfig,
            showVideoSection: updateData.showVideoSection,
            heroSection: updateData.heroSection,
            brandFailures: updateData.brandFailures,
            showFailuresSection: updateData.showFailuresSection,
            nicheRadar: updateData.nicheRadar,
            identityGenerator: updateData.identityGenerator,
            infrastructureBuilder: updateData.infrastructureBuilder,
            contentFactory: updateData.contentFactory,
            proposalsSniper: updateData.proposalsSniper,
            globalPlatformsRadar: updateData.globalPlatformsRadar,
            marketingAutomationEngine: updateData.marketingAutomationEngine,
            profitCalculatorSection: updateData.profitCalculatorSection,
            aiAssistantSimulator: updateData.aiAssistantSimulator,
            finalCtaSection: updateData.finalCtaSection,
            showWhatsappLoginBtn: updateData.showWhatsappLoginBtn,
            showWhatsappBtn: updateData.showWhatsappBtn,
            logoUrl:
              updateData.photoURL ||
              updateData.brandLogo ||
              updateData.logoUrl ||
              "",
            brandLogo:
              updateData.photoURL ||
              updateData.brandLogo ||
              updateData.logoUrl ||
              "",
            logo:
              updateData.photoURL ||
              updateData.brandLogo ||
              updateData.logoUrl ||
              "",
            photoURL: updateData.photoURL || "",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),

        // 3. Update Tenants document (for frontend tools access and landing page)
        setDoc(
          doc(db, "tenants", userData.uid),
          {
            ownerName: ownerNameForm.trim(),
            brandName: brandNameForm.trim(),
            phoneNumber: fullPhoneNumber,
            whatsappNumber: fullWhatsappNumber || fullPhoneNumber,
            showWhatsappLoginBtn: updateData.showWhatsappLoginBtn,
            showWhatsappBtn: updateData.showWhatsappBtn,
            showWhatsappLandingBtn: updateData.showWhatsappLandingBtn,
            plans: updateData.plans,
            freeTrialSettings: updateData.freeTrialSettings,
            videoConfig: updateData.videoConfig,
            showVideoSection: updateData.showVideoSection,
            heroSection: updateData.heroSection,
            brandFailures: updateData.brandFailures,
            showFailuresSection: updateData.showFailuresSection,
            nicheRadar: updateData.nicheRadar,
            identityGenerator: updateData.identityGenerator,
            infrastructureBuilder: updateData.infrastructureBuilder,
            contentFactory: updateData.contentFactory,
            proposalsSniper: updateData.proposalsSniper,
            globalPlatformsRadar: updateData.globalPlatformsRadar,
            marketingAutomationEngine: updateData.marketingAutomationEngine,
            profitCalculatorSection: updateData.profitCalculatorSection,
            aiAssistantSimulator: updateData.aiAssistantSimulator,
            finalCtaSection: updateData.finalCtaSection,
            defaultLanguage: updateData.defaultLanguage,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),

        // 4. Update Global Settings for language
        setDoc(
          doc(db, "tenants", "global"),
          {
            systemLanguage: updateData.defaultLanguage,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      ]);

      // Force sync application language state and storage immediately
      if (updateData.defaultLanguage) {
        dispatch({ type: "SET_LANGUAGE", payload: updateData.defaultLanguage });
        if (i18n && typeof i18n.changeLanguage === "function") {
          i18n.changeLanguage(updateData.defaultLanguage);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "user_preferred_language",
            updateData.defaultLanguage,
          );
          localStorage.setItem("app_language", updateData.defaultLanguage);
          localStorage.setItem(
            "last_synced_brand_language",
            updateData.defaultLanguage,
          );
          sessionStorage.removeItem("landing_user_selected_lang");
          Object.keys(sessionStorage).forEach((k) => {
            if (k.startsWith("landing_brand_")) sessionStorage.removeItem(k);
          });
        }
      }

      setLastSavedTimestamp(new Date());

      // Apply saved theme to document.documentElement manually now
      const root = document.documentElement;
      if (accentColor) root.style.setProperty("--accent", accentColor);
      if (successColor) root.style.setProperty("--green", successColor);
      if (fontFamily) {
        root.style.setProperty("--font-family", `'${fontFamily}', sans-serif`);
        root.style.setProperty("--font", `'${fontFamily}', sans-serif`);
        root.style.fontFamily = `'${fontFamily}', sans-serif`;
        if (document.body)
          document.body.style.fontFamily = `'${fontFamily}', sans-serif`;
      }
      if (bgColor) root.style.setProperty("--bg", bgColor);
      if (sidebarColor) {
        root.style.setProperty("--bg2", sidebarColor);
        root.style.setProperty("--card-bg", sidebarColor);
        root.style.setProperty("--surface", sidebarColor);
        root.style.setProperty("--panel", sidebarColor);
        root.style.setProperty("--sidebar-bg", sidebarColor);
      }
      if (textColor) root.style.setProperty("--text", textColor);
      if (lineColor) root.style.setProperty("--line", lineColor);
      if (footerBgColor) root.style.setProperty("--footer-bg", footerBgColor);

      toast(
        state.language === "en"
          ? "Brand Settings updated successfully!"
          : "تم تحديث إعدادات البراند بنجاح!",
        "success",
      );
    } catch (err) {
      console.error(err);
      toast("خطأ في التحديث", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Load users created by this admin (same brand)
  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = [];
      snap.forEach((d) => {
        const data = d.data();
        // Show users created by this admin OR users belonging to same brand
        if (
          data.createdBy === userData?.uid ||
          data.brandName === userData?.brandName
        ) {
          if (d.id !== userData?.uid) {
            list.push({ id: d.id, ...data });
          }
        }
      });
      list.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );
      setUsers(list);
    } catch (err) {
      console.error("Error loading users:", err);
      toast("خطأ في تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) loadUsers();
  }, [userData]);

  // Load payments
  const loadPayments = async () => {
    if (!userData?.uid) return;
    setLoadingPayments(true);
    try {
      const q = query(
        collection(db, "payments"),
        where("adminUid", "==", userData.uid),
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );
      setPendingPayments(list);
    } catch (err) {
      console.error(err);
      toast("خطأ في تحميل المعاملات", "error");
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (activeTab === "payment_methods") {
      loadPayments();
    }
  }, [activeTab, userData]);

  // Handle Approve Payment
  const handleApprovePayment = async () => {
    if (!selectedPlanForPayment) return toast("يرجى اختيار الباقة", "error");

    try {
      // Find the selected plan from the brand's plans to get credits and name
      const approvedPlan = plans.find(
        (p) => String(p.id) === String(selectedPlanForPayment),
      );
      const planCredits = approvedPlan
        ? Number(approvedPlan.creditsPerMonth) || 20
        : 20;
      const planName = approvedPlan
        ? approvedPlan.name_ar || approvedPlan.name
        : "Unknown Plan";

      // 1. Update Payment status
      await updateDoc(doc(db, "payments", paymentToApprove.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
        planId: selectedPlanForPayment,
        durationDays: selectedDurationForPayment,
      });

      // 2. Update User Subscription
      const expiryDate = new Date();
      expiryDate.setDate(
        expiryDate.getDate() + Number(selectedDurationForPayment),
      );

      await setDoc(
        doc(db, "users", paymentToApprove.userId),
        {
          planId: null, // Clear legacy field
          planName: null, // Clear legacy field
          credits: planCredits,
          totalCredits: planCredits,
          subscription: {
            planId: selectedPlanForPayment, // Standardize on planId
            planName: planName,
            type: selectedPlanForPayment, // Keep type for backward compatibility
            expiryDate: expiryDate,
            status: "active",
            updatedAt: serverTimestamp(),
          },
        },
        { merge: true },
      );

      toast("تم الموافقة على الدفع وتحديث اشتراك المستخدم بنجاح!", "success");
      setPaymentToApprove(null);
      await loadPayments();
      await loadUsers();
    } catch (err) {
      console.error(err);
      toast("حدث خطأ أثناء الموافقة على الدفع", "error");
    }
  };

  // Handle Reject Payment
  const handleRejectPayment = async () => {
    if (!paymentToReject || !rejectionReason.trim()) {
      return toast("يرجى إدخال سبب الرفض", "error");
    }

    try {
      // 1. Update Payment status to rejected
      await updateDoc(doc(db, "payments", paymentToReject.id), {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
        rejectedAt: serverTimestamp(),
      });

      // 2. Safely fall back user to Free Plan if they had no active premium plan
      // We assume they should fall back to Free if their request fails.
      if (paymentToReject.userId) {
        await setDoc(
          doc(db, "users", paymentToReject.userId),
          {
            planId: null, // Clear legacy field
            planName: null, // Clear legacy field
            credits: freeTrialCredits || 20, // Reset to dynamic free limit
            totalCredits: freeTrialCredits || 20, // Reset to dynamic free limit
            subscription: {
              status: "active",
              planId: "free",
              planName: "Free Plan",
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: "2099-12-31T23:59:59Z", // Lifetime free
            },
          },
          { merge: true },
        );
      }

      toast(
        state.language === "en"
          ? "Payment request rejected successfully!"
          : "تم رفض طلب الدفع بنجاح",
        "success",
      );
      setPaymentToReject(null);
      setRejectionReason("");
      await loadPayments();
      await loadUsers();
    } catch (err) {
      console.error(err);
      toast("حدث خطأ أثناء رفض الطلب", "error");
    }
  };

  // Create user using secondary Firebase app
  const handleCreate = async () => {
    if (!userName.trim()) return toast("أدخل اسم المستخدم", "error");
    if (!userEmail.trim()) return toast("أدخل البريد الإلكتروني", "error");
    if (!userPassword.trim() || userPassword.length < 6)
      return toast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error");

    setCreating(true);
    let secondaryApp = null;

    try {
      let photoURL = "";
      if (profileImage) {
        const imgRef = ref(
          libraryStorage,
          `avatars/${Date.now()}_${profileImage.name}`,
        );
        await uploadBytes(imgRef, profileImage);
        photoURL = await getDownloadURL(imgRef);
      }

      const config = {
        apiKey: "AIzaSyCIF4HfPdDqjH6ue2Sc5NIIJwlOq3ytNA0",
        authDomain: "event-upklick.firebaseapp.com",
        projectId: "event-upklick",
      };
      secondaryApp = initializeApp(config, "admin-secondary-" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        userEmail.trim(),
        userPassword,
      );
      const uid = cred.user.uid;

      let finalSubType =
        userPlanId === "free" ||
        userPlanId === "trial" ||
        userPlanId === "free_trial"
          ? "trial"
          : subType === "trial"
            ? "monthly"
            : subType;
      let expiryDate = null;
      if (finalSubType === "monthly") {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (finalSubType === "custom") {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(subDays));
      } else if (finalSubType === "trial") {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(freeTrialDays));
      }

      // Determine plan info
      const selectedPlan = plans.find(
        (p) => String(p.id) === String(userPlanId),
      );
      const planNameVal = selectedPlan
        ? selectedPlan.name_ar || selectedPlan.name
        : "Free";
      const planCreditsVal = selectedPlan
        ? Number(selectedPlan.creditsPerMonth || freeTrialCredits || 20)
        : freeTrialCredits || 20;
      const planAllowedToolsVal = selectedPlan?.allowedTools || null;

      const newUserDoc = {
        email: userEmail.trim().toLowerCase(),
        role: userRole,
        ownerName: userName.trim(),
        photoURL: photoURL || "",
        brandName: userData?.brandName || "",
        planId: userPlanId,
        planName: planNameVal,
        credits: planCreditsVal,
        totalCredits: planCreditsVal,
        createdAt: serverTimestamp(),
        createdBy: userData?.uid || "",
        adminId: userData?.uid || "", // explicit adminId for payment lookup
        subscription: {
          type: finalSubType,
          planId: userPlanId,
          expiryDate: expiryDate ? expiryDate : null,
          status: finalSubType === "stopped" ? "stopped" : "active",
          updatedAt: serverTimestamp(),
          allowedTools: planAllowedToolsVal,
        },
      };

      // Write allowedTools at root level too for easy access
      if (planAllowedToolsVal !== null) {
        newUserDoc.allowedTools = planAllowedToolsVal;
      }

      await setDoc(doc(db, "users", uid), newUserDoc);

      toast(
        `تم إنشاء ${userRole === "admin" ? "الأدمن" : "المستخدم"} بنجاح!`,
        "success",
      );
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("user");
      setSubType("monthly");
      setSubDays(30);
      setProfileImage(null);
      if (document.getElementById("userProfileImg"))
        document.getElementById("userProfileImg").value = "";
      setIsUserModalOpen(false);
      await loadUsers();
    } catch (err) {
      console.error("Create error:", err);
      const msgs = {
        "auth/email-already-in-use": "البريد الإلكتروني مستخدم بالفعل",
        "auth/invalid-email": "صيغة البريد غير صحيحة",
        "auth/weak-password": "كلمة المرور ضعيفة جداً",
      };
      toast(msgs[err.code] || "حدث خطأ أثناء الإنشاء", "error");
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {}
      }
      setCreating(false);
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setUserName(u.ownerName || "");
    setUserEmail(u.email || "");
    setUserRole(u.role || "user");
    setSubType(u.subscription?.type || "monthly");
    setSubDays(30);
    setUserPlanId(u.planId || "free");
    setUserPassword(""); // Hide password for edit
    setIsUserModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setUserName("");
    setUserEmail("");
    setUserRole("user");
    setUserPlanId("free");
    setUserPassword("");
    setIsUserModalOpen(false);
  };

  // Renew / Change Plan (isolated from edit)
  const handleRenewPlan = async () => {
    if (!renewPlanUser) return;
    setIsRenewing(true);
    try {
      const selectedPlan = plans.find(
        (p) => String(p.id) === String(renewPlanId),
      );
      const planNameVal = selectedPlan
        ? selectedPlan.name_ar || selectedPlan.name
        : "Free";
      const planCreditsVal = selectedPlan
        ? Number(selectedPlan.creditsPerMonth || freeTrialCredits || 20)
        : freeTrialCredits || 20;

      await updateDoc(doc(db, "users", renewPlanUser.id), {
        planId: renewPlanId,
        planName: planNameVal,
        credits: planCreditsVal,
        totalCredits: planCreditsVal,
        "subscription.planId": renewPlanId,
        "subscription.planName": planNameVal,
        "subscription.expiryDate": (() => {
          const d = new Date();
          if (renewPlanId === "free")
            d.setDate(d.getDate() + Number(freeTrialDays || 7));
          else d.setMonth(d.getMonth() + 1);
          return d;
        })(),
        "subscription.status": "active",
        "subscription.type": renewPlanId === "free" ? "trial" : "monthly",
      });

      toast(
        state.language === "en"
          ? "Plan renewed successfully! \u2705"
          : "\u062a\u0645 \u062a\u062c\u062f\u064a\u062f \u0627\u0644\u062e\u0637\u0629 \u0628\u0646\u062c\u0627\u062d! \u2705",
        "success",
      );
      setRenewPlanUser(null);
      await loadUsers();
    } catch (err) {
      console.error("Renew plan error:", err);
      toast(
        state.language === "en"
          ? "Failed to renew plan"
          : "\u0641\u0634\u0644 \u0641\u064a \u062a\u062c\u062f\u064a\u062f \u0627\u0644\u062e\u0637\u0629",
        "error",
      );
    } finally {
      setIsRenewing(false);
    }
  };

  const handleUpdate = async () => {
    if (!userName.trim()) return toast("أدخل الاسم", "error");
    setCreating(true);
    try {
      let photoURL = editingUser.photoURL;
      if (profileImage) {
        const imgRef = ref(
          libraryStorage,
          `avatars/${Date.now()}_${profileImage.name}`,
        );
        await uploadBytes(imgRef, profileImage);
        photoURL = await getDownloadURL(imgRef);
      }

      let finalSubType =
        userPlanId === "free" ||
        userPlanId === "trial" ||
        userPlanId === "free_trial"
          ? "trial"
          : subType === "trial"
            ? "monthly"
            : subType;
      let expiryDate = editingUser.subscription?.expiryDate?.toDate() || null;

      // Reset expiry if plan changed to free trial, otherwise obey subType
      if (editingUser.planId !== userPlanId && userPlanId === "free") {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(freeTrialDays));
      } else {
        if (finalSubType === "monthly") {
          expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else if (finalSubType === "custom") {
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + Number(subDays));
        } else if (finalSubType === "trial") {
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + Number(freeTrialDays));
        } else if (finalSubType === "lifetime") {
          expiryDate = null;
        }
      }

      // Determine plan info
      const selectedPlan = plans.find(
        (p) => String(p.id) === String(userPlanId),
      );
      const planNameVal = selectedPlan
        ? selectedPlan.name_ar || selectedPlan.name
        : "Free";
      const planCreditsVal = selectedPlan
        ? Number(selectedPlan.creditsPerMonth || freeTrialCredits || 20)
        : freeTrialCredits || 20;
      const planAllowedToolsVal = selectedPlan?.allowedTools || null;

      // Only reset current credits if the plan changed
      const updateData = {
        ownerName: userName.trim(),
        role: userRole,
        photoURL: photoURL || "",
        planId: userPlanId,
        planName: planNameVal,
        totalCredits: planCreditsVal,
        subscription: {
          type: finalSubType,
          planId: userPlanId,
          expiryDate: expiryDate ? expiryDate : null,
          status: finalSubType === "stopped" ? "stopped" : "active",
          updatedAt: serverTimestamp(),
          allowedTools: planAllowedToolsVal,
        },
      };

      // Write allowedTools at root level too for easy sidebar access
      if (planAllowedToolsVal !== null) {
        updateData.allowedTools = planAllowedToolsVal;
      }
      // Ensure adminId is always set for payment lookup
      if (userData?.uid) {
        updateData.adminId = userData.uid;
        if (!updateData.createdBy) updateData.createdBy = userData.uid;
      }

      // Only reset credits if the plan actually changed
      if (editingUser.planId !== userPlanId) {
        updateData.credits = planCreditsVal;
      }

      await setDoc(doc(db, "users", editingUser.id), updateData, {
        merge: true,
      });
      toast("تم التحديث بنجاح", "success");
      cancelEdit();
      await loadUsers();
    } catch (err) {
      toast("حدث خطأ أثناء التحديث", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingUser) handleUpdate();
    else handleCreate();
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const IS_DEV = import.meta.env.DEV;
      const FIREBASE_PROJECT = "event-upklick";
      const FIREBASE_REGION = "us-central1";
      const CF_BASE = IS_DEV
        ? "/api/stripe"
        : `https://${FIREBASE_REGION}-${FIREBASE_PROJECT}.cloudfunctions.net`;
      const functionUrl = `${CF_BASE}/deleteUserAdmin`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: userToDelete.id,
          adminId: userData.uid,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      toast(
        state.language === "en"
          ? "User deleted successfully"
          : "تم حذف المستخدم بنجاح",
        "success",
      );
      setUserToDelete(null);
      await loadUsers();
    } catch (err) {
      console.error(err);
      toast(
        state.language === "en" ? "Error deleting user" : "خطأ في الحذف",
        "error",
      );
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleExportCSV = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      toast(
        state.language === "en"
          ? "No users to export"
          : "لا يوجد مستخدمين للتصدير",
        "error",
      );
      return;
    }

    const headers =
      state.language === "en"
        ? ["Name", "Email", "Role", "Subscription Type", "Created Date"]
        : [
            "الاسم",
            "البريد الإلكتروني",
            "الدور",
            "نوع الاشتراك",
            "تاريخ الإنشاء",
          ];

    const rows = filteredUsers.map((u) => [
      `"${u.ownerName || u.brandName || ""}"`,
      `"${u.email || ""}"`,
      `"${u.role === "admin" ? "Admin" : "User"}"`,
      `"${u.subscription?.type || "none"}"`,
      `"${formatDate(u.createdAt)}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `users_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(
      state.language === "en"
        ? "CSV exported successfully"
        : "تم تصدير ملف CSV بنجاح",
      "success",
    );
  };

  const handleLogout = async () => {
    try {
      await logout("admin");
      toast(
        state.language === "en"
          ? "Logged out successfully"
          : "تم تسجيل الخروج بنجاح",
        "success",
      );
      navigate("/admin/login");
    } catch (err) {
      toast(
        state.language === "en"
          ? "Error logging out"
          : "حدث خطأ أثناء تسجيل الخروج",
        "error",
      );
      console.error(err);
    }
  };

  const filteredUsers = (users || []).filter((u) => {
    if (userSearchQuery) {
      const q = userSearchQuery.toLowerCase();
      const name = (u.ownerName || u.brandName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (subFilter !== "all") {
      const sub = u.subscription;
      if (subFilter === "stopped" && sub?.status !== "stopped") return false;
      if (subFilter === "lifetime" && sub?.type !== "lifetime") return false;
      if (subFilter === "trial" && sub?.type !== "trial") return false;
      if (
        subFilter === "active" &&
        (sub?.status === "stopped" || !sub?.expiryDate)
      )
        return false;
    }
    if (planFilter !== "all") {
      const userPlan = u.planId || "free";
      if (userPlan !== planFilter) return false;
    }
    if (timeFilter !== "all") {
      const rawDate =
        u.createdAt || u.registrationDate || u.timestamp || u.created_at;
      if (!rawDate) return false;
      let userDate = null;
      if (
        typeof rawDate === "object" &&
        rawDate !== null &&
        typeof rawDate.seconds === "number"
      ) {
        userDate = new Date(rawDate.seconds * 1000);
      } else if (
        typeof rawDate === "object" &&
        rawDate !== null &&
        typeof rawDate.toDate === "function"
      ) {
        userDate = rawDate.toDate();
      } else {
        userDate = new Date(rawDate);
      }
      if (!userDate || isNaN(userDate.getTime())) return false;

      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );

      if (timeFilter === "today") {
        if (userDate < startOfToday || userDate > endOfToday) return false;
      } else if (timeFilter === "yesterday") {
        const startOfYesterday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          0,
          0,
          0,
          0,
        );
        const endOfYesterday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          23,
          59,
          59,
          999,
        );
        if (userDate < startOfYesterday || userDate > endOfYesterday)
          return false;
      } else if (timeFilter === "last7days") {
        const sevenDaysAgo = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7,
          0,
          0,
          0,
          0,
        );
        if (userDate < sevenDaysAgo || userDate > now) return false;
      } else if (timeFilter === "thisMonth") {
        const startOfMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          0,
          0,
          0,
          0,
        );
        if (userDate < startOfMonth || userDate > now) return false;
      } else if (timeFilter === "custom") {
        if (startDateFilter) {
          const start = new Date(startDateFilter);
          start.setHours(0, 0, 0, 0);
          if (userDate < start) return false;
        }
        if (endDateFilter) {
          const end = new Date(endDateFilter);
          end.setHours(23, 59, 59, 999);
          if (userDate > end) return false;
        }
      }
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [
    userSearchQuery,
    roleFilter,
    subFilter,
    planFilter,
    timeFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const admins = Array.isArray(users)
    ? users.filter((u) => u.role === "admin")
    : [];
  const regularUsers = Array.isArray(users)
    ? users.filter((u) => u.role === "user")
    : [];
  const totalSteps = TOTAL_STEPS_COUNT || 1;

  const formatDate = (ts) => {
    if (!ts?.seconds) return "—";
    return new Date(ts.seconds * 1000).toLocaleDateString(
      state.language === "en" ? "en-US" : "ar-EG",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  };

  if (!userData) {
    return (
      <div
        className="ad-page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          height: "100vh",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            border: "3px solid var(--line2, rgba(255,255,255,0.15))",
            borderTopColor: "var(--accent, #3B82F6)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: 13, color: "var(--text2, #94A3B8)" }}>
          جاري تحميل لوحة التحكم...
        </span>
      </div>
    );
  }

  return (
    <div className="ad-page" dir="rtl">
      <div className="ad-bg">
        <div className="ad-orb ad-orb-1" />
        <div className="ad-orb ad-orb-2" />
      </div>
      <div className="ad-layout">
        {/* Mobile overlay */}
        <AnimatePresence>
          {isMobile && isMobileMenuOpen && (
            <motion.div
              className="ad-mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>
        {/* Sidebar */}
        <motion.aside
          className={`ad-sidebar ${isMobileMenuOpen ? "open" : ""}`}
          animate={{
            width: isMobile
              ? isMobileMenuOpen
                ? 260
                : 0
              : isCollapsed
                ? 80
                : 260,
            x: isMobile && !isMobileMenuOpen ? 260 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div
            className="ad-sidebar-header"
            style={{
              padding: isCollapsed && !isMobile ? "16px 10px" : "20px",
              display: "flex",
              alignItems: "center",
              justifyContent:
                isCollapsed && !isMobile ? "center" : "space-between",
            }}
          >
            <div
              onClick={
                isCollapsed && !isMobile
                  ? () => {
                      setIsCollapsed(false);
                      localStorage.setItem("admin-sidebar-collapsed", "false");
                    }
                  : undefined
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                overflow: "hidden",
                cursor: isCollapsed && !isMobile ? "pointer" : "default",
              }}
              title={
                isCollapsed && !isMobile
                  ? state.language === "en"
                    ? "Expand Sidebar"
                    : "توسيع القائمة"
                  : undefined
              }
            >
              {(() => {
                const displayMode = userData?.logoDisplayMode || "both";
                const showLogo =
                  displayMode === "both" || displayMode === "logo";
                const showText =
                  displayMode === "both" || displayMode === "text";

                return (
                  <>
                    {showLogo && (
                      <div
                        className="ad-logo-icon"
                        style={
                          userData?.photoURL
                            ? {
                                background: `url("${userData.photoURL}") center/contain no-repeat`,
                                border: "none",
                                backgroundSize: "contain",
                                flexShrink: 0,
                              }
                            : { flexShrink: 0 }
                        }
                      >
                        {!userData?.photoURL && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                        )}
                      </div>
                    )}
                    {(!isCollapsed || isMobile) && showText && (
                      <div style={{ overflow: "hidden" }}>
                        <div
                          className="ad-topbar-title"
                          style={{
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {userData?.brandName || "لوحة التحكم"}
                        </div>
                        <div className="ad-topbar-sub">Admin Dashboard</div>
                        {userData?.subscription && (
                          <div
                            style={{
                              fontSize: 9,
                              color: "var(--accent)",
                              fontWeight: 700,
                              marginTop: 4,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {userData.subscription.status === "stopped"
                              ? "🚫 الاشتراك متوقف"
                              : userData.subscription.type === "lifetime"
                                ? "💎 اشتراك دائم"
                                : `⌛ ينتهي: ${(userData.subscription.expiryDate?.toDate ? userData.subscription.expiryDate.toDate() : new Date(userData.subscription.expiryDate)).toLocaleDateString("ar-EG")}`}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {!isMobile && (
              <button
                type="button"
                className="ad-sidebar-collapse-btn"
                onClick={() => {
                  const nextState = !isCollapsed;
                  setIsCollapsed(nextState);
                  localStorage.setItem(
                    "admin-sidebar-collapsed",
                    String(nextState),
                  );
                }}
                title={
                  isCollapsed
                    ? state.language === "en"
                      ? "Expand Sidebar"
                      : "توسيع القائمة الجانبية"
                    : state.language === "en"
                      ? "Collapse Sidebar"
                      : "طي القائمة الجانبية"
                }
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "6px",
                  color: "var(--text2)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                {isCollapsed ? (
                  state.language === "en" ? (
                    <ChevronRight size={18} />
                  ) : (
                    <ChevronLeft size={18} />
                  )
                ) : state.language === "en" ? (
                  <ChevronLeft size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            )}
          </div>

          <div className="ad-sidebar-nav">
            {[
              {
                id: "users",
                translationKey: "users",
                icon: Users,
              },
              {
                id: "sales",
                translationKey: "sales",
                icon: TrendingUp,
              },
              {
                id: "subscriptions",
                translationKey: "subscriptions",
                icon: Tag,
              },
              {
                id: "payment_methods",
                translationKey: "payment_methods",
                icon: CreditCard,
              },
              {
                id: "ai_settings",
                translationKey: "ai_settings",
                icon: Cpu,
              },
              {
                id: "marketing_tracking",
                translationKey: "marketing_tracking",
                icon: Activity,
              },
              {
                id: "settings",
                translationKey: "settings",
                icon: Settings,
              },
              {
                id: "support",
                translationKey: "support",
                icon: MessageCircle,
              },
              {
                id: "tutorial",
                translationKey: "tutorial",
                icon: Tv,
              },
              {
                id: "library",
                translationKey: "library",
                icon: Library,
              },
              {
                id: "templates",
                translationKey: "templates",
                icon: LayoutTemplate,
              },
            ].map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === "subscriptions" && activeTab === "trial_settings");
              const label = t(`admin_sidebar.${item.translationKey}`);

              return (
                <motion.button
                  key={item.id}
                  className={`ad-nav-link ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectTab(item.id)}
                  whileHover={{
                    scale: 1.02,
                    x:
                      isCollapsed && !isMobile
                        ? 0
                        : state.language === "en"
                          ? 4
                          : -4,
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  title={isCollapsed && !isMobile ? label : undefined}
                  style={{
                    justifyContent:
                      isCollapsed && !isMobile ? "center" : "flex-start",
                    padding: isCollapsed && !isMobile ? "12px" : "12px 16px",
                  }}
                >
                  <div className="ad-nav-icon">
                    <Icon size={18} />
                  </div>
                  {(!isCollapsed || isMobile) && (
                    <span
                      className="ad-nav-label"
                      style={{
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {label}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div
            className="ad-sidebar-footer"
            style={{
              padding: isCollapsed && !isMobile ? "16px 8px" : "16px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {(userData?.email === "admin@brand.com" ||
              userData?.role === "superadmin" ||
              userData?.role === "admin") && (
              <motion.button
                className="btn btn-sm ad-footer-btn"
                onClick={() => navigate("/dashboard")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={
                  isCollapsed && !isMobile
                    ? state.language === "en"
                      ? "User Tools"
                      : state.language === "ar-GCC"
                        ? "أدوات المشتركين"
                        : "أدوات المستخدم"
                    : undefined
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    isCollapsed && !isMobile ? "center" : "flex-start",
                  gap: "8px",
                  padding: isCollapsed && !isMobile ? "8px" : "8px 12px",
                }}
              >
                <Package size={16} />
                {(!isCollapsed || isMobile) && (
                  <span>
                    {state.language === "en"
                      ? "User Tools"
                      : state.language === "ar-GCC"
                        ? "أدوات المشتركين"
                        : "أدوات المستخدم"}
                  </span>
                )}
              </motion.button>
            )}
            <motion.button
              className="btn btn-sm ad-footer-btn danger"
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title={
                isCollapsed && !isMobile
                  ? state.language === "en"
                    ? "Logout"
                    : "تسجيل الخروج"
                  : undefined
              }
              style={{
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "var(--red)",
                background: "rgba(239, 68, 68, 0.08)",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  isCollapsed && !isMobile ? "center" : "flex-start",
                gap: "8px",
                padding: isCollapsed && !isMobile ? "8px" : "8px 12px",
              }}
            >
              <LogOut size={16} />
              {(!isCollapsed || isMobile) && (
                <span>
                  {state.language === "en" ? "Logout" : "تسجيل الخروج"}
                </span>
              )}
            </motion.button>
          </div>
        </motion.aside>
        {/* Main Content */}
        <div className="ad-main">
          {/* Topbar */}
          <div
            className="ad-topbar"
            style={{ zIndex: 50, position: "relative" }}
          >
            <div
              className="ad-topbar-left"
              style={{ display: "flex", alignItems: "center", gap: "12px" }}
            >
              {isMobile ? (
                <button
                  className="ad-mobile-toggle"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  className="ad-sidebar-collapse-btn"
                  onClick={() => {
                    const nextState = !isCollapsed;
                    setIsCollapsed(nextState);
                    localStorage.setItem(
                      "admin-sidebar-collapsed",
                      String(nextState),
                    );
                  }}
                  title={
                    isCollapsed
                      ? state.language === "en"
                        ? "Expand Sidebar"
                        : state.language === "ar-GCC"
                          ? "توسيع القائمة"
                          : "توسيع القائمة الجانبية"
                      : state.language === "en"
                        ? "Collapse Sidebar"
                        : state.language === "ar-GCC"
                          ? "تصغير القائمة"
                          : "طي القائمة الجانبية"
                  }
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    padding: "6px",
                    color: "var(--text)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Menu size={18} />
                </button>
              )}
              <h2
                className="ad-page-title"
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {activeTab === "users" ? (
                  <>
                    <Users size={20} style={{ color: "var(--accent)" }} />
                    <span>
                      {state.language === "en"
                        ? "User Management"
                        : state.language === "ar-GCC"
                          ? "إدارة المشتركين والعملاء"
                          : "إدارة المستخدمين"}
                    </span>
                  </>
                ) : activeTab === "sales" ? (
                  <>
                    <TrendingUp size={20} style={{ color: "var(--green)" }} />
                    <span>
                      {state.language === "en"
                        ? "Sales Management"
                        : state.language === "ar-GCC"
                          ? "تقارير ومتابعة المبيعات"
                          : "إدارة المبيعات"}
                    </span>
                  </>
                ) : activeTab === "subscriptions" ||
                  activeTab === "trial_settings" ? (
                  <>
                    <Tag size={20} style={{ color: "var(--accent)" }} />
                    <span>
                      {state.language === "en"
                        ? "Plans & Pricing"
                        : state.language === "ar-GCC"
                          ? "الباقات والاشتراكات"
                          : "الباقات والتسعير"}
                    </span>
                  </>
                ) : activeTab === "payment_methods" ? (
                  <>
                    <CreditCard size={20} style={{ color: "#8b5cf6" }} />
                    <span>
                      {state.language === "en"
                        ? "Transactions & Payments"
                        : state.language === "ar-GCC"
                          ? "المدفوعات والعمليات المالية"
                          : "إدارة المنتجات والمدفوعات"}
                    </span>
                  </>
                ) : activeTab === "tutorial" ? (
                  <>
                    <Tv size={20} style={{ color: "#ef4444" }} />
                    <span>
                      {state.language === "en"
                        ? "Tutorial Video"
                        : state.language === "ar-GCC"
                          ? "فيديوهات الشرح والتدريب"
                          : "فيديو الشرح"}
                    </span>
                  </>
                ) : activeTab === "ai_settings" ? (
                  <>
                    <Cpu size={20} style={{ color: "var(--accent)" }} />
                    <span>
                      {state.language === "en"
                        ? "AI Settings"
                        : "إعدادات الذكاء الاصطناعي"}
                    </span>
                  </>
                ) : activeTab === "marketing_tracking" ? (
                  <>
                    <Activity size={20} style={{ color: "var(--accent)" }} />
                    <span>
                      {state.language === "en"
                        ? "Marketing & Tracking"
                        : state.language === "ar-GCC"
                          ? "التسويق وتتبع الحملات"
                          : "التسويق والتتبع"}
                    </span>
                  </>
                ) : activeTab === "templates" ? (
                  <>
                    <LayoutTemplate
                      size={20}
                      style={{ color: "var(--accent)" }}
                    />
                    <span>
                      {state.language === "en"
                        ? "Ready-Made Templates"
                        : state.language === "ar-GCC"
                          ? "القوالب الجاهزة للعمل"
                          : "القوالب الجاهزة"}
                    </span>
                  </>
                ) : activeTab === "library" ? (
                  <>
                    <Library size={20} style={{ color: "#06b6d4" }} />
                    <span>
                      {state.language === "en"
                        ? "Product Library"
                        : state.language === "ar-GCC"
                          ? "مكتبة المنتجات والملفات"
                          : "مكتبة المنتجات"}
                    </span>
                  </>
                ) : (
                  <>
                    <Settings size={20} style={{ color: "var(--accent)" }} />
                    <span>
                      {state.language === "en"
                        ? "Brand Settings"
                        : state.language === "ar-GCC"
                          ? "إعدادات وهوية البراند"
                          : "إعدادات البراند"}
                    </span>
                  </>
                )}
              </h2>
            </div>
            <div
              className="ad-topbar-right"
              style={{ display: "flex", alignItems: "center", gap: "12px" }}
            >
              {/* Support Notifications Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    setIsSupportDropdownOpen(!isSupportDropdownOpen)
                  }
                  style={{
                    background: "var(--bg2)",
                    border: "1px solid var(--line)",
                    padding: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "10px",
                    position: "relative",
                  }}
                  title={
                    state.language === "en"
                      ? "Support Notifications"
                      : "إشعارات الدعم"
                  }
                >
                  <Bell size={18} style={{ color: "var(--text)" }} />
                  {unreadSupportMsgs.length > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        background: "#ef4444",
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "bold",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        animation:
                          "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      }}
                    >
                      {unreadSupportMsgs.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isSupportDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 10px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--bg2)",
                        border: "1px solid var(--line)",
                        borderRadius: "16px",
                        width: "320px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                        zIndex: 9999,
                        overflow: "hidden",
                      }}
                      dir={state.language === "en" ? "ltr" : "rtl"}
                    >
                      <div
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--line)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                          {state.language === "en"
                            ? "Support Notifications"
                            : "إشعارات الدعم"}
                        </span>
                        {unreadSupportMsgs.length > 0 && (
                          <span
                            style={{
                              fontSize: "12px",
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              padding: "2px 8px",
                              borderRadius: "8px",
                              fontWeight: "bold",
                            }}
                          >
                            {unreadSupportMsgs.length}{" "}
                            {state.language === "en" ? "New" : "جديد"}
                          </span>
                        )}
                      </div>

                      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {unreadSupportMsgs.length === 0 ? (
                          <div
                            style={{
                              padding: "30px",
                              textAlign: "center",
                              color: "var(--text2)",
                              fontSize: "13px",
                            }}
                          >
                            {state.language === "en"
                              ? "No new support messages."
                              : "لا توجد رسائل دعم جديدة."}
                          </div>
                        ) : (
                          unreadSupportMsgs.slice(0, 5).map((msg, i) => (
                            <div
                              key={i}
                              style={{
                                padding: "12px 16px",
                                borderBottom: "1px solid var(--line)",
                                display: "flex",
                                gap: "12px",
                                cursor: "pointer",
                                transition: "background 0.2s",
                              }}
                              onClick={() => {
                                setIsSupportDropdownOpen(false);
                                handleSelectTab("support");
                              }}
                            >
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "10px",
                                  background: "rgba(139, 92, 246, 0.15)",
                                  color: "#8b5cf6",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: "bold",
                                  fontSize: "14px",
                                  flexShrink: 0,
                                }}
                              >
                                {msg.authorName?.charAt(0)?.toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "2px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      fontSize: "13px",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      color: "var(--text)",
                                    }}
                                  >
                                    {msg.authorName}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "var(--text2)",
                                    }}
                                  >
                                    {new Date(msg.createdAt).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--text2)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {msg.text ||
                                    (msg.files?.length
                                      ? "Attachment 📎"
                                      : "Voice Message 🎤")}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ padding: "12px" }}>
                        <button
                          onClick={() => {
                            setIsSupportDropdownOpen(false);
                            handleSelectTab("support");
                          }}
                          style={{
                            width: "100%",
                            padding: "10px",
                            background: "var(--accent)",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            fontWeight: "bold",
                            fontSize: "13px",
                            cursor: "pointer",
                            boxSizing: "border-box",
                          }}
                        >
                          {state.language === "en"
                            ? "View All Support Messages"
                            : "الانتقال إلى الدعم"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div style={{ position: "relative" }}>
                <button
                  className="btn btn-sm"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  style={{
                    background: "var(--bg2)",
                    border: "1px solid var(--line)",
                    padding: "6px 14px",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    borderRadius: "10px",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: "14px", lineHeight: 1 }}>
                    {currentLangObj.flag}
                  </span>
                  <span>{currentLangObj.label}</span>
                  <ChevronDown size={14} style={{ color: "var(--text2)" }} />
                </button>
                <AnimatePresence>
                  {isLangDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 10px)",
                        left: state.language === "en" ? 0 : "auto",
                        right: state.language === "en" ? "auto" : 0,
                        background: "var(--bg2)",
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        width: "200px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                        zIndex: 9999,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        padding: "8px",
                      }}
                    >
                      {LANGUAGES.map((item) => (
                        <button
                          key={item.code}
                          onClick={async () => {
                            dispatch({
                              type: "SET_LANGUAGE",
                              payload: item.code,
                            });
                            if (
                              i18n &&
                              typeof i18n.changeLanguage === "function"
                            ) {
                              i18n.changeLanguage(item.code);
                            }
                            setIsLangDropdownOpen(false);
                            try {
                              await setDoc(
                                doc(db, "tenants", "global"),
                                { systemLanguage: item.code },
                                { merge: true },
                              );
                            } catch (e) {
                              console.error(
                                "Failed to sync global language",
                                e,
                              );
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px",
                            borderRadius: "8px",
                            background:
                              state.language === item.code
                                ? "var(--accent)"
                                : "transparent",
                            color:
                              state.language === item.code
                                ? "#fff"
                                : "var(--text)",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ fontSize: "16px" }}>{item.flag}</span>
                          <span style={{ fontWeight: 600 }}>
                            {item.fullLabel}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="ad-brand-badge">
                <div className="ad-brand-dot" />
                <ShieldCheck size={14} />
                <span>{userData?.ownerName || "Admin"}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          {activeTab === "users" ? (
            <div
              className="ad-content animate-in"
              dir={t("admin_dashboard.ltr")}
            >
              {loading ? (
                <div
                  className="ad-loading-wrapper"
                  style={{
                    minHeight: 420,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                    background: "rgba(15, 23, 42, 0.4)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius, 16px)",
                    padding: 40,
                    margin: "20px 0",
                  }}
                >
                  <Loader2
                    size={42}
                    style={{
                      color: "var(--accent)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>
                      {t("admin_dashboard.loading_user_management_data")}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Isolated Brand Banner Card */}
                  <motion.div
                    className="ad-brand-banner"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="ad-banner-content">
                      <div className="ad-banner-avatar">
                        {(userData?.brandName || userData?.ownerName || "A")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="ad-banner-info">
                        <div className="ad-banner-title">
                          {userData?.brandName || "—"}
                          <span className="ad-banner-badge">
                            <ShieldCheck size={12} />
                            {userData?.ownerName || "Admin"}
                          </span>
                        </div>
                        <div className="ad-banner-email">{userData?.email}</div>
                      </div>
                    </div>
                    <div className="ad-banner-status">
                      <div className="ad-status-chip">
                        <Sparkles
                          size={14}
                          style={{ color: "var(--accent)" }}
                        />
                        <span>
                          {userData?.subscription?.status === "stopped"
                            ? t("admin_dashboard.subscription_stopped")
                            : userData?.subscription?.type === "lifetime"
                              ? t("admin_dashboard.lifetime_subscription")
                              : userData?.subscription?.expiryDate
                                ? `${t("admin_dashboard.expires")}${
                                    userData.subscription.expiryDate?.toDate
                                      ? userData.subscription.expiryDate
                                          .toDate()
                                          .toLocaleDateString(
                                            t("admin_dashboard.en_us"),
                                          )
                                      : new Date(
                                          userData.subscription.expiryDate,
                                        ).toLocaleDateString(
                                          t("admin_dashboard.en_us"),
                                        )
                                  }`
                                : t("admin_dashboard.active_account")}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Stats Row */}
                  <div className="ad-stats">
                    <motion.div className="ad-stat-card" whileHover={{ y: -3 }}>
                      <div className="ad-stat-icon-wrapper blue">
                        <Building size={20} />
                      </div>
                      <div className="ad-stat-value">
                        {userData?.brandName || "—"}
                      </div>
                      <div className="ad-stat-label">
                        {t("admin_dashboard.brand")}
                      </div>
                    </motion.div>

                    <motion.div className="ad-stat-card" whileHover={{ y: -3 }}>
                      <div className="ad-stat-icon-wrapper purple">
                        <ShieldCheck size={20} />
                      </div>
                      <div className="ad-stat-value">
                        <AnimatedCounter value={admins.length} />
                      </div>
                      <div className="ad-stat-label">
                        {t("admin_dashboard.admins")}
                      </div>
                    </motion.div>

                    <motion.div className="ad-stat-card" whileHover={{ y: -3 }}>
                      <div className="ad-stat-icon-wrapper green">
                        <UserCheck size={20} />
                      </div>
                      <div className="ad-stat-value">
                        <AnimatedCounter value={regularUsers.length} />
                      </div>
                      <div className="ad-stat-label">
                        {t("admin_dashboard.users")}
                      </div>
                    </motion.div>

                    <motion.div className="ad-stat-card" whileHover={{ y: -3 }}>
                      <div className="ad-stat-icon-wrapper cyan">
                        <Users size={20} />
                      </div>
                      <div className="ad-stat-value">
                        <AnimatedCounter value={users.length} />
                      </div>
                      <div className="ad-stat-label">
                        {t("admin_dashboard.total_accounts")}
                      </div>
                    </motion.div>

                    <motion.div
                      className="ad-stat-card amber-card"
                      whileHover={{ y: -3 }}
                    >
                      <div className="ad-stat-icon-wrapper amber">
                        <Sparkles size={20} />
                      </div>
                      <div className="ad-stat-value" style={{ fontSize: 16 }}>
                        {userData?.subscription?.status === "stopped"
                          ? t("admin_dashboard.stopped")
                          : userData?.subscription?.type === "lifetime"
                            ? t("admin_dashboard.lifetime")
                            : userData?.subscription?.expiryDate
                              ? (() => {
                                  const exp = userData.subscription.expiryDate
                                    ?.toDate
                                    ? userData.subscription.expiryDate.toDate()
                                    : new Date(
                                        userData.subscription.expiryDate,
                                      );
                                  const isExp = exp < new Date();
                                  return isExp
                                    ? t("admin_dashboard.expired")
                                    : exp.toLocaleDateString(
                                        t("admin_dashboard.en_us"),
                                      );
                                })()
                              : "—"}
                      </div>
                      <div className="ad-stat-label">
                        {t("admin_dashboard.subscription_status")}
                      </div>
                    </motion.div>
                  </div>

                  {/* Grid */}
                  <div className="ad-grid">
                    {/* Users Table */}
                    <div
                      className="ad-table-card"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <div
                        className="ad-card-header"
                        style={{ flexWrap: "wrap", gap: "16px" }}
                      >
                        <div className="ad-card-title">
                          <Users size={20} style={{ color: "var(--accent)" }} />
                          <span>{t("admin_dashboard.users_list")}</span>
                          <span className="ad-card-count">
                            {filteredUsers.length}
                          </span>
                        </div>

                        <div
                          className="ad-header-actions"
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Search Box */}
                          <div className="ad-search-box">
                            <Search size={16} />
                            <input
                              type="text"
                              placeholder={t(
                                "admin_dashboard.search_by_name_or_email",
                              )}
                              value={userSearchQuery}
                              onChange={(e) =>
                                setUserSearchQuery(e.target.value)
                              }
                            />
                            {userSearchQuery && (
                              <button
                                className="ad-clear-search"
                                onClick={() => setUserSearchQuery("")}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Filter Toggle */}
                          <button
                            className={`btn btn-sm ${!isFilterCollapsed ? "active-filter" : ""}`}
                            onClick={() =>
                              setIsFilterCollapsed(!isFilterCollapsed)
                            }
                            style={{
                              background: !isFilterCollapsed
                                ? "rgba(59, 130, 246, 0.2)"
                                : "var(--bg3)",
                              border: "1px solid var(--line)",
                              color: !isFilterCollapsed
                                ? "var(--accent)"
                                : "var(--text)",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <SlidersHorizontal size={16} />
                            <span>{t("admin_dashboard.filter")}</span>
                          </button>

                          {/* Export CSV */}
                          <button
                            className="btn btn-sm"
                            onClick={handleExportCSV}
                            style={{
                              background: "rgba(16, 185, 129, 0.1)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              color: "var(--green)",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Download size={16} />
                            <span>{t("admin_dashboard.export_csv")}</span>
                          </button>

                          {/* Add User */}
                          <button
                            className="btn"
                            onClick={() => {
                              cancelEdit();
                              setIsUserModalOpen(true);
                            }}
                            style={{
                              background:
                                "linear-gradient(135deg, var(--accent), #7c3aed)",
                              color: "#fff",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 16px",
                              fontWeight: 700,
                            }}
                          >
                            <UserPlus size={18} />
                            <span>{t("admin_dashboard.add_new_user")}</span>
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Filters Bar */}
                      <AnimatePresence>
                        {!isFilterCollapsed && (
                          <motion.div
                            className="ad-filter-panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div
                              className="ad-filter-grid"
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "16px",
                                alignItems: "end",
                              }}
                            >
                              <div className="ad-filter-item">
                                <CustomSelect
                                  label={t("admin_dashboard.account_role")}
                                  value={roleFilter}
                                  onChange={(val) => setRoleFilter(val)}
                                  icon={Shield}
                                  options={[
                                    {
                                      value: "all",
                                      label: t("admin_dashboard.all_roles"),
                                      icon: Shield,
                                    },
                                    {
                                      value: "admin",
                                      label: t("admin_dashboard.admin"),
                                      icon: ShieldCheck,
                                    },
                                    {
                                      value: "user",
                                      label: t("admin_dashboard.user"),
                                      icon: User,
                                    },
                                  ]}
                                />
                              </div>

                              <div className="ad-filter-item">
                                <CustomSelect
                                  label={t(
                                    "admin_dashboard.subscription_status",
                                  )}
                                  value={subFilter}
                                  onChange={(val) => setSubFilter(val)}
                                  icon={Sparkles}
                                  options={[
                                    {
                                      value: "all",
                                      label: t("admin_dashboard.all_statuses"),
                                      icon: Sparkles,
                                    },
                                    {
                                      value: "active",
                                      label: t(
                                        "admin_dashboard.active_subscription",
                                      ),
                                      icon: CheckCircle2,
                                    },
                                    {
                                      value: "trial",
                                      label: t("admin_dashboard.free_trial"),
                                      icon: Gift,
                                    },
                                    {
                                      value: "lifetime",
                                      label: t("admin_dashboard.lifetime_1"),
                                      icon: Gem,
                                    },
                                    {
                                      value: "stopped",
                                      label: t("admin_dashboard.stopped_1"),
                                      icon: Ban,
                                    },
                                  ]}
                                />
                              </div>

                              <div className="ad-filter-item">
                                <CustomSelect
                                  label={t("admin_dashboard.plan_type")}
                                  value={planFilter}
                                  onChange={(val) => setPlanFilter(val)}
                                  icon={Layers}
                                  options={[
                                    {
                                      value: "all",
                                      label: t("admin_dashboard.all_plans"),
                                      icon: Layers,
                                    },
                                    {
                                      value: "free",
                                      label: t("admin_dashboard.free_plan"),
                                      icon: Gift,
                                    },
                                    ...plans.map((p) => ({
                                      value: p.id.toString(),
                                      label:
                                        state.language === "en"
                                          ? p.name_en || p.name
                                          : p.name_ar || p.name,
                                      icon: Sparkles,
                                    })),
                                  ]}
                                />
                              </div>

                              <div className="ad-filter-item">
                                <CustomSelect
                                  label={t("admin_dashboard.time_filter")}
                                  value={timeFilter}
                                  onChange={(val) => setTimeFilter(val)}
                                  icon={Calendar}
                                  options={[
                                    {
                                      value: "all",
                                      label: t("admin_dashboard.all_time"),
                                      icon: Calendar,
                                    },
                                    {
                                      value: "today",
                                      label: t("admin_dashboard.today"),
                                      icon: Clock,
                                    },
                                    {
                                      value: "yesterday",
                                      label: t("admin_dashboard.yesterday"),
                                      icon: Clock,
                                    },
                                    {
                                      value: "last7days",
                                      label: t("admin_dashboard.last_7_days"),
                                      icon: Calendar,
                                    },
                                    {
                                      value: "thisMonth",
                                      label: t("admin_dashboard.this_month"),
                                      icon: Calendar,
                                    },
                                    {
                                      value: "custom",
                                      label: t("admin_dashboard.custom_range"),
                                      icon: Calendar,
                                    },
                                  ]}
                                />
                              </div>

                              <div className="ad-filter-item">
                                <button
                                  className="btn btn-sm"
                                  onClick={() => {
                                    setRoleFilter("all");
                                    setSubFilter("all");
                                    setPlanFilter("all");
                                    setTimeFilter("all");
                                    setStartDateFilter("");
                                    setEndDateFilter("");
                                    setUserSearchQuery("");
                                  }}
                                  style={{
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.2)",
                                    color: "var(--red)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    width: "100%",
                                    height: 42,
                                    borderRadius: 12,
                                    fontWeight: 600,
                                    justifyContent: "center",
                                  }}
                                >
                                  <RotateCcw size={15} />
                                  <span>
                                    {t("admin_dashboard.reset_filters")}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Custom Date Range Selector Row */}
                            <AnimatePresence>
                              {timeFilter === "custom" && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0, y: -8 }}
                                  animate={{ opacity: 1, height: "auto", y: 0 }}
                                  exit={{ opacity: 0, height: 0, y: -8 }}
                                  transition={{ duration: 0.25 }}
                                  style={{
                                    marginTop: "16px",
                                    padding: "16px 20px",
                                    background: "rgba(59, 130, 246, 0.06)",
                                    border:
                                      "1px solid rgba(59, 130, 246, 0.25)",
                                    borderRadius: "14px",
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "16px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "14px",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontSize: "13px",
                                        fontWeight: "800",
                                        color: "#60A5FA",
                                      }}
                                    >
                                      <Calendar size={16} />
                                      <span>
                                        {t("admin_dashboard.select_date_range")}
                                      </span>
                                    </div>

                                    {/* From Date */}
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <label
                                        style={{
                                          fontSize: "12px",
                                          fontWeight: "700",
                                          color: "var(--text2, #94A3B8)",
                                        }}
                                      >
                                        {t("admin_dashboard.from")}
                                      </label>
                                      <input
                                        type="date"
                                        value={startDateFilter}
                                        onChange={(e) =>
                                          setStartDateFilter(e.target.value)
                                        }
                                        style={{
                                          background: "rgba(0, 0, 0, 0.5)",
                                          border:
                                            "1px solid rgba(255, 255, 255, 0.15)",
                                          borderRadius: "10px",
                                          color: "#FFFFFF",
                                          padding: "8px 14px",
                                          fontSize: "13px",
                                          fontWeight: "700",
                                          outline: "none",
                                          colorScheme: "dark",
                                        }}
                                      />
                                    </div>

                                    {/* To Date */}
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <label
                                        style={{
                                          fontSize: "12px",
                                          fontWeight: "700",
                                          color: "var(--text2, #94A3B8)",
                                        }}
                                      >
                                        {t("admin_dashboard.to")}
                                      </label>
                                      <input
                                        type="date"
                                        value={endDateFilter}
                                        onChange={(e) =>
                                          setEndDateFilter(e.target.value)
                                        }
                                        style={{
                                          background: "rgba(0, 0, 0, 0.5)",
                                          border:
                                            "1px solid rgba(255, 255, 255, 0.15)",
                                          borderRadius: "10px",
                                          color: "#FFFFFF",
                                          padding: "8px 14px",
                                          fontSize: "13px",
                                          fontWeight: "700",
                                          outline: "none",
                                          colorScheme: "dark",
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Clear Dates Action Button */}
                                  {(startDateFilter || endDateFilter) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStartDateFilter("");
                                        setEndDateFilter("");
                                      }}
                                      style={{
                                        background: "rgba(255, 255, 255, 0.08)",
                                        border:
                                          "1px solid rgba(255, 255, 255, 0.15)",
                                        color: "#E2E8F0",
                                        borderRadius: "8px",
                                        padding: "6px 12px",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <RotateCcw size={12} />
                                      <span>
                                        {t("admin_dashboard.clear_dates")}
                                      </span>
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {loading ? (
                        <div
                          className="ad-empty"
                          style={{ padding: "60px 20px" }}
                        >
                          <div
                            className="ad-submit-spinner"
                            style={{
                              width: 28,
                              height: 28,
                              margin: "0 auto 16px auto",
                              borderWidth: 3,
                            }}
                          />
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--text2)",
                              fontWeight: 600,
                            }}
                          >
                            {t("admin_dashboard.loading_users_data")}
                          </div>
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div
                          className="ad-empty"
                          style={{ padding: "60px 20px" }}
                        >
                          <div className="ad-empty-icon">
                            <User size={42} style={{ opacity: 0.4 }} />
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              marginTop: 10,
                              color: "var(--text)",
                            }}
                          >
                            {t("admin_dashboard.no_users_found")}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text3)",
                              marginTop: 4,
                            }}
                          >
                            {t(
                              "admin_dashboard.try_adjusting_your_search_or_filter",
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="ad-table-wrapper" dir="rtl">
                            <table className="ad-table" dir="rtl">
                              <thead>
                                <tr>
                                  <th>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <User size={14} />
                                      <span>
                                        {t("admin_dashboard.user_name")}
                                      </span>
                                    </div>
                                  </th>
                                  <th>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <Mail size={14} />
                                      <span>{t("admin_dashboard.email")}</span>
                                    </div>
                                  </th>
                                  <th>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <Layers size={14} />
                                      <span>{t("admin_dashboard.plan")}</span>
                                    </div>
                                  </th>
                                  <th>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <Sparkles size={14} />
                                      <span>
                                        {t("admin_dashboard.subscription")}
                                      </span>
                                    </div>
                                  </th>
                                  <th>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <Shield size={14} />
                                      <span>{t("admin_dashboard.role")}</span>
                                    </div>
                                  </th>
                                  <th>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <Activity size={14} />
                                      <span>
                                        {t("admin_dashboard.progress")}
                                      </span>
                                    </div>
                                  </th>
                                  <th>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <Calendar size={14} />
                                      <span>{t("admin_dashboard.date")}</span>
                                    </div>
                                  </th>
                                  <th style={{ textAlign: "center" }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <SlidersHorizontal size={14} />
                                      <span>
                                        {t("admin_dashboard.actions")}
                                      </span>
                                    </div>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedUsers.map((u) => (
                                  <tr key={u.id}>
                                    <td>
                                      <div className="ad-user-name">
                                        <div
                                          className="ad-user-avatar"
                                          style={
                                            u.photoURL
                                              ? {
                                                  background: `url("${u.photoURL}") center/cover no-repeat`,
                                                  border:
                                                    "1px solid rgba(255,255,255,0.1)",
                                                }
                                              : {}
                                          }
                                        >
                                          {!u.photoURL &&
                                            (u.ownerName || u.email || "?")
                                              .charAt(0)
                                              .toUpperCase()}
                                        </div>
                                        <span>{u.ownerName || "—"}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="ad-user-email">
                                        {u.email}
                                      </span>
                                    </td>
                                    <td>
                                      {(() => {
                                        const pName =
                                          u.subscription?.planName ||
                                          u.planName ||
                                          "Free";
                                        const foundPlan = plans.find(
                                          (p) =>
                                            p.name === pName ||
                                            p.name_ar === pName ||
                                            p.name_en === pName,
                                        );
                                        const displayName =
                                          state.language === "en"
                                            ? foundPlan?.name_en ||
                                              foundPlan?.name ||
                                              pName
                                            : foundPlan?.name_ar ||
                                              foundPlan?.name ||
                                              pName;
                                        const isFree =
                                          pName
                                            .toLowerCase()
                                            .includes("free") ||
                                          pName === "مجانية";

                                        return (
                                          <div
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "6px",
                                              padding: "4px 10px",
                                              borderRadius: "20px",
                                              background: isFree
                                                ? "rgba(255, 255, 255, 0.05)"
                                                : "rgba(16, 185, 129, 0.1)",
                                              border: isFree
                                                ? "1px solid var(--line)"
                                                : "1px solid rgba(16, 185, 129, 0.3)",
                                              color: isFree
                                                ? "var(--text1)"
                                                : "#10B981",
                                              fontSize: "12px",
                                              fontWeight: "600",
                                              boxShadow: isFree
                                                ? "none"
                                                : "0 0 10px rgba(16, 185, 129, 0.1)",
                                            }}
                                          >
                                            <Database size={12} />
                                            <span>{displayName}</span>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td>
                                      {u.subscription?.status === "stopped" ? (
                                        <span
                                          style={{
                                            color: "var(--red)",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                          }}
                                        >
                                          <XCircle size={13} />{" "}
                                          {t("admin_dashboard.stopped_1")}
                                        </span>
                                      ) : u.subscription?.type ===
                                        "lifetime" ? (
                                        <span
                                          style={{
                                            color: "var(--accent)",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                          }}
                                        >
                                          <Sparkles size={13} />{" "}
                                          {t("admin_dashboard.lifetime_1")}
                                        </span>
                                      ) : u.subscription?.type === "trial" &&
                                        (!u.planId ||
                                          u.planId === "free" ||
                                          u.planId === "trial" ||
                                          u.planId === "free_trial") ? (
                                        (() => {
                                          const exp = u.subscription.expiryDate
                                            ?.toDate
                                            ? u.subscription.expiryDate.toDate()
                                            : u.subscription?.expiryDate
                                              ? new Date(
                                                  u.subscription.expiryDate,
                                                )
                                              : null;
                                          const isExp = exp && exp < new Date();
                                          return (
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                              }}
                                            >
                                              <span
                                                style={{
                                                  color: isExp
                                                    ? "var(--red)"
                                                    : "var(--accent)",
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: 4,
                                                }}
                                              >
                                                <Gift size={12} />{" "}
                                                {state.language === "en"
                                                  ? `Trial ${isExp ? "(Expired)" : "(Active)"}`
                                                  : `فترة مجانية ${isExp ? "(منتهية)" : "(نشطة)"}`}
                                              </span>
                                              {exp && (
                                                <span
                                                  style={{
                                                    fontSize: 9,
                                                    color: "var(--text3)",
                                                  }}
                                                >
                                                  {exp.toLocaleDateString(
                                                    t("admin_dashboard.en_us"),
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })()
                                      ) : u.subscription?.expiryDate ? (
                                        (() => {
                                          const exp = u.subscription.expiryDate
                                            ?.toDate
                                            ? u.subscription.expiryDate.toDate()
                                            : new Date(
                                                u.subscription.expiryDate,
                                              );
                                          const isExp = exp < new Date();
                                          return (
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                              }}
                                            >
                                              <span
                                                style={{
                                                  color: isExp
                                                    ? "var(--red)"
                                                    : "var(--green)",
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: 4,
                                                }}
                                              >
                                                {isExp ? (
                                                  <Clock size={12} />
                                                ) : (
                                                  <CheckCircle2 size={12} />
                                                )}{" "}
                                                {isExp
                                                  ? t(
                                                      "admin_dashboard.expired_1",
                                                    )
                                                  : t("admin_dashboard.active")}
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: 9,
                                                  color: "var(--text3)",
                                                }}
                                              >
                                                {exp.toLocaleDateString(
                                                  t("admin_dashboard.en_us"),
                                                )}
                                              </span>
                                            </div>
                                          );
                                        })()
                                      ) : (
                                        <span
                                          style={{
                                            color: "var(--text3)",
                                            fontSize: 10,
                                          }}
                                        >
                                          —
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      <span
                                        className={`ad-role-badge ${u.role === "admin" ? "ad-role-admin" : "ad-role-user"}`}
                                      >
                                        {u.role === "admin" ? (
                                          <>
                                            <ShieldCheck size={12} />{" "}
                                            {t("admin_dashboard.admin")}
                                          </>
                                        ) : (
                                          <>
                                            <User size={12} />{" "}
                                            {t("admin_dashboard.user")}
                                          </>
                                        )}
                                      </span>
                                    </td>
                                    <td>
                                      <div
                                        style={{
                                          flex: 1,
                                          height: 5,
                                          background: "rgba(255,255,255,0.06)",
                                          borderRadius: 4,
                                          overflow: "hidden",
                                          marginBottom: 4,
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: `${Math.round(((u.appState?.completedSteps?.length || 0) / totalSteps) * 100)}%`,
                                            height: "100%",
                                            background: "var(--accent)",
                                          }}
                                        />
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 9,
                                          color: "var(--text3)",
                                        }}
                                      >
                                        {u.appState?.completedSteps?.length ||
                                          0}{" "}
                                        / {TOTAL_STEPS_COUNT}
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        className="ad-date"
                                        style={{ fontFamily: "var(--font)" }}
                                      >
                                        {formatDate(u.createdAt)}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: 6,
                                          justifyContent: "center",
                                        }}
                                      >
                                        <motion.button
                                          className="sa-action-btn view"
                                          onClick={() =>
                                            setViewingUserDetails(u)
                                          }
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          title={t(
                                            "admin_dashboard.view_details",
                                          )}
                                        >
                                          <Eye size={15} />
                                        </motion.button>
                                        <motion.button
                                          className="sa-action-btn edit"
                                          onClick={() => handleEditClick(u)}
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          title={t("admin_dashboard.edit_user")}
                                        >
                                          <Edit size={15} />
                                        </motion.button>
                                        <motion.button
                                          className="sa-action-btn view"
                                          onClick={() => {
                                            setRenewPlanUser(u);
                                            setRenewPlanId(u.planId || "free");
                                          }}
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          title={t(
                                            "admin_dashboard.renew_plan",
                                          )}
                                          style={{ color: "#10B981" }}
                                        >
                                          <RefreshCw size={15} />
                                        </motion.button>
                                        <motion.button
                                          className="sa-action-btn delete"
                                          onClick={() => setUserToDelete(u)}
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          title={t(
                                            "admin_dashboard.delete_user",
                                          )}
                                        >
                                          <Trash2 size={15} />
                                        </motion.button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination Bar */}
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeTab === "sales" ? (
            <div className="ad-content animate-in">
              <AdminSales subUsers={regularUsers} />
            </div>
          ) : activeTab === "subscriptions" ||
            activeTab === "trial_settings" ? (
            <motion.div
              className="ad-content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Sub-Tabs Navigation */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--bg)",
                  padding: "6px",
                  borderRadius: "14px",
                  border: "1px solid var(--line)",
                  marginBottom: "20px",
                  width: "fit-content",
                }}
              >
                {[
                  {
                    id: "subscriptions",
                    label_ar: "الخطط والأسعار",
                    label_en: "Plans Overview",
                    icon: Tag,
                  },
                  {
                    id: "trial_settings",
                    label_ar: "إعدادات الفترة التجريبية",
                    label_en: "Free Trial Settings",
                    icon: Gift,
                  },
                ].map((tab) => {
                  const isActiveSub = activeTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        border: "none",
                        background: isActiveSub
                          ? "var(--accent)"
                          : "transparent",
                        color: isActiveSub ? "#fff" : "var(--text)",
                        fontWeight: isActiveSub ? "600" : "500",
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <TabIcon size={15} />
                      <span>
                        {state.language === "en"
                          ? tab.label_en
                          : tab.id === "subscriptions"
                            ? t("admin_dashboard.plans_overview")
                            : t("admin_dashboard.trial_settings_tab")}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeTab === "subscriptions" && (
                <>
                  <div className="ad-table-card">
                    {/* Header section with title and action buttons */}
                    <div
                      className="sa-card-header"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div
                          className="sa-card-title"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Gem size={20} style={{ color: "var(--accent)" }} />
                          <span>
                            {t("admin_dashboard.your_subscription_plans")}
                          </span>
                          <span className="sa-card-count">
                            {filteredPlans.length}
                          </span>
                        </div>

                        <div
                          className="sa-filter-group"
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Add New Plan */}
                          <button
                            type="button"
                            className="sa-add-prod-btn"
                            onClick={() => {
                              setEditingPlan(null);
                              setPlanName("");
                              setPlanNameEn("");
                              setPlanPrice("");
                              setPlanCredits("20");
                              setPlanCurrency("EGP");
                              setPlanDisplayOnWebsite(true);
                              setPlanBillingCycle("monthly");
                              setPlanBadgeAr("");
                              setPlanBadgeEn("");
                              setPlanCtaAr("");
                              setPlanCtaEn("");
                              setPlanAllowedTools([]);
                              setDynamicFeaturesAr([""]);
                              setDynamicFeaturesEn([""]);
                              setIsPlanModalOpen(true);
                            }}
                          >
                            <PlusCircle size={15} />
                            <span>{t("admin_dashboard.add_new_plan")}</span>
                          </button>

                          {/* Export CSV */}
                          <button
                            type="button"
                            className="sa-export-btn"
                            onClick={() => {
                              let csvContent = "\uFEFF";
                              csvContent +=
                                "اسم الباقة,Name (EN),السعر,العملة,المميزات (عربي),Features (EN),Stripe ID\n";
                              filteredPlans.forEach((p) => {
                                const nameAr = p.name_ar || p.name || "—";
                                const nameEn = p.name_en || "—";
                                const price = p.price || 0;
                                const curr = p.currency || "EGP";
                                const featAr =
                                  typeof (p.features_ar || p.features) ===
                                  "string"
                                    ? (p.features_ar || p.features).replace(
                                        /\n/g,
                                        " • ",
                                      )
                                    : Array.isArray(p.features_ar || p.features)
                                      ? (p.features_ar || p.features).join(
                                          " • ",
                                        )
                                      : "—";
                                const featEn =
                                  typeof p.features_en === "string"
                                    ? p.features_en.replace(/\n/g, " • ")
                                    : Array.isArray(p.features_en)
                                      ? p.features_en.join(" • ")
                                      : "—";
                                const stripeId =
                                  p.stripe_product_id || "غير متزامن";
                                csvContent += `"${nameAr}","${nameEn}","${price}","${curr}","${featAr}","${featEn}","${stripeId}"\n`;
                              });
                              const blob = new Blob([csvContent], {
                                type: "text/csv;charset=utf-8;",
                              });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.setAttribute("href", url);
                              link.setAttribute(
                                "download",
                                `subscription_plans_${new Date().toISOString().slice(0, 10)}.csv`,
                              );
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            title={t("admin_dashboard.export_to_csv")}
                          >
                            <Download size={15} />
                            <span>{t("admin_dashboard.export_csv")}</span>
                          </button>

                          {/* Reset Filters */}
                          {(plansSearchQuery !== "" ||
                            plansCurrencyFilter !== "all") && (
                            <button
                              type="button"
                              className="sa-reset-btn"
                              onClick={() => {
                                setPlansSearchQuery("");
                                setPlansCurrencyFilter("all");
                              }}
                              title={t("admin_dashboard.reset_filters")}
                            >
                              <RotateCcw size={14} />
                              <span>{t("admin_dashboard.reset")}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Search and Filters Bar */}
                      <div
                        className="sa-filters-bar"
                        style={{
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                          width: "100%",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div className="sa-filters-left">
                          <CustomSelect
                            value={plansCurrencyFilter}
                            onChange={setPlansCurrencyFilter}
                            options={[
                              {
                                value: "all",
                                label: t("admin_dashboard.all_currencies"),
                                icon: Globe,
                              },
                              {
                                value: "EGP",
                                label: t("admin_dashboard.egp"),
                                icon: DollarSign,
                              },
                              {
                                value: "USD",
                                label: t("admin_dashboard.usd"),
                                icon: DollarSign,
                              },
                              {
                                value: "SAR",
                                label: t("admin_dashboard.sar"),
                                icon: DollarSign,
                              },
                              {
                                value: "AED",
                                label: t("admin_dashboard.aed"),
                                icon: DollarSign,
                              },
                              {
                                value: "KWD",
                                label: t("admin_dashboard.kwd"),
                                icon: DollarSign,
                              },
                              {
                                value: "EUR",
                                label: t("admin_dashboard.eur"),
                                icon: DollarSign,
                              },
                            ]}
                          />
                        </div>
                        <div
                          className="sa-filters-right"
                          style={{ flex: "1 1 250px", maxWidth: 400 }}
                        >
                          <div
                            className="sa-search-box"
                            style={{
                              margin: 0,
                              position: "relative",
                              width: "100%",
                            }}
                          >
                            <input
                              type="text"
                              placeholder={t("admin_dashboard.search_plans")}
                              value={plansSearchQuery}
                              onChange={(e) =>
                                setPlansSearchQuery(e.target.value)
                              }
                              dir={t("admin_dashboard.ltr")}
                              style={{
                                width: "100%",
                                paddingRight: state.language === "en" ? 12 : 32,
                                paddingLeft: state.language === "en" ? 32 : 12,
                              }}
                            />
                            <Search
                              size={14}
                              style={{
                                position: "absolute",
                                right: state.language === "en" ? "auto" : 12,
                                left: state.language === "en" ? 12 : "auto",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--text3)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Plans Table Section */}
                    <div className="sa-table-wrapper" dir="rtl">
                      <table className="sa-table" dir="rtl">
                        <thead>
                          <tr>
                            <th style={{ textAlign: "center" }}>
                              {t("admin_dashboard.plan_name")}
                            </th>
                            <th style={{ textAlign: "center" }}>
                              {t("admin_dashboard.price_currency")}
                            </th>
                            <th style={{ textAlign: "center" }}>
                              {t("admin_dashboard.credits")}
                            </th>
                            <th style={{ textAlign: "center" }}>
                              {t("admin_dashboard.features")}
                            </th>
                            <th style={{ textAlign: "center" }}>
                              {t("admin_dashboard.actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPlans.map((p) => {
                            const featArList =
                              typeof (p.features_ar || p.features) === "string"
                                ? (p.features_ar || p.features)
                                    .split("\n")
                                    .filter(Boolean)
                                : Array.isArray(p.features_ar || p.features)
                                  ? p.features_ar || p.features
                                  : [];
                            const featEnList =
                              typeof p.features_en === "string"
                                ? p.features_en.split("\n").filter(Boolean)
                                : Array.isArray(p.features_en)
                                  ? p.features_en
                                  : [];
                            const totalFeatsCount = Math.max(
                              featArList.length,
                              featEnList.length,
                            );

                            return (
                              <tr key={p.id}>
                                <td style={{ textAlign: "center" }}>
                                  <div
                                    style={{
                                      fontWeight: "bold",
                                      color: "#fff",
                                      fontSize: 14,
                                    }}
                                  >
                                    {state.language === "en"
                                      ? p.name_en || p.name_ar || p.name
                                      : p.name_ar || p.name}
                                  </div>
                                  {state.language !== "en" && p.name_en && (
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: "var(--text3)",
                                        marginTop: 2,
                                      }}
                                    >
                                      {p.name_en}
                                    </div>
                                  )}

                                  {p.stripe_product_id ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                        marginTop: 6,
                                        alignItems: "center",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 10,
                                          color: "var(--green)",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        ✓ {t("admin_dashboard.stripe_synced")}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 8,
                                          color: "var(--text3)",
                                          fontFamily: "monospace",
                                        }}
                                      >
                                        Prod ID: {p.stripe_product_id}
                                      </div>
                                    </div>
                                  ) : null}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <span
                                    style={{
                                      color: "var(--green)",
                                      fontWeight: 800,
                                      fontSize: 14,
                                    }}
                                  >
                                    {p.price}{" "}
                                    {p.currency === "USD"
                                      ? "$"
                                      : p.currency === "SAR"
                                        ? "ر.س"
                                        : p.currency === "AED"
                                          ? "د.إ"
                                          : p.currency === "KWD"
                                            ? "د.ك"
                                            : "ج.م"}
                                  </span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <span
                                    style={{
                                      color: "var(--accent)",
                                      fontWeight: 800,
                                      fontSize: 14,
                                    }}
                                  >
                                    {p.creditsPerMonth || 0}
                                  </span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    className="sa-media-badge sa-media-badge-auto"
                                    onClick={() =>
                                      setViewingPlanFeatures({
                                        ...p,
                                        featArList,
                                        featEnList,
                                      })
                                    }
                                    title={t(
                                      "admin_dashboard.click_to_view_features",
                                    )}
                                    style={{
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      margin: "0 auto",
                                    }}
                                  >
                                    <Sparkles
                                      size={12}
                                      style={{ color: "var(--accent)" }}
                                    />
                                    <span>
                                      {state.language === "en"
                                        ? `${totalFeatsCount} ${totalFeatsCount === 1 ? "Feature" : "Features"}`
                                        : `${totalFeatsCount} مميزات`}
                                    </span>
                                    <Eye size={12} style={{ opacity: 0.8 }} />
                                  </button>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 6,
                                      justifyContent: "center",
                                      alignItems: "center",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline sa-action-btn"
                                      title={t("admin_dashboard.edit_plan")}
                                      onClick={() => {
                                        setEditingPlan(p);
                                        setPlanName(p.name_ar || p.name || "");
                                        setPlanNameEn(p.name_en || "");
                                        setPlanPrice(p.price || "");
                                        setPlanCredits(
                                          p.creditsPerMonth || "20",
                                        );
                                        setPlanCurrency(p.currency || "EGP");
                                        setPlanDisplayOnWebsite(
                                          p.displayOnWebsite !== false,
                                        );
                                        setPlanBillingCycle(
                                          p.billingCycle || "monthly",
                                        );
                                        setPlanBadgeAr(p.badge_ar || "");
                                        setPlanBadgeEn(p.badge_en || "");
                                        setPlanCtaAr(p.cta_ar || "");
                                        setPlanCtaEn(p.cta_en || "");
                                        setPlanAllowedTools(
                                          p.allowedTools || [],
                                        );
                                        setDynamicFeaturesAr(
                                          featArList.length > 0
                                            ? featArList
                                            : [""],
                                        );
                                        setDynamicFeaturesEn(
                                          featEnList.length > 0
                                            ? featEnList
                                            : [""],
                                        );
                                        setIsPlanModalOpen(true);
                                      }}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="sa-delete-btn btn-xs sa-action-btn"
                                      title={t("admin_dashboard.delete_plan")}
                                      onClick={async () => {
                                        const planLabel =
                                          p.name_ar || p.name || p.name_en;
                                        const isConfirmed = await confirm(
                                          state.language === "en"
                                            ? `Are you sure you want to delete the plan "${planLabel}"?`
                                            : `هل أنت تأكد من حذف الباقة "${planLabel}"؟`,
                                          t("admin_dashboard.confirm_delete"),
                                        );
                                        if (!isConfirmed) return;
                                        const updatedPlans = plans.filter(
                                          (pl) => pl.id !== p.id,
                                        );
                                        setPlans(updatedPlans);
                                        // Push the updated plans list to Firestore
                                        handleUpdateAdminProfile(updatedPlans);
                                        toast(
                                          t(
                                            "admin_dashboard.plan_deleted_successfully",
                                          ),
                                          "success",
                                        );
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {paginatedPlans.length === 0 && (
                            <tr>
                              <td
                                colSpan="4"
                                style={{
                                  padding: "40px 0",
                                  textAlign: "center",
                                }}
                              >
                                <div
                                  className="sa-empty"
                                  style={{
                                    background: "none",
                                    boxShadow: "none",
                                    padding: 0,
                                  }}
                                >
                                  <div
                                    className="sa-empty-icon"
                                    style={{
                                      background: "none",
                                      fontSize: "inherit",
                                      padding: 0,
                                    }}
                                  >
                                    <Gem
                                      size={48}
                                      style={{
                                        color: "var(--text3)",
                                        opacity: 0.6,
                                      }}
                                    />
                                  </div>
                                  <div
                                    style={{
                                      marginTop: 12,
                                      color: "var(--text2)",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {t(
                                      "admin_dashboard.no_subscription_plans_found",
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Component */}
                    <Pagination
                      currentPage={plansCurrentPage}
                      totalPages={totalPlansPages}
                      onPageChange={setPlansCurrentPage}
                      totalItems={filteredPlans.length}
                      itemsPerPage={6}
                      itemLabel={t("admin_dashboard.plans")}
                    />
                  </div>

                  {/* Save All Changes Button */}
                  <div
                    style={{
                      marginTop: 24,
                      textAlign: "center",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      className="ad-submit-btn"
                      style={{
                        width: "auto",
                        minWidth: 260,
                        padding: "12px 28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                      onClick={handleUpdateAdminProfile}
                      disabled={isUpdatingProfile}
                    >
                      <Save size={16} />
                      <span>
                        {isUpdatingProfile
                          ? t("admin_dashboard.saving")
                          : t("admin_dashboard.save_plans_changes")}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {activeTab === "trial_settings" && (
                <div
                  className="ad-content animate-in"
                  dir={t("admin_dashboard.ltr")}
                  style={{ textAlign: t("admin_dashboard.left") }}
                >
                  <div
                    className="ad-grid"
                    style={{ gridTemplateColumns: "1fr" }}
                  >
                    <div
                      className="ad-table-card"
                      style={{ padding: "24px", position: "relative" }}
                    >
                      {/* Header Bar */}
                      <div
                        className="ad-card-header"
                        style={{
                          marginBottom: "24px",
                          borderBottom: "1px solid var(--line)",
                          paddingBottom: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <div
                            className="ad-card-title"
                            style={{
                              fontSize: "20px",
                              fontWeight: "900",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <Gift
                              size={22}
                              style={{ color: "var(--accent)" }}
                            />
                            <span>
                              {t("admin_dashboard.free_trial_settings")}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text3)",
                              marginTop: "4px",
                            }}
                          >
                            {t(
                              "admin_dashboard.configure_trial_duration_tool_permi",
                            )}
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setIsTrialPreviewModalOpen(true)}
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            color: "var(--accent)",
                            padding: "10px 20px",
                            borderRadius: "12px",
                            fontWeight: "800",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            boxShadow: "0 4px 15px rgba(59, 130, 246, 0.15)",
                            cursor: "pointer",
                          }}
                        >
                          <Eye size={18} />
                          <span>
                            {t("admin_dashboard.client_experience_preview")}
                          </span>
                        </motion.button>
                      </div>

                      {/* Top Summary Stats Cards */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: "16px",
                          marginBottom: "24px",
                        }}
                      >
                        {/* Stat 1: Active Trial Users */}
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -4, scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)",
                            border: "1px solid rgba(16, 185, 129, 0.25)",
                            borderRadius: "16px",
                            padding: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                          }}
                        >
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: "14px",
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <UserCheck
                              size={26}
                              style={{ color: "var(--green)" }}
                            />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text2)",
                                fontWeight: "700",
                              }}
                            >
                              {t("admin_dashboard.active_trial_users")}
                            </div>
                            <div
                              style={{
                                fontSize: "26px",
                                fontWeight: "900",
                                color: "#fff",
                                marginTop: "2px",
                              }}
                            >
                              <AnimatedCounter value={activeTrialUsersCount} />
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--green)",
                                fontWeight: "600",
                                marginTop: "2px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <CheckCircle2
                                size={12}
                                style={{ color: "var(--green)" }}
                              />
                              <span>
                                {t(
                                  "admin_dashboard.currently_active_in_free_trial",
                                )}
                              </span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Stat 2: Expired Trial Users */}
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -4, scale: 1.01 }}
                          transition={{ duration: 0.2, delay: 0.05 }}
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            borderRadius: "16px",
                            padding: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                          }}
                        >
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: "14px",
                              background: "rgba(245, 158, 11, 0.15)",
                              border: "1px solid rgba(245, 158, 11, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Clock
                              size={26}
                              style={{ color: "var(--amber, #f59e0b)" }}
                            />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text2)",
                                fontWeight: "700",
                              }}
                            >
                              {t("admin_dashboard.expired_trial_users")}
                            </div>
                            <div
                              style={{
                                fontSize: "26px",
                                fontWeight: "900",
                                color: "#fff",
                                marginTop: "2px",
                              }}
                            >
                              <AnimatedCounter value={expiredTrialUsersCount} />
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--amber, #f59e0b)",
                                fontWeight: "600",
                                marginTop: "2px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Clock
                                size={12}
                                style={{ color: "var(--amber, #f59e0b)" }}
                              />
                              <span>
                                {t("admin_dashboard.expired_unconverted")}
                              </span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Stat 3: Active Allowed Tools Count */}
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -4, scale: 1.01 }}
                          transition={{ duration: 0.2, delay: 0.1 }}
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)",
                            border: "1px solid rgba(59, 130, 246, 0.25)",
                            borderRadius: "16px",
                            padding: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                          }}
                        >
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: "14px",
                              background: "rgba(59, 130, 246, 0.15)",
                              border: "1px solid rgba(59, 130, 246, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Sparkles
                              size={26}
                              style={{ color: "var(--accent)" }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text2)",
                                fontWeight: "700",
                              }}
                            >
                              {t("admin_dashboard.available_trial_tools")}
                            </div>
                            <div
                              style={{
                                fontSize: "26px",
                                fontWeight: "900",
                                color: "#fff",
                                marginTop: "2px",
                              }}
                            >
                              <AnimatedCounter
                                value={
                                  Array.from(new Set(allowedTrialTools)).filter(
                                    (id) =>
                                      CHECKLIST_ITEMS.some((i) => i.id === id),
                                  ).length
                                }
                              />{" "}
                              / {CHECKLIST_ITEMS.length}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "6px",
                                marginTop: "4px",
                              }}
                            >
                              {[
                                {
                                  label: t("admin_dashboard.niche_analyzer"),
                                },
                                {
                                  label: t("admin_dashboard.competitors"),
                                },
                                {
                                  label: t("admin_dashboard.ad_copy"),
                                },
                              ].map((t, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: "700",
                                    background: "rgba(59, 130, 246, 0.12)",
                                    color: "var(--accent)",
                                    border:
                                      "1px solid rgba(59, 130, 246, 0.25)",
                                    padding: "2px 6px",
                                    borderRadius: "10px",
                                  }}
                                >
                                  {t.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      <div className="ad-form-body" style={{ padding: 0 }}>
                        {/* Enable Free Trial Toggle */}
                        <div
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            padding: "24px",
                            borderRadius: "16px",
                            border: "1px solid var(--line)",
                            marginBottom: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <Gift
                              size={20}
                              style={{ color: "var(--accent)" }}
                            />
                            <div>
                              <div
                                style={{
                                  fontSize: "15px",
                                  fontWeight: "800",
                                  color: "#fff",
                                }}
                              >
                                {t(
                                  "admin_dashboard.enable_free_trial_for_new_users",
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text3)",
                                }}
                              >
                                {t(
                                  "admin_dashboard.turn_on_or_off_the_free_trial_featu",
                                )}
                              </div>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setEnableFreeTrial(!enableFreeTrial)}
                            style={{
                              width: 48,
                              height: 24,
                              borderRadius: 12,
                              background: enableFreeTrial
                                ? "var(--green)"
                                : "rgba(255, 255, 255, 0.1)",
                              position: "relative",
                              cursor: "pointer",
                              border: "none",
                            }}
                          >
                            <motion.div
                              animate={{ left: enableFreeTrial ? 26 : 2 }}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: "#fff",
                                position: "absolute",
                                top: 2,
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                              }}
                            />
                          </motion.button>
                        </div>

                        {/* Bilingual Metadata */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                            marginBottom: 24,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 16,
                            }}
                          >
                            <div className="field">
                              <label
                                className="field-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Tag
                                  size={14}
                                  style={{ color: "var(--accent)" }}
                                />
                                <span>
                                  {t("admin_dashboard.plan_name_arabic")}
                                </span>
                              </label>
                              <input
                                className="field-input"
                                value={trialPlanNameAr}
                                onChange={(e) =>
                                  setTrialPlanNameAr(e.target.value)
                                }
                                placeholder={t(
                                  "admin_dashboard.e_g_free_trial",
                                )}
                                dir={t("admin_dashboard.ltr")}
                                style={{ textAlign: t("admin_dashboard.left") }}
                              />
                            </div>
                            <div className="field">
                              <label
                                className="field-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Tag
                                  size={14}
                                  style={{ color: "var(--accent)" }}
                                />
                                <span>
                                  {t("admin_dashboard.plan_name_english")}
                                </span>
                              </label>
                              <input
                                className="field-input"
                                value={trialPlanNameEn}
                                onChange={(e) =>
                                  setTrialPlanNameEn(e.target.value)
                                }
                                placeholder="e.g. Free Trial"
                                dir="ltr"
                                style={{ textAlign: "left" }}
                              />
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 16,
                            }}
                          >
                            <div className="field">
                              <label
                                className="field-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Award
                                  size={14}
                                  style={{ color: "var(--accent)" }}
                                />
                                <span>
                                  {t("admin_dashboard.badge_label_arabic")}
                                </span>
                              </label>
                              <input
                                className="field-input"
                                value={trialBadgeAr}
                                onChange={(e) =>
                                  setTrialBadgeAr(e.target.value)
                                }
                                placeholder={t("admin_dashboard.e_g_popular")}
                                dir={t("admin_dashboard.ltr")}
                                style={{ textAlign: t("admin_dashboard.left") }}
                              />
                            </div>
                            <div className="field">
                              <label
                                className="field-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Award
                                  size={14}
                                  style={{ color: "var(--accent)" }}
                                />
                                <span>
                                  {t("admin_dashboard.badge_label_english")}
                                </span>
                              </label>
                              <input
                                className="field-input"
                                value={trialBadgeEn}
                                onChange={(e) =>
                                  setTrialBadgeEn(e.target.value)
                                }
                                placeholder="e.g. Popular"
                                dir="ltr"
                                style={{ textAlign: "left" }}
                              />
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 16,
                            }}
                          >
                            <div className="field">
                              <label
                                className="field-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Zap
                                  size={14}
                                  style={{ color: "var(--accent)" }}
                                />
                                <span>
                                  {t("admin_dashboard.cta_button_text_arabic")}
                                </span>
                              </label>
                              <input
                                className="field-input"
                                value={trialCtaAr}
                                onChange={(e) => setTrialCtaAr(e.target.value)}
                                placeholder={t(
                                  "admin_dashboard.e_g_start_free_trial",
                                )}
                                dir={t("admin_dashboard.ltr")}
                                style={{ textAlign: t("admin_dashboard.left") }}
                              />
                            </div>
                            <div className="field">
                              <label
                                className="field-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Zap
                                  size={14}
                                  style={{ color: "var(--accent)" }}
                                />
                                <span>
                                  {t("admin_dashboard.cta_button_text_english")}
                                </span>
                              </label>
                              <input
                                className="field-input"
                                value={trialCtaEn}
                                onChange={(e) => setTrialCtaEn(e.target.value)}
                                placeholder="e.g. Start Free Trial"
                                dir="ltr"
                                style={{ textAlign: "left" }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Arabic Dynamic Features for Trial */}
                        <div className="field" style={{ marginBottom: 24 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <label
                              className="field-label"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                margin: 0,
                              }}
                            >
                              <Sparkles
                                size={14}
                                style={{ color: "var(--green)" }}
                              />
                              <span>
                                {t("admin_dashboard.features_list_arabic")}
                              </span>
                            </label>
                            <button
                              type="button"
                              className="btn btn-xs"
                              onClick={() =>
                                setTrialFeaturesAr([...trialFeaturesAr, ""])
                              }
                              style={{
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "var(--green)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: 6,
                              }}
                            >
                              <Plus size={12} />
                              <span>{t("admin_dashboard.add_feature")}</span>
                            </button>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            {trialFeaturesAr.map((feat, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "center",
                                }}
                              >
                                <input
                                  className="field-input"
                                  value={feat}
                                  onChange={(e) => {
                                    const next = [...trialFeaturesAr];
                                    next[idx] = e.target.value;
                                    setTrialFeaturesAr(next);
                                  }}
                                  placeholder={t(
                                    "admin_dashboard.e_g_access_to_limited_tools",
                                  )}
                                  dir={t("admin_dashboard.ltr")}
                                  style={{
                                    textAlign: t("admin_dashboard.left"),
                                    flex: 1,
                                  }}
                                />
                                {trialFeaturesAr.length > 1 && (
                                  <button
                                    type="button"
                                    className="sa-delete-btn btn-xs"
                                    style={{
                                      width: 34,
                                      height: 34,
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                    onClick={() =>
                                      setTrialFeaturesAr(
                                        trialFeaturesAr.filter(
                                          (_, i) => i !== idx,
                                        ),
                                      )
                                    }
                                    title={t("admin_dashboard.delete_feature")}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* English Dynamic Features for Trial */}
                        <div className="field" style={{ marginBottom: 24 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <label
                              className="field-label"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                margin: 0,
                              }}
                            >
                              <Sparkles
                                size={14}
                                style={{ color: "var(--accent)" }}
                              />
                              <span>
                                {t("admin_dashboard.features_list_english")}
                              </span>
                            </label>
                            <button
                              type="button"
                              className="btn btn-xs"
                              onClick={() =>
                                setTrialFeaturesEn([...trialFeaturesEn, ""])
                              }
                              style={{
                                background: "rgba(59, 130, 246, 0.15)",
                                color: "var(--accent)",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: 6,
                              }}
                            >
                              <Plus size={12} />
                              <span>{t("admin_dashboard.add_feature")}</span>
                            </button>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            {trialFeaturesEn.map((feat, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "center",
                                }}
                              >
                                <input
                                  className="field-input"
                                  value={feat}
                                  onChange={(e) => {
                                    const next = [...trialFeaturesEn];
                                    next[idx] = e.target.value;
                                    setTrialFeaturesEn(next);
                                  }}
                                  placeholder="e.g. Access to limited tools"
                                  dir="ltr"
                                  style={{ textAlign: "left", flex: 1 }}
                                />
                                {trialFeaturesEn.length > 1 && (
                                  <button
                                    type="button"
                                    className="sa-delete-btn btn-xs"
                                    style={{
                                      width: 34,
                                      height: 34,
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                    onClick={() =>
                                      setTrialFeaturesEn(
                                        trialFeaturesEn.filter(
                                          (_, i) => i !== idx,
                                        ),
                                      )
                                    }
                                    title={t("admin_dashboard.delete_feature")}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Trial Duration & Credits Included */}
                        <div
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            padding: "24px",
                            borderRadius: "16px",
                            border: "1px solid var(--line)",
                            marginBottom: "24px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px",
                          }}
                        >
                          {/* Duration */}
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "16px",
                              }}
                            >
                              <Clock
                                size={20}
                                style={{ color: "var(--accent)" }}
                              />
                              <label
                                style={{
                                  fontSize: "15px",
                                  fontWeight: "800",
                                  color: "#fff",
                                }}
                              >
                                {t("admin_dashboard.trial_duration_days")}
                              </label>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                }}
                              >
                                <input
                                  type="number"
                                  min="1"
                                  max="90"
                                  className="field-input"
                                  style={{
                                    width: "110px",
                                    fontSize: "18px",
                                    fontWeight: "800",
                                    textAlign: "center",
                                    background: "rgba(0, 0, 0, 0.3)",
                                    borderColor:
                                      freeTrialDays < 1 || freeTrialDays > 90
                                        ? "var(--red)"
                                        : "var(--accent)",
                                    color: "#fff",
                                  }}
                                  value={freeTrialDays}
                                  onChange={(e) =>
                                    setFreeTrialDays(Number(e.target.value))
                                  }
                                />
                                <span
                                  style={{
                                    fontSize: "13px",
                                    color: "var(--text2)",
                                    fontWeight: "600",
                                  }}
                                >
                                  {t(
                                    "admin_dashboard.days_starting_from_registration_dat",
                                  )}
                                </span>
                              </div>

                              {/* Quick Picks Preset Buttons */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                  marginLeft: t("admin_dashboard.auto"),
                                  marginRight: t("admin_dashboard.k_0"),
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text3)",
                                    fontWeight: "700",
                                  }}
                                >
                                  {t("admin_dashboard.quick_presets")}
                                </span>
                                {[3, 7, 14, 30].map((preset) => {
                                  const isSelected = freeTrialDays === preset;
                                  return (
                                    <motion.button
                                      key={preset}
                                      type="button"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setFreeTrialDays(preset)}
                                      style={{
                                        padding: "6px 14px",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        background: isSelected
                                          ? "var(--accent)"
                                          : "rgba(255, 255, 255, 0.05)",
                                        color: isSelected
                                          ? "#fff"
                                          : "var(--text2)",
                                        border: isSelected
                                          ? "1px solid var(--accent)"
                                          : "1px solid rgba(255, 255, 255, 0.1)",
                                        boxShadow: isSelected
                                          ? "0 4px 12px rgba(59, 130, 246, 0.3)"
                                          : "none",
                                      }}
                                    >
                                      {preset}{" "}
                                      {state.language === "en"
                                        ? "Days"
                                        : preset === 3
                                          ? "أيام"
                                          : preset === 7
                                            ? "أيام"
                                            : "يوم"}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Real-time Inline Validation Warnings */}
                            {freeTrialDays < 1 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                style={{
                                  marginTop: "14px",
                                  padding: "10px 14px",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  borderRadius: "8px",
                                  color: "var(--red)",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <AlertTriangle size={16} />
                                <span>
                                  {t(
                                    "admin_dashboard.minimum_trial_duration_is_1_day",
                                  )}
                                </span>
                              </motion.div>
                            )}
                            {freeTrialDays > 90 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                style={{
                                  marginTop: "14px",
                                  padding: "10px 14px",
                                  background: "rgba(245, 158, 11, 0.1)",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                  borderRadius: "8px",
                                  color: "var(--amber, #f59e0b)",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <AlertTriangle size={16} />
                                <span>
                                  {t(
                                    "admin_dashboard.warning_recommended_maximum_trial_d",
                                  )}
                                </span>
                              </motion.div>
                            )}
                          </div>

                          {/* Credits Included */}
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "16px",
                              }}
                            >
                              <Sparkles
                                size={20}
                                style={{ color: "var(--green)" }}
                              />
                              <label
                                style={{
                                  fontSize: "15px",
                                  fontWeight: "800",
                                  color: "#fff",
                                }}
                              >
                                {t("admin_dashboard.credits_included")}
                              </label>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <input
                                type="number"
                                min="0"
                                className="field-input"
                                style={{
                                  width: "110px",
                                  fontSize: "18px",
                                  fontWeight: "800",
                                  textAlign: "center",
                                  background: "rgba(0, 0, 0, 0.3)",
                                  borderColor: "var(--green)",
                                  color: "#fff",
                                }}
                                value={freeTrialCredits}
                                onChange={(e) =>
                                  setFreeTrialCredits(Number(e.target.value))
                                }
                              />
                              <span
                                style={{
                                  fontSize: "13px",
                                  color: "var(--text2)",
                                  fontWeight: "600",
                                }}
                              >
                                {t(
                                  "admin_dashboard.credits_given_to_user_during_trial",
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Auto-Include Future Tools Option */}
                        <div
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(13, 18, 32, 0.6) 100%)",
                            padding: "20px 24px",
                            borderRadius: "16px",
                            border: "1px solid rgba(59, 130, 246, 0.2)",
                            marginBottom: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "16px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                              flex: "1 1 300px",
                            }}
                          >
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "12px",
                                background: "rgba(59, 130, 246, 0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Sparkles
                                size={24}
                                style={{ color: "var(--accent)" }}
                              />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: "800",
                                  color: "#fff",
                                }}
                              >
                                {t("admin_dashboard.auto_include_future_tools")}
                              </div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text2)",
                                  marginTop: "2px",
                                }}
                              >
                                {t(
                                  "admin_dashboard.automatically_grant_trial_users_acc",
                                )}
                              </div>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onClick={() =>
                              setAutoIncludeNewTools(!autoIncludeNewTools)
                            }
                            style={{
                              background: autoIncludeNewTools
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(255, 255, 255, 0.05)",
                              border: autoIncludeNewTools
                                ? "1px solid var(--green)"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                              padding: "8px 16px",
                              borderRadius: "20px",
                              color: autoIncludeNewTools
                                ? "var(--green)"
                                : "var(--text3)",
                              fontSize: "12px",
                              fontWeight: "800",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {autoIncludeNewTools ? (
                              <>
                                <CheckCircle2
                                  size={16}
                                  style={{ color: "var(--green)" }}
                                />
                                <span>
                                  {t("admin_dashboard.enabled_auto_access")}
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle
                                  size={16}
                                  style={{ color: "var(--text3)" }}
                                />
                                <span>
                                  {t("admin_dashboard.disabled_manual_only")}
                                </span>
                              </>
                            )}
                          </motion.button>
                        </div>

                        {/* Accordion Tool Groups & Interactive Checkbox Cards */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                            marginBottom: "20px",
                            background: "rgba(255, 255, 255, 0.01)",
                            padding: "16px 20px",
                            borderRadius: "12px",
                            border: "1px solid var(--line)",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "15px",
                                fontWeight: "800",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <SlidersHorizontal
                                size={18}
                                style={{ color: "var(--accent)" }}
                              />
                              <span>
                                {t("admin_dashboard.tool_access_permissions")}
                              </span>
                              <span
                                style={{
                                  background: "rgba(59, 130, 246, 0.12)",
                                  color: "var(--accent)",
                                  border: "1px solid rgba(59, 130, 246, 0.25)",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                  padding: "2px 10px",
                                  borderRadius: "12px",
                                }}
                              >
                                {
                                  Array.from(new Set(allowedTrialTools)).filter(
                                    (id) =>
                                      CHECKLIST_ITEMS.some((i) => i.id === id),
                                  ).length
                                }{" "}
                                / {CHECKLIST_ITEMS.length}{" "}
                                {t("admin_dashboard.active")}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text3)",
                                marginTop: "4px",
                              }}
                            >
                              {t(
                                "admin_dashboard.click_any_tool_card_to_toggle_trial",
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "8px" }}>
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              className="btn btn-xs"
                              onClick={() =>
                                setAllowedTrialTools(() => {
                                  const next = Array.from(
                                    new Set(
                                      CHECKLIST_ITEMS.map(
                                        (item) => item.id,
                                      ).filter(Boolean),
                                    ),
                                  );
                                  allowedTrialToolsRef.current = next;
                                  return next;
                                })
                              }
                              style={{
                                background: "rgba(59, 130, 246, 0.12)",
                                color: "var(--accent)",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>{t("admin_dashboard.select_all")}</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              className="btn btn-xs"
                              onClick={() =>
                                setAllowedTrialTools(() => {
                                  allowedTrialToolsRef.current = [];
                                  return [];
                                })
                              }
                              style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "var(--red)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                              }}
                            >
                              <XCircle size={14} />
                              <span>{t("admin_dashboard.deselect_all")}</span>
                            </motion.button>
                          </div>
                        </div>

                        {/* Collapsible Tool Categories */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                          }}
                        >
                          {[
                            {
                              id: 0,
                              icon: Target,
                              title: t(
                                "admin_dashboard.analysis_identity_building",
                              ),
                              items: CHECKLIST_ITEMS.filter(
                                (item) =>
                                  item.group_ar === "التحليل والهوية" ||
                                  item.group_en === "Analysis & Identity",
                              ),
                            },
                            {
                              id: 1,
                              icon: ShoppingBag,
                              title: t("admin_dashboard.store_setup_pages"),
                              items: CHECKLIST_ITEMS.filter(
                                (item) =>
                                  item.group_ar === "بناء وتجهيز المتجر" ||
                                  item.group_en === "Store Setup",
                              ),
                            },
                            {
                              id: 2,
                              icon: Package,
                              title: t(
                                "admin_dashboard.product_profit_pricing",
                              ),
                              items: CHECKLIST_ITEMS.filter(
                                (item) =>
                                  item.group_ar === "المنتج والربحية" ||
                                  item.group_en === "Product & Profit",
                              ),
                            },
                            {
                              id: 3,
                              icon: Sparkles,
                              title: t(
                                "admin_dashboard.content_digital_marketing",
                              ),
                              items: CHECKLIST_ITEMS.filter(
                                (item) =>
                                  item.group_ar === "المحتوى والتسويق" ||
                                  item.group_en === "Content & Marketing",
                              ),
                            },
                            {
                              id: 4,
                              icon: Cpu,
                              title: t("admin_dashboard.smart_management_ops"),
                              items: CHECKLIST_ITEMS.filter(
                                (item) =>
                                  item.group_ar === "إدارة وتشغيل" ||
                                  item.group_en === "Management & Ops",
                              ),
                            },

                            {
                              id: 6,
                              icon: BookOpen,
                              title: t(
                                "admin_dashboard.additional_resources_tools",
                              ),
                              items: CHECKLIST_ITEMS.filter(
                                (item) => item.section === "additional",
                              ),
                            },
                          ].map((group) => {
                            if (!group.items || group.items.length === 0)
                              return null;
                            const isExpanded = Boolean(
                              expandedTrialGroups[group.id],
                            );
                            const selectedCount = group.items.filter((item) =>
                              allowedTrialTools.includes(item.id),
                            ).length;
                            const totalCount = group.items.length;
                            const progressPercent = Math.round(
                              (selectedCount / totalCount) * 100,
                            );
                            const GroupIcon = group.icon;

                            return (
                              <div
                                key={group.id}
                                style={{
                                  background: "rgba(255, 255, 255, 0.015)",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                  borderRadius: "14px",
                                  overflow: "hidden",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {/* Category Header */}
                                <motion.div
                                  whileHover={{
                                    backgroundColor:
                                      "rgba(255, 255, 255, 0.035)",
                                  }}
                                  onClick={() =>
                                    setExpandedTrialGroups((prev) => ({
                                      ...prev,
                                      [group.id]: !isExpanded,
                                    }))
                                  }
                                  style={{
                                    padding: "16px 20px",
                                    background: isExpanded
                                      ? "rgba(255, 255, 255, 0.03)"
                                      : "rgba(255, 255, 255, 0.01)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "12px",
                                    userSelect: "none",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "12px",
                                      flex: 1,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "8px",
                                        background: "rgba(59, 130, 246, 0.12)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <GroupIcon
                                        size={18}
                                        style={{ color: "var(--accent)" }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: "800",
                                        color: "#fff",
                                      }}
                                    >
                                      {group.title}
                                    </span>
                                    {/* Live Progress Badge */}
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: "800",
                                        padding: "2px 10px",
                                        borderRadius: "12px",
                                        background:
                                          selectedCount === totalCount
                                            ? "rgba(16, 185, 129, 0.15)"
                                            : selectedCount > 0
                                              ? "rgba(59, 130, 246, 0.15)"
                                              : "rgba(255, 255, 255, 0.05)",
                                        color:
                                          selectedCount === totalCount
                                            ? "var(--green)"
                                            : selectedCount > 0
                                              ? "var(--accent)"
                                              : "var(--text3)",
                                        border:
                                          selectedCount === totalCount
                                            ? "1px solid rgba(16, 185, 129, 0.3)"
                                            : selectedCount > 0
                                              ? "1px solid rgba(59, 130, 246, 0.3)"
                                              : "1px solid rgba(255, 255, 255, 0.1)",
                                      }}
                                    >
                                      {selectedCount}/{totalCount}{" "}
                                      {t("admin_dashboard.active_1")} (
                                      {progressPercent}%)
                                    </span>
                                  </div>

                                  <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown
                                      size={18}
                                      style={{ color: "var(--text2)" }}
                                    />
                                  </motion.div>
                                </motion.div>

                                {/* Category Body / Accordion Items */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25 }}
                                    >
                                      <div
                                        style={{
                                          padding: "16px 20px 20px",
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(auto-fill, minmax(240px, 1fr))",
                                          gap: "12px",
                                          borderTop:
                                            "1px solid rgba(255, 255, 255, 0.04)",
                                        }}
                                      >
                                        {group.items.map((item) => {
                                          const isChecked =
                                            allowedTrialTools.includes(item.id);
                                          const primaryLabel =
                                            state.language === "en"
                                              ? item.label_en ||
                                                item.label ||
                                                item.id
                                              : item.label_ar || item.label;
                                          const secondaryLabel =
                                            state.language === "en"
                                              ? item.label_ar || item.id
                                              : item.label_en || item.id;

                                          return (
                                            <motion.div
                                              key={item.id}
                                              whileHover={{
                                                scale: 1.02,
                                                y: -2,
                                              }}
                                              whileTap={{ scale: 0.98 }}
                                              onClick={() => {
                                                if (isChecked) {
                                                  setAllowedTrialTools(
                                                    (prev) => {
                                                      const next = prev.filter(
                                                        (t) => t !== item.id,
                                                      );
                                                      allowedTrialToolsRef.current =
                                                        next;
                                                      return next;
                                                    },
                                                  );
                                                } else {
                                                  setAllowedTrialTools(
                                                    (prev) => {
                                                      const next = [
                                                        ...prev,
                                                        item.id,
                                                      ];
                                                      allowedTrialToolsRef.current =
                                                        next;
                                                      return next;
                                                    },
                                                  );
                                                }
                                              }}
                                              style={{
                                                padding: "14px 16px",
                                                background: isChecked
                                                  ? "rgba(16, 185, 129, 0.08)"
                                                  : "rgba(255, 255, 255, 0.02)",
                                                border: isChecked
                                                  ? "1px solid rgba(16, 185, 129, 0.35)"
                                                  : "1px solid rgba(255, 255, 255, 0.05)",
                                                borderRadius: "12px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                transition:
                                                  "background 0.2s, border-color 0.2s, box-shadow 0.2s",
                                                userSelect: "none",
                                                boxShadow: isChecked
                                                  ? "0 4px 16px rgba(16, 185, 129, 0.08)"
                                                  : "none",
                                              }}
                                            >
                                              {/* Checkbox indicator */}
                                              <div
                                                style={{
                                                  width: 20,
                                                  height: 20,
                                                  borderRadius: 6,
                                                  border: isChecked
                                                    ? "none"
                                                    : "1.5px solid rgba(255, 255, 255, 0.25)",
                                                  background: isChecked
                                                    ? "var(--green)"
                                                    : "transparent",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  color: "#fff",
                                                  flexShrink: 0,
                                                  transition: "all 0.2s ease",
                                                }}
                                              >
                                                {isChecked && (
                                                  <Check
                                                    size={14}
                                                    strokeWidth={3}
                                                  />
                                                )}
                                              </div>

                                              <div
                                                style={{
                                                  width: 34,
                                                  height: 34,
                                                  borderRadius: "8px",
                                                  background:
                                                    "rgba(255, 255, 255, 0.05)",
                                                  border:
                                                    "1px solid rgba(255, 255, 255, 0.08)",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  flexShrink: 0,
                                                }}
                                              >
                                                {getToolVectorIcon(item, 18)}
                                              </div>

                                              <div
                                                style={{
                                                  flex: 1,
                                                  overflow: "hidden",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    fontSize: "12px",
                                                    fontWeight: isChecked
                                                      ? "800"
                                                      : "600",
                                                    color: isChecked
                                                      ? "#fff"
                                                      : "var(--text2)",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                  }}
                                                >
                                                  {primaryLabel}
                                                </div>
                                                <div
                                                  style={{
                                                    fontSize: "9px",
                                                    color: "var(--text3)",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                  }}
                                                >
                                                  {secondaryLabel}
                                                </div>
                                              </div>

                                              {/* Status badge */}
                                              {isChecked ? (
                                                <span
                                                  style={{
                                                    fontSize: "10px",
                                                    color: "var(--green)",
                                                    fontWeight: "700",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                  }}
                                                >
                                                  <CheckCircle2
                                                    size={12}
                                                    style={{
                                                      color: "var(--green)",
                                                    }}
                                                  />
                                                  <span>
                                                    {t(
                                                      "admin_dashboard.active",
                                                    )}
                                                  </span>
                                                </span>
                                              ) : (
                                                <span
                                                  style={{
                                                    fontSize: "10px",
                                                    color: "var(--text3)",
                                                    fontWeight: "600",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                  }}
                                                >
                                                  <Lock
                                                    size={12}
                                                    style={{
                                                      color: "var(--text3)",
                                                    }}
                                                  />
                                                  <span>
                                                    {t(
                                                      "admin_dashboard.locked",
                                                    )}
                                                  </span>
                                                </span>
                                              )}
                                            </motion.div>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>

                        {/* Sticky Bottom Action Bar */}
                        <div
                          style={{
                            position: "sticky",
                            bottom: "16px",
                            zIndex: 40,
                            marginTop: "32px",
                            background: "rgba(13, 18, 32, 0.95)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            borderRadius: "16px",
                            padding: "14px 24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "16px",
                            flexWrap: "wrap",
                            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "var(--accent)",
                                boxShadow: "0 0 10px var(--accent)",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "12px",
                                color: "var(--text2)",
                                fontWeight: "700",
                              }}
                            >
                              {state.language === "en"
                                ? `Trial: ${freeTrialDays} Days | Active Tools: ${Array.from(new Set(allowedTrialTools)).filter((id) => CHECKLIST_ITEMS.some((i) => i.id === id)).length}/${CHECKLIST_ITEMS.length}`
                                : `مدة التجربة: ${freeTrialDays} يوماً | الأدوات المتاحة: ${Array.from(new Set(allowedTrialTools)).filter((id) => CHECKLIST_ITEMS.some((i) => i.id === id)).length} من ${CHECKLIST_ITEMS.length}`}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              marginLeft: t("admin_dashboard.auto"),
                              marginRight: t("admin_dashboard.k_0"),
                            }}
                          >
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              className="btn btn-sm"
                              onClick={() => {
                                setFreeTrialDays(
                                  userData?.freeTrialSettings?.days || 7,
                                );
                                setAllowedTrialTools(
                                  userData?.freeTrialSettings?.allowedTools ||
                                    CHECKLIST_ITEMS.map((s) => s.id),
                                );
                                setAutoIncludeNewTools(
                                  userData?.freeTrialSettings
                                    ?.autoIncludeNewTools ?? true,
                                );
                                toast(
                                  t("admin_dashboard.reset_to_saved_settings"),
                                  "info",
                                );
                              }}
                              style={{
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "var(--text2)",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                              }}
                            >
                              <RotateCcw size={14} />
                              <span>{t("admin_dashboard.reset")}</span>
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              className="ad-submit-btn"
                              style={{
                                width: "auto",
                                minWidth: "180px",
                                padding: "10px 24px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                borderRadius: "8px",
                                cursor: "pointer",
                              }}
                              onClick={handleUpdateAdminProfile}
                              disabled={isUpdatingProfile}
                            >
                              {isUpdatingProfile ? (
                                <>
                                  <Loader2 size={16} className="spin" />
                                  <span>{t("admin_dashboard.saving")}</span>
                                </>
                              ) : (
                                <>
                                  <Save size={16} />
                                  <span>
                                    {t("admin_dashboard.save_changes")}
                                  </span>
                                </>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Requirement 5: Instant Client Preview Modal */}
                  <AnimatePresence>
                    {isTrialPreviewModalOpen && (
                      <div
                        style={{
                          position: "fixed",
                          inset: 0,
                          zIndex: 100,
                          background: "rgba(0, 0, 0, 0.75)",
                          backdropFilter: "blur(8px)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "20px",
                        }}
                        onClick={() => setIsTrialPreviewModalOpen(false)}
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: 20 }}
                          transition={{ duration: 0.25 }}
                          onClick={(e) => e.stopPropagation()}
                          dir={t("admin_dashboard.ltr")}
                          style={{
                            width: "100%",
                            maxWidth: "850px",
                            maxHeight: "85vh",
                            background: "var(--bg2)",
                            border: "1px solid var(--line)",
                            borderRadius: "20px",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
                            textAlign: t("admin_dashboard.left"),
                          }}
                        >
                          {/* Modal Header */}
                          <div
                            style={{
                              padding: "20px 24px",
                              borderBottom: "1px solid var(--line)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "rgba(255, 255, 255, 0.02)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <Eye
                                size={22}
                                style={{ color: "var(--accent)" }}
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: "16px",
                                    fontWeight: "800",
                                    color: "#fff",
                                  }}
                                >
                                  {t(
                                    "admin_dashboard.client_experience_preview",
                                  )}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text3)",
                                    marginTop: "2px",
                                  }}
                                >
                                  {t(
                                    "admin_dashboard.preview_how_tools_appear_to_a_trial",
                                  )}
                                </div>
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              className="ad-sidebar-close-btn"
                              onClick={() => setIsTrialPreviewModalOpen(false)}
                              style={{ cursor: "pointer" }}
                            >
                              <X size={20} />
                            </motion.button>
                          </div>

                          {/* Modal Filter Tabs & Stats Bar */}
                          <div
                            style={{
                              padding: "16px 24px",
                              background: "rgba(0, 0, 0, 0.2)",
                              borderBottom: "1px solid var(--line)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "12px",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ display: "flex", gap: "8px" }}>
                              {[
                                {
                                  id: "all",
                                  label:
                                    state.language === "en"
                                      ? `All (${CHECKLIST_ITEMS.length})`
                                      : `جميع الأدوات (${CHECKLIST_ITEMS.length})`,
                                },
                                {
                                  id: "unlocked",
                                  label:
                                    state.language === "en"
                                      ? `Unlocked (${allowedTrialTools.length})`
                                      : `المتاحة للتجربة (${allowedTrialTools.length})`,
                                },
                                {
                                  id: "locked",
                                  label:
                                    state.language === "en"
                                      ? `Locked (${CHECKLIST_ITEMS.length - allowedTrialTools.length})`
                                      : `المقفلة (${CHECKLIST_ITEMS.length - allowedTrialTools.length})`,
                                },
                              ].map((tab) => (
                                <motion.button
                                  key={tab.id}
                                  type="button"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setPreviewModalTab(tab.id)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    background:
                                      previewModalTab === tab.id
                                        ? "var(--accent)"
                                        : "rgba(255, 255, 255, 0.05)",
                                    color:
                                      previewModalTab === tab.id
                                        ? "#fff"
                                        : "var(--text2)",
                                    border:
                                      previewModalTab === tab.id
                                        ? "1px solid var(--accent)"
                                        : "1px solid rgba(255, 255, 255, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  {tab.id === "unlocked" && (
                                    <Unlock size={12} />
                                  )}
                                  {tab.id === "locked" && <Lock size={12} />}
                                  <span>{tab.label}</span>
                                </motion.button>
                              ))}
                            </div>

                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text3)",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <Clock
                                size={13}
                                style={{ color: "var(--accent)" }}
                              />
                              <span>
                                {state.language === "en"
                                  ? `Trial Period: ${freeTrialDays} Days`
                                  : `مدة التجربة: ${freeTrialDays} أيام`}
                              </span>
                            </div>
                          </div>

                          {/* Modal Body Grid */}
                          <div
                            style={{
                              padding: "24px",
                              overflowY: "auto",
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fill, minmax(220px, 1fr))",
                                gap: "14px",
                              }}
                            >
                              {CHECKLIST_ITEMS.filter((item) => {
                                const isUnlocked = allowedTrialTools.includes(
                                  item.id,
                                );
                                if (previewModalTab === "unlocked")
                                  return isUnlocked;
                                if (previewModalTab === "locked")
                                  return !isUnlocked;
                                return true;
                              }).map((item) => {
                                const isUnlocked = allowedTrialTools.includes(
                                  item.id,
                                );
                                const primaryLabel =
                                  state.language === "en"
                                    ? item.label_en || item.label || item.id
                                    : item.label_ar || item.label;
                                const secondaryLabel =
                                  state.language === "en"
                                    ? item.label_ar || item.id
                                    : item.label_en || item.id;

                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      padding: "16px",
                                      background: isUnlocked
                                        ? "rgba(16, 185, 129, 0.05)"
                                        : "rgba(239, 68, 68, 0.03)",
                                      border: isUnlocked
                                        ? "1px solid rgba(16, 185, 129, 0.25)"
                                        : "1px solid rgba(239, 68, 68, 0.2)",
                                      borderRadius: "12px",
                                      position: "relative",
                                      opacity: isUnlocked ? 1 : 0.75,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: "10px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 38,
                                          height: 38,
                                          borderRadius: "10px",
                                          background:
                                            "rgba(255, 255, 255, 0.05)",
                                          border:
                                            "1px solid rgba(255, 255, 255, 0.08)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {getToolVectorIcon(item, 20)}
                                      </div>
                                      {isUnlocked ? (
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            fontWeight: "800",
                                            color: "var(--green)",
                                            background:
                                              "rgba(16, 185, 129, 0.15)",
                                            padding: "2px 8px",
                                            borderRadius: "10px",
                                            border:
                                              "1px solid rgba(16, 185, 129, 0.3)",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          <Unlock size={11} />
                                          <span>
                                            {t("admin_dashboard.available")}
                                          </span>
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            fontWeight: "800",
                                            color: "var(--red)",
                                            background:
                                              "rgba(239, 68, 68, 0.15)",
                                            padding: "2px 8px",
                                            borderRadius: "10px",
                                            border:
                                              "1px solid rgba(239, 68, 68, 0.3)",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          <Lock size={11} />
                                          <span>
                                            {t("admin_dashboard.locked")}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: "800",
                                        color: "#fff",
                                      }}
                                    >
                                      {primaryLabel}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "10px",
                                        color: "var(--text3)",
                                        marginTop: "2px",
                                      }}
                                    >
                                      {secondaryLabel}
                                    </div>

                                    <div style={{ marginTop: "14px" }}>
                                      {isUnlocked ? (
                                        <button
                                          type="button"
                                          disabled
                                          style={{
                                            width: "100%",
                                            padding: "6px 12px",
                                            borderRadius: "8px",
                                            background: "var(--accent)",
                                            color: "#fff",
                                            border: "none",
                                            fontSize: "11px",
                                            fontWeight: "700",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "6px",
                                          }}
                                        >
                                          <Sparkles size={12} />
                                          <span>
                                            {t("admin_dashboard.try_tool_now")}
                                          </span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled
                                          style={{
                                            width: "100%",
                                            padding: "6px 12px",
                                            borderRadius: "8px",
                                            background:
                                              "rgba(255, 255, 255, 0.05)",
                                            color: "var(--text3)",
                                            border:
                                              "1px solid rgba(255, 255, 255, 0.1)",
                                            fontSize: "11px",
                                            fontWeight: "700",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          <Lock size={12} />
                                          <span>
                                            {t(
                                              "admin_dashboard.upgrade_required",
                                            )}
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : activeTab === "payment_methods" ? (
            <div
              className="ad-content animate-in"
              dir={t("admin_dashboard.ltr")}
            >
              {/* Header Title & Sub-tabs Row */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: "22px",
                        fontWeight: "800",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        margin: 0,
                      }}
                    >
                      <CreditCard
                        size={24}
                        style={{ color: "var(--accent)" }}
                      />
                      <span>{t("admin_dashboard.transactions_payments")}</span>
                    </h2>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text3)",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {t("admin_dashboard.manage_electronic_wallets_online_pa")}
                    </p>
                  </div>

                  {/* Sub-Tabs Pill Navigation */}
                  <div
                    style={{
                      display: "flex",
                      background: "rgba(13, 18, 32, 0.8)",
                      border: "1px solid var(--line)",
                      padding: "4px",
                      borderRadius: "14px",
                      gap: "4px",
                    }}
                  >
                    {[
                      {
                        id: "transactions",
                        label_ar: `سجل المعاملات (${pendingPayments.filter((p) => p.status !== "pending").length})`,
                        label_gcc: `سجل العمليات المالية (${pendingPayments.filter((p) => p.status !== "pending").length})`,
                        label_en: `Transactions Log (${pendingPayments.filter((p) => p.status !== "pending").length})`,
                        icon: Activity,
                      },
                      {
                        id: "requests",
                        label_ar: `طلبات الدفع (${pendingPayments.filter((p) => p.status === "pending").length})`,
                        label_gcc: `طلبات السداد والتحويل (${pendingPayments.filter((p) => p.status === "pending").length})`,
                        label_en: `Payment Requests (${pendingPayments.filter((p) => p.status === "pending").length})`,
                        icon: Clock,
                      },
                      {
                        id: "gateways",
                        label_ar: "بوابات وطرق الدفع",
                        label_gcc: "طرق وبوابات الدفع",
                        label_en: "Payment Gateways & Methods",
                        icon: CreditCard,
                      },
                    ].map((tab) => {
                      const isActive = paymentsSubTab === tab.id;
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setPaymentsSubTab(tab.id)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "10px",
                            border: "none",
                            background: isActive
                              ? "var(--accent)"
                              : "transparent",
                            color: isActive ? "#fff" : "var(--text3)",
                            fontSize: "13px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <TabIcon size={15} />
                          <span>
                            {state.language === "en"
                              ? tab.label_en
                              : state.language === "ar-GCC" && tab.label_gcc
                                ? tab.label_gcc
                                : tab.label_ar}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Top Analytics Cards (Stats Bar) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {/* Card 1: Total Transactions */}
                  <div
                    style={{
                      background: "rgba(13, 18, 32, 0.7)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "16px",
                      padding: "18px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text3)",
                          fontWeight: "600",
                          marginBottom: "4px",
                        }}
                      >
                        {t("admin_dashboard.total_transactions")}
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "900",
                          color: "#fff",
                        }}
                      >
                        <AnimatedCounter value={pendingPayments.length} />
                      </div>
                    </div>
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "12px",
                        background: "rgba(59, 130, 246, 0.12)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Activity size={22} style={{ color: "#3B82F6" }} />
                    </div>
                  </div>

                  {/* Card 2: Pending Approval */}
                  <div
                    style={{
                      background: "rgba(13, 18, 32, 0.7)",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      borderRadius: "16px",
                      padding: "18px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text3)",
                          fontWeight: "600",
                          marginBottom: "4px",
                        }}
                      >
                        {t("admin_dashboard.pending_approval")}
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "900",
                          color: "#F59E0B",
                        }}
                      >
                        <AnimatedCounter
                          value={
                            pendingPayments.filter(
                              (p) => p.status === "pending" || !p.status,
                            ).length
                          }
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "12px",
                        background: "rgba(245, 158, 11, 0.12)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Clock size={22} style={{ color: "#F59E0B" }} />
                    </div>
                  </div>

                  {/* Card 3: Approved Transactions */}
                  <div
                    style={{
                      background: "rgba(13, 18, 32, 0.7)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "16px",
                      padding: "18px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text3)",
                          fontWeight: "600",
                          marginBottom: "4px",
                        }}
                      >
                        {t("admin_dashboard.approved_payments")}
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "900",
                          color: "#10B981",
                        }}
                      >
                        <AnimatedCounter
                          value={
                            pendingPayments.filter(
                              (p) =>
                                p.status === "approved" ||
                                p.status === "success" ||
                                p.status === "completed",
                            ).length
                          }
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "12px",
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle2 size={22} style={{ color: "#10B981" }} />
                    </div>
                  </div>

                  {/* Card 4: Total Revenue */}
                  <div
                    style={{
                      background: "rgba(13, 18, 32, 0.7)",
                      border: "1px solid rgba(236, 72, 153, 0.2)",
                      borderRadius: "16px",
                      padding: "18px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text3)",
                          fontWeight: "600",
                          marginBottom: "4px",
                        }}
                      >
                        {t("admin_dashboard.total_revenue")}
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "900",
                          color: "#EC4899",
                        }}
                      >
                        <AnimatedCounter
                          value={pendingPayments
                            .filter(
                              (p) =>
                                p.status === "approved" ||
                                p.status === "completed",
                            )
                            .reduce(
                              (sum, p) => sum + (Number(p.amount) || 0),
                              0,
                            )}
                        />{" "}
                        <span style={{ fontSize: "14px", fontWeight: "700" }}>
                          EGP
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "12px",
                        background: "rgba(236, 72, 153, 0.12)",
                        border: "1px solid rgba(236, 72, 153, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DollarSign size={22} style={{ color: "#EC4899" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Tab: Payment Requests */}
              {paymentsSubTab === "requests" && (
                <div
                  className="ad-table-card"
                  style={{ padding: "24px" }}
                  dir={t("admin_dashboard.ltr")}
                >
                  {/* Filter Toolbar Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                      marginBottom: "20px",
                      paddingBottom: "16px",
                      borderBottom: "1px solid var(--line)",
                    }}
                    dir={t("admin_dashboard.ltr")}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <SlidersHorizontal
                        size={20}
                        style={{ color: "var(--accent)" }}
                      />
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: "800",
                            color: "#fff",
                          }}
                        >
                          {t("admin_dashboard.transactions_filter_search")}
                        </h3>
                        <span
                          style={{ fontSize: "12px", color: "var(--text3)" }}
                        >
                          {state.language === "en"
                            ? `Filter through ${pendingPayments.length} financial operations`
                            : `تصفية البحث ضمن ${pendingPayments.length} معاملة مالية`}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* CSV Export Button */}
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={handleExportPaymentsCSV}
                        style={{
                          height: "42px",
                          padding: "0 16px",
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "#10B981",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          borderRadius: "12px",
                          fontWeight: "700",
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Download size={15} />
                        <span>{t("admin_dashboard.export_report_csv")}</span>
                      </button>

                      {/* Reset Filter Button */}
                      {(paymentSearchQuery ||
                        paymentStatusFilter !== "all") && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setPaymentSearchQuery("");
                            setPaymentStatusFilter("all");
                          }}
                          style={{
                            height: "42px",
                            padding: "0 14px",
                            background: "rgba(239, 68, 68, 0.12)",
                            color: "#EF4444",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "12px",
                            fontWeight: "700",
                            fontSize: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <RotateCcw size={15} />
                          <span>{t("admin_dashboard.reset")}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Inputs Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "16px",
                      marginBottom: "20px",
                      background:
                        "linear-gradient(135deg, rgba(17, 24, 39, 0.9), rgba(13, 18, 32, 0.95))",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                      padding: "18px",
                      borderRadius: "16px",
                      alignItems: "end",
                    }}
                    dir={t("admin_dashboard.ltr")}
                  >
                    {/* Search Input */}
                    <div style={{ position: "relative", flex: 1 }}>
                      <label
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "var(--text3)",
                          display: "block",
                          marginBottom: "6px",
                        }}
                      >
                        {t("admin_dashboard.search_keyword")}
                      </label>
                      <div style={{ position: "relative" }}>
                        <Search
                          size={16}
                          style={{
                            position: "absolute",
                            left: t("admin_dashboard.k_14px"),
                            right: state.language?.startsWith("ar")
                              ? "14px"
                              : "auto",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--accent)",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          className="field-input"
                          placeholder={t(
                            "admin_dashboard.search_by_customer_name_email_or_ph",
                          )}
                          value={paymentSearchQuery}
                          onChange={(e) =>
                            setPaymentSearchQuery(e.target.value)
                          }
                          style={{
                            paddingLeft: t("admin_dashboard.k_40px"),
                            paddingRight: state.language?.startsWith("ar")
                              ? "40px"
                              : "14px",
                            fontSize: "13px",
                            height: "44px",
                            background: "rgba(0, 0, 0, 0.3)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "12px",
                            color: "#fff",
                          }}
                        />
                      </div>
                    </div>

                    {/* Status Filter like User Management */}
                    <div className="ad-filter-item">
                      <CustomSelect
                        label={t("admin_dashboard.subscription_status")}
                        value={paymentStatusFilter}
                        onChange={(val) => setPaymentStatusFilter(val)}
                        icon={Filter}
                        options={[
                          {
                            value: "all",
                            label: t("admin_dashboard.all_statuses_all"),
                            icon: Sparkles,
                          },
                          {
                            value: "pending",
                            label: t("admin_dashboard.pending_approval"),
                            icon: Clock,
                          },
                          {
                            value: "approved",
                            label: t("admin_dashboard.approved_payments"),
                            icon: CheckCircle2,
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Transactions Table */}
                  {loadingPayments ? (
                    <div className="ad-empty" style={{ padding: "40px 0" }}>
                      <div
                        className="ad-submit-spinner"
                        style={{ margin: "0 auto 12px" }}
                      />
                      <div>{t("admin_dashboard.loading_transactions")}</div>
                    </div>
                  ) : pendingPayments.length === 0 ? (
                    <div className="ad-empty" style={{ padding: "40px 0" }}>
                      <CreditCard
                        size={40}
                        style={{
                          color: "var(--text3)",
                          marginBottom: "12px",
                          opacity: 0.5,
                        }}
                      />
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: "700",
                          color: "#fff",
                        }}
                      >
                        {t("admin_dashboard.no_transactions_recorded_yet")}
                      </div>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const filtered = pendingPayments.filter((p) => {
                          const q = paymentSearchQuery.toLowerCase();
                          const matchSearch =
                            !paymentSearchQuery ||
                            (p.userName || "").toLowerCase().includes(q) ||
                            (p.userEmail || "").toLowerCase().includes(q) ||
                            (p.userPhone || "").toLowerCase().includes(q);
                          const matchStatus =
                            paymentStatusFilter === "all" ||
                            p.status === paymentStatusFilter;
                          const isPending = !p.status || p.status === "pending";
                          return matchSearch && matchStatus && isPending;
                        });

                        const totalPages = Math.max(
                          1,
                          Math.ceil(filtered.length / 6),
                        );
                        const pageItems = filtered.slice(
                          (paymentCurrentPage - 1) * 6,
                          paymentCurrentPage * 6,
                        );

                        if (filtered.length === 0) {
                          return (
                            <div
                              className="ad-empty"
                              style={{ padding: "40px 0" }}
                            >
                              <Search
                                size={36}
                                style={{
                                  color: "var(--text3)",
                                  marginBottom: "10px",
                                }}
                              />
                              <div>
                                {t(
                                  "admin_dashboard.no_matching_transactions_found",
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <>
                            <div className="sa-table-wrapper" dir="rtl">
                              <table className="sa-table" dir="rtl">
                                <thead>
                                  <tr>
                                    <th style={{ textAlign: "center" }}>
                                      {t("admin_dashboard.customer")}
                                    </th>
                                    <th style={{ textAlign: "center" }}>
                                      {t("admin_dashboard.phone_number")}
                                    </th>
                                    <th style={{ textAlign: "center" }}>
                                      {t("admin_dashboard.payment_method")}
                                    </th>
                                    <th style={{ textAlign: "center" }}>
                                      {t("admin_dashboard.date_time")}
                                    </th>
                                    <th style={{ textAlign: "center" }}>
                                      {t("admin_dashboard.payment_proof")}
                                    </th>
                                    <th style={{ textAlign: "center" }}>
                                      {t("admin_dashboard.status")}
                                    </th>
                                    <th style={{ textAlign: "center" }}>
                                      {t("admin_dashboard.action")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pageItems.map((p) => {
                                    const isPending =
                                      p.status === "pending" || !p.status;
                                    const initials = (p.userName || "Customer")
                                      .slice(0, 2)
                                      .toUpperCase();

                                    return (
                                      <tr
                                        key={p.id}
                                        style={{
                                          background: isPending
                                            ? "rgba(245, 158, 11, 0.02)"
                                            : "rgba(16, 185, 129, 0.02)",
                                          transition: "background 0.2s",
                                          textAlign: "center",
                                        }}
                                      >
                                        <td style={{ textAlign: "center" }}>
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              gap: "12px",
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: "36px",
                                                height: "36px",
                                                borderRadius: "50%",
                                                background:
                                                  "linear-gradient(135deg, var(--accent), #1d4ed8)",
                                                color: "#fff",
                                                fontWeight: "800",
                                                fontSize: "12px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                              }}
                                            >
                                              {initials}
                                            </div>
                                            <div
                                              style={{ textAlign: "center" }}
                                            >
                                              <div
                                                style={{
                                                  fontWeight: "700",
                                                  color: "#fff",
                                                }}
                                              >
                                                {p.userName || "—"}
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: "11px",
                                                  color: "var(--text3)",
                                                }}
                                              >
                                                {p.userEmail || "—"}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td
                                          dir="ltr"
                                          style={{
                                            textAlign: "center",
                                            fontFamily: "monospace",
                                            fontWeight: "600",
                                          }}
                                        >
                                          {p.userPhone || "—"}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                          <div
                                            style={{
                                              color: "var(--text2)",
                                              fontSize: "12px",
                                            }}
                                          >
                                            {p.paymentMethod ||
                                              p.methodName ||
                                              t("admin_dashboard.n_a")}
                                          </div>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                          <div
                                            style={{
                                              fontSize: "12px",
                                              fontWeight: "600",
                                              color: "var(--text2)",
                                              textAlign: "center",
                                            }}
                                          >
                                            {p.createdAt?.seconds
                                              ? new Date(
                                                  p.createdAt.seconds * 1000,
                                                ).toLocaleDateString(
                                                  t("admin_dashboard.en_us"),
                                                  {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                  },
                                                )
                                              : "—"}
                                          </div>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                          {p.receiptUrl ||
                                          p.screenshotUrl ||
                                          p.receipt ||
                                          p.receiptImage ? (
                                            <button
                                              type="button"
                                              className="btn btn-xs"
                                              onClick={() =>
                                                setPreviewReceiptUrl(
                                                  p.receiptUrl ||
                                                    p.screenshotUrl ||
                                                    p.receipt ||
                                                    p.receiptImage,
                                                )
                                              }
                                              style={{
                                                background:
                                                  "rgba(59, 130, 246, 0.1)",
                                                color: "#3B82F6",
                                                border:
                                                  "1px solid rgba(59, 130, 246, 0.25)",
                                                borderRadius: "8px",
                                                padding: "4px 10px",
                                                fontSize: "11px",
                                                fontWeight: "700",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "4px",
                                                cursor: "pointer",
                                                margin: "0 auto",
                                              }}
                                            >
                                              <Eye size={12} />
                                              <span>
                                                {t(
                                                  "admin_dashboard.preview_receipt",
                                                )}
                                              </span>
                                            </button>
                                          ) : (
                                            <span
                                              style={{
                                                fontSize: "11px",
                                                color: "var(--text3)",
                                              }}
                                            >
                                              {t("admin_dashboard.no_receipt")}
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                          {isPending ? (
                                            <span
                                              style={{
                                                color: "#F59E0B",
                                                fontSize: "11px",
                                                fontWeight: "800",
                                                background:
                                                  "rgba(245, 158, 11, 0.12)",
                                                border:
                                                  "1px solid rgba(245, 158, 11, 0.3)",
                                                padding: "4px 10px",
                                                borderRadius: "12px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "4px",
                                                margin: "0 auto",
                                              }}
                                            >
                                              <Clock size={12} />
                                              <span>
                                                {t(
                                                  "admin_dashboard.pending_approval",
                                                )}
                                              </span>
                                            </span>
                                          ) : (
                                            <span
                                              style={{
                                                color: "var(--green)",
                                                fontSize: "11px",
                                                fontWeight: "800",
                                                background:
                                                  "rgba(16, 185, 129, 0.12)",
                                                border:
                                                  "1px solid rgba(16, 185, 129, 0.3)",
                                                padding: "4px 10px",
                                                borderRadius: "12px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "4px",
                                                margin: "0 auto",
                                              }}
                                            >
                                              <CheckCircle2 size={12} />
                                              <span>
                                                {t("admin_dashboard.approved")}
                                              </span>
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                          {isPending ? (
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: "8px",
                                                justifyContent: "center",
                                              }}
                                            >
                                              <button
                                                className="btn btn-xs btn-primary"
                                                onClick={() => {
                                                  setPaymentToApprove(p);
                                                  setSelectedPlanForPayment(
                                                    p.planId || "",
                                                  );
                                                  setSelectedDurationForPayment(
                                                    30,
                                                  );
                                                }}
                                                style={{
                                                  fontSize: "11px",
                                                  fontWeight: "700",
                                                  padding: "6px 12px",
                                                  borderRadius: "8px",
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  gap: "4px",
                                                }}
                                              >
                                                <Check size={13} />
                                                <span>
                                                  {t(
                                                    "admin_dashboard.approve_plan",
                                                  )}
                                                </span>
                                              </button>

                                              <button
                                                className="btn btn-xs"
                                                onClick={() =>
                                                  setPaymentToReject(p)
                                                }
                                                style={{
                                                  fontSize: "11px",
                                                  fontWeight: "700",
                                                  padding: "6px 12px",
                                                  borderRadius: "8px",
                                                  background:
                                                    "rgba(239, 68, 68, 0.1)",
                                                  color: "var(--red)",
                                                  border:
                                                    "1px solid rgba(239, 68, 68, 0.3)",
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  gap: "4px",
                                                }}
                                              >
                                                <X size={13} />
                                                <span>
                                                  {t("admin_dashboard.reject")}
                                                </span>
                                              </button>
                                            </div>
                                          ) : (
                                            <span
                                              style={{
                                                fontSize: "11px",
                                                color: "var(--text3)",
                                              }}
                                            >
                                              ✓ {t("admin_dashboard.verified")}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <div style={{ marginTop: "20px" }}>
                                <Pagination
                                  currentPage={paymentCurrentPage}
                                  totalPages={totalPages}
                                  onPageChange={setPaymentCurrentPage}
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
              {/* Sub-Tab 1: Transactions Log */}
              {paymentsSubTab === "transactions" && (
                <div
                  className="ad-table-card"
                  style={{ padding: "24px" }}
                  dir={t("admin_dashboard.ltr")}
                >
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "18px" }}>
                      {t("admin_dashboard.transactions_history_log")}
                    </h3>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        color: "var(--text3)",
                        fontSize: "13px",
                      }}
                    >
                      {t("admin_dashboard.a_read_only_log_of_all_processed_pa")}
                    </p>
                  </div>
                  <div className="table-responsive">
                    {(() => {
                      const transactionLogs = pendingPayments.filter(
                        (p) => p.status !== "pending",
                      );
                      const itemsPerPage = 8;
                      const totalTransactionsPages =
                        Math.ceil(transactionLogs.length / itemsPerPage) || 1;
                      const paginatedLogs = transactionLogs.slice(
                        (transactionsCurrentPage - 1) * itemsPerPage,
                        transactionsCurrentPage * itemsPerPage,
                      );

                      return (
                        <>
                          <table className="ad-table">
                            <thead>
                              <tr>
                                <th>{t("admin_dashboard.customer")}</th>
                                <th>{t("admin_dashboard.plan")}</th>
                                <th>{t("admin_dashboard.payment_method")}</th>
                                <th>{t("admin_dashboard.amount")}</th>
                                <th>{t("admin_dashboard.status")}</th>
                                <th>{t("admin_dashboard.date")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedLogs.map((p) => (
                                <tr key={p.id}>
                                  <td>
                                    <div>
                                      <strong
                                        style={{
                                          color: "#fff",
                                          display: "block",
                                          fontSize: "13px",
                                        }}
                                      >
                                        {p.userName || "User"}
                                      </strong>
                                      <span
                                        style={{
                                          color: "var(--text3)",
                                          fontSize: "11px",
                                        }}
                                      >
                                        {p.userEmail || p.userPhone}
                                      </span>
                                    </div>
                                  </td>
                                  <td>{p.planName || p.planId || "N/A"}</td>
                                  <td>
                                    {p.paymentMethod ||
                                      p.methodName ||
                                      t("admin_dashboard.n_a")}
                                  </td>
                                  <td>
                                    {p.amount
                                      ? p.currency === "USD"
                                        ? `$${p.amount}`
                                        : `${p.amount} ${p.currency || "EGP"}`
                                      : "-"}
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: "800",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        background:
                                          p.status === "rejected"
                                            ? "rgba(239, 68, 68, 0.12)"
                                            : "rgba(16, 185, 129, 0.12)",
                                        color:
                                          p.status === "rejected"
                                            ? "#EF4444"
                                            : "#10B981",
                                        border: `1px solid ${p.status === "rejected" ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                                      }}
                                    >
                                      {p.status === "rejected"
                                        ? t("admin_dashboard.rejected")
                                        : t(
                                            "admin_dashboard.approved_completed",
                                          )}
                                    </span>
                                  </td>
                                  <td>
                                    {p.createdAt?.seconds
                                      ? new Date(
                                          p.createdAt.seconds * 1000,
                                        ).toLocaleDateString(
                                          t("admin_dashboard.en_us"),
                                        )
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                              {loadingPayments ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    style={{
                                      textAlign: "center",
                                      padding: "40px",
                                    }}
                                  >
                                    <div
                                      className="ad-submit-spinner"
                                      style={{
                                        margin: "0 auto 12px",
                                        borderTopColor: "var(--accent)",
                                      }}
                                    />
                                    <div
                                      style={{
                                        color: "var(--text3)",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {t(
                                        "admin_dashboard.loading_transactions",
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ) : paginatedLogs.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    style={{
                                      textAlign: "center",
                                      padding: "40px",
                                    }}
                                  >
                                    <CreditCard
                                      size={32}
                                      style={{
                                        opacity: 0.3,
                                        margin: "0 auto 12px",
                                        display: "block",
                                      }}
                                    />
                                    <div
                                      style={{
                                        color: "var(--text)",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {t(
                                        "admin_dashboard.no_transactions_found",
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>

                          {totalTransactionsPages > 1 && (
                            <div style={{ marginTop: "20px" }}>
                              <Pagination
                                currentPage={transactionsCurrentPage}
                                totalPages={totalTransactionsPages}
                                onPageChange={setTransactionsCurrentPage}
                              />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Payment Gateways Section */}
              {paymentsSubTab === "gateways" && (
                <div
                  className="ad-table-card"
                  style={{ padding: "24px" }}
                  dir={t("admin_dashboard.ltr")}
                >
                  {/* Header & Save Button Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                      marginBottom: "24px",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "800",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <CreditCard
                          size={20}
                          style={{ color: "var(--accent)" }}
                        />
                        <span>
                          {t(
                            "admin_dashboard.payment_gateways_methods_settings",
                          )}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text3)",
                          marginTop: "4px",
                        }}
                      >
                        {t(
                          "admin_dashboard.configure_instapay_vodafone_cash_ba",
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSavePaymentMethods}
                      disabled={paymentSaving}
                      className="btn btn-primary"
                      style={{
                        height: "42px",
                        padding: "0 22px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: paymentSaved
                          ? "#10B981"
                          : "linear-gradient(135deg, #6366F1, #4F46E5)",
                        boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
                        color: "#fff",
                        border: "none",
                        cursor: paymentSaving ? "not-allowed" : "pointer",
                      }}
                    >
                      {paymentSaving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{t("admin_dashboard.saving")}</span>
                        </>
                      ) : paymentSaved ? (
                        <>
                          <Check size={16} />
                          <span>{t("admin_dashboard.saved")}</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>{t("admin_dashboard.save_settings")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Gateway Cards Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: "24px",
                    }}
                  >
                    {/* Manual Payment Methods Manager */}
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        background:
                          "linear-gradient(135deg, rgba(17, 24, 39, 0.85), rgba(13, 18, 32, 0.95))",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        borderRadius: "18px",
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "18px",
                        boxShadow: "0 10px 30px -10px rgba(139, 92, 246, 0.1)",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "14px",
                            background:
                              "radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.05) 100%)",
                            border: "1px solid rgba(139, 92, 246, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#8B5CF6",
                            boxShadow: "0 0 15px rgba(139, 92, 246, 0.15)",
                          }}
                        >
                          <Wallet size={22} color="#8B5CF6" />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "800",
                              color: "#fff",
                              letterSpacing: "0.2px",
                            }}
                          >
                            {t("admin_dashboard.manual_payment_methods")}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text3)",
                              fontWeight: "600",
                            }}
                          >
                            {t(
                              "admin_dashboard.bank_transfers_vodafone_cash_crypto",
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Add New Method Form */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "12px",
                          alignItems: "flex-end",
                          background: "rgba(0,0,0,0.2)",
                          padding: "16px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div style={{ flex: "1 1 200px" }}>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "var(--text3)",
                              display: "block",
                              marginBottom: "6px",
                            }}
                          >
                            {t("admin_dashboard.method_name_e_g_vodafone_cash")}
                          </label>
                          <input
                            type="text"
                            value={newPayName}
                            onChange={(e) => setNewPayName(e.target.value)}
                            placeholder={t("admin_dashboard.method_name")}
                            className="input"
                            style={{
                              width: "100%",
                              height: "42px",
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(139, 92, 246, 0.2)",
                              borderRadius: "10px",
                              color: "#fff",
                              padding: "0 12px",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                        <div style={{ flex: "1 1 200px" }}>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "var(--text3)",
                              display: "block",
                              marginBottom: "6px",
                            }}
                          >
                            {t("admin_dashboard.transfer_details_number")}
                          </label>
                          <input
                            type="text"
                            value={newPayValue}
                            onChange={(e) => setNewPayValue(e.target.value)}
                            placeholder={t("admin_dashboard.details")}
                            className="input"
                            dir="ltr"
                            style={{
                              width: "100%",
                              height: "42px",
                              background: "rgba(0,0,0,0.35)",
                              border: "1px solid rgba(139, 92, 246, 0.2)",
                              borderRadius: "10px",
                              color: "#fff",
                              padding: "0 12px",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newPayName.trim() || !newPayValue.trim()) {
                              toast(
                                t(
                                  "admin_dashboard.please_enter_both_name_and_details",
                                ),
                                "error",
                              );
                              return;
                            }
                            setPaymentMethods((prev) => ({
                              ...prev,
                              manualMethods: [
                                ...(prev.manualMethods || []),
                                {
                                  id: "pay-" + Date.now(),
                                  name: newPayName.trim(),
                                  value: newPayValue.trim(),
                                },
                              ],
                            }));
                            setNewPayName("");
                            setNewPayValue("");
                          }}
                          style={{
                            height: "42px",
                            padding: "0 20px",
                            background:
                              "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "10px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                          }}
                        >
                          <Plus size={16} />
                          {t("admin_dashboard.add_method")}
                        </button>
                      </div>

                      {/* Methods List */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {(!paymentMethods.manualMethods ||
                          paymentMethods.manualMethods.length === 0) && (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "20px",
                              color: "var(--text3)",
                              fontSize: "13px",
                            }}
                          >
                            {t(
                              "admin_dashboard.no_manual_payment_methods_added_yet",
                            )}
                          </div>
                        )}
                        {paymentMethods.manualMethods?.map((method) => (
                          <div
                            key={method.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              borderRadius: "10px",
                            }}
                          >
                            {editingPayId === method.id ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  flex: 1,
                                  marginRight: "12px",
                                }}
                              >
                                <input
                                  type="text"
                                  value={editingPayName}
                                  onChange={(e) =>
                                    setEditingPayName(e.target.value)
                                  }
                                  className="input"
                                  style={{
                                    flex: 1,
                                    height: "36px",
                                    background: "rgba(0,0,0,0.3)",
                                    border: "1px solid rgba(139,92,246,0.3)",
                                    borderRadius: "8px",
                                    color: "#fff",
                                    padding: "0 10px",
                                    fontSize: "12px",
                                  }}
                                />
                                <input
                                  type="text"
                                  dir="ltr"
                                  value={editingPayValue}
                                  onChange={(e) =>
                                    setEditingPayValue(e.target.value)
                                  }
                                  className="input"
                                  style={{
                                    flex: 2,
                                    height: "36px",
                                    background: "rgba(0,0,0,0.3)",
                                    border: "1px solid rgba(139,92,246,0.3)",
                                    borderRadius: "8px",
                                    color: "#fff",
                                    padding: "0 10px",
                                    fontSize: "12px",
                                    fontFamily: "monospace",
                                  }}
                                />
                              </div>
                            ) : (
                              <div>
                                <div
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    color: "#fff",
                                  }}
                                >
                                  {method.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--text3)",
                                    fontFamily: "monospace",
                                    marginTop: "4px",
                                  }}
                                  dir="ltr"
                                >
                                  {method.value}
                                </div>
                              </div>
                            )}

                            <div style={{ display: "flex", gap: "8px" }}>
                              {editingPayId === method.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (
                                        !editingPayName.trim() ||
                                        !editingPayValue.trim()
                                      ) {
                                        toast(
                                          "يرجى إدخال الاسم والتفاصيل",
                                          "error",
                                        );
                                        return;
                                      }
                                      setPaymentMethods((prev) => ({
                                        ...prev,
                                        manualMethods: prev.manualMethods.map(
                                          (m) =>
                                            m.id === method.id
                                              ? {
                                                  ...m,
                                                  name: editingPayName.trim(),
                                                  value: editingPayValue.trim(),
                                                }
                                              : m,
                                        ),
                                      }));
                                      setEditingPayId(null);
                                    }}
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "8px",
                                      background: "rgba(16, 185, 129, 0.15)",
                                      color: "#10B981",
                                      border:
                                        "1px solid rgba(16, 185, 129, 0.3)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingPayId(null)}
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "8px",
                                      background: "rgba(255, 255, 255, 0.1)",
                                      color: "#fff",
                                      border:
                                        "1px solid rgba(255, 255, 255, 0.2)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingPayId(method.id);
                                      setEditingPayName(method.name);
                                      setEditingPayValue(method.value);
                                    }}
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "8px",
                                      background: "rgba(139, 92, 246, 0.15)",
                                      color: "#8B5CF6",
                                      border:
                                        "1px solid rgba(139, 92, 246, 0.3)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPaymentMethods((prev) => ({
                                        ...prev,
                                        manualMethods:
                                          prev.manualMethods.filter(
                                            (m) => m.id !== method.id,
                                          ),
                                      }));
                                    }}
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "8px",
                                      background: "rgba(239, 68, 68, 0.15)",
                                      color: "#EF4444",
                                      border:
                                        "1px solid rgba(239, 68, 68, 0.3)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Stripe Setup: Responsive Flex Layout ── */}
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "24px",
                        alignItems: "flex-start",
                        width: "100%",
                      }}
                    >
                      {/* ═══════════════════════════════════════════════════════
                        LEFT COL — Stripe Setup Guide Panel
                    ═══════════════════════════════════════════════════════ */}
                      <div
                        style={{
                          order: 2,
                          flex: "1 1 500px",
                          minWidth: "300px",
                          background:
                            "linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(13,18,32,0.95) 100%)",
                          border: "1px solid rgba(99,102,241,0.25)",
                          borderRadius: "18px",
                          padding: "32px",
                          backdropFilter: "blur(12px)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "24px",
                          boxShadow: "0 8px 32px -8px rgba(99,102,241,0.12)",
                        }}
                      >
                        {/* Header */}
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: "6px",
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "10px",
                                background:
                                  "radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.06) 100%)",
                                border: "1px solid rgba(99,102,241,0.4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <HelpCircle size={18} color="#818CF8" />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "800",
                                  color: "#fff",
                                  lineHeight: 1.3,
                                }}
                              >
                                {t("admin_dashboard.how_to_connect_stripe")}
                              </div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "var(--text3)",
                                  marginTop: "2px",
                                }}
                              >
                                {t(
                                  "admin_dashboard.quick_guide_to_retrieve_keys_and_ac",
                                )}
                              </div>
                            </div>
                          </div>
                          <a
                            href="https://dashboard.stripe.com/apikeys"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "8px",
                              background:
                                "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))",
                              border: "1px solid rgba(99,102,241,0.35)",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              color: "#818CF8",
                              fontSize: "11px",
                              fontWeight: "700",
                              textDecoration: "none",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            <ExternalLink size={11} />
                            {t("admin_dashboard.open_stripe_dashboard")}
                          </a>
                        </div>

                        {/* Divider */}
                        <div
                          style={{
                            height: "1px",
                            background: "rgba(99,102,241,0.15)",
                          }}
                        />

                        {/* Step 1 — API Keys */}
                        <div style={{ display: "flex", gap: "12px" }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "8px",
                              flexShrink: 0,
                              background: "rgba(99,102,241,0.15)",
                              border: "1px solid rgba(99,102,241,0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: "800",
                              color: "#818CF8",
                            }}
                          >
                            1
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                marginBottom: "6px",
                              }}
                            >
                              <Key size={13} color="#818CF8" />
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "800",
                                  color: "#fff",
                                }}
                              >
                                {t("admin_dashboard.get_api_keys")}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "5px",
                              }}
                            >
                              {[
                                state.language === "en" ? (
                                  <>
                                    Go to{" "}
                                    <b style={{ color: "#818CF8" }}>
                                      Developers → API Keys
                                    </b>{" "}
                                    in Stripe Dashboard.
                                  </>
                                ) : (
                                  <>
                                    اذهب إلى{" "}
                                    <b style={{ color: "#818CF8" }}>
                                      Developers ➔ API Keys
                                    </b>{" "}
                                    في لوحة تحكم Stripe.
                                  </>
                                ),
                                state.language === "en" ? (
                                  <>
                                    Copy{" "}
                                    <b style={{ color: "#10B981" }}>
                                      Publishable Key
                                    </b>{" "}
                                    (starts with{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      pk_test_
                                    </code>{" "}
                                    or{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      pk_live_
                                    </code>
                                    ) → paste in <b>Publishable Key</b> field.
                                  </>
                                ) : (
                                  <>
                                    انسخ{" "}
                                    <b style={{ color: "#10B981" }}>
                                      Publishable Key
                                    </b>{" "}
                                    (يبدأ بـ{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      pk_test_
                                    </code>{" "}
                                    أو{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      pk_live_
                                    </code>
                                    ) وضعه في خانة <b>المفتاح العام</b>.
                                  </>
                                ),
                                state.language === "en" ? (
                                  <>
                                    Click{" "}
                                    <b style={{ color: "#F59E0B" }}>
                                      Reveal test key
                                    </b>{" "}
                                    to copy{" "}
                                    <b style={{ color: "#10B981" }}>
                                      Secret Key
                                    </b>{" "}
                                    (starts with{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      sk_
                                    </code>
                                    ) → paste in <b>Secret Key</b> field.
                                  </>
                                ) : (
                                  <>
                                    انقر على{" "}
                                    <b style={{ color: "#F59E0B" }}>
                                      Reveal test key
                                    </b>{" "}
                                    لنسخ{" "}
                                    <b style={{ color: "#10B981" }}>
                                      Secret Key
                                    </b>{" "}
                                    (يبدأ بـ{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      sk_
                                    </code>
                                    ) وضعه في خانة <b>المفتاح السري</b>.
                                  </>
                                ),
                              ].map((item, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    gap: "7px",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <CheckCircle2
                                    size={12}
                                    color="#6366F1"
                                    style={{ flexShrink: 0, marginTop: "2px" }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--text2)",
                                      lineHeight: 1.6,
                                    }}
                                  >
                                    {item}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div
                          style={{
                            height: "1px",
                            background: "rgba(255,255,255,0.05)",
                          }}
                        />

                        {/* Step 2 — Webhook */}
                        <div style={{ display: "flex", gap: "12px" }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "8px",
                              flexShrink: 0,
                              background: "rgba(99,102,241,0.15)",
                              border: "1px solid rgba(99,102,241,0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: "800",
                              color: "#818CF8",
                            }}
                          >
                            2
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                marginBottom: "6px",
                              }}
                            >
                              <Zap size={13} color="#818CF8" />
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "800",
                                  color: "#fff",
                                }}
                              >
                                {t("admin_dashboard.set_up_webhook_optional")}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "5px",
                              }}
                            >
                              {[
                                state.language === "en" ? (
                                  <>
                                    Go to{" "}
                                    <b style={{ color: "#818CF8" }}>
                                      Developers → Webhooks
                                    </b>{" "}
                                    and click{" "}
                                    <b style={{ color: "#F59E0B" }}>
                                      Add endpoint
                                    </b>
                                    .
                                  </>
                                ) : (
                                  <>
                                    اذهب إلى{" "}
                                    <b style={{ color: "#818CF8" }}>
                                      Developers ➔ Webhooks
                                    </b>{" "}
                                    واضغط على{" "}
                                    <b style={{ color: "#F59E0B" }}>
                                      Add endpoint
                                    </b>
                                    .
                                  </>
                                ),
                                state.language === "en" ? (
                                  <>Paste this URL in the endpoint field:</>
                                ) : (
                                  <>ضع رابط الـ Webhook الخاص بموقعك:</>
                                ),
                              ].map((item, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    gap: "7px",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <CheckCircle2
                                    size={12}
                                    color="#6366F1"
                                    style={{ flexShrink: 0, marginTop: "2px" }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--text2)",
                                      lineHeight: 1.6,
                                    }}
                                  >
                                    {item}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {/* Webhook URL box */}
                            <div
                              style={{
                                margin: "12px 0",
                                background: "rgba(0,0,0,0.5)",
                                border: "1px solid rgba(99,102,241,0.3)",
                                borderRadius: "10px",
                                padding: "12px 16px",
                                fontFamily: "monospace",
                                fontSize: "11.5px",
                                color: "#818CF8",
                                wordBreak: "break-all",
                                lineHeight: 1.6,
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <Webhook
                                  size={14}
                                  style={{ flexShrink: 0, color: "#6366F1" }}
                                />
                                <span>
                                  https://us-central1-event-upklick.cloudfunctions.net/stripeWebhook
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigator.clipboard.writeText(
                                    "https://us-central1-event-upklick.cloudfunctions.net/stripeWebhook",
                                  );
                                  toast(t("admin_dashboard.copied"), "success");
                                }}
                                style={{
                                  background: "rgba(99, 102, 241, 0.15)",
                                  border: "1px solid rgba(99, 102, 241, 0.3)",
                                  borderRadius: "8px",
                                  padding: "6px 12px",
                                  color: "#818CF8",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  transition: "all 0.2s",
                                }}
                              >
                                <Copy size={12} />
                                {t("admin_dashboard.copy")}
                              </button>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "5px",
                              }}
                            >
                              {[
                                state.language === "en" ? (
                                  <>
                                    Select event:{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      checkout.session.completed
                                    </code>
                                  </>
                                ) : (
                                  <>
                                    حدد الحدث (Event):{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      checkout.session.completed
                                    </code>
                                  </>
                                ),
                                state.language === "en" ? (
                                  <>
                                    Save, then copy{" "}
                                    <b style={{ color: "#10B981" }}>
                                      Signing Secret
                                    </b>{" "}
                                    (starts with{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      whsec_
                                    </code>
                                    ) → paste in <b>Webhook Secret</b> field.
                                  </>
                                ) : (
                                  <>
                                    اضغط حفظ، ثم انسخ{" "}
                                    <b style={{ color: "#10B981" }}>
                                      Signing Secret
                                    </b>{" "}
                                    (يبدأ بـ{" "}
                                    <code
                                      style={{
                                        color: "#818CF8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      whsec_
                                    </code>
                                    ) وضعه في خانة <b>سر الـ Webhook</b>.
                                  </>
                                ),
                              ].map((item, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    gap: "7px",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <CheckCircle2
                                    size={12}
                                    color="#6366F1"
                                    style={{ flexShrink: 0, marginTop: "2px" }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--text2)",
                                      lineHeight: 1.6,
                                    }}
                                  >
                                    {item}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div
                          style={{
                            height: "1px",
                            background: "rgba(255,255,255,0.05)",
                          }}
                        />

                        {/* Step 3 — Test vs Live */}
                        <div
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(245,158,11,0.2)",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            display: "flex",
                            gap: "10px",
                            alignItems: "flex-start",
                          }}
                        >
                          <ShieldCheck
                            size={16}
                            color="#F59E0B"
                            style={{ flexShrink: 0, marginTop: "1px" }}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: "800",
                                color: "#F59E0B",
                                marginBottom: "6px",
                              }}
                            >
                              {t("admin_dashboard.test_mode_vs_live_mode")}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "var(--text2)",
                                  lineHeight: 1.6,
                                }}
                              >
                                🧪{" "}
                                {state.language === "en" ? (
                                  <>
                                    Use keys starting with{" "}
                                    <code style={{ color: "#818CF8" }}>
                                      pk_test_
                                    </code>{" "}
                                    /{" "}
                                    <code style={{ color: "#818CF8" }}>
                                      sk_test_
                                    </code>{" "}
                                    and test card{" "}
                                    <code style={{ color: "#10B981" }}>
                                      4242 4242 4242 4242
                                    </code>
                                  </>
                                ) : (
                                  <>
                                    للاختبار: استخدم مفاتيح تبدأ بـ{" "}
                                    <code style={{ color: "#818CF8" }}>
                                      pk_test_
                                    </code>{" "}
                                    /{" "}
                                    <code style={{ color: "#818CF8" }}>
                                      sk_test_
                                    </code>{" "}
                                    وبطاقة تجريبية{" "}
                                    <code style={{ color: "#10B981" }}>
                                      4242 4242 4242 4242
                                    </code>
                                  </>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "var(--text2)",
                                  lineHeight: 1.6,
                                }}
                              >
                                🚀{" "}
                                {state.language === "en" ? (
                                  <>
                                    For production: disable{" "}
                                    <b style={{ color: "#F59E0B" }}>
                                      Test Mode
                                    </b>{" "}
                                    in Stripe and use{" "}
                                    <code style={{ color: "#818CF8" }}>
                                      pk_live_
                                    </code>{" "}
                                    /{" "}
                                    <code style={{ color: "#818CF8" }}>
                                      sk_live_
                                    </code>{" "}
                                    keys.
                                  </>
                                ) : (
                                  <>
                                    للعمل الفعلي: أوقف{" "}
                                    <b style={{ color: "#F59E0B" }}>
                                      Test Mode
                                    </b>{" "}
                                    من أعلى شاشة Stripe وانسخ المفاتيح الحقيقية{" "}
                                    <code style={{ color: "#818CF8" }}>
                                      pk_live_
                                    </code>{" "}
                                    /{" "}
                                    <code style={{ color: "#818CF8" }}>
                                      sk_live_
                                    </code>
                                    .
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* ═══════════════════════════════════════════════════════
                        RIGHT COL — Stripe Gateway Settings Card (unchanged)
                    ═══════════════════════════════════════════════════════ */}

                      {/* 3. Stripe Card */}
                      <div
                        style={{
                          order: 1,
                          flex: "0 0 380px",
                          maxWidth: "100%",
                          background:
                            "linear-gradient(135deg, rgba(17, 24, 39, 0.85), rgba(13, 18, 32, 0.95))",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                          borderRadius: "18px",
                          padding: "24px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "18px",
                          boxShadow:
                            "0 10px 30px -10px rgba(99, 102, 241, 0.1)",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "14px",
                                background:
                                  "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.05) 100%)",
                                border: "1px solid rgba(99, 102, 241, 0.4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#6366F1",
                                boxShadow: "0 0 15px rgba(99, 102, 241, 0.15)",
                              }}
                            >
                              <ShieldCheck size={22} color="#6366F1" />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "800",
                                  color: "#fff",
                                  letterSpacing: "0.2px",
                                }}
                              >
                                Stripe Gateway
                              </div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text3)",
                                  fontWeight: "600",
                                }}
                              >
                                {t("admin_dashboard.credit_cards_links")}
                              </div>
                            </div>
                          </div>

                          <div
                            onClick={() =>
                              setPaymentMethods((prev) => ({
                                ...prev,
                                stripe: {
                                  ...prev.stripe,
                                  enabled: !prev.stripe?.enabled,
                                },
                              }))
                            }
                            style={{
                              width: "48px",
                              height: "26px",
                              borderRadius: "13px",
                              background: paymentMethods.stripe?.enabled
                                ? "linear-gradient(135deg, #10B981, #059669)"
                                : "rgba(255, 255, 255, 0.1)",
                              border: `1px solid ${paymentMethods.stripe?.enabled ? "#10B981" : "rgba(255, 255, 255, 0.15)"}`,
                              position: "relative",
                              transition:
                                "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                              cursor: "pointer",
                              boxShadow: paymentMethods.stripe?.enabled
                                ? "0 0 12px rgba(16, 185, 129, 0.3)"
                                : "none",
                            }}
                          >
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: "#FFF",
                                position: "absolute",
                                top: "2px",
                                left: paymentMethods.stripe?.enabled
                                  ? "25px"
                                  : "2px",
                                transition:
                                  "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                              }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "var(--text3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                marginBottom: "4px",
                              }}
                            >
                              <Key size={11} style={{ color: "#6366F1" }} />
                              <span>
                                {t("admin_dashboard.publishable_key")}
                              </span>
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder="pk_live_..."
                              value={
                                paymentMethods.stripe?.publishableKey || ""
                              }
                              onChange={(e) =>
                                setPaymentMethods((prev) => ({
                                  ...prev,
                                  stripe: {
                                    ...prev.stripe,
                                    publishableKey: e.target.value,
                                  },
                                }))
                              }
                              className="input"
                              style={{
                                width: "100%",
                                height: "38px",
                                background: "rgba(0,0,0,0.35)",
                                border: "1px solid rgba(99, 102, 241, 0.2)",
                                borderRadius: "8px",
                                color: "#fff",
                                padding: "0 10px",
                                fontSize: "12px",
                              }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "var(--text3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                marginBottom: "4px",
                              }}
                            >
                              <Lock size={11} style={{ color: "#6366F1" }} />
                              <span>{t("admin_dashboard.secret_key")}</span>
                            </label>
                            <input
                              type="password"
                              dir="ltr"
                              placeholder="sk_live_..."
                              value={paymentMethods.stripe?.secretKey || ""}
                              onChange={(e) =>
                                setPaymentMethods((prev) => ({
                                  ...prev,
                                  stripe: {
                                    ...prev.stripe,
                                    secretKey: e.target.value,
                                  },
                                }))
                              }
                              className="input"
                              style={{
                                width: "100%",
                                height: "38px",
                                background: "rgba(0,0,0,0.35)",
                                border: "1px solid rgba(99, 102, 241, 0.2)",
                                borderRadius: "8px",
                                color: "#fff",
                                padding: "0 10px",
                                fontSize: "12px",
                              }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "var(--text3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                marginBottom: "4px",
                              }}
                            >
                              <CreditCard
                                size={11}
                                style={{ color: "#6366F1" }}
                              />
                              <span>
                                {t("admin_dashboard.payment_link_monthly")}
                              </span>
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder="https://buy.stripe.com/..."
                              value={paymentMethods.stripe?.paymentLink || ""}
                              onChange={(e) =>
                                setPaymentMethods((prev) => ({
                                  ...prev,
                                  stripe: {
                                    ...prev.stripe,
                                    paymentLink: e.target.value,
                                  },
                                }))
                              }
                              className="input"
                              style={{
                                width: "100%",
                                height: "38px",
                                background: "rgba(0,0,0,0.35)",
                                border: "1px solid rgba(99, 102, 241, 0.2)",
                                borderRadius: "8px",
                                color: "#fff",
                                padding: "0 10px",
                                fontSize: "12px",
                              }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "var(--text3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                marginBottom: "4px",
                              }}
                            >
                              <CreditCard
                                size={11}
                                style={{ color: "#6366F1" }}
                              />
                              <span>
                                {t("admin_dashboard.payment_link_annual")}
                              </span>
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder="https://buy.stripe.com/..."
                              value={
                                paymentMethods.stripe?.paymentLinkAnnual || ""
                              }
                              onChange={(e) =>
                                setPaymentMethods((prev) => ({
                                  ...prev,
                                  stripe: {
                                    ...prev.stripe,
                                    paymentLinkAnnual: e.target.value,
                                  },
                                }))
                              }
                              className="input"
                              style={{
                                width: "100%",
                                height: "38px",
                                background: "rgba(0,0,0,0.35)",
                                border: "1px solid rgba(99, 102, 241, 0.2)",
                                borderRadius: "8px",
                                color: "#fff",
                                padding: "0 10px",
                                fontSize: "12px",
                              }}
                            />
                          </div>

                          {/* ── Webhook Secret (Optional) ─────────────────────── */}
                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "var(--text3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                marginBottom: "4px",
                              }}
                            >
                              <Zap size={11} style={{ color: "#6366F1" }} />
                              <span>{t("admin_dashboard.webhook_secret")}</span>
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: "600",
                                  color: "var(--text3)",
                                  background: "rgba(255,255,255,0.07)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  borderRadius: "4px",
                                  padding: "1px 5px",
                                }}
                              >
                                {t("admin_dashboard.optional")}
                              </span>
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder={t("admin_dashboard.whsec_optional")}
                              value={paymentMethods.stripe?.webhookSecret || ""}
                              onChange={(e) =>
                                setPaymentMethods((prev) => ({
                                  ...prev,
                                  stripe: {
                                    ...prev.stripe,
                                    webhookSecret: e.target.value,
                                  },
                                }))
                              }
                              className="input"
                              style={{
                                width: "100%",
                                height: "38px",
                                background: "rgba(0,0,0,0.35)",
                                border: "1px solid rgba(99, 102, 241, 0.2)",
                                borderRadius: "8px",
                                color: "#fff",
                                padding: "0 10px",
                                fontSize: "12px",
                              }}
                            />
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--text3)",
                                marginTop: "4px",
                                lineHeight: 1.5,
                              }}
                            >
                              {t(
                                "admin_dashboard.from_stripe_dashboard_webhooks_sign",
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* ── End of Stripe Setup: 2-col grid ── */}
                    </div>
                  </div>
                </div>
              )}

              {/* Light-box Receipt Image Modal */}
              <AnimatePresence>
                {previewReceiptUrl && (
                  <div
                    className="ad-modal-overlay"
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0,0,0,0.85)",
                      zIndex: 99999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backdropFilter: "blur(6px)",
                      padding: "20px",
                    }}
                    onClick={() => setPreviewReceiptUrl(null)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "#111827",
                        borderRadius: "20px",
                        padding: "24px",
                        maxWidth: "600px",
                        width: "100%",
                        border: "1px solid var(--line)",
                        position: "relative",
                        textAlign: "center",
                      }}
                    >
                      <button
                        onClick={() => setPreviewReceiptUrl(null)}
                        style={{
                          position: "absolute",
                          top: "16px",
                          right: "16px",
                          background: "rgba(255,255,255,0.1)",
                          border: "none",
                          color: "#fff",
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <X size={18} />
                      </button>
                      <h3
                        style={{
                          marginBottom: "16px",
                          color: "#fff",
                          fontSize: "16px",
                          fontWeight: "800",
                        }}
                      >
                        {t("admin_dashboard.payment_proof_screenshot")}
                      </h3>
                      <div
                        style={{
                          borderRadius: "12px",
                          overflow: "hidden",
                          maxHeight: "70vh",
                          background: "#000",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={previewReceiptUrl}
                          alt="Receipt Preview"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "65vh",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      <div style={{ marginTop: "16px" }}>
                        <a
                          href={previewReceiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm"
                          style={{
                            background: "var(--accent)",
                            color: "#fff",
                            padding: "8px 16px",
                            borderRadius: "10px",
                            textDecoration: "none",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <ExternalLink size={14} />
                          <span>{t("admin_dashboard.open_full_image")}</span>
                        </a>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Reject Payment Modal */}
              {paymentToReject && (
                <div
                  className="ad-modal-overlay"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.85)",
                    zIndex: 99999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(6px)",
                    padding: "20px",
                  }}
                  onClick={() => setPaymentToReject(null)}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    dir={t("admin_dashboard.ltr")}
                    style={{
                      background: "#111827",
                      width: "90%",
                      maxWidth: "500px",
                      borderRadius: "16px",
                      padding: "32px",
                      position: "relative",
                      border: "1px solid #EF4444",
                      boxShadow: "0 25px 50px -12px rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    <button
                      className="ad-modal-close"
                      onClick={() => setPaymentToReject(null)}
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "transparent",
                        border: "none",
                        color: "#9CA3AF",
                        fontSize: "20px",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                    <h3 style={{ marginBottom: "20px", color: "#EF4444" }}>
                      {t("admin_dashboard.reject_payment_request")}
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "var(--text2)",
                        marginBottom: "16px",
                      }}
                    >
                      {t("admin_dashboard.customer_1")}
                      <strong style={{ color: "#fff" }}>
                        {paymentToReject.userName}
                      </strong>
                    </p>

                    <div className="field" style={{ marginBottom: "24px" }}>
                      <label className="field-label">
                        {t("admin_dashboard.reason_for_rejection")}
                      </label>
                      <textarea
                        className="field-input"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder={t(
                          "admin_dashboard.enter_the_reason_for_rejecting_the",
                        )}
                        rows={4}
                        style={{
                          minHeight: "100px",
                          padding: "12px",
                          borderRadius: "10px",
                          width: "100%",
                        }}
                      />
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        background: "#EF4444",
                        color: "#fff",
                        border: "none",
                        padding: "12px",
                        borderRadius: "10px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                      onClick={handleRejectPayment}
                    >
                      {t("admin_dashboard.confirm_rejection")}
                    </button>
                  </div>
                </div>
              )}

              {/* Approval Modal */}
              {paymentToApprove && (
                <div
                  className="ad-modal-overlay"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.8)",
                    zIndex: 99999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="ad-modal"
                    style={{
                      background: "#111827",
                      width: "90%",
                      maxWidth: "500px",
                      borderRadius: "16px",
                      padding: "32px",
                      position: "relative",
                      border: "1px solid #374151",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                    }}
                  >
                    <button
                      className="ad-modal-close"
                      onClick={() => setPaymentToApprove(null)}
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "transparent",
                        border: "none",
                        color: "#9CA3AF",
                        fontSize: "20px",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          borderRadius: "50%",
                          background: "rgba(16, 185, 129, 0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 16px",
                        }}
                      >
                        <CheckCircle2 size={32} style={{ color: "#10B981" }} />
                      </div>
                      <h3
                        style={{
                          margin: "0 0 8px 0",
                          color: "#fff",
                          fontSize: "20px",
                          fontWeight: "800",
                        }}
                      >
                        {t("admin_dashboard.confirm_subscription_approval")}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          color: "var(--text3)",
                          fontSize: "14px",
                        }}
                      >
                        {t(
                          "admin_dashboard.review_the_details_before_activatin",
                        )}
                      </p>
                    </div>

                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "20px",
                        marginBottom: "24px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <span
                          style={{ color: "var(--text2)", fontSize: "14px" }}
                        >
                          {t("admin_dashboard.customer")}
                        </span>
                        <strong style={{ color: "#fff", fontSize: "14px" }}>
                          {paymentToApprove.userName || "—"}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <span
                          style={{ color: "var(--text2)", fontSize: "14px" }}
                        >
                          {t("admin_dashboard.requested_plan")}
                        </span>
                        <strong
                          style={{ color: "var(--accent)", fontSize: "14px" }}
                        >
                          {paymentToApprove.planName ||
                            paymentToApprove.planId ||
                            "—"}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <span
                          style={{ color: "var(--text2)", fontSize: "14px" }}
                        >
                          {t("admin_dashboard.duration")}
                        </span>
                        <strong style={{ color: "#fff", fontSize: "14px" }}>
                          {t("admin_dashboard.k_30_days_standard")}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <span
                          style={{ color: "var(--text2)", fontSize: "14px" }}
                        >
                          {t("admin_dashboard.payment_method")}
                        </span>
                        <strong style={{ color: "#fff", fontSize: "14px" }}>
                          {paymentToApprove.paymentMethod ||
                            paymentToApprove.methodName ||
                            t("admin_dashboard.n_a")}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{ color: "var(--text2)", fontSize: "14px" }}
                        >
                          {t("admin_dashboard.amount_paid")}
                        </span>
                        <strong
                          style={{
                            color: "#10B981",
                            fontSize: "15px",
                            fontWeight: "800",
                          }}
                        >
                          {paymentToApprove.amount
                            ? paymentToApprove.currency === "USD"
                              ? `$${paymentToApprove.amount}`
                              : `${paymentToApprove.amount} ${paymentToApprove.currency || "EGP"}`
                            : "—"}
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        type="button"
                        onClick={() => setPaymentToApprove(null)}
                        style={{
                          flex: 1,
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "#fff",
                          border: "none",
                          padding: "12px",
                          borderRadius: "10px",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.background =
                            "rgba(255, 255, 255, 0.1)")
                        }
                        onMouseOut={(e) =>
                          (e.target.style.background =
                            "rgba(255, 255, 255, 0.05)")
                        }
                      >
                        {t("admin_dashboard.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleApprovePayment}
                        style={{
                          flex: 2,
                          background: "#10B981",
                          color: "#fff",
                          border: "none",
                          padding: "12px",
                          borderRadius: "10px",
                          fontWeight: "700",
                          cursor: "pointer",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.transform = "translateY(-1px)")
                        }
                        onMouseOut={(e) => (e.target.style.transform = "none")}
                      >
                        {t("admin_dashboard.confirm_activate_plan")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Stripe Settings Modal */}
              {isStripeSettingsModalOpen && (
                <div
                  className="ad-modal-overlay"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.85)",
                    zIndex: 99999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(6px)",
                    padding: "20px",
                  }}
                  onClick={() => setIsStripeSettingsModalOpen(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="ad-modal"
                    dir={t("admin_dashboard.ltr")}
                    style={{
                      background: "#111827",
                      width: "100%",
                      maxWidth: "540px",
                      borderRadius: "20px",
                      padding: "28px",
                      position: "relative",
                      border: "1px solid rgba(103, 114, 229, 0.3)",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
                    }}
                  >
                    {/* Header with non-overlapping Close Button */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px",
                        paddingBottom: "14px",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          fontSize: "17px",
                          fontWeight: "800",
                        }}
                      >
                        <CreditCard size={22} style={{ color: "#6772E5" }} />
                        <span>
                          {t("admin_dashboard.stripe_gateway_connection")}
                        </span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsStripeSettingsModalOpen(false)}
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid var(--line)",
                          color: "#9CA3AF",
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s",
                          flexShrink: 0,
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Modal Sub Tabs */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "20px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setStripeModalTab("settings")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: "10px",
                          border: "none",
                          background:
                            stripeModalTab === "settings"
                              ? "#6772E5"
                              : "rgba(255,255,255,0.05)",
                          color: "#fff",
                          fontWeight: "700",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Settings size={15} />
                        <span>{t("admin_dashboard.credentials")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStripeModalTab("test")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: "10px",
                          border: "none",
                          background:
                            stripeModalTab === "test"
                              ? "#6772E5"
                              : "rgba(255,255,255,0.05)",
                          color: "#fff",
                          fontWeight: "700",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Zap size={15} />
                        <span>{t("admin_dashboard.test_connection")}</span>
                      </button>
                    </div>

                    {stripeModalTab === "settings" ? (
                      <>
                        <div className="field" style={{ marginBottom: "14px" }}>
                          <label
                            className="field-label"
                            style={{
                              color: "#6772E5",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "6px",
                            }}
                          >
                            <Lock size={14} />
                            <span>Stripe Secret Key</span>
                          </label>
                          <input
                            className="field-input"
                            placeholder="sk_test_..."
                            value={stripeSecretKey}
                            onChange={(e) => setStripeSecretKey(e.target.value)}
                            dir="ltr"
                          />
                        </div>
                        <div className="field" style={{ marginBottom: "14px" }}>
                          <label
                            className="field-label"
                            style={{
                              color: "#6772E5",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "6px",
                            }}
                          >
                            <Key size={14} />
                            <span>Stripe Publishable Key</span>
                          </label>
                          <input
                            className="field-input"
                            placeholder="pk_test_..."
                            value={stripePublishableKey}
                            onChange={(e) =>
                              setStripePublishableKey(e.target.value)
                            }
                            dir="ltr"
                          />
                        </div>
                        <div className="field" style={{ marginBottom: "20px" }}>
                          <label
                            className="field-label"
                            style={{
                              color: "#6772E5",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "6px",
                            }}
                          >
                            <Zap size={14} />
                            <span>{t("admin_dashboard.webhook_secret")}</span>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                color: "var(--text3)",
                                background: "rgba(255,255,255,0.07)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "4px",
                                padding: "1px 6px",
                                letterSpacing: "0.3px",
                              }}
                            >
                              {t("admin_dashboard.optional")}
                            </span>
                          </label>
                          <input
                            className="field-input"
                            placeholder={t(
                              "admin_dashboard.whsec_optional_for_production_signa",
                            )}
                            value={stripeWebhookSecret}
                            onChange={(e) =>
                              setStripeWebhookSecret(e.target.value)
                            }
                            dir="ltr"
                          />
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text3)",
                              marginTop: "6px",
                              lineHeight: 1.5,
                            }}
                          >
                            {t(
                              "admin_dashboard.copy_from_stripe_dashboard_webhooks",
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "24px 16px",
                          background: "rgba(0,0,0,0.25)",
                          borderRadius: "14px",
                          marginBottom: "20px",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <CreditCard
                          size={40}
                          style={{ color: "#6772E5", marginBottom: "12px" }}
                        />
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#fff",
                            marginBottom: "6px",
                          }}
                        >
                          {t("admin_dashboard.simulate_api_connection_test")}
                        </div>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--text3)",
                            marginBottom: "16px",
                          }}
                        >
                          {t(
                            "admin_dashboard.check_key_format_and_webhook_endpoi",
                          )}
                        </p>
                        {isTestingStripe ? (
                          <div
                            style={{
                              color: "#6772E5",
                              fontWeight: "700",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                            }}
                          >
                            <Loader2 size={16} className="animate-spin" />
                            <span>
                              {t("admin_dashboard.testing_connection")}
                            </span>
                          </div>
                        ) : stripeTestSuccess ? (
                          <div
                            style={{
                              color: "var(--green)",
                              fontWeight: "800",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            <CheckCircle2 size={16} />
                            <span>
                              {t("admin_dashboard.stripe_credentials_verified")}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => {
                              setIsTestingStripe(true);
                              setTimeout(() => {
                                setIsTestingStripe(false);
                                setStripeTestSuccess(true);
                              }, 1000);
                            }}
                            style={{
                              background: "#6772E5",
                              color: "#fff",
                              padding: "10px 24px",
                              borderRadius: "10px",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Zap size={15} />
                            <span>
                              {t("admin_dashboard.start_connection_test")}
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      className="ad-submit-btn"
                      style={{ width: "100%", background: "#6772E5" }}
                      onClick={() => setIsStripeSettingsModalOpen(false)}
                    >
                      {t("admin_dashboard.save_close_window")}
                    </button>
                  </motion.div>
                </div>
              )}
            </div>
          ) : activeTab === "tutorial" ? (
            <div className="ad-content animate-in" style={{ padding: 0 }}>
              <PlatformExplanation
                title={
                  state.language === "en"
                    ? "SuperAdmin & Brand Masterclass Guide"
                    : "شرح منصة الأدمن (مالك البراند)"
                }
                videoUrl="https://firebasestorage.googleapis.com/v0/b/aibrand-vision.firebasestorage.app/o/Videos%2F%D8%B4%D8%B1%D8%AD%20%D9%85%D9%88%D9%82%D8%B9%20%D8%A7%D9%84%D8%A3%D8%AF%D9%85%D9%86%20(%D9%85%D8%A7%D9%84%D9%83%20%D8%A7%D9%84%D8%A8%D8%B1%D8%A7%D9%86%D8%AF).webm?alt=media&token=c3b6e0dd-c406-4c37-a853-ac637b869402"
                lang={state.language || "ar"}
              />
            </div>
          ) : activeTab === "support" ? (
            <SupportSection />
          ) : activeTab === "library" ? (
            <AdminLibrary userData={userData} />
          ) : activeTab === "ai_settings" ? (
            <div className="ad-content animate-in">
              <AiSettingsPage />
            </div>
          ) : activeTab === "templates" ? (
            <div className="ad-content animate-in">
              <AdminTemplateManager />
            </div>
          ) : activeTab === "marketing_tracking" ? (
            <div className="ad-content animate-in">
              <MarketingTrackingSection
                isAdmin={true}
                userId={userData?.uid}
                isRtl={state.language?.startsWith("ar")}
                t={(ar, en) => (state.language?.startsWith("ar") ? ar : en)}
              />
            </div>
          ) : (
            <div
              className="ad-content animate-in"
              dir={state.language === "en" ? "ltr" : "rtl"}
            >
              {/* Brand Settings Page Header & Progress Section */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(13, 18, 32, 0.98))",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "24px",
                  marginBottom: "24px",
                  boxShadow: "0 15px 35px -5px rgba(0, 0, 0, 0.4)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "14px",
                        background:
                          "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent)",
                      }}
                    >
                      <Settings size={26} />
                    </div>
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "22px",
                          fontWeight: "800",
                          color: "#fff",
                        }}
                      >
                        {state.language === "en"
                          ? "Brand Settings & Customization"
                          : "إعدادات الهوية والبراند"}
                      </h2>
                      <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                        {state.language === "en"
                          ? "Customize your brand profile, theme palette, social links, and landing page"
                          : "تخصيص الهوية البصرية، ألوان المنصة، روابط التواصل، وصفحة الهبوط الخاصة بك"}
                      </span>
                    </div>
                  </div>

                  {/* Keyboard Shortcut Hint & Last Saved Info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {lastSavedTimestamp && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#10B981",
                          background: "rgba(16, 185, 129, 0.12)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          padding: "4px 10px",
                          borderRadius: "10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <CheckCircle2 size={13} />
                        {state.language === "en"
                          ? `Last Saved: ${lastSavedTimestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : `آخر حفظ: ${lastSavedTimestamp.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "var(--accent)",
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.25)",
                        padding: "4px 10px",
                        borderRadius: "10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title="Press Ctrl+S / Cmd+S to quick save"
                    >
                      <Save size={13} />
                      <span>Ctrl + S</span>
                    </span>
                  </div>
                </div>

                {/* Completion Progress Bar */}
                {(() => {
                  let score = 0;
                  if (ownerNameForm.trim()) score += 15;
                  if (brandNameForm.trim()) score += 15;
                  if (phoneNumberForm.trim()) score += 15;
                  if (accentColor && bgColor) score += 15;
                  if (
                    socialLinks.facebook ||
                    socialLinks.instagram ||
                    socialLinks.tiktok ||
                    socialLinks.twitter ||
                    socialLinks.linkedin
                  )
                    score += 15;
                  if (landingTemplate) score += 15;
                  if (logoDisplayMode) score += 10;
                  const progressPct = Math.min(100, score);

                  return (
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        padding: "16px 20px",
                        borderRadius: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#fff",
                          }}
                        >
                          {state.language === "en"
                            ? "Brand Setup Completion"
                            : "نسبة اكتمال إعدادات البراند"}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "800",
                            color:
                              progressPct >= 80 ? "#10B981" : "var(--accent)",
                          }}
                        >
                          {progressPct}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          background: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "10px",
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{
                            height: "100%",
                            background:
                              progressPct >= 80
                                ? "linear-gradient(90deg, #10B981, #059669)"
                                : "linear-gradient(90deg, #3B82F6, #06B6D4)",
                            borderRadius: "10px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-Tab Navigation Bar with Modern Smooth Arrow Controls */}
                <div
                  style={{
                    position: "relative",
                    marginTop: "20px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {/* Right Navigation Arrow Button */}
                  <button
                    type="button"
                    className="ad-subtabs-nav-btn"
                    onClick={() => {
                      if (brandSubTabsScrollRef.current) {
                        const isAr = state.language !== "en";
                        brandSubTabsScrollRef.current.scrollBy({
                          left: isAr ? 260 : -260,
                          behavior: "smooth",
                        });
                      }
                    }}
                    title={
                      state.language === "en" ? "Scroll Left" : "تمرير لليمين"
                    }
                    style={{ flexShrink: 0 }}
                  >
                    <ChevronRight size={18} />
                  </button>

                  {/* Scrollable Container with Hidden Scrollbar */}
                  <div
                    ref={brandSubTabsScrollRef}
                    className="ad-subtabs-scroll-container"
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {[
                      {
                        id: "personal",
                        label_en: "Personal & Brand Info",
                        label_ar: "البيانات الشخصية والبراند",
                        label_gcc: "البيانات وهوية البراند",
                        icon: UserCheck,
                      },
                      {
                        id: "colors",
                        label_en: "Brand Colors & Palette",
                        label_ar: "ألوان الهوية والثيمات",
                        label_gcc: "ألوان وثيمات البراند",
                        icon: Palette,
                      },
                      {
                        id: "hero",
                        label_en: "Hero Section",
                        label_ar: "القسم الرئيسي (Hero)",
                        label_gcc: "الواجهة الرئيسية (Hero)",
                        icon: Rocket,
                      },
                      {
                        id: "finalCta",
                        label_en: "Final CTA Section",
                        label_ar: "قسم الختام (Final CTA)",
                        label_gcc: "الدعوة الأخيرة (CTA)",
                        icon: Sparkles,
                      },
                      {
                        id: "social",
                        label_en: "Social Media Links",
                        label_ar: "منصات التواصل الاجتماعي",
                        label_gcc: "حسابات التواصل الاجتماعي",
                        icon: Share2,
                      },
                      {
                        id: "legal",
                        label_en: "Legal & FAQs",
                        label_ar: "الشروط والسياسات / FAQs",
                        label_gcc: "الشروط والسياسات والأسئلة الشائعة",
                        icon: FileText,
                      },
                      {
                        id: "failures",
                        label_en: "Why Brands Fail",
                        label_ar: "ليه معظم البراندات بتفشل",
                        label_gcc: "ليش أغلب المشاريع تفشل",
                        icon: AlertTriangle,
                      },
                      {
                        id: "reviews",
                        label_en: "Customer Reviews",
                        label_ar: "آراء وتقييمات العملاء",
                        label_gcc: "آراء وتقييمات المشتركين",
                        icon: Star,
                      },
                      {
                        id: "video",
                        label_en: "Explainer Video",
                        label_ar: "فيديو شرح المنصة",
                        label_gcc: "فيديو شرح المنصة",
                        icon: Video,
                      },
                      {
                        id: "nicheRadar",
                        label_en: "Smart Niche Radar",
                        label_ar: "رادار النيش الذكي",
                        label_gcc: "رادار المجالات والنيش الذكي",
                        icon: Target,
                      },
                      {
                        id: "identityGenerator",
                        label_en: "Visual Identity Studio",
                        label_ar: "الهوية البصرية",
                        label_gcc: "استوديو الهوية البصرية",
                        icon: Wand2,
                      },
                      {
                        id: "infrastructure",
                        label_en: "Infrastructure & Builder",
                        label_ar: "البنية التحتية والمواقع",
                        label_gcc: "بناء المواقع والبنية الرقمية",
                        icon: Laptop,
                      },
                      {
                        id: "contentFactory",
                        label_en: "Content Factory",
                        label_ar: "مصنع المحتوى",
                        label_gcc: "مصنع وصناعة المحتوى",
                        icon: Megaphone,
                      },
                      {
                        id: "proposalsSniper",
                        label_en: "Proposals Sniper",
                        label_ar: "قناص العروض",
                        label_gcc: "قناص العروض والصفقات",
                        icon: Crosshair,
                      },
                      {
                        id: "globalPlatforms",
                        label_en: "Platforms Radar",
                        label_ar: "رادار المنصات",
                        label_gcc: "رادار واستكشاف المنصات",
                        icon: Globe,
                      },
                      {
                        id: "marketingAutomation",
                        label_en: "Marketing Automation",
                        label_ar: "محرك الأتمتة",
                        label_gcc: "أتمتة التسويق والحملات",
                        icon: Workflow,
                      },
                      {
                        id: "profitCalculator",
                        label_en: "Smart Profit Calculator",
                        label_ar: "الأرباح الذكية",
                        label_gcc: "حاسبة الأرباح الذكية",
                        icon: Calculator,
                      },
                      {
                        id: "aiAssistant",
                        label_en: "AI Assistant Simulator",
                        label_ar: "AI Agent",
                        label_gcc: "AI Agent الافتراضي",
                        icon: Bot,
                      },
                      {
                        id: "templates",
                        label_en: "Landing Page Templates",
                        label_ar: "قوالب صفحة الهبوط",
                        label_gcc: "نماذج وقوالب صفحة الهبوط",
                        icon: Layout,
                      },
                      {
                        id: "preview",
                        label_en: "Live Platform Preview",
                        label_ar: "معاينة حية لمنصة الأدوات",
                        label_gcc: "معاينة مباشرة لمنصة المشتركين",
                        icon: Eye,
                      },
                    ].map((subTab) => {
                      const SubIcon = subTab.icon;
                      const isActive = brandSubTab === subTab.id;
                      return (
                        <button
                          key={subTab.id}
                          type="button"
                          onClick={(e) => {
                            setBrandSubTab(subTab.id);
                            e.currentTarget.scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                              inline: "center",
                            });
                          }}
                          style={{
                            height: "42px",
                            padding: "0 18px",
                            borderRadius: "12px",
                            border: isActive
                              ? "1px solid var(--accent, #3B82F6)"
                              : "1px solid rgba(255, 255, 255, 0.08)",
                            background: isActive
                              ? "linear-gradient(135deg, rgba(59, 130, 246, 0.28), rgba(6, 182, 212, 0.18))"
                              : "rgba(0, 0, 0, 0.3)",
                            color: isActive ? "#fff" : "var(--text3)",
                            fontWeight: "800",
                            fontSize: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: isActive
                              ? "0 0 16px rgba(59, 130, 246, 0.35)"
                              : "none",
                            transform: isActive ? "scale(1.02)" : "scale(1)",
                            flexShrink: 0,
                          }}
                        >
                          <SubIcon
                            size={16}
                            style={{
                              color: isActive
                                ? "var(--accent, #3B82F6)"
                                : "inherit",
                              filter: isActive
                                ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))"
                                : "none",
                            }}
                          />
                          <span>
                            {state.language === "en"
                              ? subTab.label_en
                              : state.language === "ar-GCC" && subTab.label_gcc
                                ? subTab.label_gcc
                                : state.language === "ar-EG" && subTab.label_eg
                                  ? subTab.label_eg
                                  : subTab.label_ar}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Left Navigation Arrow Button */}
                  <button
                    type="button"
                    className="ad-subtabs-nav-btn"
                    onClick={() => {
                      if (brandSubTabsScrollRef.current) {
                        const isAr = state.language !== "en";
                        brandSubTabsScrollRef.current.scrollBy({
                          left: isAr ? -260 : 260,
                          behavior: "smooth",
                        });
                      }
                    }}
                    title={
                      state.language === "en" ? "Scroll Right" : "تمرير لليسار"
                    }
                    style={{ flexShrink: 0 }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>

              {/* Sub-Tab 1: Personal & Brand Info */}
              {brandSubTab === "personal" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="ad-table-card"
                  style={{ padding: "28px" }}
                  dir={state.language === "en" ? "ltr" : "rtl"}
                >
                  <div
                    style={{
                      marginBottom: "24px",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "16px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "800",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <UserCheck size={20} style={{ color: "var(--accent)" }} />
                      <span>
                        {t(
                          "brand_settings.personal_tab",
                          state.language === "en"
                            ? "Personal & Brand Account Details"
                            : "البيانات الشخصية ومعلومات البراند",
                        )}
                      </span>
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                      {t(
                        "brand_settings.personal_tab_desc",
                        state.language === "en"
                          ? "Configure owner name, brand title, contact phone number, and brand logo display preferences."
                          : "تحديث اسم المشرف، اسم البراند، رقم الهاتف للتواصل، وإعدادات ظهور اللوجو والواتساب.",
                      )}
                    </span>
                  </div>

                  {/* Profile Avatar Upload Display */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      padding: "20px",
                      borderRadius: "16px",
                      marginBottom: "24px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <div
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "50%",
                          border: "3px solid var(--accent)",
                          boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
                          background: userData?.photoURL
                            ? `url("${userData.photoURL}") center/cover no-repeat`
                            : "linear-gradient(135deg, #1e293b, #0f172a)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "28px",
                          fontWeight: "800",
                          color: "#fff",
                        }}
                      >
                        {!userData?.photoURL &&
                          (ownerNameForm || "?").charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          fontSize: "13px",
                          fontWeight: "800",
                          color: "#fff",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        {t(
                          "brand_settings.avatar_title",
                          state.language === "en"
                            ? "Brand Profile Photo / Logo"
                            : "الصورة الشخصية / لوجو البراند",
                        )}
                      </label>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text3)",
                          display: "block",
                          marginBottom: "12px",
                        }}
                      >
                        {t(
                          "brand_settings.avatar_desc",
                          state.language === "en"
                            ? "Recommended format: PNG, JPG or WEBP (Max 5MB)"
                            : "الصيغ المدعومة: PNG أو JPG أو WEBP (الحد الأقصى 5 ميجابايت)",
                        )}
                      </span>

                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 18px",
                          background: "rgba(59, 130, 246, 0.15)",
                          border: "1px solid rgba(59, 130, 246, 0.35)",
                          borderRadius: "12px",
                          color: "#fff",
                          fontWeight: "800",
                          fontSize: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <UploadCloud
                          size={16}
                          style={{ color: "var(--accent)" }}
                        />
                        <span>
                          {adminProfileImage
                            ? state.language === "en"
                              ? `Selected: ${adminProfileImage.name}`
                              : `تم اختيار: ${adminProfileImage.name}`
                            : t(
                                "brand_settings.upload_image",
                                state.language === "en"
                                  ? "Upload New Image"
                                  : "رفع صورة جديدة",
                              )}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) =>
                            setAdminProfileImage(e.target.files[0])
                          }
                          disabled={isUpdatingProfile}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Inputs Responsive Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "20px",
                      marginBottom: "24px",
                    }}
                  >
                    {/* Owner Name */}
                    <div className="field">
                      <label
                        className="field-label"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <User size={15} style={{ color: "var(--accent)" }} />
                          {t(
                            "brand_settings.owner_name",
                            state.language === "en"
                              ? "Owner Name"
                              : "اسم المشرف (المالك)",
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            color: ownerNameForm.trim() ? "#10B981" : "#EF4444",
                          }}
                        >
                          {ownerNameForm.trim()
                            ? t(
                                "brand_settings.save_badge_complete",
                                "COMPLETE 🟢",
                              )
                            : t(
                                "brand_settings.save_badge_required",
                                "REQUIRED 🔴",
                              )}
                        </span>
                      </label>
                      <input
                        className="field-input"
                        value={ownerNameForm}
                        onChange={(e) => setOwnerNameForm(e.target.value)}
                        placeholder={
                          state.language === "en"
                            ? "Enter owner full name..."
                            : "أدخل اسم المشرف..."
                        }
                        style={{
                          height: "46px",
                          borderRadius: "12px",
                          fontWeight: "700",
                        }}
                      />
                    </div>

                    {/* Brand Name */}
                    <div className="field">
                      <label
                        className="field-label"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Briefcase
                            size={15}
                            style={{ color: "var(--accent)" }}
                          />
                          {t(
                            "brand_settings.brand_name",
                            state.language === "en"
                              ? "Brand / Project Name"
                              : "اسم البراند / المشروع",
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            color: brandNameForm.trim() ? "#10B981" : "#EF4444",
                          }}
                        >
                          {brandNameForm.trim()
                            ? t(
                                "brand_settings.save_badge_complete",
                                "COMPLETE 🟢",
                              )
                            : t(
                                "brand_settings.save_badge_required",
                                "REQUIRED 🔴",
                              )}
                        </span>
                      </label>
                      <input
                        className="field-input"
                        value={brandNameForm}
                        onChange={(e) => setBrandNameForm(e.target.value)}
                        placeholder={
                          state.language === "en"
                            ? "Enter brand name..."
                            : "أدخل اسم البراند..."
                        }
                        style={{
                          height: "46px",
                          borderRadius: "12px",
                          fontWeight: "700",
                        }}
                      />
                    </div>

                    {/* Email (Read Only) */}
                    <div className="field">
                      <label
                        className="field-label"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Mail size={15} style={{ color: "var(--accent)" }} />
                          {t(
                            "brand_settings.account_email",
                            state.language === "en"
                              ? "Account Email (Read-only)"
                              : "البريد الإلكتروني الحساب",
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            color: "#10B981",
                          }}
                        >
                          {t(
                            "brand_settings.save_badge_complete",
                            "COMPLETE 🟢",
                          )}
                        </span>
                      </label>
                      <input
                        className="field-input"
                        value={userData?.email || ""}
                        readOnly
                        disabled
                        style={{
                          height: "46px",
                          borderRadius: "12px",
                          opacity: 0.6,
                          background: "rgba(0,0,0,0.4)",
                        }}
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="field">
                      <label
                        className="field-label"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Smartphone
                            size={15}
                            style={{ color: "var(--accent)" }}
                          />
                          {t(
                            "brand_settings.phone_number",
                            state.language === "en"
                              ? "Contact Phone Number *"
                              : "رقم الهاتف للتواصل *",
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            color: phoneNumberForm.trim()
                              ? "#10B981"
                              : "#EF4444",
                          }}
                        >
                          {phoneNumberForm.trim()
                            ? t(
                                "brand_settings.save_badge_complete",
                                "COMPLETE 🟢",
                              )
                            : t(
                                "brand_settings.save_badge_required",
                                "REQUIRED 🔴",
                              )}
                        </span>
                      </label>
                      <PhoneInput
                        phoneKey={phoneKeyForm}
                        setPhoneKey={setPhoneKeyForm}
                        phoneNumber={phoneNumberForm}
                        setPhoneNumber={setPhoneNumberForm}
                      />
                    </div>

                    {/* Default Language CustomSelect */}
                    <div className="field">
                      <CustomSelect
                        label={t(
                          "brand_settings.default_lang",
                          state.language === "en"
                            ? "Default Platform Language"
                            : "اللغة الافتراضية للمنصة",
                        )}
                        badge={{
                          text: t(
                            "brand_settings.save_badge_complete",
                            "COMPLETE 🟢",
                          ),
                          color: "#10B981",
                        }}
                        value={defaultLanguage}
                        onChange={(val) => {
                          setDefaultLanguage(val);
                          dispatch({ type: "SET_LANGUAGE", payload: val });
                          if (
                            i18n &&
                            typeof i18n.changeLanguage === "function"
                          ) {
                            i18n.changeLanguage(val);
                          }
                          if (typeof window !== "undefined") {
                            localStorage.setItem(
                              "user_preferred_language",
                              val,
                            );
                            localStorage.setItem("app_language", val);
                            localStorage.setItem(
                              "last_synced_brand_language",
                              val,
                            );
                            sessionStorage.removeItem(
                              "landing_user_selected_lang",
                            );
                            Object.keys(sessionStorage).forEach((k) => {
                              if (k.startsWith("landing_brand_"))
                                sessionStorage.removeItem(k);
                            });
                          }
                          try {
                            setDoc(
                              doc(db, "tenants", "global"),
                              { systemLanguage: val },
                              { merge: true },
                            );
                          } catch (e) {}
                        }}
                        icon={Globe}
                        options={[
                          {
                            value: "ar",
                            label: "العربية (Arabic)",
                            icon: Globe,
                          },
                          {
                            value: "ar-EG",
                            label: "المصرية (Egyptian)",
                            icon: Globe,
                          },
                          {
                            value: "ar-GCC",
                            label: "الخليجية (Khaleeji)",
                            icon: Globe,
                          },
                          {
                            value: "en",
                            label: "English (الإنجليزية)",
                            icon: Globe,
                          },
                        ]}
                      />
                    </div>

                    {/* Brand Logo Display Mode CustomSelect */}
                    <div className="field">
                      <CustomSelect
                        label={t(
                          "brand_settings.logo_display_mode",
                          state.language === "en"
                            ? "Logo & Brand Display Mode"
                            : "طريقة عرض اللوجو والاسم",
                        )}
                        value={logoDisplayMode}
                        onChange={(val) => setLogoDisplayMode(val)}
                        icon={Layers}
                        options={[
                          {
                            value: "both",
                            label: t(
                              "brand_settings.logo_both",
                              state.language === "en"
                                ? "Logo and Brand Name Together"
                                : "اللوجو واسم البراند معاً",
                            ),
                            icon: Layers,
                          },
                          {
                            value: "logo",
                            label: t(
                              "brand_settings.logo_only",
                              state.language === "en"
                                ? "Logo Only"
                                : "اللوجو فقط",
                            ),
                            icon: Image,
                          },
                          {
                            value: "text",
                            label: t(
                              "brand_settings.text_only",
                              state.language === "en"
                                ? "Brand Name Only"
                                : "الاسم فقط",
                            ),
                            icon: FileText,
                          },
                        ]}
                      />
                    </div>

                    {/* Show WhatsApp Login Button CustomSelect */}
                    <div className="field">
                      <CustomSelect
                        label={t(
                          "brand_settings.whatsapp_btn_visibility",
                          state.language === "en"
                            ? "WhatsApp Login Button Visibility"
                            : "إظهار زر الواتساب في صفحة الدخول",
                        )}
                        value={showWhatsappLoginBtn ? "true" : "false"}
                        onChange={(val) =>
                          setShowWhatsappLoginBtn(val === "true")
                        }
                        icon={MessageCircle}
                        options={[
                          {
                            value: "true",
                            label: t(
                              "brand_settings.whatsapp_show",
                              state.language === "en"
                                ? "Show WhatsApp Button"
                                : "نعم، إظهار زر الواتساب",
                            ),
                            icon: CheckCircle2,
                          },
                          {
                            value: "false",
                            label: t(
                              "brand_settings.whatsapp_hide",
                              state.language === "en"
                                ? "Hide WhatsApp Button"
                                : "لا، إخفاء زر الواتساب",
                            ),
                            icon: XCircle,
                          },
                        ]}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Sub-Tab 2: Identity Colors & Live Palette Preview */}
              {brandSubTab === "colors" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="ad-table-card"
                  style={{ padding: "24px" }}
                  dir={state.language === "en" ? "ltr" : "rtl"}
                >
                  <div
                    style={{
                      marginBottom: "20px",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "17px",
                          fontWeight: "800",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Palette size={19} style={{ color: "var(--accent)" }} />
                        <span>
                          {state.language === "en"
                            ? "Brand Colors & Theme Palette"
                            : "ألوان الهوية البصرية والثيمات"}
                        </span>
                      </h3>
                      <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                        {state.language === "en"
                          ? "Select primary colors, background themes, font style, or choose a quick-pick preset theme."
                          : "تحديد اللون الأساسي، الخلفيات، لون النصوص، والخط، أو اختيار ثيمات ملونة جاهزة."}
                      </span>
                    </div>

                    {/* Typography Font Selector using CustomSelect */}
                    <div style={{ minWidth: "200px" }}>
                      <CustomSelect
                        label={
                          state.language === "en"
                            ? "Typography Font"
                            : "نوع الخط الرئيسي"
                        }
                        value={fontFamily}
                        onChange={(val) => {
                          setFontFamily(val);
                          const root = document.documentElement;
                          root.style.setProperty(
                            "--font-family",
                            `'${val}', sans-serif`,
                          );
                          root.style.setProperty(
                            "--font",
                            `'${val}', sans-serif`,
                          );
                          root.style.fontFamily = `'${val}', sans-serif`;
                          if (document.body)
                            document.body.style.fontFamily = `'${val}', sans-serif`;
                        }}
                        icon={BookOpen}
                        options={[
                          {
                            value: "Cairo",
                            label: "Cairo (كيرو)",
                            icon: BookOpen,
                          },
                          {
                            value: "Tajawal",
                            label: "Tajawal (تجوال)",
                            icon: BookOpen,
                          },
                          {
                            value: "Almarai",
                            label: "Almarai (المراعي)",
                            icon: BookOpen,
                          },
                          {
                            value: "Rubik",
                            label: "Rubik (روبيك)",
                            icon: BookOpen,
                          },
                          {
                            value: "Readex Pro",
                            label: "Readex Pro (ريديكس برو)",
                            icon: BookOpen,
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Quick Pick Presets Bar with Modern Smooth Arrow Controls */}
                  <div style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      <Zap size={16} fill="#F59E0B" color="#F59E0B" />
                      <span
                        style={{
                          fontSize: "13.5px",
                          fontWeight: "900",
                          color: "#FFFFFF",
                          letterSpacing: "0.2px",
                        }}
                      >
                        {state.language === "en"
                          ? "Quick-Pick Theme Presets"
                          : "الثيمات الجاهزة للاختيار السريع"}
                      </span>
                    </div>

                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {/* Right Navigation Arrow Button */}
                      <button
                        type="button"
                        className="ad-subtabs-nav-btn"
                        onClick={() => {
                          if (themePresetsScrollRef.current) {
                            const isAr = state.language !== "en";
                            themePresetsScrollRef.current.scrollBy({
                              left: isAr ? 240 : -240,
                              behavior: "smooth",
                            });
                          }
                        }}
                        title={
                          state.language === "en"
                            ? "Scroll Left"
                            : "تمرير لليمين"
                        }
                        style={{ flexShrink: 0 }}
                      >
                        <ChevronRight size={18} />
                      </button>

                      {/* Scrollable Container with Hidden Scrollbar */}
                      <div
                        ref={themePresetsScrollRef}
                        className="ad-subtabs-scroll-container"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          gap: "10px",
                          flexWrap: "nowrap",
                          alignItems: "center",
                          overflowX: "auto",
                          paddingBottom: "4px",
                          paddingTop: "2px",
                        }}
                      >
                        {THEME_PRESETS.map((preset) => {
                          const norm = (c) => (c || "").trim().toUpperCase();
                          const isColorMatch =
                            norm(accentColor) === norm(preset.accent) &&
                            (norm(sidebarColor) === norm(preset.sidebar) ||
                              norm(bgColor) === norm(preset.bg));
                          const isSelected =
                            activeThemePreset === preset.id ||
                            (activeThemePreset !== "custom" && isColorMatch);
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setActiveThemePreset(preset.id);
                                setAccentColor(preset.accent);
                                setSuccessColor(preset.success);
                                setBgColor(preset.bg);
                                setSidebarColor(preset.sidebar);
                                setTextColor(preset.text);
                                setLineColor(preset.line);
                                setFooterBgColor(preset.footerBg);

                                toast(
                                  state.language === "en"
                                    ? `Previewing ${preset.name_en} theme! Click 'Save All Settings' below to apply.`
                                    : `تمت معاينة ثيم ${preset.name_ar}، اضغط على زر 'حفظ كافة الإعدادات' بالأسفل لتطبيقه.`,
                                  "info",
                                );
                              }}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "9999px",
                                border: isSelected
                                  ? `2px solid ${preset.accent}`
                                  : "1px solid rgba(255, 255, 255, 0.12)",
                                background: isSelected
                                  ? "rgba(13, 18, 32, 0.95)"
                                  : "rgba(10, 15, 26, 0.7)",
                                boxShadow: isSelected
                                  ? `0 0 16px ${preset.accent}60, inset 0 0 12px ${preset.accent}20`
                                  : "none",
                                color: "#FFFFFF",
                                fontWeight: isSelected ? "900" : "700",
                                fontSize: "12.5px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                transition: "all 0.25s ease",
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isSelected && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    background: preset.accent,
                                    color: "#000",
                                  }}
                                >
                                  <Check
                                    size={11}
                                    strokeWidth={3.5}
                                    color={
                                      preset.id === "purple" ||
                                      preset.id === "sunset"
                                        ? "#fff"
                                        : "#000"
                                    }
                                  />
                                </span>
                              )}
                              <span>
                                {state.language === "en"
                                  ? preset.name_en
                                  : preset.name_ar}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {preset.dots.map((d, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: "10px",
                                      height: "10px",
                                      borderRadius: "50%",
                                      background: d,
                                      boxShadow: "0 0 4px rgba(0,0,0,0.6)",
                                      border: isSelected
                                        ? "1px solid rgba(255,255,255,0.4)"
                                        : "none",
                                    }}
                                  />
                                ))}
                              </div>
                            </button>
                          );
                        })}

                        {/* Custom Manual Colors Mode Toggle Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveThemePreset("custom");
                            toast(
                              state.language === "en"
                                ? "Custom colors mode active. Feel free to customize any color code below!"
                                : "تم تفعيل نمط تخصيص الألوان. يمكنك الآن تعديل أي لون يدوياً بحرية!",
                              "info",
                            );
                          }}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "9999px",
                            border:
                              activeThemePreset === "custom"
                                ? "2px solid #FFFFFF"
                                : "1.5px solid rgba(255, 255, 255, 0.4)",
                            background:
                              activeThemePreset === "custom"
                                ? "rgba(255, 255, 255, 0.18)"
                                : "rgba(10, 15, 26, 0.5)",
                            boxShadow:
                              activeThemePreset === "custom"
                                ? "0 0 14px rgba(255, 255, 255, 0.25)"
                                : "none",
                            color: "#FFFFFF",
                            fontWeight:
                              activeThemePreset === "custom" ? "900" : "700",
                            fontSize: "12.5px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            cursor: "pointer",
                            transition: "all 0.25s ease",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {activeThemePreset === "custom" && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                background: "#FFFFFF",
                                color: "#000",
                              }}
                            >
                              <Check size={11} strokeWidth={3.5} color="#000" />
                            </span>
                          )}
                          <Palette size={15} style={{ color: "#FFFFFF" }} />
                          <span>
                            {state.language === "en"
                              ? "Custom Colors"
                              : "تخصيص الألوان"}
                          </span>
                        </button>
                      </div>

                      {/* Left Navigation Arrow Button */}
                      <button
                        type="button"
                        className="ad-subtabs-nav-btn"
                        onClick={() => {
                          if (themePresetsScrollRef.current) {
                            const isAr = state.language !== "en";
                            themePresetsScrollRef.current.scrollBy({
                              left: isAr ? -240 : 240,
                              behavior: "smooth",
                            });
                          }
                        }}
                        title={
                          state.language === "en"
                            ? "Scroll Right"
                            : "تمرير لليسار"
                        }
                        style={{ flexShrink: 0 }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Color Cards Grid & Live UI Mockup Preview */}
                  <div
                    style={{
                      padding: "10px 16px",
                      background: "rgba(245, 158, 11, 0.09)",
                      border: "1px solid rgba(245, 158, 11, 0.28)",
                      borderRadius: "10px",
                      color: "#FCD34D",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "18px",
                    }}
                  >
                    <AlertTriangle size={17} style={{ flexShrink: 0 }} />
                    <span>{t("brand_settings.note")}</span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "minmax(0, 1.4fr) minmax(310px, 0.9fr)",
                      gap: "20px",
                      alignItems: "start",
                    }}
                  >
                    {/* Color Swatch Cards Grid (7 color pickers in 2 columns) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "repeat(2, minmax(0, 1fr))",
                        gap: "14px",
                      }}
                    >
                      {[
                        {
                          titleKey: "accent_color",
                          descKey: "accent_desc",
                          value: accentColor,
                          setter: (val) => {
                            setAccentColor(val);
                            setActiveThemePreset("custom");
                          },
                        },
                        {
                          titleKey: "success_color",
                          descKey: "success_desc",
                          value: successColor,
                          setter: (val) => {
                            setSuccessColor(val);
                            setActiveThemePreset("custom");
                          },
                        },
                        {
                          titleKey: "bg_color",
                          descKey: "bg_desc",
                          value: bgColor,
                          setter: (val) => {
                            setBgColor(val);
                            setActiveThemePreset("custom");
                          },
                        },
                        {
                          titleKey: "sidebar_color",
                          descKey: "sidebar_desc",
                          value: sidebarColor,
                          setter: (val) => {
                            setSidebarColor(val);
                            setActiveThemePreset("custom");
                          },
                        },
                        {
                          titleKey: "text_color",
                          descKey: "text_desc",
                          value: textColor,
                          setter: (val) => {
                            setTextColor(val);
                            setActiveThemePreset("custom");
                          },
                        },
                        {
                          titleKey: "line_color",
                          descKey: "line_desc",
                          value: lineColor,
                          setter: (val) => {
                            setLineColor(val);
                            setActiveThemePreset("custom");
                          },
                        },
                        {
                          titleKey: "footer_color",
                          descKey: "footer_desc",
                          value: footerBgColor,
                          isFullWidth: true,
                          setter: (val) => {
                            setFooterBgColor(val);
                            setActiveThemePreset("custom");
                          },
                        },
                      ].map((item) => (
                        <div
                          key={item.titleKey}
                          style={{
                            gridColumn:
                              item.isFullWidth && !isMobile
                                ? "span 2"
                                : "span 1",
                            background: "rgba(0, 0, 0, 0.35)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "12px",
                            padding: "14px 16px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "10px",
                            backdropFilter: "blur(10px)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "12.5px",
                                  fontWeight: "800",
                                  color: "#FFFFFF",
                                  marginBottom: "3px",
                                }}
                              >
                                {t(`brand_settings.${item.titleKey}`)}
                              </div>
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "var(--text3)",
                                  lineHeight: "1.3",
                                }}
                              >
                                {t(`brand_settings.${item.descKey}`)}
                              </div>
                            </div>
                            <div
                              style={{
                                position: "relative",
                                width: "32px",
                                height: "32px",
                                minWidth: "32px",
                                borderRadius: "7px",
                                background: item.value,
                                border: "1.5px solid rgba(255, 255, 255, 0.25)",
                                boxShadow: `0 0 10px ${item.value}30`,
                                overflow: "hidden",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="color"
                                value={item.value}
                                onChange={(e) => item.setter(e.target.value)}
                                style={{
                                  position: "absolute",
                                  top: "-10px",
                                  left: "-10px",
                                  width: "60px",
                                  height: "60px",
                                  opacity: 0,
                                  cursor: "pointer",
                                }}
                              />
                            </div>
                          </div>
                          <input
                            className="field-input"
                            value={item.value}
                            onChange={(e) => item.setter(e.target.value)}
                            dir="ltr"
                            placeholder="#000000"
                            style={{
                              height: "34px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              borderRadius: "7px",
                              textAlign: "center",
                              letterSpacing: "1px",
                              fontFamily: "monospace",
                              background: "rgba(0, 0, 0, 0.45)",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              color: "#FFFFFF",
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Interactive UI Mockup Box */}
                    <div
                      style={{
                        background: bgColor,
                        border: `1px solid ${lineColor}`,
                        borderRadius: "16px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
                        minHeight: "340px",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12.5px",
                            fontWeight: "800",
                            color: textColor,
                            display: "flex",
                            alignItems: "center",
                            gap: "7px",
                          }}
                        >
                          <Sparkles size={15} style={{ color: accentColor }} />
                          <span>{t("brand_settings.live_preview")}</span>
                        </div>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "800",
                            background: `${successColor}25`,
                            color: successColor,
                            border: `1px solid ${successColor}50`,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>✓</span>
                          <span>{t("brand_settings.live_active")}</span>
                        </span>
                      </div>

                      {/* Mockup Topbar */}
                      <div
                        style={{
                          background: sidebarColor,
                          border: `1px solid ${lineColor}`,
                          borderRadius: "10px",
                          padding: "8px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "6px",
                              background: accentColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: "10px",
                              fontWeight: "900",
                            }}
                          >
                            {brandNameForm
                              ? brandNameForm.charAt(0).toUpperCase()
                              : "B"}
                          </div>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "800",
                              color: textColor,
                            }}
                          >
                            {brandNameForm || "El Safa Chemical"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "9px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: `${accentColor}25`,
                              color: accentColor,
                              fontWeight: "700",
                            }}
                          >
                            admin
                          </span>
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: accentColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Mockup Body Grid */}
                      <div style={{ display: "flex", gap: "12px", flex: 1 }}>
                        {/* Mini Sidebar */}
                        <div
                          style={{
                            width: "75px",
                            background: sidebarColor,
                            border: `1px solid ${lineColor}`,
                            borderRadius: "10px",
                            padding: "10px 6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "18px",
                              borderRadius: "5px",
                              background: `${accentColor}30`,
                              border: `1px solid ${accentColor}60`,
                            }}
                          />
                          <div
                            style={{
                              width: "100%",
                              height: "8px",
                              borderRadius: "4px",
                              background: `${textColor}30`,
                            }}
                          />
                          <div
                            style={{
                              width: "100%",
                              height: "8px",
                              borderRadius: "4px",
                              background: `${textColor}20`,
                            }}
                          />
                          <div
                            style={{
                              width: "100%",
                              height: "8px",
                              borderRadius: "4px",
                              background: `${textColor}15`,
                            }}
                          />
                        </div>

                        {/* Mini Main Content Area */}
                        <div
                          style={{
                            flex: 1,
                            background: sidebarColor,
                            border: `1px solid ${lineColor}`,
                            borderRadius: "10px",
                            padding: "14px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "12px",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: "800",
                                color: textColor,
                                marginBottom: "4px",
                              }}
                            >
                              {brandNameForm || "El Safa Chemical"}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: `${textColor}80`,
                              }}
                            >
                              {ownerNameForm || "Admin User"}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                height: "30px",
                                padding: "0 12px",
                                background: accentColor,
                                color: "#fff",
                                border: "none",
                                borderRadius: "7px",
                                fontSize: "11px",
                                fontWeight: "800",
                                cursor: "pointer",
                                boxShadow: `0 2px 8px ${accentColor}40`,
                              }}
                            >
                              Accent Button
                            </button>
                            <button
                              type="button"
                              style={{
                                height: "30px",
                                padding: "0 12px",
                                background: `${successColor}25`,
                                color: successColor,
                                border: `1px solid ${successColor}60`,
                                borderRadius: "7px",
                                fontSize: "11px",
                                fontWeight: "800",
                              }}
                            >
                              Success Badge
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Mockup Landing Page Footer Bar Preview */}
                      <div
                        style={{
                          background: footerBgColor,
                          border: `1px solid ${lineColor}`,
                          borderRadius: "10px",
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <div
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: successColor,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: textColor,
                            }}
                          >
                            {state.language === "en"
                              ? "Footer, Legal & Policies Bar"
                              : "قسم الفوتر والسياسات والحقوق"}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            color: `${textColor}70`,
                            fontFamily: "monospace",
                          }}
                        >
                          {footerBgColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Sub-Tab: Hero Section */}
              {brandSubTab === "hero" && (
                <AdminHeroSectionTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    heroSection,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setHeroSection(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.heroSection)
                      setHeroSection(newFields.heroSection);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Final CTA Section */}
              {brandSubTab === "finalCta" && (
                <AdminFinalCtaTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    finalCtaSection,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setFinalCtaSection(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.finalCtaSection)
                      setFinalCtaSection(newFields.finalCtaSection);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab 3: Social Media Links */}
              {brandSubTab === "social" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="ad-table-card"
                  style={{ padding: "28px" }}
                  dir={state.language === "en" ? "ltr" : "rtl"}
                >
                  <div
                    style={{
                      marginBottom: "24px",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "16px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "800",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Share2 size={20} style={{ color: "var(--accent)" }} />
                      <span>
                        {state.language === "en"
                          ? "Social Media Handles & Links"
                          : "روابط الحسابات والصفحات الاجتماعية"}
                      </span>
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                      {state.language === "en"
                        ? "Connect your social pages to display on landing pages and client footers."
                        : "ربط حساباتك على وسائل التواصل الاجتماعي لتظهر لعملائك بالصفحة الرئيسية."}
                    </span>
                  </div>

                  {/* Individual Branded Cards Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    {[
                      {
                        key: "facebook",
                        label: "Facebook (فيسبوك)",
                        color: "#1877F2",
                        bgTint: "rgba(24, 119, 242, 0.08)",
                        borderTint: "rgba(24, 119, 242, 0.3)",
                        placeholder: "https://facebook.com/yourbrand",
                        icon: Share2,
                      },
                      {
                        key: "instagram",
                        label: "Instagram (إنستجرام)",
                        color: "#E1306C",
                        bgTint: "rgba(225, 48, 108, 0.08)",
                        borderTint: "rgba(225, 48, 108, 0.3)",
                        placeholder: "https://instagram.com/yourbrand",
                        icon: Share2,
                      },
                      {
                        key: "tiktok",
                        label: "TikTok (تيك توك)",
                        color: "#00F2FE",
                        bgTint: "rgba(0, 242, 254, 0.08)",
                        borderTint: "rgba(0, 242, 254, 0.3)",
                        placeholder: "https://tiktok.com/@yourbrand",
                        icon: Video,
                      },
                      {
                        key: "twitter",
                        label: "X / Twitter (إكس)",
                        color: "#FFFFFF",
                        bgTint: "rgba(255, 255, 255, 0.05)",
                        borderTint: "rgba(255, 255, 255, 0.2)",
                        placeholder: "https://x.com/yourbrand",
                        icon: Share2,
                      },
                      {
                        key: "linkedin",
                        label: "LinkedIn (لينكد إن)",
                        color: "#0A66C2",
                        bgTint: "rgba(10, 102, 194, 0.08)",
                        borderTint: "rgba(10, 102, 194, 0.3)",
                        placeholder: "https://linkedin.com/company/yourbrand",
                        icon: Briefcase,
                      },
                    ].map((platform) => {
                      const PlatformIcon = platform.icon;
                      const linkVal = socialLinks[platform.key] || "";
                      return (
                        <div
                          key={platform.key}
                          style={{
                            background: platform.bgTint,
                            border: `1px solid ${platform.borderTint}`,
                            borderRadius: "16px",
                            padding: "20px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "14px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <PlatformIcon
                                size={20}
                                style={{ color: platform.color }}
                              />
                              <span
                                style={{
                                  fontWeight: "800",
                                  color: "#fff",
                                  fontSize: "14px",
                                }}
                              >
                                {platform.label}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {linkVal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(linkVal);
                                    toast(
                                      state.language === "en"
                                        ? "Link copied!"
                                        : "تم نسخ الرابط!",
                                      "success",
                                    );
                                  }}
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    color: "#fff",
                                    background: "rgba(255, 255, 255, 0.1)",
                                    border:
                                      "1px solid rgba(255, 255, 255, 0.18)",
                                    borderRadius: "8px",
                                    padding: "4px 10px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    transition: "all 0.2s ease",
                                  }}
                                  title={
                                    state.language === "en"
                                      ? "Copy Link"
                                      : "نسخ الرابط"
                                  }
                                >
                                  <Copy size={13} />
                                  <span>
                                    {state.language === "en" ? "Copy" : "نسخ"}
                                  </span>
                                </button>
                              )}
                              {linkVal ? (
                                <a
                                  href={
                                    linkVal.startsWith("http")
                                      ? linkVal
                                      : `https://${linkVal}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    color: platform.color,
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <span>
                                    {state.language === "en"
                                      ? "Visit ↗"
                                      : "زيارة ↗"}
                                  </span>
                                </a>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--text3)",
                                  }}
                                >
                                  {state.language === "en"
                                    ? "Not set"
                                    : "غير محدد"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className="field"
                            style={{ margin: 0, position: "relative" }}
                          >
                            <input
                              className="field-input"
                              value={linkVal}
                              onChange={(e) =>
                                setSocialLinks({
                                  ...socialLinks,
                                  [platform.key]: e.target.value,
                                })
                              }
                              placeholder={platform.placeholder}
                              dir="ltr"
                              style={{
                                height: "42px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                background: "rgba(0, 0, 0, 0.4)",
                                borderColor: platform.borderTint,
                                color: "#fff",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Sub-Tab Legal: Legal & FAQs */}
              {brandSubTab === "legal" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="ad-table-card"
                  style={{
                    padding: "32px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "32px",
                  }}
                  dir={state.language === "en" ? "ltr" : "rtl"}
                >
                  {/* Header & Segmented Control */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          margin: 0,
                        }}
                      >
                        <FileText
                          size={20}
                          style={{ color: "var(--accent)" }}
                        />
                        {state.language === "en"
                          ? "Legal Policies & FAQs"
                          : "الشروط والسياسات والأسئلة الشائعة"}
                      </h3>
                      <p
                        style={{
                          color: "var(--text3)",
                          fontSize: "14px",
                          marginTop: "8px",
                          maxWidth: "500px",
                          lineHeight: "1.6",
                        }}
                      >
                        {state.language === "en"
                          ? "Manage your landing page terms, privacy, security, and FAQs dynamically. Changes are reflected instantly on your public page."
                          : "إدارة شروط الاستخدام، سياسة الخصوصية، سياسة الأمان والأسئلة الشائعة لصفحة الهبوط بشكل ديناميكي. تنعكس التغييرات فوراً."}
                      </p>
                    </div>

                    {/* Premium Language Segmented Control */}
                    <div
                      style={{
                        display: "flex",
                        background: "rgba(0,0,0,0.4)",
                        borderRadius: "12px",
                        padding: "4px",
                        border: "1px solid rgba(255,255,255,0.05)",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setLegalTabLang("ar")}
                        style={{
                          padding: "8px 24px",
                          borderRadius: "10px",
                          background:
                            legalTabLang === "ar"
                              ? "linear-gradient(135deg, var(--accent), var(--accent-hover, #2563EB))"
                              : "transparent",
                          color:
                            legalTabLang === "ar" ? "#fff" : "var(--text3)",
                          fontSize: "13px",
                          fontWeight: legalTabLang === "ar" ? "700" : "500",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow:
                            legalTabLang === "ar"
                              ? "0 4px 12px rgba(59, 130, 246, 0.3)"
                              : "none",
                        }}
                      >
                        العربية
                      </button>
                      <button
                        type="button"
                        onClick={() => setLegalTabLang("en")}
                        style={{
                          padding: "8px 24px",
                          borderRadius: "10px",
                          background:
                            legalTabLang === "en"
                              ? "linear-gradient(135deg, var(--accent), var(--accent-hover, #2563EB))"
                              : "transparent",
                          color:
                            legalTabLang === "en" ? "#fff" : "var(--text3)",
                          fontSize: "13px",
                          fontWeight: legalTabLang === "en" ? "700" : "500",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow:
                            legalTabLang === "en"
                              ? "0 4px 12px rgba(59, 130, 246, 0.3)"
                              : "none",
                        }}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Tabs Menu */}
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      paddingBottom: "16px",
                      overflowX: "auto",
                      margin: "16px 0",
                    }}
                  >
                    {[
                      {
                        id: "terms",
                        labelEn: "Terms & Conditions",
                        labelAr: "الشروط والأحكام",
                        icon: <FileText size={16} />,
                      },
                      {
                        id: "privacy",
                        labelEn: "Privacy Policy",
                        labelAr: "سياسة الخصوصية",
                        icon: <Lock size={16} />,
                      },
                      {
                        id: "security",
                        labelEn: "Security Policy",
                        labelAr: "سياسة الأمان",
                        icon: <Shield size={16} />,
                      },
                      {
                        id: "faqs",
                        labelEn: "FAQs",
                        labelAr: "الأسئلة الشائعة",
                        icon: <MessageSquare size={16} />,
                      },
                    ].map((tab) => (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => setLegalActiveTab(tab.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 20px",
                          background:
                            legalActiveTab === tab.id
                              ? "rgba(59,130,246,0.1)"
                              : "transparent",
                          color:
                            legalActiveTab === tab.id
                              ? "#3B82F6"
                              : "var(--text3)",
                          border: "1px solid",
                          borderColor:
                            legalActiveTab === tab.id
                              ? "rgba(59,130,246,0.2)"
                              : "transparent",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tab.icon}
                        {state.language === "en" ? tab.labelEn : tab.labelAr}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content Panels */}
                  <div
                    style={{
                      minHeight: "400px",
                      background: "rgba(255,255,255,0.01)",
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.03)",
                      padding: "24px",
                    }}
                  >
                    {/* Custom Styles for React Quill Dark Mode and Scrolling */}
                    <style>{`
                      .quill-editor-container .ql-toolbar {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-top-left-radius: 12px;
                        border-top-right-radius: 12px;
                      }
                      .quill-editor-container .ql-toolbar button, .quill-editor-container .ql-toolbar span.ql-picker-label {
                        filter: invert(0.8) hue-rotate(180deg);
                      }
                      /* Dark mode dropdown menu fixes */
                      .quill-editor-container .ql-picker-options {
                        background: var(--bg2) !important;
                        border: 1px solid rgba(255, 255, 255, 0.1) !important;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
                      }
                      .quill-editor-container .ql-picker-options .ql-picker-item {
                        color: var(--text1) !important;
                      }
                      .quill-editor-container .ql-picker-options .ql-picker-item:hover,
                      .quill-editor-container .ql-picker-options .ql-picker-item.ql-selected {
                        color: var(--accent) !important;
                      }
                      /* RTL label & arrow alignment fix */
                      .quill-editor-container [dir="rtl"] .ql-picker-label {
                        padding-left: 16px !important;
                        padding-right: 8px !important;
                      }
                      .quill-editor-container [dir="rtl"] .ql-picker-label svg {
                        right: auto !important;
                        left: 0 !important;
                      }
                      .quill-editor-container .ql-container {
                        background: rgba(0, 0, 0, 0.2);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-bottom-left-radius: 12px;
                        border-bottom-right-radius: 12px;
                        min-height: 350px;
                        font-size: 15px;
                        color: #fff;
                      }
                      .quill-editor-container .ql-editor {
                        min-height: 350px;
                        max-height: 600px;
                        overflow-y: auto;
                        padding: 20px;
                        line-height: 1.8;
                        white-space: pre-wrap;
                      }
                      .quill-editor-container .ql-editor p {
                        margin-bottom: 1rem;
                      }
                      .quill-editor-container .ql-editor.ql-blank::before {
                        color: rgba(255, 255, 255, 0.4);
                        font-style: normal;
                      }
                    `}</style>

                    <AnimatePresence mode="wait">
                      {/* Terms Panel */}
                      {legalActiveTab === "terms" && (
                        <motion.div
                          key="terms"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                          }}
                          className="quill-editor-container"
                        >
                          <ReactQuill
                            theme="snow"
                            modules={quillModules}
                            value={legalTabLang === "ar" ? termsAr : termsEn}
                            onChange={(content) =>
                              legalTabLang === "ar"
                                ? setTermsAr(content)
                                : setTermsEn(content)
                            }
                            placeholder={
                              state.language === "en"
                                ? "Enter Terms & Conditions..."
                                : "أدخل الشروط والأحكام..."
                            }
                            dir={legalTabLang === "ar" ? "rtl" : "ltr"}
                          />
                        </motion.div>
                      )}

                      {/* Privacy Panel */}
                      {legalActiveTab === "privacy" && (
                        <motion.div
                          key="privacy"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                          }}
                          className="quill-editor-container"
                        >
                          <ReactQuill
                            theme="snow"
                            modules={quillModules}
                            value={
                              legalTabLang === "ar" ? privacyAr : privacyEn
                            }
                            onChange={(content) =>
                              legalTabLang === "ar"
                                ? setPrivacyAr(content)
                                : setPrivacyEn(content)
                            }
                            placeholder={
                              state.language === "en"
                                ? "Enter Privacy Policy..."
                                : "أدخل سياسة الخصوصية..."
                            }
                            dir={legalTabLang === "ar" ? "rtl" : "ltr"}
                          />
                        </motion.div>
                      )}

                      {/* Security Panel */}
                      {legalActiveTab === "security" && (
                        <motion.div
                          key="security"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                          }}
                          className="quill-editor-container"
                        >
                          <ReactQuill
                            theme="snow"
                            modules={quillModules}
                            value={
                              legalTabLang === "ar" ? securityAr : securityEn
                            }
                            onChange={(content) =>
                              legalTabLang === "ar"
                                ? setSecurityAr(content)
                                : setSecurityEn(content)
                            }
                            placeholder={
                              state.language === "en"
                                ? "Enter Security Policy..."
                                : "أدخل سياسة الأمان..."
                            }
                            dir={legalTabLang === "ar" ? "rtl" : "ltr"}
                          />
                        </motion.div>
                      )}

                      {/* FAQs Panel */}
                      {legalActiveTab === "faqs" && (
                        <motion.div
                          key="faqs"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "16px",
                            }}
                          >
                            <div>
                              <h3
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "700",
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  margin: 0,
                                }}
                              >
                                <MessageSquare
                                  size={18}
                                  style={{ color: "var(--accent)" }}
                                />
                                {state.language === "en"
                                  ? "Frequently Asked Questions"
                                  : "الأسئلة الشائعة (FAQs)"}
                              </h3>
                              <p
                                style={{
                                  color: "var(--text3)",
                                  fontSize: "13px",
                                  marginTop: "4px",
                                }}
                              >
                                {state.language === "en"
                                  ? "Add questions to help your users understand your product."
                                  : "أضف أسئلة لمساعدة المستخدمين على فهم منتجك."}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFaqs([
                                  ...faqs,
                                  {
                                    id: Date.now().toString(),
                                    q_ar: "",
                                    q_en: "",
                                    a_ar: "",
                                    a_en: "",
                                  },
                                ]);
                                setTimeout(() => {
                                  const faqElements = document.querySelectorAll(
                                    ".faq-item-container",
                                  );
                                  if (faqElements.length > 0) {
                                    faqElements[
                                      faqElements.length - 1
                                    ].scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    });
                                  }
                                }, 100);
                              }}
                              style={{
                                padding: "10px 20px",
                                borderRadius: "10px",
                                background: "var(--accent)",
                                color: "#fff",
                                fontSize: "13px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                border: "none",
                                cursor: "pointer",
                                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)",
                                transition: "transform 0.2s, background 0.2s",
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                                e.currentTarget.style.background =
                                  "var(--accent-hover, #2563EB)";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.background =
                                  "var(--accent)";
                              }}
                            >
                              <Plus size={16} />
                              {state.language === "en"
                                ? "Add FAQ"
                                : "إضافة سؤال"}
                            </button>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "16px",
                            }}
                          >
                            <AnimatePresence>
                              {faqs.length === 0 ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  style={{
                                    textAlign: "center",
                                    padding: "60px 20px",
                                    background: "rgba(0,0,0,0.2)",
                                    border: "1px dashed rgba(255,255,255,0.1)",
                                    borderRadius: "16px",
                                  }}
                                >
                                  <MessageSquare
                                    size={32}
                                    style={{
                                      color: "var(--text3)",
                                      opacity: 0.5,
                                      marginBottom: "16px",
                                    }}
                                  />
                                  <p
                                    style={{
                                      color: "var(--text2)",
                                      fontSize: "14px",
                                      margin: 0,
                                    }}
                                  >
                                    {state.language === "en"
                                      ? "No FAQs added yet. Click the button above to create one."
                                      : "لم يتم إضافة أسئلة شائعة بعد. انقر على الزر أعلاه لإضافة سؤال."}
                                  </p>
                                </motion.div>
                              ) : (
                                faqs.map((faq, index) => (
                                  <motion.div
                                    key={faq.id}
                                    className="faq-item-container"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                      padding: "20px",
                                      background: "rgba(0,0,0,0.2)",
                                      borderRadius: "16px",
                                      border:
                                        "1px solid rgba(255,255,255,0.05)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "16px",
                                      position: "relative",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "12px",
                                          fontWeight: "700",
                                          color: "rgba(255,255,255,0.4)",
                                          letterSpacing: "0.5px",
                                        }}
                                      >
                                        FAQ #{index + 1}
                                      </span>
                                      <div
                                        style={{ display: "flex", gap: "6px" }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (index > 0) {
                                              const newFaqs = [...faqs];
                                              [
                                                newFaqs[index - 1],
                                                newFaqs[index],
                                              ] = [
                                                newFaqs[index],
                                                newFaqs[index - 1],
                                              ];
                                              setFaqs(newFaqs);
                                            }
                                          }}
                                          disabled={index === 0}
                                          style={{
                                            width: "32px",
                                            height: "32px",
                                            borderRadius: "8px",
                                            background:
                                              "rgba(255,255,255,0.05)",
                                            color:
                                              index === 0
                                                ? "rgba(255,255,255,0.1)"
                                                : "var(--text2)",
                                            border: "none",
                                            cursor:
                                              index === 0
                                                ? "default"
                                                : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          ↑
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (index < faqs.length - 1) {
                                              const newFaqs = [...faqs];
                                              [
                                                newFaqs[index],
                                                newFaqs[index + 1],
                                              ] = [
                                                newFaqs[index + 1],
                                                newFaqs[index],
                                              ];
                                              setFaqs(newFaqs);
                                            }
                                          }}
                                          disabled={index === faqs.length - 1}
                                          style={{
                                            width: "32px",
                                            height: "32px",
                                            borderRadius: "8px",
                                            background:
                                              "rgba(255,255,255,0.05)",
                                            color:
                                              index === faqs.length - 1
                                                ? "rgba(255,255,255,0.1)"
                                                : "var(--text2)",
                                            border: "none",
                                            cursor:
                                              index === faqs.length - 1
                                                ? "default"
                                                : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          ↓
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFaqs(
                                              faqs.filter(
                                                (f) => f.id !== faq.id,
                                              ),
                                            )
                                          }
                                          style={{
                                            width: "32px",
                                            height: "32px",
                                            borderRadius: "8px",
                                            background: "rgba(239,68,68,0.1)",
                                            color: "var(--error)",
                                            border: "none",
                                            marginLeft: "12px",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "background 0.2s",
                                          }}
                                          onMouseOver={(e) =>
                                            (e.currentTarget.style.background =
                                              "rgba(239,68,68,0.2)")
                                          }
                                          onMouseOut={(e) =>
                                            (e.currentTarget.style.background =
                                              "rgba(239,68,68,0.1)")
                                          }
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                    <input
                                      type="text"
                                      value={
                                        legalTabLang === "ar"
                                          ? faq.q_ar
                                          : faq.q_en
                                      }
                                      onChange={(e) => {
                                        const newFaqs = [...faqs];
                                        if (legalTabLang === "ar")
                                          newFaqs[index].q_ar = e.target.value;
                                        else
                                          newFaqs[index].q_en = e.target.value;
                                        setFaqs(newFaqs);
                                      }}
                                      placeholder={
                                        state.language === "en"
                                          ? "Question..."
                                          : "السؤال..."
                                      }
                                      style={{
                                        width: "100%",
                                        padding: "14px 16px",
                                        background: "rgba(0,0,0,0.3)",
                                        border:
                                          "1px solid rgba(255,255,255,0.05)",
                                        borderRadius: "10px",
                                        color: "#fff",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        outline: "none",
                                        transition: "border-color 0.2s",
                                      }}
                                      onFocus={(e) =>
                                        (e.target.style.borderColor =
                                          "var(--accent)")
                                      }
                                      onBlur={(e) =>
                                        (e.target.style.borderColor =
                                          "rgba(255,255,255,0.05)")
                                      }
                                      dir={
                                        legalTabLang === "ar" ? "rtl" : "ltr"
                                      }
                                    />
                                    <textarea
                                      value={
                                        legalTabLang === "ar"
                                          ? faq.a_ar
                                          : faq.a_en
                                      }
                                      onChange={(e) => {
                                        const newFaqs = [...faqs];
                                        if (legalTabLang === "ar")
                                          newFaqs[index].a_ar = e.target.value;
                                        else
                                          newFaqs[index].a_en = e.target.value;
                                        setFaqs(newFaqs);
                                      }}
                                      onInput={(e) => {
                                        e.target.style.height = "auto";
                                        e.target.style.height =
                                          e.target.scrollHeight + "px";
                                      }}
                                      placeholder={
                                        state.language === "en"
                                          ? "Answer..."
                                          : "الإجابة..."
                                      }
                                      style={{
                                        width: "100%",
                                        minHeight: "90px",
                                        resize: "none",
                                        padding: "14px 16px",
                                        background: "rgba(0,0,0,0.3)",
                                        border:
                                          "1px solid rgba(255,255,255,0.05)",
                                        borderRadius: "10px",
                                        color: "var(--text2)",
                                        fontSize: "14px",
                                        lineHeight: "1.6",
                                        outline: "none",
                                        transition: "border-color 0.2s",
                                        overflow: "hidden",
                                      }}
                                      onFocus={(e) =>
                                        (e.target.style.borderColor =
                                          "var(--accent)")
                                      }
                                      onBlur={(e) =>
                                        (e.target.style.borderColor =
                                          "rgba(255,255,255,0.05)")
                                      }
                                      dir={
                                        legalTabLang === "ar" ? "rtl" : "ltr"
                                      }
                                    />
                                  </motion.div>
                                ))
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Sub-Tab: Why Most Brands Fail */}
              {brandSubTab === "failures" && (
                <AdminFailuresTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    brandFailures,
                    showFailuresSection,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    if (newFields.brandFailures)
                      setBrandFailures(newFields.brandFailures);
                    if (newFields.showFailuresSection !== undefined)
                      setShowFailuresSection(newFields.showFailuresSection);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.brandFailures)
                      setBrandFailures(newFields.brandFailures);
                    if (newFields.showFailuresSection !== undefined)
                      setShowFailuresSection(newFields.showFailuresSection);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Customer Reviews & Testimonials */}
              {brandSubTab === "reviews" && (
                <AdminReviewsTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    tenantId: userData?.tenantId || userData?.uid || "global",
                  }}
                  userData={userData}
                />
              )}

              {/* Sub-Tab: Explainer Video */}
              {brandSubTab === "video" && (
                <AdminVideoTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    videoConfig,
                    showVideoSection,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    if (newFields.videoConfig)
                      setVideoConfig(newFields.videoConfig);
                    if (newFields.showVideoSection !== undefined)
                      setShowVideoSection(newFields.showVideoSection);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.videoConfig)
                      setVideoConfig(newFields.videoConfig);
                    if (newFields.showVideoSection !== undefined)
                      setShowVideoSection(newFields.showVideoSection);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Smart Niche Radar */}
              {brandSubTab === "nicheRadar" && (
                <AdminNicheRadarTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    nicheRadar,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setNicheRadar(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.nicheRadar)
                      setNicheRadar(newFields.nicheRadar);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Brand Identity & Name Generator */}
              {brandSubTab === "identityGenerator" && (
                <AdminIdentityGeneratorTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    identityGenerator,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setIdentityGenerator(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.identityGenerator)
                      setIdentityGenerator(newFields.identityGenerator);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Smart Website Builder & Infrastructure */}
              {brandSubTab === "infrastructure" && (
                <AdminInfrastructureTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    infrastructureBuilder,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setInfrastructureBuilder(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.infrastructureBuilder)
                      setInfrastructureBuilder(newFields.infrastructureBuilder);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Professional Content Factory */}
              {brandSubTab === "contentFactory" && (
                <AdminContentFactoryTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    contentFactory,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setContentFactory(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.contentFactory)
                      setContentFactory(newFields.contentFactory);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Smart Proposals Sniper */}
              {brandSubTab === "proposalsSniper" && (
                <AdminProposalsSniperTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    proposalsSniper,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setProposalsSniper(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.proposalsSniper)
                      setProposalsSniper(newFields.proposalsSniper);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Global Platforms Radar */}
              {brandSubTab === "globalPlatforms" && (
                <AdminGlobalPlatformsTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    globalPlatformsRadar,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setGlobalPlatformsRadar(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.globalPlatformsRadar)
                      setGlobalPlatformsRadar(newFields.globalPlatformsRadar);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Marketing Automation Engine */}
              {brandSubTab === "marketingAutomation" && (
                <AdminMarketingAutomationTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    marketingAutomationEngine,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setMarketingAutomationEngine(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.marketingAutomationEngine)
                      setMarketingAutomationEngine(
                        newFields.marketingAutomationEngine,
                      );
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: Smart Profit Calculator */}
              {brandSubTab === "profitCalculator" && (
                <AdminProfitCalculatorTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    profitCalculatorSection,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setProfitCalculatorSection(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.profitCalculatorSection)
                      setProfitCalculatorSection(
                        newFields.profitCalculatorSection,
                      );
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab: AI Assistant Simulator */}
              {brandSubTab === "aiAssistant" && (
                <AdminAiAssistantTab
                  brandData={{
                    brandName: brandNameForm,
                    brandUrl: brandUrlForm,
                    aiAssistantSimulator,
                    id: userData?.uid,
                  }}
                  userData={userData}
                  onChange={(newFields) => {
                    setAiAssistantSimulator(newFields);
                  }}
                  onSave={async (newFields) => {
                    if (newFields.aiAssistantSimulator)
                      setAiAssistantSimulator(newFields.aiAssistantSimulator);
                    await handleSaveSubTabSection(newFields);
                  }}
                  saving={isUpdatingProfile}
                />
              )}

              {/* Sub-Tab 4: Landing Page Templates */}
              {brandSubTab === "templates" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="ad-table-card"
                  style={{ padding: "28px" }}
                  dir={state.language === "en" ? "ltr" : "rtl"}
                >
                  <div
                    style={{
                      marginBottom: "24px",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "800",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Layout size={20} style={{ color: "var(--accent)" }} />
                        <span>
                          {state.language === "en"
                            ? "Landing Page Templates & Design"
                            : "قوالب وتصاميم صفحة الهبوط"}
                        </span>
                      </h3>
                      <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                        {state.language === "en"
                          ? "Select a template design for your public client landing page."
                          : "اختر التصميم والقالب المناسب لصفحة الهبوط العامة لعملاء البراند."}
                      </span>
                    </div>

                    {/* Direct External Preview Button */}
                    <a
                      href={`/?brand=${userData?.brandName || ""}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm"
                      style={{
                        height: "40px",
                        padding: "0 16px",
                        background: "rgba(59, 130, 246, 0.2)",
                        color: "#fff",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        borderRadius: "12px",
                        fontWeight: "800",
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        textDecoration: "none",
                      }}
                    >
                      <ExternalLink size={15} />
                      <span>
                        {state.language === "en"
                          ? "Open Live Landing Page ↗"
                          : "فتح صفحة الهبوط مباشرة ↗"}
                      </span>
                    </a>
                  </div>

                  {/* Templates Grid Selector */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "24px",
                    }}
                  >
                    {/* Default Template Card */}
                    <div
                      onClick={() => setLandingTemplate("default")}
                      style={{
                        border:
                          landingTemplate === "default"
                            ? "2px solid var(--accent)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "16px",
                        padding: "20px",
                        cursor: "pointer",
                        background:
                          landingTemplate === "default"
                            ? "linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(13, 18, 32, 0.8))"
                            : "rgba(0, 0, 0, 0.25)",
                        transition: "all 0.2s ease",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "140px",
                          background:
                            "linear-gradient(135deg, #0b132b, #1c2541)",
                          borderRadius: "12px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Sparkles
                          size={36}
                          style={{ color: "var(--accent)" }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: "800",
                            color: "#fff",
                          }}
                        >
                          {state.language === "en"
                            ? "Default Standard Template"
                            : "القالب الافتراضي القياسي"}
                        </h4>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "rgba(16, 185, 129, 0.2)",
                            color: "#10B981",
                            border: "1px solid rgba(16, 185, 129, 0.4)",
                          }}
                        >
                          FREE
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text3)",
                          margin: "0 0 16px 0",
                          lineHeight: 1.5,
                        }}
                      >
                        {state.language === "en"
                          ? "Clean, fast-loading, responsive layout optimized for all devices and high conversion rates."
                          : "تصميم نظيف وسريع الاستجابة ومتوافق مع كافة الأجهزة لمعدلات تحويل مرتفعة."}
                      </p>

                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewDemoTemplate("default");
                          setIsLiveDemoModalOpen(true);
                        }}
                        style={{
                          width: "100%",
                          height: "38px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "10px",
                          color: "#fff",
                          fontWeight: "800",
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Eye size={15} />
                        <span>
                          {state.language === "en"
                            ? "Live Demo Preview"
                            : "معاينة تجريبية حية"}
                        </span>
                      </button>
                    </div>

                    {/* Madgicx Pro Template Card */}
                    <div
                      onClick={() => setLandingTemplate("madgicx")}
                      style={{
                        border:
                          landingTemplate === "madgicx"
                            ? "2px solid var(--accent)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "16px",
                        padding: "20px",
                        cursor: "pointer",
                        background:
                          landingTemplate === "madgicx"
                            ? "linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(13, 18, 32, 0.8))"
                            : "rgba(0, 0, 0, 0.25)",
                        transition: "all 0.2s ease",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "140px",
                          background:
                            "linear-gradient(135deg, #0a0a14, #18122b)",
                          borderRadius: "12px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Zap size={36} style={{ color: "#8B5CF6" }} />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: "800",
                            color: "#fff",
                          }}
                        >
                          {state.language === "en"
                            ? "Madgicx Pro Cyber Template"
                            : "قالب Madgicx الاحترافي"}
                        </h4>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "rgba(139, 92, 246, 0.2)",
                            color: "#8B5CF6",
                            border: "1px solid rgba(139, 92, 246, 0.4)",
                          }}
                        >
                          PRO
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text3)",
                          margin: "0 0 16px 0",
                          lineHeight: 1.5,
                        }}
                      >
                        {state.language === "en"
                          ? "Futuristic cyber dark design with interactive feature cards, video hero, and glassmorphic stats."
                          : "تصميم سيبراني عصري مستقبلي مع بطاقات تفاعلية وعرض مميز للخدمات والمميزات."}
                      </p>

                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewDemoTemplate("madgicx");
                          setIsLiveDemoModalOpen(true);
                        }}
                        style={{
                          width: "100%",
                          height: "38px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "10px",
                          color: "#fff",
                          fontWeight: "800",
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Eye size={15} />
                        <span>
                          {state.language === "en"
                            ? "Live Demo Preview"
                            : "معاينة تجريبية حية"}
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Sub-Tab 5: Live Platform Preview (Iframe & Viewport Controls) */}
              {brandSubTab === "preview" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="ad-table-card"
                  style={{ padding: 0, overflow: "hidden" }}
                  dir={state.language === "en" ? "ltr" : "rtl"}
                >
                  {/* Viewport Control Bar */}
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.4)",
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--line)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Eye size={18} style={{ color: "var(--accent)" }} />
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "#fff",
                        }}
                      >
                        {state.language === "en"
                          ? "Interactive Live Viewport Preview"
                          : "المعاينة التفاعلية المباشرة"}
                      </span>
                    </div>

                    {/* Device Responsive Viewport Toggles */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(255, 255, 255, 0.05)",
                        padding: "4px",
                        borderRadius: "12px",
                      }}
                    >
                      {[
                        {
                          id: "desktop",
                          label: "Desktop",
                          icon: Laptop,
                          width: "100%",
                        },
                        {
                          id: "tablet",
                          label: "Tablet",
                          icon: Tablet,
                          width: "768px",
                        },
                        {
                          id: "mobile",
                          label: "Mobile",
                          icon: Smartphone,
                          width: "380px",
                        },
                      ].map((device) => {
                        const DevIcon = device.icon;
                        const isActive = brandPreviewDevice === device.id;
                        return (
                          <button
                            key={device.id}
                            type="button"
                            onClick={() => setBrandPreviewDevice(device.id)}
                            style={{
                              height: "32px",
                              padding: "0 12px",
                              borderRadius: "8px",
                              border: "none",
                              background: isActive
                                ? "var(--accent)"
                                : "transparent",
                              color: isActive ? "#fff" : "var(--text3)",
                              fontSize: "11px",
                              fontWeight: "800",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <DevIcon size={14} />
                            <span>{device.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Toolbar Action Controls */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setIframeKey((k) => k + 1)}
                        style={{
                          height: "34px",
                          padding: "0 12px",
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "10px",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: "800",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <RefreshCw size={13} />
                        <span>
                          {state.language === "en" ? "Refresh" : "تحديث"}
                        </span>
                      </button>

                      <a
                        href="/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          height: "34px",
                          padding: "0 12px",
                          background: "rgba(59, 130, 246, 0.15)",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          borderRadius: "10px",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: "800",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>
                          {state.language === "en" ? "New Tab" : "نافذة جديدة"}
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Viewport Frame Box */}
                  <div
                    style={{
                      background: "#080c14",
                      padding:
                        brandPreviewDevice === "desktop" ? "0" : "20px 0",
                      display: "flex",
                      justifyContent: "center",
                      minHeight: "650px",
                    }}
                  >
                    <div
                      style={{
                        width:
                          brandPreviewDevice === "desktop"
                            ? "100%"
                            : brandPreviewDevice === "tablet"
                              ? "768px"
                              : "380px",
                        height: "650px",
                        transition: "all 0.3s ease",
                        borderRadius:
                          brandPreviewDevice === "desktop" ? "0" : "16px",
                        overflow: "hidden",
                        border:
                          brandPreviewDevice === "desktop"
                            ? "none"
                            : "2px solid rgba(255,255,255,0.15)",
                        boxShadow:
                          brandPreviewDevice === "desktop"
                            ? "none"
                            : "0 20px 50px rgba(0,0,0,0.6)",
                      }}
                    >
                      <iframe
                        id="preview-iframe"
                        key={iframeKey}
                        src="/dashboard"
                        onLoad={handleIframeLoad}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                        title="Tools Preview"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Bottom Action Bar */}
              <div
                style={{
                  marginTop: "24px",
                  background:
                    "linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(13, 18, 32, 0.98))",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                  borderRadius: "18px",
                  padding: "16px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
                dir={state.language === "en" ? "ltr" : "rtl"}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Save All Changes Main Button */}
                  <button
                    type="button"
                    className="ad-submit-btn"
                    onClick={() => {
                      handleUpdateAdminProfile();
                      setLastSavedTimestamp(new Date());
                    }}
                    disabled={isUpdatingProfile}
                    style={{
                      height: "44px",
                      padding: "0 24px",
                      borderRadius: "12px",
                      fontWeight: "800",
                      fontSize: "13px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      minWidth: "200px",
                    }}
                  >
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>
                          {state.language === "en"
                            ? "Saving..."
                            : "جاري الحفظ..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>
                          {t(
                            "brand_settings.save_all",
                            state.language === "en"
                              ? "Save All Changes (Ctrl+S)"
                              : "حفظ كافة الإعدادات (Ctrl+S)",
                          )}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Reset Defaults Button */}
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    style={{
                      height: "44px",
                      padding: "0 16px",
                      borderRadius: "12px",
                      background: "rgba(239, 68, 68, 0.12)",
                      color: "#EF4444",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      fontWeight: "800",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <RotateCcw size={15} />
                    <span>
                      {state.language === "en"
                        ? "Reset Defaults"
                        : "القيم الافتراضية"}
                    </span>
                  </button>
                </div>

                {/* Export JSON Button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleExportBrandSettingsJSON}
                    style={{
                      height: "44px",
                      padding: "0 16px",
                      borderRadius: "12px",
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#10B981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      fontWeight: "800",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Download size={15} />
                    <span>
                      {t(
                        "brand_settings.export_json",
                        state.language === "en"
                          ? "Export Config (JSON)"
                          : "تصدير الإعدادات (JSON)",
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Demo Template Modal */}
              <AnimatePresence>
                {isLiveDemoModalOpen && (
                  <div
                    className="sa-modal-overlay"
                    onClick={() => setIsLiveDemoModalOpen(false)}
                    style={{ zIndex: 1100 }}
                  >
                    <motion.div
                      className="sa-modal-content"
                      style={{
                        maxWidth: "900px",
                        width: "95%",
                        height: "80vh",
                        padding: "24px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                    >
                      <div
                        className="sa-modal-header"
                        style={{ marginBottom: "16px" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <Layout
                            size={20}
                            style={{ color: "var(--accent)" }}
                          />
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "16px",
                              fontWeight: "800",
                              color: "#fff",
                            }}
                          >
                            {state.language === "en"
                              ? `Live Demo: ${previewDemoTemplate} Template`
                              : `معاينة حية: قالب ${previewDemoTemplate}`}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsLiveDemoModalOpen(false)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text3)",
                            cursor: "pointer",
                          }}
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div
                        style={{
                          width: "100%",
                          height: "calc(100% - 60px)",
                          borderRadius: "12px",
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <iframe
                          src={`/?brand=${userData?.brandName || ""}&template=${previewDemoTemplate}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                          }}
                          title="Template Demo"
                        />
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>{" "}
        {/* End ad-main */}
      </div>{" "}
      {/* End ad-layout */}
      {/* User Details Modal (Shared with SuperAdmin logic) */}
      <AnimatePresence>
        {viewingUserDetails && (
          <div
            className="sa-modal-overlay"
            onClick={() => setViewingUserDetails(null)}
          >
            <motion.div
              className="sa-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="sa-modal-header">
                <div>
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#fff",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Eye size={20} style={{ color: "var(--accent)" }} />
                    <span>
                      {state.language === "en"
                        ? "User Progress:"
                        : "تفاصيل تقدم:"}
                    </span>
                    <span style={{ color: "var(--accent)" }}>
                      {viewingUserDetails.ownerName ||
                        viewingUserDetails.brandName}
                    </span>
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text3)" }}>
                    {viewingUserDetails.email}
                  </p>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => setViewingUserDetails(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="sa-modal-body">
                <div
                  className="sa-progress-summary"
                  style={{
                    background: "rgba(59,130,246,0.05)",
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                    border: "1px solid rgba(59,130,246,0.15)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <span>
                      {state.language === "en"
                        ? "Total Completion"
                        : "إجمالي الإنجاز"}
                    </span>
                    <span style={{ color: "var(--accent)" }}>
                      {Math.round(
                        ((viewingUserDetails.appState?.completedSteps?.length ||
                          0) /
                          totalSteps) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${((viewingUserDetails.appState?.completedSteps?.length || 0) / totalSteps) * 100}%`,
                        height: "100%",
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                </div>

                <div
                  className="sa-steps-list"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {ALL_STEPS.map((step) => {
                    const isDone =
                      viewingUserDetails.appState?.completedSteps?.includes(
                        step.id,
                      );
                    return (
                      <div
                        key={step.id}
                        style={{
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          opacity: isDone ? 1 : 0.5,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: isDone
                              ? "var(--green)"
                              : "rgba(255,255,255,0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            color: "#fff",
                          }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Clock size={12} />
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: isDone ? 700 : 400,
                            color: isDone ? "#fff" : "var(--text3)",
                          }}
                        >
                          {state.language === "en"
                            ? step.label_en || step.label
                            : step.label_ar || step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* User Create / Edit Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="sa-modal-overlay">
            <motion.div
              className="sa-modal-content"
              onClick={(e) => e.stopPropagation()}
              dir={state.language === "en" ? "ltr" : "rtl"}
              style={{
                maxWidth: 500,
                textAlign: state.language === "en" ? "left" : "right",
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="sa-modal-header">
                <h2
                  style={{
                    fontSize: 18,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {editingUser ? (
                    <>
                      <Edit size={20} style={{ color: "var(--green)" }} />
                      <span>
                        {state.language === "en"
                          ? "Edit User Details"
                          : "تعديل بيانات المستخدم"}
                      </span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} style={{ color: "var(--accent)" }} />
                      <span>
                        {state.language === "en"
                          ? "Add New User"
                          : "إضافة مستخدم جديد"}
                      </span>
                    </>
                  )}
                </h2>
                <button className="btn btn-sm" onClick={() => cancelEdit()}>
                  <X size={16} />
                </button>
              </div>

              <div
                className="sa-modal-body"
                style={{ maxHeight: "80vh", overflowY: "auto" }}
              >
                <form className="ad-form-body" onSubmit={handleSubmit}>
                  <div className="ad-form-section">
                    <div className="ad-form-section-title">
                      <Shield size={14} />
                      <span>
                        {state.language === "en"
                          ? "Account Role"
                          : "نوع الحساب"}
                      </span>
                    </div>
                    <div className="ad-role-selector">
                      <div
                        className={`ad-role-option ${userRole === "user" ? "active" : ""}`}
                        onClick={() => setUserRole("user")}
                      >
                        <User
                          size={14}
                          style={{
                            display: "inline",
                            marginRight: state.language === "en" ? 4 : 0,
                            marginLeft: state.language === "en" ? 0 : 4,
                          }}
                        />
                        <span>
                          {state.language === "en"
                            ? "Regular User"
                            : "مستخدم عادي"}
                        </span>
                      </div>
                      <div
                        className={`ad-role-option ${userRole === "admin" ? "active" : ""}`}
                        onClick={() => setUserRole("admin")}
                      >
                        <ShieldCheck
                          size={14}
                          style={{
                            display: "inline",
                            marginRight: state.language === "en" ? 4 : 0,
                            marginLeft: state.language === "en" ? 0 : 4,
                          }}
                        />
                        <span>
                          {state.language === "en" ? "Admin" : "أدمن"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ad-form-divider" />

                  <div className="ad-form-section">
                    <div className="ad-form-section-title">
                      <User size={14} />
                      <span>
                        {state.language === "en"
                          ? "User Info"
                          : "بيانات المستخدم"}
                      </span>
                    </div>
                    <div className="field">
                      <label className="field-label">
                        {state.language === "en" ? "Full Name" : "الاسم"}
                      </label>
                      <input
                        className="field-input"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder={
                          state.language === "en"
                            ? "e.g. John Doe"
                            : "مثال: محمد أحمد"
                        }
                        disabled={creating}
                        dir={state.language === "en" ? "ltr" : "rtl"}
                        style={{
                          textAlign: state.language === "en" ? "left" : "right",
                        }}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">
                        {state.language === "en"
                          ? "Email Address"
                          : "البريد الإلكتروني"}
                      </label>
                      <input
                        className="field-input"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        dir="ltr"
                        style={{ textAlign: "left" }}
                        disabled={creating || editingUser}
                      />
                      {editingUser && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text3)",
                            marginTop: 4,
                          }}
                        >
                          {state.language === "en"
                            ? "Email cannot be changed"
                            : "لا يمكن تعديل البريد الإلكتروني"}
                        </div>
                      )}
                    </div>
                    {!editingUser && (
                      <div className="field">
                        <label className="field-label">
                          {state.language === "en" ? "Password" : "كلمة المرور"}
                        </label>
                        <input
                          className="field-input"
                          type="text"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder={
                            state.language === "en"
                              ? "Min 6 characters"
                              : "6 أحرف على الأقل"
                          }
                          dir="ltr"
                          style={{ textAlign: "left" }}
                          disabled={creating}
                        />
                      </div>
                    )}

                    {!editingUser && (
                      <div className="field">
                        <label className="field-label">
                          {state.language === "en"
                            ? "Assign Plan"
                            : "تخصيص باقة"}
                        </label>
                        <CustomSelect
                          options={[
                            {
                              value: "free",
                              label:
                                state.language === "en"
                                  ? `Free Plan (${freeTrialCredits || 20} credits)`
                                  : `باقة مجانية (${freeTrialCredits || 20} رصيد)`,
                            },
                            ...plans.map((p) => ({
                              value: p.id.toString(),
                              label:
                                (state.language === "en"
                                  ? p.name_en || p.name
                                  : p.name_ar || p.name) +
                                " (" +
                                (p.creditsPerMonth || 0) +
                                " " +
                                (state.language === "en" ? "credits" : "رصيد") +
                                ")",
                            })),
                          ]}
                          value={userPlanId}
                          onChange={(newPlanId) => {
                            setUserPlanId(newPlanId);
                            if (newPlanId === "free") {
                              if (
                                subType !== "trial" &&
                                subType !== "stopped"
                              ) {
                                setSubType("trial");
                              }
                            } else {
                              if (subType === "trial") {
                                setSubType("monthly");
                              }
                            }
                          }}
                          disabled={creating}
                        />
                      </div>
                    )}

                    <div className="field">
                      <label className="field-label">
                        {state.language === "en"
                          ? "User Photo (Optional)"
                          : "صورة المستخدم (اختياري)"}
                      </label>
                      {photoPreview ? (
                        <div
                          className="sa-photo-preview-box"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px dashed var(--accent)",
                            borderRadius: "12px",
                            marginTop: "6px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <img
                              src={photoPreview}
                              alt="User Preview"
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "10px",
                                objectFit: "cover",
                                border: "1px solid var(--line)",
                              }}
                            />
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#fff",
                                }}
                              >
                                {profileImage
                                  ? profileImage.name
                                  : state.language === "en"
                                    ? "Current Photo"
                                    : "صورة المستخدم الحالية"}
                              </div>
                              <div
                                style={{ fontSize: 10, color: "var(--text3)" }}
                              >
                                {profileImage
                                  ? `${(profileImage.size / 1024).toFixed(1)} KB`
                                  : state.language === "en"
                                    ? "Uploaded"
                                    : "محمّلة مسبقاً"}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            title={
                              state.language === "en"
                                ? "Remove photo"
                                : "حذف الصورة"
                            }
                            style={{
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              color: "var(--red)",
                              borderRadius: "8px",
                              padding: "6px 10px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            <Trash2 size={14} />
                            <span>
                              {state.language === "en" ? "Delete" : "حذف"}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <label
                          className="sa-file-label"
                          style={{
                            minHeight: 75,
                            padding: "12px",
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px dashed var(--line)",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <input
                            id="userProfileImg"
                            type="file"
                            accept="image/*"
                            className="sa-file-input"
                            onChange={(e) => setProfileImage(e.target.files[0])}
                            disabled={creating}
                          />
                          <UploadCloud
                            size={24}
                            style={{ color: "var(--accent)" }}
                          />
                          <span
                            className="sa-file-text"
                            style={{ fontSize: 11, fontWeight: 600 }}
                          >
                            {state.language === "en"
                              ? "Click to upload photo"
                              : "اضغط لرفع صورة المستخدم"}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="ad-form-divider" />

                    <div className="ad-form-section">
                      <div className="ad-form-section-title">
                        <Sparkles size={14} />
                        <span>
                          {state.language === "en"
                            ? "Subscription Management"
                            : "إدارة الاشتراك"}
                        </span>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <CustomSelect
                          label={
                            state.language === "en"
                              ? "Subscription Type"
                              : "نوع الاشتراك"
                          }
                          value={subType}
                          onChange={(val) => setSubType(val)}
                          icon={Sparkles}
                          options={
                            userPlanId === "free"
                              ? [
                                  {
                                    value: "trial",
                                    label:
                                      state.language === "en"
                                        ? `Trial (${freeTrialDays} Days)`
                                        : `فترة مجانية (${freeTrialDays} أيام)`,
                                    icon: Gift,
                                  },
                                  {
                                    value: "stopped",
                                    label:
                                      state.language === "en"
                                        ? "Stop"
                                        : "إيقاف",
                                    icon: Ban,
                                  },
                                ]
                              : [
                                  {
                                    value: "monthly",
                                    label:
                                      state.language === "en"
                                        ? "Monthly"
                                        : "شهر",
                                    icon: Calendar,
                                  },
                                  {
                                    value: "lifetime",
                                    label:
                                      state.language === "en"
                                        ? "Lifetime"
                                        : "دائم",
                                    icon: Gem,
                                  },
                                  {
                                    value: "custom",
                                    label:
                                      state.language === "en"
                                        ? "Custom"
                                        : "محدد",
                                    icon: SlidersHorizontal,
                                  },
                                  {
                                    value: "stopped",
                                    label:
                                      state.language === "en"
                                        ? "Stop"
                                        : "إيقاف",
                                    icon: Ban,
                                  },
                                ]
                          }
                        />
                      </div>
                    </div>

                    {subType === "custom" && (
                      <div className="field">
                        <label className="field-label">
                          {state.language === "en"
                            ? "Subscription Days"
                            : "عدد أيام الاشتراك"}
                        </label>
                        <input
                          type="number"
                          className="field-input"
                          value={subDays}
                          onChange={(e) => setSubDays(e.target.value)}
                          disabled={creating}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      type="submit"
                      className="ad-submit-btn"
                      disabled={creating}
                      style={{
                        flex: 1,
                        margin: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      {creating ? (
                        <>
                          <div className="ad-submit-spinner" />{" "}
                          {state.language === "en"
                            ? "Saving..."
                            : "جاري الحفظ..."}
                        </>
                      ) : editingUser ? (
                        <>
                          <Save size={16} />
                          <span>
                            {state.language === "en"
                              ? "Save Changes"
                              : "حفظ التعديلات"}
                          </span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          <span>
                            {state.language === "en"
                              ? "Create Account"
                              : "إنشاء الحساب"}
                          </span>
                        </>
                      )}
                    </button>
                    {editingUser && (
                      <button
                        type="button"
                        className="ad-submit-btn"
                        onClick={cancelEdit}
                        disabled={creating}
                        style={{
                          flex: 1,
                          margin: 0,
                          background: "var(--bg3)",
                          color: "var(--text)",
                          border: "1px solid var(--line)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <X size={16} />
                        <span>
                          {state.language === "en" ? "Cancel" : "إلغاء"}
                        </span>
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Plan Create / Edit Modal */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="sa-modal-overlay" style={{ zIndex: 2000 }}>
            <motion.div
              className="sa-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              style={{ maxWidth: 540 }}
              dir={state.language === "en" ? "ltr" : "rtl"}
            >
              <div
                className="sa-modal-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                  }}
                >
                  <Gem size={20} style={{ color: "var(--accent)" }} />
                  <span>
                    {editingPlan
                      ? t("admin_dashboard.edit_plan_modal_title")
                      : t("admin_dashboard.add_plan_modal_title")}
                  </span>
                </h2>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setIsPlanModalOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className="sa-modal-body"
                style={{
                  maxHeight: "80vh",
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {/* Display on Website Toggle */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <Globe size={18} style={{ color: "var(--accent)" }} />
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "#fff",
                        }}
                      >
                        {t("admin_dashboard.display_on_website")}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setPlanDisplayOnWebsite(!planDisplayOnWebsite)
                    }
                    style={{
                      width: 44,
                      height: 22,
                      borderRadius: 11,
                      background: planDisplayOnWebsite
                        ? "var(--green)"
                        : "rgba(255, 255, 255, 0.1)",
                      position: "relative",
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    <motion.div
                      animate={{ left: planDisplayOnWebsite ? 24 : 2 }}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#fff",
                        position: "absolute",
                        top: 2,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  </motion.button>
                </div>

                {/* Plan Name (Arabic) */}
                <div className="field">
                  <label
                    className="field-label"
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Tag size={14} style={{ color: "var(--accent)" }} />
                    <span>{t("admin_dashboard.plan_name_ar_label")}</span>
                  </label>
                  <input
                    className="field-input"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder={
                      state.language === "en"
                        ? "e.g. Golden Plan"
                        : "مثال: الباقة الذهبية"
                    }
                    dir={state.language === "en" ? "ltr" : "rtl"}
                    style={{
                      textAlign: state.language === "en" ? "left" : "right",
                    }}
                  />
                </div>

                {/* Plan Name (English) */}
                <div className="field">
                  <label
                    className="field-label"
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Tag size={14} style={{ color: "var(--accent)" }} />
                    <span>{t("admin_dashboard.plan_name_en_label")}</span>
                  </label>
                  <input
                    className="field-input"
                    value={planNameEn}
                    onChange={(e) => setPlanNameEn(e.target.value)}
                    placeholder="Example: Golden Plan"
                    style={{ textAlign: "left", direction: "ltr" }}
                  />
                </div>

                {/* Price and Currency Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="field">
                    <label
                      className="field-label"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <DollarSign size={14} style={{ color: "var(--green)" }} />
                      <span>{t("admin_dashboard.monthly_price")}</span>
                    </label>
                    <input
                      type="number"
                      className="field-input"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      placeholder="500"
                      dir="ltr"
                      style={{ textAlign: "left" }}
                    />
                  </div>
                  <div className="field">
                    <label
                      className="field-label"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Sparkles size={14} style={{ color: "var(--accent)" }} />
                      <span>{t("admin_dashboard.monthly_credits")}</span>
                    </label>
                    <input
                      type="number"
                      className="field-input"
                      value={planCredits}
                      onChange={(e) => setPlanCredits(e.target.value)}
                      placeholder="20"
                      dir="ltr"
                      style={{ textAlign: "left" }}
                    />
                  </div>
                  <div className="field">
                    <label
                      className="field-label"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Globe size={14} style={{ color: "var(--accent)" }} />
                      <span>{t("admin_dashboard.currency_label")}</span>
                    </label>
                    <CustomSelect
                      value={planCurrency}
                      onChange={setPlanCurrency}
                      options={[
                        {
                          value: "EGP",
                          label:
                            state.language === "en"
                              ? "EGP (ج.م)"
                              : "جنيه مصري (EGP)",
                          icon: DollarSign,
                        },
                        {
                          value: "SAR",
                          label:
                            state.language === "en"
                              ? "SAR (ر.س)"
                              : "ريال سعودي (SAR)",
                          icon: DollarSign,
                        },
                        {
                          value: "AED",
                          label:
                            state.language === "en"
                              ? "AED (د.إ)"
                              : "درهم إماراتي (AED)",
                          icon: DollarSign,
                        },
                        {
                          value: "KWD",
                          label:
                            state.language === "en"
                              ? "KWD (د.ك)"
                              : "دينار كويتي (KWD)",
                          icon: DollarSign,
                        },
                        {
                          value: "USD",
                          label:
                            state.language === "en"
                              ? "USD ($)"
                              : "دولار أمريكي (USD)",
                          icon: DollarSign,
                        },
                        {
                          value: "EUR",
                          label:
                            state.language === "en" ? "EUR (€)" : "يورو (EUR)",
                          icon: DollarSign,
                        },
                      ]}
                    />
                  </div>
                  <div className="field">
                    <label
                      className="field-label"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Calendar size={14} style={{ color: "var(--accent)" }} />
                      <span>{t("admin_dashboard.billing_cycle")}</span>
                    </label>
                    <CustomSelect
                      value={planBillingCycle}
                      onChange={setPlanBillingCycle}
                      options={[
                        {
                          value: "monthly",
                          label:
                            state.language === "en"
                              ? "Monthly"
                              : t("admin_dashboard.billing_monthly"),
                          icon: Calendar,
                        },
                        {
                          value: "yearly",
                          label:
                            state.language === "en"
                              ? "Yearly"
                              : t("admin_dashboard.billing_annual"),
                          icon: Calendar,
                        },
                      ]}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginTop: 12,
                  }}
                >
                  <div className="field">
                    <label
                      className="field-label"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Award size={14} style={{ color: "var(--accent)" }} />
                      <span>{t("admin_dashboard.badge_ar_label")}</span>
                    </label>
                    <input
                      className="field-input"
                      value={planBadgeAr}
                      onChange={(e) => setPlanBadgeAr(e.target.value)}
                      placeholder={
                        state.language === "en"
                          ? "e.g. Popular"
                          : "مثال: الأكثر طلباً"
                      }
                      dir={state.language === "en" ? "ltr" : "rtl"}
                      style={{
                        textAlign: state.language === "en" ? "left" : "right",
                      }}
                    />
                  </div>
                  <div className="field">
                    <label
                      className="field-label"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Award size={14} style={{ color: "var(--accent)" }} />
                      <span>{t("admin_dashboard.badge_en_label")}</span>
                    </label>
                    <input
                      className="field-input"
                      value={planBadgeEn}
                      onChange={(e) => setPlanBadgeEn(e.target.value)}
                      placeholder="e.g. Popular"
                      dir="ltr"
                      style={{ textAlign: "left" }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginTop: 12,
                  }}
                >
                  <div className="field">
                    <label
                      className="field-label"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Zap size={14} style={{ color: "var(--accent)" }} />
                      <span>{t("admin_dashboard.cta_ar_label")}</span>
                    </label>
                    <input
                      className="field-input"
                      value={planCtaAr}
                      onChange={(e) => setPlanCtaAr(e.target.value)}
                      placeholder={
                        state.language === "en"
                          ? "e.g. Subscribe Now"
                          : "مثال: اشترك الآن"
                      }
                      dir={state.language === "en" ? "ltr" : "rtl"}
                      style={{
                        textAlign: state.language === "en" ? "left" : "right",
                      }}
                    />
                  </div>
                  <div className="field">
                    <label
                      className="field-label"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Zap size={14} style={{ color: "var(--accent)" }} />
                      <span>{t("admin_dashboard.cta_en_label")}</span>
                    </label>
                    <input
                      className="field-input"
                      value={planCtaEn}
                      onChange={(e) => setPlanCtaEn(e.target.value)}
                      placeholder="e.g. Subscribe Now"
                      dir="ltr"
                      style={{ textAlign: "left" }}
                    />
                  </div>
                </div>

                {/* Arabic Dynamic Features */}
                <div className="field" style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <label
                      className="field-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        margin: 0,
                      }}
                    >
                      <Sparkles size={14} style={{ color: "var(--green)" }} />
                      <span>
                        {state.language === "en"
                          ? "Arabic Features"
                          : "المميزات (بالعربية)"}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() =>
                        setDynamicFeaturesAr([...dynamicFeaturesAr, ""])
                      }
                      style={{
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "var(--green)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      <Plus size={12} />
                      <span>
                        {state.language === "en" ? "Add Feature" : "إضافة ميزة"}
                      </span>
                    </button>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {dynamicFeaturesAr.map((feat, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          className="field-input"
                          value={feat}
                          onChange={(e) => {
                            const next = [...dynamicFeaturesAr];
                            next[idx] = e.target.value;
                            setDynamicFeaturesAr(next);
                          }}
                          placeholder={
                            state.language === "en"
                              ? "e.g. Access to all tools"
                              : "مثال: دخول لكافة الأدوات"
                          }
                          dir={state.language === "en" ? "ltr" : "rtl"}
                          style={{
                            textAlign:
                              state.language === "en" ? "left" : "right",
                            flex: 1,
                          }}
                        />
                        {dynamicFeaturesAr.length > 1 && (
                          <button
                            type="button"
                            className="sa-delete-btn btn-xs"
                            style={{
                              width: 34,
                              height: 34,
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                            onClick={() =>
                              setDynamicFeaturesAr(
                                dynamicFeaturesAr.filter((_, i) => i !== idx),
                              )
                            }
                            title={
                              state.language === "en"
                                ? "Delete Feature"
                                : "حذف الميزة"
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* English Dynamic Features */}
                <div className="field" style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <label
                      className="field-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        margin: 0,
                      }}
                    >
                      <Sparkles size={14} style={{ color: "var(--accent)" }} />
                      <span>
                        {state.language === "en"
                          ? "English Features"
                          : "المميزات (بالإنجليزية)"}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() =>
                        setDynamicFeaturesEn([...dynamicFeaturesEn, ""])
                      }
                      style={{
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "var(--accent)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      <Plus size={12} />
                      <span>
                        {state.language === "en" ? "Add Feature" : "إضافة ميزة"}
                      </span>
                    </button>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {dynamicFeaturesEn.map((feat, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          className="field-input"
                          value={feat}
                          onChange={(e) => {
                            const next = [...dynamicFeaturesEn];
                            next[idx] = e.target.value;
                            setDynamicFeaturesEn(next);
                          }}
                          placeholder="e.g. Access to all tools"
                          dir="ltr"
                          style={{ textAlign: "left", flex: 1 }}
                        />
                        {dynamicFeaturesEn.length > 1 && (
                          <button
                            type="button"
                            className="sa-delete-btn btn-xs"
                            style={{
                              width: 34,
                              height: 34,
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                            onClick={() =>
                              setDynamicFeaturesEn(
                                dynamicFeaturesEn.filter((_, i) => i !== idx),
                              )
                            }
                            title={
                              state.language === "en"
                                ? "Delete Feature"
                                : "حذف الميزة"
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tool Access Permissions */}
                <div
                  style={{
                    marginTop: 24,
                    marginBottom: 12,
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    background: "rgba(255, 255, 255, 0.01)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <SlidersHorizontal
                          size={16}
                          style={{ color: "var(--accent)" }}
                        />
                        <span>
                          {state.language === "en"
                            ? "Tool Access Permissions"
                            : "صلاحيات الوصول للأدوات"}
                        </span>
                        <span
                          style={{
                            background: "rgba(59, 130, 246, 0.12)",
                            color: "var(--accent)",
                            border: "1px solid rgba(59, 130, 246, 0.25)",
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "2px 8px",
                            borderRadius: "8px",
                          }}
                        >
                          {
                            Array.from(new Set(planAllowedTools)).filter((id) =>
                              CHECKLIST_ITEMS.some((i) => i.id === id),
                            ).length
                          }{" "}
                          / {CHECKLIST_ITEMS.length}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPlanAllowedTools(() => {
                            const next = Array.from(
                              new Set(
                                CHECKLIST_ITEMS.map((item) => item.id).filter(
                                  Boolean,
                                ),
                              ),
                            );
                            planAllowedToolsRef.current = next;
                            return next;
                          })
                        }
                        style={{
                          background: "rgba(59, 130, 246, 0.12)",
                          color: "var(--accent)",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        {state.language === "en" ? "Select All" : "تحديد الكل"}
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPlanAllowedTools(() => {
                            planAllowedToolsRef.current = [];
                            return [];
                          })
                        }
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "var(--red)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        {state.language === "en"
                          ? "Deselect All"
                          : "إلغاء الكل"}
                      </motion.button>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: 8,
                      maxHeight: "200px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {CHECKLIST_ITEMS.map((item) => {
                      const isActive = planAllowedTools.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() =>
                            setPlanAllowedTools((prev) => {
                              const next = isActive
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id];
                              planAllowedToolsRef.current = next;
                              return next;
                            })
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: isActive
                              ? "rgba(16, 185, 129, 0.1)"
                              : "rgba(255, 255, 255, 0.02)",
                            border: isActive
                              ? "1px solid rgba(16, 185, 129, 0.3)"
                              : "1px solid rgba(255, 255, 255, 0.05)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {isActive ? (
                            <CheckCircle2
                              size={14}
                              style={{ color: "var(--green)" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                border: "1px solid var(--text3)",
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: isActive ? "#fff" : "#cbd5e1",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {state.language === "en"
                              ? item.label_en ||
                                item.title ||
                                item.name ||
                                item.id
                              : item.label_ar ||
                                item.title ||
                                item.name ||
                                item.id}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    className="ad-submit-btn"
                    style={{
                      flex: 1,
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                    onClick={() => {
                      if (!planName || !planPrice) {
                        return toast(
                          state.language === "en"
                            ? "Please fill in all basic fields"
                            : "يرجى ملأ البيانات الأساسية",
                          "error",
                        );
                      }

                      const featArString = dynamicFeaturesAr
                        .filter((f) => f.trim() !== "")
                        .join("\n");
                      const featEnString = dynamicFeaturesEn
                        .filter((f) => f.trim() !== "")
                        .join("\n");

                      let newPlans = [];
                      if (editingPlan) {
                        newPlans = plans.map((p) =>
                          p.id === editingPlan.id
                            ? {
                                ...p,
                                name: planName,
                                name_ar: planName,
                                name_en: planNameEn,
                                price: Number(planPrice),
                                creditsPerMonth: Number(planCredits),
                                currency: planCurrency,
                                features: featArString,
                                features_ar: featArString,
                                features_en: featEnString,
                                stripe_product_id:
                                  editingPlan.stripe_product_id || null,
                                stripe_monthly_price_id:
                                  editingPlan.stripe_monthly_price_id || null,
                                stripe_yearly_price_id:
                                  editingPlan.stripe_yearly_price_id || null,
                                displayOnWebsite: planDisplayOnWebsite,
                                billingCycle: planBillingCycle,
                                badge_ar: planBadgeAr,
                                badge_en: planBadgeEn,
                                cta_ar: planCtaAr,
                                cta_en: planCtaEn,
                                // Use ref and filter to avoid async closure issues and clean data
                                allowedTools: Array.from(
                                  new Set(planAllowedToolsRef.current || []),
                                ).filter((id) =>
                                  CHECKLIST_ITEMS.some((i) => i.id === id),
                                ),
                              }
                            : p,
                        );
                        setPlans(newPlans);
                        toast(
                          state.language === "en"
                            ? "Plan updated successfully"
                            : "تم تحديث الباقة بنجاح",
                          "success",
                        );
                      } else {
                        newPlans = [
                          ...plans,
                          {
                            id: Date.now(),
                            name: planName,
                            name_ar: planName,
                            name_en: planNameEn,
                            price: Number(planPrice),
                            creditsPerMonth: Number(planCredits),
                            currency: planCurrency,
                            features: featArString,
                            features_ar: featArString,
                            features_en: featEnString,
                            displayOnWebsite: planDisplayOnWebsite,
                            billingCycle: planBillingCycle,
                            badge_ar: planBadgeAr,
                            badge_en: planBadgeEn,
                            cta_ar: planCtaAr,
                            cta_en: planCtaEn,
                            // Use ref and filter to avoid async closure issues and clean data
                            allowedTools: Array.from(
                              new Set(planAllowedToolsRef.current || []),
                            ).filter((id) =>
                              CHECKLIST_ITEMS.some((i) => i.id === id),
                            ),
                          },
                        ];
                        setPlans(newPlans);
                        toast(
                          state.language === "en"
                            ? "Plan added successfully"
                            : "تم إضافة الباقة بنجاح",
                          "success",
                        );
                      }
                      handleUpdateAdminProfile(newPlans);
                      setIsPlanModalOpen(false);
                    }}
                  >
                    <Save size={16} />
                    <span>
                      {editingPlan
                        ? state.language === "en"
                          ? "Update Plan"
                          : "تحديث الباقة"
                        : state.language === "en"
                          ? "Add Plan"
                          : "إضافة الباقة"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="ad-submit-btn"
                    style={{
                      flex: 1,
                      margin: 0,
                      background: "var(--bg3)",
                      color: "var(--text)",
                      border: "1px solid var(--line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                    onClick={() => setIsPlanModalOpen(false)}
                  >
                    <X size={16} />
                    <span>{state.language === "en" ? "Cancel" : "إلغاء"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Features Preview Modal */}
      <AnimatePresence>
        {viewingPlanFeatures && (
          <div
            className="sa-modal-overlay"
            onClick={() => setViewingPlanFeatures(null)}
            style={{ zIndex: 3000 }}
          >
            <motion.div
              className="sa-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              style={{ maxWidth: 520 }}
              dir={state.language === "en" ? "ltr" : "rtl"}
            >
              <div
                className="sa-modal-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                  }}
                >
                  <Gem size={18} style={{ color: "var(--accent)" }} />
                  <span>
                    {state.language === "en"
                      ? `Features: ${viewingPlanFeatures.name_en || viewingPlanFeatures.name_ar || viewingPlanFeatures.name}`
                      : `مميزات باقة: ${viewingPlanFeatures.name_ar || viewingPlanFeatures.name}`}
                  </span>
                </h2>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setViewingPlanFeatures(null)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <div
                className="sa-modal-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {/* Arabic Features */}
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--green)",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>
                      {state.language === "en"
                        ? "Arabic Features"
                        : "المميزات بالعربية"}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {viewingPlanFeatures.featArList?.length > 0 ? (
                      viewingPlanFeatures.featArList.map((f, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "10px 14px",
                            background: "rgba(16, 185, 129, 0.05)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            borderRadius: 8,
                            fontSize: 13,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Sparkles
                            size={14}
                            style={{ color: "var(--green)", flexShrink: 0 }}
                          />
                          <span>{f}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--text3)", fontSize: 12 }}>
                        —
                      </div>
                    )}
                  </div>
                </div>

                {/* English Features */}
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--accent)",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>
                      {state.language === "en"
                        ? "English Features"
                        : "المميزات بالإنجليزية"}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {viewingPlanFeatures.featEnList?.length > 0 ? (
                      viewingPlanFeatures.featEnList.map((f, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "10px 14px",
                            background: "rgba(59, 130, 246, 0.05)",
                            border: "1px solid rgba(59, 130, 246, 0.2)",
                            borderRadius: 8,
                            fontSize: 13,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            direction: "ltr",
                            textAlign: "left",
                          }}
                        >
                          <Sparkles
                            size={14}
                            style={{ color: "var(--accent)", flexShrink: 0 }}
                          />
                          <span>{f}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--text3)", fontSize: 12 }}>
                        —
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Renew / Change Plan Modal */}
      <AnimatePresence>
        {renewPlanUser && (
          <div
            className="sa-modal-overlay"
            onClick={() => setRenewPlanUser(null)}
          >
            <motion.div
              className="sa-modal-content"
              onClick={(e) => e.stopPropagation()}
              dir={state.language === "en" ? "ltr" : "rtl"}
              style={{
                maxWidth: 500,
                textAlign: state.language === "en" ? "left" : "right",
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="sa-modal-header">
                <h2
                  style={{
                    fontSize: 18,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <RefreshCw size={20} style={{ color: "#10B981" }} />
                  <span>
                    {state.language === "en"
                      ? "Renew / Change Plan"
                      : "تجديد / تغيير الخطة"}
                  </span>
                </h2>
                <button
                  className="btn btn-sm"
                  onClick={() => setRenewPlanUser(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className="sa-modal-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                  padding: "24px",
                }}
              >
                {/* User Info Card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "14px",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    className="ad-user-avatar"
                    style={
                      renewPlanUser.photoURL
                        ? {
                            background: `url("${renewPlanUser.photoURL}") center/cover no-repeat`,
                            border: "1px solid rgba(255,255,255,0.1)",
                          }
                        : {}
                    }
                  >
                    {!renewPlanUser.photoURL &&
                      (renewPlanUser.ownerName || renewPlanUser.email || "?")
                        .charAt(0)
                        .toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "15px",
                        color: "var(--text1)",
                      }}
                    >
                      {renewPlanUser.ownerName || "\u2014"}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text3)",
                        marginTop: "2px",
                      }}
                    >
                      {renewPlanUser.email}
                    </div>
                  </div>
                </div>

                {/* Current Plan Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text3)",
                        marginBottom: "4px",
                      }}
                    >
                      {state.language === "en"
                        ? "Current Plan"
                        : "الخطة الحالية"}
                    </div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "14px",
                        color: "#10B981",
                      }}
                    >
                      {(() => {
                        const pName =
                          renewPlanUser.subscription?.planName ||
                          renewPlanUser.planName ||
                          "Free";
                        const foundPlan = plans.find(
                          (p) =>
                            p.name === pName ||
                            p.name_ar === pName ||
                            p.name_en === pName,
                        );
                        return state.language === "en"
                          ? foundPlan?.name_en || foundPlan?.name || pName
                          : foundPlan?.name_ar || foundPlan?.name || pName;
                      })()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text3)",
                        marginBottom: "4px",
                      }}
                    >
                      {state.language === "en"
                        ? "Remaining Credits"
                        : "الرصيد المتبقي"}
                    </div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "14px",
                        color: "var(--text1)",
                      }}
                    >
                      {renewPlanUser.credits ?? 0}
                      <span
                        style={{
                          color: "var(--text3)",
                          fontWeight: "400",
                          fontSize: "12px",
                        }}
                      >
                        {" / "}
                        {renewPlanUser.totalCredits ?? 20}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plan Selector */}
                <div className="field">
                  <label
                    className="field-label"
                    style={{
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    <Layers size={14} style={{ color: "var(--accent)" }} />
                    {state.language === "en"
                      ? "Select New Plan"
                      : "اختر الخطة الجديدة"}
                  </label>
                  <CustomSelect
                    label=""
                    value={renewPlanId}
                    onChange={(val) => setRenewPlanId(val)}
                    icon={Layers}
                    options={[
                      {
                        value: "free",
                        label:
                          state.language === "en"
                            ? `Free Plan (${freeTrialCredits || 20} credits)`
                            : `خطة مجانية (${freeTrialCredits || 20} رصيد)`,
                        icon: Gift,
                      },
                      ...plans.map((p) => ({
                        value: p.id.toString(),
                        label:
                          (state.language === "en"
                            ? p.name_en || p.name
                            : p.name_ar || p.name) +
                          " (" +
                          (p.creditsPerMonth || 0) +
                          " " +
                          (state.language === "en" ? "credits" : "رصيد") +
                          ")",
                        icon: Sparkles,
                      })),
                    ]}
                  />
                </div>

                {/* Warning Note */}
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text3)",
                    padding: "10px 14px",
                    background: "rgba(245, 158, 11, 0.06)",
                    borderRadius: "10px",
                    border: "1px solid rgba(245, 158, 11, 0.15)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    lineHeight: "1.6",
                  }}
                >
                  <AlertTriangle
                    size={16}
                    style={{
                      color: "#F59E0B",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <span>
                    {state.language === "en"
                      ? "This action will immediately reset the user\u2019s credits to the selected plan\u2019s monthly allocation. The user can start using the new credits right away."
                      : "سيتم إعادة تعيين رصيد المستخدم فوراً إلى الحد الشهري للخطة المختارة. يمكن للمستخدم استخدام الرصيد الجديد على الفور."}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    className="btn"
                    onClick={() => setRenewPlanUser(null)}
                    style={{
                      flex: 1,
                      height: "46px",
                      borderRadius: "12px",
                      fontWeight: "600",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--text2)",
                      border: "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                  >
                    <X size={15} />
                    {state.language === "en" ? "Cancel" : "إلغاء"}
                  </button>
                  <button
                    className="btn"
                    onClick={handleRenewPlan}
                    disabled={isRenewing}
                    style={{
                      flex: 2,
                      height: "46px",
                      borderRadius: "12px",
                      fontWeight: "700",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      color: "#fff",
                      border: "none",
                      cursor: isRenewing ? "not-allowed" : "pointer",
                      opacity: isRenewing ? 0.6 : 1,
                      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    {isRenewing ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    {state.language === "en"
                      ? "Confirm Renewal"
                      : "تأكيد التجديد"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Professional Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div
            className="sa-modal-overlay"
            onClick={() => setUserToDelete(null)}
          >
            <motion.div
              className="sa-modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 420, padding: 24 }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "var(--red)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                  }}
                >
                  <AlertTriangle size={28} />
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: 8,
                  }}
                >
                  {state.language === "en"
                    ? "Confirm User Deletion"
                    : "تأكيد حذف المستخدم"}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text2)",
                    lineHeight: 1.5,
                  }}
                >
                  {state.language === "en"
                    ? `Are you sure you want to permanently delete user "${userToDelete.ownerName || userToDelete.email}"? This action cannot be undone.`
                    : `هل أنت متأكد من حذف المستخدم "${userToDelete.ownerName || userToDelete.email}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
                </p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn"
                  disabled={isDeletingUser}
                  onClick={() => setUserToDelete(null)}
                  style={{
                    flex: 1,
                    background: "var(--bg3)",
                    border: "1px solid var(--line)",
                    color: "var(--text)",
                    padding: "10px",
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  {state.language === "en" ? "Cancel" : "إلغاء"}
                </button>

                <button
                  className="btn"
                  disabled={isDeletingUser}
                  onClick={confirmDeleteUser}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                    border: "none",
                    color: "#fff",
                    padding: "10px",
                    borderRadius: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {isDeletingUser ? (
                    <div className="ad-submit-spinner" />
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>
                        {state.language === "en" ? "Delete" : "تأكيد الحذف"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
