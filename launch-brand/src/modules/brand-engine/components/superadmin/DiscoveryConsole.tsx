import { useEffect, useState } from "react";
import { Save, Send, Plus, Sparkles, Loader2, RefreshCw, Activity, AlertTriangle } from 'lucide-react';
import { useDiscoveryCatalog } from "@/modules/brand-engine/hooks/useDiscoveryCatalog";
import {
  subscribeDiscoveryCatalogDraft,
  saveDiscoveryCatalogDraft,
  publishDiscoveryCatalog,
  initializeDiscoveryCatalog,
  discoveryCatalogError,
  type DiscoveryCatalogDraft,
} from "@/modules/brand-engine/services/discoveryCatalog";
import {
  getDiscoveryConfiguration,
  saveDiscoveryConfiguration,
  publishDiscoveryConfiguration,
  getDiscoveryActivity,
} from "@/modules/brand-engine/services/discoveryAnalysis";
import { invokeAI } from "@/modules/brand-engine/services/aiBackend";
import {
  defaultDiscoveryConfiguration,
  emptyDiscoveryProfile,
  type DiscoveryConfiguration,
  type DiscoveryAnalysis,
} from "@/modules/brand-engine/data/discoveryProfile";
import {
  validateDiscoveryCatalog,
  type DiscoveryCatalog,
  type DiscoveryNiche,
  type DiscoverySubNiche,
} from "@/modules/brand-engine/data/discovery";
import { Pager, PagedText } from "@/modules/brand-engine/components/brandengine/BusinessDiscover";
import { translations } from "@/modules/brand-engine/locales/translations";
import { useStore } from '@/store/useStore';
import "./DiscoveryConsole.css";

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const subFields = [
  "name",
  "targetAudience",
  "buyerProfile",
  "coreProblems",
  "dayToDayPain",
  "desiredOutcome",
  "gosSolution",
  "why",
] as const;
type Activity = Awaited<ReturnType<typeof getDiscoveryActivity>>;
export function DiscoveryConsole() {
  const lang = useStore(state => state.language);
  const t = translations[lang];
  
  const translatedTabs = [
    t.tabCatalog,
    t.tabQuestionnaire,
    t.tabAIStrategy,
    t.tabSetupTemplates,
    t.tabPreviewTest,
    t.tabActivity,
  ];

  const published = useDiscoveryCatalog();
  const [remote, setRemote] = useState<DiscoveryCatalogDraft | null>(null),
    [catalog, setCatalog] = useState<DiscoveryCatalog | null>(null),
    [revision, setRevision] = useState<string | null>(null),
    [catalogDirty, setCatalogDirty] = useState(false);
  const [config, setConfig] = useState<DiscoveryConfiguration>(copy(defaultDiscoveryConfiguration)),
    [configRevision, setConfigRevision] = useState<string | null>(null),
    [configDirty, setConfigDirty] = useState(false);
  const [tab, setTab] = useState(0),
    [language, setLanguage] = useState<"En" | "Ar">("En"),
    [nicheId, setNicheId] = useState(""),
    [subId, setSubId] = useState(""),
    [editNiche, setEditNiche] = useState(false);
  const [nichePage, setNichePage] = useState(0),
    [fieldPage, setFieldPage] = useState(0),
    [optionPage, setOptionPage] = useState(0),
    [optionGroup, setOptionGroup] = useState<
      "interests" | "skills" | "markets" | "timeRanges" | "budgetRanges"
    >("interests");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [activity, setActivity] = useState<Activity>([]),
    [activityPage, setActivityPage] = useState(0),
    [preview, setPreview] = useState<DiscoveryAnalysis | null>(null),
    [testMarket, setTestMarket] = useState("EG"),
    [testSkill, setTestSkill] = useState("marketing"),
    [testInterest, setTestInterest] = useState("professional");
  const [templatePart, setTemplatePart] = useState(0),
    [templateIndex, setTemplateIndex] = useState(0);
  useEffect(
    () =>
      subscribeDiscoveryCatalogDraft(setRemote, (cause) => setError(discoveryCatalogError(cause))),
    [],
  );
  useEffect(() => {
    if ((!catalog || (!revision && remote)) && (remote || published.catalog)) {
      const value = copy(remote || published.catalog!);
      setCatalog(value);
      setRevision(remote?.draftRevision || null);
      setNicheId(value.niches[0]?.id || "");
    }
  }, [remote, published.catalog, catalog, revision]);
  useEffect(() => {
    getDiscoveryConfiguration()
      .then((value) => {
        setConfig(value);
        setConfigRevision(value.revision || null);
      })
      .catch((cause) => setError(discoveryCatalogError(cause)));
  }, []);
  const niche = catalog?.niches.find((item) => item.id === nicheId),
    subs = catalog?.subNiches.filter((item) => item.nicheId === nicheId) || [],
    sub = subs.find((item) => item.id === subId) || subs[0];
  const conflict = remote && revision && remote.draftRevision !== revision;
  const mutate = (operation: (next: DiscoveryCatalog) => void) => {
    if (!catalog) return;
    const next = copy(catalog);
    operation(next);
    setCatalog(next);
    setCatalogDirty(true);
  };
  const mutateConfig = (operation: (next: DiscoveryConfiguration) => void) => {
    const next = copy(config);
    operation(next);
    setConfig(next);
    setConfigDirty(true);
  };
  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
    } catch (cause) {
      setError(discoveryCatalogError(cause));
    } finally {
      setBusy(false);
    }
  }
  const save = () =>
    run(async () => {
      if (tab === 0 || tab === 3) {
        if (!catalog) return;
        const result = await saveDiscoveryCatalogDraft(catalog, revision);
        setRevision(result.draftRevision);
        setCatalogDirty(false);
      } else {
        const result = await saveDiscoveryConfiguration(config, configRevision);
        setConfigRevision(result.revision);
        setConfigDirty(false);
      }
      setNotice(t.draftSavedNote);
    });
  const publish = () =>
    run(async () => {
      if (tab === 0 || tab === 3) {
        if (catalogDirty || !revision) throw new Error("Save your catalog draft first.");
        const result = await publishDiscoveryCatalog(revision);
        setRevision(result.draftRevision);
        setCatalog((value) => (value ? { ...value, version: result.version } : value));
        setNotice(t.catalogPublishedNote);
      } else {
        if (configDirty || !configRevision) throw new Error("Save your settings draft first.");
        const result = await publishDiscoveryConfiguration(configRevision);
        setConfig((value) => ({ ...value, version: result.version }));
        setConfigRevision(result.revision);
        setNotice(t.questionnairePublishedNote);
      }
    });
  function addNiche() {
    const id = `niche-${crypto.randomUUID().slice(0, 8)}`;
    mutate((next) =>
      next.niches.push({
        id,
        nameEn: "New niche",
        nameAr: "مجال جديد",
        descriptionEn: "Review this market before publication.",
        descriptionAr: "راجع هذا المجال قبل النشر.",
        icon: "BriefcaseBusiness",
        status: "draft",
        order: next.niches.length + 1,
      }),
    );
    setNicheId(id);
    setEditNiche(true);
    setFieldPage(0);
  }
  function addSub() {
    if (!catalog || !niche) return;
    const source = catalog.subNiches[0];
    if (!source) return;
    const id = `specialization-${crypto.randomUUID().slice(0, 8)}`,
      funnel = catalog.templates.funnels.find((item) => item.id === source.funnelTemplateId),
      dashboard = catalog.templates.dashboards.find(
        (item) => item.id === source.dashboardTemplateId,
      );
    if (!funnel || !dashboard) return;
    mutate((next) => {
      next.subNiches.push({
        ...copy(source),
        id,
        nicheId,
        nameEn: "New specialization",
        nameAr: "تخصص جديد",
        status: "draft",
        order: subs.length + 1,
        funnelTemplateId: `funnel-${id}`,
        dashboardTemplateId: `dashboard-${id}`,
        templateVersion: 1,
        source: { exactFields: [], editorialFields: ["all"] },
      });
      next.templates.funnels.push({
        ...copy(funnel),
        id: `funnel-${id}`,
        subNicheId: id,
        version: 1,
      });
      next.templates.dashboards.push({
        ...copy(dashboard),
        id: `dashboard-${id}`,
        subNicheId: id,
        version: 1,
      });
    });
    setSubId(id);
    setEditNiche(false);
    setFieldPage(0);
  }
  function updateSub(patch: Partial<DiscoverySubNiche>) {
    mutate((next) => {
      const target = next.subNiches.find((item) => item.id === sub?.id);
      if (target) Object.assign(target, patch);
    });
  }
  const editFields = editNiche ? ["name", "description"] : [...subFields];
  const activeFields = editFields.slice(fieldPage * 2, fieldPage * 2 + 2);
  const funnel = catalog?.templates.funnels.find((item) => item.id === sub?.funnelTemplateId),
    dashboard = catalog?.templates.dashboards.find((item) => item.id === sub?.dashboardTemplateId);
  const test = () =>
    run(async () => {
      const current = await invokeAI<DiscoveryConfiguration>("getDiscoveryConfiguration", {
        draft: false,
      });
      const profile = {
        ...emptyDiscoveryProfile(current.version),
        revision: crypto.randomUUID(),
        interests: [testInterest],
        skills: [testSkill],
        industries: [testInterest],
        market: testMarket,
        language: "en",
        selling: "b2b",
        time: "10-20",
        budget: "1000-3000",
      };
      const result = await invokeAI<DiscoveryAnalysis>("analyzeDiscoveryProfile", {
        requestId: crypto.randomUUID(),
        profileRevision: profile.revision,
        language: "en",
        preview: true,
        profile,
      });
      setPreview(result);
      setNotice(t.liveTestCompletedNote);
    });
  return (
    <section className="discover-admin">
      <header className="discover-admin-heading">
        <div>
          <small>{t.discoveryControlCenter}</small>
          <h1>{t.businessDiscovery}</h1>
          <p>
            {published.catalog?.niches.length || 0} {t.nichesLabel} ·{" "}
            {published.catalog?.subNiches.length || 0} {t.specializationsLabel} · {t.publishedLabel}{" "}
            {published.catalog?.version || "—"}
          </p>
        </div>
        <div>
          {!revision && !remote && (tab === 0 || tab === 3) && (
            <button disabled={busy || catalogDirty} onClick={() => void run(async () => {
              await initializeDiscoveryCatalog();
              published.retry();
            })}>
              <Plus />{lang === 'ar' ? 'تهيئة الكتالوج' : 'Initialize catalog'}
            </button>
          )}
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (tab === 0 || tab === 3) {
                  const value = remote || published.catalog;
                  if (value) {
                    setCatalog(copy(value));
                    setRevision(remote?.draftRevision || null);
                    setCatalogDirty(false);
                  }
                } else {
                  const value = await getDiscoveryConfiguration();
                  setConfig(value);
                  setConfigRevision(value.revision || null);
                  setConfigDirty(false);
                }
              })
            }
          >
            <RefreshCw />
            {t.reload}
          </button>
          <button
            disabled={
              busy || tab === 4 || tab === 5 || Boolean((tab === 0 || tab === 3) && conflict)
            }
            onClick={() => void save()}
          >
            <Save />
            {t.saveDraft}
          </button>
          <button
            className="discover-primary"
            disabled={busy || tab === 4 || tab === 5}
            onClick={() => void publish()}
          >
            <Send />
            {t.publishButton}
          </button>
        </div>
      </header>
      <nav className="discover-admin-tabs" aria-label="Discovery management">
        {translatedTabs.map((label, index) => (
          <button
            aria-pressed={tab === index}
            key={index}
            disabled={busy}
            onClick={() => {
              setTab(index);
              setNotice("");
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="discover-admin-body">
        {(tab === 0 || tab === 3) && !catalog ? (
          <div className="discover-center">
            <p>{t.loadCatalogDraft}</p>
            <button
              onClick={() =>
                void run(async () => {
                  await initializeDiscoveryCatalog();
                  published.retry();
                })
              }
            >
              {t.createCatalogDraft}
            </button>
          </div>
        ) : tab === 0 && catalog ? (
          <div className="discover-catalog-columns">
            <aside>
              <h2>{t.generalNiches}</h2>
              <div className="discover-admin-list">
                {catalog.niches.slice(nichePage * 3, nichePage * 3 + 3).map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={item.id === nicheId}
                    onClick={() => {
                      setNicheId(item.id);
                      setSubId("");
                      setFieldPage(0);
                    }}
                  >
                    <strong>{item.nameEn}</strong>
                    <span className={"status-badge " + item.status}>{item.status}</span>
                  </button>
                ))}
              </div>
              <Pager
                page={nichePage}
                last={Math.max(0, Math.ceil(catalog.niches.length / 3) - 1)}
                onChange={setNichePage}
              />
              <button onClick={addNiche}>
                <Plus />
                {t.addNiche}
              </button>
              <button
                disabled={!niche}
                onClick={() => {
                  setEditNiche(true);
                  setFieldPage(0);
                }}
              >
                {t.editSelectedNiche}
              </button>
            </aside>
            <aside>
              <h2>{t.specializationsHeader}</h2>
              <select
                aria-label="Specialization"
                value={sub?.id || ""}
                onChange={(event) => {
                  setSubId(event.target.value);
                  setEditNiche(false);
                  setFieldPage(0);
                }}
              >
                {subs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nameEn}
                  </option>
                ))}
              </select>
              <p>{sub?.id}</p>
              <button disabled={!niche} onClick={addSub}>
                <Plus />
                {t.addSpecialization}
              </button>
              <button
                disabled={!sub}
                onClick={() => {
                  setEditNiche(false);
                  setFieldPage(0);
                }}
              >
                {t.editSpecialization}
              </button>
              <small>{t.draftArchiveNote}</small>
            </aside>
            <article>
              <div className="discover-admin-editor-heading">
                <h2>{editNiche ? niche?.nameEn : sub?.nameEn}</h2>
                <select
                  aria-label="Content language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as "En" | "Ar")}
                >
                  <option value="En">English</option>
                  <option value="Ar">العربية</option>
                </select>
              </div>
              {activeFields.map((field) => {
                const key = `${field}${language}`;
                const item = editNiche ? niche : sub;
                return (
                  <label key={key}>
                    {(t as Record<string, string>)[`field_${field}`] || field}
                    <textarea
                      dir={language === "Ar" ? "rtl" : "ltr"}
                      maxLength={4000}
                      value={String(
                        (item as unknown as Record<string, unknown> | undefined)?.[key] || "",
                      )}
                      onChange={(event) =>
                        editNiche
                          ? mutate((next) => {
                              const target = next.niches.find((value) => value.id === nicheId);
                              if (target) Object.assign(target, { [key]: event.target.value });
                            })
                          : updateSub({ [key]: event.target.value })
                      }
                    />
                  </label>
                );
              })}
              {!editNiche && sub && fieldPage === Math.ceil(editFields.length / 2) && (
                <div className="discover-field-grid">
                  <label>
                    {t.conversionGoal}
                    <select
                      value={sub.goal}
                      onChange={(e) =>
                        updateSub({ goal: e.target.value as DiscoverySubNiche["goal"] })
                      }
                    >
                      <option value="booking">Booking</option>
                      <option value="sale">Sale</option>
                      <option value="enrollment">Enrollment</option>
                    </select>
                  </label>
                  <label>
                    {t.platformPreset}
                    <select
                      value={sub.platformPresetId}
                      onChange={(e) =>
                        updateSub({
                          platformPresetId: e.target.value as DiscoverySubNiche["platformPresetId"],
                        })
                      }
                    >
                      {["coaching", "freelancer", "business", "creator", "agency", "ecommerce"].map(
                        (id) => (
                          <option key={id}>{id}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    {t.moduleIds}
                    <input
                      value={sub.moduleIds.join(", ")}
                      onChange={(e) =>
                        updateSub({
                          moduleIds: [
                            ...new Set(
                              e.target.value
                                .split(",")
                                .map((id) => id.trim())
                                .filter(Boolean),
                            ),
                          ],
                        })
                      }
                    />
                  </label>
                  <label>
                    {t.displayOrder}
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={sub.order}
                      onChange={(e) =>
                        updateSub({ order: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                      }
                    />
                  </label>
                </div>
              )}
              <div className="discover-admin-editor-footer">
                <select
                  aria-label="Status"
                  className={"status-badge " + ((editNiche ? niche : sub)?.status || "draft")}
                  value={(editNiche ? niche : sub)?.status || "draft"}
                  onChange={(event) => {
                    const status = event.target.value as DiscoveryNiche["status"];
                    if (editNiche)
                      mutate((next) => {
                        const target = next.niches.find((value) => value.id === nicheId);
                        if (target) target.status = status;
                        if (status !== "active")
                          next.subNiches
                            .filter((value) => value.nicheId === nicheId)
                            .forEach((value) => {
                              value.status = status;
                            });
                      });
                    else updateSub({ status });
                  }}
                >
                  <option>active</option>
                  <option>draft</option>
                  <option>archived</option>
                </select>
                <Pager
                  page={fieldPage}
                  last={Math.ceil(editFields.length / 2) - (editNiche ? 1 : 0)}
                  onChange={setFieldPage}
                />
              </div>
            </article>
          </div>
        ) : tab === 1 ? (
          <div className="discover-config-editor">
            <div className="discover-admin-editor-heading">
              <div>
                <h2>{t.questionsAndAnswerChoices}</h2>
                <p>{t.sectionOrderFixed}</p>
              </div>
              <select
                aria-label="Question group"
                value={optionGroup}
                onChange={(event) => {
                  setOptionGroup(event.target.value as typeof optionGroup);
                  setOptionPage(0);
                }}
              >
                {["interests", "skills", "markets", "timeRanges", "budgetRanges"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="discover-option-editor">
              {config[optionGroup].slice(optionPage * 2, optionPage * 2 + 2).map((item, i) => (
                <article key={item.id}>
                  <small>{item.id}</small>
                  <label>
                    {t.englishOption}
                    <input
                      value={item.en}
                      maxLength={100}
                      onChange={(event) =>
                        mutateConfig((next) => {
                          const option = next[optionGroup][optionPage * 2 + i];
                          if (option) option.en = event.target.value;
                        })
                      }
                    />
                  </label>
                  <label>
                    {t.arabicOption}
                    <input
                      dir="rtl"
                      value={item.ar}
                      maxLength={100}
                      onChange={(event) =>
                        mutateConfig((next) => {
                          const option = next[optionGroup][optionPage * 2 + i];
                          if (option) option.ar = event.target.value;
                        })
                      }
                    />
                  </label>
                  <button
                    disabled={config[optionGroup].length <= 1}
                    onClick={() => {
                      mutateConfig((next) => {
                        next[optionGroup].splice(optionPage * 2 + i, 1);
                      });
                      setOptionPage(0);
                    }}
                  >
                    {t.removeOption}
                  </button>
                </article>
              ))}
            </div>
            <div className="discover-inline-footer">
              <button
                disabled={config[optionGroup].length >= 30}
                onClick={() => {
                  mutateConfig((next) =>
                    next[optionGroup].push({
                      id: `custom-${crypto.randomUUID().slice(0, 8)}`,
                      en: "New option",
                      ar: "اختيار جديد",
                    }),
                  );
                  setOptionPage(Math.floor(config[optionGroup].length / 2));
                }}
              >
                <Plus />
                {t.addOption}
              </button>
              <Pager
                page={optionPage}
                last={Math.max(0, Math.ceil(config[optionGroup].length / 2) - 1)}
                onChange={setOptionPage}
              />
            </div>
          </div>
        ) : tab === 2 ? (
          <div className="discover-policy-editor">
            <div className="discover-admin-editor-heading">
              <h2>{t.recommendationPolicy}</h2>
              <button
                onClick={() =>
                  mutateConfig((next) => {
                    next.version = String((Number(next.version) || 1) + 1);
                  })
                }
              >
                {t.bumpVersion}{config.version || 1}
              </button>
            </div>
            <label>
              {t.businessContextAI}
              <div>
                <textarea
                  style={{ fontFamily: 'monospace' }}
                  maxLength={6000}
                  value={config.instruction}
                  onChange={(event) =>
                    mutateConfig((next) => {
                      next.instruction = event.target.value;
                    })
                  }
                />
                <div style={{ textAlign: "end", fontSize: "10px", color: "var(--dm)", marginTop: "4px" }}>
                  {config.instruction?.length || 0} / 6000
                </div>
              </div>
            </label>
            <div className="discover-field-grid">
              <label>
                {t.researchMode}
                <select
                  value={String(config.researchEnabled)}
                  onChange={(event) =>
                    mutateConfig((next) => {
                      next.researchEnabled = event.target.value === "true";
                    })
                  }
                >
                  <option value="true">{t.liveWebResearch}</option>
                  <option value="false">{t.profileMatchingOnly}</option>
                </select>
              </label>
              <label>
                {t.dailyAnalysesPerUser}
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.dailyLimit}
                  onChange={(event) =>
                    mutateConfig((next) => {
                      next.dailyLimit = Number(event.target.value);
                    })
                  }
                />
              </label>
            </div>
            <p className="discover-note" style={{ fontSize: '11px', color: 'var(--dm)', marginTop: '8px' }}>
              {t.policyNote}
            </p>
          </div>
        ) : tab === 3 && sub && funnel && dashboard ? (
          <div className="discover-config-editor">
            <div className="discover-admin-editor-heading">
              <h2>{sub.nameEn}</h2>
              <select
                aria-label="Template specialization"
                value={sub.id}
                onChange={(event) => {
                  setSubId(event.target.value);
                  setTemplateIndex(0);
                }}
              >
                {subs.map((item) => (
                  <option key={item.id}>{item.id}</option>
                ))}
              </select>
              <button
                onClick={() =>
                  mutate((next) => {
                    const target = next.subNiches.find((item) => item.id === sub.id)!;
                    target.templateVersion++;
                    next.templates.funnels.find(
                      (item) => item.id === target.funnelTemplateId,
                    )!.version = target.templateVersion;
                    next.templates.dashboards.find(
                      (item) => item.id === target.dashboardTemplateId,
                    )!.version = target.templateVersion;
                  })
                }
              >
                {t.bumpVersion}{sub.templateVersion}
              </button>
            </div>
            <div className="discover-mini-tabs">
              {[t.funnelCopy, t.pipeline, t.qualification].map((item, i) => (
                <button
                  key={item}
                  aria-pressed={templatePart === i}
                  onClick={() => {
                    setTemplatePart(i);
                    setTemplateIndex(0);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            {templatePart === 0 ? (
              <>
                <select
                  aria-label="Funnel block"
                  value={Math.min(templateIndex, funnel.blocks.length - 1)}
                  onChange={(event) => setTemplateIndex(Number(event.target.value))}
                >
                  {funnel.blocks.map((block, i) => (
                    <option key={block.id} value={i}>
                      {block.labelEn}
                    </option>
                  ))}
                </select>
                <div className="discover-field-grid">
                  {[`title${language}`, `body${language}`].map((field) => (
                    <label key={field}>
                      {field}
                      <textarea
                        maxLength={4000}
                        value={String(
                          (funnel.blocks[templateIndex] as unknown as Record<string, unknown>)?.[
                            field
                          ] || "",
                        )}
                        onChange={(event) =>
                          mutate((next) => {
                            const block = next.templates.funnels.find(
                              (item) => item.id === sub.funnelTemplateId,
                            )?.blocks[templateIndex];
                            if (block) Object.assign(block, { [field]: event.target.value });
                          })
                        }
                      />
                      <div className="discover-prose" style={{ marginTop: '8px', padding: '12px', background: 'var(--dl)', borderRadius: '6px', fontSize: '12px', color: 'var(--dm)', whiteSpace: 'pre-wrap' }}>
                        {String((funnel.blocks[templateIndex] as unknown as Record<string, unknown>)?.[field] || "").split(/(\{\{[^}]+\}\})/).map((chunk, idx) => 
                          chunk.startsWith("{{") && chunk.endsWith("}}") ? (
                            <span key={idx} className="status-badge" style={{ margin: '0 2px', background: 'var(--dp)', color: 'var(--dt)' }}>{chunk}</span>
                          ) : (
                            <span key={idx}>{chunk}</span>
                          )
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            ) : templatePart === 1 ? (
              <div className="discover-field-grid">
                {dashboard.pipelineStages
                  .slice(templateIndex * 2, templateIndex * 2 + 2)
                  .map((item, i) => (
                    <label key={item.id}>
                      Pipeline stage {templateIndex * 2 + i + 1}
                      <input
                        value={language === "Ar" ? item.nameAr : item.nameEn}
                        maxLength={150}
                        onChange={(event) =>
                          mutate((next) => {
                            const stage = next.templates.dashboards.find(
                              (value) => value.id === sub.dashboardTemplateId,
                            )?.pipelineStages[templateIndex * 2 + i];
                            if (stage) {
                              if (language === "Ar") stage.nameAr = event.target.value;
                              else stage.nameEn = event.target.value;
                            }
                          })
                        }
                      />
                    </label>
                  ))}
                <Pager
                  page={templateIndex}
                  last={Math.max(0, Math.ceil(dashboard.pipelineStages.length / 2) - 1)}
                  onChange={setTemplateIndex}
                />
              </div>
            ) : (
              <label>
                Questions (one per line)
                <textarea
                  maxLength={4000}
                  value={sub.qualificationQuestionsEn.join("\n")}
                  onChange={(event) =>
                    updateSub({ qualificationQuestionsEn: event.target.value.split("\n") })
                  }
                />
              </label>
            )}
            <p className="discover-note">
              Layout and module references are preserved. Published template changes require an
              explicit version bump.
            </p>
          </div>
        ) : tab === 4 ? (
          <div className="discover-config-editor">
            <h2>Test the published recommendation journey</h2>
            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', color: '#b45309', fontSize: '13px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>A live test uses the platform AI connection and quota. It does not overwrite your saved business setup.</span>
            </div>
            <div className="discover-field-grid">
              <label>
                Interest
                <select
                  value={testInterest}
                  onChange={(event) => setTestInterest(event.target.value)}
                >
                  {config.interests.map((item) => (
                    <option key={item.id}>{item.id}</option>
                  ))}
                </select>
              </label>
              <label>
                Skill
                <select value={testSkill} onChange={(event) => setTestSkill(event.target.value)}>
                  {config.skills.map((item) => (
                    <option key={item.id}>{item.id}</option>
                  ))}
                </select>
              </label>
              <label>
                Market
                <select value={testMarket} onChange={(event) => setTestMarket(event.target.value)}>
                  {config.markets.map((item) => (
                    <option key={item.id}>{item.id}</option>
                  ))}
                </select>
              </label>
              <button className="discover-primary" disabled={busy} onClick={() => void test()}>
                <Sparkles />
                Run live test
              </button>
            </div>
            {preview && (
              <article>
                <h3>
                  <span className={"status-badge " + preview.status}>{preview.status}</span> · {preview.subNicheId || "Clarification"}
                </h3>
                <PagedText text={preview.clarification || preview.reasons.join("\n")} />
              </article>
            )}
          </div>
        ) : tab === 5 ? (
          <div className="discover-config-editor">
            <div className="discover-admin-editor-heading">
              <h2>Analysis activity</h2>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => setActivity(await getDiscoveryActivity(activityPage)))
                }
              >
                Load activity
              </button>
            </div>
            <div className="discover-activity-list">
              {activity.slice(0, 4).map((item) => (
                <article key={item.id}>
                  <strong>
                    <span className={"status-badge " + item.status}>{item.status}</span> · {item.stage}
                  </strong>
                  <span>
                    {new Date(item.startedAt).toLocaleString()} · {item.provider} ·{" "}
                    {item.subNicheId}
                  </span>
                </article>
              ))}
              {!activity.length && (
                <div className="discover-center" style={{ padding: '60px 20px', minHeight: '300px' }}>
                  <Activity size={40} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                  <div>
                    <h3 style={{ margin: '0 0 8px', color: 'var(--dt)' }}>No recent activity</h3>
                    <p style={{ margin: 0 }}>There are no recent analysis tasks to show for this page.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="discover-inline-footer">
              <Pager 
                page={activityPage}
                last={activityPage + (activity.length > 0 ? 1 : 0)}
                onChange={(page) => {
                  void run(async () => {
                    setActivity(await getDiscoveryActivity(page));
                    setActivityPage(page);
                  });
                }}
              />
            </div>
          </div>
        ) : (
          <p>Select a specialization in Catalog.</p>
        )}
      </div>
      <footer className="discover-admin-footer">
        <span>
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              Working…
            </>
          ) : (
            notice ||
            ((tab === 0 || tab === 3 ? catalogDirty : configDirty)
              ? "Unsaved draft edits"
              : "Edits stay in draft until publication")
          )}
        </span>
        {(error || conflict) && (
          <p role="alert">{error || "A newer catalog draft exists. Reload before saving."}</p>
        )}
        <small>
          {catalog
            ? `${validateDiscoveryCatalog(catalog, { publishing: true }).length} publication issues`
            : "Catalog loading"}
        </small>
      </footer>
    </section>
  );
}
