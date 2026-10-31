import { AssetSelect } from './AssetControls';
import { FormTemplatePreview } from './FormTemplatePreview';
import { LazyBackground } from '../components/common/LazyBackground';
import { AssetAsyncButton } from './AssetAsyncButton';
import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import { useState, useEffect } from 'react';
import { ArrowRight, Search, LoaderCircle, X, RotateCcw } from 'lucide-react';
import { publishedPageTemplates } from './admin/template-library';
import type { PageTemplate } from './page-templates';
import './pagefly-editor.css';

export function PageTemplateCards({templates=publishedPageTemplates(),install}:{templates?:PageTemplate[];install:(template:PageTemplate)=>void | Promise<unknown>}) {
  useUILanguage();
  return <>{localizeNode(templates.map(template => {
    const isBlank = template.id === 'blank-form-template';
    return (
      <AssetAsyncButton busyText="Creating..." className={`pf-template-card ${isBlank ? 'pf-template-blank-card' : ''}`} key={template.id} data-template-id={template.id} onClick={()=>install(template)} aria-label={translateText('Use '+template.name+' template')}>
        {busy => <>
          {template.mode === 'form' ? <FormTemplatePreview template={template}/> : <LazyBackground className="pf-template-preview" image={template.image}>
            <small>{localizeNode(template.mode==='funnel'?'Funnel · 3 steps':'Website · 1 page')}</small>
            <strong>{localizeNode(template.title)}</strong>
            <span style={{backgroundColor:template.color}}>{localizeNode(template.cta)}</span>
          </LazyBackground>}
          <div className="pf-template-description">
            <b>{localizeNode(template.name)}</b>
            <small>{localizeNode(template.industry)} · {localizeNode(template.goal)}</small>
            <span>{busy ? <><LoaderCircle size={12} className="animate-spin"/>{translateText("Creating...")}</> : <>{translateText(isBlank ? "Start Blank Form " : "Use Template ")}<ArrowRight size={12}/></>}</span>
          </div>
        </>}
      </AssetAsyncButton>
    );
  }))}</>;
}

export function PageTemplateLibrary({install,initialCategory='All'}:{install:(template:PageTemplate)=>void | Promise<unknown>;initialCategory?:'All'|'Funnels'|'Websites'|'Forms'}) {
  useUILanguage();
  const [category,setCategory]=useState(initialCategory);
  const [industry,setIndustry]=useState('All industries'),[goal,setGoal]=useState('All goals'),[search,setSearch]=useState('');

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
      setIndustry('All industries');
      setGoal('All goals');
    }
  }, [initialCategory]);

  const pageTemplates=publishedPageTemplates();
  const categoryTemplates = pageTemplates.filter(template => {
    return category==='All' ? true : category==='Funnels' ? template.mode==='funnel' : category==='Websites' ? template.mode==='website' : template.mode==='form';
  });

  const filtered=categoryTemplates.filter(template=>{
    const matchInd = industry==='All industries' || template.industry===industry;
    const matchGoal = goal==='All goals' || template.goal===goal;
    const matchQuery = `${template.name} ${template.title} ${template.industry} ${template.goal}`.toLowerCase().includes(search.toLowerCase());
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
            setIndustry('All industries');
            setGoal('All goals');
          }}
        >
          {localizeNode(tab)}
        </button>
      )))}
    </div>
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
      <PageTemplateCards templates={filtered} install={install}/>
    </div>
    {localizeNode(!filtered.length&&<p className="pf-empty-copy">{translateText("No templates match these filters.")}</p>)}
  </>;
}
