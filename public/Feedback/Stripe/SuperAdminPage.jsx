import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../firebase";
import { libraryStorage } from "../../firebaseLibrary";
import { JOURNEY_STEPS } from "../../data/database";
import { TOOLS_24H } from "../../data/toolsData";
import SuperAdminLibrary from "./SuperAdminLibrary";
import SuperAdminSettings from "./SuperAdminSettings";
import SuperAdminBranding from "./SuperAdminBranding";
import SuperAdminLandingPages from "./SuperAdminLandingPages";
import SuperAdminEmployees from "./SuperAdminEmployees";
import SuperAdminSales from "./SuperAdminSales";
import PhoneInput from "../../components/PhoneInput";
import { useConfirm } from "../../context/ConfirmContext";
import BrandedLoader from "../../components/common/BrandedLoader";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building,
  Library,
  TrendingUp,
  Layout,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ChevronLeft,
  Search,
  RefreshCw,
  Download,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Globe,
  Mail,
  User,
  Lock,
  ChevronDown,
  Sparkles,
  X,
  Copy,
  Filter,
  ShieldCheck,
  Save,
} from "lucide-react";
import "./SuperAdmin.css";

function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end) || end === 0) {
      setCount(value);
      return;
    }

    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{count}</span>;
}

export default function SuperAdminPage() {
  const { superAdminUserData: userData, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const lang = "ar"; // Assuming Arabic as primary
  const confirm = useConfirm();

  const subLabels = {
    all: "كل الاشتراكات",
    monthly: "شهري",
    lifetime: "مدى الحياة",
    custom: "مخصص",
  };

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [dialect, setDialect] = useState("msa");
  const [brandUrl, setBrandUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneKey, setPhoneKey] = useState("+20");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [brandLogoFile, setBrandLogoFile] = useState(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState(null);
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("sa-active-tab") || "users"
  ); // 'users' | 'library' | 'landing-pages' | 'settings' | 'employees'
  const [viewingUserDetails, setViewingUserDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // 'all' | 'admin' | 'user'

  useEffect(() => {
    localStorage.setItem("sa-active-tab", activeTab);
  }, [activeTab]);

  // Responsive sidebar states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sa-sidebar-collapsed") === "true",
  );
  const [filterSub, setFilterSub] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userFilterRole, setUserFilterRole] = useState("all");
  const [userFilterProgress, setUserFilterProgress] = useState("all");
  const [isUserRoleDropdownOpen, setIsUserRoleDropdownOpen] = useState(false);
  const [isUserProgDropdownOpen, setIsUserProgDropdownOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSub]);

  // Subscription state
  const [subType, setSubType] = useState("monthly"); // 'monthly' | 'lifetime' | 'custom' | 'stopped'
  const [subDays, setSubDays] = useState(30);

  const ALL_STEPS = [...JOURNEY_STEPS, ...TOOLS_24H];
  const TOTAL_STEPS_COUNT = ALL_STEPS.length;
  const totalSteps = TOTAL_STEPS_COUNT || 1;

  // Load brands/users from Firestore
  const loadBrands = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = [];
      snap.forEach((d) => {
        const data = d.data();
        const isMainAdmin = userData?.email === "admin@brand.com";
        if (
          isMainAdmin ||
          data.role !== "superadmin" ||
          d.id === userData.uid
        ) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );
      setBrands(list);
    } catch (err) {
      console.error("Error loading brands:", err);
      toast("خطأ في تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleCreate = async () => {
    if (role === "admin" && !brandName.trim())
      return toast("أدخل اسم البراند", "error");
    if (!ownerName.trim()) return toast("أدخل اسم المالك", "error");
    if (!email.trim()) return toast("أدخل البريد الإلكتروني", "error");
    if (!password.trim() || password.length < 6)
      return toast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error");
    if (role === "admin" && !brandUrl.trim())
      return toast("أدخل رابط الموقع", "error");
    if (!phoneNumber.trim()) return toast("أدخل رقم الهاتف", "error");

    // التحقق من عدم تكرار الرابط (للبراند فقط)
    setCreating(true);
    if (role === "admin") {
      try {
        const qUrl = query(
          collection(db, "users"),
          where("brandUrl", "==", brandUrl.trim()),
        );
        const snapUrl = await getDocs(qUrl);
        if (!snapUrl.empty) {
          setCreating(false);
          return toast("رابط الموقع هذا مسجل بالفعل لبراند آخر", "error");
        }
      } catch (err) {
        console.error("Error checking unique URL:", err);
      }
    }

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

      let brandLogoUrl = "";
      if (brandLogoFile && role === "admin") {
        const logoRef = ref(
          libraryStorage,
          `brands/logos/${Date.now()}_${brandLogoFile.name}`
        );
        await uploadBytes(logoRef, brandLogoFile);
        brandLogoUrl = await getDownloadURL(logoRef);
      }

      const config = {
        apiKey: "AIzaSyCIF4HfPdDqjH6ue2Sc5NIIJwlOq3ytNA0",
        authDomain: "event-upklick.firebaseapp.com",
        projectId: "event-upklick",
      };
      secondaryApp = initializeApp(config, "secondary-" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        password,
      );
      const uid = cred.user.uid;

      let expiryDate = null;
      if (subType === "monthly") {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (subType === "custom") {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(subDays));
      }

      await setDoc(doc(db, "users", uid), {
        email: email.trim().toLowerCase(),
        role,
        dialect: dialect,
        brandName: role === "admin" ? brandName.trim() : "",
        ownerName: ownerName.trim(),
        brandUrl: role === "admin" ? brandUrl.trim() : "",
        brandLogoUrl: role === "admin" ? brandLogoUrl : "",
        phoneNumber: `${phoneKey}${phoneNumber.trim().replace(/^\+/, "")}`,
        photoURL: photoURL || "",
        createdAt: serverTimestamp(),
        createdBy: userData?.uid || "superadmin",
        subscription: {
          type: subType,
          expiryDate: expiryDate ? expiryDate : null,
          status: subType === "stopped" ? "stopped" : "active",
          updatedAt: serverTimestamp(),
        },
      });

      if (role === "admin") {
        await setDoc(
          doc(db, "brands", brandName.trim()),
          {
            name: brandName.trim(),
            adminUid: uid,
            themeConfig: { accent: "#3B82F6", success: "#10B981" },
            logoUrl: brandLogoUrl || null,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      toast(
`تم إنشاء ${role ==="admin" ?"البراند" :"المستخدم"} بنجاح!`,
        "success",
      );
      setBrandName("");
      setOwnerName("");
      setEmail("");
      setPassword("");
      setBrandUrl("");
      setPhoneNumber("");
      setDialect("msa");
      setIsAddModalOpen(false);
      await loadBrands();
      setProfileImage(null);
    } catch (err) {
      console.error("Create error:", err);
      toast("حدث خطأ أثناء الإنشاء", "error");
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
    setBrandName(u.brandName || "");
    setOwnerName(u.ownerName || "");
    setEmail(u.email || "");
    setRole(u.role || "admin");
    setDialect(u.dialect || "msa");
    setBrandUrl(u.brandUrl || "");
    // Refined logic to split key and number
    const fullPhone = u.phoneNumber || "";
    if (fullPhone.startsWith("+")) {
      const match = fullPhone.match(/^(\+\d{1,4})(.*)$/);
      if (match) {
        setPhoneKey(match[1]);
        setPhoneNumber(match[2]);
      } else {
        setPhoneKey("+20");
        setPhoneNumber(fullPhone);
      }
    } else {
      setPhoneKey("+20");
      setPhoneNumber(fullPhone);
    }
    setSubType(u.subscription?.type || "monthly");
    setSubDays(30);
    setBrandLogoPreview(u.brandLogoUrl || null);
    setBrandLogoFile(null);
    setIsAddModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setBrandName("");
    setOwnerName("");
    setEmail("");
    setBrandUrl("");
    setPhoneNumber("");
    setBrandLogoFile(null);
    setBrandLogoPreview(null);
    setIsAddModalOpen(false);
  };

  const handleUpdate = async () => {
    if (role === "admin" && !brandName.trim())
      return toast("أدخل اسم البراند", "error");
    if (!ownerName.trim()) return toast("أدخل اسم المالك", "error");
    if (role === "admin" && !brandUrl.trim())
      return toast("أدخل رابط الموقع", "error");
    if (!phoneNumber.trim()) return toast("أدخل رقم الهاتف", "error");

    setCreating(true);
    if (role === "admin") {
      try {
        // التحقق من عدم تكرار الرابط
        const qUrl = query(
          collection(db, "users"),
          where("brandUrl", "==", brandUrl.trim()),
        );
        const snapUrl = await getDocs(qUrl);
        const duplicate = snapUrl.docs.find((d) => d.id !== editingUser.id);
        if (duplicate) {
          setCreating(false);
          return toast("رابط الموقع هذا مسجل بالفعل لبراند آخر", "error");
        }
      } catch (err) {
        console.error("Error checking unique URL:", err);
      }
    }
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

      let brandLogoUrl = editingUser.brandLogoUrl || "";
      if (brandLogoFile && role === "admin") {
        const logoRef = ref(
          libraryStorage,
          `brands/logos/${Date.now()}_${brandLogoFile.name}`
        );
        await uploadBytes(logoRef, brandLogoFile);
        brandLogoUrl = await getDownloadURL(logoRef);
      }

      let expiryDate = editingUser.subscription?.expiryDate?.toDate() || null;
      if (subType === "monthly") {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (subType === "custom") {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(subDays));
      } else if (subType === "lifetime") {
        expiryDate = null;
      }

      await updateDoc(doc(db, "users", editingUser.id), {
        brandName: role === "admin" ? brandName.trim() : "",
        ownerName: ownerName.trim(),
        brandUrl: role === "admin" ? brandUrl.trim() : "",
        brandLogoUrl: role === "admin" ? brandLogoUrl : "",
        phoneNumber: `${phoneKey}${phoneNumber.trim().replace(/^\+/, "")}`,
        role: role,
        photoURL: photoURL || "",
        subscription: {
          type: subType,
          expiryDate: expiryDate ? expiryDate : null,
          status: subType === "stopped" ? "stopped" : "active",
          updatedAt: serverTimestamp(),
        },
      });
      if (role === "admin") {
        await setDoc(doc(db, "brands", brandName.trim()), {
          logoUrl: brandLogoUrl || null,
          publicPaymentMethods: {
            stripe: { enabled: false, publishableKey: "", paymentLink: "", paymentLinkAnnual: "" },
            manualMethods: [
              { id: "def-1", name: "Vodafone Cash / فودافون كاش", value: "" },
              { id: "def-2", name: "InstaPay / انستا باي", value: "" },
              { id: "def-3", name: "Bank Transfer / تحويل بنكي", value: "" }
            ]
          }
        }, { merge: true });
      }

      toast("تم التحديث بنجاح","success");
      cancelEdit();
      await loadBrands();
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

  const handleDelete = async (brand) => {
    const confirmed = await confirm(
      `هل تريد حذف "${brand.brandName || brand.email}"؟`,
      "تأكيد الحذف",
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "users", brand.id));
      toast("تم الحذف","success");
      await loadBrands();
    } catch (err) {
      toast("خطأ في الحذف", "error");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterSub("all");
    setIsSubDropdownOpen(false);
  };

  const handleExportCSV = () => {
    const activeAdmins = brands.filter((b) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        b.role === "admin" &&
        (b.brandName?.toLowerCase().includes(q) ||
          b.ownerName?.toLowerCase().includes(q) ||
          b.email?.toLowerCase().includes(q));

      const matchesSub =
        filterSub === "all" || b.subscription?.type === filterSub;

      return matchesSearch && matchesSub;
    });

    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Arabic compatibility
    csvContent +=
      "البرند,المالك,البريد,رقم الهاتف,الموقع,نوع الاشتراك,تاريخ التسجيل\n";

    activeAdmins.forEach((b) => {
      const brandName = b.brandName || "—";
      const ownerName = b.ownerName || "—";
      const email = b.email || "—";
      const phoneNumber = b.phoneNumber || "—";
      const brandUrl = b.brandUrl || "—";

      let subLabel = "—";
      if (b.subscription?.status === "stopped") subLabel = "موقف";
      else if (b.subscription?.type === "monthly") subLabel = "شهري";
      else if (b.subscription?.type === "lifetime") subLabel = "مدى الحياة";
      else if (b.subscription?.type === "custom") subLabel = "مخصص";

      const regDate = formatDate(b.createdAt);

      csvContent += `"${brandName}","${ownerName}","${email}","${phoneNumber}","${brandUrl}","${subLabel}","${regDate}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `brands_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSubscriptionBadge = (b) => {
    const type = b.subscription?.type || "monthly";
    const status = b.subscription?.status || "active";
    const expiryDate = b.subscription?.expiryDate?.toDate() || null;
    const isExp = expiryDate && expiryDate < new Date();

    let bg = "rgba(16, 185, 129, 0.15)";
    let color = "#34d399";
    let label = "شهري";

    if (status === "stopped" || isExp) {
      bg = "rgba(239, 68, 68, 0.15)";
      color = "#f87171";
      label = status === "stopped" ? "موقف" : "منتهي";
    } else if (type === "lifetime") {
      bg = "rgba(245, 158, 11, 0.15)";
      color = "#fbbf24";
      label = "مدى الحياة";
    } else if (type === "custom") {
      bg = "rgba(139, 92, 246, 0.15)";
      color = "#a78bfa";
      label = "مخصص";
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            background: bg,
            color: color,
            backdropFilter: "blur(4px)",
            width: "fit-content",
            whiteSpace: "nowrap"
          }}
        >
          {label}
        </span>
        {expiryDate && status !== "stopped" && !isExp && (
          <span style={{ fontSize: "9px", color: "var(--text3)" }}>
            ينتهي: {expiryDate.toLocaleDateString("ar-EG")}
          </span>
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      await logout("superadmin");
      toast("تم تسجيل الخروج بنجاح","success");
      navigate("/superadmin/login");
    } catch (error) {
      toast("حدث خطأ أثناء تسجيل الخروج", "error");
      console.error(error);
    }
  };

  const admins = brands.filter((b) => b.role === "admin");
  const users = brands.filter((b) => b.role === "user");
  const employees = brands.filter(
    (b) => b.role === "superadmin" && b.email !== "admin@brand.com",
  );
  const isMainAdmin = userData?.email === "admin@brand.com";

  const filteredBrands = brands.filter((b) => {
    if (b.role !== "admin") return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      b.brandName?.toLowerCase().includes(q) ||
      b.ownerName?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q);

    const matchesSub =
      filterSub === "all" || b.subscription?.type === filterSub;
    return matchesSearch && matchesSub;
  });

  const itemsPerPage = 6;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBrands.length / itemsPerPage),
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBrands.slice(indexOfFirstItem, indexOfLastItem);

  const formatDate = (ts) => {
    if (!ts?.seconds) return "—";
    return new Date(ts.seconds * 1000).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading || !userData) {
    return (
      <BrandedLoader
        message={
          !userData ? "جاري التحقق من الهوية..." : "جاري تحميل لوحة التحكم..."
        }
      />
    );
  }

  return (
    <div className="sa-page" dir="rtl">
      <div className="sa-bg">
        <div className="sa-orb sa-orb-1" />
        <div className="sa-orb sa-orb-2" />
      </div>

      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <motion.div
        className="sa-sidebar"
        animate={{
          width: isMobile ? (isSidebarOpen ? 260 : 0) : isCollapsed ? 80 : 260,
          x: isMobile && !isSidebarOpen ? 260 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          position: isMobile ? "fixed" : "relative",
          right: isMobile ? 0 : "auto",
          top: 0,
          bottom: 0,
          height: "100vh",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: isMobile && !isSidebarOpen ? "hidden" : "visible",
          borderLeft: "1px solid var(--line)",
          background: "rgba(13, 18, 32, 0.95)",
          backdropFilter: "blur(20px)",
          padding: "24px 0",
        }}
      >
        <div
          className="sa-sidebar-header"
          style={{
            padding: "0 16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              isCollapsed && !isMobile ? "center" : "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="sa-logo-icon" style={{ flexShrink: 0 }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ width: 24, height: 24 }}
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            {(!isCollapsed || isMobile) && (
              <div>
                <div
                  className="sa-topbar-title"
                  style={{ fontSize: "15px", fontWeight: "800", color: "#fff" }}
                >
                  لوحة التحكم
                </div>
                <div
                  className="sa-topbar-sub"
                  style={{ fontSize: "11px", color: "var(--text3)" }}
                >
                  Super Admin
                </div>
              </div>
            )}
          </div>

          {/* Collapse toggle button for Desktop */}
          {!isMobile && (
            <button
              onClick={() => {
                const next = !isCollapsed;
                setIsCollapsed(next);
                localStorage.setItem("sa-sidebar-collapsed", String(next));
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
                borderRadius: "8px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text2)")
              }
            >
              {isCollapsed ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}

          {/* Close button for Mobile */}
          {isMobile && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div
          className="sa-nav-links"
          style={{
            padding: "16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            flex: 1,
          }}
        >
          {[
            { id: "users", label: "قسم البراندات", icon: Building },
            { id: "library", label: "مكتبة المنتجات", icon: Library },
            { id: "sales", label: "إدارة المبيعات", icon: TrendingUp },
            { id: "landing-pages", label: "صفحات الهبوط", icon: Layout },
            ...(isMainAdmin
              ? [{ id: "employees", label: "الموظفين", icon: Users }]
              : []),
            { id: "brand", label: "العلامة التجارية", icon: Sparkles },
            { id: "settings", label: "الإعدادات", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id && (item.id !== "users" || !selectedBrand);
            return (
              <button
                key={item.id}
                className={`sa-nav-link ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === "users") setSelectedBrand(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                title={isCollapsed && !isMobile ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    isCollapsed && !isMobile ? "center" : "flex-start",
                  gap: isCollapsed && !isMobile ? "0" : "12px",
                  padding: "12px",
                  borderRadius: "10px",
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                <Icon size={18} />
                {(!isCollapsed || isMobile) && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        <div
          className="sa-sidebar-footer"
          style={{ padding: "0 8px", marginTop: "auto" }}
        >
          <button
            className="sa-logout-btn"
            onClick={handleLogout}
            title={isCollapsed && !isMobile ? "تسجيل خروج" : undefined}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent:
                isCollapsed && !isMobile ? "center" : "flex-start",
              gap: isCollapsed && !isMobile ? "0" : "12px",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: "rgba(239, 68, 68, 0.08)",
              color: "var(--red)",
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: "14px",
              fontWeight: "700",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
            }}
          >
            <LogOut size={18} />
            {(!isCollapsed || isMobile) && <span>تسجيل خروج</span>}
          </button>
        </div>
      </motion.div>

      <div
        className="sa-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        {/* Topbar */}
        <div
          className="sa-topbar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--line)",
            background: "rgba(13, 20, 38, 0.6)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            className="sa-topbar-left"
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  width: "38px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <Menu size={20} />
              </button>
            )}
            <div
              style={{
                fontSize: "14px",
                fontWeight: "800",
                color: "var(--text2)",
              }}
            >
              {activeTab === "users"
                ? "إدارة البراندات والمستخدمين"
                : activeTab === "library"
                  ? "مكتبة محتوى البراندات"
                  : activeTab === "landing-pages"
                    ? "قوالب صفحات الهبوط"
                    : activeTab === "sales"
                      ? "إدارة المبيعات والإيرادات"
                      : activeTab === "employees"
                        ? "إدارة فريق العمل"
                        : activeTab === "brand"
                          ? "إعدادات العلامة التجارية"
                          : "إعدادات النظام"}
            </div>
          </div>
          <div className="sa-topbar-right">
            <div
              className="sa-user-badge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid var(--line)",
                background: "rgba(255,255,255,0.02)",
                fontSize: "13px",
                color: "var(--text2)",
              }}
            >
              <div
                className="sa-user-dot"
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--green, #10B981)",
                  boxShadow: "0 0 10px var(--green)",
                }}
              />
              مسؤول النظام
            </div>
          </div>
        </div>

        <div
          className="sa-content"
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            position: "relative",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              {activeTab === "library" ? (
                <SuperAdminLibrary />
              ) : activeTab === "landing-pages" ? (
                <SuperAdminLandingPages />
              ) : activeTab === "sales" ? (
                <SuperAdminSales allUsers={brands} />
              ) : activeTab === "employees" && isMainAdmin ? (
                <SuperAdminEmployees
                  employees={employees}
                  allUsers={brands}
                  onAdd={() => {
                    setEditingUser(null);
                    setRole("superadmin");
                    setIsAddModalOpen(true);
                  }}
                  onEdit={(u) => {
                    handleEditClick(u);
                    setActiveTab("employees");
                  }}
                  onDelete={handleDelete}
                  formatDate={formatDate}
                  totalSteps={TOTAL_STEPS_COUNT}
                />
              ) : activeTab === "brand" ? (
                <SuperAdminBranding />
              ) : activeTab === "settings" ? (
                <SuperAdminSettings />
              ) : (
                <>
                  {/* Stats */}
                  <div className="sa-stats">
                    {!selectedBrand ? (
                      <>
                        <motion.div
                          className="sa-stat-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                        >
                          <div
                            className="sa-stat-icon"
                            style={{
                              background: "rgba(59, 130, 246, 0.1)",
                              color: "var(--accent)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Building size={24} />
                          </div>
                          <div className="sa-stat-value">
                            <AnimatedCounter value={admins.length} />
                          </div>
                          <div className="sa-stat-label">براندات (أدمن)</div>
                        </motion.div>
                        <motion.div
                          className="sa-stat-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <div
                            className="sa-stat-icon"
                            style={{
                              background: "rgba(16, 185, 129, 0.1)",
                              color: "var(--green)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Users size={24} />
                          </div>
                          <div className="sa-stat-value">
                            <AnimatedCounter value={users.length} />
                          </div>
                          <div className="sa-stat-label">مستخدمين</div>
                        </motion.div>
                        <motion.div
                          className="sa-stat-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                        >
                          <div
                            className="sa-stat-icon"
                            style={{
                              background: "rgba(139, 92, 246, 0.1)",
                              color: "var(--purple)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <TrendingUp size={24} />
                          </div>
                          <div className="sa-stat-value">
                            <AnimatedCounter value={brands.length} />
                          </div>
                          <div className="sa-stat-label">إجمالي الحسابات</div>
                        </motion.div>
                      </>
                    ) : (
                      (() => {
                        const brandUsers = brands.filter(
                          (u) =>
                            u.role === "user" &&
                            (u.createdBy === selectedBrand.id ||
                              u.brandName === selectedBrand.brandName),
                        );
                        const totalUsers = brandUsers.length;
                        const completedAll = brandUsers.filter(
                          (u) =>
                            (u.appState?.completedSteps?.length || 0) >=
                            TOTAL_STEPS_COUNT,
                        ).length;
                        const avgProgress =
                          totalUsers > 0
                            ? Math.round(
                                (brandUsers.reduce(
                                  (acc, u) =>
                                    acc +
                                    (u.appState?.completedSteps?.length || 0),
                                  0,
                                ) /
                                  (totalUsers * TOTAL_STEPS_COUNT)) *
                                  100,
                              )
                            : 0;

                        return (
                          <>
                            <motion.div
                              className="sa-stat-card"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.05 }}
                            >
                              <div
                                className="sa-stat-icon"
                                style={{
                                  background: "rgba(59, 130, 246, 0.1)",
                                  color: "var(--accent)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Users size={24} />
                              </div>
                              <div className="sa-stat-value">
                                <AnimatedCounter value={totalUsers} />
                              </div>
                              <div className="sa-stat-label">
                                إجمالي المستخدمين
                              </div>
                            </motion.div>
                            <motion.div
                              className="sa-stat-card"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <div
                                className="sa-stat-icon"
                                style={{
                                  background: "rgba(16, 185, 129, 0.1)",
                                  color: "var(--green)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <TrendingUp size={24} />
                              </div>
                              <div className="sa-stat-value">
                                <AnimatedCounter value={avgProgress} />%
                              </div>
                              <div className="sa-stat-label">
                                متوسط إنجاز الفريق
                              </div>
                            </motion.div>
                            <motion.div
                              className="sa-stat-card"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.15 }}
                            >
                              <div
                                className="sa-stat-icon"
                                style={{
                                  background: "rgba(245, 158, 11, 0.1)",
                                  color: "var(--amber)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Sparkles size={24} />
                              </div>
                              <div className="sa-stat-value">
                                <AnimatedCounter value={completedAll} />
                              </div>
                              <div className="sa-stat-label">
                                أتموا كافة المراحل
                              </div>
                            </motion.div>
                          </>
                        );
                      })()
                    )}
                  </div>

                  {/* Grid: Table + Form */}
                  {selectedBrand ? (
                    <div
                      className="sa-grid"
                      style={{ gridTemplateColumns: "1fr" }}
                    >
                      <div className="sa-table-card">
                        <div
                          className="sa-card-header"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                            <div
                              className="sa-card-title"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                              }}
                            >
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => {
                                  setSelectedBrand(null);
                                  setUserSearchQuery("");
                                  setUserFilterRole("all");
                                  setUserFilterProgress("all");
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <ChevronRight size={16} /> رجوع للبراندات
                              </button>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '15px', fontWeight: '800' }}>
                                <Building size={18} style={{ color: 'var(--accent)' }} />
                                <span>إدارة براند:</span>
                                <span style={{ 
                                  background: 'rgba(59, 130, 246, 0.1)', 
                                  border: '1px solid rgba(59, 130, 246, 0.2)', 
                                  borderRadius: '6px', 
                                  padding: '2px 8px', 
                                  color: "var(--accent)",
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}>
                                  {selectedBrand.brandName || selectedBrand.ownerName}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Brand Users Search & Filtering Controls */}
                          <div className="sa-filters-bar" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            width: '100%',
                            flexWrap: 'wrap',
                            background: 'rgba(255,255,255,0.02)',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid var(--line)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
                              <div className="sa-search-box" style={{ flex: 1, minWidth: 200 }}>
                                <input
                                  type="text"
                                  placeholder="بحث باسم المستخدم أو البريد..."
                                  value={userSearchQuery}
                                  onChange={(e) => setUserSearchQuery(e.target.value)}
                                  style={{ width: '100%' }}
                                />
                                <Search size={16} className="sa-search-icon" />
                              </div>

                              {/* Role Filter Dropdown */}
                              <div style={{ position: 'relative', zIndex: 40 }}>
                                <button
                                  type="button"
                                  onClick={() => setIsUserRoleDropdownOpen(!isUserRoleDropdownOpen)}
                                  className="btn btn-outline"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid var(--line)',
                                    borderRadius: '8px',
                                    color: 'var(--text1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: 700
                                  }}
                                >
                                  <User size={14} style={{ color: 'var(--accent)' }} />
                                  <span>
                                    {userFilterRole === "all" ? "كل الأدوار" : userFilterRole === "admin" ? "🛡 أدمن" : "👤 يوزر"}
                                  </span>
                                  <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isUserRoleDropdownOpen ? 'rotate(180deg)' : 'none', color: 'var(--text3)' }} />
                                </button>

                                <AnimatePresence>
                                  {isUserRoleDropdownOpen && (
                                    <>
                                      <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsUserRoleDropdownOpen(false)} />
                                      <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        style={{
                                          position: 'absolute',
                                          top: 'calc(100% + 6px)',
                                          right: 0,
                                          minWidth: '140px',
                                          background: 'rgba(15, 23, 42, 0.95)',
                                          backdropFilter: 'blur(20px)',
                                          border: '1px solid var(--line)',
                                          borderRadius: '10px',
                                          padding: '6px',
                                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                          zIndex: 999,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '2px'
                                        }}
                                      >
                                        {[
                                          { key: "all", val: "كل الأدوار" },
                                          { key: "admin", val: "🛡 أدمن" },
                                          { key: "user", val: "👤 يوزر" }
                                        ].map((opt) => (
                                          <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => {
                                              setUserFilterRole(opt.key);
                                              setIsUserRoleDropdownOpen(false);
                                            }}
                                            style={{
                                              background: userFilterRole === opt.key ? 'rgba(59, 130, 246, 0.1)' : 'none',
                                              border: 'none',
                                              borderRadius: '6px',
                                              padding: '8px 12px',
                                              color: userFilterRole === opt.key ? 'var(--accent)' : 'var(--text2)',
                                              fontSize: '13px',
                                              textAlign: 'right',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s',
                                              fontWeight: userFilterRole === opt.key ? '700' : '500',
                                              width: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between'
                                            }}
                                          >
                                            <span>{opt.val}</span>
                                            {userFilterRole === opt.key && (
                                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                                            )}
                                          </button>
                                        ))}
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Progress Filter Dropdown */}
                              <div style={{ position: 'relative', zIndex: 40 }}>
                                <button
                                  type="button"
                                  onClick={() => setIsUserProgDropdownOpen(!isUserProgDropdownOpen)}
                                  className="btn btn-outline"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid var(--line)',
                                    borderRadius: '8px',
                                    color: 'var(--text1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: 700
                                  }}
                                >
                                  <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
                                  <span>
                                    {userFilterProgress === "all" ? "كل نسب التقدم" : userFilterProgress === "completed" ? "أتموا المراحل" : "قيد الإنجاز"}
                                  </span>
                                  <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isUserProgDropdownOpen ? 'rotate(180deg)' : 'none', color: 'var(--text3)' }} />
                                </button>

                                <AnimatePresence>
                                  {isUserProgDropdownOpen && (
                                    <>
                                      <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsUserProgDropdownOpen(false)} />
                                      <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        style={{
                                          position: 'absolute',
                                          top: 'calc(100% + 6px)',
                                          right: 0,
                                          minWidth: '140px',
                                          background: 'rgba(15, 23, 42, 0.95)',
                                          backdropFilter: 'blur(20px)',
                                          border: '1px solid var(--line)',
                                          borderRadius: '10px',
                                          padding: '6px',
                                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                          zIndex: 999,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '2px'
                                        }}
                                      >
                                        {[
                                          { key: "all", val: "كل نسب التقدم" },
                                          { key: "completed", val: "أتموا المراحل" },
                                          { key: "inprogress", val: "قيد الإنجاز" }
                                        ].map((opt) => (
                                          <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => {
                                              setUserFilterProgress(opt.key);
                                              setIsUserProgDropdownOpen(false);
                                            }}
                                            style={{
                                              background: userFilterProgress === opt.key ? 'rgba(59, 130, 246, 0.1)' : 'none',
                                              border: 'none',
                                              borderRadius: '6px',
                                              padding: '8px 12px',
                                              color: userFilterProgress === opt.key ? 'var(--accent)' : 'var(--text2)',
                                              fontSize: '13px',
                                              textAlign: 'right',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s',
                                              fontWeight: userFilterProgress === opt.key ? '700' : '500',
                                              width: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between'
                                            }}
                                          >
                                            <span>{opt.val}</span>
                                            {userFilterProgress === opt.key && (
                                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                                            )}
                                          </button>
                                        ))}
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>

                            {(userSearchQuery || userFilterRole !== "all" || userFilterProgress !== "all") && (
                              <button
                                className="btn btn-xs btn-outline"
                                onClick={() => {
                                  setUserSearchQuery("");
                                  setUserFilterRole("all");
                                  setUserFilterProgress("all");
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <RefreshCw size={12} /> إعادة تعيين الفلاتر
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="sa-table-wrapper">
                          <table className="sa-table">
                            <thead>
                              <tr>
                                <th>الاسم</th>
                                <th>البريد</th>
                                <th>الدور</th>
                                <th>التقدم المنجز</th>
                                <th>التاريخ</th>
                                <th>الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const brandUsers = brands.filter(
                                  (u) =>
                                    u.id === selectedBrand.id ||
                                    u.createdBy === selectedBrand.id ||
                                    u.brandName === selectedBrand.brandName,
                                );

                                const filteredUsers = brandUsers.filter((u) => {
                                  const q = userSearchQuery.toLowerCase();
                                  const matchesSearch = (
                                    (u.ownerName || "").toLowerCase().includes(q) ||
                                    (u.email || "").toLowerCase().includes(q)
                                  );
                                  const matchesRole = userFilterRole === "all" || u.role === userFilterRole;
                                  const doneCount = u.appState?.completedSteps?.length || 0;
                                  const isCompleted = doneCount >= TOTAL_STEPS_COUNT;
                                  const matchesProgress = userFilterProgress === "all" || 
                                    (userFilterProgress === "completed" && isCompleted) ||
                                    (userFilterProgress === "inprogress" && !isCompleted);

                                  return matchesSearch && matchesRole && matchesProgress;
                                });

                                if (filteredUsers.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
                                        لا يوجد مستخدمين يطابقون شروط البحث.
                                      </td>
                                    </tr>
                                  );
                                }

                                return filteredUsers.map((u) => (
                                  <tr key={u.id}>
                                    <td>
                                      <div className="sa-brand-name">
                                        <div
                                          className="sa-brand-avatar"
                                          style={{
                                            background:
                                              u.role === "admin"
                                                ? "var(--accent)"
                                                : "var(--green)",
                                          }}
                                        >
                                          {(u.ownerName || u.email || "?")
                                            .charAt(0)
                                            .toUpperCase()}
                                        </div>
                                        {u.ownerName || "—"}
                                      </div>
                                    </td>
                                    <td>
                                      <span className="sa-brand-email">
                                        {u.email}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        className={`sa-role-badge ${u.role === "admin" ? "sa-role-admin" : "sa-role-user"}`}
                                      >
                                        {u.role === "admin"
                                          ? "🛡 أدمن"
                                          : "👤 يوزر"}
                                      </span>
                                    </td>
                                    <td>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                        }}
                                      >
                                        <div
                                          style={{
                                            flex: 1,
                                            height: 6,
                                            background:
                                              "rgba(255,255,255,0.05)",
                                            borderRadius: 3,
                                            overflow: "hidden",
                                            minWidth: 60,
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: `${Math.round(((u.appState?.completedSteps?.length || 0) / TOTAL_STEPS_COUNT) * 100)}%`,
                                              height: "100%",
                                              background: "var(--accent)",
                                            }}
                                          />
                                        </div>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: "var(--text2)",
                                          }}
                                        >
                                          {u.appState?.completedSteps?.length ||
                                            0}{" "}
                                          / {TOTAL_STEPS_COUNT}
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="sa-date">
                                        {formatDate(u.createdAt)}
                                      </span>
                                    </td>
                                    <td>
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                          className="btn btn-xs btn-outline sa-action-btn"
                                          onClick={() =>
                                            setViewingUserDetails(u)
                                          }
                                          title="تفاصيل التقدم"
                                        >
                                          <Eye size={12} />
                                        </button>
                                        <button
                                          className="btn btn-xs btn-outline sa-action-btn"
                                          onClick={() => {
                                            handleEditClick(u);
                                            setSelectedBrand(null);
                                          }}
                                          title="تعديل"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button
                                          className="sa-delete-btn btn-xs sa-action-btn"
                                          onClick={() => handleDelete(u)}
                                          title="حذف"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="sa-grid"
                      style={{ gridTemplateColumns: "1fr" }}
                    >
                      <div className="sa-table-card">
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
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
                                جدول أصحاب البراندات
                              </span>
                              <span className="sa-card-count">
                                {
                                  brands.filter((b) => b.role === "admin")
                                    .length
                                }
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                className="btn btn-outline"
                                onClick={handleExportCSV}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "8px 16px",
                                  fontWeight: 700,
                                }}
                              >
                                <Download size={16} /> تصدير CSV
                              </button>
                              <button
                                className="btn"
                                onClick={() => {
                                  setEditingUser(null);
                                  setIsAddModalOpen(true);
                                }}
                                style={{
                                  background: "var(--accent)",
                                  color: "#fff",
                                  border: "none",
                                  padding: "8px 16px",
                                  fontWeight: 800,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Plus size={16} /> إضافة براند جديد
                              </button>
                            </div>
                          </div>

                          {/* Advanced Search & Filtering Controls */}
                          <div
                            className="sa-filters-bar"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              width: "100%",
                              flexWrap: "wrap",
                              background: "rgba(255,255,255,0.02)",
                              padding: "12px",
                              borderRadius: "12px",
                              border: "1px solid var(--line)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                flex: 1,
                                minWidth: 280,
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                className="sa-search-box"
                                style={{ flex: 1, minWidth: 200 }}
                              >
                                <input
                                  type="text"
                                  placeholder="بحث باسم البراند، المالك، البريد الإلكتروني..."
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  style={{ width: "100%" }}
                                />
                                <Search size={16} className="sa-search-icon" />
                              </div>

                              <div style={{ position: "relative", zIndex: 50 }}>
                                <button
                                  type="button"
                                  onClick={() => setIsSubDropdownOpen(!isSubDropdownOpen)}
                                  className="btn btn-outline"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid var(--line)',
                                    borderRadius: '8px',
                                    color: 'var(--text1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: 700
                                  }}
                                >
                                  <Filter size={14} style={{ color: 'var(--accent)' }} />
                                  <span>{subLabels[filterSub] || filterSub}</span>
                                  <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isSubDropdownOpen ? 'rotate(180deg)' : 'none', color: 'var(--text3)' }} />
                                </button>

                                <AnimatePresence>
                                  {isSubDropdownOpen && (
                                    <>
                                      <div 
                                        style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                                        onClick={() => setIsSubDropdownOpen(false)}
                                      />
                                      <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        style={{
                                          position: 'absolute',
                                          top: 'calc(100% + 6px)',
                                          right: 0,
                                          minWidth: '160px',
                                          background: 'rgba(15, 23, 42, 0.95)',
                                          backdropFilter: 'blur(20px)',
                                          border: '1px solid var(--line)',
                                          borderRadius: '10px',
                                          padding: '6px',
                                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                          zIndex: 999,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '2px'
                                        }}
                                      >
                                        {Object.entries(subLabels).map(([key, val]) => (
                                          <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                              setFilterSub(key);
                                              setIsSubDropdownOpen(false);
                                            }}
                                            style={{
                                              background: filterSub === key ? 'rgba(59, 130, 246, 0.1)' : 'none',
                                              border: 'none',
                                              borderRadius: '6px',
                                              padding: '8px 12px',
                                              color: filterSub === key ? 'var(--accent)' : 'var(--text2)',
                                              fontSize: '13px',
                                              textAlign: 'right',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s',
                                              fontWeight: filterSub === key ? '700' : '500',
                                              width: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between'
                                            }}
                                          >
                                            <span>{val}</span>
                                            {filterSub === key && (
                                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                                            )}
                                          </button>
                                        ))}
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>

                            {(searchQuery || filterSub !== "all") && (
                              <button
                                className="btn btn-xs btn-outline"
                                onClick={handleResetFilters}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <RefreshCw size={12} /> إعادة تعيين الفلاتر
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          className="sa-table-wrapper"
                          style={{ overflowX: "auto" }}
                        >
                          <table className="sa-table">
                            <thead>
                              <tr>
                                <th>البراند</th>
                                <th>المالك</th>
                                <th>البريد</th>
                                <th>رقم الهاتف</th>
                                <th>الموقع</th>
                                <th>الاشتراك</th>
                                <th>الدور</th>
                                <th>التقدم</th>
                                <th>الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentItems.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={9}
                                    style={{
                                      textAlign: "center",
                                      padding: "40px 0",
                                      color: "var(--text3)",
                                    }}
                                  >
                                    لا يوجد نتائج تطابق خيارات البحث الحالية.
                                  </td>
                                </tr>
                              ) : (
                                currentItems.map((b) => (
                                  <tr
                                    key={b.id}
                                    onClick={() => setSelectedBrand(b)}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <td>
                                      <div className="sa-brand-name">
                                        <div
                                          className="sa-brand-avatar"
                                          style={
                                            b.photoURL
                                              ? {
                                                  background: `url("${b.photoURL}") center/cover no-repeat`,
                                                }
                                              : {}
                                          }
                                        >
                                          {!b.photoURL &&
                                            (b.brandName || b.email || "?")
                                              .charAt(0)
                                              .toUpperCase()}
                                        </div>
                                        {b.brandName || "—"}
                                      </div>
                                    </td>
                                    <td>{b.ownerName || "—"}</td>
                                    <td>
                                      <span className="sa-brand-email">
                                        {b.email}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 700,
                                          color: "var(--text2)",
                                          fontFamily: "Cairo",
                                        }}
                                      >
                                        {b.phoneNumber || "—"}
                                      </span>
                                    </td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                      {b.brandUrl ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <a
                                            href={b.brandUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="sa-site-link"
                                            style={{
                                              fontSize: 11,
                                              background: 'rgba(59, 130, 246, 0.1)',
                                              border: '1px solid rgba(59, 130, 246, 0.2)',
                                              borderRadius: '6px',
                                              padding: '4px 8px',
                                              color: "var(--accent)",
                                              textDecoration: "none",
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              fontWeight: '700',
                                              transition: 'all 0.2s',
                                              whiteSpace: 'nowrap'
                                            }}
                                          >
                                            <Globe size={12} />
                                            زيارة الموقع
                                          </a>
                                          <button
                                            onClick={() => {
                                              navigator.clipboard.writeText(b.brandUrl);
                                              toast("تم نسخ رابط الموقع بنجاح", "success");
                                            }}
                                            style={{
                                              background: 'rgba(255,255,255,0.03)',
                                              border: '1px solid var(--line)',
                                              borderRadius: '6px',
                                              padding: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              color: 'var(--text3)',
                                              transition: 'all 0.2s'
                                            }}
                                            title="نسخ الرابط"
                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                                          >
                                            <Copy size={12} />
                                          </button>
                                        </div>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td>{renderSubscriptionBadge(b)}</td>
                                    <td>
                                      <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "4px 12px",
                                        borderRadius: "20px",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        background: "rgba(99, 102, 241, 0.15)",
                                        color: "#818cf8",
                                        whiteSpace: "nowrap"
                                      }}>
                                        🛡 أدمن
                                      </span>
                                    </td>
                                    <td>
                                      <div style={{ width: 80 }}>
                                        <div
                                          style={{
                                            height: 4,
                                            background:
                                              "rgba(255,255,255,0.05)",
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            marginBottom: 4,
                                            position: "relative",
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: `${Math.round(((b.appState?.completedSteps?.length || 0) / totalSteps) * 100)}%`,
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
                                          {b.appState?.completedSteps?.length ||
                                            0}{" "}
                                          / {TOTAL_STEPS_COUNT}
                                        </div>
                                      </div>
                                    </td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                          className="btn btn-xs btn-outline sa-action-btn"
                                          onClick={() => setSelectedBrand(b)}
                                          title="المستخدمين"
                                        >
                                          <Eye size={12} />
                                        </button>
                                        <button
                                          className="btn btn-xs btn-outline sa-action-btn"
                                          onClick={() => handleEditClick(b)}
                                          title="تعديل"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button
                                          className="sa-delete-btn btn-xs sa-action-btn"
                                          onClick={() => handleDelete(b)}
                                          title="حذف"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div
                            className="sa-pagination"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "16px 24px",
                              borderTop: "1px solid var(--line)",
                              marginTop: 12,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                color: "var(--text2)",
                              }}
                            >
                              عرض {(currentPage - 1) * itemsPerPage + 1} -{" "}
                              {Math.min(
                                currentPage * itemsPerPage,
                                filteredBrands.length,
                              )}{" "}
                              من {filteredBrands.length} براند
                            </span>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="btn btn-sm btn-outline"
                                disabled={currentPage === 1}
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.max(prev - 1, 1),
                                  )
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <ChevronRight size={14} /> السابق
                              </button>
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "0 12px",
                                  fontSize: "13px",
                                  fontWeight: "700",
                                  color: "#fff",
                                }}
                              >
                                {currentPage} / {totalPages}
                              </span>
                              <button
                                className="btn btn-sm btn-outline"
                                disabled={currentPage === totalPages}
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.min(prev + 1, totalPages),
                                  )
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                التالي <ChevronLeft size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Add/Edit Account Modal */}
      {isAddModalOpen && (
        <div className="sa-modal-overlay" onClick={cancelEdit}>
          <div
            className="sa-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600 }}
          >
            <div className="sa-modal-header">
              <h2 style={{ fontSize: 16, color: "#fff", display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                {editingUser ? (
                  <>
                    <Edit2 size={16} style={{ color: "var(--accent)" }} />
                    <span>تعديل الحساب</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} style={{ color: "var(--accent)" }} />
                    <span>إنشاء حساب جديد</span>
                  </>
                )}
              </h2>
              <button className="btn btn-sm" onClick={cancelEdit}>
                إغلاق
              </button>
            </div>
            <div className="sa-modal-body">
              <form onSubmit={handleSubmit}>
                {!(role === "superadmin" && activeTab === "employees") && (
                  <div className="sa-form-section">
                    <div className="sa-form-section-title">نوع الحساب</div>
                    <div className="sa-role-selector">
                      <div
                        className={`sa-role-option ${role === "admin" ? "active" : ""}`}
                        onClick={() => setRole("admin")}
                      >
                        🛡 أدمن (براند)
                      </div>
                      <div
                        className={`sa-role-option ${role === "user" ? "active" : ""}`}
                        onClick={() => setRole("user")}
                      >
                        👤 مستخدم مستقل
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: role === "admin" ? "1fr 1fr" : "1fr",
                    gap: 12,
                  }}
                >
                  {role === "admin" && (
                    <div className="field">
                      <label className="field-label">اسم البراند</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          className="field-input"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          disabled={creating}
                          placeholder="اسم النشاط التجاري"
                          style={{ paddingRight: '38px', width: '100%' }}
                        />
                        <Building size={16} style={{ position: 'absolute', right: '12px', color: 'var(--text3)' }} />
                      </div>
                    </div>
                  )}
                  <div className="field">
                    <label className="field-label">
                      {role === "superadmin"
                        ? "اسم الموظف"
                        : role === "user"
                          ? "اسم المستخدم"
                          : "اسم المالك"}
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        className="field-input"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        disabled={creating}
                        placeholder="الاسم الكامل"
                        style={{ paddingRight: '38px', width: '100%' }}
                      />
                      <User size={16} style={{ position: 'absolute', right: '12px', color: 'var(--text3)' }} />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div className="field">
                    <label className="field-label">البريد الإلكتروني</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        className="field-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={creating || editingUser}
                        placeholder="email@example.com"
                        style={{ paddingRight: '38px', width: '100%', direction: 'ltr' }}
                      />
                      <Mail size={16} style={{ position: 'absolute', right: '12px', color: 'var(--text3)' }} />
                    </div>
                  </div>
                  {!editingUser && (
                    <div className="field">
                      <label className="field-label">كلمة المرور</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          className="field-input"
                          type="text"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={creating}
                          placeholder="6 رموز على الأقل"
                          style={{ paddingRight: '38px', width: '100%', direction: 'ltr' }}
                        />
                        <Lock size={16} style={{ position: 'absolute', right: '12px', color: 'var(--text3)' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: role === "admin" ? "1fr 1fr" : "1fr",
                    gap: 12,
                  }}
                >
                  {role === "admin" && (
                    <div className="field">
                      <label className="field-label">رابط الموقع (URL) *</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          className="field-input"
                          value={brandUrl}
                          onChange={(e) => setBrandUrl(e.target.value)}
                          disabled={creating}
                          placeholder="https://example.com"
                          dir="ltr"
                          style={{ paddingRight: '38px', width: '100%' }}
                        />
                        <Globe size={16} style={{ position: 'absolute', right: '12px', color: 'var(--text3)' }} />
                      </div>
                    </div>
                  )}
                  <div className="field">
                    <label className="field-label">رقم الهاتف *</label>
                    <PhoneInput
                      phoneKey={phoneKey}
                      setPhoneKey={setPhoneKey}
                      phoneNumber={phoneNumber}
                      setPhoneNumber={setPhoneNumber}
                      disabled={creating}
                    />
                  </div>
                </div>

                {role === "admin" && (
                  <div className="field" style={{ marginTop: 12 }}>
                    <label className="field-label">لوجو البراند (اختياري)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {brandLogoPreview && (
                        <img 
                          src={brandLogoPreview} 
                          alt="Preview" 
                          style={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--line)' }} 
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setBrandLogoFile(e.target.files[0]);
                            setBrandLogoPreview(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                        style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--line)', borderRadius: '8px', color: 'var(--text2)', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}

                {role !== "superadmin" && (
                  <>
                    <div className="sa-form-divider" />

                    <div className="sa-form-section">
                      <div className="sa-form-section-title">خطة الاشتراك</div>
                      <div
                        className="sa-role-selector"
                        style={{
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: 8,
                        }}
                      >
                        <div
                          className={`sa-role-option ${subType === "monthly" ? "active" : ""}`}
                          onClick={() => setSubType("monthly")}
                        >
                          🗓 شهر
                        </div>
                        <div
                          className={`sa-role-option ${subType === "lifetime" ? "active" : ""}`}
                          onClick={() => setSubType("lifetime")}
                        >
                          💎 دائم
                        </div>
                        <div
                          className={`sa-role-option ${subType === "custom" ? "active" : ""}`}
                          onClick={() => setSubType("custom")}
                        >
                          ⚙️ محدد
                        </div>
                        <div
                          className={`sa-role-option ${subType === "stopped" ? "active" : ""}`}
                          onClick={() => setSubType("stopped")}
                          style={{ color: "var(--red)" }}
                        >
                          🚫 إيقاف
                        </div>
                      </div>
                    </div>

                    {subType === "custom" && (
                      <div className="field">
                        <label className="field-label">
                          عدد الأيام المسموح بها
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
                  </>
                )}

                <div style={{ marginTop: 24 }}>
                  <button
                    type="submit"
                    className="sa-submit-btn"
                    disabled={creating}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                    }}
                  >
                    {creating ? (
                      <>
                        <div className="ad-submit-spinner" /> جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>حفظ بيانات الحساب</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {viewingUserDetails && (
        <div
          className="sa-modal-overlay"
          onClick={() => setViewingUserDetails(null)}
        >
          <div
            className="sa-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sa-modal-header">
              <h2 style={{ fontSize: 16, color: "#fff", display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                <TrendingUp size={16} style={{ color: "var(--accent)" }} />
                <span>تفاصيل تقدم البراند: {viewingUserDetails.brandName || viewingUserDetails.ownerName}</span>
              </h2>
              <button
                className="btn btn-sm"
                onClick={() => setViewingUserDetails(null)}
              >
                إغلاق
              </button>
            </div>
            <div className="sa-modal-body">
              <div
                className="sa-steps-list"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
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
                        padding: "12px 16px",
                        background: isDone ? "rgba(16, 185, 129, 0.06)" : "rgba(255,255,255,0.02)",
                        border: isDone ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid var(--line)",
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.2s',
                        opacity: isDone ? 1 : 0.65
                      }}
                    >
                      {isDone ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981'
                        }}>
                          <ShieldCheck size={12} />
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: '1px dashed var(--text3)',
                          color: 'var(--text3)'
                        }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text3)' }} />
                        </div>
                      )}
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isDone ? '#fff' : 'var(--text2)',
                      }}>
                        {step.label_ar || step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
