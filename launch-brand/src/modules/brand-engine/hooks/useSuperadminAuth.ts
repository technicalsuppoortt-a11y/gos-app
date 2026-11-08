import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
  tier?: string;
  disabled?: boolean;
  status?: string;
  accountStatus?: string;
}

export function useSuperadminAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let request = 0;
    let stopProfile: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      stopProfile?.();
      const currentRequest = ++request;
      setUser(u);
      setProfile(null);
      setLoading(true);
      if (u) {
        stopProfile = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
          if (!active || currentRequest !== request) return;
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
              uid: u.uid,
              email: u.email || (typeof data["email"] === "string" ? data["email"] : ""),
              displayName:
                (typeof data["displayName"] === "string" ? data["displayName"] : "") ||
                u.displayName ||
                "",
              ...(typeof data["role"] === "string" ? { role: data["role"] } : {}),
              ...(typeof data["tier"] === "string" ? { tier: data["tier"] } : {}),
              disabled: data.disabled === true,
              ...(typeof data.status === 'string' ? { status: data.status } : {}),
              ...(typeof data.accountStatus === 'string' ? { accountStatus: data.accountStatus } : {}),
            });
          } else {
            setProfile({ uid: u.uid, email: u.email!, displayName: u.displayName || "" });
          }
          setLoading(false);
        }, () => {
          if (!active || currentRequest !== request) return;
          setProfile(null);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      request++;
      stopProfile?.();
      unsubscribe();
    };
  }, []);

  return { user, profile, loading, setProfile };
}
