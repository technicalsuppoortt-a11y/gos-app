import { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { db, firestore, isFirebaseMocked } from "../config/firebase";
import { toast } from "sonner";
import { defaultState, buildAcademyPhases, mergeRulesWithInitial, DEFAULT_AFFILIATE_LEVELS, DEFAULT_AFFILIATE_FEATURES } from "./initialState";



// ==========================================
// DATA STRUCTURE TYPES
// ==========================================
export interface CrmStage {
  id: string;
  name: string;
  color: string;
  type: "active" | "won" | "lost";
}

export interface CrmLead {
  id: number;
  name: string;
  revenue: number;
  country: string;
  stage: string;
  score: number;
  note: string;
  createdAt: number;
  history: string[];
  userId?: string;
  // Internal helper fields
  _boardId?: number;
  _boardName?: string;
}

export interface CrmBoard {
  id: number;
  name: string;
  icon: string;
  color: string;
  templateKey: string;
  stages: CrmStage[];
  leads: CrmLead[];
  userId?: string;
}

export interface Package {
  id: number;
  name: string;
  price: number;
  currency: string;
  period: string;
  color: string;
  icon: string;
  active: boolean;
  features: string[];
  commissionPercentage: number;
  badge?: string; // e.g. "Most Popular", "Best Value" — empty/undefined means no badge
}

// ==========================================
// AFFILIATE LEVEL TYPES
// ==========================================
export interface AffiliateLevelFeature {
  key: string;       // unique identifier e.g. "crm"
  name: {
    ar: string;
    en: string;
  };
  icon?: string;     // optional icon string e.g. "Star"
}

export interface AffiliateLevel {
  id: string;                    // unique id e.g. "bronze"
  name: {
    ar: string;
    en: string;
  };                             // display name
  icon: string;                  // emoji e.g. "🥉"
  color: string;                 // hex color e.g. "#cd7f32"
  minSalesUSD: number;           // minimum total sales in USD to qualify
  maxSalesUSD: number | null;    // null = unlimited (top level)
  bonusPercentage: number;       // commission bonus % e.g. 0, 5, 10, 15
  previousBonusPercentage?: number; // previous bonus % before last edit
  unlockedFeatureKeys: string[]; // which feature keys are unlocked at this level
  order: number;                 // display/progression order (ascending)
}

export interface AffiliateLevelSettings {
  reviewDurationDays: number;    // how often levels are reviewed (default 90)
  features: AffiliateLevelFeature[]; // master feature list shown in comparison
}

export interface SalesRepresentative {
  id: number;
  name: string;
  email: string;
  commissionPercentage: number;
}

export interface Marketer {
  id: number;
  name: string;
  email: string;
  commissionPercentage: number;
}

export interface Deal {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  paidType: "Installment" | "Full Amount";
  salesRepId?: number;
  marketerId: number;
  paymentProofUrl?: string;
  packageId?: number;
  value: number;
  grossAmount: number;
  originalCurrency: string;
  paymentMethod: string;
  stripeFee: number;
  date: string;
  appliedCommissionPercentage?: number;
  calculatedCommissionAmount?: number;
  userId?: string;
}

export interface Meeting {
  id: number;
  title: string;
  withWho: string;
  date: string;
  time: string;
  type: string;
  status: "Scheduled" | "Completed" | "Cancelled";
}

export interface AcademyItem {
  id: number;
  title: string;
  videoUrl: string;
  completed: boolean;
}

export interface AcademyPhase {
  id: number;
  phaseNum: number;
  title: string;
  unit: string;
  items: AcademyItem[];
}

export interface Transaction {
  id: number;
  docId?: string;
  type: "Commission" | "Bonus" | "Payout" | "Withdrawal" | "Refund";
  amount: number;
  status: "Paid" | "Approved" | "Pending" | "Failed" | "Cancelled";
  date: string;
  partner?: string;
  originalAmount?: number;
  originalCurrency?: string;
  paymentMethod?: string;
}

export interface Partner {
  id: number;
  name: string;
  level: string; // dynamic — matches AffiliateLevel.name
  revenue: number;
  sales: number;
  conversion: number;
  trend: number; // -1, 0, 1, 2
  isMe: boolean;
  streak: number;
  userId?: string;
  email?: string;
  businessName?: string;
  adAccountName?: string;
  businessManagerId?: string;
  pixelId?: string;
  whatsappNumber?: string;
  country?: string;
  testimonials?: string;
  paymentMethod?: string;
  paymentDetails?: string;
}

export interface CalendarAvailability {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

export interface CalendarQuestion {
  id: number;
  label: string;
  type: "short" | "long" | "radio" | "select" | "text-block";
  options?: string[];
  required: boolean;
  active?: boolean;
  text?: string;
}

export interface NotificationTemplate {
  enabled: boolean;
  type: "email" | "whatsapp" | "sms";
  trigger: "immediate" | "before_event" | "after_event" | "abandoned" | "after_booking";
  timingValue?: number;
  timingUnit?: "minutes" | "hours" | "days";
  subject?: string;
  body: string;
  name: string;
  emailFormat?: 'default' | 'template';
  emailTemplateId?: string;
}

export interface NotificationWorkflows {
  immediateConfirmationEmail: NotificationTemplate;
  immediateConfirmationWhatsapp: NotificationTemplate;
  reminder24hEmail: NotificationTemplate;
  reminder3hWhatsapp: NotificationTemplate;
  reminder30mSmsWhatsapp: NotificationTemplate;
  postEventAttendedEmail: NotificationTemplate;
  postEventNoShowEmail: NotificationTemplate;
  abandonment2hEmail: NotificationTemplate;
  abandonment2dEmail: NotificationTemplate;
}

export type ViewMode = 'default' | 'template';
export type RedirectMode = 'custom_url' | 'standard' | 'template' | 'modal';
export type EmailMode = 'default' | 'template';

export interface CalendarTemplateSettings {
  // 1. Preview Settings
  previewMode: ViewMode;
  previewTemplateId?: string;
  // 2. Post-Booking Settings
  postBookingMode?: RedirectMode;
  redirectUrl?: string;
  thankYouTemplateId?: string;
  // 3. Email Notification Settings
  emailNotificationMode?: EmailMode;
  emailTemplateId?: string;
}

export interface BookingCalendar {
  id: number;
  name: string;
  slug?: string;
  color?: string;
  duration?: number;
  active: boolean;
  description?: string;
  language?: "ar" | "en";
  displayBranding?: boolean;
  passwordProtect?: boolean;
  password?: string;
  free?: boolean;
  price?: number;
  requireApproval?: boolean;
  allowMultipleBookings?: boolean;
  groupEnabled?: boolean;
  groupMax?: number;
  displaySpotsLeft?: boolean;
  availability?: CalendarAvailability[];
  startIncrement?: number;
  minNotice?: number;
  notifications?: {
    confirmationEmail: boolean;
    reminders: number;
    followUp: boolean;
  };
  notificationWorkflows?: NotificationWorkflows;
  afterBooking?: {
    redirectEnabled: boolean;
    redirectUrl: string;
    allowCancelReschedule: boolean;
    scheduleAnother: boolean;
    prefill: boolean;
    webhookEnabled: boolean;
    webhookUrl: string;
    confirmationBody?: string;
    postBookingMode?: RedirectMode;
    thankYouTemplateId?: string;
  };
  templateSettings?: CalendarTemplateSettings;
  questions?: CalendarQuestion[];
  url?: string;
  slots?: number;
  image?: string;
  imageRound?: boolean;
  mediaType?: "image" | "video";
  bookingLimits?: any;
  textBlocks?: any[];
  fixedDateRange?: any;
  lookBusy?: any;
  breaks?: { id: number; date?: string; start: string; end: string }[];
  locationOptions?: any[];
  durationOptions?: any[];
  customDuration?: number;
  timezoneDisplay?: string;
  showTimezone?: boolean;
  currency?: string;
  allowRecurring?: boolean;
  titleOverride?: string;
  groupCapacity?: number;
  bufferTime?: number;
  maxAdvanceBooking?: number;
  grayOutBusy?: boolean;
  priceType?: "fixed" | "hourly" | "per_attendee";
  specificDateAvailability?: { id: number; date: string; start: string; end: string }[];
  additionalWeekdayAvailability?: { id: number; day: string; start: string; end: string }[];
  hostTimezone?: string;
}

export interface Booking {
  id: number;
  calendarId: number;
  name: string;
  contact: string;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  source: string;
  answers: Record<string, any>;
  createdAt: number;
  userId?: string;
  paymentStatus?: string;
  paymentDetails?: any;
  fromAd?: boolean;
  email?: string;
  whatsapp?: string;
}

export interface Channel {
  id: string;
  name: string;
  icon: string;
  category: "نصي" | "صوتي";
  members?: number[];
  color?: string;
}

export interface ChatMessage {
  id: number;
  authorId: number;
  text: string;
  time: string;
  isVoice?: boolean;
  voiceDuration?: string;
  duration?: number;
  replyContext?: {
    replyToSender: string;
    replyToText: string;
  };
  audioData?: string;
  files?: Array<{ name: string; size: string | number; type: string; dataUrl: string }>;
}

export interface Script {
  id: number;
  category: string;
  title: string;
  content: string;
  order?: number;
}

export interface AffiliateRule {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  category: "prohibited" | "required" | "financial" | "policy";
  categoryAr: string;
  categoryEn: string;
  severity?: "critical" | "warning" | "info";
  steps?: string[];
}

export interface AppNotification {
  id: number;
  icon: string;
  color: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  isRead?: boolean;
}

export interface MessageNotification {
  id: number;
  name: string;
  preview: string;
  time: string;
}

export interface DailyFocus {
  id: number;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // partner's userId
  status: "Pending" | "In_Progress" | "Under_Review" | "Completed";
  dueDate: string;
  createdAt: any;
  rejectionNote?: string;
}

export interface Integration {
  connected: boolean;
  key: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  value: string;
}

export interface AppSettings {
  companyName: string;
  language: "ar" | "en";
  currency: string;
  notifEmail: boolean;
  notifWhatsapp: boolean;
  profileName: string;
  profileRole: string;
  avatarDataUrl: string;
  theme: "light" | "dark";
  adminMode: boolean;
  integrations: Record<string, Integration>;
  businessName?: string;
  businessManagerId?: string;
  country?: string;
}

export interface AppState {
  crmBoards: CrmBoard[];
  packages: Package[];
  deals: Deal[];
  meetings: Meeting[];
  academyPhases: AcademyPhase[];
  transactions: Transaction[];
  partners: Partner[];
  calendars: BookingCalendar[];
  bookings: Booking[];
  channels: Channel[];
  channelMessages: Record<string, ChatMessage[]>;
  dms: Record<number, ChatMessage[]>;
  scripts: Script[];
  notifications: AppNotification[];
  messages: MessageNotification[];
  dailyFocus: DailyFocus[];
  tasks: Task[];
  paymentMethods: PaymentMethod[];
  salesReps: SalesRepresentative[];
  marketers: Marketer[];
  rules?: AffiliateRule[];
  affiliateLevels: AffiliateLevel[];
  affiliateLevelSettings: AffiliateLevelSettings;
  settings: AppSettings;
}

// ==========================================
// DEFAULT / SEED STATE CREATOR (Imported from initialState.ts)
// ==========================================
export { STAGES, STAGE_PALETTE, CRM_TEMPLATES, INITIAL_RULES, mergeRulesWithInitial, buildStages, buildAcademyPhases, defaultState } from "./initialState";


// ==========================================
// CURRENCY & EXCHANGE RATES STUFF
// ==========================================
export const CURRENT_RATES: Record<string, number> = {
  USD: 1,
  AED: 3.6725,
  SAR: 3.75,
  EGP: 49.5,
  KWD: 0.307,
  QAR: 3.64,
  EUR: 0.92,
  GBP: 0.79
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  AED: "د.إ",
  SAR: "ر.س",
  EGP: "ج.م",
  KWD: "د.ك",
  QAR: "ر.ق",
  EUR: "€",
  GBP: "£"
};

export const HISTORICAL_RATES: Record<string, Record<string, number>> = {
  "2026-06-25": { USD: 1, AED: 3.6725, SAR: 3.75, EGP: 48.9, KWD: 0.3065, QAR: 3.64, EUR: 0.925, GBP: 0.792 },
  "2026-06-28": { USD: 1, AED: 3.6720, SAR: 3.75, EGP: 49.1, KWD: 0.3068, QAR: 3.64, EUR: 0.923, GBP: 0.791 },
  "2026-06-29": { USD: 1, AED: 3.6722, SAR: 3.75, EGP: 49.2, KWD: 0.3070, QAR: 3.64, EUR: 0.921, GBP: 0.790 },
  "2026-06-30": { USD: 1, AED: 3.6730, SAR: 3.75, EGP: 49.3, KWD: 0.3072, QAR: 3.64, EUR: 0.920, GBP: 0.789 },
  "2026-07-01": { USD: 1, AED: 3.6725, SAR: 3.75, EGP: 49.5, KWD: 0.3070, QAR: 3.64, EUR: 0.920, GBP: 0.790 },
  "2026-07-02": { USD: 1, AED: 3.6725, SAR: 3.75, EGP: 49.5, KWD: 0.3070, QAR: 3.64, EUR: 0.919, GBP: 0.789 },
  "2026-07-03": { USD: 1, AED: 3.6725, SAR: 3.75, EGP: 49.6, KWD: 0.3071, QAR: 3.64, EUR: 0.918, GBP: 0.788 },
  "2026-07-04": { USD: 1, AED: 3.6725, SAR: 3.75, EGP: 49.6, KWD: 0.3071, QAR: 3.64, EUR: 0.917, GBP: 0.787 },
  "2026-07-05": { USD: 1, AED: 3.6725, SAR: 3.75, EGP: 49.7, KWD: 0.3072, QAR: 3.64, EUR: 0.916, GBP: 0.786 },
};

export function rateOnDate(currency: string, dateStr: string): number {
  const table = HISTORICAL_RATES[dateStr] || CURRENT_RATES;
  return table[currency] || CURRENT_RATES[currency] || 1;
}

export function toBaseUSD(amount: number, currency: string, dateStr?: string): number {
  const num = Number(amount) || 0;
  if (!currency || currency === "USD") return num;
  return num / rateOnDate(currency, dateStr || "2026-07-01");
}

export function convertCurrency(amount: number, from: string, to: string): number {
  const amountInUSD = from === "USD" ? amount : amount / (CURRENT_RATES[from] || 1);
  return to === "USD" ? amountInUSD : amountInUSD * (CURRENT_RATES[to] || 1);
}

// ==========================================
// AFFILIATE LEVEL UTILITY FUNCTIONS
// These are pure, stateless helpers — pass live state, get live results.
// All sales amounts are in USD base; call convertCurrency for display.
// ==========================================

/**
 * Given a user's total commission revenue in USD and the dynamic levels array,
 * returns the level they currently qualify for (highest min threshold they meet).
 * Falls back to lowest level (order=0) if they don't meet any threshold.
 */
export function computeUserLevel(
  totalRevenueUSD: number,
  levels: AffiliateLevel[]
): AffiliateLevel | null {
  if (!levels || levels.length === 0) return null;
  const sorted = [...levels].sort((a, b) => a.order - b.order);
  // Walk from top level downward and return first one the user qualifies for
  const reversed = [...sorted].reverse();
  for (const lvl of reversed) {
    if (totalRevenueUSD >= lvl.minSalesUSD) return lvl;
  }
  return sorted[0]; // Default to lowest level
}

/**
 * Returns the next level above the user's current one (null if at top).
 */
export function computeNextLevel(
  currentLevel: AffiliateLevel | null,
  levels: AffiliateLevel[]
): AffiliateLevel | null {
  if (!currentLevel || !levels || levels.length === 0) return null;
  const sorted = [...levels].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(l => l.id === currentLevel.id);
  if (idx === -1 || idx === sorted.length - 1) return null;
  return sorted[idx + 1];
}

/**
 * Computes the hybrid final commission percentage.
 * Final % = packageBaseCommission + levelBonusPercentage
 */
export function computeFinalCommission(
  baseCommissionPercent: number,
  levelBonusPercent: number
): number {
  return (Number(baseCommissionPercent) || 0) + (Number(levelBonusPercent) || 0);
}

/**
 * Returns progress % (0-100) toward the next level.
 * Uses current revenue in USD vs level thresholds in USD.
 */
export function computeLevelProgress(
  totalRevenueUSD: number,
  currentLevel: AffiliateLevel | null,
  nextLevel: AffiliateLevel | null
): number {
  if (!currentLevel) return 0;
  if (!nextLevel) return 100; // At top level
  const start = currentLevel.minSalesUSD;
  const end = nextLevel.minSalesUSD;
  if (end <= start) return 100;
  const progress = ((totalRevenueUSD - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, progress));
}

// ==========================================
// CONTEXT INTERFACE
// ==========================================
interface StateContextType {
  state: AppState | null;
  loading: boolean;
  saveState: (newState: AppState) => Promise<void>;
  updateState: (updater: (draft: AppState) => void) => Promise<void>;

  allLeads: () => CrmLead[];
  getBoard: (id: number) => CrmBoard | undefined;
  fmtMoney: (usdAmount: number) => string;
  convertCurrency: (amount: number, from: string, to: string) => number;

  // Single Source of Truth for current user's total confirmed sales revenue
  currentUserTotalSalesUSD: number;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

// ==========================================
// HELPERS FOR DECENTRALIZED SYNC
// ==========================================
const flattenMessages = (msgRecord: Record<string, any[]>) => {
  const list: any[] = [];
  if (!msgRecord) return list;
  Object.entries(msgRecord).forEach(([channelId, msgs]) => {
    if (Array.isArray(msgs)) {
      msgs.forEach(msg => {
        list.push({ ...msg, channelId });
      });
    }
  });
  return list;
};

const flattenDms = (dmRecord: Record<any, any[]>) => {
  const list: any[] = [];
  if (!dmRecord) return list;
  Object.entries(dmRecord).forEach(([recipientId, msgs]) => {
    if (Array.isArray(msgs)) {
      msgs.forEach(msg => {
        list.push({ ...msg, recipientId: Number(recipientId) });
      });
    }
  });
  return list;
};

const reconcileCollection = async (
  collectionName: string,
  newItems: any[],
  oldItems: any[],
  docIdGetter: (item: any) => string,
  itemMapper: (item: any) => any
) => {
  try {
    const validNewItems = (newItems || []).filter((item) => item && docIdGetter(item));
    const validOldItems = (oldItems || []).filter((item) => item && docIdGetter(item));

    const newIds = new Set(validNewItems.map(docIdGetter));

    // 1. Delete removed items
    for (const oldItem of validOldItems) {
      const id = docIdGetter(oldItem);
      if (!newIds.has(id)) {
        try {
          const docRef = firestore.doc(db, collectionName, id);
          await firestore.deleteDoc(docRef);
        } catch (delErr) {
          console.error(`Error deleting doc ${id} in ${collectionName}:`, delErr);
        }
      }
    }

    // 2. Add or update items (only if changed or new)
    for (const newItem of validNewItems) {
      const id = docIdGetter(newItem);
      const mappedNew = itemMapper(newItem);
      
      const oldItem = validOldItems.find(o => docIdGetter(o) === id);
      const mappedOld = oldItem ? itemMapper(oldItem) : null;
      
      if (!oldItem || JSON.stringify(mappedNew) !== JSON.stringify(mappedOld)) {
        const docRef = firestore.doc(db, collectionName, id);
        const cleanData = JSON.parse(JSON.stringify(mappedNew));
        await firestore.setDoc(docRef, cleanData, { merge: true });
      }
    }
  } catch (err) {
    console.error(`Error reconciling collection ${collectionName}:`, err);
  }
};

// ==========================================
// CONTEXT PROVIDER IMPLEMENTATION
// ==========================================
const LOCAL_STORAGE_KEY = "partneros_v5_react_state";

export function StateProvider({ children }: { children: ReactNode }) {
  const { user, userProfile, isAdmin } = useAuth();
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper for listener updaters to run safely on baseState even when state is initialized to null
  const updateStateFromListener = (updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev || defaultState()));
  };

  // Mirror loading in a ref so saveState can read it inside closures without stale captures
  const loadingRef = useRef(true);
  const settingsFirstLoadRef = useRef(false);
  const latestLeadsRef = useRef<any[]>([]);
  const lastSyncedStatsRef = useRef<{ xp: number; sales: number; lessons: number; revenue: number } | null>(null);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Sync state based on user login
  useEffect(() => {
    if (!user) {
      settingsFirstLoadRef.current = false;
      // Offline / Local fallback if no user is signed in
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          setState(JSON.parse(saved));
        } catch (e) {
          setState(defaultState());
        }
      } else {
        setState(defaultState());
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    settingsFirstLoadRef.current = false;
    let active = true;
    const unsubscribes: Array<() => void> = [];

    const initAndSync = async () => {
      try {


        if (!active) return;

        // Set up real-time listener subscriptions!
        
        // 1. Settings listener — setLoading(false) fires here on FIRST snapshot
        // so that loading only becomes false once the real Firestore data is in state.
        const unsubSettings = firestore.onSnapshot(firestore.doc(db, "settings", user.uid), async (docSnap: any) => {
          if (docSnap.exists()) {
            updateStateFromListener(prev => ({ ...prev, settings: docSnap.data() }));
          } else {
            // Auto-heal/initialize settings document from users collection to prevent falling back to hardcoded "Joe Mohammed"
            try {
              const userSnap = await firestore.getDoc(firestore.doc(db, "users", user.uid));
              const userData = userSnap.exists() ? userSnap.data() : null;
              
              const defaultSet = {
                companyName: userData?.name ? `${userData.name}'s Brand` : "My Brand",
                language: (userData?.lang === "ar" || userData?.lang === "en" ? userData.lang : "ar") as "ar" | "en",
                currency: userData?.currency || "USD",
                notifEmail: true,
                notifWhatsapp: true,
                profileName: userData?.name || user.displayName || user.email?.split("@")[0] || "Partner",
                profileRole: userData?.role === "admin" ? "Admin" : "Partner",
                avatarDataUrl: "",
                theme: "light" as const,
                adminMode: false,
                integrations: {
                  stripe: { connected: false, key: "" },
                  whatsapp: { connected: false, key: "" },
                  googleCalendar: { connected: false, key: "" },
                  zapier: { connected: false, key: "" },
                  facebookAds: { connected: false, key: "" },
                  slack: { connected: false, key: "" },
                },
              };
              
              // Set locally first
              updateStateFromListener(prev => ({ ...prev, settings: defaultSet }));
              
              // Write settings document to Firestore database
              await firestore.setDoc(firestore.doc(db, "settings", user.uid), defaultSet);
            } catch (err) {
              console.error("Failed to auto-initialize settings for new user:", err);
            }
          }
          if (!settingsFirstLoadRef.current) {
            settingsFirstLoadRef.current = true;
            setLoading(false);
          }
        });
        unsubscribes.push(unsubSettings);

        // 2. Leads listener
        const qLeads = (isFirebaseMocked || isAdmin) 
          ? firestore.collection(db, "leads") 
          : firestore.query(firestore.collection(db, "leads"), firestore.where("userId", "==", user.uid));
        const unsubLeads = firestore.onSnapshot(qLeads, (snap: any) => {
          const leads = snap.docs.map((d: any) => d.data());
          latestLeadsRef.current = leads;
          updateStateFromListener(prev => {
            const updatedBoards = prev.crmBoards.map(board => {
              const boardLeads = leads.filter((l: any) => Number(l.boardId) === Number(board.id) || Number(l._boardId) === Number(board.id));
              return { ...board, leads: boardLeads.map((l: any) => ({ ...l, id: Number(l.id) })) };
            });
            return { ...prev, crmBoards: updatedBoards };
          });
        });
        unsubscribes.push(unsubLeads);

        // 2b. CRM Boards listener
        const qBoards = (isFirebaseMocked || isAdmin) 
          ? firestore.collection(db, "crmBoards") 
          : firestore.query(firestore.collection(db, "crmBoards"), firestore.where("userId", "==", user.uid));
        const unsubBoards = firestore.onSnapshot(qBoards, (snap: any) => {
          const boards = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => {
            const updatedBoards = boards.map((board: any) => {
              const boardLeads = latestLeadsRef.current.filter((l: any) => Number(l.boardId) === Number(board.id) || Number(l._boardId) === Number(board.id));
              return {
                ...board,
                id: Number(board.id),
                leads: boardLeads.map((l: any) => ({ ...l, id: Number(l.id) }))
              };
            }).sort((a: any, b: any) => a.id - b.id);
            return { ...prev, crmBoards: updatedBoards };
          });
        });
        unsubscribes.push(unsubBoards);

        // 3. Bookings listener
        const qBookings = (isFirebaseMocked || isAdmin) 
          ? firestore.collection(db, "bookings") 
          : firestore.query(firestore.collection(db, "bookings"), firestore.where("userId", "==", user.uid));
        const unsubBookings = firestore.onSnapshot(qBookings, (snap: any) => {
          const bookings = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, bookings: bookings.map((b: any) => ({ ...b, id: Number(b.id), calendarId: Number(b.calendarId) })) }));
        });
        unsubscribes.push(unsubBookings);

        // 4. Transactions listener
        const qTrans = (isFirebaseMocked || isAdmin) 
          ? firestore.collection(db, "transactions") 
          : firestore.query(firestore.collection(db, "transactions"), firestore.where("userId", "==", user.uid));
        const unsubTrans = firestore.onSnapshot(qTrans, (snap: any) => {
          const transactions = snap.docs.map((d: any) => {
            const data = d.data() || {};
            let txId = Number(data.id);
            if (!txId || isNaN(txId)) {
              const match = d.id.match(/trans-(\d+)/);
              if (match && match[1]) {
                txId = Number(match[1]);
              } else {
                txId = Date.now();
              }
            }
             // Normalize Type to standard English Title Case
             let txType = data.type || "Commission";
             if (typeof txType === "string") {
               const cleaned = txType.trim().toLowerCase();
               if (cleaned === "commission" || cleaned === "عمولة") txType = "Commission";
               else if (cleaned === "bonus" || cleaned === "مكافأة") txType = "Bonus";
               else if (cleaned === "withdrawal" || cleaned === "سحب") txType = "Withdrawal";
               else if (cleaned === "refund" || cleaned === "استرجاع") txType = "Refund";
               else if (cleaned === "payout" || cleaned === "صرف") txType = "Payout";
             }

             // Normalize Status to standard English Title Case
             let txStatus = data.status || "Pending";
             if (typeof txStatus === "string") {
               const cleaned = txStatus.trim().toLowerCase();
               if (cleaned === "pending" || cleaned === "معلق") txStatus = "Pending";
               else if (cleaned === "approved" || cleaned === "معتمد") txStatus = "Approved";
               else if (cleaned === "paid" || cleaned === "مدفوع") txStatus = "Paid";
               else if (cleaned === "failed" || cleaned === "فشل") txStatus = "Failed";
               else if (cleaned === "cancelled" || cleaned === "ملغى") txStatus = "Cancelled";
             }

             return {
               ...data,
               docId: d.id,
               id: txId,
               type: txType,
               status: txStatus,
               amount: Number(data.amount) || 0,
             };
           });
          updateStateFromListener(prev => ({ ...prev, transactions }));
        });
        unsubscribes.push(unsubTrans);

        // 5. Meetings listener
        const qMeetings = (isFirebaseMocked || isAdmin) 
          ? firestore.collection(db, "meetings") 
          : firestore.query(firestore.collection(db, "meetings"), firestore.where("userId", "==", user.uid));
        const unsubMeetings = firestore.onSnapshot(qMeetings, (snap: any) => {
          const meetings = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, meetings: meetings.map((m: any) => ({ ...m, id: Number(m.id) })) }));
        });
        unsubscribes.push(unsubMeetings);

        // 6. Daily Focus listener
        const qFocus = (isFirebaseMocked || isAdmin) 
          ? firestore.collection(db, "dailyFocus") 
          : firestore.query(firestore.collection(db, "dailyFocus"), firestore.where("userId", "==", user.uid));
        const unsubFocus = firestore.onSnapshot(qFocus, (snap: any) => {
          const dailyFocus = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, dailyFocus: dailyFocus.map((f: any) => ({ ...f, id: Number(f.id) })).sort((a: any, b: any) => a.id - b.id) }));
        });
        unsubscribes.push(unsubFocus);

        // 7. Calendars listener
        const qCalendars = (isFirebaseMocked || isAdmin) 
          ? firestore.collection(db, "calendars") 
          : firestore.query(firestore.collection(db, "calendars"), firestore.where("userId", "==", user.uid));
        const unsubCalendars = firestore.onSnapshot(qCalendars, (snap: any) => {
          const calendars = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, calendars: calendars.map((c: any) => ({ ...c, id: Number(c.id) })) }));
        });
        unsubscribes.push(unsubCalendars);

        // 8. Deals listener
        const qDeals = (isFirebaseMocked || isAdmin) 
          ? firestore.collection(db, "deals") 
          : firestore.query(firestore.collection(db, "deals"), firestore.where("userId", "==", user.uid));
        const unsubDeals = firestore.onSnapshot(qDeals, (snap: any) => {
          const deals = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, deals: deals.map((d: any) => ({ ...d, id: Number(d.id), packageId: Number(d.packageId), value: Number(d.value) })) }));
        });
        unsubscribes.push(unsubDeals);

        // 8b. Sales Reps listener (Global)
        const qSalesReps = firestore.collection(db, "salesReps");
        const unsubSalesReps = firestore.onSnapshot(qSalesReps, (snap: any) => {
          const reps = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, salesReps: reps.map((r: any) => ({ ...r, id: Number(r.id) })) }));
        });
        unsubscribes.push(unsubSalesReps);

        // 8c. Marketers listener (Global)
        const qMarketers = firestore.collection(db, "marketers");
        const unsubMarketers = firestore.onSnapshot(qMarketers, (snap: any) => {
          const marketers = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, marketers: marketers.map((m: any) => ({ ...m, id: Number(m.id) })) }));
        });
        unsubscribes.push(unsubMarketers);

        // 9. Partners listener (Global)
        const unsubPartners = firestore.onSnapshot(firestore.collection(db, "partners"), (snap: any) => {
          const partners = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, partners: partners.map((p: any) => ({ ...p, id: Number(p.id) })) }));
        });
        unsubscribes.push(unsubPartners);

        // 10. Channels listener (Global)
        const unsubChannels = firestore.onSnapshot(firestore.collection(db, "channels"), (snap: any) => {
          const channels = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, channels }));
        });
        unsubscribes.push(unsubChannels);

        // 11. Channel Messages listener (Global)
        const unsubChannelMessages = firestore.onSnapshot(firestore.collection(db, "channelMessages"), (snap: any) => {
          const msgs = snap.docs.map((d: any) => d.data());
          const channelMessages: Record<string, any[]> = {};
          msgs.forEach((m: any) => {
            if (!channelMessages[m.channelId]) {
              channelMessages[m.channelId] = [];
            }
            channelMessages[m.channelId].push(m);
          });
          Object.keys(channelMessages).forEach(chId => {
            channelMessages[chId].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
          });
          updateStateFromListener(prev => ({ ...prev, channelMessages }));
        });
        unsubscribes.push(unsubChannelMessages);

        // 12. DMs listener (Global)
        const unsubDms = firestore.onSnapshot(firestore.collection(db, "dms"), (snap: any) => {
          const msgs = snap.docs.map((d: any) => d.data());
          const dms: Record<number, any[]> = {};
          msgs.forEach((m: any) => {
            const rId = Number(m.recipientId);
            if (!dms[rId]) {
              dms[rId] = [];
            }
            dms[rId].push(m);
          });
          Object.keys(dms).forEach(rId => {
            dms[Number(rId)].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
          });
          updateStateFromListener(prev => ({ ...prev, dms }));
        });
        unsubscribes.push(unsubDms);

        // 13. Packages listener (Global for sharing)
        const qPackages = firestore.collection(db, "packages");
        const unsubPackages = firestore.onSnapshot(qPackages, (snap: any) => {
          const packages = snap.docs.map((d: any) => d.data());
          if (packages.length > 0) {
            updateStateFromListener(prev => ({ ...prev, packages: packages.map((p: any) => ({ ...p, id: Number(p.id) })).sort((a: any, b: any) => a.id - b.id) }));
          }
        });
        unsubscribes.push(unsubPackages);

        // 14. Scripts listener (Global for sharing)
        const qScripts = firestore.collection(db, "scripts");
        const unsubScripts = firestore.onSnapshot(qScripts, (snap: any) => {
          const scripts = snap.docs.map((d: any) => d.data());
          if (scripts.length > 0) {
            updateStateFromListener(prev => ({
              ...prev,
              scripts: scripts
                .map((s: any) => ({ ...s, id: Number(s.id) }))
                .sort((a: any, b: any) => {
                  const orderA = typeof a.order === "number" ? a.order : a.id;
                  const orderB = typeof b.order === "number" ? b.order : b.id;
                  return orderA - orderB;
                })
            }));
          }
        });
        unsubscribes.push(unsubScripts);

        // 16. Payment Methods listener (Global)
        const qPaymentMethods = firestore.collection(db, "paymentMethods");
        const unsubPaymentMethods = firestore.onSnapshot(qPaymentMethods, (snap: any) => {
          const list = snap.docs.map((d: any) => d.data());
          if (list.length > 0) {
            updateStateFromListener(prev => ({ ...prev, paymentMethods: list.map((p: any) => ({ ...p, id: String(p.id) })) }));
          } else {
            updateStateFromListener(prev => ({
              ...prev,
              paymentMethods: [
                { id: "1", name: "Vodafone Cash", value: "+201012345678" },
                { id: "2", name: "InstaPay", value: "joe@instapay" },
                { id: "3", name: "Bank Transfer", value: "Account: 1234-5678-9012, Swift: ABCDEF" }
              ]
            }));
          }
        });
        unsubscribes.push(unsubPaymentMethods);

        // 17. Rules listener (Global)
        const qRules = firestore.collection(db, "rules");
        const unsubRules = firestore.onSnapshot(qRules, (snap: any) => {
          const list = snap.docs.map((d: any) => ({
            ...d.data(),
            id: Number(d.data().id || String(d.id).replace("rule-", "")),
          }));
          const merged = mergeRulesWithInitial(list);
          updateStateFromListener(prev => ({
            ...prev,
            rules: merged
          }));
        });
        unsubscribes.push(unsubRules);

        // 15. Notifications listener (User specific)
        const qNotifs = firestore.query(
          firestore.collection(db, "notifications"),
          firestore.where("userId", "==", user.uid)
        );
        const unsubNotifs = firestore.onSnapshot(qNotifs, (snap: any) => {
          const notifications = snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data()
          }));
          notifications.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          updateStateFromListener(prev => ({ ...prev, notifications }));
        });
        unsubscribes.push(unsubNotifs);

        // 16. Support Chats messages listener (User specific messages)
        const qSupportChats = isAdmin
          ? firestore.collection(db, "support_chats")
          : firestore.query(
              firestore.collection(db, "support_chats"),
              firestore.where("chatId", "==", user.uid)
            );
        const unsubSupportChats = firestore.onSnapshot(qSupportChats, (snap: any) => {
          const allMsgs = snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data()
          }));
          
          // Map to MessageNotification structure for unread support messages
          const unreadMsgs = allMsgs
            .filter((m: any) => m.authorId !== user.uid && !m.read)
            .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

          const mappedMessages = unreadMsgs.map((m: any, idx: number) => {
            const date = new Date(m.createdAt || Date.now());
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return {
              id: idx,
              name: m.authorName || (isAdmin ? "Partner" : "Support"),
              preview: m.text || (m.files && m.files.length > 0 ? "📁 Attachment" : ""),
              time: timeStr,
              docId: m.id
            };
          });

          updateStateFromListener(prev => ({ ...prev, messages: mappedMessages }));
        });
        unsubscribes.push(unsubSupportChats);

        // 17. Academy Courses listener (Global)
        const qAcademy = firestore.collection(db, "academy_courses");
        const unsubAcademy = firestore.onSnapshot(qAcademy, (snap: any) => {
          // If the collection is completely empty (no documents at all), seed the default phases
          if (snap.empty) {
            const defaults = buildAcademyPhases();
            try {
              firestore.setDoc(firestore.doc(db, "academy_courses", "system_config"), { seeded: true });
            } catch (err) {
              console.error("Failed to seed academy config doc:", err);
            }
            defaults.forEach(async (phase) => {
              try {
                await firestore.setDoc(firestore.doc(db, "academy_courses", `phase-${phase.id}`), phase);
              } catch (err) {
                console.error("Failed to seed academy course phase:", err);
              }
            });
            return;
          }

          // Otherwise, check if config doc exists, filter out the system_config document and map the actual phases
          const hasConfig = snap.docs.some((d: any) => d.id === "system_config");
          const nonConfigDocs = snap.docs.filter((d: any) => d.id !== "system_config");

          // If the list contains ONLY the 'system_config' document (phases are deleted), set state empty and return early
          if (nonConfigDocs.length === 0) {
            updateStateFromListener(prev => ({ ...prev, academyPhases: [] }));
            return;
          }

          const list = nonConfigDocs.map((d: any) => {
            const data = d.data();
            return {
              ...data,
              id: Number(data.id),
              phaseNum: Number(data.phaseNum),
              items: (data.items || []).map((item: any) => ({
                ...item,
                id: Number(item.id),
                completed: !!item.completed
              }))
            };
          });

          // Auto-heal: If marker is missing from an existing populated database, write it silently
          if (!hasConfig) {
            firestore.setDoc(firestore.doc(db, "academy_courses", "system_config"), { seeded: true }).catch((err) => {
              console.error("Failed to auto-heal missing system_config doc:", err);
            });
          }
          
          list.sort((a: any, b: any) => a.phaseNum - b.phaseNum);
          updateStateFromListener(prev => ({ ...prev, academyPhases: list }));
        });
        unsubscribes.push(unsubAcademy);

        // 18. Tasks listener
        const qTasks = (isFirebaseMocked || isAdmin)
          ? firestore.collection(db, "tasks")
          : firestore.query(firestore.collection(db, "tasks"), firestore.where("assignedTo", "==", user.uid));
        const unsubTasks = firestore.onSnapshot(qTasks, (snap: any) => {
          const tasks = snap.docs.map((d: any) => d.data());
          updateStateFromListener(prev => ({ ...prev, tasks: tasks.map((t: any) => ({ ...t })) }));
        });
        unsubscribes.push(unsubTasks);

        // 19. Affiliate Levels listener (Global — readable by all users, writable by admin)
        const qAffiliateLevels = firestore.collection(db, "affiliateLevels");
        const unsubAffiliateLevels = firestore.onSnapshot(qAffiliateLevels, (snap: any) => {
          if (snap.empty) {
            // Seed the initial defaults if the collection is completely empty
            DEFAULT_AFFILIATE_LEVELS.forEach(async (level) => {
              try {
                await firestore.setDoc(firestore.doc(db, "affiliateLevels", `level-${level.id}`), level);
              } catch (err) {
                console.error("Failed to seed affiliate level:", err);
              }
            });
            // We do not need to updateStateFromListener here because the setDoc will trigger onSnapshot again
            return;
          }

          const levels = snap.docs.map((d: any) => d.data());
          if (levels.length > 0) {
            const sorted = levels.sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));
            updateStateFromListener(prev => ({ ...prev, affiliateLevels: sorted }));
          }
        });
        unsubscribes.push(unsubAffiliateLevels);


        // 20. Affiliate Level Settings listener (Global — single config doc)
        const affiliateLevelSettingsRef = firestore.doc(db, "affiliateLevelSettings", "config");
        const unsubAffiliateLevelSettings = firestore.onSnapshot(affiliateLevelSettingsRef, (docSnap: any) => {
          if (docSnap.exists()) {
            updateStateFromListener(prev => ({ ...prev, affiliateLevelSettings: docSnap.data() }));
          }
          // If doc doesn't exist, keep default (90 days) from initialState
        });
        unsubscribes.push(unsubAffiliateLevelSettings);

        // Note: setLoading(false) is handled inside the settings onSnapshot callback above
        // to guarantee real Firestore data is loaded before the UI renders.
      } catch (err) {
        console.error("Firestore sync init failed:", err);
        setLoading(false);
        settingsFirstLoadRef.current = true;
      }
    };

    initAndSync();

    return () => {
      active = false;
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, isAdmin]);

  // Real-time synchronization of partner's stats to their Firestore user profile document
  useEffect(() => {
    // Only synchronize for logged-in non-admin users when state is fully loaded
    if (!user || !userProfile || userProfile.role === "admin" || !state || loading) return;

    // 1. Calculate lessons count from completedLessons
    const completedLessonsCount = userProfile.completedLessons?.length || 0;

    // 2. Calculate won leads (sales and revenue)
    const wonLeads = state.crmBoards
      .flatMap((b) => 
        (b.leads || []).filter((l) => {
          const stage = b.stages?.find((s: any) => s.id === l.stage);
          return stage?.type === "won";
        })
      );
    const wonLeadsCount = wonLeads.length;
    const wonLeadsRevenue = wonLeads.reduce((sum, l) => sum + (Number(l.revenue) || 0), 0);

    // 3. Calculate won deals (sales and commission revenue)
    // Note: state.deals are implicitly confirmed sales, they have no "stage" field
    const wonDeals = state.deals;
    const wonDealsCount = wonDeals.length;
    const wonDealsCommission = wonDeals.reduce((sum, d) => {
      const commPct = d.appliedCommissionPercentage !== undefined ? d.appliedCommissionPercentage : 10;
      const commVal = ((d.grossAmount || d.value || 0) * commPct) / 100;
      return sum + toBaseUSD(commVal, d.originalCurrency || "USD", d.closeDate || d.date);
    }, 0);
    const wonDealsGross = wonDeals.reduce((sum, d) => {
      const grossVal = (d.grossAmount || d.value || 0);
      return sum + toBaseUSD(grossVal, d.originalCurrency || "USD", d.closeDate || d.date);
    }, 0);

    // 4. Calculate total sales and revenue
    const totalSales = wonLeadsCount + wonDealsCount;
    const totalRevenue = wonDealsCommission;
    const totalSalesAmount = wonLeadsRevenue + wonDealsGross;

    // 5. Calculate total XP
    // Lesson completion: +50 XP
    // Won lead: +100 XP
    // Won deal: +150 XP
    const calculatedXp = (completedLessonsCount * 50) + (wonLeadsCount * 100) + (wonDealsCount * 150);

    // Skip if we have already synced these exact calculated values to avoid any infinite update loop
    if (
      lastSyncedStatsRef.current &&
      lastSyncedStatsRef.current.xp === calculatedXp &&
      lastSyncedStatsRef.current.sales === totalSales &&
      lastSyncedStatsRef.current.lessons === completedLessonsCount &&
      Math.abs(lastSyncedStatsRef.current.revenue - totalRevenue) <= 0.01
    ) {
      return;
    }

    // 6. Check if any stats have changed or are out of sync with current loaded user profile
    const currentXp = Number(userProfile.xp) || 0;
    const currentSales = Number(userProfile.sales) || 0;
    const currentLessons = Number(userProfile.lessons) || 0;
    const currentRevenue = Number(userProfile.revenue) || 0;

    // We allow a small tolerance for floating point numbers in revenue
    const isRevenueOutOfSync = Math.abs(currentRevenue - totalRevenue) > 0.01;

    const needsSync = currentXp !== calculatedXp ||
      currentSales !== totalSales ||
      currentLessons !== completedLessonsCount ||
      isRevenueOutOfSync;

    if (needsSync) {
      // Log only on actual sync event to prevent log spam
      console.log("Recalculating and syncing partner stats to Firestore:", {
        calculatedXp,
        totalSales,
        completedLessonsCount,
        totalRevenue,
      });

      // Optimistically set ref to prevent concurrent executions before Firestore updates return
      lastSyncedStatsRef.current = {
        xp: calculatedXp,
        sales: totalSales,
        lessons: completedLessonsCount,
        revenue: totalRevenue,
      };

      const userRef = firestore.doc(db, "users", user.uid);
      
      // Auto-calculate level based on totalSalesAmount instead of XP (Wait, level is based on XP for now, but we will sync totalSalesAmount)
      let calculatedLevel = "Silver";
      if (calculatedXp >= 3000) {
        calculatedLevel = "Elite";
      } else if (calculatedXp >= 1000) {
        calculatedLevel = "Gold";
      }

      firestore.updateDoc(userRef, {
        xp: calculatedXp,
        sales: totalSales,
        lessons: completedLessonsCount,
        completedLessons: userProfile.completedLessons || [],
        revenue: totalRevenue,
        totalSalesAmount: totalSalesAmount,
        level: calculatedLevel,
      }).catch((err: any) => {
        console.error("Error updating synced user stats in Firestore:", err);
      });
    } else {
      // Record already synced state to prevent future runs when initial values match
      lastSyncedStatsRef.current = {
        xp: calculatedXp,
        sales: totalSales,
        lessons: completedLessonsCount,
        revenue: totalRevenue,
      };
    }
  }, [
    user,
    userProfile?.completedLessons,
    userProfile?.xp,
    userProfile?.sales,
    userProfile?.lessons,
    userProfile?.revenue,
    state?.crmBoards,
    state?.deals,
    loading,
  ]);

  // Saves the entire state object
  const saveState = async (newState: AppState) => {
    setState(newState);
    if (!user) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
      return;
    }

    // CRITICAL: Never write to Firestore while initial data is still loading.
    // This prevents default/mock state values from overwriting the real document.
    if (loadingRef.current) {
      console.warn("saveState called while loading — skipping Firestore write to prevent data corruption.");
      return;
    }

    try {
      const baseState = state || defaultState();

      // 1. Settings doc
      const settingsChanged = !state || JSON.stringify(newState.settings) !== JSON.stringify(baseState.settings);
      if (settingsChanged && newState.settings.profileName) {
        await firestore.setDoc(firestore.doc(db, "settings", user.uid), newState.settings);

        // Synchronize language, currency, and name preferences to the user profile document inside 'users' collection
        const profileChanged = !state ||
          newState.settings.profileName !== baseState.settings.profileName ||
          newState.settings.language !== baseState.settings.language ||
          newState.settings.currency !== baseState.settings.currency;

        if (profileChanged) {
          try {
            const userDocRef = firestore.doc(db, "users", user.uid);
            await firestore.setDoc(userDocRef, {
              name: newState.settings.profileName,
              lang: newState.settings.language,
              currency: newState.settings.currency
            }, { merge: true });
          } catch (profileSyncErr) {
            console.error("Error syncing profile settings to user document:", profileSyncErr);
          }
        }
      }

      // 2. Leads reconciliation
      if (!state || JSON.stringify(newState.crmBoards) !== JSON.stringify(baseState.crmBoards)) {
        const oldLeads = baseState.crmBoards.flatMap(b => b.leads.map(l => ({ ...l, boardId: b.id })));
        const newLeads = newState.crmBoards.flatMap(b => b.leads.map(l => ({ ...l, boardId: b.id })));
        await reconcileCollection("leads", newLeads, oldLeads, 
          (item) => `lead-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 3. Bookings reconciliation
      if (!state || JSON.stringify(newState.bookings) !== JSON.stringify(baseState.bookings)) {
        await reconcileCollection("bookings", newState.bookings, baseState.bookings,
          (item) => `booking-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 4. Transactions reconciliation
      if (!state || JSON.stringify(newState.transactions) !== JSON.stringify(baseState.transactions)) {
        await reconcileCollection("transactions", newState.transactions, baseState.transactions,
          (item) => `trans-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 5. Meetings reconciliation
      if (!state || JSON.stringify(newState.meetings) !== JSON.stringify(baseState.meetings)) {
        await reconcileCollection("meetings", newState.meetings, baseState.meetings,
          (item) => `meeting-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 6. Daily Focus reconciliation
      if (!state || JSON.stringify(newState.dailyFocus) !== JSON.stringify(baseState.dailyFocus)) {
        await reconcileCollection("dailyFocus", newState.dailyFocus, baseState.dailyFocus,
          (item) => `focus-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 7. Calendars reconciliation
      if (!state || JSON.stringify(newState.calendars) !== JSON.stringify(baseState.calendars)) {
        await reconcileCollection("calendars", newState.calendars, baseState.calendars,
          (item) => `calendar-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 8. Deals reconciliation
      if (!state || JSON.stringify(newState.deals) !== JSON.stringify(baseState.deals)) {
        await reconcileCollection("deals", newState.deals, baseState.deals,
          (item) => `deal-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 9. Channel Messages reconciliation
      if (!state || JSON.stringify(newState.channelMessages) !== JSON.stringify(baseState.channelMessages)) {
        const oldMsgs = flattenMessages(baseState.channelMessages);
        const newMsgs = flattenMessages(newState.channelMessages);
        await reconcileCollection("channelMessages", newMsgs, oldMsgs,
          (item) => `msg-${item.channelId}-${item.id}`,
          (item) => item
        );
      }

      // 10. DMs reconciliation
      if (!state || JSON.stringify(newState.dms) !== JSON.stringify(baseState.dms)) {
        const oldDms = flattenDms(baseState.dms);
        const newDms = flattenDms(newState.dms);
        await reconcileCollection("dms", newDms, oldDms,
          (item) => `dm-${item.recipientId}-${item.id}`,
          (item) => item
        );
      }

      // 11. Partners reconciliation (Global)
      if (!state || JSON.stringify(newState.partners) !== JSON.stringify(baseState.partners)) {
        await reconcileCollection("partners", newState.partners, baseState.partners,
          (item) => `partner-${item.id}`,
          (item) => item
        );
      }

      // 12. Channels reconciliation (Global)
      if (!state || JSON.stringify(newState.channels) !== JSON.stringify(baseState.channels)) {
        await reconcileCollection("channels", newState.channels, baseState.channels,
          (item) => `channel-${item.id}`,
          (item) => item
        );
      }

      // 13. CRM Boards reconciliation
      const oldBoardsConfig = state ? baseState.crmBoards.map(({ leads, ...b }) => b) : [];
      const newBoardsConfig = newState.crmBoards.map(({ leads, ...b }) => b);
      if (JSON.stringify(newBoardsConfig) !== JSON.stringify(oldBoardsConfig)) {
        await reconcileCollection("crmBoards", newBoardsConfig, oldBoardsConfig,
          (item) => `board-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 14. Packages reconciliation
      if (!state || JSON.stringify(newState.packages) !== JSON.stringify(baseState.packages)) {
        await reconcileCollection("packages", newState.packages, baseState.packages,
          (item) => `pkg-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 15. Scripts reconciliation
      if (!state || JSON.stringify(newState.scripts) !== JSON.stringify(baseState.scripts)) {
        await reconcileCollection("scripts", newState.scripts, baseState.scripts,
          (item) => `script-${item.id}-${item.userId || user.uid}`,
          (item) => ({ ...item, userId: item.userId || user.uid })
        );
      }

      // 16. Payment Methods reconciliation (Global)
      if (!state || JSON.stringify(newState.paymentMethods) !== JSON.stringify(baseState.paymentMethods)) {
        await reconcileCollection("paymentMethods", newState.paymentMethods, baseState.paymentMethods,
          (item) => `pay-${item.id}`,
          (item) => item
        );
      }

      // 17. Tasks reconciliation
      if (!state || JSON.stringify(newState.tasks) !== JSON.stringify(baseState.tasks)) {
        await reconcileCollection("tasks", newState.tasks, baseState.tasks,
          (item) => `task-${item.id}`,
          (item) => item
        );
      }

      // 18. Rules reconciliation (Global)
      if (newState.rules && (!state || JSON.stringify(newState.rules) !== JSON.stringify(baseState.rules))) {
        const mergedRulesToSave = mergeRulesWithInitial(newState.rules);
        await reconcileCollection("rules", mergedRulesToSave, baseState.rules || [],
          (item) => `rule-${item.id}`,
          (item) => item
        );
      }

      // 19. Affiliate Levels reconciliation (Global — admin only writes)
      if (userProfile?.role === "admin" && newState.affiliateLevels && (!state || JSON.stringify(newState.affiliateLevels) !== JSON.stringify(baseState.affiliateLevels))) {
        await reconcileCollection("affiliateLevels", newState.affiliateLevels, baseState.affiliateLevels || [],
          (item) => `level-${item.id}`,
          (item) => item
        );
      }

      // 20. Affiliate Level Settings reconciliation (Global — admin only writes, single doc)
      if (userProfile?.role === "admin" && newState.affiliateLevelSettings && (!state || JSON.stringify(newState.affiliateLevelSettings) !== JSON.stringify(baseState.affiliateLevelSettings))) {
        try {
          const settingsRef = firestore.doc(db, "affiliateLevelSettings", "config");
          await firestore.setDoc(settingsRef, newState.affiliateLevelSettings, { merge: true });
        } catch (levelSettingsErr) {
          console.error("Error saving affiliateLevelSettings:", levelSettingsErr);
        }
      }

    } catch (err) {
      console.error("Error saving state to Firestore:", err);
      toast.error("فشل حفظ التغييرات بقاعدة البيانات");
    }
  };


  // Updates state using an updater callback function (like Immer drafts)
  const updateState = async (updater: (draft: AppState) => void) => {
    // Deep clone state simply
    const draft = JSON.parse(JSON.stringify(state || defaultState())) as AppState;
    updater(draft);

    // Strict Role-Based Permission Check: Only Admins can set task status to "Completed"
    const isAdmin = userProfile?.role === "admin";
    if (!isAdmin && draft.tasks) {
      const baseTasks = state?.tasks || [];
      for (const task of draft.tasks) {
        const baseTask = baseTasks.find((t: any) => t.id === task.id);
        const isNewCompleted = task.status === "Completed" && (!baseTask || baseTask.status !== "Completed");
        if (isNewCompleted) {
          toast.error("غير مصرح: المشرف فقط يمكنه إكمال المهمة", {
            description: "Only Admins have permission to mark tasks as Completed."
          });
          throw new Error("Unauthorized: Only Admins can mark tasks as Completed.");
        }
      }
    }

    await saveState(draft);
  };

  // Core helpers replicated from HTML logic
  const allLeads = (): CrmLead[] => {
    if (!state) return [];
    return state.crmBoards.flatMap(b =>
      b.leads.map(l => ({
        ...l,
        _boardId: b.id,
        _boardName: b.name
      }))
    );
  };

  const getBoard = (id: number) => {
    return state?.crmBoards.find((b) => Number(b.id) === Number(id));
  };

  // ------------------------------------------
  // GLOBAL SINGLE SOURCE OF TRUTH (Total Sales)
  // ------------------------------------------
  const currentUserTotalSalesUSD = useMemo(() => {
    if (!state || !user) return 0;
    const userDeals = state.deals.filter((d: any) => d.userId === user.uid);
    return userDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  }, [state?.deals, user?.uid]);

  const fmtMoney = (usdAmount: number): string => {
    const disp = state?.settings?.currency || "USD";
    const rate = CURRENT_RATES[disp] || 1;
    const converted = disp === "USD" ? (Number(usdAmount) || 0) : (Number(usdAmount) || 0) * rate;
    const symbol = CURRENCY_SYMBOLS[disp] || "$";
    return symbol + Number(converted).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <StateContext.Provider
      value={{
        state,
        loading,
        saveState,
        updateState,
        allLeads,
        getBoard,
        fmtMoney,
        convertCurrency,
        currentUserTotalSalesUSD,
      }}
    >
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within a StateProvider");
  }
  return context as unknown as {
    state: AppState;
    loading: boolean;
    saveState: (newState: AppState) => Promise<void>;
    updateState: (updater: (draft: AppState) => void) => Promise<void>;
    allLeads: () => CrmLead[];
    getBoard: (id: number) => CrmBoard | undefined;
    fmtMoney: (usdAmount: number) => string;
    convertCurrency: (amount: number, from: string, to: string) => number;
  };
}
