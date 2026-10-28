import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword as secondaryCreateUser } from "firebase/auth";
import { 
  auth, 
  authMethods, 
  db,
  firestore, 
  isFirebaseMocked, 
  firebaseConfig 
} from "../config/firebase";
import { toast } from "sonner";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "user";
  createdAt: number;
  lang?: string;
  currency?: string;
  permissions?: string[];
  xp?: number;
  sales?: number;
  lessons?: number;
  revenue?: number;
  streak?: number;
  trend?: number;
  level?: string;
  completedLessons?: string[];
  lastActive?: string | number;
  // New Partner Profile Fields
  businessName?: string;
  adAccountName?: string;
  businessManagerId?: string;
  pixelId?: string;
  whatsappNumber?: string;
  country?: string;
  testimonials?: string;
  paymentMethod?: string;
  paymentDetails?: string;
  rulesAcknowledged?: boolean;
  rulesAcknowledgedAt?: number;
  // Subscription & Terms Gate Fields
  trialEndDate?: number;
  subscription?: { 
    status: 'trial' | 'pro' | 'expired', 
    planId: string, 
    startDate?: number, 
    endDate?: number,
    currentPeriodEnd?: any 
  };
  affiliateRulesAccepted?: boolean;
}

export const DEFAULT_ADMIN_PERMISSIONS = ["all:access"];
export const DEFAULT_PARTNER_PERMISSIONS = [
  // Sales
  "show:sales",
  // Calendar
  "show:calendar",
  // CRM
  "show:crm",
  // Partners
  "show:partners",
  // Academy
  "show:academy",
  // Support (Read Only)
  "show:support",
  // Packages
  "show:packages",
  // Scripts
  "show:scripts",
  // Settings
  "edit:settings",
  // Booking - NEW
  "show:booking",
  "add:booking",
  "edit:booking",
  "delete:booking",
  // Creatives - NEW
  "show:creatives",
];

export const hasPermission = (userPermissions: string[], action: string, module: string): boolean => {
  if (userPermissions.includes("all:access")) return true;
  return userPermissions.includes(`${action}:${module}`);
};

