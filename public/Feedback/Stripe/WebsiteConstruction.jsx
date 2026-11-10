// WebsiteConstruction.tsx
import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import {
  getAllWebsiteGalleryTemplates,
  getDomainIdeasTemplate,
  getWebsiteTemplate,
  getAllWebsiteTemplateCategories,
} from "../../../services/contentDbService";
import { parseTemplate } from "../../../utils/templateParser";
import {
  subscribeStep2Data,
  updateGatewayStatus,
  updateVatStatus,
} from "../../../services/websiteConstructionService";
import { callGemini } from "../../../services/geminiService";
import AnalysisModeSelector from "../../../components/common/AnalysisModeSelector";
import { dispatchLiveAiAnalysis } from "../../../services/liveAiService";
import { useNavigate, useSearchParams } from "react-router-dom";
import ToolDashboardLayout from "./ToolDashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layout,
  Wand2,
  Globe,
  CreditCard,
  Code,
  Copy,
  Eye,
  Sparkles,
  CheckCircle2,
  Settings,
  Server,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Layers,
  Zap,
  AlertTriangle,
  FolderOpen,
  Cpu,
  CheckSquare,
  Truck,
  SlidersHorizontal,
  Building,
  ChevronDown,
  Check,
  X,
  Activity,
  HardDrive,
  Smartphone,
  Monitor,
  RefreshCw,
  ExternalLink,
  MonitorSmartphone,
  ShoppingBag,
  Stethoscope,
  Wrench,
  Home,
  Palette,
  Pizza,
  Briefcase,
  GraduationCap,
  Dumbbell,
  Camera,
  Car,
  Plane,
  Music,
  Scissors,
  Heart,
  Coffee,
  Brush
} from "lucide-react";
import "./WebsiteConstruction.css";

const getVectorIcon = (iconStr, cat) => {
  const c = cat ? cat.toLowerCase() : '';
  if (iconStr?.includes('📱') || c.includes('saas') || c.includes('tech')) return <MonitorSmartphone size={24} className="text-indigo-400" />;
  if (iconStr?.includes('🛍') || iconStr?.includes('🛒') || c.includes('commerce') || c.includes('متجر')) return <ShoppingBag size={24} className="text-pink-400" />;
  if (iconStr?.includes('🏥') || c.includes('health') || c.includes('صحة')) return <Stethoscope size={24} className="text-emerald-400" />;
  if (iconStr?.includes('🔧') || c.includes('service') || c.includes('خدمات')) return <Wrench size={24} className="text-slate-400" />;
  if (iconStr?.includes('🏠') || c.includes('real') || c.includes('عقار')) return <Home size={24} className="text-amber-400" />;
  if (iconStr?.includes('🎨') || c.includes('art') || c.includes('فاشون')) return <Palette size={24} className="text-purple-400" />;
  if (iconStr?.includes('🍔') || c.includes('food') || c.includes('مطعم')) return <Pizza size={24} className="text-orange-400" />;
  if (iconStr?.includes('🚀') || c.includes('startup')) return <Rocket size={24} className="text-blue-400" />;
  if (iconStr?.includes('💼') || c.includes('corporate') || c.includes('أعمال')) return <Briefcase size={24} className="text-sky-400" />;
  if (iconStr?.includes('🎓') || c.includes('education') || c.includes('تعليم')) return <GraduationCap size={24} className="text-indigo-500" />;
  if (iconStr?.includes('💪') || c.includes('fitness') || c.includes('جيم')) return <Dumbbell size={24} className="text-slate-500" />;
  if (iconStr?.includes('📸') || c.includes('photo') || c.includes('تصوير')) return <Camera size={24} className="text-purple-500" />;
  if (iconStr?.includes('🚗') || c.includes('auto') || c.includes('سيارات')) return <Car size={24} className="text-red-400" />;
  if (iconStr?.includes('✈️') || c.includes('travel') || c.includes('سفر')) return <Plane size={24} className="text-sky-500" />;
  if (iconStr?.includes('🎵') || c.includes('music') || c.includes('موسيقى')) return <Music size={24} className="text-pink-500" />;
  if (iconStr?.includes('✂️') || c.includes('salon') || c.includes('صالون')) return <Scissors size={24} className="text-rose-400" />;
  if (iconStr?.includes('❤️') || c.includes('charity') || c.includes('خيرية')) return <Heart size={24} className="text-red-500" />;
  if (iconStr?.includes('☕') || c.includes('coffee') || c.includes('قهوة')) return <Coffee size={24} className="text-amber-600" />;
  if (iconStr?.includes('🧹') || c.includes('clean') || c.includes('تنظيف')) return <Brush size={24} className="text-teal-400" />;
  
  return <Layout size={24} className="text-indigo-400" />;
};

// Custom Glassmorphic Select Dropdown Component for Step 2
function CustomGlassSelect({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOpt = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`wc-glass-select-btn ${isOpen ? 'open' : ''}`}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "12.5px",
          fontWeight: "600",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {selectedOpt?.icon && <span>{selectedOpt.icon}</span>}
          <span>{selectedOpt?.label}</span>
        </div>
        <ChevronDown
          size={14}
          color="#94A3B8"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="wc-glass-select-menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              zIndex: 100,
              borderRadius: "12px",
              padding: "6px",
              backdropFilter: "blur(20px)",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`wc-glass-select-option ${isSelected ? "selected" : ""}`}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {opt.icon && <span>{opt.icon}</span>}
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={13} color="#6366F1" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import useToolCache from "../../../hooks/useToolCache";

