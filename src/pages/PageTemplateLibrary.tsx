import { AssetSelect } from './AssetControls';
import { FormTemplatePreview } from './FormTemplatePreview';
import { LazyBackground } from '../components/common/LazyBackground';
import { AssetAsyncButton } from './AssetAsyncButton';
import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import { useState, useEffect } from 'react';
import { Eye, ArrowRight, Search, LoaderCircle, X, RotateCcw, Layers3, LayoutTemplate, CloudDownload } from 'lucide-react';
import { usePageTemplateCatalogState } from '../backend/pageTemplateCatalog';
import type { PageTemplate } from './page-templates';
import { TemplateDesignThumbnail, templateDesignAsset } from './TemplateDesign';
import { UserStepTemplatesCatalog } from './UserStepTemplatesCatalog';
import './pagefly-editor.css';

export function PageTemplateCards({templates=[],install}:{templates?:PageTemplate[];install:(template:PageTemplate)=>void | Promise<unknown>}) {
  const language = useUILanguage();
  return <>{localizeNode(templates.map(template => {
    const isBlank = template.id === 'blank-form-template';
    const hasDesign = !!template.design || (!!template.previewSource && !isBlank);
    const cover = !isBlank && (!hasDesign || template.useThumbnail) && template.thumbnail;
    const previewHref = `/template-preview/${encodeURIComponent(template.id)}?${new URLSearchParams({ source: template.previewSource || 'catalog', lang: language.startsWith('ar') ? 'ar' : 'en' })}`;
    return (
      <article key={`${template.previewSource || 'catalog'}:${template.id}`} className={`pf-template-entry ${hasDesign || cover ? 'has-template-design' : ''}`}>
      {(hasDesign || cover) && <div className="pf-template-design-cover">
        {cover ? <img className="pf-template-cover-image" src={cover} alt="" loading="lazy" decoding="async"/> :
          <TemplateDesignThumbnail asset={templateDesignAsset(template)} language={language}/>}
      </div>}
      <AssetAsyncButton busyText="Creating..." className={`pf-template-card ${isBlank ? 'pf-template-blank-card' : ''}`} data-template-id={template.id} onClick={()=>install(template)} aria-label={translateText('Use '+template.name+' template')}>
        {busy => <>
          {!hasDesign && !cover && (template.mode === 'form' ? <FormTemplatePreview template={template}/> : <LazyBackground className="pf-template-preview" image={template.image || template.thumbnail || ''}>
            <small>{localizeNode(template.mode==='funnel'?`Funnel · ${template.builderDocument?.steps?.length || 3} steps`:`Website · ${template.builderDocument?.pages?.length || 1} ${(template.builderDocument?.pages?.length || 1) === 1 ? 'page' : 'pages'}`)}</small>
            <strong>{localizeNode(template.title)}</strong>
            <span style={{backgroundColor:template.color}}>{localizeNode(template.cta)}</span>
          </LazyBackground>)}
          <div className="pf-template-description">
            <b>{template.name}</b>
            <small>{template.categoryLabel && <>{template.categoryLabel} · </>}{localizeNode(template.industry)} · {localizeNode(template.goal)}{(template.popularity ?? 0) > 0 && <> · <em style={{ fontStyle: 'normal', display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}><CloudDownload size={12}/>{(template.popularity ?? 0).toLocaleString('en-US')}</em></>}</small>
            <span>{busy ? <><LoaderCircle size={12} className="animate-spin"/>{translateText("Creating...")}</> : <>{translateText(isBlank ? "Start Blank Form " : "Use Template ")}<ArrowRight size={12}/></>}</span>
          </div>
        </>}
      </AssetAsyncButton>
      <a className="pf-template-preview-action" href={previewHref} target="_blank" rel="noopener" aria-label={translateText('Preview') + ' · ' + template.name}><Eye size={15}/>{translateText('Preview')}</a>
      </article>
    );
  }))}</>;
}

export function PageTemplateLibrary({install,initialCategory='All',showStepTemplates=false}:{install:(template:PageTemplate)=>void | Promise<unknown>;initialCategory?:'All'|'Funnels'|'Websites'|'Forms';showStepTemplates?:boolean}) {
  const uiLang = useUILanguage();
  const ar = uiLang.startsWith('ar');
  const [category,setCategory]=useState(initialCategory);
  const [funnelSubMode,setFunnelSubMode]=useState<'full'|'steps'>('full');
  const [industry,setIndustry]=useState('All industries'),[goal,setGoal]=useState('All goals'),[search,setSearch]=useState('');

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
      if (initialCategory !== 'Funnels') setFunnelSubMode('full');
      setIndustry('All industries');
      setGoal('All goals');
    }
  }, [initialCategory]);

  const { templates: pageTemplates, loading, error } = usePageTemplateCatalogState();
  const categoryTemplates = pageTemplates.filter(template => {
    return category==='All' ? true : category==='Funnels' ? template.mode==='funnel' : category==='Websites' ? template.mode==='website' : template.mode==='form';
  });

  const filtered=categoryTemplates.filter(template=>{
    const matchInd = industry==='All industries' || template.industry===industry;
    const matchGoal = goal==='All goals' || template.goal===goal;
    const matchQuery = `${template.name} ${template.title} ${template.industry} ${template.goal} ${template.description || ""} ${template.tags?.join(" ") || ""} ${template.categoryLabel || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchInd && matchGoal && matchQuery;
  });

  const availableIndustries = ['All industries', ...new Set(categoryTemplates.map(template => template.industry))];
  const availableGoals = ['All goals', ...new Set(categoryTemplates.map(template => template.goal))];

  return <>
    <div className="pf-template-categories" role="tablist" aria-label={translateText("Template categories")}>
      {localizeNode((['All','Funnels','Websites','Forms'] as const).map(tab => (
        <button
          key={tab}
          role="tab"
          aria-selected={category===tab}
          onClick={() => {
            setCategory(tab);
            if (tab !== 'Funnels') setFunnelSubMode('full');
            setIndustry('All industries');
            setGoal('All goals');
          }}
        >
          {localizeNode(tab)}
        </button>
      )))}
    </div>
    {showStepTemplates && category === 'Funnels' && (
      <div
        className="sys-user-funnel-scope-bar"
        role="group"
        aria-label={ar ? 'نوع قوالب المسارات' : 'Funnel template type'}
        dir={ar ? 'rtl' : 'ltr'}
      >
        <button
          type="button"
          data-user-funnel-subview="full"
          aria-pressed={funnelSubMode === 'full'}
          className={`sys-user-funnel-scope-btn ${funnelSubMode === 'full' ? 'active' : ''}`}
          onClick={() => setFunnelSubMode('full')}
        >
          <Layers3 size={15} />
          <span>{ar ? 'مسارات متكاملة جاهزة' : 'Complete Multi-Step Funnels'}</span>
          <b>{categoryTemplates.length}</b>
        </button>
        <button
          type="button"
          data-user-funnel-subview="steps"
          aria-pressed={funnelSubMode === 'steps'}
          className={`sys-user-funnel-scope-btn ${funnelSubMode === 'steps' ? 'active' : ''}`}
          onClick={() => setFunnelSubMode('steps')}
        >
          <LayoutTemplate size={15} />
          <span>
            {ar
              ? 'قوالب الخطوات (الاشتراك · المبيعات · الطلب · الشكر)'
              : 'Step Templates (Opt-in · Sales · Order Form · Thank You)'}
          </span>
        </button>
      </div>
    )}
    {showStepTemplates && category === 'Funnels' && funnelSubMode === 'steps' ? (
      <UserStepTemplatesCatalog install={install} />
    ) : <>
    <div className="pf-template-filters">
      <label>
        <Search size={15}/>
        <input aria-label={translateText("Search templates")} value={search} onChange={e=>setSearch(e.target.value)} placeholder={translateText("Search templates by name, style, or topic...")}/>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            style={{ border: 0, background: 'transparent', padding: 2, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            title={translateText("Clear search")}
          >
            <X size={14} />
          </button>
        )}
      </label>
      <AssetSelect label="Template industry" className={industry !== 'All industries' ? 'is-filtered' : ''} value={industry} onChange={setIndustry} options={availableIndustries}/>
      <AssetSelect label="Template goal" className={goal !== 'All goals' ? 'is-filtered' : ''} value={goal} onChange={setGoal} options={availableGoals}/>
      {(search || industry !== 'All industries' || goal !== 'All goals') && (
        <button
          type="button"
          className="pf-clear-filters-btn"
          onClick={() => {
            setSearch('');
            setIndustry('All industries');
            setGoal('All goals');
          }}
          title={translateText("Reset all filters")}
        >
          <RotateCcw size={13} />
          <span>{translateText("Reset")}</span>
        </button>
      )}
    </div>
    <div className="pf-template-library">
      {loading && <p role="status">{translateText('Loading templates…')}</p>}
      {error && <p role="alert">{error}</p>}
      <PageTemplateCards templates={filtered} install={install}/>
    </div>
    {localizeNode(!loading&&!error&&!filtered.length&&<p className="pf-empty-copy">{translateText("No templates match these filters.")}</p>)}
    </>}
  </>;
}
