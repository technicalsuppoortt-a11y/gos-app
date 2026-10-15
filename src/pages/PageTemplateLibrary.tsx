import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import {useState} from 'react';
import {ArrowRight,Search} from 'lucide-react';
import {publishedPageTemplates} from './admin/template-library';
import type {PageTemplate} from './page-templates';
import './pagefly-editor.css';

export function PageTemplateCards({templates=publishedPageTemplates(),install}:{templates?:PageTemplate[];install:(template:PageTemplate)=>void}) {
  useUILanguage();
  return <>{localizeNode(templates.map(template=><button className="pf-template-card" key={template.id} data-template-id={template.id} onClick={()=>install(template)} aria-label={translateText('Use '+template.name+' template')}><div className="pf-template-preview" style={{backgroundImage:`linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.12)),url(${template.image})`}}><small>{localizeNode(template.mode==='funnel'?'Funnel · 3 steps':'Website · 1 page')}</small><strong>{localizeNode(template.title)}</strong><span style={{backgroundColor:template.color}}>{localizeNode(template.cta)}</span></div><div className="pf-template-description"><b>{localizeNode(template.name)}</b><small>{localizeNode(template.industry)} · {localizeNode(template.goal)}</small><span>{translateText("Use Template ")}<ArrowRight size={12}/></span></div></button>))}</>;
}
export function PageTemplateLibrary({install,initialCategory='All'}:{install:(template:PageTemplate)=>void;initialCategory?:'All'|'Funnels'|'Websites'}) {
  useUILanguage();
  const [category,setCategory]=useState(initialCategory);
  const [industry,setIndustry]=useState('All industries'),[goal,setGoal]=useState('All goals'),[search,setSearch]=useState('');
  const pageTemplates=publishedPageTemplates();
  const filtered=pageTemplates.filter(template=>(category==='All'||template.mode===(category==='Funnels'?'funnel':'website'))&&(industry==='All industries'||template.industry===industry)&&(goal==='All goals'||template.goal===goal)&&`${template.name} ${template.title} ${template.industry}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="pf-template-categories" role="tablist" aria-label={translateText("Template categories")}>{localizeNode((['All','Funnels','Websites'] as const).map(tab=><button key={tab} role="tab" aria-selected={category===tab} onClick={()=>setCategory(tab)}>{localizeNode(tab)}</button>))}</div><div className="pf-template-filters"><label><Search size={14}/><input aria-label={translateText("Search templates")} value={search} onChange={e=>setSearch(e.target.value)} placeholder={translateText("Search templates")}/></label><select aria-label={translateText("Template industry")} value={industry} onChange={e=>setIndustry(e.target.value)}>{localizeNode(['All industries',...new Set(pageTemplates.map(template=>template.industry))].map(option=><option key={option} value={option}>{localizeNode(option)}</option>))}</select><select aria-label={translateText("Template goal")} value={goal} onChange={e=>setGoal(e.target.value)}>{localizeNode(['All goals',...new Set(pageTemplates.map(template=>template.goal))].map(option=><option key={option} value={option}>{localizeNode(option)}</option>))}</select></div><div className="pf-template-library"><PageTemplateCards templates={filtered} install={install}/></div>{localizeNode(!filtered.length&&<p className="pf-empty-copy">{translateText("No templates match these filters.")}</p>)}</>;
}
