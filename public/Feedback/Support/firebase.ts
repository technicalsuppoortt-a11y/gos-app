import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  QueryConstraint,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
} from "firebase/firestore";

// Read environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_FIREBASE_API_KEY || "AIzaSyA1ydJLKdT6gD3A0JU1prgko5GTP1H0vyg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "partner-os-e1f2e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "partner-os-e1f2e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGE_SENDER_ID || "261599187954",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:261599187954:web:3e988dcc7b94dcd796916b",
};

const isRealFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

let app: any;
let auth: any;
let db: any;
let storage: any = null;
let isFirebaseMocked = true;

if (isRealFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isFirebaseMocked = false;
  } catch (error) {
    console.error("Firebase initialization failed. Falling back to local storage mocks.", error);
  }
}

// ==========================================
// REAL-TIME LOCAL MOCK SYSTEM FALLBACK
// ==========================================
class LocalDbEventBus extends EventTarget {
  notify(channel: string) {
    this.dispatchEvent(new Event(channel));
  }
}
const localEventBus = new LocalDbEventBus();

const MOCK_AUTH_KEY = "joe-partner-mock-auth";
const MOCK_FIRESTORE_PREFIX = "joe-partner-mock-db:";

const getMockData = (path: string): any => {
  const raw = localStorage.getItem(MOCK_FIRESTORE_PREFIX + path);
  return raw ? JSON.parse(raw) : null;
};

const setMockData = (path: string, data: any) => {
  localStorage.setItem(MOCK_FIRESTORE_PREFIX + path, JSON.stringify(data));
  localEventBus.notify(path);
  // Also notify parent collections for query listeners
  const parts = path.split("/");
  if (parts.length > 1) {
    const parentCollection = parts.slice(0, -1).join("/");
    localEventBus.notify(parentCollection);
  }
};

const deleteMockData = (path: string) => {
  localStorage.removeItem(MOCK_FIRESTORE_PREFIX + path);
  localEventBus.notify(path);
  const parts = path.split("/");
  if (parts.length > 1) {
    const parentCollection = parts.slice(0, -1).join("/");
    localEventBus.notify(parentCollection);
  }
};

// Seed default users if mock DB is empty
if (isFirebaseMocked) {
  const usersPath = "users";
  const existingUsers = getMockData(usersPath) || {};
  
  const seedUsers: Record<string, any> = {
    "admin-uid": {
      uid: "admin-uid",
      email: "admin@joe.com",
      role: "admin",
      name: "Admin Joe",
      createdAt: Date.now(),
    },
    "user-uid": {
      uid: "user-uid",
      email: "user@joe.com",
      role: "user",
      name: "User Mohammed",
      createdAt: Date.now(),
    },
    "partner-1": {
      uid: "partner-1",
      email: "ahmed@joe.com",
      role: "user",
      name: "Ahmed Ali",
      xp: 3450,
      sales: 12,
      lessons: 22,
      level: "Elite",
      streak: 15,
      trend: 2,
      revenue: 4500,
      createdAt: Date.now() - 10000000,
    },
    "partner-2": {
      uid: "partner-2",
      email: "sara@joe.com",
      role: "user",
      name: "Sara Hassan",
      xp: 2200,
      sales: 8,
      lessons: 18,
      level: "Gold",
      streak: 8,
      trend: 1,
      revenue: 2800,
      createdAt: Date.now() - 20000000,
    },
    "partner-3": {
      uid: "partner-3",
      email: "youssef@joe.com",
      role: "user",
      name: "Youssef Omar",
      xp: 950,
      sales: 4,
      lessons: 10,
      level: "Silver",
      streak: 3,
      trend: -1,
      revenue: 1200,
      createdAt: Date.now() - 30000000,
    },
    "partner-4": {
      uid: "partner-4",
      email: "mona@joe.com",
      role: "user",
      name: "Mona Khaled",
      xp: 150,
      sales: 1,
      lessons: 3,
      level: "Silver",
      streak: 1,
      trend: 0,
      revenue: 300,
      createdAt: Date.now() - 40000000,
    }
  };

  let needsSave = false;
  Object.keys(seedUsers).forEach((uid) => {
    if (!existingUsers[uid]) {
      setMockData(`users/${uid}`, seedUsers[uid]);
      existingUsers[uid] = seedUsers[uid];
      needsSave = true;
    }
  });

  if (needsSave || Object.keys(existingUsers).length === 0) {
    setMockData(usersPath, existingUsers);
  }
}

