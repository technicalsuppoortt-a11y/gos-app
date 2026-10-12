import {useState} from 'react';
import {ArrowRight,Search} from 'lucide-react';
import {pageTemplates} from './page-templates';
import type {PageTemplate} from './page-templates';
import './pagefly-editor.css';

export function PageTemplateCards({templates=pageTemplates,install}:{templates?:PageTemplate[];install:(template:PageTemplate)=>void}) {
  return <>{templates.map(template=><button className="pf-template-card" key={template.id} data-template-id={template.id} onClick={()=>install(template)} aria-label={'Use '+template.name+' template'}><div className="pf-template-preview" style={{backgroundImage:`linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.12)),url(${template.image})`}}><small>{template.mode==='funnel'?'Funnel · 3 steps':'Website · 1 page'}</small><strong>{template.title}</strong><span style={{backgroundColor:template.color}}>{template.cta}</span></div><div className="pf-template-description"><b>{template.name}</b><small>{template.industry} · {template.goal}</small><span>Use Template <ArrowRight size={12}/></span></div></button>)}</>;
}
export function PageTemplateLibrary({install,initialCategory='All'}:{install:(template:PageTemplate)=>void;initialCategory?:'All'|'Funnels'|'Websites'}) {
  const [category,setCategory]=useState(initialCategory);
  const [industry,setIndustry]=useState('All industries'),[goal,setGoal]=useState('All goals'),[search,setSearch]=useState('');
  const filtered=pageTemplates.filter(template=>(category==='All'||template.mode===(category==='Funnels'?'funnel':'website'))&&(industry==='All industries'||template.industry===industry)&&(goal==='All goals'||template.goal===goal)&&`${template.name} ${template.title} ${template.industry}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="pf-template-categories" role="tablist" aria-label="Template categories">{(['All','Funnels','Websites'] as const).map(tab=><button key={tab} role="tab" aria-selected={category===tab} onClick={()=>setCategory(tab)}>{tab}</button>)}</div><div className="pf-template-filters"><label><Search size={14}/><input aria-label="Search templates" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search templates"/></label><select aria-label="Template industry" value={industry} onChange={e=>setIndustry(e.target.value)}>{['All industries',...new Set(pageTemplates.map(template=>template.industry))].map(option=><option key={option}>{option}</option>)}</select><select aria-label="Template goal" value={goal} onChange={e=>setGoal(e.target.value)}>{['All goals',...new Set(pageTemplates.map(template=>template.goal))].map(option=><option key={option}>{option}</option>)}</select></div><div className="pf-template-library"><PageTemplateCards templates={filtered} install={install}/></div>{!filtered.length&&<p className="pf-empty-copy">No templates match these filters.</p>}</>;
}
