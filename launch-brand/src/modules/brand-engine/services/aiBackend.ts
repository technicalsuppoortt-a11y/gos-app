import { auth } from "@/modules/brand-engine/firebase";
import { invokeDirectAI } from "./directAI.js";
// Spark mode: browser provider requests and owner-scoped Firestore persistence.
export async function invokeAI<T>(name: string, input: unknown): Promise<T> {
  if (!auth.currentUser) throw Object.assign(new Error("Sign in to use AI."), { code: "ai/unauthenticated" });
  const uid = auth.currentUser.uid;
  const result = await invokeDirectAI(name, input) as T;
  if (auth.currentUser?.uid !== uid) throw Object.assign(new Error("Account changed."), { code: "ai/unauthenticated" });
  return result;
}
