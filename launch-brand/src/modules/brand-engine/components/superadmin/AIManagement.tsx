import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Save, ShieldCheck, TestTube2, Unplug } from 'lucide-react';
import { Button } from "@/modules/brand-engine/components/ui/button";
import { useSuperadminAuth } from "@/modules/brand-engine/hooks/useSuperadminAuth";
import { aiError, disconnectAIConnection, saveAIConnection, subscribeAIConnection, testAIConnection, type AIConnection } from "@/modules/brand-engine/services/aiConnection";
import { invokeAI } from "@/modules/brand-engine/services/aiBackend";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/modules/brand-engine/firebase";
import { detectKeyProvider } from "@/modules/brand-engine/services/providerKey.js";
import { translations } from "@/modules/brand-engine/locales/translations";
import { useStore } from '@/store/useStore';
import { isPlatformAdmin } from '../../data/platformAccess';

const defaults = { provider: "gemini", model: "", systemInstructions: "You are an expert AI business builder. Give clear, practical answers tailored to the user's business.", maxOutputTokens: 5000, dailyUserLimit: 50, dailyGlobalLimit: 500 };
const inputClass = "w-full rounded-xl border border-sa-border bg-sa-surface-sunken px-4 py-3 text-sm text-sa-text-primary outline-none focus:border-emerald-500 disabled:opacity-50";