// Custom mock functions that replicate Firebase API
const mockAuth = {
  currentUser: null as any,
  _listeners: [] as Array<(user: any) => void>,

  init() {
    const saved = localStorage.getItem(MOCK_AUTH_KEY);
    if (saved) {
      const userSession = JSON.parse(saved);
      // Load user profile from mock firestore
      const userProfile = getMockData(`users/${userSession.uid}`);
      this.currentUser = { ...userSession, ...userProfile };
    }
    this._trigger();
  },

  _trigger() {
    this._listeners.forEach((cb) => cb(this.currentUser));
  },

  onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
    this._listeners.push(callback);
    // Call immediately with current state
    setTimeout(() => callback(this.currentUser), 0);
    return () => {
      this._listeners = this._listeners.filter((cb) => cb !== callback);
    };
  },

  async signInWithEmailAndPassword(authInstance: any, email: string, password: any) {
    await new Promise((r) => setTimeout(r, 600)); // simulate latency

    // Check credentials inside local db
    const usersList = getMockData("users") || {};
    const userDoc = Object.values(usersList).find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase(),
    ) as any;

    // For demo purposes, any password >= 6 characters works
    if (!userDoc || password.length < 6) {
      throw new Error("auth/invalid-credential");
    }

    const session = {
      uid: userDoc.uid,
      email: userDoc.email,
      displayName: userDoc.name,
      emailVerified: true,
    };

    localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(session));
    this.currentUser = { ...session, ...userDoc };
    this._trigger();
    return { user: this.currentUser };
  },

  async signOut(authInstance?: any) {
    localStorage.removeItem(MOCK_AUTH_KEY);
    this.currentUser = null;
    this._trigger();
  },

  async createUserWithEmailAndPassword(authInstance: any, email: string, password: any) {
    await new Promise((r) => setTimeout(r, 600));
    if (password.length < 6) {
      throw new Error("auth/weak-password");
    }

    const usersList = getMockData("users") || {};
    const exists = Object.values(usersList).some(
      (u: any) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (exists) {
      throw new Error("auth/email-already-in-use");
    }

    const uid = "mock-" + Math.random().toString(36).substring(2, 11);
    const newUser = {
      uid,
      email,
      role: "user",
      name: email.split("@")[0],
      createdAt: Date.now(),
    };

    // Add to simulated DB
    setMockData(`users/${uid}`, newUser);
    const updatedList = { ...usersList, [uid]: newUser };
    setMockData("users", updatedList);

    return {
      user: {
        uid,
        email,
        displayName: newUser.name,
      },
    };
  },
};

// Replicate Firestore mock methods
const mockDb = {
  isMock: true,
};

if (isFirebaseMocked) {
  auth = mockAuth;
  db = mockDb;
  auth.init();
}

const getPathFromRef = (ref: any): string => {
  if (ref.docId) {
    return `${ref.collectionName}/${ref.docId}`;
  }
  return ref.collectionName;
};

