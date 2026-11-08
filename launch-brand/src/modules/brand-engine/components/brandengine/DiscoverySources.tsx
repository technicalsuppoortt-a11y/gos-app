import { useState } from "react";
import { Building2, Users, ExternalLink, MapPin, Search, Link2 } from "lucide-react";
import type { DiscoverySource } from "../../data/discoveryProfile";

export function DiscoverySources({ sources, ar, audience = false, status }: {
  sources: DiscoverySource[]; ar: boolean; audience?: boolean; status?: string;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(6);
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const safe = sources.filter(item => {
    try { const url = new URL(item.url); return url.protocol === "https:" && !url.username && !url.password; }
    catch { return false; }
  });
  const filtered = safe.filter(item => (filter === "all" || item.kind === filter) &&
    `${item.title} ${item.country || ""} ${item.reason || ""} ${item.url}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  const filtering = Boolean(query || filter !== "all");
  const emptyMessage = filtering ? t("Try another search or source type.", "جرّب بحث تاني أو نوع مصدر مختلف.")
    : status === "disabled" ? t("Web research is disabled in Discovery settings.", "البحث على الويب متوقف في إعدادات اكتشاف السوق.")
    : status === "failed" ? t("Web research could not finish.", "تعذر إكمال البحث على الويب.")
    : status === "no_sources" ? t("The AI provider returned no web search links. This recommendation is based on your profile only.", "مزوّد الـAI لم يُرجع روابط من بحث الويب. الترشيح ده مبني على ملفك فقط.")
    : status === "no_matches" && audience ? t("Research references were found, but no matching companies or groups were supported for this service and country.", "مراجع البحث موجودة، لكن مفيش شركات أو جروبات مسندة للبحث تطابق الخدمة والبلد المحددة.")
    : audience ? t("No company or group links are saved for this analysis.", "مفيش روابط شركات أو جروبات محفوظة للتحليل ده.")
    : t("No research references are saved for this analysis.", "مفيش مراجع بحث محفوظة للتحليل ده.");
  return <section className="discovery-source-panel" aria-label={audience ? t("Audience sources", "مصادر الجمهور") : t("Research sources", "مصادر البحث")}>
    <div className="discovery-source-heading">
      <span className="discovery-source-heading-icon"><Link2 size={20} /></span>
      <div><h3>{audience ? t("Where to find your audience", "فين تلاقي جمهورك؟") : t("Research sources", "مصادر البحث")}</h3>
        <p>{audience ? t("Companies and communities relevant to your service in your selected market.", "شركات ومجتمعات مرتبطة بخدمتك في السوق اللي حددته.") : t("References used by AI to research this recommendation.", "المراجع اللي استخدمها الـAI في بحث الترشيح.")}</p></div>
      <span className="discovery-source-count">{safe.length}</span>
    </div>
    {!!safe.length && <div className="discovery-source-tools">
      {audience && <div className="discovery-source-filters" role="group" aria-label={t("Source type", "نوع المصدر")}>
        {[["all", t("All", "الكل")], ["company", t("Companies", "شركات")], ["group", t("Groups", "جروبات")]].map(([value, label]) =>
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(6); }}>{label} <span>{safe.filter(item => value === "all" || item.kind === value).length}</span></button>)}
      </div>}
      <label className="discovery-source-search"><Search size={16} /><input value={query} onChange={event => { setQuery(event.target.value); setLimit(6); }} placeholder={t("Search sources…", "ابحث في المصادر…")} aria-label={t("Search sources", "ابحث في المصادر")} /></label>
    </div>}
    <div className="discovery-source-grid">
      {filtered.slice(0, limit).map(item => {
        const Icon = item.kind === "group" ? Users : item.kind === "company" ? Building2 : Link2;
        return <a className="discovery-source-card" key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
          <div className="discovery-source-card-top"><span className={`discovery-source-symbol ${item.kind || "reference"}`}><Icon size={20} /></span><span className="discovery-source-type">{item.kind === "group" ? t("Community / group", "مجتمع / جروب") : item.kind === "company" ? t("Company", "شركة") : t("Reference", "مرجع")}</span><ExternalLink size={16} /></div>
          <h4>{item.title}</h4>
          {item.country && <span className="discovery-source-location"><MapPin size={13} />{item.country}</span>}
          {item.reason && <p>{item.reason}</p>}
          <div className="discovery-source-card-footer"><span dir="ltr">{new URL(item.url).hostname}</span><strong>{t("Visit source", "افتح المصدر")} ↗</strong></div>
        </a>;
      })}
    </div>
    {!filtered.length && <div className="discovery-source-empty"><Search size={25} /><h4>{filtering ? t("No matching sources", "مفيش مصادر مطابقة") : audience ? t("No audience sources yet", "لسه مفيش مصادر جمهور متاحة") : t("No research references", "مفيش مراجع بحث متاحة")}</h4><p>{emptyMessage}</p></div>}
    {filtered.length > limit && <button className="discovery-source-more" type="button" onClick={() => setLimit(value => value + 6)}>{t("Show more sources", "عرض مصادر أكتر")} ({filtered.length - limit})</button>}
    {!!safe.length && audience && <p className="discovery-source-note">{t("Research suggestions, not confirmed leads. Check each source's relevance and group rules before contacting members.", "دي اقتراحات بحث، مش عملاء مؤكدين. راجع ملاءمة المصدر وقواعد الجروب قبل التواصل.")}</p>}
  </section>;
}
