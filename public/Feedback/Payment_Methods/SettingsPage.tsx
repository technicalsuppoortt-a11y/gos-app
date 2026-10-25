import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  User, Mail, Phone, Globe, CreditCard, Calendar, Zap, Shield,
  Link2, Unlink, CheckCircle2, Loader2, Moon, Sun,
  Copy, RefreshCw, Settings, Camera, Share2,
  Check, Info, Lock, Star, Users
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import {
  fetchUserProfile,
  updateUserProfile,
  fetchMetaConnection,
  disconnectMeta,
  connectMetaOAuth,
  buildMetaOAuthUrl,
  type UserProfileData,
  type MetaConnectionData,
} from '../services/user/userSettingsService'

// ─── Animation variants ───────────────────────────────────────────────────
const pageVariants: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10 },
}
const tabContentVariants: Variants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -12 },
}

// ─── Types ────────────────────────────────────────────────────────────────
type MainTab = 'main' | 'meta'

// ─── Scope badges ─────────────────────────────────────────────────────────
const REQUIRED_SCOPES = [
  { key: 'public_profile', label: 'Public Profile' },
  { key: 'pages_show_list', label: 'Pages List' },
  { key: 'pages_read_engagement', label: 'Page Engagement' },
  { key: 'instagram_manage_insights', label: 'Manage Insights' },
  { key: 'instagram_basic', label: 'Instagram Basic' },
  { key: 'instagram_content_publish', label: 'Content Publish' }
]

