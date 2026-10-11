import { ProductCardActions } from './commerce/ProductCardActions';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CommerceSelect } from '../components/ui/CommerceSelect';
import { WorkspaceSettings } from './commerce/WorkspaceSettings';
import { DiscountsWorkspace } from './DiscountsWorkspace';

import { ArrowUpDown, Box, CalendarClock, CalendarDays, ChevronDown, Clock3, CreditCard, Pencil, FileText, Grid2X2, Plus, Search, Settings, ShoppingBag, SlidersHorizontal, UserRound, Users, UsersRound, UserRoundCheck } from 'lucide-react';
import type { Product, StatKind } from './commerce/model';
import { useProducts } from './commerce/repository';
import './products-payments.css';
import './products-payments-overrides.css';
import './commerce/commerce-enhancements.css';

const statIcons:Record<StatKind,React.ElementType>={sales:UsersRound,revenue:Clock3,bookings:CalendarDays,members:UserRound};
type Props={notify:(message:string)=>void;showModal?:boolean;setShowModal?:(show:boolean)=>void};
const productTabs=[['Products',ShoppingBag],['Orders',FileText],['Customers',Users],['Payments',CreditCard],['Discounts',SlidersHorizontal],['Settings',Settings]] as const;
const metricData=[['All Products','All your products',Box,'violet','All Types'],['Digital Products','Files, templates and assets',FileText,'blue','Digital Product'],['Services','Consulting and coaching',UserRoundCheck,'green','Service'],['Courses','Lessons and learning',Users,'orange','Course']] as const;