export default function WebsiteConstruction({ stepNumber }) {
  const { state, dispatch } = useApp();
  const { userData } = useAuth();
  const { cachedData: cached, isCached, isLoadingCache, saveResult } = useToolCache(userData?.uid, 'website-construction');
  const isLoadedFromCloud = !isLoadingCache;

  const toastContext = useToast();
  const toast =
    typeof toastContext === "function"
      ? toastContext
      : toastContext?.toast || ((msg) => console.log(msg));

  const lang = state.language || "ar";
  const isRtl = lang?.startsWith('ar');

  // -- URL Search Params for Tab State Persistence --
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get("step");

  const getStepFromParam = (param) => {
    if (param === "settings") return 2;
    if (param === "infrastructure") return 3;
    return 1;
  };

  const [currentStep, setCurrentStep] = useState(cached?.currentStep ?? getStepFromParam(stepParam));
  const [analysisMode, setAnalysisMode] = useState(cached?.analysisMode ?? "fast"); // 'fast' | 'live'

  // Node Map Inspection Focus State
  const [activeNode, setActiveNode] = useState(null); // null | 1 | 2 | 3 | 4

  // Close inspector on ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setActiveNode(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update step and sync URL search params
  const changeStep = (stepNum) => {
    setCurrentStep(stepNum);
    const stepName =
      stepNum === 2 ? "settings" : stepNum === 3 ? "infrastructure" : "design";
    setSearchParams({ step: stepName }, { replace: true });
  };

  // Sync state if user navigates back/forward in browser history
  useEffect(() => {
    const targetStep = getStepFromParam(stepParam);
    if (targetStep !== currentStep) {
      setCurrentStep(targetStep);
    }
  }, [stepParam]);

  // -- API Key Handling --
  const [apiKeyError, setApiKeyError] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);

  // -- Step 1: Design State --
  const [method, setMethod] = useState(cached?.method ?? "gemini"); // 'gemini' | 'template'
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(cached?.generatedCode ?? "");
  const [galleryTemplates, setGalleryTemplates] = useState([]);
  const [templateCategories, setTemplateCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGalleryTemplate, setSelectedGalleryTemplate] = useState(null);
  const [viewportMode, setViewportMode] = useState("desktop"); // 'desktop' | 'mobile'
  const [mobileStudioTab, setMobileStudioTab] = useState("code"); // 'code' | 'canvas'

  // -- Step 2: Store Configuration State --
  const [storeConfig, setStoreConfig] = useState(cached?.storeConfig ?? {
    storeName: state.brandName || "",
    currency: "USD",
    language: "ar",
    stripePublishableKey: "",
    stripeSecretKey: "",
    paypalClientId: "",
    enablePaypal: true,
    enableStripe: true,
    enableCod: true,
    shippingFlatRate: "15.00",
    taxRate: "14",
    enableAutoTax: true,
  });

  // Step 2 Side Tabs State
  const [activeStep2Tab, setActiveStep2Tab] = useState("domain");
  const step2SideTabs = [
    {
      id: "domain",
      title_ar: "ربط الدومين",
      sub_ar: "ربط نطاق خاص بمتجرك",
      title_en: "Domain Connection",
      sub_en: "Link custom store domain",
      icon: <Globe size={18} />,
    },
    {
      id: "payment",
      title_ar: "بوابات الدفع",
      sub_ar: "تفعيل Stripe و PayPal",
      title_en: "Payment Gateways",
      sub_en: "Enable Stripe & PayPal",
      icon: <CreditCard size={18} />,
    },
    {
      id: "currency",
      title_ar: "العملة والضرائب",
      sub_ar: "ضبط إعدادات المبيعات",
      title_en: "Currency & Taxes",
      sub_en: "Configure sales parameters",
      icon: <SlidersHorizontal size={18} />,
    },
  ];

  // Step 2 Dynamic Firestore Seeding & Real-Time Sync State
  const [step2Data, setStep2Data] = useState(null);
  const [loadingStep2Data, setLoadingStep2Data] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeStep2Data((data) => {
      setStep2Data(data);
      setLoadingStep2Data(false);
    });
    return () => unsubscribe();
  }, []);

  // Handler to toggle Payment Gateway enabled state directly in Firestore using updateGatewayStatus
  const handleToggleGatewayInFirestore = async (gatewayId) => {
    if (!step2Data || !step2Data.paymentGateways) return;
    const targetGateway = (step2Data.paymentGateways.gateways || []).find(
      (g) => g.id === gatewayId,
    );
    if (!targetGateway) return;
    const newStatus = !targetGateway.enabled;

    try {
      await updateGatewayStatus(gatewayId, newStatus);
      toast(
        lang === "en"
          ?`Payment Gateway ${gatewayId} updated in Firestore!`
          :`تم تحديث حالة بوابة الدفع ${gatewayId} في قاعدة البيانات!`,
        "success",
      );
    } catch (err) {
      toast(
        lang === "en"
          ? "Failed to update gateway status in Firestore"
          : "فشل تحديث حالة بوابة الدفع في قاعدة البيانات",
        "error",
      );
    }
  };

  // Handler to toggle VAT calculation state directly in Firestore using updateVatStatus
  const handleToggleVatInFirestore = async () => {
    if (!step2Data || !step2Data.currencyAndTaxes) return;
    const currentVatState = step2Data.currencyAndTaxes.vatItem?.enabled ?? true;
    const newStatus = !currentVatState;

    try {
      await updateVatStatus(newStatus);
      toast(
        lang === "en"
          ?"VAT tax calculation state updated in Firestore!"
          :"تم تحديث حالة احتساب الضريبة في قاعدة البيانات!",
        "success",
      );
    } catch (err) {
      toast(
        lang === "en"
          ? "Failed to update VAT tax state in Firestore"
          : "فشل تحديث حالة الضريبة في قاعدة البيانات",
        "error",
      );
    }
  };

  // Currency options for custom glass select
  const currencyOptions = [
    { value: "USD", label: "USD ($) - US Dollar", icon: "💵" },
    { value: "SAR", label: "SAR (ر.س) - Saudi Riyal", icon: "🇸🇦" },
    { value: "EGP", label: "EGP (ج.م) - Egyptian Pound", icon: "🇪🇬" },
    { value: "AED", label: "AED (د.إ) - UAE Dirham", icon: "🇦🇪" },
    { value: "EUR", label: "EUR (€) - Euro", icon: "🇪🇺" },
  ];

  const languageOptions = [
    { value: "ar", label: "العربية (Arabic)", icon: "🌐" },
    { value: "en", label: "English (English)", icon: "🇺🇸" },
  ];

  // -- Step 3: Infrastructure State --
  const [isGeneratingDomain, setIsGeneratingDomain] = useState(false);
  const [domainMatrix, setDomainMatrix] = useState(cached?.domainMatrix ?? null);

  const hydratedRef = useRef(false);

  // 1. Hydrate state asynchronously when cache loads
  useEffect(() => {
    if (isLoadedFromCloud && !hydratedRef.current) {
      hydratedRef.current = true;
      if (cached) {
        const data = cached.inputs ? { ...cached.inputs, ...cached.result } : cached;
        if (data.currentStep !== undefined) setCurrentStep(data.currentStep);
        if (data.analysisMode !== undefined) setAnalysisMode(data.analysisMode);
        if (data.method !== undefined) setMethod(data.method);
        if (data.storeConfig !== undefined) setStoreConfig(data.storeConfig);
        if (data.generatedCode !== undefined) setGeneratedCode(data.generatedCode);
        if (data.domainMatrix !== undefined) setDomainMatrix(data.domainMatrix);
      }
    }
  }, [isLoadedFromCloud, cached]);

  // 2. Safe Auto-save (only runs after hydration)
  useEffect(() => {
    if (!isLoadedFromCloud || !hydratedRef.current) return;
    
    const timeout = setTimeout(() => {
      saveResult({ 
        inputs: { currentStep, analysisMode, method, storeConfig }, 
        result: { generatedCode, domainMatrix } 
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [isLoadedFromCloud, currentStep, analysisMode, method, storeConfig, generatedCode, domainMatrix]);

  useEffect(() => {
    const loadGallery = async () => {
      const [templates, cats] = await Promise.all([
        getAllWebsiteGalleryTemplates(),
        getAllWebsiteTemplateCategories()
      ]);
      setGalleryTemplates(templates.filter(t => !t.status || String(t.status).trim().toLowerCase() !== 'draft'));
      setTemplateCategories(cats.filter(c => c.isVisible));
    };
    loadGallery();
  }, []);

  // Safe Copy helper
  const safeCopyToClipboard = (text, successMsgEn, successMsgAr) => {
    const copyPromise =
      navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(text)
        : new Promise((resolve, reject) => {
            try {
              const textarea = document.createElement("textarea");
              textarea.value = text;
              textarea.style.position = "fixed";
              textarea.style.opacity = "0";
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand("copy");
              document.body.removeChild(textarea);
              resolve();
            } catch (e) {
              reject(e);
            }
          });

    copyPromise
      .then(() => {
        toast(lang === "en" ? successMsgEn : successMsgAr, "success");
      })
      .catch((err) => {
        console.error(err);
        toast(
          lang === "en"
            ? "Failed to copy to clipboard"
            : "تعذر النسخ إلى الحافظة",
          "error",
        );
      });
  };

  // ====== STEP 1 METHODS ======
  const handleSaveApiKey = async () => {
    if (!tempApiKey.trim()) return;
    setIsSavingKey(true);
    try {
      if (tempApiKey.length < 20) throw new Error("Invalid API Key");
      dispatch({
        type: "UPDATE_USER_DATA",
        payload: { apiKey: tempApiKey.trim() },
      });
      setApiKeyError(false);
      toast(
        lang === "en"
          ?"API Key saved successfully!"
          :"تم حفظ مفتاح الـ API بنجاح!",
        "success",
      );
    } catch (err) {
      toast(
        lang === "en"
          ? "Invalid API key format."
          : "صيغة مفتاح الـ API غير صحيحة.",
        "error",
      );
    } finally {
      setIsSavingKey(false);
    }
  };

  const generateAILandingPage = async () => {
    setIsGenerating(true);
    setGeneratedCode("");
    try {
      if (analysisMode === "live") {
        const brandName =
          state.brandName || (lang === "en" ? "My Brand" : "براندي");
        const colorHex = state.primaryColor || "#6366F1";
        const secondaryColor = state.secondaryColor || "#0B0F17";
        const nicheName =
          state.subNiche ||
          state.niche ||
          (lang === "en" ? "Business" : "أعمال");

        const liveHtml = await dispatchLiveAiAnalysis({ uid: userData?.uid || state?.user?.uid, 
          toolId: "website-construction",
          inputs: { brandName, colorHex, secondaryColor, nicheName },
          context: { niche: state.niche, brandName: state.brandName },
          lang,
        });

        if (!liveHtml || !liveHtml.trim()) {
          toast(
            lang === "en"
              ? "No website code returned. Please try again."
              : "لم يتم توليد أي كود. يرجى إعادة المحاولة.",
            "warning",
          );
          return;
        }

        const cleanedHtml = liveHtml.replace(/```html|```/g, "").trim();
        setGeneratedCode(`\`\`\`html\n${cleanedHtml}\n\`\`\``);
        setApiKeyError(false);
        toast(
          lang === "en"
            ?"Website code generated dynamically!"
            :"تم توليد كود الموقع بالذكاء الاصطناعي بنجاح!",
          "success",
        );
      } else {
        // Fast Radar Mode -> Load template directly from Firebase / Firestore DB without needing a Gemini Key
        const brandName =
          state.brandName || (lang === "en" ? "My Brand" : "براندي");
        const colorHex = state.primaryColor || "#6366F1";
        const secondaryColor = state.secondaryColor || "#0B0F17";
        const nicheName =
          state.subNiche ||
          state.niche ||
          (lang === "en" ? "Business" : "أعمال");
        const logoUrl = state.logoUrl || state.logo || state.photoURL || "";

        let templateHtml = "";
        try {
          const dbTemplate = await getWebsiteTemplate(state.subNiche || state.niche || "general");
          if (dbTemplate && (dbTemplate.html || dbTemplate.code || dbTemplate.template)) {
            templateHtml = dbTemplate.html || dbTemplate.code || dbTemplate.template;
          }
        } catch (e) {
          console.log("Firebase getWebsiteTemplate fetch error:", e);
        }

        if (!templateHtml) {
          templateHtml = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{brandName}} - {{nicheName}}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white font-sans antialiased">
  <!-- Navigation -->
  <nav class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <div class="flex items-center space-x-3 space-x-reverse">
        ${logoUrl ? `<img src="${logoUrl}" alt="{{brandName}}" class="h-8 w-auto">` : `<span class="text-xl font-bold text-indigo-400">{{brandName}}</span>`}
      </div>
      <a href="#contact" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-indigo-500/20">
        ${lang === "en" ? "Get Started" : "ابدأ الآن"}
      </a>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="py-24 px-6 text-center relative overflow-hidden">
    <div class="max-w-4xl mx-auto">
      <span class="px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-block mb-6">
        {{nicheName}}
      </span>
      <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
        ${lang === "en" ? `Empowering Your {{nicheName}} Growth` : `حلول مبتكرة لتطوير مجال {{nicheName}}`}
      </h1>
      <p class="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
        ${lang === "en" ? `Premium solutions engineered specifically for {{brandName}} clients.` : `خدمات احترافية مصممة خصيصاً لعملاء {{brandName}} لتحقيق أفضل النتائج.`}
      </p>
      <div class="flex justify-center gap-4">
        <a href="#services" class="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition shadow-xl shadow-indigo-600/30">
          ${lang === "en" ? "Explore Services" : "استكشف الخدمات"}
        </a>
      </div>
    </div>
  </section>
</body>
</html>`;
        }

        const parsedHtml = parseTemplate(templateHtml, {
          brandName,
          colorHex,
          secondaryColor,
          nicheName,
          logoUrl
        });

        const cleanedHtml = parsedHtml.replace(/```html|```/g, "").trim();
        setGeneratedCode(`\`\`\`html\n${cleanedHtml}\n\`\`\``);
        setApiKeyError(false);
        toast(
          lang === "en"
            ?"Fast Radar website template loaded from database!"
            :"تم تحميل قالب الموقع السريع من قاعدة البيانات بنجاح!",
          "success",
        );
      }
    } catch (error) {
      console.error("Gemini Website Generation Error:", error);
      const errorStr = (error.message || "").toLowerCase();

      if (
        errorStr.includes("quota") ||
        errorStr.includes("rate limit") ||
        errorStr.includes("429") ||
        errorStr.includes("limit: 0")
      ) {
        setApiKeyError(true);
        toast(
          lang === "en"
            ? "Quota exceeded for this Gemini API Key! Please wait a minute or try another API key, or switch to Live mode."
            : "تم تجاوز حد استخدام مفتاح Gemini (Quota Exceeded)! يرجى التمهل دقيقة أو استخدام مفتاح جديد أو التبديل للوضع المباشر.",
          "warning",
        );
      } else {
        toast(
          lang === "en"
            ? `Error generating code: ${error.message || "Unexpected failure"}`
            : `حدث خطأ أثناء توليد الكود: ${error.message || "خطأ غير متوقع"}`,
          "error",
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectGalleryTemplate = (template) => {
    setSelectedGalleryTemplate(template);
    const brandName =
      state.brandName || (lang === "en" ? "My Brand" : "براندي");
    const colorHex = state.primaryColor || "#6366F1";
    const secondaryColor = state.secondaryColor || "#0B0F17";
    const nicheName =
      state.subNiche || state.niche || (lang === "en" ? "Business" : "أعمال");
    const logoUrl = state.logoUrl || state.logo || state.photoURL || "";
    const brandLogoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${brandName}" style="max-height: 40px; width: auto; object-fit: contain;">`
      : `<div class="font-black text-2xl" style="color: ${colorHex};">${brandName}</div>`;

    const templateRawStr = lang === "en" ? template.code_en : template.code_ar;
    const rawHtml = parseTemplate(templateRawStr, {
      brandName,
      colorHex,
      secondaryColor,
      nicheName,
      logoUrl,
      brandLogoHtml,
    });
    setGeneratedCode(`\`\`\`html\n${rawHtml}\n\`\`\``);
    toast(
      lang === "en"
        ? `Loaded "${template.name_en || template.name_ar}" template!`
        : `تم تحميل قالب "${template.name_ar || template.name_en}"!`,
      "info",
    );
  };

  const copyCodeToClipboard = () => {
    const codeToCopy = generatedCode
      .replace(/^\`\`\`html\n/, "")
      .replace(/\n\`\`\`$/, "");
    safeCopyToClipboard(
      codeToCopy,
      "Code copied successfully to clipboard! ✅",
      "تم نسخ الكود بنجاح إلى الحافظة! ✅",
    );
  };

  const handlePreview = () => {
    const codeToPreview = generatedCode
      .replace(/^\`\`\`html\n/, "")
      .replace(/\n\`\`\`$/, "");
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write(codeToPreview);
      previewWindow.document.close();
    } else {
      toast(
        lang === "en"
          ? "Pop-up blocked. Please allow popups for live preview."
          : "تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة.",
        "warning",
      );
    }
  };

  // ====== STEP 3 METHODS ======
  const generateDomainIdeas = async () => {
    if (!state?.brandName) {
      toast(
        lang === "en"
          ? "Please choose a brand name first in identity step."
          : "الرجاء اختيار اسم البراند أولاً في خطوات الهوية.",
        "warning",
      );
      return;
    }
    setIsGeneratingDomain(true);
    setDomainMatrix(null);
    try {
      if (analysisMode === "live") {
        const liveResult = await dispatchLiveAiAnalysis({ uid: userData?.uid || state?.user?.uid, 
          toolId: "domain-matrix",
          inputs: { brandName: state.brandName },
          context: { niche: state.niche, brandName: state.brandName },
          lang,
        });
        if (typeof liveResult === "object" && liveResult.classic) {
          setDomainMatrix(liveResult);
          saveResult({
              inputs: { currentStep, analysisMode, method, storeConfig },
              result: { generatedCode, domainMatrix: liveResult  }
            });
        } else {
          setDomainMatrix({
            error:
              typeof liveResult === "string"
                ? liveResult
                : JSON.stringify(liveResult),
          });
        }
      } else {
        await new Promise((r) => setTimeout(r, 600));
        const dbResult = await getDomainIdeasTemplate(state.niche || "general");
        if (dbResult && dbResult.matrix) {
          setDomainMatrix(dbResult.matrix);
          saveResult({
            inputs: { currentStep, analysisMode, method, storeConfig },
            result: { generatedCode, domainMatrix: dbResult.matrix }
          });
        } else {
          setDomainMatrix({
            error:
              lang === "en"
                ? "Domain matrix not found."
                : "لم يتم العثور على مصفوفة الدومينات.",
          });
        }
      }
      toast(
        lang === "en"
          ? "Domain matrix generated!"
          : "تم التوصل لأقوى اقتراحات مصفوفة الدومينات!",
        "success",
      );
    } catch (error) {
      console.error(error);
      toast(
        lang === "en"
          ? "Error suggesting domains."
          : "حدث خطأ. يرجى إعادة المحاولة.",
        "error",
      );
    } finally {
      setIsGeneratingDomain(false);
    }
  };

  const cleanBrand = (name) => {
    if (!name) return "yourbrand";
    let cleaned = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cleaned) return "yourbrand";
    return cleaned;
  };

  const formatDomainDescription = (desc, domainText) => {
    if (!desc) return lang === "en" ? "Official Standard" : "معياري رسمي";
    let cleaned = desc.trim();

    // Clean up raw verbose strings like "Modern corporate fitness dot-co"
    if (
      cleaned.toLowerCase().includes("dot-co") ||
      domainText?.endsWith(".co")
    ) {
      return lang === "en" ? "Official .CO Extension" : "امتداد .CO الرسمي";
    }
    if (
      cleaned.toLowerCase().includes("fitness") ||
      cleaned.toLowerCase().includes("corporate")
    ) {
      return lang === "en" ? "Corporate Standard" : "النطاق المعياري للشركة";
    }
    if (cleaned.length > 22) {
      const words = cleaned.split(" ");
      return words.slice(0, 3).join(" ");
    }
    return cleaned;
  };

  const renderDomainCard = (domainText, description) => {
    const extMatch = domainText.match(/\.[a-z0-9]+$/i);
    const ext = extMatch ? extMatch[0] : "";
    const cleanDesc = formatDomainDescription(description, domainText);

    return (
      <motion.div
        key={domainText}
        className="wc-domain-card"
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          safeCopyToClipboard(
            domainText,
            `Domain "${domainText}" copied to clipboard! ✅`,
            `تم نسخ الدومين "${domainText}" إلى الحافظة! ✅`,
          );
        }}
      >
        {/* Header Rail: Icon + Extension Badge + Quick Copy Button */}
        <div className="wc-domain-card-header-v2">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="wc-domain-globe-icon">
              <Globe size={14} />
            </div>
            {ext && <span className="wc-domain-ext-badge">{ext}</span>}
          </div>

          <button
            type="button"
            className="wc-domain-copy-btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              safeCopyToClipboard(
                domainText,
                `Domain "${domainText}" copied to clipboard! ✅`,
                `تم نسخ الدومين "${domainText}" إلى الحافظة! ✅`,
              );
            }}
            title={lang === "en" ? "Copy Domain" : "نسخ الدومين"}
          >
            <Copy size={13} />
          </button>
        </div>

        {/* Full Domain Text Display Box (Always Shows Full Value) */}
        <div className="wc-domain-full-value">{domainText}</div>

        {/* Footer Rail: Description + Availability Tag */}
        <div className="wc-domain-card-footer">
          <div className="wc-domain-desc-tag">
            <CheckCircle2 size={12} color="#10B981" style={{ flexShrink: 0 }} />
            <span>{cleanDesc}</span>
          </div>
          <span className="wc-domain-avail-tag">AVAILABLE ⚡</span>
        </div>
      </motion.div>
    );
  };

  // ====== RENDER TAB 1: DESIGN & CODE (DUAL-PANE IN-LINE WORKBENCH) ======
  const renderStep1 = () => {
    const cleanHtmlCode = generatedCode
      ? generatedCode.replace(/^```html\n/, "").replace(/\n```$/, "")
      : "";

    return (
      <motion.div
        key="step1"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header Section */}
        <div className="wc-section-header">
          <div
            style={{
              width: "4px",
              height: "24px",
              borderRadius: "4px",
              background: "#6366F1",
            }}
          />
          <div>
            <h3 className="wc-section-title">
              <Wand2 size={18} color="#6366F1" />
              <span>
                {lang === "en"
                  ? "Step 1: AI Code Studio & Live Sandbox Workbench"
                  : "الخطوة 1: استوديو الذكاء الاصطناعي ومعاينة الكود المباشر"}
              </span>
            </h3>
            <p className="wc-section-desc">
              {lang === "en"
                ? "Generate custom Tailwind CSS landing page code using AI or pick from pre-built templates, with real-time in-line live canvas preview."
                : "اختر بين البناء التلقائي التخصصي لكود موقعك بالذكاء الاصطناعي أو تصفح معرض القوالب، مع المعاينة المباشرة التفاعلية جنبًا إلى جنب."}
            </p>
          </div>
        </div>

        {/* Sleek Top Segmented Control Toggle Bar */}
        <div className="wc-segmented-toggle-bar">
          <button
            type="button"
            className={`wc-segmented-btn ${method === "gemini" ? "active" : ""}`}
            onClick={() => {
              setMethod("gemini");
              setGeneratedCode("");
              setSelectedGalleryTemplate(null);
            }}
          >
            <Cpu size={16} />
            <span>
              {lang === "en"
                ? "AI Custom Code Generator"
                : "التوليد بالذكاء الاصطناعي (AI Studio)"}
            </span>
          </button>

          <button
            type="button"
            className={`wc-segmented-btn ${method === "template" ? "active" : ""}`}
            onClick={() => {
              setMethod("template");
              setGeneratedCode("");
              setSelectedGalleryTemplate(null);
            }}
          >
            <Layout size={16} />
            <span>
              {lang === "en"
                ? "Template Library Workbench"
                : "معرض القوالب الجاهزة (Library)"}
            </span>
          </button>
        </div>

        {/* Mobile Tab Switcher (< 1024px) */}
        <div className="wc-mobile-studio-tabs">
          <button
            type="button"
            className={`wc-mobile-tab-btn ${mobileStudioTab === "code" ? "active" : ""}`}
            onClick={() => setMobileStudioTab("code")}
          >
            <Code size={14} />
            <span>{lang === "en" ? "Code Editor" : "محرر الكود"}</span>
          </button>
          <button
            type="button"
            className={`wc-mobile-tab-btn ${mobileStudioTab === "canvas" ? "active" : ""}`}
            onClick={() => setMobileStudioTab("canvas")}
          >
            <Eye size={14} />
            <span>{lang === "en" ? "Live Canvas" : "المعاينة المباشرة"}</span>
            {cleanHtmlCode && <span className="wc-live-badge-dot" />}
          </button>
        </div>

        {/* DUAL-PANE IN-LINE WORKBENCH CONTAINER */}
        <div className="wc-studio-workbench">
          
          {/* ════════════ LEFT PANE: CONTROLS & CODE EDITOR ════════════ */}
          <div className={`wc-studio-left-pane ${mobileStudioTab !== "code" ? "mobile-hidden" : ""}`}>
            
            {/* METHOD 1: AI GEMINI GENERATOR */}
            {method === "gemini" && (
              <div className="wc-studio-pane-inner">
                <div className="wc-pane-header">
                  <h4 className="wc-pane-title">
                    <Code size={16} color="#818CF8" />
                    <span>
                      {lang === "en"
                        ? "AI Code Controls & Workbench"
                        : "لوحة التحكم والكود البرمجي"}
                    </span>
                  </h4>
                  {generatedCode && !isGenerating && !apiKeyError && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={copyCodeToClipboard}
                        className="wc-btn wc-btn-primary"
                        style={{ fontSize: "11px", padding: "6px 12px" }}
                      >
                        <Copy size={12} /> {lang === "en" ? "Copy Code" : "نسخ الكود"}
                      </button>
                    </div>
                  )}
                </div>

                {apiKeyError ? (
                  <div className="wc-api-key-card">
                    <AlertTriangle size={28} color="#EF4444" style={{ marginBottom: "8px" }} />
                    <h4 className="wc-api-title">
                      {lang === "en" ? "Gemini API Key Required" : "مفتاح API الخاص بـ Gemini مطلوب"}
                    </h4>
                    <p className="wc-api-desc">
                      {lang === "en"
                        ? "To use dynamic AI building in Fast mode, please provide a valid Google Gemini API Key below or switch to Live AI Analysis mode."
                        : "لاستخدام البناء السريع بالذكاء الاصطناعي، يرجى إدخال مفتاح API لـ Google Gemini أدناه أو التبديل لنمط الذكاء الاصطناعي المباشر."}
                    </p>

                    <div className="wc-api-input-wrap">
                      <input
                        type="password"
                        className="wc-form-input"
                        placeholder="AIzaSy..."
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        onClick={handleSaveApiKey}
                        disabled={isSavingKey || !tempApiKey.trim()}
                        className="wc-btn wc-btn-primary"
                        style={{ padding: "0 16px", fontSize: "12px" }}
                      >
                        {isSavingKey ? "..." : lang === "en" ? "Save" : "حفظ"}
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: "14px" }}>
                      <button
                        onClick={() => navigate("/dashboard/settings")}
                        style={{
                          background: "transparent",
                          color: "#818CF8",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Settings size={13} /> {lang === "en" ? "Go to Settings" : "الذهاب للإعدادات"}
                      </button>
                      <button
                        onClick={() => setApiKeyError(false)}
                        style={{
                          background: "transparent",
                          color: "#94A3B8",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        {lang === "en" ? "Cancel" : "إلغاء"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Mode Selector & Generator Action */}
                    <div className="wc-ai-controls-box">
                      <AnalysisModeSelector
                        mode={analysisMode}
                        onChange={setAnalysisMode}
                        lang={lang}
                        accentColor="#6366F1"
                      />

                      <button
                        onClick={generateAILandingPage}
                        disabled={isGenerating}
                        className="wc-btn wc-btn-primary"
                        style={{ width: "100%", marginTop: "12px" }}
                      >
                        {isGenerating ? (
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <span className="td-spinner" />
                            {lang === "en" ? "Coding Landing Page..." : "جاري كتابة كود الموقع..."}
                          </span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <Sparkles size={16} />
                            {lang === "en" ? (generatedCode ? "Re-generate Code" : "Generate Landing Page Code") : (generatedCode ? "إعادة توليد الكود" : "توليد كود صفحة الهبوط")}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Code Output Viewer */}
                    {generatedCode && (
                      <div className="wc-code-box">
                        <pre>{generatedCode}</pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* METHOD 2: TEMPLATE GALLERY WORKBENCH */}
            {method === "template" && (
              <div className="wc-studio-pane-inner">
                {!selectedGalleryTemplate ? (
                  <>
                    <div style={{ marginBottom: "12px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#FFFFFF", margin: "0 0 4px 0" }}>
                        {lang === "en" ? "Filter by Category" : "تصفية القوالب حسب المجال"}
                      </h4>
                      <p style={{ fontSize: "11.5px", color: "#94A3B8", margin: 0 }}>
                        {lang === "en" ? "Select industry to view tailored designs." : "اختر التخصص المطلوب لعرض التصاميم المجهزة للقطاع."}
                      </p>
                    </div>

                    <div className="wc-category-pills">
                      <button
                        className={`wc-category-pill ${selectedCategory === "All" ? "active" : ""}`}
                        onClick={() => setSelectedCategory("All")}
                      >
                        <FolderOpen size={13} />
                        <span>{lang === "en" ? "All" : "الكل"}</span>
                      </button>
                      {templateCategories.map((cat) => (
                        <button
                          key={cat.id}
                          className={`wc-category-pill ${selectedCategory === cat.label_en ? "active" : ""}`}
                          onClick={() => setSelectedCategory(cat.label_en)}
                        >
                          <Layers size={13} />
                          <span>{lang === "en" ? cat.label_en : cat.label_ar}</span>
                        </button>
                      ))}
                    </div>

                    <div className="wc-template-grid">
                      {galleryTemplates
                        .filter((tpl) => selectedCategory === "All" || tpl.category === selectedCategory)
                        .map((tpl) => (
                          <motion.div
                            key={tpl.id}
                            className="wc-template-card"
                            onClick={() => handleSelectGalleryTemplate(tpl)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="wc-template-icon">{getVectorIcon(tpl.icon, tpl.category)}</div>
                            <h4 style={{ color: "#FFFFFF", fontSize: "13px", fontWeight: "800", margin: "0 0 2px 0" }}>
                              {lang === "en" ? tpl.name_en : tpl.name_ar}
                            </h4>
                            <p style={{ color: "#94A3B8", fontSize: "11px", lineHeight: "1.4", margin: 0 }}>
                              {lang === "en" ? tpl.description_en : tpl.description_ar}
                            </p>
                          </motion.div>
                        ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="wc-pane-header">
                      <button
                        onClick={() => setSelectedGalleryTemplate(null)}
                        className="wc-btn wc-btn-secondary"
                        style={{ padding: "5px 10px", fontSize: "11px" }}
                      >
                        {isRtl ? <ArrowRight size={13} /> : <ArrowLeft size={13} />}
                        <span>{lang === "en" ? "Back to Templates" : "العودة للقوالب"}</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={copyCodeToClipboard}
                        className="wc-btn wc-btn-primary"
                        style={{ padding: "5px 12px", fontSize: "11px" }}
                      >
                        <Copy size={12} /> {lang === "en" ? "Copy Code" : "نسخ الكود"}
                      </button>
                    </div>

                    <div className="wc-code-box">
                      <pre>{generatedCode}</pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ════════════ RIGHT PANE: INTEGRATED LIVE CANVAS SANDBOX (NO POPUPS) ════════════ */}
          <div className={`wc-studio-right-pane ${mobileStudioTab !== "canvas" ? "mobile-hidden" : ""}`}>
            {/* Canvas Header & Toolbar */}
            <div className="wc-canvas-toolbar">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={16} color="#6366F1" />
                <span style={{ fontSize: "13px", fontWeight: "800", color: "#FFFFFF" }}>
                  {lang === "en" ? "Live Canvas Sandbox" : "المعاينة المباشرة الحية"}
                </span>
                {cleanHtmlCode && <span className="wc-live-badge-status">LIVE ⚡</span>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Device Frame Viewport Toggle */}
                <div className="wc-device-toggle-group">
                  <button
                    type="button"
                    className={`wc-device-btn ${viewportMode === "desktop" ? "active" : ""}`}
                    onClick={() => setViewportMode("desktop")}
                    title={lang === "en" ? "Desktop View" : "عرض الكمبيوتر"}
                  >
                    <Monitor size={13} />
                    <span>{lang === "en" ? "Desktop" : "حاسوب"}</span>
                  </button>
                  <button
                    type="button"
                    className={`wc-device-btn ${viewportMode === "mobile" ? "active" : ""}`}
                    onClick={() => setViewportMode("mobile")}
                    title={lang === "en" ? "Mobile View" : "عرض الجوال"}
                  >
                    <Smartphone size={13} />
                    <span>{lang === "en" ? "Mobile" : "جوال"}</span>
                  </button>
                </div>

                {/* Popout Live Preview Window Button */}
                {cleanHtmlCode && (
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="wc-icon-btn-ghost"
                    title={lang === "en" ? "Popout to New Window" : "فتح في نافذة جديدة"}
                  >
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Canvas Frame Container */}
            <div className="wc-canvas-frame-wrap">
              {cleanHtmlCode ? (
                <iframe
                  className="wc-live-canvas-iframe"
                  srcDoc={cleanHtmlCode}
                  title="Live Workbench Canvas"
                  style={{
                    width: viewportMode === "mobile" ? "375px" : "100%",
                    margin: "0 auto",
                  }}
                />
              ) : (
                /* Glowing Blueprint Placeholder */
                <div className="wc-canvas-blueprint-placeholder">
                  <div className="wc-blueprint-icon-halo">
                    <Wand2 size={32} color="#6366F1" />
                  </div>
                  <h4 style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: "800", margin: "8px 0 2px 0" }}>
                    {lang === "en" ? "Interactive Live Canvas Sandbox" : "منصة المعاينة التفاعلية المباشرة"}
                  </h4>
                  <p style={{ color: "#94A3B8", fontSize: "12px", maxWidth: "340px", margin: 0, lineHeight: "1.5" }}>
                    {lang === "en"
                      ? "Generate code via AI or select a template from the left pane to render live interactive output instantly."
                      : "قم بتوليد الكود بالذكاء الاصطناعي أو اختر قالباً من القائمة لعرض الموقع المباشر فوراً."}
                  </p>
                  <span className="wc-blueprint-status-pill">
                    AWAITING CODE GENERATION ⚡
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </motion.div>
    );
  };

  // ====== RENDER STEP 2: PURE DYNAMIC FIRESTORE BINDING ======
  const renderStep2 = () => {
    // Pure Skeleton Loading State while fetching from Firestore
    if (loadingStep2Data || !step2Data) {
      return (
        <motion.div
          key="step2-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="wc-section-header">
            <div
              style={{
                width: "4px",
                height: "24px",
                borderRadius: "4px",
                background: "#6366F1",
              }}
            />
            <div>
              <h3 className="wc-section-title">
                <SlidersHorizontal size={18} color="#6366F1" />
                <span>
                  {lang === "en"
                    ? "Step 2: General Settings & Setup"
                    : "الخطوة 2: الضبط والتهيئة العامة"}
                </span>
              </h3>
            </div>
          </div>
          <div className="wc-step2-layout-2030">
            <div className="wc-step2-sidebar">
              <div className="wc-step2-skeleton" style={{ height: "64px" }} />
              <div className="wc-step2-skeleton" style={{ height: "64px" }} />
              <div className="wc-step2-skeleton" style={{ height: "64px" }} />
            </div>
            <div className="wc-step2-content-card">
              <div
                className="wc-step2-skeleton"
                style={{ height: "32px", width: "60%", marginBottom: "16px" }}
              />
              <div
                className="wc-step2-skeleton"
                style={{ height: "54px", marginBottom: "12px" }}
              />
              <div
                className="wc-step2-skeleton"
                style={{ height: "54px", marginBottom: "12px" }}
              />
              <div className="wc-step2-skeleton" style={{ height: "54px" }} />
            </div>
          </div>
        </motion.div>
      );
    }

    // Direct Dynamic Values from Firestore (NO INLINE HARDCODED ARRAY FALLBACKS IN JSX)
    const headerTitle =
      step2Data.header?.[lang === "en" ? "title_en" : "title_ar"];
    const headerSubtitle =
      step2Data.header?.[lang === "en" ? "subtitle_en" : "subtitle_ar"];

    const domainTitle =
      step2Data.domainSettings?.[lang === "en" ? "title_en" : "title_ar"];
    const domainDesc =
      step2Data.domainSettings?.[lang === "en" ? "desc_en" : "desc_ar"];
    const domainSteps = step2Data.domainSettings?.steps;

    const paymentTitle =
      step2Data.paymentGateways?.[lang === "en" ? "title_en" : "title_ar"];
    const paymentDesc =
      step2Data.paymentGateways?.[lang === "en" ? "desc_en" : "desc_ar"];
    const gatewaysList = step2Data.paymentGateways?.gateways;

    const currencyTitle =
      step2Data.currencyAndTaxes?.[lang === "en" ? "title_en" : "title_ar"];
    const currencyDesc =
      step2Data.currencyAndTaxes?.[lang === "en" ? "desc_en" : "desc_ar"];
    const currencyItem = step2Data.currencyAndTaxes?.currencyItem;
    const vatItem = step2Data.currencyAndTaxes?.vatItem;

    return (
      <motion.div
        key="step2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="wc-section-header">
          <div
            style={{
              width: "4px",
              height: "24px",
              borderRadius: "4px",
              background: "#6366F1",
            }}
          />
          <div>
            <h3 className="wc-section-title">
              <SlidersHorizontal size={18} color="#6366F1" />
              <span>{headerTitle}</span>
            </h3>
            <p className="wc-section-desc">{headerSubtitle}</p>
          </div>
        </div>

        {/* Two-Column Split Workspace */}
        <div className="wc-step2-layout-2030">
          {/* Side Selector Tabs */}
          <div className="wc-step2-sidebar">
            {step2SideTabs.map((tab) => {
              const isActive = activeStep2Tab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveStep2Tab(tab.id)}
                  className={`wc-step2-tab-btn ${isActive ? "active" : ""}`}
                >
                  <div className="wc-step2-tab-icon">{tab.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: "800",
                        color: isActive ? "#FFFFFF" : "#CBD5E1",
                      }}
                    >
                      {lang === "en" ? tab.title_en : tab.title_ar}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: isActive ? "#818CF8" : "#94A3B8",
                        marginTop: "2px",
                      }}
                    >
                      {lang === "en" ? tab.sub_en : tab.sub_ar}
                    </div>
                  </div>
                  {isActive && (
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#6366F1",
                        boxShadow: "0 0 8px #6366F1",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Left Content Area (Active Tab Details) */}
          <div className="wc-step2-content-card">
            {/* TAB 1: Domain Connection (DNS Settings) */}
            {activeStep2Tab === "domain" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(99, 102, 241, 0.15)",
                      color: "#818CF8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Globe size={16} />
                  </div>
                  <h4
                    style={{
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "#FFFFFF",
                      margin: 0,
                    }}
                  >
                    {domainTitle}
                  </h4>
                </div>

                <p
                  style={{
                    fontSize: "12px",
                    color: "#94A3B8",
                    lineHeight: "1.6",
                    marginBottom: "20px",
                  }}
                >
                  {domainDesc}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {domainSteps &&
                    domainSteps.map((s, idx) => (
                      <div key={s.id || idx} className="wc-step2-step-item">
                        <span
                          style={{
                            color: "#818CF8",
                            fontFamily: "monospace",
                            fontWeight: "900",
                          }}
                        >
                          {s.num || `0${idx + 1}`}
                        </span>
                        <span>{lang === "en" ? s.text_en : s.text_ar}</span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* TAB 2: Payment Gateways */}
            {activeStep2Tab === "payment" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(99, 102, 241, 0.15)",
                      color: "#818CF8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CreditCard size={16} />
                  </div>
                  <h4
                    style={{
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "#FFFFFF",
                      margin: 0,
                    }}
                  >
                    {paymentTitle}
                  </h4>
                </div>

                <p
                  style={{
                    fontSize: "12px",
                    color: "#94A3B8",
                    lineHeight: "1.6",
                    marginBottom: "20px",
                  }}
                >
                  {paymentDesc}
                </p>

                {/* Render Pure Dynamic Gateways from Firestore */}
                {gatewaysList &&
                  gatewaysList.map((gw) => (
                    <div key={gw.id} className="wc-step2-gateway-card">
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
                            fontSize: "15px",
                            fontWeight: "800",
                            color: "#FFFFFF",
                            margin: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <CreditCard size={16} color="#818CF8" />
                          <span>{gw.title}</span>
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span className="wc-step2-badge-indigo">
                            {lang === "en" ? gw.badge_en : gw.badge_ar}
                          </span>
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#94A3B8",
                          lineHeight: "1.6",
                          margin: 0,
                        }}
                      >
                        {lang === "en" ? gw.desc_en : gw.desc_ar}
                      </p>
                    </div>
                  ))}
              </motion.div>
            )}

            {/* TAB 3: Currency & Tax Parameters */}
            {activeStep2Tab === "currency" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(99, 102, 241, 0.15)",
                      color: "#818CF8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SlidersHorizontal size={16} />
                  </div>
                  <h4
                    style={{
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "#FFFFFF",
                      margin: 0,
                    }}
                  >
                    {currencyTitle}
                  </h4>
                </div>

                <p
                  style={{
                    fontSize: "12px",
                    color: "#94A3B8",
                    lineHeight: "1.6",
                    marginBottom: "20px",
                  }}
                >
                  {currencyDesc}
                </p>

                {/* Item 1: Base Currency */}
                {currencyItem && (
                  <div className="wc-step2-gateway-card">
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: "800",
                        color: "#FFFFFF",
                        margin: "0 0 6px 0",
                      }}
                    >
                      {lang === "en"
                        ? currencyItem.title_en
                        : currencyItem.title_ar}
                    </h4>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#94A3B8",
                        lineHeight: "1.6",
                        margin: 0,
                      }}
                    >
                      {lang === "en"
                        ? currencyItem.desc_en
                        : currencyItem.desc_ar}
                    </p>
                  </div>
                )}

                {/* Item 2: VAT Tax */}
                {vatItem && (
                  <div
                    className="wc-step2-gateway-card"
                    style={{ marginBottom: 0 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "#FFFFFF",
                          margin: 0,
                        }}
                      >
                        {lang === "en" ? vatItem.title_en : vatItem.title_ar}
                      </h4>
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#94A3B8",
                        lineHeight: "1.6",
                        margin: 0,
                      }}
                    >
                      {lang === "en" ? vatItem.desc_en : vatItem.desc_ar}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };
  // ====== RENDER TAB 3: VISUAL INTERACTIVE NODE WORKSPACE ======
  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      <div className="wc-section-header">
        <div
          style={{
            width: "4px",
            height: "24px",
            borderRadius: "4px",
            background: "#6366F1",
          }}
        />
        <div>
          <h3 className="wc-section-title">
            <Server size={18} color="#6366F1" />
            <span>
              {lang === "en"
                ? "Step 3: Domain Infrastructure & Node Matrix"
                : "الخطوة 3: البنية التحتية ومصفوفة العقد (Node Matrix)"}
            </span>
          </h3>
          <p className="wc-section-desc">
            {lang === "en"
              ? "Verify DNS connectivity matrix, SSL security status, and generate AI brand domain extensions."
              : "استعرض حالة اتصالات الـ DNS، شهادة الأمان SSL، واستخرج أفضل نطاقات ودومينات تجارية لبراندك."}
          </p>
        </div>
      </div>

      {/* Top Minimalist Status Rail */}
      <div className="wc-status-rail-2030">
        <div className="wc-status-rail-item">
          <Activity size={14} color="#10B981" />
          <span>
            {lang === "en" ? "System Status:" : "حالة النظام:"}{" "}
            <strong>{lang === "en" ? "Online" : "متصل"}</strong>
          </span>
        </div>
        <div className="wc-status-rail-item">
          <ShieldCheck size={14} color="#10B981" />
          <span>
            {lang === "en" ? "Encryption:" : "التشفير:"}{" "}
            <strong>
              {lang === "en" ? "TLS 1.3 Active" : "مفعل (256-bit)"}
            </strong>
          </span>
        </div>
        <div className="wc-status-rail-item">
          <Zap size={14} color="#818CF8" />
          <span>
            {lang === "en" ? "DNS Propagation:" : "انتشار DNS:"}{" "}
            <strong>{lang === "en" ? "Ready" : "جاهز"}</strong>
          </span>
        </div>
      </div>

      {/* Central Interactive Visual Node Map Canvas */}
      <div className="wc-node-map-canvas">
        {/* Central Core Node */}
        <motion.div
          className="wc-node-central"
          animate={{
            scale: [1, 1.05, 1],
            boxShadow: [
              "0 0 25px rgba(99, 102, 241, 0.35)",
              "0 0 55px rgba(99, 102, 241, 0.7)",
              "0 0 25px rgba(99, 102, 241, 0.35)"
            ]
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{ scale: 1.08 }}
        >
          <div className="wc-node-central-icon-wrap">
            <Globe size={32} color="#6366F1" />
          </div>
          <h4 className="wc-node-central-title">
            {state?.brandName || "Brand Core"}
          </h4>
          <span className="wc-node-central-sub">
            {cleanBrand(state.brandName)}.store
          </span>
        </motion.div>

        {/* 4 Connected Peripheral Nodes */}
        <div className="wc-peripheral-nodes-grid">
          {/* Node 1 */}
          <motion.div
            className="wc-node-card"
            whileHover={{ y: -3 }}
            onClick={() => setActiveNode(1)}
          >
            <div className="wc-node-info">
              <div className="wc-node-icon-wrap">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="wc-node-title">
                  {lang === "en"
                    ? "1. System Connectivity & SSL"
                    : "1. حالة الاتصال والتشفير الأمني"}
                </h4>
                <p className="wc-node-desc">
                  {lang === "en"
                    ? "Click to inspect IP & TLS status"
                    : "اضغط لمعاينة الـ IP وشهادة SSL"}
                </p>
              </div>
            </div>
            <span className="wc-command-pill-tag">ONLINE</span>
          </motion.div>

          {/* Node 2 */}
          <motion.div
            className="wc-node-card"
            whileHover={{ y: -3 }}
            onClick={() => setActiveNode(2)}
          >
            <div className="wc-node-info">
              <div
                className="wc-node-icon-wrap"
                style={{
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#818CF8",
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="wc-node-title">
                  {lang === "en"
                    ? "2. Smart AI Domain Generator"
                    : "2. مولد مصفوفة الدومينات الذكية"}
                </h4>
                <p className="wc-node-desc">
                  {lang === "en"
                    ? "Click to generate AI extensions"
                    : "اضغط لاستخراج دومينات ذكية"}
                </p>
              </div>
            </div>
            <span className="wc-command-pill-tag">AI ACTIVE</span>
          </motion.div>

          {/* Node 3 */}
          <motion.div
            className="wc-node-card"
            whileHover={{ y: -3 }}
            onClick={() => setActiveNode(3)}
          >
            <div className="wc-node-info">
              <div className="wc-node-icon-wrap">
                <Code size={20} />
              </div>
              <div>
                <h4 className="wc-node-title">
                  {lang === "en"
                    ? "3. DNS Records Configuration"
                    : "3. جدول إعدادات الـ DNS"}
                </h4>
                <p className="wc-node-desc">
                  {lang === "en"
                    ? "Click to copy A & CNAME records"
                    : "اضغط لنسخ سجلات الـ DNS"}
                </p>
              </div>
            </div>
            <span className="wc-command-pill-tag">MATRIX READY</span>
          </motion.div>

          {/* Node 4 */}
          <motion.div
            className="wc-node-card"
            whileHover={{ y: -3 }}
            onClick={() => setActiveNode(4)}
          >
            <div className="wc-node-info">
              <div className="wc-node-icon-wrap">
                <CheckSquare size={20} />
              </div>
              <div>
                <h4 className="wc-node-title">
                  {lang === "en"
                    ? "4. Setup Confirmation"
                    : "4. تأكيد جاهزية إعدادات الموقع"}
                </h4>
                <p className="wc-node-desc">
                  {lang === "en"
                    ? "Click to confirm step completion"
                    : "اضغط لتأكيد الإنجاز"}
                </p>
              </div>
            </div>
            <span className="wc-command-pill-tag">CONFIRMATION</span>
          </motion.div>
        </div>
      </div>

      {/* Focus Mode Inspector Overlay (On-Click Node Inspection) */}
      <AnimatePresence>
        {activeNode !== null && (
          <motion.div
            className="wc-node-inspector-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveNode(null)}
          >
            <motion.div
              className="wc-node-inspector-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="wc-node-inspector-header">
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <HardDrive size={18} color="#6366F1" />
                  <span>
                    {activeNode === 1 &&
                      (lang === "en"
                        ? "Node 1: System Connectivity & Security Status"
                        : "العقدة 1: حالة اتصال النظام والربط الأمني")}
                    {activeNode === 2 &&
                      (lang === "en"
                        ? "Node 2: Smart AI Domain Matrix Generator"
                        : "العقدة 2: مولد مصفوفة الدومينات الذكية")}
                    {activeNode === 3 &&
                      (lang === "en"
                        ? "Node 3: DNS Records Configuration Matrix"
                        : "العقدة 3: جدول ربط إعدادات الـ DNS للدومين المخصص")}
                    {activeNode === 4 &&
                      (lang === "en"
                        ? "Node 4: Website Setup Confirmation"
                        : "العقدة 4: تأكيد جاهزية إعدادات الموقع")}
                  </span>
                </h3>
                <button
                  onClick={() => setActiveNode(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94A3B8",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Node 1 Content: Connectivity & SSL Health */}
              {activeNode === 1 && (
                <div
                  className="wc-infra-health-grid"
                  style={{ marginTop: "10px" }}
                >
                  <motion.div
                    className="wc-infra-health-card"
                    whileHover={{ y: -2, scale: 1.01 }}
                  >
                    <div className="wc-infra-health-icon">
                      <Globe size={18} color="#6366F1" />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748B",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#10B981",
                            boxShadow: "0 0 6px #10B981",
                          }}
                        />
                        <span>
                          {lang === "en" ? "A RECORD IP" : "عنوان IP (سجل A)"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "12.5px",
                          fontWeight: "800",
                          color: "#FFFFFF",
                          fontFamily: "monospace",
                        }}
                      >
                        185.199.108.153
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="wc-infra-health-card"
                    whileHover={{ y: -2, scale: 1.01 }}
                  >
                    <div
                      className="wc-infra-health-icon"
                      style={{
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#10B981",
                      }}
                    >
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748B",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#10B981",
                            boxShadow: "0 0 6px #10B981",
                          }}
                        />
                        <span>
                          {lang === "en"
                            ? "SSL ENCRYPTION"
                            : "شهادة الأمان SSL"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "12.5px",
                          fontWeight: "800",
                          color: "#10B981",
                        }}
                      >
                        {lang === "en"
                          ? "TLS 1.3 Active 🔒"
                          : "مفعلة 🔒 (256-bit)"}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="wc-infra-health-card"
                    whileHover={{ y: -2, scale: 1.01 }}
                  >
                    <div
                      className="wc-infra-health-icon"
                      style={{
                        background: "rgba(129, 140, 248, 0.15)",
                        color: "#818CF8",
                      }}
                    >
                      <Zap size={18} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748B",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#818CF8",
                            boxShadow: "0 0 6px #818CF8",
                          }}
                        />
                        <span>
                          {lang === "en"
                            ? "GLOBAL CDN EDGE"
                            : "شبكة التسريع CDN"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "12.5px",
                          fontWeight: "800",
                          color: "#818CF8",
                        }}
                      >
                        {lang === "en"
                          ? "Cloudflare Anycast"
                          : "Cloudflare عالمي"}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Node 2 Content: Smart AI Domain Matrix Generator */}
              {activeNode === 2 && (
                <div>
                  <h4
                    style={{
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "#FFFFFF",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Sparkles size={18} color="#6366F1" />
                    <span>
                      {lang === "en"
                        ? "Smart AI Domain Matrix Generator"
                        : "مولد مصفوفة الدومينات الذكية"}
                    </span>
                  </h4>
                  <p
                    style={{
                      color: "#94A3B8",
                      fontSize: "12px",
                      lineHeight: "1.6",
                      marginBottom: "18px",
                    }}
                  >
                    {lang === "en"
                      ? `Generate domain combinations for brand (${state?.brandName || "Select brand in identity step"}) in niche (${state?.niche || "General"}).`
                      : `استخرج نماذج استراتيجية للدومينات بناءً على اسم البراند (${state?.brandName || "حدد براند في خطوات الهوية"}) ومجالك (${state?.niche || "عام"}).`}
                  </p>

                  <div
                    style={{
                      maxWidth: "480px",
                      width: "100%",
                      marginBottom: "16px",
                    }}
                  >
                    <AnalysisModeSelector
                      mode={analysisMode}
                      onChange={setAnalysisMode}
                      lang={lang}
                      accentColor="#6366F1"
                    />
                  </div>

                  <button
                    onClick={generateDomainIdeas}
                    disabled={isGeneratingDomain || !state?.brandName}
                    className="wc-btn wc-btn-primary"
                    style={{ width: "100%", maxWidth: "320px" }}
                  >
                    {isGeneratingDomain ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <span className="td-spinner" />{" "}
                        {lang === "en"
                          ? "Analyzing Domain Matrix..."
                          : "جاري تحليل مصفوفة الدومينات..."}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <Cpu size={16} />{" "}
                        {lang === "en"
                          ? "Generate Domain Suggestions"
                          : "توليد اقتراحات الدومينات"}
                      </span>
                    )}
                  </button>

                  {/* Render Generated Matrix Cards */}
                  {domainMatrix && !domainMatrix.error && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        marginTop: "20px",
                      }}
                    >
                      {domainMatrix.classic && (
                        <div>
                          <div className="wc-domain-group-title">
                            <Sparkles size={15} color="#6366F1" />
                            <span>
                              {lang === "en"
                                ? domainMatrix.classic.title_en
                                : domainMatrix.classic.title_ar}
                            </span>
                          </div>
                          <div className="wc-domain-grid">
                            {(Array.isArray(domainMatrix.classic.domains)
                              ? domainMatrix.classic.domains
                              : [
                                  {
                                    domain: `${cleanBrand(state.brandName)}.com`,
                                    desc: "Official Standard",
                                  },
                                  {
                                    domain: `get${cleanBrand(state.brandName)}.com`,
                                    desc: "Action Standard",
                                  },
                                ]
                            ).map((item) =>
                              renderDomainCard(item.domain, item.desc),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Node 3 Content: DNS Table */}
              {activeNode === 3 && (
                <div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "#FFFFFF",
                      marginBottom: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Code size={16} color="#818CF8" />
                    <span>
                      {lang === "en"
                        ? "DNS Records Configuration Matrix"
                        : "جدول ربط إعدادات الـ DNS للدومين المخصص"}
                    </span>
                  </h4>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "12px",
                        textAlign: isRtl ? "right" : "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--wc-border)",
                            color: "#64748B",
                            fontSize: "11px",
                          }}
                        >
                          <th style={{ padding: "10px 12px" }}>TYPE</th>
                          <th style={{ padding: "10px 12px" }}>HOST / NAME</th>
                          <th style={{ padding: "10px 12px" }}>TARGET VALUE</th>
                          <th style={{ padding: "10px 12px" }}>TTL</th>
                          <th style={{ padding: "10px 12px" }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            color: "#FFFFFF",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px",
                              fontFamily: "monospace",
                              fontWeight: "bold",
                              color: "#818CF8",
                            }}
                          >
                            A Record
                          </td>
                          <td
                            style={{ padding: "12px", fontFamily: "monospace" }}
                          >
                            @
                          </td>
                          <td
                            style={{ padding: "12px", fontFamily: "monospace" }}
                          >
                            185.199.108.153
                          </td>
                          <td style={{ padding: "12px", color: "#94A3B8" }}>
                            3600 (Automatic)
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button
                              className="wc-domain-copy-btn"
                              onClick={() =>
                                safeCopyToClipboard(
                                  "185.199.108.153",
                                  "IP copied!",
                                  "تم نسخ IP!",
                                )
                              }
                            >
                              <Copy size={11} />{" "}
                              <span>
                                {lang === "en" ? "Copy IP" : "نسخ IP"}
                              </span>
                            </button>
                          </td>
                        </tr>
                        <tr style={{ color: "#FFFFFF" }}>
                          <td
                            style={{
                              padding: "12px",
                              fontFamily: "monospace",
                              fontWeight: "bold",
                              color: "#818CF8",
                            }}
                          >
                            CNAME
                          </td>
                          <td
                            style={{ padding: "12px", fontFamily: "monospace" }}
                          >
                            www
                          </td>
                          <td
                            style={{ padding: "12px", fontFamily: "monospace" }}
                          >
                            {cleanBrand(state.brandName)}.creatify.store
                          </td>
                          <td style={{ padding: "12px", color: "#94A3B8" }}>
                            3600 (Automatic)
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button
                              className="wc-domain-copy-btn"
                              onClick={() =>
                                safeCopyToClipboard(
                                  `${cleanBrand(state.brandName)}.creatify.store`,
                                  "CNAME copied!",
                                  "تم نسخ CNAME!",
                                )
                              }
                            >
                              <Copy size={11} />{" "}
                              <span>
                                {lang === "en" ? "Copy CNAME" : "نسخ CNAME"}
                              </span>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Node 4 Content: Setup Confirmation */}
              {activeNode === 4 && (
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginTop: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "rgba(99, 102, 241, 0.15)",
                      color: "#818CF8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CheckSquare size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <h4
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "14px",
                        color: "#FFFFFF",
                        fontWeight: 800,
                      }}
                    >
                      {lang === "en"
                        ? "Website Setup Confirmation"
                        : "تأكيد جاهزية إعدادات الموقع"}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#94A3B8",
                        lineHeight: 1.5,
                      }}
                    >
                      {lang === "en"
                        ? "Confirm that you have generated your landing page code and reviewed store parameters."
                        : "قم بالتأكيد بعد معاينة الكود وضبط إعدادات الدومين لبدء تشغيل متجرك."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      dispatch({
                        type: "COMPLETE_STEP",
                        payload: "website-construction",
                      });
                      toast(
                        lang === "en"
                          ?"Website setup step confirmed as completed!"
                          :"تم تأكيد إكمال خطوة بناء وتجهيز الموقع بنجاح!",
                        "success",
                      );
                    }}
                    className="wc-btn wc-btn-primary"
                    style={{ padding: "10px 24px" }}
                  >
                    {state?.completedSteps?.includes("website-construction")
                      ? lang === "en"
                        ? "Setup Confirmed ✅"
                        : "تم التأكيد ✅"
                      : lang === "en"
                        ? "Confirm Completion"
                        : "تأكيد الإنجاز"}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  
  // eslint-disable-next-line react-hooks/refs
  if (isLoadingCache || !hydratedRef.current) {
    return (
      <ToolDashboardLayout
        id="website-construction"
        title={
        lang === "en"
          ? "Website Construction & Setup Studio"
          : "منصة بناء وتجهيز الموقع المتكاملة"
      }
        subtitle={lang === 'en' ? 'Loading saved workspace...' : 'جاري تحميل مساحة العمل...'}
        stepNumber={stepNumber}
        accentColor="#6366F1"
      >
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ height: "400px", background: "rgba(255,255,255,0.02)", borderRadius: "20px", animation: "pulse 1.5s infinite" }}></div>
        </div>
      </ToolDashboardLayout>
    );
  }

  return (
    <ToolDashboardLayout
      id="website-construction"
      title={
        lang === "en"
          ? "Website Construction & Setup Studio"
          : "منصة بناء وتجهيز الموقع المتكاملة"
      }
      subtitle={
        lang === "en"
          ? "Generate custom Tailwind CSS code, configure payment gateways, and setup domain infrastructure."
          : "مولد كود مواقع احترافي بـ Tailwind CSS، ضبط بوابات الدفع، وتجهيز البنية التحتية للدومين."
      }
      stepNumber={stepNumber}
      accentColor="#6366F1"
      timeEstimate="30 - 60"
    >
      <div className="wc-container" dir={isRtl ? "rtl" : "ltr"}>
        {/* 2030 Floating Pill Tab Bar Navigation */}
        <div className="wc-wizard-header-2030">
          <button
            type="button"
            className={`wc-wizard-tab-2030 ${currentStep === 1 ? "active" : ""}`}
            onClick={() => changeStep(1)}
          >
            {currentStep === 1 && (
              <motion.div
                layoutId="websiteStepPillHighlight"
                className="wc-wizard-tab-bg-2030"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="wc-tab-badge" style={{ zIndex: 1 }}>
              01
            </span>
            <Wand2 size={15} style={{ zIndex: 1 }} />
            <span style={{ zIndex: 1 }}>
              {lang === "en" ? "Design & Code" : "التصميم والكود"}
            </span>
          </button>

          <button
            type="button"
            className={`wc-wizard-tab-2030 ${currentStep === 2 ? "active" : ""}`}
            onClick={() => changeStep(2)}
          >
            {currentStep === 2 && (
              <motion.div
                layoutId="websiteStepPillHighlight"
                className="wc-wizard-tab-bg-2030"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="wc-tab-badge" style={{ zIndex: 1 }}>
              02
            </span>
            <SlidersHorizontal size={15} style={{ zIndex: 1 }} />
            <span style={{ zIndex: 1 }}>
              {lang === "en" ? "Core Configurations" : "الإعدادات العامة"}
            </span>
          </button>

          <button
            type="button"
            className={`wc-wizard-tab-2030 ${currentStep === 3 ? "active" : ""}`}
            onClick={() => changeStep(3)}
          >
            {currentStep === 3 && (
              <motion.div
                layoutId="websiteStepPillHighlight"
                className="wc-wizard-tab-bg-2030"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="wc-tab-badge" style={{ zIndex: 1 }}>
              03
            </span>
            <Server size={15} style={{ zIndex: 1 }} />
            <span style={{ zIndex: 1 }}>
              {lang === "en" ? "Domain Infrastructure" : "البنية التحتية"}
            </span>
          </button>
        </div>

        {/* Step View Panel */}
        <div className="wc-panel-2030">
          <AnimatePresence mode="wait">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </AnimatePresence>

          {/* Bottom Step Wizard Navigation */}
          <div className="wc-controls">
            <button
              onClick={() => changeStep(Math.max(1, currentStep - 1))}
              className="wc-btn wc-btn-secondary"
              style={{ visibility: currentStep === 1 ? "hidden" : "visible" }}
            >
              {isRtl ? <ArrowRight size={15} /> : <ArrowLeft size={15} />}
              <span>{lang === "en" ? "Previous Step" : "الخطوة السابقة"}</span>
            </button>
            {currentStep < 3 && (
              <button
                onClick={() => changeStep(Math.min(3, currentStep + 1))}
                className="wc-btn wc-btn-primary"
              >
                <span>{lang === "en" ? "Next Step" : "الخطوة التالية"}</span>
                {isRtl ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </ToolDashboardLayout>
  );
}
