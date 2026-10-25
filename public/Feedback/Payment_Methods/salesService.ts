import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../config/firebase'

export interface TransactionRecord {
  id: string
  client: string
  plan: string
  amount: string
  date: string
  status: 'completed' | 'pending' | 'failed'
}

export const fetchSalesTransactions = async (): Promise<TransactionRecord[]> => {
  try {
    const ref = collection(db, 'sales_transactions')
    const snap = await getDocs(ref)
    if (snap.empty) return []
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionRecord))
  } catch (error) {
    console.error('Error fetching sales transactions:', error)
    return []
  }
}