const mockFirestore = {
  _processFields: (existing: any, newData: any) => {
    const result = { ...existing };
    if (!newData) return result;
    Object.keys(newData).forEach((key) => {
      const val = newData[key];
      if (val && typeof val === "object" && val.__type === "increment") {
        const currentVal = Number(result[key]) || 0;
        result[key] = currentVal + val.value;
      } else if (val && typeof val === "object" && val.__type === "arrayUnion") {
        const currentVal = Array.isArray(result[key]) ? result[key] : [];
        const unionSet = new Set([...currentVal, ...val.elements]);
        result[key] = Array.from(unionSet);
      } else if (val && typeof val === "object" && val.__type === "arrayRemove") {
        const currentVal = Array.isArray(result[key]) ? result[key] : [];
        result[key] = currentVal.filter((item: any) => !val.elements.includes(item));
      } else {
        result[key] = val;
      }
    });
    return result;
  },
  increment: (value: number) => {
    return { __type: "increment", value };
  },
  arrayUnion: (...elements: any[]) => {
    return { __type: "arrayUnion", elements };
  },
  arrayRemove: (...elements: any[]) => {
    return { __type: "arrayRemove", elements };
  },
  collection: (dbRef: any, collectionName: string) => {
    return { collectionName };
  },
  doc: (parent: any, ...pathSegments: string[]) => {
    // Handle real Firebase signature: doc(db, "collection", "docId") or doc(db, "col", "doc", "subcol", "subdoc")
    // Also handle: doc(collectionRef, "docId")
    let collectionName = "";
    let docId = "";

    if (parent && typeof parent === "object" && parent.collectionName) {
      // Called as doc(collectionRef, "docId")
      collectionName = parent.collectionName;
      docId = pathSegments[0] || "";
    } else {
      // Called as doc(db, "collection", "docId", ...) — db is first arg (ignored), rest are path segments
      // pathSegments = ["collection", "docId"] or ["col", "doc", "subcol", "subdoc", ...]
      const segments = pathSegments;
      // Build path: even indices are collections, odd are doc IDs
      // Final path is all segments joined by "/"
      const fullPath = segments.join("/");
      const parts = fullPath.split("/");
      // Last segment is the docId, everything before (joined by '/') is the collection path
      docId = parts[parts.length - 1];
      collectionName = parts.slice(0, -1).join("/");
    }
    return { collectionName, docId };
  },
  getDoc: async (docRef: any) => {
    await new Promise((r) => setTimeout(r, 100));
    const path = getPathFromRef(docRef);
    const data = getMockData(path);
    return {
      id: docRef.docId,
      exists: () => data !== null,
      data: () => data,
    };
  },
  setDoc: async (docRef: any, data: any, options?: any) => {
    await new Promise((r) => setTimeout(r, 100));
    const path = getPathFromRef(docRef);
    let finalData = data;
    if (options?.merge) {
      const existing = getMockData(path) || {};
      finalData = mockFirestore._processFields(existing, data);
    } else {
      finalData = mockFirestore._processFields({}, data);
    }
    setMockData(path, finalData);

    // Update summary list for collection
    const collectionName = docRef.collectionName;
    const currentList = getMockData(collectionName) || {};
    currentList[docRef.docId] = finalData;
    setMockData(collectionName, currentList);
  },
  addDoc: async (collRef: any, data: any) => {
    await new Promise((r) => setTimeout(r, 100));
    const docId = "mock-doc-" + Math.random().toString(36).substring(2, 11);
    const path = `${collRef.collectionName}/${docId}`;
    const finalData = { ...data, id: docId };
    setMockData(path, finalData);

    const currentList = getMockData(collRef.collectionName) || {};
    currentList[docId] = finalData;
    setMockData(collRef.collectionName, currentList);

    return { id: docId };
  },
  updateDoc: async (docRef: any, data: any) => {
    await new Promise((r) => setTimeout(r, 100));
    const path = getPathFromRef(docRef);
    const existing = getMockData(path) || {};
    const finalData = mockFirestore._processFields(existing, data);
    setMockData(path, finalData);

    const collectionName = docRef.collectionName;
    const currentList = getMockData(collectionName) || {};
    currentList[docRef.docId] = finalData;
    setMockData(collectionName, currentList);
  },
  deleteDoc: async (docRef: any) => {
    await new Promise((r) => setTimeout(r, 100));
    const path = getPathFromRef(docRef);
    deleteMockData(path);

    const collectionName = docRef.collectionName;
    const currentList = getMockData(collectionName) || {};
    delete currentList[docRef.docId];
    setMockData(collectionName, currentList);
  },
  getDocs: async (collRef: any) => {
    await new Promise((r) => setTimeout(r, 100));
    const list = getMockData(collRef.collectionName) || {};
    let docs = Object.keys(list).map((id) => ({
      id,
      data: () => list[id],
    }));
    if (collRef.constraints) {
      collRef.constraints.forEach((c: any) => {
        if (c && c.type === "where") {
          const { field, value } = c;
          docs = docs.filter(docObj => {
            const data = docObj.data();
            return data && data[field] === value;
          });
        }
      });
    }
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
    };
  },
  onSnapshot: (ref: any, callback: (snapshot: any) => void) => {
    const path = getPathFromRef(ref);

    const listener = () => {
      if (ref.docId) {
        // Doc listener
        const data = getMockData(path);
        callback({
          id: ref.docId,
          exists: () => data !== null,
          data: () => data,
        });
      } else {
        // Collection listener
        const list = getMockData(ref.collectionName) || {};
        let docs = Object.keys(list).map((id) => ({
          id,
          data: () => list[id],
        }));
        if (ref.constraints) {
          ref.constraints.forEach((c: any) => {
            if (c && c.type === "where") {
              const { field, value } = c;
              docs = docs.filter(docObj => {
                const data = docObj.data();
                return data && data[field] === value;
              });
            }
          });
        }
        callback({
          docs,
          empty: docs.length === 0,
          size: docs.length,
        });
      }
    };

    // Register listener on event bus
    localEventBus.addEventListener(path, listener);

    // Call immediately
    setTimeout(listener, 0);

    // Return unsubscribe function
    return () => {
      localEventBus.removeEventListener(path, listener);
    };
  },
  query: (ref: any, ...constraints: any[]) => {
    return { ...ref, constraints };
  },
  where: (field: string, op: string, value: any) => {
    return { type: "where", field, op, value };
  },
  runTransaction: async (dbRef: any, updateFn: (transaction: any) => Promise<any>) => {
    const transaction = {
      get: async (docRef: any) => {
        const path = getPathFromRef(docRef);
        const data = getMockData(path);
        return {
          id: docRef.docId,
          exists: () => data !== null,
          data: () => data,
        };
      },
      set: (docRef: any, data: any, options?: any) => {
        const path = getPathFromRef(docRef);
        let finalData = data;
        if (options?.merge) {
          const existing = getMockData(path) || {};
          finalData = mockFirestore._processFields(existing, data);
        } else {
          finalData = mockFirestore._processFields({}, data);
        }
        setMockData(path, finalData);

        const collectionName = docRef.collectionName;
        const currentList = getMockData(collectionName) || {};
        currentList[docRef.docId] = finalData;
        setMockData(collectionName, currentList);
      },
      update: (docRef: any, data: any) => {
        const path = getPathFromRef(docRef);
        const existing = getMockData(path) || {};
        const finalData = mockFirestore._processFields(existing, data);
        setMockData(path, finalData);

        const collectionName = docRef.collectionName;
        const currentList = getMockData(collectionName) || {};
        currentList[docRef.docId] = finalData;
        setMockData(collectionName, currentList);
      },
      delete: (docRef: any) => {
        const path = getPathFromRef(docRef);
        deleteMockData(path);

        const collectionName = docRef.collectionName;
        const currentList = getMockData(collectionName) || {};
        delete currentList[docRef.docId];
        setMockData(collectionName, currentList);
      }
    };
    return await updateFn(transaction);
  },
};
// Secondary storage for media uploads (images and videos)
const firebaseStorageConfig = {
  apiKey: "AIzaSyCaswftcLmfIepG_F8fzizqGXFl5mnXvj8",
  authDomain: "aibrand-vision.firebaseapp.com",
  projectId: "aibrand-vision",
  storageBucket: "aibrand-vision.firebasestorage.app",
  messagingSenderId: "36898907108",
  appId: "1:36898907108:web:423352bb5b0f5825d65df1",
  measurementId: "G-G0CFX66Q3V"
};

let mediaStorage: any = null;
try {
  const mediaApp = getApps().find((a) => a.name === "mediaStorageApp") 
    || initializeApp(firebaseStorageConfig, "mediaStorageApp");
  mediaStorage = getStorage(mediaApp);
} catch (err) {
  console.error("Secondary storage initialization failed", err);
}

export { firebaseConfig, isFirebaseMocked, auth, db, storage, mediaStorage };


// Wrap core exports dynamically
export const firestore = isFirebaseMocked
  ? mockFirestore
  : {
      collection,
      doc,
      getDoc,
      setDoc,
      addDoc,
      updateDoc,
      deleteDoc,
      getDocs,
      onSnapshot,
      query,
      where,
      increment,
      arrayUnion,
      arrayRemove,
      runTransaction,
    };

export const authMethods = isFirebaseMocked
  ? mockAuth
  : {
      signInWithEmailAndPassword,
      signOut,
      createUserWithEmailAndPassword,
      onAuthStateChanged,
    };
