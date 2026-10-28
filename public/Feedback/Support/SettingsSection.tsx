import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppState, CURRENT_RATES, CURRENCY_SYMBOLS, AffiliateLevel, AffiliateLevelFeature } from "../../context/StateContext";
import { useAuth, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_PARTNER_PERMISSIONS } from "../../context/AuthContext";
import { db, firestore, isFirebaseMocked } from "../../config/firebase";
import { LevelIcon } from "../../components/LevelIcon";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Settings,
  User,
  ChevronDown,
  Check,
  Upload,
  Globe,
  Save,
  RefreshCw,
  Lock,
  Moon,
  Sun,
  Trash2,
  Plus,
  CreditCard,
  Eye,
  EyeOff,
  Edit,
  X,
  Search,
  Building2,
  PhoneCall,
  DollarSign,
  Wallet,
  Copy,
  TrendingUp,
  Percent,
} from "lucide-react";
import { toast } from "sonner";


const PERMISSIONS_LIST = [
  { key: "all:access", labelAr: "صلاحيات كاملة للمسؤول (all:access)", labelEn: "Full Administrator Access (all:access)" },
  
  { key: "show:sales", labelAr: "عرض المبيعات والتحليلات (show:sales)", labelEn: "Show Sales & Analytics (show:sales)" },
  { key: "add:sales", labelAr: "إضافة المبيعات (add:sales)", labelEn: "Add Sales (add:sales)" },
  { key: "edit:sales", labelAr: "تعديل المبيعات (edit:sales)", labelEn: "Edit Sales (edit:sales)" },
  { key: "delete:sales", labelAr: "حذف المبيعات (delete:sales)", labelEn: "Delete Sales (delete:sales)" },
  
  { key: "show:calendar", labelAr: "عرض الحجوزات والمواعيد (show:calendar)", labelEn: "Show Calendar & Bookings (show:calendar)" },
  { key: "add:calendar", labelAr: "إضافة الحجوزات والمواعيد (add:calendar)", labelEn: "Add Calendar Slots (add:calendar)" },
  { key: "edit:calendar", labelAr: "تعديل الحجوزات والمواعيد (edit:calendar)", labelEn: "Edit Calendar Settings (edit:calendar)" },
  { key: "delete:calendar", labelAr: "حذف الحجوزات والمواعيد (delete:calendar)", labelEn: "Delete Bookings (delete:calendar)" },
  
  { key: "show:crm", labelAr: "عرض لوحة العملاء CRM (show:crm)", labelEn: "Show CRM Leads (show:crm)" },
  { key: "add:crm", labelAr: "إضافة عميل للـ CRM (add:crm)", labelEn: "Add CRM Lead (add:crm)" },
  { key: "edit:crm", labelAr: "تعديل عملاء الـ CRM (edit:crm)", labelEn: "Edit CRM Lead (edit:crm)" },
  { key: "delete:crm", labelAr: "حذف عملاء الـ CRM (delete:crm)", labelEn: "Delete CRM Lead (delete:crm)" },

  { key: "show:partners", labelAr: "عرض الشركاء ولوحة الصدارة (show:partners)", labelEn: "Show Partners & Leaderboard (show:partners)" },
  { key: "add:partners", labelAr: "إضافة شركاء (add:partners)", labelEn: "Add Partner Profile (add:partners)" },
  { key: "edit:partners", labelAr: "تعديل الشركاء (edit:partners)", labelEn: "Edit Partner Profile (edit:partners)" },
  { key: "delete:partners", labelAr: "حذف الشركاء (delete:partners)", labelEn: "Delete Partner Profile (delete:partners)" },
  
  { key: "show:academy", labelAr: "عرض أكاديمية التدريب (show:academy)", labelEn: "Show Academy (show:academy)" },
  { key: "add:academy", labelAr: "إضافة محتوى للأكاديمية (add:academy)", labelEn: "Add Academy Content (add:academy)" },
  { key: "edit:academy", labelAr: "تعديل محتوى الأكاديمية (edit:academy)", labelEn: "Edit Academy Content (edit:academy)" },
  { key: "delete:academy", labelAr: "حذف محتوى الأكاديمية (delete:academy)", labelEn: "Delete Academy Content (delete:academy)" },

  { key: "show:users", labelAr: "عرض المستخدمين (show:users)", labelEn: "Show Users (show:users)" },
  { key: "add:users", labelAr: "إضافة مستخدم (add:users)", labelEn: "Add User (add:users)" },
  { key: "edit:users", labelAr: "تعديل مستخدم (edit:users)", labelEn: "Edit User (edit:users)" },
  { key: "delete:users", labelAr: "حذف مستخدم (delete:users)", labelEn: "Delete User (delete:users)" },

  // Booking
  { key: "show:booking", labelAr: "عرض الحجوزات والمكالمات (show:booking)", labelEn: "Show Booking & Calls (show:booking)" },
  { key: "add:booking", labelAr: "إضافة حجز (add:booking)", labelEn: "Add Booking (add:booking)" },
  { key: "edit:booking", labelAr: "تعديل حالة الحجز (edit:booking)", labelEn: "Edit Booking (edit:booking)" },
  { key: "delete:booking", labelAr: "حذف حجز (delete:booking)", labelEn: "Delete Booking (delete:booking)" },

  // Finance / Transactions
  { key: "show:transactions", labelAr: "عرض المعاملات المالية (show:transactions)", labelEn: "Show Transactions (show:transactions)" },
  { key: "add:transactions", labelAr: "إضافة معاملة مالية (add:transactions)", labelEn: "Add Transaction (add:transactions)" },
  { key: "edit:transactions", labelAr: "تعديل معاملة مالية (edit:transactions)", labelEn: "Edit Transaction (edit:transactions)" },
  { key: "delete:transactions", labelAr: "حذف معاملة مالية (delete:transactions)", labelEn: "Delete Transaction (delete:transactions)" },

  // Packages
  { key: "show:packages", labelAr: "عرض الباقات (show:packages)", labelEn: "Show Packages (show:packages)" },
  { key: "add:packages", labelAr: "إضافة باقة (add:packages)", labelEn: "Add Package (add:packages)" },
  { key: "edit:packages", labelAr: "تعديل باقة (edit:packages)", labelEn: "Edit Package (edit:packages)" },
  { key: "delete:packages", labelAr: "حذف باقة (delete:packages)", labelEn: "Delete Package (delete:packages)" },

  // Scripts
  { key: "show:scripts", labelAr: "عرض النصوص البرمجية/السكربتات (show:scripts)", labelEn: "Show Scripts (show:scripts)" },
  { key: "add:scripts", labelAr: "إضافة نص برمجى/سكربت (add:scripts)", labelEn: "Add Script (add:scripts)" },
  { key: "edit:scripts", labelAr: "تعديل نص برمجى/سكربت (edit:scripts)", labelEn: "Edit Script (edit:scripts)" },
  { key: "delete:scripts", labelAr: "حذف نص برمجى/سكربت (delete:scripts)", labelEn: "Delete Script (delete:scripts)" },

  // Support
  { key: "show:support", labelAr: "عرض الدعم الفني (show:support)", labelEn: "Show Support (show:support)" },

  // Settings
  { key: "edit:settings", labelAr: "تعديل الإعدادات (edit:settings)", labelEn: "Edit Settings (edit:settings)" },
];

