import { AICopilot } from './AICopilot';
import { FunnelBuilder } from './FunnelBuilder';
import { KnowledgePanel } from './settings/KnowledgePanel';
import { cloudStorage } from '../backend/workspace';
import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Bot, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CreditCard, ExternalLink, FileText, Globe2, Link2, MessageCircle, MoreHorizontal, Plus, Send, ShieldCheck, Sparkles, Upload, Users, WandSparkles } from 'lucide-react';
import './home-upgrades.css';
import { HomeDashboard } from './dashboard/HomeDashboard';

import { Inbox } from './Inbox';
import { CRMLeads } from './CRMLeads';
import { AIFollowUp, defaultWorkflows } from './AIFollowUp';
import { BookingCalendar } from './BookingCalendar';
import { ProductsPayments } from './ProductsPayments';
import { BookingTemplates } from './booking/BookingTemplates';
import { TemplatesWorkspace, type TemplateScope } from './TemplatesWorkspace';
import { Select } from '../components/ui/Select';
import { Analytics } from './Analytics';

import { useSelector } from 'react-redux';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

type PageKey='home'|'copilot'|'funnels'|'crm'|'inbox'|'follow-up'|'booking'|'products'|'analytics'|'knowledge';
function PageHeading({eyebrow,title,description,action,actionIcon:Icon=Plus}:{eyebrow?:string;title:string;description?:string;action?:string;actionIcon?:React.ElementType}){
  useUILanguage();return <div className="page-heading"><div>{localizeNode(eyebrow&&<div className="eyebrow">{localizeNode(eyebrow)}</div>)}<h1>{localizeNode(title)}</h1>{localizeNode(description&&<p>{localizeNode(description)}</p>)}</div>{localizeNode(action&&<button className="button-primary"><Icon size={16}/>{localizeNode(action)}</button>)}</div>}
function Pill({children,tone='neutral'}:{children:React.ReactNode;tone?:string}){
  useUILanguage();return <span className={`pill pill-${tone}`}>{localizeNode(children)}</span>}

export const DashboardPage:React.FC<{page:PageKey}>=({page})=>{
  useUILanguage();
 const location=useLocation();
 const [activeChannel,setActiveChannel]=React.useState('whatsapp');
 const [activeConversation,setActiveConversation]=React.useState('ld-101');
 const [aiMode,setAiMode]=React.useState(true);
 const [sent,setSent]=React.useState(false);
 const [showModal,setShowModal]=React.useState(false);
 React.useEffect(()=>{const leadId=new URLSearchParams(location.search).get('leadId');if(leadId)setActiveConversation(leadId)},[location.search]);
 const notify=(s:string)=>{showToast.success(s)};
 const canonicalLeads=useSelector((state:RootState)=>state.crm.leads);
 const selected=canonicalLeads.find(l=>l.id===activeConversation)??canonicalLeads[0];
 const templateScope = ['booking', 'follow-up', 'products', 'copilot', 'knowledge'].includes(page) ? page as TemplateScope : null;
 if (page === 'booking' && new URLSearchParams(location.search).get('tab') === 'templates') return <BookingTemplates/>;
 if (templateScope && new URLSearchParams(location.search).get('tab') === 'templates') return <><div className="native-template-nav"><Link className="st-secondary" to={'/dashboard/' + page}>{translateText("Back to ")}{localizeNode(page)}</Link></div><TemplatesWorkspace key={templateScope} scope={templateScope} onInstall={templateScope === 'follow-up' ? template => { const key = template.category === 'Automations' ? 'gos.ai-followup.workflows.v1' : 'gos.ai-followup.templates.v1'; const saved = JSON.parse(cloudStorage.getItem(key) ?? 'null'); const items = Array.isArray(saved) ? saved : []; const item = template.category === 'Automations' ? { id: template.id, name: template.name, description: template.description, trigger: '0 triggered', active: false, from: 'NEW', to: 'CONTACTED', actionType: 'Email', sequenceSteps: template.content.steps.map((step, index) => ({ id: template.id + '-' + index, delay: String(index + 1), unit: 'hours', action: step.toLowerCase().includes('message') ? 'WhatsApp' : 'Email' })) } : { id: template.id, title: template.name, description: template.description, iconKey: 'message', custom: true, category: template.category, prompt: template.content.headline, variables: '{{first_name}}' }; cloudStorage.setItem(key, JSON.stringify([...items, item])); } : undefined}/></>;
 const content=(()=>{switch(page){
 case 'home':return <HomeDashboard/>;
 case 'copilot':return <AICopilot/>;
 case 'crm':return <CRMLeads notify={notify}/>;
 case 'inbox':return <Inbox selected={selected} activeChannel={activeChannel} setActiveChannel={setActiveChannel} activeConversation={activeConversation} setActiveConversation={setActiveConversation} aiMode={aiMode} setAiMode={setAiMode} sent={sent} setSent={setSent}/>;
 case 'follow-up':return <AIFollowUp notify={notify}/>;
 case 'booking':return <BookingCalendar createRequested={showModal} clearCreateRequest={()=>setShowModal(false)} notify={notify}/>;
 case 'funnels':return <FunnelBuilder/>;
 case 'products':return <ProductsPayments showModal={showModal} setShowModal={setShowModal} notify={notify}/>;
 case 'analytics':return <Analytics notify={notify}/>;
 case 'knowledge':return <KnowledgePanel/>;

 }})();
 return <>{localizeNode(templateScope && !['booking', 'products', 'follow-up'].includes(page) && <div className="native-template-nav"><Link className="st-secondary" to={'/dashboard/' + page + '?tab=templates'}>{localizeNode(page === 'follow-up' ? 'Automation templates' : 'Templates')} <ArrowRight size={14}/></Link></div>)}{localizeNode(content)}</>;
};