export function AIManagement() {
  const isAr = useStore(state => state.language) === 'ar';
  const t = translations[isAr ? 'ar' : 'en'];
  const { user, profile } = useSuperadminAuth();
  const uid = user?.uid;
  const activeUid = useRef(uid);
  activeUid.current = uid;
  const [connection, setConnection] = useState<AIConnection | null>(null);
  const [form, setForm] = useState(defaults);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<Array<{ id: string; action: string; provider?: string; model?: string; createdAt?: { toDate: () => Date } }>>([]);
  useEffect(() => {
    setAudit([]);
    if (!uid || !isPlatformAdmin(profile)) return;
    return onSnapshot(query(collection(db, "aiAdminAudit"), orderBy("createdAt", "desc"), limit(20)), snapshot => setAudit(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as { id: string; action: string; provider?: string; model?: string; createdAt?: { toDate: () => Date } }))), () => setError(t.couldNotLoadAudit || "Could not load the AI administration audit."));
  }, [uid, profile, isAr]);
  useEffect(() => {
    setConnection(null); setApiKey(""); setForm(defaults); setModels([]); setNotice(""); setError(""); setBusy(""); setLoading(true);
    if (!uid) return;
    return subscribeAIConnection((value) => {
      setConnection(value); setModels(value?.models || []); setLoading(false);
      if (value) setForm({ provider: value.provider, model: value.model, systemInstructions: value.systemInstructions ?? defaults.systemInstructions, maxOutputTokens: value.maxOutputTokens ?? 5000, dailyUserLimit: value.dailyUserLimit ?? 50, dailyGlobalLimit: value.dailyGlobalLimit ?? 500 });
    }, () => { setLoading(false); setError(t.couldNotLoadSettings || "Could not load AI settings. Check your connection and Firebase permissions."); });
  }, [uid]);
  const permitted = isPlatformAdmin(profile);
  const canSave = !loading && !busy && permitted && (apiKey.trim() || connection?.provider === form.provider);
  function changeKey(value: string) {
    setApiKey(value); setError(""); setNotice("");
    const detected = detectKeyProvider(value);
    if (detected && detected !== form.provider) {
      setForm(old => ({ ...old, provider: detected, model: "" })); setModels([]);
    }
  }
  async function perform(action: "test" | "save" | "disconnect" | "pause") {
    if (busy || !permitted) return;
    const requestUid = uid;
    setBusy(action); setError(""); setNotice("");
    try {
      if (action === "pause") {
        await invokeAI("setPlatformAIPaused", { paused: !connection?.aiPaused });
        if (activeUid.current === requestUid) setNotice(t.platformPauseSaved || "Platform pause setting saved.");
      } else if (action === "disconnect") {
        await disconnectAIConnection();
        if (activeUid.current !== requestUid) return;
        setApiKey(""); setModels([]); setNotice(t.platformAiDisconnected || "Platform AI disconnected. AI tools are unavailable until Super Admin reconnects the platform provider.");
      } else {
        const input = { ...form, apiKey: apiKey.trim() };
        const result = action === "test" ? await testAIConnection(input) : await saveAIConnection(input);
        if (activeUid.current !== requestUid) return;
        setModels(result.models); setForm((old) => ({ ...old, model: result.model }));
        setApiKey(""); setShowKey(false);
        setNotice(t.connectionSaved || "Connection and limits saved in Firebase. All users can now use platform AI.");
      }
    } catch (err) { if (activeUid.current === requestUid) setError(aiError(err, isAr)); }
    finally { if (activeUid.current === requestUid) setBusy(""); }
  }
  return <div className="space-y-6 max-w-5xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-sa-primary mb-2">{t.sharedIntelligence || "Shared intelligence"}</p><h2 className="text-2xl font-bold text-sa-text-primary">{t.aiCenterManagement || "AI Center Management"}</h2><p className="text-sa-text-secondary mt-2 text-sm">{t.aiCenterDesc || "Manage the single platform AI connection and usage policy for all users."}</p></div><span className={`rounded-full border px-4 py-2 text-xs flex items-center gap-2 ${connection ? "border-sa-primary/30 text-sa-primary bg-sa-primary-soft" : "border-sa-border text-sa-text-secondary"}`}><CheckCircle2 size={15}/>{loading ? t.loading || "Loading…" : connection ? `${connection.provider === "gemini" ? "Gemini" : "OpenAI"} ${t.connected || "connected"}` /* handled via logic but lets use ` + (t.connected || "connected")` below */ : (t.setupRequired || "Setup required")}</span></div>
    <div className="rounded-2xl border border-sa-primary/20 bg-sa-primary/5 p-5 flex items-start gap-3"><ShieldCheck className="text-sa-primary shrink-0"/><div><h3 className="font-semibold text-sa-text-primary text-sm">{t.controlAccess || "You control access. Users write prompts."}</h3><p className="text-sa-text-secondary text-sm mt-1">{t.controlAccessDesc || "Only Super Admin can configure the shared platform provider. All user AI tools use this connection."}</p></div></div>
    <form onSubmit={(event) => { event.preventDefault(); void perform("save"); }} className="space-y-6">
      <fieldset disabled={Boolean(busy) || loading || !permitted} className="grid gap-6 md:grid-cols-[1.25fr_1fr]">
        <section className="rounded-2xl border border-sa-border bg-sa-surface p-6 space-y-5"><h3 className="font-semibold text-sa-text-primary flex gap-2 items-center"><KeyRound size={18} className="text-sa-primary"/>{t.providerConnection || "Provider connection"}</h3>
          <label className="block text-sm text-sa-text-primary space-y-2"><span>{t.aiProvider || "AI provider"}</span><select className={inputClass} value={form.provider} onChange={(e) => { setForm({ ...form, provider: e.target.value, model: "" }); setApiKey(""); setModels([]); setNotice(""); }}><option value="gemini">{t.googleGemini || "Google Gemini"}</option><option value="openai">{t.openAi || "OpenAI"}</option></select></label>
          <label className="block text-sm text-sa-text-primary space-y-2"><span>{connection ? t.replaceApiKey || "Replace API key" : t.apiKey || "API key"}</span><div className="relative"><input className={`${inputClass} pe-12`} type={showKey ? "text" : "password"} autoComplete="off" spellCheck={false} value={apiKey} onChange={(e) => changeKey(e.target.value)} placeholder={connection?.provider === form.provider ? (isAr ? `محفوظ ····${connection.keyLast4} — سيب الحقل فاضي للاحتفاظ بيه` : `Saved ····${connection.keyLast4} — leave blank to keep`) : t.pasteSecretKey || "Paste your full secret API key"}/><button type="button" className="absolute right-4 top-3 text-sa-text-secondary" aria-label={showKey ? "Hide key" : "Show key"} onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
          <p className="text-xs text-sa-text-secondary">{detectKeyProvider(apiKey) === "openai" ? t.openaiFormatDetected || "OpenAI key format detected. Test connection to verify it." : detectKeyProvider(apiKey) === "gemini" ? t.geminiFormatDetected || "Google key format detected. Test connection to verify Gemini access." : t.pasteFullKeyNotice || "Paste the full secret key, not the Tracking ID or masked value. The provider is selected from recognized key prefixes."}</p>
          <label className="block text-sm text-sa-text-primary space-y-2"><span>{t.model || "Model"}</span><input className={inputClass} list="ai-models" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder={t.autoSelectModel || "Auto-select an available text model"}/><datalist id="ai-models">{models.map((model) => <option key={model} value={model}/>)}</datalist></label>
          <p className="text-xs text-sa-text-disabled">{isAr ? "بعد نجاح الاختبار، المفتاح والإعدادات بيتحفظوا تلقائيًا في Firebase لكل المستخدمين. الاختبار بيبعت طلب صغير ممكن تكون عليه تكلفة من المزوّد." : "A successful test automatically saves and activates the key and settings in Firebase for all users. Testing sends a small request and may incur provider charges."}</p>
          <Button type="button" variant="outline" disabled={!canSave} onClick={() => void perform("test")} className="border-sa-border bg-sa-surface-sunken text-sa-text-primary hover:bg-sa-surface hover:text-sa-primary">{busy === "test" ? <Loader2 className="animate-spin"/> : <TestTube2/>}{isAr ? "اختبار وحفظ الاتصال" : "Test & save connection"}</Button>
        </section>
        <section className="rounded-2xl border border-sa-border bg-sa-surface p-6 space-y-5"><h3 className="font-semibold text-sa-text-primary flex gap-2 items-center"><Bot size={18} className="text-sa-primary"/>{t.usageControls || "Usage controls"}</h3>
          {([{ key: "maxOutputTokens", label: t.maxOutputTokens || "Maximum output tokens", min: 128, max: 16384 }, { key: "dailyUserLimit", label: t.reqPerUserDay || "Requests per user / day", min: 1, max: 500 }, { key: "dailyGlobalLimit", label: t.totalReqDay || "Total requests / day", min: 1, max: 10000 }] as const).map(({ key, label, min, max }) => <label key={key} className="block text-sm text-sa-text-primary space-y-2"><span>{label}</span><input required className={inputClass} type="number" min={min} max={max} step={1} value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}/></label>)}
          <p className="text-xs text-sa-text-disabled">{t.limitsApplyDesc || "Limits apply across AI chat, discovery, branding and the dashboard assistant. Daily limits reset at 00:00 UTC. Limits are checked by the browser and can be bypassed outside the app. They are separate from provider billing."}</p>
        </section>
        <section className="md:col-span-2 rounded-2xl border border-sa-border bg-sa-surface p-6"><label className="block text-sm text-sa-text-primary space-y-3"><span className="font-semibold text-sa-text-primary">{t.globalSystemInstructions || "Global system instructions"}</span><textarea maxLength={8000} rows={5} className={inputClass} value={form.systemInstructions} onChange={(e) => setForm({ ...form, systemInstructions: e.target.value })}/></label><p className="text-xs text-sa-text-disabled mt-2">Applied alongside each feature's instructions and the user's prompt.</p></section>
      </fieldset>
      {error && <p role="alert" className="rounded-xl border border-sa-danger/30 bg-sa-danger-soft p-4 text-sm text-sa-danger">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-sa-primary/30 bg-sa-primary-soft p-4 text-sm text-sa-primary">{notice}</p>}
      <div className="flex flex-wrap gap-3 justify-between"><Button type="button" variant="outline" disabled={!connection || Boolean(busy) || !permitted} onClick={() => void perform("pause")}>{connection?.aiPaused ? t.resumePlatformAi || "Resume platform AI" : t.pausePlatformAi || "Pause platform AI"}</Button><Button type="button" variant="outline" className="border-sa-danger/30 text-sa-danger bg-transparent hover:bg-sa-danger-soft" disabled={!connection || Boolean(busy) || !permitted} onClick={() => void perform("disconnect")}><Unplug size={16}/>{t.disconnectPlatformAi || "Disconnect platform AI"}</Button><Button type="submit" disabled={!canSave} className="bg-sa-primary hover:bg-sa-primary-hover text-sa-bg font-semibold">{busy === "save" ? <Loader2 className="animate-spin"/> : <Save size={16}/>}Save & activate for all users</Button></div>
    </form>
    <section className="rounded-2xl border border-sa-border p-5"><h3 className="font-semibold text-sa-text-primary">{t.adminActivity || "Administration activity"}</h3><p className="text-sm text-sa-text-secondary mt-2">{audit.length ? t.recentPlatformChanges || "Recent platform connection and pause changes. No provider keys are logged." : t.noAdminEvents || "No administration events recorded yet."}</p>{audit.map(event => <div key={event.id} className="border-t border-sa-border py-3 mt-3 text-sm text-sa-text-secondary"><strong className="text-sa-text-primary">{event.action}</strong> · {event.provider || "Platform"} {event.model || ""}<span className="block text-xs mt-1">{event.createdAt?.toDate().toLocaleString('en-US') || t.saving || "Saving…"}</span></div>)}</section>
  </div>;
}