export const ProductsPayments:React.FC<Props>=({notify,showModal=false,setShowModal})=>{
 const [tabParams,setTabParams]=useSearchParams();

 const navigate=useNavigate();
 const products=useProducts();
 const selectedTab=productTabs.find(([name])=>name.toLowerCase()===tabParams.get('tab'))?.[0]??'Products';const[search,setSearch]=React.useState('');const[type,setType]=React.useState('All Types');const[status,setStatus]=React.useState('All Status');const[sort,setSort]=React.useState('Newest First');const[view,setView]=React.useState<'Grid'|'List'>('Grid');const[,setFilterMetric]=React.useState('All Products');
 React.useEffect(()=>{if(showModal){setShowModal?.(false);navigate('/dashboard/products-payments/products/new')}},[showModal,setShowModal,navigate]);
 const displayed=products.filter(p=>(type==='All Types'||p.type===type)&&(status==='All Status'||p.status===status)&&`${p.name} ${p.type}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='A to Z'?a.name.localeCompare(b.name):sort==='Price: Low to High'?(a.config?.amount??0)-(b.config?.amount??0):Number(new Date(b.createdAt??0))-Number(new Date(a.createdAt??0)));
 return <main className="pp-page">


  <div className="pp-tabs">{productTabs.map(([name,Icon])=><button key={name} className={selectedTab===name?'active':''} onClick={()=>{setTabParams(current=>{const next=new URLSearchParams(current);next.set('tab',name.toLowerCase());return next});if(name!=='Products'&&name!=='Discounts')notify(`${name} view selected.`)}}><Icon size={15}/>{name}</button>)}<button className="pp-create" onClick={()=>navigate('/dashboard/products-payments/products/new')}><Plus size={15}/> Create Product <ChevronDown size={13}/></button></div>
  {selectedTab==='Products'?<>
   <section className="pp-metrics">{metricData.map(([label,note,Icon,tone,filter])=><button key={label} className={`pp-metric ${tone} ${type===filter?'selected':''}`} onClick={()=>{setType(filter);setFilterMetric(label)}}><span><Icon size={23}/></span><div><small>{label}</small><b>{products.filter(p=>filter==='All Types'||p.type===filter).length}</b><em>{note}</em></div></button>)}</section>
   <div className="pp-workspace"><section className="pp-catalog"><div className="pp-toolbar"><label className="pp-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products..."/></label><ProfessionalSelect value={type} options={['All Types','Service','Digital Product','Course']} onChange={v=>{setType(v);setFilterMetric(v==='All Types'?'All Products':v)}}/><ProfessionalSelect value={status} options={['All Status','Active','Draft']} onChange={setStatus}/><ProfessionalSelect icon={ArrowUpDown} value={sort} options={['Newest First','A to Z','Price: Low to High']} onChange={setSort}/><span className="pp-toolbar-divider" aria-hidden="true"/><div className="pp-view-toggle"><button className={view==='Grid'?'active':''} aria-label="Grid view" onClick={()=>setView('Grid')}><Grid2X2 size={16}/></button><button className={view==='List'?'active':''} aria-label="List view" onClick={()=>setView('List')}><RowsIcon/></button></div></div><div className={`pp-products ${view==='List'?'list':''}`}>{displayed.length===0&&<div className="pp-empty-results"><Search size={24}/><b>No products found</b><span>Try a different search or clear your filters.</span><button onClick={()=>{setSearch('');setType('All Types');setStatus('All Status');setFilterMetric('All Products')}}>Clear filters</button></div>}{displayed.map(item=><ProductCard key={item.id} item={item} onSelect={()=>navigate(`/dashboard/products-payments/products/${item.id}/edit`)} onEdit={()=>navigate(`/dashboard/products-payments/products/${item.id}/edit`)} notify={notify}/>)}</div></section>

   </div>
  </>:selectedTab==='Discounts'?<DiscountsWorkspace notify={notify}/>:selectedTab==='Settings'?<WorkspaceSettings notify={notify}/>:<SecondaryModule tab={selectedTab} notify={notify}/>}

 </main>
};

function ProductCard({item,onSelect,onEdit,notify}:{item:Product;onSelect:()=>void;onEdit:()=>void;notify:(message:string)=>void}){
 return <article className="pp-product-card" onClick={onSelect}>
  <button className="pp-art" onClick={event=>{event.stopPropagation();onSelect()}} aria-label={`Edit ${item.name}`}>{item.image?<img src={item.image} alt={`${item.name} thumbnail`} loading="lazy" draggable={false}/>:<Artwork kind={item.art}/>}</button>
  <ProductCardActions product={item} onEdit={onEdit} notify={notify}/>
  <div className="pp-card-info"><span className={`pp-type-tag ${item.type.toLowerCase().replaceAll(' ','-')}`}>{item.tag}</span><button className="pp-product-title" onClick={event=>{event.stopPropagation();onSelect()}}>{item.name}</button><b className="pp-price">{item.price}</b><div className="pp-product-metric">{item.stats.map(([kind,text])=>{const StatIcon=statIcons[kind];return <span key={kind}><StatIcon size={12}/>{text}</span>})}</div><div className="pp-card-footer"><span className={`pp-status ${item.status.toLowerCase()}`}>{item.status}</span><button className="pp-open" title="Edit product" aria-label={`Edit ${item.name}`} onClick={event=>{event.stopPropagation();onSelect()}}><Pencil size={15}/></button></div></div>
 </article>;
}
function Artwork({kind}:{kind:string}){return <div className={`pp-artwork ${kind}`}><div className="art-glow"/><div className="art-phone"><span/><i/><i/><i/></div>{kind==='course'?<><span className="art-arabic">تسويق ذكي<br/><b>AI</b> للمستقبل</span><span className="art-person">MJ</span><small>GOING<br/>FURTHER</small></>:kind==='templates'?<><span className="art-neon-title">SOCIAL<br/>TEMPLATES</span><div className="art-phone second"><span/><i/><i/><i/></div><b className="art-sticker">120+</b></>:kind==='speaker'?<><span className="art-speaker">MJ</span><div className="art-callout"><CalendarClock size={18}/></div><small>STRATEGY<br/>SESSION</small></>:kind==='whatsapp'?<><span className="art-arabic">تنفيذ<br/>وتحسين</span><span className="art-wa">◉</span><small>WHATSAPP<br/>AUTOMATION</small></>:kind==='funnel'?<><div className="art-dashboard"><b>GOS</b><i/><i/><i/><span>Leads +28%</span></div><span className="art-mini-phone"/></>:kind==='agency'?<><span className="art-agency-title">Agency<br/>Starter Kit</span><div className="art-dashboard"><b>GOS</b><i/><i/><span>Launch system</span></div></>:kind==='membership'?<><span className="art-crown">♛</span><b className="art-membership">Premium<br/>Membership</b><small>GOS PRO</small></>:<><div className="art-phone"><span/><i/><i/><i/></div><div className="art-phone second"><span/><i/><i/><i/></div><span className="art-bundle">GROW</span></>}</div>}
function ProfessionalSelect({value,options,onChange,icon:Icon}:{value:string;options:string[];onChange:(v:string)=>void;icon?:React.ElementType}){
 return <CommerceSelect className="pp-select" label={Icon?'Sort products':options[0]==='All Types'?'Filter product type':'Filter product status'} value={value} options={options} onChange={onChange} icon={Icon}/>;
}
function SecondaryModule({tab,notify}:{tab:string;notify:(s:string)=>void}){const rows=tab==='Orders'?[['#ORD-1048','Sarah Ahmed','Complete AI Marketing Course','€297','Paid'],['#ORD-1047','Omar Khaled','Social Media Templates Pack','€47','Paid'],['#ORD-1046','Lina Mansour','GOS Pro Membership','€29','Pending']]:tab==='Customers'?[['Sarah Ahmed','sarah@northstar.co','3 orders','€594','Active'],['Omar Khaled','omar@orbitlabs.io','2 orders','€344','Active'],['Lina Mansour','lina@brightpath.com','1 order','€97','Active']]:tab==='Payments'?[['PAY-4401','Sarah Ahmed','Stripe','€297','Succeeded'],['PAY-4400','Omar Khaled','Stripe','€47','Succeeded'],['PAY-4399','Lina Mansour','PayPal','€97','Refunded']]:tab==='Discounts'?[['WELCOME10','10% off','All products','84 uses','Active'],['GROWTH25','€25 off','Business Growth Bundle','16 uses','Active']]:[];return <section className="pp-secondary-view"><div className="pp-secondary-heading"><div><h2>{tab}</h2><p>Manage your {tab.toLowerCase()} across products and payments.</p></div><button onClick={()=>notify(`Create ${tab.slice(0,-1).toLowerCase()} form opened.`)}><Plus size={14}/> Create {tab.slice(0,-1)}</button></div>{<div className="pp-secondary-table"><div>{(tab==='Orders'?['Order','Customer','Product','Total','Status']:tab==='Customers'?['Customer','Email','Orders','Lifetime value','Status']:tab==='Payments'?['Payment','Customer','Provider','Amount','Status']:['Code','Offer','Applies to','Uses','Status']).map(h=><b key={h}>{h}</b>)}</div>{rows.map(row=><div key={row[0]}>{row.map((cell,i)=><span key={i}>{i===row.length-1?<em className={`pp-secondary-status ${cell.toLowerCase()}`}>{cell}</em>:cell}</span>)}</div>)}</div>}</section>}
function RowsIcon(){return <span className="pp-rows-icon"><i/><i/><i/></span>}
