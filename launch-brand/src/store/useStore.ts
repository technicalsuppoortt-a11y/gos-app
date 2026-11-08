import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';
import { STANDARD_USER_TIER, standardizeUserProfile } from '../shared/userExperience';
import type { AccountAccessSummary } from '../types/billing';
import type { BrandEngineStatus } from '../shared/brandEngineAccount';
import type { Role } from '../shared/permissions';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'ar';

export interface TourStep {
  id: string;
  targetId: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: string;
  order: number;
}

interface AppState {
  theme: Theme;
  themeByUser: Record<string, Theme>;
  language: Language;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: any | null;
  userProfile: any | null;
  accountAccess: AccountAccessSummary | null;
  brandEngineStatus: BrandEngineStatus;
  brandEngineDocumentUid: string | null;
  setBrandEngineStatus: (ownerUid: string, status: BrandEngineStatus, documentUid?: string) => void;
  role: Role;
  userTier: 'high_ticket' | 'low_ticket' | 'webinar' | null;
  
  // Tour State
  isTourOpen: boolean;
  currentTourIndex: number;
  tourSteps: TourStep[];
  
  // Launch Modal State
  isLaunchModalOpen: boolean;
  isBrandCompleted: boolean;
  brandConfigurationReady: boolean;
  setBrandConfigurationReady: (ready: boolean) => void;
  
  // Joe AI Coach State
  isJoeChatOpen: boolean;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  setAuthenticated: (status: boolean) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setUser: (user: any | null) => void;
  setUserProfile: (profile: any | null) => void;
  setAccountAccess: (access: AccountAccessSummary | null) => void;
  setRole: (role: Role) => void;
  setUserTier: (tier: 'high_ticket' | 'low_ticket' | 'webinar' | null) => void;
  
  // Tour Actions
  setTourSteps: (steps: TourStep[]) => void;
  startTour: () => void;
  endTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  
  // Launch Modal Actions
  setIsLaunchModalOpen: (isOpen: boolean) => void;
  setIsBrandCompleted: (status: boolean) => void;
  
  // Joe AI Coach Actions
  setIsJoeChatOpen: (isOpen: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      themeByUser: {},
      language: 'en',
      isAuthenticated: false,
      isAuthLoading: true,
      user: null,
      userProfile: null,
      accountAccess: null,
      brandEngineStatus: 'checking',
      brandEngineDocumentUid: null,
      role: 'user',
      userTier: STANDARD_USER_TIER,
      
      // Tour Initial State
      isTourOpen: false,
      currentTourIndex: 0,
      tourSteps: [],
      
      // Launch Modal Initial State
      isLaunchModalOpen: false,
      isBrandCompleted: false,
      brandConfigurationReady: false,
      setBrandConfigurationReady: (ready) => set({ brandConfigurationReady: ready }),
      isJoeChatOpen: false,
      
      setTheme: (theme) => set(state => ({
        theme,
        ...(state.user?.uid ? { themeByUser: { ...state.themeByUser, [state.user.uid]: theme } } : {}),
      })),
      setLanguage: (language) => {
        i18n.changeLanguage(language);
        set({ language });
      },
      setAuthenticated: (status) => set({ isAuthenticated: status, userTier: status ? STANDARD_USER_TIER : null }),
      setIsAuthLoading: (loading) => set({ isAuthLoading: loading }),
      setUser: (user) => set(state => ({ user, ...(state.user?.uid !== user?.uid ? {
        theme: user?.uid ? state.themeByUser[user.uid] || 'light' : 'light',
        brandEngineStatus: 'checking' as const, brandEngineDocumentUid: null, brandConfigurationReady: false, userProfile: null,
      } : {}) })),
      setUserProfile: (profile) => set(state => ({ userProfile: profile ? { ...standardizeUserProfile(profile), isBrandEngineProvisioned: state.brandEngineStatus === 'provisioned' } : null })),
      setBrandEngineStatus: (ownerUid, status, documentUid) => set(state => {
        if (state.user?.uid !== ownerUid) return state;
        return { brandEngineStatus: status, brandEngineDocumentUid: status === 'provisioned' ? documentUid || null : null,
          userProfile: state.userProfile ? { ...state.userProfile, isBrandEngineProvisioned: status === 'provisioned' } : null };
      }),
      setAccountAccess: (accountAccess) => set({ accountAccess }),
      setRole: (role) => set({ role }),
      // Legacy tier assignment: setUserTier: (tier) => set({ userTier: tier }),
      setUserTier: () => set(state => ({ userTier: state.isAuthenticated ? STANDARD_USER_TIER : null })),
      
      setTourSteps: (steps) => set({ tourSteps: steps }),
      startTour: () => set(() => {
        // Legacy tier gate: if (state.userTier !== 'high_ticket' && state.role !== 'admin') return state;
        return { isTourOpen: true, currentTourIndex: 0 };
      }),
      endTour: () => set({ isTourOpen: false }),
      nextTourStep: () => set((state) => ({ 
        currentTourIndex: Math.min(state.currentTourIndex + 1, state.tourSteps.length - 1) 
      })),
      prevTourStep: () => set((state) => ({ 
        currentTourIndex: Math.max(state.currentTourIndex - 1, 0) 
      })),
      
      setIsLaunchModalOpen: (isOpen) => set({ isLaunchModalOpen: isOpen }),
      setIsBrandCompleted: (status) => set({ isBrandCompleted: status }),
      
      // Joe AI Coach Actions
      setIsJoeChatOpen: (isOpen) => set({ isJoeChatOpen: isOpen }),
    }),
    {
      name: 'phoenixbiz-storage',
      partialize: (state) => ({
        themeByUser: state.themeByUser,
        language: state.language,
      }),
      // The old shared theme has no account owner. Never assign it to a user.
      merge: (persisted, current) => {
        const saved = persisted as Partial<AppState> | undefined;
        const themeByUser = Object.fromEntries(
          Object.entries(saved?.themeByUser || {}).filter(([, theme]) =>
            theme === 'light' || theme === 'dark' || theme === 'system'),
        ) as Record<string, Theme>;
        return {
          ...current,
          language: saved?.language === 'ar' || saved?.language === 'en' ? saved.language : current.language,
          themeByUser,
          theme: 'light',
        };
      },
    }
  )
);