// ─── Prerequisite checklist ───────────────────────────────────────────────
const PREREQUISITES = [
  {
    icon: Share2,
    title: 'حساب Facebook Business',
    desc: 'يجب أن يكون حسابك متصلاً بـ Facebook Business Manager.',
  },
  {
    icon: Globe,
    title: 'صفحة Facebook نشطة',
    desc: 'يجب ربط صفحة Facebook بحساب Instagram الاحترافي.',
  },
  {
    icon: Camera,
    title: 'حساب Instagram احترافي',
    desc: 'حوّل حسابك من شخصي إلى "حساب أعمال" أو "حساب منشئ محتوى".',
  },
  {
    icon: Link2,
    title: 'ربط Instagram بالصفحة',
    desc: 'في إعدادات صفحة Facebook → Instagram → اربط حسابك.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '24px 28px',
        marginBottom: 20,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--ig-grad-45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={17} color="#fff" />
      </span>
      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{children}</span>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
  icon: Icon,
  placeholder,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  disabled?: boolean
  icon?: React.ElementType
  placeholder?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-2)',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <span
            style={{
              position: 'absolute',
              insetInlineStart: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-3)',
              display: 'flex',
            }}
          >
            <Icon size={15} />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            width: '100%',
            paddingTop: 11,
            paddingBottom: 11,
            paddingInlineStart: Icon ? 40 : 14,
            paddingInlineEnd: 14,
            background: disabled ? 'var(--surface-2)' : 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontSize: 14,
            color: disabled ? 'var(--text-3)' : 'var(--text-1)',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, userData } = useAuth()
  const { language, setLanguage, theme, toggleTheme, checkMetaConnection } = useApp()
  const { showToast } = useToast()
  const isRTL = language === 'ar'

  // ── Active tab
  const [activeTab, setActiveTab] = useState<MainTab>('main')

  // ── Profile form state
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formCountryCode, setFormCountryCode] = useState('+20')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)

  // ── Meta connection state
  const [metaConn, setMetaConn] = useState<MetaConnectionData>({ isMetaConnected: false })
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaConnecting, setMetaConnecting] = useState(false)
  const [metaDisconnecting, setMetaDisconnecting] = useState(false)
  const oauthPopupRef = useRef<Window | null>(null)

  // ── Load data on mount
  useEffect(() => {
    if (!user?.uid) { setProfileLoading(false); setMetaLoading(false); return }

    fetchUserProfile(user.uid).then((p) => {
      if (p) {
        setProfile(p)
        setFormName(p.displayName)
        setFormPhone(p.phone)
        setFormCountryCode(p.countryCode || '+20')
      }
      setProfileLoading(false)
    })

    fetchMetaConnection(user.uid).then((conn) => {
      setMetaConn(conn)
      setMetaLoading(false)
    })
  }, [user?.uid])

  // ── Listen for OAuth callback message from popup
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'META_OAUTH_CODE') return
      const { code } = event.data
      if (!code || !user?.uid) return

      oauthPopupRef.current?.close()
      setMetaConnecting(true)
      try {
        const result = await connectMetaOAuth(user.uid, code)
        setMetaConn(result)
        showToast('تم ربط حساب Instagram بنجاح! 🎉', 'success')
        await checkMetaConnection()
      } catch (err: any) {
        console.error('[SettingsPage] Meta OAuth error:', err)
        showToast(err?.message || 'فشل الربط بـ Meta. يرجى المحاولة مجدداً.', 'error')
      } finally {
        setMetaConnecting(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [user?.uid, showToast, checkMetaConnection])

  // ── Handlers
  const handleSaveProfile = useCallback(async () => {
    if (!user?.uid) return
    setProfileSaving(true)
    try {
      await updateUserProfile(user.uid, {
        displayName: formName,
        phone: formPhone,
        countryCode: formCountryCode,
      })
      showToast('تم حفظ البيانات بنجاح ✓', 'success')
    } catch {
      showToast('حدث خطأ أثناء الحفظ. حاول مجدداً.', 'error')
    } finally {
      setProfileSaving(false)
    }
  }, [user?.uid, formName, formPhone, formCountryCode, showToast])

  const handleConnectMeta = useCallback(() => {
    const appId = import.meta.env.VITE_META_APP_ID
    if (!appId) {
      showToast('يرجى إضافة VITE_META_APP_ID في ملف .env', 'error')
      return
    }
    const oauthUrl = buildMetaOAuthUrl()
    const popup = window.open(
      oauthUrl,
      'meta_oauth',
      'width=600,height=700,left=200,top=100,toolbar=no,menubar=no'
    )
    oauthPopupRef.current = popup
    setMetaConnecting(true)

    // If popup closes without sending a code, reset state
    const checker = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checker)
        setMetaConnecting(false)
      }
    }, 800)
  }, [showToast])

  const handleDisconnectMeta = useCallback(async () => {
    if (!user?.uid) return
    setMetaDisconnecting(true)
    try {
      await disconnectMeta(user.uid)
      setMetaConn({ isMetaConnected: false })
      showToast('تم قطع الاتصال بـ Meta بنجاح.', 'success')
      await checkMetaConnection()
    } catch {
      showToast('حدث خطأ أثناء قطع الاتصال.', 'error')
    } finally {
      setMetaDisconnecting(false)
    }
  }, [user?.uid, showToast, checkMetaConnection])

  const resolvedName =
    userData?.displayName || userData?.ownerName || userData?.name || userData?.fullName || 'مستخدم'

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* ── Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            background: 'var(--ig-grad-45)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 6,
          }}
        >
          الإعدادات
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
          أدِر ملفك الشخصي وتفضيلاتك وتكاملات الحسابات
        </p>
      </div>

      {/* ── Horizontal Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 6,
          marginBottom: 28,
          width: 'fit-content',
        }}
      >
        {(
          [
            { id: 'main', label: 'الإعدادات الرئيسية', icon: Settings },
            { id: 'meta', label: 'Meta و Instagram', icon: Camera },
          ] as { id: MainTab; label: string; icon: React.ElementType }[]
        ).map(({ id, label, icon: TabIcon }) => {
          const isActive = activeTab === id
          return (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id)}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                transition: 'all 0.2s',
                background: isActive ? 'var(--ig-grad-45)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-2)',
                boxShadow: isActive ? '0 4px 14px -2px rgba(131,56,236,0.4)' : 'none',
                position: 'relative',
              }}
            >
              <TabIcon size={16} />
              {label}
              {id === 'meta' && metaConn.isMetaConnected && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4ade80',
                    display: 'inline-block',
                    boxShadow: '0 0 6px rgba(74,222,128,0.7)',
                  }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* ── Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'main' && (
          <motion.div
            key="main"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)',
                gap: 20,
                alignItems: 'start',
              }}
            >
              {/* Left Column */}
              <div>
                {/* ── Account Profile Card */}
                <SectionCard>
                  <SectionTitle icon={User}>معلومات الحساب</SectionTitle>

                  {profileLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', padding: '20px 0' }}>
                      <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>جاري تحميل البيانات...</span>
                    </div>
                  ) : (
                    <>
                      {/* Avatar + name preview */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          marginBottom: 24,
                          padding: '14px 18px',
                          background: 'var(--surface-2)',
                          borderRadius: 14,
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            background: 'var(--ig-grad-45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            fontWeight: 800,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {(formName || resolvedName).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>
                            {formName || resolvedName}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                            {profile?.email || user?.email || ''}
                          </div>
                        </div>
                      </div>

                      <InputField
                        label="الاسم الكامل"
                        value={formName}
                        onChange={setFormName}
                        icon={User}
                        placeholder="أدخل اسمك الكامل"
                      />
                      <InputField
                        label="البريد الإلكتروني"
                        value={profile?.email || user?.email || ''}
                        type="email"
                        disabled
                        icon={Mail}
                      />
                      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <div style={{ flexShrink: 0, width: 90 }}>
                          <InputField
                            label="الرمز"
                            value={formCountryCode}
                            onChange={setFormCountryCode}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <InputField
                            label="رقم الهاتف"
                            value={formPhone}
                            onChange={setFormPhone}
                            icon={Phone}
                            placeholder="01XXXXXXXXX"
                          />
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                        style={{
                          width: '100%',
                          height: 46,
                          borderRadius: 12,
                          background: 'var(--ig-grad-45)',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 14,
                          border: 'none',
                          cursor: profileSaving ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          boxShadow: '0 8px 20px -4px rgba(131,56,236,0.45)',
                          opacity: profileSaving ? 0.7 : 1,
                        }}
                      >
                        {profileSaving ? (
                          <>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            حفظ التغييرات
                          </>
                        )}
                      </motion.button>
                    </>
                  )}
                </SectionCard>

                {/* ── System Preferences */}
                <SectionCard>
                  <SectionTitle icon={Settings}>تفضيلات النظام</SectionTitle>

                  {/* Language */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-2)',
                        marginBottom: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      لغة الواجهة
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {(['ar', 'en'] as const).map((lang) => (
                        <motion.button
                          key={lang}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setLanguage(lang)}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            borderRadius: 12,
                            border: `2px solid ${language === lang ? 'rgba(131,56,236,0.6)' : 'var(--border)'}`,
                            background: language === lang ? 'rgba(131,56,236,0.12)' : 'var(--surface-2)',
                            color: language === lang ? '#c084fc' : 'var(--text-2)',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          {language === lang && <Check size={14} />}
                          {lang === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Theme */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-2)',
                        marginBottom: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      مظهر التطبيق
                    </label>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={toggleTheme}
                      style={{
                        width: '100%',
                        padding: '12px 18px',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text-1)',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                        {theme === 'dark' ? 'الوضع الداكن' : 'الوضع الفاتح'}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-3)',
                          background: 'var(--surface)',
                          padding: '3px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                        }}
                      >
                        تبديل
                      </span>
                    </motion.button>
                  </div>
                </SectionCard>
              </div>

              {/* Right Column — Subscription */}
              <div>
                {/* ── Current Plan Card */}
                <div
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 18,
                    padding: '24px 24px 20px',
                    marginBottom: 20,
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1.5px solid transparent',
                    backgroundImage:
                      'linear-gradient(var(--surface), var(--surface)), var(--ig-grad-45)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                >
                  {/* Glow effect */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -40,
                      insetInlineEnd: -40,
                      width: 150,
                      height: 150,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(131,56,236,0.15) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />

                  <SectionTitle icon={Star}>اشتراكك الحالي</SectionTitle>

                  {/* Plan badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--ig-grad-45)',
                      borderRadius: 10,
                      padding: '6px 14px',
                      marginBottom: 18,
                    }}
                  >
                    <Star size={14} color="#fff" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                      {profile?.planTier || profile?.planName || 'Creator Starter'}
                    </span>
                  </div>

                  {[
                    {
                      label: 'الرصيد الشهري',
                      icon: Zap,
                      value: `${profile?.credits ?? 500} رصيد`,
                    },
                    {
                      label: 'حسابات Instagram',
                      icon: Camera,
                      value: '1',
                    },
                    {
                      label: 'أعضاء الفريق',
                      icon: Users,
                      value: String(profile?.teamMembers ?? 1),
                    },
                    {
                      label: 'تاريخ التجديد',
                      icon: Calendar,
                      value: profile?.renewalDate || 'شهري',
                    },
                  ].map(({ label, icon: Icon, value }) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: 'var(--text-2)',
                        }}
                      >
                        <Icon size={14} />
                        {label}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{value}</span>
                    </div>
                  ))}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%',
                      marginTop: 18,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--ig-grad-45)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: '0 6px 16px -4px rgba(131,56,236,0.45)',
                    }}
                  >
                    ترقية الباقة
                  </motion.button>
                </div>

                {/* ── Payment Method Card */}
                <SectionCard>
                  <SectionTitle icon={CreditCard}>طريقة الدفع</SectionTitle>

                  {/* Card preview */}
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 40,
                        height: 26,
                        borderRadius: 5,
                        background: 'linear-gradient(135deg,#1a1f71,#3a86ff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        color: '#fff',
                      }}
                    >
                      VISA
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>•••• •••• •••• 4242</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        آخر فاتورة: 149.00 EGP
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%',
                      height: 40,
                      borderRadius: 12,
                      background: 'transparent',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text-2)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <RefreshCw size={14} />
                    تعديل طريقة الدفع
                  </motion.button>
                </SectionCard>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'meta' && (
          <motion.div
            key="meta"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
                gap: 20,
                alignItems: 'start',
              }}
            >
              {/* Left: Connection Panel */}
              <div>
                <SectionCard>
                  <SectionTitle icon={Link2}>ربط حساب Meta و Instagram</SectionTitle>

                  {metaLoading ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: 'var(--text-3)',
                        padding: '24px 0',
                        justifyContent: 'center',
                      }}
                    >
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>جاري التحقق من حالة الاتصال...</span>
                    </div>
                  ) : metaConn.isMetaConnected ? (
                    /* ── Connected State */
                    <>
                      {/* Status badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: 'rgba(74,222,128,0.08)',
                          border: '1px solid rgba(74,222,128,0.3)',
                          borderRadius: 12,
                          padding: '12px 16px',
                          marginBottom: 20,
                        }}
                      >
                        <CheckCircle2 size={18} color="#4ade80" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>
                            متصل بـ Meta
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                            {metaConn.connectedAt
                              ? `تم الربط في ${new Date(metaConn.connectedAt).toLocaleDateString('ar-EG')}`
                              : 'الاتصال نشط'}
                          </div>
                        </div>
                      </div>

                      {/* Instagram Account Card */}
                      <div
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 14,
                          padding: '16px 18px',
                          marginBottom: 20,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                        }}
                      >
                        {metaConn.instagramProfilePic ? (
                          <img
                            src={metaConn.instagramProfilePic}
                            alt="IG Profile"
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid rgba(131,56,236,0.4)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: '50%',
                              background: 'var(--ig-grad-45)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Camera size={24} color="#fff" />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>
                            @{metaConn.instagramUsername || 'instagram_user'}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-3)',
                              marginTop: 3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span>ID: {metaConn.instagramAccountId || '—'}</span>
                            {metaConn.instagramAccountId && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  navigator.clipboard.writeText(metaConn.instagramAccountId!)
                                  showToast('تم نسخ المعرّف ✓', 'success')
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 2,
                                  color: 'var(--text-3)',
                                  display: 'flex',
                                }}
                              >
                                <Copy size={11} />
                              </motion.button>
                            )}
                          </div>
                          {metaConn.facebookPageName && (
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--text-3)',
                                marginTop: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Share2 size={11} />
                              {metaConn.facebookPageName}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Granted Scopes */}
                      <div style={{ marginBottom: 20 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--text-2)',
                            marginBottom: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          الصلاحيات الممنوحة
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          {REQUIRED_SCOPES.map(({ key, label }) => (
                            <span
                              key={key}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '4px 10px',
                                borderRadius: 6,
                                background: 'rgba(74,222,128,0.1)',
                                color: '#4ade80',
                                border: '1px solid rgba(74,222,128,0.25)',
                              }}
                            >
                              <CheckCircle2 size={10} />
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Disconnect */}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleDisconnectMeta}
                        disabled={metaDisconnecting}
                        style={{
                          width: '100%',
                          height: 44,
                          borderRadius: 12,
                          background: 'transparent',
                          border: '1.5px solid rgba(239,68,68,0.5)',
                          color: '#ef4444',
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: metaDisconnecting ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          opacity: metaDisconnecting ? 0.6 : 1,
                        }}
                      >
                        {metaDisconnecting ? (
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Unlink size={16} />
                        )}
                        {metaDisconnecting ? 'جاري قطع الاتصال...' : 'قطع الاتصال بـ Meta'}
                      </motion.button>
                    </>
                  ) : (
                    /* ── Not Connected State */
                    <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                      {/* Big icon */}
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: 'rgba(131,56,236,0.12)',
                          border: '2px dashed rgba(131,56,236,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 18px',
                        }}
                      >
                        <Camera size={36} color="#c084fc" />
                      </div>

                      <h3
                        style={{
                          fontSize: 17,
                          fontWeight: 900,
                          color: 'var(--text-1)',
                          marginBottom: 8,
                        }}
                      >
                        اربط حساب Instagram
                      </h3>
                      <p
                        style={{
                          fontSize: 13,
                          color: 'var(--text-2)',
                          lineHeight: 1.7,
                          marginBottom: 24,
                          maxWidth: 360,
                          margin: '0 auto 24px',
                        }}
                      >
                        ربط حسابك يتيح نشر المحتوى تلقائياً، تتبع التحليلات، وإدارة الرسائل — كل ذلك من مكان واحد.
                      </p>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleConnectMeta}
                        disabled={metaConnecting}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '13px 28px',
                          borderRadius: 14,
                          background: 'linear-gradient(135deg,#1877f2 0%,#0866ff 100%)',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 15,
                          border: 'none',
                          cursor: metaConnecting ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          boxShadow: '0 8px 24px -4px rgba(24,119,242,0.5)',
                          opacity: metaConnecting ? 0.7 : 1,
                          marginBottom: 12,
                        }}
                      >
                        {metaConnecting ? (
                          <>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            جاري الاتصال...
                          </>
                        ) : (
                          <>
                            <Share2 size={18} />
                            ربط حساب Meta / Facebook
                          </>
                        )}
                      </motion.button>

                      {/* Required scopes list */}
                      <div
                        style={{
                          marginTop: 24,
                          textAlign: isRTL ? 'right' : 'left',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: '14px 16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-3)',
                            marginBottom: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          الصلاحيات المطلوبة
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {REQUIRED_SCOPES.map(({ key, label }) => (
                            <span
                              key={key}
                              style={{
                                fontSize: 11,
                                padding: '3px 9px',
                                borderRadius: 6,
                                background: 'rgba(131,56,236,0.1)',
                                color: '#c084fc',
                                fontWeight: 600,
                              }}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Right: Prerequisites Guide */}
              <div>
                <SectionCard>
                  <SectionTitle icon={Info}>المتطلبات الأساسية</SectionTitle>

                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-2)',
                      lineHeight: 1.7,
                      marginBottom: 18,
                    }}
                  >
                    تأكد من استيفاء الشروط التالية قبل ربط حسابك بـ Meta:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PREREQUISITES.map(({ icon: StepIcon, title, desc }, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 14,
                          padding: '14px 16px',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                        }}
                      >
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'rgba(131,56,236,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <StepIcon size={16} color="#c084fc" />
                        </span>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: 'var(--text-1)',
                              marginBottom: 4,
                            }}
                          >
                            {i + 1}. {title}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--text-2)',
                              lineHeight: 1.65,
                            }}
                          >
                            {desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Security note */}
                  <div
                    style={{
                      marginTop: 18,
                      display: 'flex',
                      gap: 10,
                      padding: '12px 14px',
                      background: 'rgba(234,179,8,0.08)',
                      border: '1px solid rgba(234,179,8,0.25)',
                      borderRadius: 10,
                    }}
                  >
                    <Shield size={16} color="#eab308" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 11.5, color: '#ca8a04', lineHeight: 1.65, margin: 0 }}>
                      نحن نطلب فقط الصلاحيات الضرورية. لن يتم مشاركة بياناتك أو رمز الوصول مع أي طرف ثالث.
                    </p>
                  </div>

                  {/* Lock / OAuth note */}
                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      gap: 10,
                      padding: '12px 14px',
                      background: 'rgba(131,56,236,0.06)',
                      border: '1px solid rgba(131,56,236,0.2)',
                      borderRadius: 10,
                    }}
                  >
                    <Lock size={16} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 11.5, color: '#a78bfa', lineHeight: 1.65, margin: 0 }}>
                      عملية المصادقة تتم عبر OAuth 2.0 الرسمي من Meta — يتم فتح نافذة Facebook الرسمية للموافقة.
                    </p>
                  </div>
                </SectionCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spinner keyframe (fallback if not in index.css) */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  )
}
