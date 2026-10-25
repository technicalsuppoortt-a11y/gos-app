import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Calendar, Check, Zap, ArrowUpRight, ShieldCheck, Phone, FileText, X } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../context/ToastContext'
import { 
  fetchCurrentSubscription, submitPlanRenewalRequest, 
  type SubscriptionPlanDetails 
} from '../../services/admin/adminSubscriptionService'

export function AdminPackagesPage() {
  const { t, language } = useTranslation()
  const { showToast } = useToast()
  const isRTL = language === 'ar'

  const [subData, setSubData] = useState<SubscriptionPlanDetails | null>(null)
  const [loading, setLoading] = useState(true)

  // Renewal Modal
  const [showModal, setShowModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('Pro Business Plan')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadSubscription = async () => {
    setLoading(true)
    try {
      const data = await fetchCurrentSubscription()
      setSubData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  const handleSubmitRenewal = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await submitPlanRenewalRequest({
        requestedPlan: selectedPlan,
        contactPhone,
        notes
      })
      showToast('تم إرسال طلب التجديد/الترقية بنجاح! سيتواصل معك فريق المبيعات فوراً.', 'success')
      setShowModal(false)
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء إرسال الطلب', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const plansList = [
    { name: 'Creator Starter', price: '$99 / شهرياً', users: 'حتى 3 مستخدمين', tokens: '30,000 توكن AI', badge: 'للمستقلين' },
    { name: 'Pro Business Plan', price: '$299 / شهرياً', users: 'حتى 10 مستخدمين', tokens: '100,000 توكن AI', badge: 'الأكثر شعبية', isCurrent: true },
    { name: 'Enterprise Unlimited', price: '$799 / شهرياً', users: 'مستخدمين بلا حدود', tokens: 'توكنات بلا حدود', badge: 'للشركات الكبرى' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
          الباقات والاشتراكات (Plans & Subscriptions)
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
          إدارة خطة اشتراك البراند الحالية، متابعة أيام الصلاحية، وطلب الترقية والتجديد.
        </p>
      </div>

      {/* Active Subscription Status Card */}
      <div style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(131, 56, 236, 0.3)', borderRadius: 24, padding: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: 'rgba(131, 56, 236, 0.15)', color: '#c084fc', border: '1px solid rgba(131, 56, 236, 0.3)' }}>
              الاشتراك الحالي
            </span>
            <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>● نشط وفعال</span>
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff' }}>
            {subData?.planName || 'Pro Business Plan'}
          </h2>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: 'var(--text-2)', fontSize: 14, fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={16} /> السعر: {subData?.price || '$299 / شهرياً'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} /> المتبقي: {subData?.daysRemaining || 24} يوم</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { setSelectedPlan(subData?.planName || 'Pro Business Plan'); setShowModal(true); }}
            style={{
              background: 'var(--ig-grad-45)', color: '#fff',
              padding: '12px 24px', borderRadius: 14, fontWeight: 700, fontSize: 14,
              border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(131,56,236,0.4)'
            }}
          >
            تجديد أو ترقية الاشتراك
          </motion.button>
        </div>
      </div>

      {/* Plan Options Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plansList.map(plan => (
          <motion.div
            key={plan.name}
            whileHover={{ y: -4 }}
            style={{
              background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(16px)',
              border: plan.isCurrent ? '2px solid var(--ig-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                {plan.badge}
              </span>
              {plan.isCurrent && <span style={{ fontSize: 12, fontWeight: 800, color: '#4ade80' }}>خيارك الحالي</span>}
            </div>

            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 6 }}>{plan.name}</h3>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ig-primary)' }}>{plan.price}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, fontSize: 13.5, color: '#cbd5e1' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Check size={16} style={{ color: '#4ade80' }} /> {plan.users}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Check size={16} style={{ color: '#4ade80' }} /> {plan.tokens}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Check size={16} style={{ color: '#4ade80' }} /> استوديو إنتاج الفيديو والصوت</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Check size={16} style={{ color: '#4ade80' }} /> تحليلات الأداء اليومية</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { setSelectedPlan(plan.name); setShowModal(true); }}
              style={{
                marginTop: 10, width: '100%', height: 46, borderRadius: 12,
                background: plan.isCurrent ? 'var(--surface-2)' : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }}
            >
              {plan.isCurrent ? 'تجديد هذه الباقة' : 'اختيار وطلب الترقية'}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Renewal Request Modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              style={{
                position: 'relative', width: '100%', maxWidth: 440,
                backgroundColor: 'rgba(15, 23, 42, 0.94)', backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 24, padding: 32, zIndex: 110,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                  طلب تجديد / ترقية الاشتراك
                </h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmitRenewal} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>الباقة المطلوبة</label>
                  <select
                    value={selectedPlan}
                    onChange={e => setSelectedPlan(e.target.value)}
                    style={{ width: '100%', height: 48, backgroundColor: '#020617', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 12, color: '#ffffff', fontSize: 14, outline: 'none', padding: '0 14px' }}
                  >
                    <option value="Creator Starter">Creator Starter ($99/mo)</option>
                    <option value="Pro Business Plan">Pro Business Plan ($299/mo)</option>
                    <option value="Enterprise Unlimited">Enterprise Unlimited ($799/mo)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>رقم هاتف التواصل</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Phone size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRTL ? 'right' : 'left']: 16, color: '#64748b', pointerEvents: 'none' }} />
                    <input 
                      type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} required placeholder="01xxxxxxxxx"
                      style={{ width: '100%', height: 48, backgroundColor: '#020617', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 12, color: '#ffffff', fontSize: 14, outline: 'none', paddingLeft: isRTL ? 16 : 48, paddingRight: isRTL ? 48 : 16, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 13.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>ملاحظات إضافية (اختياري)</label>
                  <textarea 
                    value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="أي طلبات خاصة بشأن الفاتورة أو الخطة..."
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 12, color: '#ffffff', fontSize: 14, outline: 'none', padding: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <motion.button 
                  whileTap={{ scale: 0.97 }} 
                  type="submit" 
                  disabled={actionLoading}
                  style={{
                    marginTop: 8, height: 50, borderRadius: 12,
                    background: 'var(--ig-grad-45)', color: '#fff', fontWeight: 700, fontSize: 15,
                    border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 10px 25px -5px rgba(131, 56, 236, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>إرسال طلب التجديد</span>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default AdminPackagesPage