interface AuthContextType {
  user: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  users: UserProfile[];
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  createUser: (
    email: string,
    password: string,
    name: string,
    role: "admin" | "user",
    lang?: string,
    currency?: string,
    permissions?: string[]
  ) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
  updateUserRole: (uid: string, role: "admin" | "user") => Promise<void>;
  updateUser: (uid: string, data: Partial<UserProfile> & { name: string; role: "admin" | "user"; permissions?: string[] }) => Promise<void>;
  hasPermission: (permOrAction: string, module?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem("app_users");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse app_users from localStorage", e);
      }
    }
    return [];
  });

  const isAdmin = userProfile?.role === "admin";

  const hasPermissionContext = (permOrAction: string, module?: string): boolean => {
    if (!userProfile) return false;
    if (userProfile.role === "admin") return true;
    
    // Fallback: Partners (non-admins) always have access to standard tabs
    const allowedPartnerActions = [
      "read:leaderboard",
      "read:academy",
      "read:support",
      "show:crm",
      "read:analysis",
      "show:sales",
      "show:calendar",
      "read:transactions",
      "show:booking",
      "add:booking",
      "edit:booking",
      "delete:booking"
    ];
    if (allowedPartnerActions.includes(permOrAction)) {
      return true;
    }
    
    const userPermissions = userProfile.permissions || [];
    if (userPermissions.includes("all:access")) return true;
    
    let targetAction = "";
    let targetModule = "";
    
    if (module) {
      targetAction = permOrAction;
      targetModule = module;
    } else {
      const parts = permOrAction.split(":");
      if (parts.length === 2) {
        targetAction = parts[0];
        targetModule = parts[1];
      } else {
        // Backward-compatibility: map old flat/CRUD permission strings to new CRUD rules
        if (permOrAction === "show_analysis" || permOrAction === "read:analysis") { targetAction = "show"; targetModule = "sales"; }
        else if (permOrAction === "show_transactions" || permOrAction === "read:transactions") { targetAction = "show"; targetModule = "sales"; }
        else if (permOrAction === "edit_crm" || permOrAction === "update:crm") { targetAction = "show"; targetModule = "crm"; }
        else if (permOrAction === "access_support" || permOrAction === "read:support") { targetAction = "show"; targetModule = "sales"; }
        else if (permOrAction === "show_leaderboard" || permOrAction === "read:leaderboard") { targetAction = "show"; targetModule = "partners"; }
        else if (permOrAction === "access_academy" || permOrAction === "read:academy") { targetAction = "show"; targetModule = "academy"; }
        else {
          return userPermissions.includes(permOrAction);
        }
      }
    }
    
    if (userPermissions.includes(`all:${targetModule}`)) return true;
    return hasPermission(userPermissions, targetAction, targetModule);
  };

  // Auto-seed admin user
  useEffect(() => {
    const seedAdmin = async () => {
      if (sessionStorage.getItem("admin_seeded") === "true") return;

      try {
        if (isFirebaseMocked) {
          // Check mock db users
          const rawList = localStorage.getItem("joe-partner-mock-db:users");
          const usersList = rawList ? JSON.parse(rawList) : {};
          const exists = Object.values(usersList).some(
            (u: any) => u.email.toLowerCase() === "admin@gmail.com"
          );
          if (!exists) {
            const uid = "admin-seeded-uid";
            const newUser = {
              uid,
              email: "admin@gmail.com",
              role: "admin" as const,
              name: "Admin Joe",
              createdAt: Date.now(),
              lang: "en",
              currency: "USD",
              permissions: DEFAULT_ADMIN_PERMISSIONS
            };
            localStorage.setItem(`joe-partner-mock-db:users/${uid}`, JSON.stringify(newUser));
            usersList[uid] = newUser;
            localStorage.setItem("joe-partner-mock-db:users", JSON.stringify(usersList));
            console.log("Mock Admin account seeded.");
          }
        } else {
          // Real Firebase: use secondary App to seed user without disturbing active session
          const secondaryApp = initializeApp(firebaseConfig, `SecondarySeed-${Date.now()}`);
          const secondaryAuth = getAuth(secondaryApp);
          try {
            const result = await secondaryCreateUser(secondaryAuth, "admin@gmail.com", "12345678");
            const uid = result.user.uid;
            
            const userDocRef = firestore.doc(db, "users", uid);
            const profile: UserProfile = {
              uid,
              email: "admin@gmail.com",
              name: "Admin Joe",
              role: "admin",
              createdAt: Date.now(),
              lang: "en",
              currency: "USD",
              permissions: DEFAULT_ADMIN_PERMISSIONS
            };
            await firestore.setDoc(userDocRef, profile);
            console.log("Real Firebase Admin account seeded.");
          } catch (createErr: any) {
            if (createErr.code === "auth/email-already-in-use" || createErr.message?.includes("already-in-use")) {
              console.log("Real Admin account already exists.");
            } else {
              console.error("Error seeding real admin account:", createErr);
            }
          } finally {
            await secondaryAuth.signOut();
            await deleteApp(secondaryApp);
          }
        }
        sessionStorage.setItem("admin_seeded", "true");
      } catch (err) {
        console.error("Failed to seed admin:", err);
      }
    };

    seedAdmin();
  }, []);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    let unsubProgress: (() => void) | null = null;
    let heartbeatInterval: any = null;

    // Listen to Auth changes
    const unsubscribe = authMethods.onAuthStateChanged(auth, async (firebaseUser: any) => {
      setLoading(true);
      
      // Clean up previous listeners & heartbeat
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
      if (unsubProgress) {
        unsubProgress();
        unsubProgress = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);

        // Start heartbeat to update presence
        const updateHeartbeat = async () => {
          try {
            const userDocRef = firestore.doc(db, "users", firebaseUser.uid);
            await firestore.setDoc(userDocRef, { lastActive: Date.now() }, { merge: true });
          } catch (err) {
            console.error("Failed to update presence heartbeat:", err);
          }
        };

        // Run immediately
        updateHeartbeat();
        // Run every 30 seconds
        heartbeatInterval = setInterval(updateHeartbeat, 30000);
        
        // Listen to Firestore profile changes real-time
        const userDocRef = firestore.doc(db, "users", firebaseUser.uid);
        
        // Listen to sub-collection for completed lessons to drive userProfile.completedLessons
        const progressRef = firestore.collection(db, "users", firebaseUser.uid, "academy_progress");
        unsubProgress = firestore.onSnapshot(
          progressRef,
          (progressSnap: any) => {
            const completedKeys = progressSnap.docs.map((d: any) => d.id);
            setUserProfile(prev => {
              if (!prev) return null;
              return {
                ...prev,
                completedLessons: completedKeys
              };
            });
          },
          // Silently handle permission-denied — academy_progress is optional
          (_err: any) => {}
        );

        unsubDoc = firestore.onSnapshot(
          userDocRef,
          async (docSnap: any) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check if lang or currency is missing
            let updatedData = { ...data };
            let needsUpdate = false;
            
            if (!data.lang) {
              updatedData.lang = "en";
              needsUpdate = true;
            }
            if (!data.currency) {
              updatedData.currency = "USD";
              needsUpdate = true;
            }
            
            if (data.completedLessons === undefined) {
              updatedData.completedLessons = [];
              needsUpdate = true;
            }
            
            // Auto-heal leaderboard metrics for partners
            if (data.role !== "admin") {
              if (data.xp === undefined) {
                updatedData.xp = 0;
                needsUpdate = true;
              }
              if (data.sales === undefined) {
                updatedData.sales = 0;
                needsUpdate = true;
              }
              if (data.lessons === undefined) {
                updatedData.lessons = 0;
                needsUpdate = true;
              }
              if (data.revenue === undefined) {
                updatedData.revenue = 0;
                needsUpdate = true;
              }
              if (data.streak === undefined) {
                updatedData.streak = 5; // Default streak: 5 days
                needsUpdate = true;
              }
              if (data.trend === undefined) {
                updatedData.trend = 0; // Default trend
                needsUpdate = true;
              }
              if (data.level === undefined) {
                updatedData.level = "Silver";
                needsUpdate = true;
              }

              // Auto-calculate level based on XP
              const currentXp = Number(updatedData.xp) || 0;
              let calculatedLevel = "Silver";
              if (currentXp >= 3000) {
                calculatedLevel = "Elite";
              } else if (currentXp >= 1000) {
                calculatedLevel = "Gold";
              }
              
              if (updatedData.level !== calculatedLevel) {
                updatedData.level = calculatedLevel;
                needsUpdate = true;
              }
            }
            
            if (needsUpdate) {
              console.log(`Auto-healing profile for user ${firebaseUser.uid}`);
              try {
                await firestore.setDoc(userDocRef, updatedData, { merge: true });
              } catch (updateErr) {
                console.error("Error auto-healing user profile in Firestore:", updateErr);
              }
            }
            
            setUserProfile(prev => {
              const currentCompleted = prev?.completedLessons || data.completedLessons || [];
              const nextProfile = {
                ...updatedData,
                completedLessons: currentCompleted
              } as UserProfile;
              
              if (prev) {
                const prevStr = JSON.stringify({ ...prev, lastActive: 0 });
                const nextStr = JSON.stringify({ ...nextProfile, lastActive: 0 });
                if (prevStr === nextStr) return prev;
              }

              return nextProfile;
            });

            // Trigger welcome toast exactly once per session/login
            const shownKey = `welcome_toast_shown_${firebaseUser.uid}`;
            if (sessionStorage.getItem(shownKey) !== "true") {
              firestore.setDoc(userDocRef, { lastActive: Date.now() }, { merge: true });
              toast.dismiss();
              const lang = updatedData.lang || "en";
              if (updatedData.role === "admin") {
                toast.success(lang === "ar" ? "مرحباً بك بصفة مسؤول النظام" : "Logged in as Administrator", {
                  description: lang === "ar" ? "لديك صلاحيات كاملة لإدارة المنصة" : "You have full privileges to manage the platform.",
                });
              } else {
                toast.success(lang === "ar" ? "مرحباً بك شريكنا العزيز" : "Welcome Partner", {
                  description: lang === "ar" ? "مرحباً بك في لوحة الشركاء" : "Welcome back to the partner portal.",
                });
              }
              sessionStorage.setItem(shownKey, "true");
            }
          } else {
            // Fallback profile if Firestore doc doesn't exist yet
            const isEmailAdmin = firebaseUser.email?.toLowerCase() === "admin@gmail.com" || firebaseUser.email?.toLowerCase().includes("admin");
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
              role: isEmailAdmin ? "admin" : "user",
              createdAt: Date.now(),
              lang: "en",
              currency: "USD",
              permissions: isEmailAdmin ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PARTNER_PERMISSIONS,
              xp: isEmailAdmin ? undefined : 0,
              sales: isEmailAdmin ? undefined : 0,
              lessons: isEmailAdmin ? undefined : 0,
              revenue: isEmailAdmin ? undefined : 0,
              streak: isEmailAdmin ? undefined : 5,
              trend: isEmailAdmin ? undefined : 0,
              level: isEmailAdmin ? undefined : "Silver",
              lastActive: Date.now()
            };
            setUserProfile(fallbackProfile);
            firestore.setDoc(userDocRef, fallbackProfile);

            // Trigger welcome toast exactly once per session/login
            const shownKey = `welcome_toast_shown_${firebaseUser.uid}`;
            if (sessionStorage.getItem(shownKey) !== "true") {
              toast.dismiss();
              const lang = fallbackProfile.lang || "en";
              if (fallbackProfile.role === "admin") {
                toast.success(lang === "ar" ? "مرحباً بك بصفة مسؤول النظام" : "Logged in as Administrator", {
                  description: lang === "ar" ? "لديك صلاحيات كاملة لإدارة المنصة" : "You have full privileges to manage the platform.",
                });
              } else {
                toast.success(lang === "ar" ? "مرحباً بك شريكنا العزيز" : "Welcome Partner", {
                  description: lang === "ar" ? "مرحباً بك في لوحة الشركاء" : "Welcome back to the partner portal.",
                });
              }
              sessionStorage.setItem(shownKey, "true");
            }
          }
          setLoading(false);
        },
        // Error handler: Firestore permission-denied or unavailable.
        // Build a fallback profile from Firebase Auth data so the app still works.
        (_err: any) => {
          const isEmailAdmin =
            firebaseUser.email?.toLowerCase() === "admin@gmail.com" ||
            firebaseUser.email?.toLowerCase().includes("admin");
          const fallback: any = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
            role: isEmailAdmin ? "admin" : "user",
            createdAt: Date.now(),
            lang: "en",
            currency: "USD",
            permissions: isEmailAdmin ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PARTNER_PERMISSIONS,
            xp: isEmailAdmin ? undefined : 0,
            sales: isEmailAdmin ? undefined : 0,
            lessons: isEmailAdmin ? undefined : 0,
            revenue: isEmailAdmin ? undefined : 0,
            streak: isEmailAdmin ? undefined : 5,
            trend: isEmailAdmin ? undefined : 0,
            level: isEmailAdmin ? undefined : "Silver",
            lastActive: Date.now(),
          };
          setUserProfile(fallback);
          setLoading(false);
        }
        );
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubDoc) unsubDoc();
      if (unsubProgress) unsubProgress();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      unsubscribe();
    };
  }, []);

  // Listen to all users list in real-time (Admin only)
  useEffect(() => {
    if (user && isAdmin) {
      const saved = localStorage.getItem("app_users");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) {
            setUsers(parsed);
          }
        } catch (e) {
          console.error("Failed to parse app_users", e);
        }
      }

      const usersRef = firestore.collection(db, "users");
      const unsubUsers = firestore.onSnapshot(usersRef, (snap: any) => {
        const list = snap.docs.map((d: any) => ({ ...d.data(), uid: d.id } as UserProfile));
        const sorted = list.sort((a: UserProfile, b: UserProfile) => b.createdAt - a.createdAt);
        localStorage.setItem("app_users", JSON.stringify(sorted));
        setUsers(sorted);
      });
      return () => unsubUsers();
    } else {
      setUsers([]);
    }
  }, [user, isAdmin]);

  const signIn = async (email: string, password: string) => {
    try {
      await authMethods.signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Sign in error:", error);
      let errMsg = "An error occurred during sign in";
      if (error.code === "auth/invalid-credential" || error.message?.includes("credential")) {
        errMsg = "Invalid email or password";
      } else if (error.code === "auth/user-not-found") {
        errMsg = "User not found";
      } else if (error.code === "auth/wrong-password") {
        errMsg = "Incorrect password";
      }
      toast.error(errMsg);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await auth.signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Log out error:", error);
      toast.error("An error occurred during logout");
    }
  };

  // Creates a user inside Firebase Auth & Firestore without logging out the current admin
  const createUser = async (
    email: string,
    password: string,
    name: string,
    role: "admin" | "user",
    lang?: string,
    currency?: string,
    permissions?: string[]
  ) => {
    try {
      let newUid = "";
      
      // Load default permissions if not provided
      let finalPermissions = permissions;
      if (!finalPermissions) {
        try {
          const defaultDoc = await firestore.getDoc(firestore.doc(db, "settings", "default_permissions"));
          if (defaultDoc.exists()) {
            finalPermissions = defaultDoc.data()[role] || [];
          } else {
            finalPermissions = role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PARTNER_PERMISSIONS;
          }
        } catch (e) {
          console.error("Failed to load default permissions:", e);
          finalPermissions = role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PARTNER_PERMISSIONS;
        }
      }

      let profile: UserProfile;

      // Load default trial duration
      let trialDurationDays = 30;
      try {
        const configDoc = await firestore.getDoc(firestore.doc(db, "settings", "subscriptionConfig"));
        if (configDoc.exists()) {
          const configData = configDoc.data();
          if (configData.trialDurationDays !== undefined) {
            trialDurationDays = configData.trialDurationDays;
          }
        }
      } catch (e) {
        console.error("Failed to load subscription config:", e);
      }
      
      const trialEndDate = Date.now() + (trialDurationDays * 24 * 60 * 60 * 1000);
      const subscription = {
        status: 'trial' as const,
        planId: 'free-trial',
        startDate: Date.now(),
        endDate: trialEndDate
      };

      if (isFirebaseMocked) {
        const result = await authMethods.createUserWithEmailAndPassword(auth, email, password);
        newUid = result.user.uid;
        
        // The mock already saves the profile, but we overwrite it with custom parameters (name, role, lang, currency, permissions)
        const userDocRef = firestore.doc(db, "users", newUid);
        profile = {
          uid: newUid,
          email,
          name,
          role,
          createdAt: Date.now(),
          lang: lang || "en",
          currency: currency || "USD",
          permissions: finalPermissions,
          trialEndDate,
          subscription,
          affiliateRulesAccepted: false
        };
        await firestore.setDoc(userDocRef, profile);
      } else {
        // Create user using a secondary Firebase app so we don't log out the current admin session
        const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp-${Date.now()}`);
        const secondaryAuth = getAuth(secondaryApp);
        
        const result = await secondaryCreateUser(secondaryAuth, email, password);
        newUid = result.user.uid;
        
        // Save profile in firestore
        const userDocRef = firestore.doc(db, "users", newUid);
        profile = {
          uid: newUid,
          email,
          name,
          role,
          createdAt: Date.now(),
          lang: lang || "en",
          currency: currency || "USD",
          permissions: finalPermissions,
          trialEndDate,
          subscription,
          affiliateRulesAccepted: false
        };
        await firestore.setDoc(userDocRef, profile);
        
        // Sign out secondary auth and delete secondary app to clean up memory
        await secondaryAuth.signOut();
        await deleteApp(secondaryApp);
      }
      
      // Update local storage app_users immediately
      const updatedUsers = [profile, ...users];
      localStorage.setItem("app_users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      
      toast.success("User created successfully");
    } catch (error: any) {
      console.error("Create user error:", error);
      let errMsg = "An error occurred during user creation";
      if (error.code === "auth/email-already-in-use") {
        errMsg = "Email is already in use";
      } else if (error.code === "auth/weak-password") {
        errMsg = "Password is too weak (must be at least 6 characters)";
      }
      toast.error(errMsg);
      throw error;
    }
  };

  const deleteUser = async (uid: string) => {
    try {
      if (isFirebaseMocked) {
        const raw = localStorage.getItem("joe-partner-mock-db:users");
        if (raw) {
          const list = JSON.parse(raw);
          delete list[uid];
          localStorage.setItem("joe-partner-mock-db:users", JSON.stringify(list));
        }
        localStorage.removeItem(`joe-partner-mock-db:users/${uid}`);

        // Also clean up partner mock DB data
        const rawPartners = localStorage.getItem("joe-partner-mock-db:partners");
        if (rawPartners) {
          const partnersList = JSON.parse(rawPartners);
          delete partnersList[uid];
          localStorage.setItem("joe-partner-mock-db:partners", JSON.stringify(partnersList));
        }
        localStorage.removeItem(`joe-partner-mock-db:partners/${uid}`);
      }
      
      const userDocRef = firestore.doc(db, "users", uid);
      await firestore.deleteDoc(userDocRef);

      const partnerDocRef = firestore.doc(db, "partners", uid);
      await firestore.deleteDoc(partnerDocRef);
      
      // Update local state and localStorage immediately before setting state
      const updatedUsers = users.filter((u) => u.uid !== uid);
      localStorage.setItem("app_users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Delete user error:", error);
      toast.error("An error occurred during user deletion");
      throw error;
    }
  };

  const updateUser = async (
    uid: string,
    data: { name: string; role: "admin" | "user"; permissions?: string[] }
  ) => {
    try {
      if (isFirebaseMocked) {
        const raw = localStorage.getItem("joe-partner-mock-db:users");
        if (raw) {
          const list = JSON.parse(raw);
          if (list[uid]) {
            list[uid] = { ...list[uid], ...data };
            localStorage.setItem("joe-partner-mock-db:users", JSON.stringify(list));
          }
        }
        const userRaw = localStorage.getItem(`joe-partner-mock-db:users/${uid}`);
        if (userRaw) {
          const u = JSON.parse(userRaw);
          localStorage.setItem(`joe-partner-mock-db:users/${uid}`, JSON.stringify({ ...u, ...data }));
        }

        // Also mock-update settings DB if it exists
        const rawSettings = localStorage.getItem(`joe-partner-mock-db:settings/${uid}`) || localStorage.getItem(`joe-partner-mock-db:settings`);
        // If settings doc is stored per user
        const userSettingsRaw = localStorage.getItem(`joe-partner-mock-db:settings/${uid}`);
        if (userSettingsRaw) {
          const s = JSON.parse(userSettingsRaw);
          if (data.name) s.profileName = data.name;
          if (data.role) s.profileRole = data.role === "admin" ? "Admin" : "Partner";
          localStorage.setItem(`joe-partner-mock-db:settings/${uid}`, JSON.stringify(s));
        }
      }
      
      const userDocRef = firestore.doc(db, "users", uid);
      await firestore.setDoc(userDocRef, data, { merge: true });

      // Synchronize changes to settings document
      try {
        const settingsDocRef = firestore.doc(db, "settings", uid);
        const settingsSnap = await firestore.getDoc(settingsDocRef);
        if (settingsSnap.exists()) {
          const updateData: any = {};
          if (data.name) {
            updateData.profileName = data.name;
          }
          if (data.role) {
            updateData.profileRole = data.role === "admin" ? "Admin" : "Partner";
          }
          await firestore.setDoc(settingsDocRef, updateData, { merge: true });
        }
      } catch (settingsSyncErr) {
        console.error("Error syncing user modifications to settings document:", settingsSyncErr);
      }

      // Update local storage app_users immediately
      const updatedUsers = users.map((u) => u.uid === uid ? { ...u, ...data } : u);
      localStorage.setItem("app_users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
    } catch (error) {
      console.error("Update user error:", error);
      toast.error("An error occurred during user update");
      throw error;
    }
  };

  const updateUserRole = async (uid: string, role: "admin" | "user") => {
    try {
      const userDocRef = firestore.doc(db, "users", uid);
      await firestore.updateDoc(userDocRef, { role });
      toast.success("User role updated successfully");
    } catch (error) {
      console.error("Update role error:", error);
      toast.error("An error occurred during user role update");
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAdmin,
        users,
        signIn,
        logOut,
        createUser,
        deleteUser,
        updateUserRole,
        updateUser,
        hasPermission: hasPermissionContext
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
