import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'

export interface SubscriptionPlanDetails {
  planName: string
  price: string
  billingCycle: string
  renewalDate: string
  daysRemaining: number
  features: string[]
  maxSubUsers: number
  aiTokensIncluded: number
}

export const fetchCurrentSubscription = async (brandId: string = 'b_zain'): Promise<SubscriptionPlanDetails> => {
  try {
    const defaultPlan: SubscriptionPlanDetails = {
      planName: 'Pro Business Plan',
      price: '$299 / شهرياً',
      billingCycle: 'شهري',
      renewalDate: '2026-09-12',
      daysRemaining: 24,
      maxSubUsers: 10,
      aiTokensIncluded: 100000,
      features: [
        'إصدار المحتوى بالذكاء الاصطناعي بلا حدود',
        'ربط حتى 10 حسابات انستجرام وتيك توك',
        'استوديو إنتاج الفيديو والصوت المتقدم',
        'تحليلات الأداء والمنافسين اليومية',
        'دعم فني مخصص على مدار 24/7'
      ]
    }

    const docRef = doc(db, 'subscriptions', brandId)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return snap.data() as SubscriptionPlanDetails
    }
    return defaultPlan
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return {
      planName: 'Pro Business Plan',
      price: '$299 / شهرياً',
      billingCycle: 'شهري',
      renewalDate: '2026-09-12',
      daysRemaining: 24,
      maxSubUsers: 10,
      aiTokensIncluded: 100000,
      features: [
        'إصدار المحتوى بالذكاء الاصطناعي بلا حدود',
        'ربط حتى 10 حسابات انستجرام وتيك توك',
        'استوديو إنتاج الفيديو والصوت المتقدم'
      ]
    }
  }
}

export const submitPlanRenewalRequest = async (params: {
  brandId?: string
  requestedPlan: string
  contactPhone: string
  notes?: string
}): Promise<void> => {
  try {
    const requestId = `req_${Date.now()}`
    const docRef = doc(db, 'subscription_requests', requestId)
    await setDoc(docRef, {
      id: requestId,
      brandId: params.brandId || 'b_zain',
      requestedPlan: params.requestedPlan,
      contactPhone: params.contactPhone,
      notes: params.notes || '',
      status: 'pending',
      createdAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error submitting plan renewal request:', error)
    throw error
  }
}
