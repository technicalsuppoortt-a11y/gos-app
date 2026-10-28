import { useState, useRef, useEffect } from "react";
import { useAuth, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_PARTNER_PERMISSIONS } from "../../context/AuthContext";
import { useAppState } from "../../context/StateContext";
import { db, firestore } from "../../config/firebase";
import {
  UserPlus,
  Search,
  Trash2,
  Shield,
  ShieldAlert,
  UserCheck,
  Mail,
  Calendar,
  X,
  Loader2,
  Lock,
  User as UserIcon,
  Edit,
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

// ============================================================
// Custom Select Component - Professional dropdown (only for filter)
// ============================================================
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const isRtl = document.documentElement.dir === "rtl";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={selectRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 30 : 1 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon && <span className="text-slate-400">{selectedOption.icon}</span>}
          <span>{selectedOption?.label || placeholder || "اختر"}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="absolute z-40 mt-1 w-full min-w-[160px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs text-right hover:bg-slate-50 dark:hover:bg-slate-900 transition ${
                  opt.value === value
                    ? "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-bold"
                    : "text-slate-700 dark:text-slate-300"
                }`}
                style={{ textAlign: isRtl ? "right" : "left" }}
              >
                {opt.icon && <span className="text-slate-400">{opt.icon}</span>}
                {opt.label}
                {opt.value === value && <span className="mr-auto text-purple-500">✓</span>}
              </button>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================
export default function UserManagementSection() {
  const { users, createUser, deleteUser, updateUserRole, updateUser, userProfile } = useAuth();
  const { state } = useAppState();
  const isRtl = state.settings.language === "ar";
  const t = (ar: string, en: string) => (isRtl ? ar : en);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // New Partner Profile Fields State for Admin View & Edit
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editAdAccountName, setEditAdAccountName] = useState("");
  const [editBusinessManagerId, setEditBusinessManagerId] = useState("");
  const [editPixelId, setEditPixelId] = useState("");
  const [editWhatsappNumber, setEditWhatsappNumber] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editTestimonials, setEditTestimonials] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Bank Transfer");
  const [editPaymentDetails, setEditPaymentDetails] = useState("");

  const [permSearch, setPermSearch] = useState("");
  const [editPermSearch, setEditPermSearch] = useState("");

  // Load default permissions when role is selected in Add User modal
  useEffect(() => {
    if (isAddModalOpen) {
      setPermSearch("");
      const fetchDefaults = async () => {
        try {
          const docSnap = await firestore.getDoc(firestore.doc(db, "settings", "default_permissions"));
          if (docSnap.exists()) {
            setSelectedPermissions(docSnap.data()[role] || []);
          } else {
            setSelectedPermissions(role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PARTNER_PERMISSIONS);
          }
        } catch (e) {
          setSelectedPermissions(role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PARTNER_PERMISSIONS);
        }
      };
      fetchDefaults();
    }
  }, [role, isAddModalOpen]);

  // Load default permissions if role changes during Edit User
  useEffect(() => {
    if (isEditModalOpen && selectedUser) {
      setEditPermSearch("");
      if (editRole !== selectedUser.role) {
        const fetchDefaults = async () => {
          try {
            const docSnap = await firestore.getDoc(firestore.doc(db, "settings", "default_permissions"));
            if (docSnap.exists()) {
              setEditPermissions(docSnap.data()[editRole] || []);
            } else {
              setEditPermissions(editRole === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PARTNER_PERMISSIONS);
            }
          } catch (e) {
            setEditPermissions(editRole === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PARTNER_PERMISSIONS);
          }
        };
        fetchDefaults();
      } else {
        setEditPermissions(selectedUser.permissions || []);
      }
    }
  }, [editRole, isEditModalOpen]);

  // Role filter options
  const roleOptions = [
    {
      value: "all",
      label: t("جميع الأدوار", "All Roles"),
      icon: <Shield className="h-3.5 w-3.5" />,
    },
    {
      value: "admin",
      label: t("مشرفين", "Admins"),
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
    },
    {
      value: "user",
      label: t("شركاء", "Partners"),
      icon: <UserCheck className="h-3.5 w-3.5" />,
    },
  ];

  // Search & Role filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // --- Add User ---
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !name) {
      toast.error(t("يرجى ملء جميع الحقول المطلوبة", "Please fill in all required fields"));
      return;
    }
    if (password.length < 6) {
      toast.error(
        t("يجب أن تكون كلمة المرور 6 أحرف على الأقل", "Password must be at least 6 characters"),
      );
      return;
    }

    setFormLoading(true);
    try {
      await createUser(
        email,
        password,
        name,
        role,
        state.settings.language,
        state.settings.currency,
        selectedPermissions
      );
      setIsAddModalOpen(false);
      setEmail("");
      setPassword("");
      setName("");
      setRole("user");
      setSelectedPermissions([]);
      setShowPassword(false);
    } catch (err) {
      // Error handled in context
    } finally {
      setFormLoading(false);
    }
  }

  // --- Edit User ---
  function openEditModal(user: any) {
    setSelectedUser(user);
    setEditName(user.name || "");
    setEditRole(user.role || "user");
    setEditPermissions(user.permissions || []);
    setEditBusinessName(user.businessName || "");
    setEditAdAccountName(user.adAccountName || "");
    setEditBusinessManagerId(user.businessManagerId || "");
    setEditPixelId(user.pixelId || "");
    setEditWhatsappNumber(user.whatsappNumber || "");
    setEditCountry(user.country || "");
    setEditTestimonials(user.testimonials || "");
    setEditPaymentMethod(user.paymentMethod || "Bank Transfer");
    setEditPaymentDetails(user.paymentDetails || "");
    setEditPermSearch("");
    setIsEditModalOpen(true);
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editName.trim()) {
      toast.error(t("يرجى إدخال الاسم", "Please enter a name"));
      return;
    }

    setEditLoading(true);
    try {
      await updateUser(selectedUser.uid, {
        name: editName.trim(),
        role: editRole,
        permissions: editPermissions,
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      toast.success(t("تم تحديث المستخدم بنجاح", "User updated successfully"));
    } catch (err) {
      // Error handled in context
    } finally {
      setEditLoading(false);
    }
  }

  // --- Delete User ---
  function openDeleteDialog(user: any) {
    if (user.uid === userProfile?.uid) {
      toast.error(t("لا يمكنك حذف حسابك الحالي", "You cannot delete your own account"));
      return;
    }
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.uid);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast.success(t("تم حذف المستخدم بنجاح", "User deleted successfully"));
    } catch (err) {
      // Error handled
    }
  }

  // --- Toggle Role ---
  async function handleToggleRole(uid: string, currentRole: "admin" | "user") {
    if (uid === userProfile?.uid) {
      toast.error(t("لا يمكنك تغيير دور حسابك الحالي بنفسك", "You cannot modify your own role"));
      return;
    }
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateUserRole(uid, newRole);
      toast.success(
        t(
          `تم تغيير دور المستخدم إلى ${newRole === "admin" ? "مشرف" : "شريك"}`,
          `User role changed to ${newRole === "admin" ? "Admin" : "Partner"}`,
        ),
      );
    } catch (err) {
      // Error handled
    }
  }

  // --- Modal/Animation variants ---
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  } as const;

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, damping: 25, stiffness: 300 },
    },
    exit: { opacity: 0, scale: 0.95, y: 20 },
  } as const;

  return (
    <div className="space-y-6 animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            {t("إدارة مستخدمي المنصة", "Platform User Management")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t(
              "إنشاء، تعديل، وحذف حسابات الشركاء والمديرين والتحكم في الصلاحيات",
              "Create, edit, and delete partner or administrator profiles, and control roles",
            )}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>{t("إضافة مستخدم جديد", "Add New User")}</span>
        </button>
      </div>

      {/* Search & Filters - with professional custom dropdown */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center relative z-20">
        {/* Search Input */}
        <div className="flex items-center relative flex-1 max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/10">
          <Search
            className={`pointer-events-none absolute ${isRtl ? "right-4" : "left-4"} top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500`}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("البحث بالاسم أو البريد الإلكتروني...", "Search by name or email...")}
            className={`w-full bg-transparent py-2.5 ${isRtl ? "pr-11 pl-4" : "pl-11 pr-4"} text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 border-none focus:ring-0`}
          />
        </div>

        {/* Role Filter - Professional Custom Select */}
        <div className="min-w-[160px]">
          <CustomSelect
            value={roleFilter}
            onChange={(val) => setRoleFilter(val as "all" | "admin" | "user")}
            options={roleOptions}
            placeholder={t("جميع الأدوار", "All Roles")}
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((userItem) => (
            <div
              key={userItem.uid}
              className="relative overflow-hidden rounded-2xl border border-slate-200/65 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-850 dark:bg-slate-900 flex flex-col justify-between"
            >
              {/* Decorative side accent */}
              <div
                className={`absolute ${isRtl ? "right-0" : "left-0"} top-0 bottom-0 w-1.5 ${
                  userItem.role === "admin" ? "bg-red-500" : "bg-purple-500"
                }`}
              />

              <div className={isRtl ? "pr-2 space-y-4" : "pl-2 space-y-4"}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-purple-600 dark:text-purple-400">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {userItem.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span>{userItem.email}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black ${
                      userItem.role === "admin"
                        ? "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                        : "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
                    }`}
                  >
                    {userItem.role === "admin" ? (
                      <>
                        <ShieldAlert className="h-3 w-3" />
                        <span>{t("مشرف", "Admin")}</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3 w-3" />
                        <span>{t("شريك", "Partner")}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{t("تاريخ التسجيل:", "Registered:")}</span>
                  <span className="font-mono">
                    {new Date(userItem.createdAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div
                className={`mt-5 ${isRtl ? "pr-2" : "pl-2"} flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleRole(userItem.uid, userItem.role)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${
                    userItem.role === "admin"
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                  }`}
                  disabled={userItem.uid === userProfile?.uid}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>
                    {userItem.role === "admin"
                      ? t("تنزيل كشريك", "Demote")
                      : t("ترقية لمدير", "Promote")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingUser(userItem)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition"
                  title={t("عرض تفاصيل الشريك الكاملة", "View Full Partner Details")}
                >
                  <Eye className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(userItem)}
                  className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-lg transition"
                  title={t("تعديل", "Edit")}
                >
                  <Edit className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => openDeleteDialog(userItem)}
                  className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 rounded-lg transition"
                  disabled={userItem.uid === userProfile?.uid}
                  title={t("حذف", "Delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-2xl p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 mb-3">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold">
              {t("لم يتم العثور على أي مستخدمين", "No users found")}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                "تأكد من كتابة الاسم أو البريد بشكل صحيح.",
                "Ensure names or email queries are typed correctly.",
              )}
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ADD USER MODAL - with higher z-index and button role selection */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className={`absolute ${isRtl ? "left-4" : "right-4"} top-4 p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition`}
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-sm font-black text-slate-800 dark:text-white mb-1">
                {t("إضافة مستخدم جديد للمنصة", "Add New Platform User")}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-5">
                {t(
                  "قم بتعبئة بيانات الحساب لتوليد صلاحيات جديدة",
                  "Fill in account details to generate credentials",
                )}
              </p>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("الاسم الكامل", "Full Name")}
                  </label>
                  <div className="relative">
                    <UserIcon
                      className={`pointer-events-none absolute ${isRtl ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400`}
                    />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("محمد أحمد", "John Doe")}
                      className={`w-full rounded-lg border border-slate-200 bg-transparent py-2.5 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"} text-xs outline-none focus:border-purple-500 dark:border-slate-800 focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-white`}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("البريد الإلكتروني", "Email Address")}
                  </label>
                  <div className="relative">
                    <Mail
                      className={`pointer-events-none absolute ${isRtl ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400`}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`w-full rounded-lg border border-slate-200 bg-transparent py-2.5 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"} text-xs outline-none focus:border-purple-500 dark:border-slate-800 focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-white`}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("كلمة المرور المؤقتة", "Temporary Password")}
                  </label>
                  <div className="relative">
                    <Lock
                      className={`pointer-events-none absolute ${isRtl ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400`}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-lg border border-slate-200 bg-transparent py-2.5 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"} text-xs outline-none focus:border-purple-500 dark:border-slate-800 focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-white`}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Role Selection - Buttons (not dropdown) */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("صلاحية المستخدم", "User Authorization Role")}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("user")}
                      className={`p-3 rounded-lg border text-center transition font-bold text-xs flex flex-col items-center gap-1.5 ${
                        role === "user"
                          ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:border-purple-500 dark:bg-purple-500/20 dark:text-purple-400"
                          : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>{t("شريك (Partner)", "Partner")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("admin")}
                      className={`p-3 rounded-lg border text-center transition font-bold text-xs flex flex-col items-center gap-1.5 ${
                        role === "admin"
                          ? "border-red-500 bg-red-500/10 text-red-600 dark:border-red-500 dark:bg-red-500/20 dark:text-red-400"
                          : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span>{t("مشرف (Admin)", "Admin")}</span>
                    </button>
                  </div>
                </div>

                {/* Permissions Grid */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350">
                      {t("صلاحيات مخصصة للمستخدم", "Custom User Permissions / Modules")}
                    </label>
                  </div>
                  
                  {(() => {
                    const isAllSelected = PERMISSIONS_LIST.every(p => selectedPermissions.includes(p.key));
                    return (
                      <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={permSearch}
                            onChange={(e) => setPermSearch(e.target.value)}
                            placeholder={t("البحث في الصلاحيات...", "Search permissions...")}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                          />
                          <Search className={`absolute top-2.5 h-3.5 w-3.5 text-slate-400 ${isRtl ? "right-2.5" : "left-2.5"}`} />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-350 shrink-0">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPermissions(PERMISSIONS_LIST.map(p => p.key));
                              } else {
                                setSelectedPermissions([]);
                              }
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="font-bold">{t("تحديد الكل", "Select All")}</span>
                        </label>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    {(() => {
                      const filtered = PERMISSIONS_LIST.filter(p =>
                        p.key.toLowerCase().includes(permSearch.toLowerCase()) ||
                        t(p.labelAr, p.labelEn).toLowerCase().includes(permSearch.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="col-span-full text-center py-4 text-xs text-slate-400">
                            {t("لا توجد صلاحيات مطابقة", "No matching permissions found.")}
                          </div>
                        );
                      }
                      return filtered.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.key);
                        return (
                          <label key={perm.key} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition text-[11px] text-slate-750 dark:text-slate-350">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedPermissions(selectedPermissions.filter(k => k !== perm.key));
                                } else {
                                  setSelectedPermissions([...selectedPermissions, perm.key]);
                                }
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span>{t(perm.labelAr, perm.labelEn)}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-slate-700 dark:text-slate-300"
                  >
                    {t("إلغاء", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t("جاري الحفظ...", "Saving...")}</span>
                      </>
                    ) : (
                      <span>{t("إنشاء الحساب", "Create Account")}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* EDIT USER MODAL - with higher z-index and button role selection */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsEditModalOpen(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className={`absolute ${isRtl ? "left-4" : "right-4"} top-4 p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition`}
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-sm font-black text-slate-800 dark:text-white mb-1">
                {t("تعديل المستخدم", "Edit User")}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-5">
                {t("تعديل اسم المستخدم وصلاحياته", "Edit user name and permissions")}
              </p>

              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("الاسم الكامل", "Full Name")}
                  </label>
                  <div className="relative">
                    <UserIcon
                      className={`pointer-events-none absolute ${isRtl ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400`}
                    />
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`w-full rounded-lg border border-slate-200 bg-transparent py-2.5 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"} text-xs outline-none focus:border-purple-500 dark:border-slate-800 focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-white`}
                    />
                  </div>
                </div>

                {/* Role Selection - Buttons (not dropdown) */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("صلاحية المستخدم", "User Authorization Role")}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={selectedUser?.uid === userProfile?.uid}
                      onClick={() => setEditRole("user")}
                      className={`p-3 rounded-lg border text-center transition font-bold text-xs flex flex-col items-center gap-1.5 ${
                        selectedUser?.uid === userProfile?.uid
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      } ${
                        editRole === "user"
                          ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:border-purple-500 dark:bg-purple-500/20 dark:text-purple-400"
                          : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>{t("شريك (Partner)", "Partner")}</span>
                    </button>
                    <button
                      type="button"
                      disabled={selectedUser?.uid === userProfile?.uid}
                      onClick={() => setEditRole("admin")}
                      className={`p-3 rounded-lg border text-center transition font-bold text-xs flex flex-col items-center gap-1.5 ${
                        selectedUser?.uid === userProfile?.uid
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      } ${
                        editRole === "admin"
                          ? "border-red-500 bg-red-500/10 text-red-600 dark:border-red-500 dark:bg-red-500/20 dark:text-red-400"
                          : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span>{t("مشرف (Admin)", "Admin")}</span>
                    </button>
                  </div>
                </div>
                {/* Permissions Grid */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350">
                      {t("صلاحيات مخصصة للمستخدم", "Custom User Permissions / Modules")}
                    </label>
                  </div>
                  
                  {(() => {
                    const isAllSelected = PERMISSIONS_LIST.every(p => editPermissions.includes(p.key));
                    return (
                      <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={editPermSearch}
                            onChange={(e) => setEditPermSearch(e.target.value)}
                            placeholder={t("البحث في الصلاحيات...", "Search permissions...")}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                          />
                          <Search className={`absolute top-2.5 h-3.5 w-3.5 text-slate-400 ${isRtl ? "right-2.5" : "left-2.5"}`} />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-350 shrink-0">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditPermissions(PERMISSIONS_LIST.map(p => p.key));
                              } else {
                                setEditPermissions([]);
                              }
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="font-bold">{t("تحديد الكل", "Select All")}</span>
                        </label>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    {(() => {
                      const filtered = PERMISSIONS_LIST.filter(p =>
                        p.key.toLowerCase().includes(editPermSearch.toLowerCase()) ||
                        t(p.labelAr, p.labelEn).toLowerCase().includes(editPermSearch.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="col-span-full text-center py-4 text-xs text-slate-400">
                            {t("لا توجد صلاحيات مطابقة", "No matching permissions found.")}
                          </div>
                        );
                      }
                      return filtered.map((perm) => {
                        const isChecked = editPermissions.includes(perm.key);
                        return (
                          <label key={perm.key} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition text-[11px] text-slate-750 dark:text-slate-350">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setEditPermissions(editPermissions.filter(k => k !== perm.key));
                                } else {
                                  setEditPermissions([...editPermissions, perm.key]);
                                }
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span>{t(perm.labelAr, perm.labelEn)}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-slate-700 dark:text-slate-300"
                  >
                    {t("إلغاء", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    {editLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t("جاري الحفظ...", "Saving...")}</span>
                      </>
                    ) : (
                      <span>{t("تحديث", "Update")}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* VIEW PARTNER FULL DETAILS MODAL FOR ADMIN */}
      {/* ============================================================ */}
      <AnimatePresence>
        {viewingUser && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setViewingUser(null)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[85vh] overflow-y-auto scrollbar-thin"
            >
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className={`absolute ${isRtl ? "left-4" : "right-4"} top-4 p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition`}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-600 dark:text-purple-400 font-bold">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {viewingUser.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {viewingUser.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {viewingUser.role === "admin" ? t("مشرف النظام", "Admin") : t("شريك تسويق", "Partner")}
                    </span>
                    {viewingUser.rulesAcknowledged && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {t("أقر بالقواعد ✓", "Rules Agreed ✓")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Meta Ad & Tracking Section */}
                <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15 space-y-2">
                  <div className="font-black text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span>{t("الحساب الإعلاني وبيانات Meta", "Ad Account & Meta Tracking")}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t("اسم الحساب الإعلاني:", "Ad Account Name:")}</span>
                      <span className="font-bold">{viewingUser.adAccountName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t("معرف BM Meta:", "BM ID:")}</span>
                      <span className="font-mono font-bold text-purple-500">{viewingUser.businessManagerId || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t("معرف البيكسل (Pixel ID):", "Pixel ID:")}</span>
                      <span className="font-mono font-bold text-purple-500">{viewingUser.pixelId || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t("اسم البزنس:", "Business Name:")}</span>
                      <span className="font-bold">{viewingUser.businessName || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Contact & Location Section */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    <span>{t("بيانات التواصل والموقع", "Contact & Location")}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t("رقم الواتساب:", "WhatsApp:")}</span>
                      <span className="font-bold font-mono">{viewingUser.whatsappNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t("الدولة:", "Country:")}</span>
                      <span className="font-bold">{viewingUser.country || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details Section */}
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-1.5">
                  <div className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    <span>{t("تفاصيل استلام العمولات والأرباح", "Payout & Commission Details")}</span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {viewingUser.paymentMethod || viewingUser.paymentDetails || t("لم يتم تحديد طريقة الدفع", "No payment method specified")}
                  </p>
                </div>

                {/* Testimonials & Proof */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span>{t("شهادات وآراء العملاء والإثباتات", "Testimonials & Proof of Results")}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {viewingUser.testimonials || t("لا توجد شهادات مسجلة", "No testimonials specified")}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setViewingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition"
                >
                  {t("إغلاق", "Close")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isDeleteDialogOpen && selectedUser && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsDeleteDialogOpen(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center"
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {t("تأكيد الحذف", "Confirm Delete")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {t(
                  `هل أنت متأكد من حذف "${selectedUser.name}" نهائياً؟`,
                  `Are you sure you want to delete "${selectedUser.name}" permanently?`,
                )}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {t(
                  "جميع البيانات المرتبطة بهذا المستخدم ستُحذف.",
                  "All data associated with this user will be deleted.",
                )}
              </p>
              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
                >
                  {t("إلغاء", "Cancel")}
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-500/20 transition"
                >
                  {t("حذف", "Delete")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