const currencyOptions = [
  { code: "USD", symbol: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar" },
  { code: "SAR", symbol: "ر.س", nameAr: "ريال سعودي", nameEn: "Saudi Riyal" },
  { code: "AED", symbol: "د.إ", nameAr: "درهم إماراتي", nameEn: "UAE Dirham" },
  { code: "EGP", symbol: "ج.م", nameAr: "جنيه مصري", nameEn: "Egyptian Pound" },
  { code: "KWD", symbol: "د.ك", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar" },
  { code: "QAR", symbol: "ر.ق", nameAr: "ريال قطري", nameEn: "Qatari Riyal" },
  { code: "EUR", symbol: "€", nameAr: "يورو", nameEn: "Euro" },
  { code: "GBP", symbol: "£", nameAr: "جنيه إسترليني", nameEn: "British Pound" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 12 } },
} as const;

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 14 } },
} as const;

// Custom Select Component
interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  label,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const isRtl = document.documentElement.dir === "rtl";

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const showUpward = spaceBelow < 210 && rect.top > 210;
      setCoords({
        top: showUpward ? rect.top - 206 : rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleToggle = () => {
    updateCoords();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
      >
        <span>{selectedOption?.label || "اختر"}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && createPortal(
        <>
          {/* Transparent click-away overlay backdrop */}
          <div 
            className="fixed inset-0 z-[99998] bg-transparent cursor-default" 
            onClick={() => setIsOpen(false)} 
          />
          <div
            className="fixed z-[99999] mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-y-auto py-1"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: "200px",
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-right hover:bg-slate-50 dark:hover:bg-slate-900 transition ${
                  opt.value === value
                    ? "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-bold"
                    : "text-slate-700 dark:text-slate-300"
                }`}
                style={{ textAlign: isRtl ? "right" : "left" }}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check className="h-4 w-4 text-purple-500" />}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default function SettingsSection() {
  const { state, updateState, loading } = useAppState();
  const { user, isAdmin, userProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const isRtl = state.settings.language === "ar";
  const t = (ar: string, en: string) => (isRtl ? ar : en);

  const getPermissionInfo = (permKey: string) => {
    const definition = PERMISSIONS_LIST.find((p) => p.key === permKey);
    const label = definition ? (isRtl ? definition.labelAr : definition.labelEn) : permKey;
    
    let colorClasses = "bg-slate-50 text-slate-700 dark:bg-slate-800/40 dark:text-slate-350 border border-slate-205 dark:border-slate-800";
    
    if (permKey === "all:access") {
      colorClasses = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold";
    } else if (permKey.startsWith("show:")) {
      colorClasses = "bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20";
    } else if (permKey.startsWith("add:")) {
      colorClasses = "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20";
    } else if (permKey.startsWith("edit:")) {
      colorClasses = "bg-purple-500/10 text-purple-650 dark:text-purple-400 border border-purple-500/20";
    } else if (permKey.startsWith("delete:")) {
      colorClasses = "bg-rose-500/10 text-rose-650 dark:text-rose-400 border border-rose-500/20";
    }
    
    return { label, colorClasses };
  };

  const getProfessionalPaymentIcon = (name: string) => {
    const lowercaseName = name.toLowerCase();
    
    if (lowercaseName.includes("vodafone") || lowercaseName.includes("فودافون")) {
      return (
        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-650 dark:text-rose-400 font-bold shrink-0">
          <PhoneCall className="w-4 h-4" />
        </div>
      );
    }
    
    if (lowercaseName.includes("stripe") || lowercaseName.includes("سترايب")) {
      return (
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-655 dark:text-indigo-400 font-bold shrink-0">
          <CreditCard className="w-4 h-4" />
        </div>
      );
    }
    
    if (lowercaseName.includes("paypal") || lowercaseName.includes("بايبال")) {
      return (
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
          <DollarSign className="w-4 h-4" />
        </div>
      );
    }
    
    if (lowercaseName.includes("instapay") || lowercaseName.includes("انستاباي") || lowercaseName.includes("bank") || lowercaseName.includes("بنك")) {
      return (
        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-650 dark:text-purple-400 font-bold shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
      );
    }
    
    return (
      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-450 font-bold shrink-0">
        <Wallet className="w-4 h-4" />
      </div>
    );
  };

  const userPermissions = userProfile?.permissions || [];
  const displayPermissions = Array.from(new Set(userPermissions));
  if (isAdmin && !displayPermissions.includes("all:access")) {
    displayPermissions.unshift("all:access");
  }

  // --- Profile state ---
  const [companyName, setCompanyName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [language, setLanguage] = useState("ar");
  const [currency, setCurrency] = useState("USD");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");

  // --- New Partner Profile Fields State ---
  const [businessName, setBusinessName] = useState("");
  const [adAccountName, setAdAccountName] = useState("");
  const [businessManagerId, setBusinessManagerId] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [country, setCountry] = useState("");
  const [testimonials, setTestimonials] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentDetails, setPaymentDetails] = useState("");

  // --- Password change state ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Payment methods logic moved to PaymentMethodsSection.tsx

  // --- Default Permissions State ---
  const [defaultAdminPerms, setDefaultAdminPerms] = useState<string[]>([]);
  const [defaultPartnerPerms, setDefaultPartnerPerms] = useState<string[]>([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permSearch, setPermSearch] = useState("");
  const [activePermRole, setActivePermRole] = useState<"admin" | "partner">("partner");

  const [globalLoading, setGlobalLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitializedRef = useRef(false);
  const isProfileInitializedRef = useRef(false);
  
  const [adminSettings, setAdminSettings] = useState<any>(null);

  useEffect(() => {
    if (user) {
      const fetchGlobalBusinessSettings = async () => {
        try {
          const docSnap = await firestore.getDoc(firestore.doc(db, "settings", "global_business"));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (isAdmin) {
              if (data.companyName) setCompanyName(data.companyName);
              if (data.businessName) setBusinessName(data.businessName);
              if (data.businessManagerId) setBusinessManagerId(data.businessManagerId);
              if (data.country) setCountry(data.country);
            } else {
              setAdminSettings(data);
            }
          }
        } catch (err) {
          console.error("Failed to fetch global business settings", err);
        }
      };
      fetchGlobalBusinessSettings();
    }
  }, [user, isAdmin]);

  // Initialize inputs ONLY once, and only after Firestore has finished loading settings.
  useEffect(() => {
    if (!loading && state?.settings && !isInitializedRef.current) {
      setCompanyName(state.settings.companyName || "");
      setProfileName(state.settings.profileName || "");
      setProfileRole(state.settings.profileRole || "");
      setLanguage(state.settings.language || "ar");
      setCurrency(state.settings.currency || "USD");
      setAvatarDataUrl(state.settings.avatarDataUrl || "");
      isInitializedRef.current = true;
    }
  }, [loading, state?.settings]);

  // Initialize partner profile fields ONLY once when userProfile loads to prevent input resets
  useEffect(() => {
    if (userProfile && !isProfileInitializedRef.current) {
      setBusinessName(userProfile.businessName || "");
      setAdAccountName(userProfile.adAccountName || "");
      setBusinessManagerId(userProfile.businessManagerId || "");
      setPixelId(userProfile.pixelId || "");
      setWhatsappNumber(userProfile.whatsappNumber || "");
      setCountry(userProfile.country || "");
      setTestimonials(userProfile.testimonials || "");
      setPaymentMethod(userProfile.paymentMethod || "Bank Transfer");
      setPaymentDetails(userProfile.paymentDetails || "");
      isProfileInitializedRef.current = true;
    }
  }, [userProfile]);

  // Sync theme to local/global state when toggled
  const handleThemeChange = async (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    try {
      await updateState((draft) => {
        draft.settings.theme = newTheme;
      });
    } catch (err) {
      console.error("Failed to sync theme:", err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      const loadDefaultPerms = async () => {
        try {
          const docSnap = await firestore.getDoc(firestore.doc(db, "settings", "default_permissions"));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDefaultAdminPerms(data.admin || []);
            setDefaultPartnerPerms(data.user || []);
          } else {
            setDefaultAdminPerms(DEFAULT_ADMIN_PERMISSIONS);
            setDefaultPartnerPerms(DEFAULT_PARTNER_PERMISSIONS);
          }
        } catch (e) {
          console.error("Failed to load default permissions settings:", e);
        }
      };
      loadDefaultPerms();
    }
  }, [isAdmin]);

  const handleSaveDefaultPerms = async () => {
    setPermsLoading(true);
    try {
      const docRef = firestore.doc(db, "settings", "default_permissions");
      await firestore.setDoc(docRef, {
        admin: defaultAdminPerms,
        user: defaultPartnerPerms,
      });
      toast.success(t("تم حفظ الصلاحيات الافتراضية بنجاح", "Default permissions saved successfully"));
    } catch (e) {
      console.error("Failed to save default permissions:", e);
      toast.error(t("حدث خطأ أثناء حفظ الصلاحيات", "Failed to save default permissions"));
    } finally {
      setPermsLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error(t("حجم الصورة يجب أن يكون أقل من 1 ميجابايت", "Image size must be less than 1MB"));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarDataUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveSettings = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setGlobalLoading(true);
    try {
      await updateState((draft) => {
        draft.settings.companyName = companyName;
        draft.settings.profileName = profileName;
        draft.settings.profileRole = profileRole;
        draft.settings.language = language as "ar" | "en";
        draft.settings.currency = currency;
        draft.settings.avatarDataUrl = avatarDataUrl;

        if (isAdmin) {
          draft.settings.businessName = businessName.trim();
          draft.settings.businessManagerId = businessManagerId.trim();
          draft.settings.country = country.trim();
        }
      });

      if (user?.uid) {
        const userRef = firestore.doc(db, "users", user.uid);
        const userDataToSave: any = {
          name: profileName,
        };

        if (!isAdmin) {
          userDataToSave.whatsappNumber = whatsappNumber.trim();
          userDataToSave.adAccountName = adAccountName.trim();
          userDataToSave.pixelId = pixelId.trim();
          userDataToSave.paymentMethod = paymentMethod.trim();
          userDataToSave.paymentDetails = paymentDetails.trim();
        } else {
          userDataToSave.businessName = businessName.trim();
          userDataToSave.businessManagerId = businessManagerId.trim();
          userDataToSave.country = country.trim();
          
          // Save global admin settings to a globally accessible document for partners
          const globalRef = firestore.doc(db, "settings", "global_business");
          await firestore.setDoc(globalRef, {
            companyName: companyName.trim(),
            businessName: businessName.trim(),
            businessManagerId: businessManagerId.trim(),
            country: country.trim()
          }, { merge: true });
        }

        await firestore.setDoc(userRef, userDataToSave, { merge: true });
      }

      toast.success(t("تم حفظ ملف الشريك وتحديث البيانات بنجاح", "Profile & Partner Details saved successfully"));
    } catch (err) {
      console.error("Save settings error:", err);
      toast.error(t("حدث خطأ أثناء حفظ الإعدادات", "An error occurred while saving settings"));
    } finally {
      setGlobalLoading(false);
    }
  };

  // Password update action
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error(t("يرجى ملء حقول كلمة المرور الجديدة", "Please fill in new password fields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("كلمتا المرور غير متطابقتين", "Passwords do not match"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("يجب أن تكون كلمة المرور 6 أحرف على الأقل", "Password must be at least 6 characters"));
      return;
    }

    setGlobalLoading(true);
    try {
      if (isFirebaseMocked) {
        await new Promise((r) => setTimeout(r, 600));
        toast.success(t("تم تحديث كلمة المرور بنجاح (بيئة تجريبية)", "Password updated successfully (Mock DB)"));
      } else {
        const { getAuth, updatePassword } = await import("firebase/auth");
        const authInstance = getAuth();
        if (authInstance.currentUser) {
          await updatePassword(authInstance.currentUser, newPassword);
          toast.success(t("تم تحديث كلمة المرور بنجاح", "Password updated successfully"));
        } else {
          throw new Error("No authenticated user");
        }
      }
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password update error:", err);
      if (err.code === "auth/requires-recent-login") {
        toast.error(t("يرجى تسجيل الخروج وإعادة الدخول لتحديث كلمة المرور", "Please log out and log in again to update your password"));
      } else {
        toast.error(t("فشل التحديث: " + err.message, "Update failed: " + err.message));
      }
    } finally {
      setGlobalLoading(false);
    }
  };

  // Payment methods handlers moved to PaymentMethodsSection.tsx

  const currencySelectOptions = currencyOptions.map((c) => ({
    value: c.code,
    label: `${c.code} - ${isRtl ? c.nameAr : c.nameEn}`,
  }));


  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12 font-sans"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-6"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-purple-500" />
            <span>{t("الإعدادات", "Settings")}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("تخصيص ملفك الشخصي، المظهر، وكلمة المرور وطرق الدفع", "Customize your profile, appearance, password and payment methods")}
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition"
        >
          <Save className="h-4 w-4" />
          <span>{t("حفظ الإعدادات الأساسية", "Save Basic Settings")}</span>
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Profile Card */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-sm"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-4 mb-4">
            <User className="h-4.5 w-4.5 text-purple-500" />
            <span>{t("الملف الشخصي والتفضيلات", "Profile & Preferences")}</span>
          </h3>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
                    style={
                      avatarDataUrl
                        ? {
                            backgroundImage: `url(${avatarDataUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {}
                    }
                  >
                    {!avatarDataUrl && (
                      <span className="text-3xl font-bold text-white">
                        {profileName?.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition"
                    title={t("تغيير الصورة", "Change avatar")}
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                {avatarDataUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs text-red-500 hover:text-red-600 transition"
                  >
                    {t("إزالة", "Remove")}
                  </button>
                )}
              </div>

              {/* Name & Role Fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t("الاسم", "Name")}
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t("المسمى الوظيفي", "Role")}
                  </label>
                  <input
                    type="text"
                    value={profileRole}
                    onChange={(e) => setProfileRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t("اسم الشركة", "Company")}
                  </label>
                  <input
                    type="text"
                    value={!isAdmin ? (adminSettings?.companyName || "") : companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!isAdmin}
                    readOnly={!isAdmin}
                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
            </div>

            {/* NEW PARTNER BUSINESS & ADS PROFILE FIELDS */}
            <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  {t("بيانات البزنس والإعلانات واستلام العمولات", "Business, Ad Account & Payment Details")}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t("اسم البزنس (Business Name)", "Business Name")}
                  </label>
                  <input
                    type="text"
                    value={!isAdmin ? (adminSettings?.businessName || "") : businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={!isAdmin}
                    readOnly={!isAdmin}
                    placeholder={t("اسم مشروعك أو وكالتك...", "Your business / agency name...")}
                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t("معرف بيزنس مانجر Meta (BM ID)", "Business Manager ID")}
                  </label>
                  <input
                    type="text"
                    value={!isAdmin ? (adminSettings?.businessManagerId || "") : businessManagerId}
                    onChange={(e) => setBusinessManagerId(e.target.value)}
                    disabled={!isAdmin}
                    readOnly={!isAdmin}
                    placeholder="مثال: 123456789012345"
                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t("الدولة (Country)", "Country")}
                  </label>
                  <input
                    type="text"
                    value={!isAdmin ? (adminSettings?.country || "") : country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={!isAdmin}
                    readOnly={!isAdmin}
                    placeholder={t("المملكة العربية السعودية / مصر / الإمارات...", "Saudi Arabia, Egypt, UAE...")}
                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>

                {!isAdmin && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {t("رقم الواتساب (WhatsApp)", "WhatsApp Number")}
                      </label>
                      <input
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+966 50 123 4567"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {t("اسم الحساب الإعلاني (Ad Account Name)", "Ad Account Name")}
                      </label>
                      <input
                        type="text"
                        value={adAccountName}
                        onChange={(e) => setAdAccountName(e.target.value)}
                        placeholder={t("اسم حساب الإعلانات على Meta/TikTok...", "Meta / TikTok Ad Account Name...")}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {t("معرف البيكسل (Pixel ID)", "Meta / TikTok Pixel ID")}
                      </label>
                      <input
                        type="text"
                        value={pixelId}
                        onChange={(e) => setPixelId(e.target.value)}
                        placeholder="مثال: 987654321098765"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Available Payment Method Details (Only for Users/Partners) */}
                    <div className="sm:col-span-2 space-y-4 p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 mt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {t("وسيلة استلام الأرباح (Payment Method)", "Payment Method Name")}
                        </label>
                        <input
                          type="text"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          placeholder={t("مثال: فودافون كاش، انستاباي، تحويل بنكي...", "e.g. Vodafone Cash, InstaPay...")}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {t("بيانات التحويل (رقم الحساب أو الهاتف)", "Payment Details (Account/Phone)")}
                        </label>
                        <input
                          type="text"
                          value={paymentDetails}
                          onChange={(e) => setPaymentDetails(e.target.value)}
                          placeholder={t("أدخل رقم الحساب أو الإيبان أو رقم الهاتف...", "Enter account number or phone...")}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Language and Currency Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200/60 dark:border-slate-800/80 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("اللغة", "Language")}
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setLanguage("ar")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      language === "ar"
                        ? "bg-white dark:bg-slate-950 text-purple-600 dark:text-purple-400 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      language === "en"
                        ? "bg-white dark:bg-slate-950 text-purple-600 dark:text-purple-400 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <CustomSelect
                  label={t("العملة", "Currency")}
                  value={currency}
                  onChange={setCurrency}
                  options={currencySelectOptions}
                  className="w-full"
                />
              </div>
            </div>

            {/* Appearance settings */}
            <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-4 space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("المظهر", "Appearance")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleThemeChange("light")}
                  className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl border transition ${
                    theme === "light"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  <span>{t("فاتح", "Light")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange("dark")}
                  className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl border transition ${
                    theme === "dark"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  <span>{t("داكن", "Dark")}</span>
                </button>
              </div>
            </div>

            {/* User Permissions display */}
            <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-4 space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("صلاحيات حسابك الحالية", "Your Current Account Permissions")}
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {displayPermissions.length > 0 ? (
                  displayPermissions.map((permKey) => {
                    const info = getPermissionInfo(permKey);
                    return (
                      <span
                        key={permKey}
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs transition-colors duration-200 ${info.colorClasses}`}
                      >
                        {info.label}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-550 italic">
                    {t("لا توجد صلاحيات مخصصة مفعلة حالياً", "No custom permissions assigned currently")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Change Password Card */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-sm"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-4 mb-4">
            <Lock className="h-4.5 w-4.5 text-purple-500" />
            <span>{t("تغيير كلمة المرور", "Change Password")}</span>
          </h3>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("كلمة المرور الجديدة", "New Password")}
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className={`absolute ${isRtl ? "left-3" : "right-3"} bottom-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white`}
                >
                  {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("تأكيد كلمة المرور", "Confirm Password")}
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-850 dark:hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition mt-2"
            >
              <span>{t("تحديث كلمة المرور", "Update Password")}</span>
            </button>
          </form>
        </motion.div>

        {isAdmin && (
          <motion.div
            variants={cardVariants}
            className="lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-sm"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-4 mb-4">
              <Settings className="h-4.5 w-4.5 text-purple-500" />
              <span>{t("الصلاحيات الافتراضية للأدوار", "Default Role Permissions Configuration")}</span>
            </h3>

            {/* Role Tabs */}
            <div className="flex gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl max-w-xs">
              <button
                type="button"
                onClick={() => setActivePermRole("partner")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activePermRole === "partner"
                    ? "bg-white dark:bg-slate-900 text-purple-650 dark:text-purple-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {t("شريك", "Partner")}
              </button>
              <button
                type="button"
                onClick={() => setActivePermRole("admin")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activePermRole === "admin"
                    ? "bg-white dark:bg-slate-900 text-red-500 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {t("مسؤول", "Admin")}
              </button>
            </div>

            {(() => {
              const targetPerms = activePermRole === "admin" ? defaultAdminPerms : defaultPartnerPerms;
              const setTargetPerms = activePermRole === "admin" ? setDefaultAdminPerms : setDefaultPartnerPerms;
              const isAllSelected = PERMISSIONS_LIST.every(p => targetPerms.includes(p.key));

              return (
                <>
                  {/* Search Box and Select All */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        placeholder={t("البحث في الصلاحيات...", "Search permissions...")}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                      />
                      <Search className={`absolute top-3.5 h-4 w-4 text-slate-400 ${isRtl ? "right-3.5" : "left-3.5"}`} />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-900 text-xs text-slate-700 dark:text-slate-350 shrink-0">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTargetPerms(PERMISSIONS_LIST.map(p => p.key));
                          } else {
                            setTargetPerms([]);
                          }
                        }}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="font-bold">{t("تحديد الكل", "Select All")}</span>
                    </label>
                  </div>

                  {/* Permissions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 pr-1">
                    {(() => {
                      const filtered = PERMISSIONS_LIST.filter(p =>
                        p.key.toLowerCase().includes(permSearch.toLowerCase()) ||
                        t(p.labelAr, p.labelEn).toLowerCase().includes(permSearch.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="col-span-full text-center py-6 text-xs text-slate-400">
                            {t("لا توجد صلاحيات مطابقة", "No matching permissions found.")}
                          </div>
                        );
                      }
                      
                      return filtered.map((p) => {
                  const isChecked = targetPerms.includes(p.key);
                  return (
                    <label
                      key={`def-perm-${activePermRole}-${p.key}`}
                      className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-lg transition text-xs text-slate-700 dark:text-slate-350"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setTargetPerms(targetPerms.filter(k => k !== p.key));
                          } else {
                             setTargetPerms([...targetPerms, p.key]);
                          }
                        }}
                        className={`rounded border-slate-300 h-4 w-4 cursor-pointer focus:ring-2 ${
                          activePermRole === "admin"
                            ? "text-red-550 focus:ring-red-500"
                            : "text-purple-650 focus:ring-purple-500"
                        }`}
                      />
                      <span>{t(p.labelAr, p.labelEn)}</span>
                    </label>
                  );
                });
              })()}
            </div>
          </>
        );
      })()}

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/55">
              <button
                type="button"
                onClick={handleSaveDefaultPerms}
                disabled={permsLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/25 transition disabled:opacity-55"
              >
                {permsLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t("جاري الحفظ...", "Saving...")}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{t("حفظ الصلاحيات الافتراضية", "Save Default Permissions")}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Centered Loading Overlay */}
      <AnimatePresence>
        {globalLoading && (
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

    </motion.div>
  );
}

