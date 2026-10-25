import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CreditCard, Smartphone, Building2, Wallet, Plus, CheckCircle2 
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useTranslation } from '../hooks/useTranslation'

type ManualMethodKey = 'vodafone' | 'instapay' | 'etisalat' | 'orange' | 'bank' | 'stc'

export default function PaymentMethodsPage() {
  const { t } = useTranslation()
  const [activeManual, setActiveManual] = useState<ManualMethodKey | null>(null)
  const [addedMethods, setAddedMethods] = useState<ManualMethodKey[]>([])

  const handleSelectManual = (key: ManualMethodKey) => {
    setActiveManual(key)
  }

  const handleAddMethod = () => {
    if (activeManual && !addedMethods.includes(activeManual)) {
      setAddedMethods([...addedMethods, activeManual])
      setActiveManual(null)
    }
  }

  const manualOptions: { key: ManualMethodKey; icon: React.ReactNode }[] = [
    { key: 'vodafone', icon: <Smartphone size={20} /> },
    { key: 'instapay', icon: <Smartphone size={20} /> },
    { key: 'etisalat', icon: <Smartphone size={20} /> },
    { key: 'orange', icon: <Smartphone size={20} /> },
    { key: 'bank', icon: <Building2 size={20} /> },
    { key: 'stc', icon: <Wallet size={20} /> },
  ]

  const gateways = [
    { id: 'stripe', name: 'Stripe', descKey: 'stripeDesc' },
    { id: 'paypal', name: 'PayPal', descKey: 'paypalDesc' },
    { id: 'paytabs', name: 'PayTabs', descKey: 'paytabsDesc' },
    { id: 'fawry', name: 'Fawry / Kashier', descKey: 'fawryDesc' },
  ]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0 10px 40px', maxWidth: 1200, margin: '0 auto' }}
    >
      <header style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{t('paymentMethods.title')}</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{t('paymentMethods.subtitle')}</p>
      </header>

      {/* Manual Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t('paymentMethods.manualSection.title')}</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16 }}>{t('paymentMethods.manualSection.desc')}</p>
        
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t('paymentMethods.manualSection.subLabel')}</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 20
          }}>
            {manualOptions.map((opt) => {
              const isSelected = activeManual === opt.key
              const isAdded = addedMethods.includes(opt.key)
              return (
                <motion.div
                  key={opt.key}
                  whileHover={!isAdded ? { scale: 1.02 } : {}}
                  onClick={() => !isAdded && handleSelectManual(opt.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: 16, borderRadius: 12, cursor: isAdded ? 'default' : 'pointer',
                    background: isSelected ? 'var(--ig-grad-45)' : 'var(--surface-2)',
                    color: isSelected ? '#fff' : (isAdded ? 'var(--text-3)' : 'var(--text-1)'),
                    border: isSelected ? 'none' : '1px solid var(--border)',
                    opacity: isAdded ? 0.6 : 1,
                    position: 'relative',
                    transition: 'background 0.2s, border 0.2s, color 0.2s'
                  }}
                >
                  {isAdded && (
                    <div style={{ position: 'absolute', top: 8, insetInlineEnd: 8, color: '#2ECC71' }}>
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                  {opt.icon}
                  <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                    {t(`paymentMethods.manualSection.options.${opt.key}`)}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {activeManual && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginBottom: 20 }}>
              <Button onClick={handleAddMethod} style={{ width: '100%', maxWidth: 200 }}>
                <Plus size={16} /> {t(`paymentMethods.manualSection.options.${activeManual}`)}
              </Button>
            </motion.div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t('paymentMethods.manualSection.addedMethods')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {addedMethods.map(key => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(46,204,113,0.1)', color: '#2ECC71', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid rgba(46,204,113,0.2)' }}>
                  <CheckCircle2 size={14} />
                  {t(`paymentMethods.manualSection.options.${key}`)}
                </div>
              ))}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px dashed var(--text-3)', color: 'var(--text-3)', cursor: 'pointer'
              }}>
                <Plus size={14} /> {t('paymentMethods.manualSection.addPlaceholder')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gateways Section */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t('paymentMethods.gatewaysSection.title')}</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16 }}>{t('paymentMethods.gatewaysSection.desc')}</p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16
        }}>
          {gateways.map(gateway => (
            <Card key={gateway.id} style={{ display: 'flex', flexDirection: 'column', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={18} color="var(--text-2)" />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>{gateway.name}</h3>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(244,91,105,0.1)', color: '#F45B69' }}>
                  {t('paymentMethods.gatewaysSection.status.disconnected')}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
                {t(`paymentMethods.gatewaysSection.gateways.${gateway.descKey}`)}
              </p>
              <Button style={{ width: '100%' }}>{t('paymentMethods.gatewaysSection.connectBtn')}</Button>
            </Card>
          ))}
        </div>
      </section>
    </motion.div>
  )
}
