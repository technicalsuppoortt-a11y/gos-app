import React from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, CreditCard, Users, CheckCircle, Clock, XCircle, ArrowUpRight } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'

interface Transaction {
  id: string
  client: string
  plan: string
  amount: string
  date: string
  status: 'completed' | 'pending' | 'failed'
}

const mockTransactions: Transaction[] = [
  { id: 'TX-9021', client: 'Zain Fashion', plan: 'Pro Business', amount: '$299', date: '2026-08-18', status: 'completed' },
  { id: 'TX-9022', client: 'TechPulse Media', plan: 'Enterprise Unlimited', amount: '$799', date: '2026-08-17', status: 'completed' },
  { id: 'TX-9023', client: 'Gourmet Bistro', plan: 'Creator Starter', amount: '$99', date: '2026-08-16', status: 'pending' },
  { id: 'TX-9024', client: 'Aura Skincare', plan: 'Pro Business', amount: '$299', date: '2026-08-15', status: 'completed' },
  { id: 'TX-9025', client: 'FitPulse Club', plan: 'Creator Starter', amount: '$99', date: '2026-08-14', status: 'failed' },
]

export default function SalesPage() {
  const { t } = useTranslation()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
          {t('superadmin.salesTitle', 'إدارة المبيعات والإيرادات')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
          {t('superadmin.salesSubtitle', 'المؤشرات المالية، خطط الاشتراك، ومتابعة العمليات المباشرة.')}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>إجمالي الإيرادات</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)' }}>$48,950</div>
          <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <ArrowUpRight size={14} /> +24% نمو سنوي
          </span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>الإيراد الشهري المكرر (MRR)</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(131, 56, 236, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)' }}>$12,400</div>
          <span style={{ fontSize: 12, color: '#c084fc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <ArrowUpRight size={14} /> +18% هذا الشهر
          </span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>الاشتراكات النشطة</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)' }}>128</div>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>عميل فعال</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>معدل التحويل</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)' }}>4.8%</div>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>من التجربة المجانية</span>
        </div>
      </div>

      {/* Revenue Visualizer Bar */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>توزيع الإيرادات الشهرية (2026)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, paddingTop: 20 }}>
          {[
            { month: 'يناير', value: 40 },
            { month: 'فبراير', value: 55 },
            { month: 'مارس', value: 70 },
            { month: 'أبريل', value: 65 },
            { month: 'مايو', value: 85 },
            { month: 'يونيو', value: 95 },
            { month: 'يوليو', value: 110 },
            { month: 'أغسطس', value: 130 },
          ].map((bar, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${(bar.value / 130) * 100}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                  style={{
                    width: '100%', borderRadius: '6px 6px 0 0',
                    background: idx === 7 ? 'var(--ig-grad-45)' : 'rgba(131, 56, 236, 0.3)',
                    borderTop: '2px solid #c084fc'
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{bar.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>آخر المعاملات المالية</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 13, fontWeight: 700 }}>
              <th style={{ padding: '16px 20px' }}>رقم المعاملة</th>
              <th style={{ padding: '16px 20px' }}>العميل</th>
              <th style={{ padding: '16px 20px' }}>الخطة</th>
              <th style={{ padding: '16px 20px' }}>المبلغ</th>
              <th style={{ padding: '16px 20px' }}>التاريخ</th>
              <th style={{ padding: '16px 20px' }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {mockTransactions.map(tx => (
              <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-2)' }}>{tx.id}</td>
                <td style={{ padding: '16px 20px', fontWeight: 700 }}>{tx.client}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-2)' }}>{tx.plan}</td>
                <td style={{ padding: '16px 20px', fontWeight: 700, color: '#4ade80' }}>{tx.amount}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-3)', fontSize: 13 }}>{tx.date}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700,
                    background: tx.status === 'completed' ? 'rgba(34, 197, 94, 0.12)' : tx.status === 'pending' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: tx.status === 'completed' ? '#4ade80' : tx.status === 'pending' ? '#f59e0b' : '#f87171',
                    border: tx.status === 'completed' ? '1px solid rgba(34, 197, 94, 0.25)' : tx.status === 'pending' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)'
                  }}>
                    {tx.status === 'completed' && <CheckCircle size={13} />}
                    {tx.status === 'pending' && <Clock size={13} />}
                    {tx.status === 'failed' && <XCircle size={13} />}
                    {tx.status === 'completed' ? 'مكتملة' : tx.status === 'pending' ? 'معلقة' : 'فشلت'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
