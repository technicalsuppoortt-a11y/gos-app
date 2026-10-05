import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { DiscountActionMenu } from './DiscountActionMenu';
import { DiscountSelect as Select } from './DiscountSelect';
import { type Discount, readDiscounts, writeDiscounts, discountNewPath, discountEditPath } from './discounts-data';
import { ArrowUp, ArrowUpDown, BarChart3, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Power, Trash2, Search, ShoppingCart, Ticket, Users } from 'lucide-react';
import course from '../assets/products/ai-course.jpg';
import templates from '../assets/products/social-pack.jpg';
import bundle from '../assets/products/growth-bundle.jpg';
import './discounts-workspace.css';

function Growth({children}:{children:React.ReactNode}) {return <span className="dc-growth"><ArrowUp size={10}/>{children}</span>}


export function DiscountsWorkspace({notify}:{notify:(message:string)=>void}) {
 const navigate=useNavigate();
 const [discounts,setDiscounts]=React.useState(readDiscounts);
 const [search,setSearch]=React.useState('');const [type,setType]=React.useState('All Types');const [status,setStatus]=React.useState('All Status');const [sort,setSort]=React.useState('Newest First');const [page,setPage]=React.useState(1);
 const [selected,setSelected]=React.useState<string[]>([]);const [menu,setMenu]=React.useState<string|null>(null);const [range,setRange]=React.useState('Last 6 Months');
 const [deleteConfirm, setDeleteConfirm] = React.useState<Discount | null>(null);
 React.useEffect(()=>{try{writeDiscounts(discounts)}catch{notify('Changes are available for this session; browser storage is unavailable.')}},[discounts,notify]);
 React.useEffect(()=>{setPage(1)},[search,type,status,sort]);
 const filtered=discounts.filter(d=>`${d.code} ${d.description}`.toLowerCase().includes(search.toLowerCase())&&(type==='All Types'||d.type===type)&&(status==='All Status'||d.active===(status==='Active'))).sort((a,b)=>sort==='A to Z'?a.code.localeCompare(b.code):sort==='Most Used'?b.uses-a.uses:sort==='Value: High to Low'?b.value-a.value:0);
 const pages=Math.max(1,Math.ceil(filtered.length/8));const currentPage=Math.min(page,pages);const rows=filtered.slice((currentPage-1)*8,currentPage*8);
 const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
 const edit=(d:Discount)=>navigate(discountEditPath(d.id));
 const metrics=[['Total Discounts',String(discounts.length),'20%',Ticket,'purple'],['Total Uses','428','32%',Users,'blue'],['Total Revenue','€12,460','28%',ShoppingCart,'green'],['Average Conversion','6.2%','1.4%',BarChart3,'orange']] as const;
 return <section className="pp-secondary-view"><div className="pp-secondary-heading"><div><h2>Discounts &amp; Coupons</h2><p>Create and manage your discount codes to boost your sales.</p></div><button onClick={()=>navigate(discountNewPath)}><Plus size={14}/> Create Discount</button></div><div className="dc-workspace dc-dashboard">
  <section className="dc-metrics" aria-label="Discount metrics">{metrics.map(([label,value,growth,Icon,tone],i)=><article key={label} className={`dc-stat ${tone}`}><span className="dc-stat-icon"><Icon size={22}/></span><div><strong>{value}</strong><small>{label}</small></div><div className="dc-stat-trend"><Growth>{growth}</Growth>{i===0&&<small>vs last month</small>}</div></article>)}</section>
  <div className="dc-split"><section className="dc-left">
   <div className="dc-table-card"><div className="dc-toolbar"><label className="dc-search"><Search size={13}/><input aria-label="Search discounts" placeholder="Search discounts..." value={search} onChange={e=>setSearch(e.target.value)}/></label><Select label="Filter discount type" value={type} options={['All Types','Percentage','Fixed Amount']} onChange={setType}/><Select label="Filter discount status" value={status} options={['All Status','Active','Inactive']} onChange={setStatus}/><span className="dc-sort"><ArrowUpDown size={11}/><Select label="Sort discounts" value={sort} options={['Newest First','A to Z','Most Used','Value: High to Low']} onChange={setSort}/></span></div>
   {selected.length>0&&<div className="dc-selection"><span>{selected.length} selected</span><button onClick={()=>{setDiscounts(items=>items.map(d=>selected.includes(d.id)?{...d,active:true}:d));setSelected([])}}>Activate</button><button onClick={()=>{setDiscounts(items=>items.map(d=>selected.includes(d.id)?{...d,active:false}:d));setSelected([])}}>Deactivate</button><button onClick={()=>setSelected([])}>Clear</button></div>}
   <div className="dc-table-wrap"><table><thead><tr><th><input aria-label="Select all visible discounts" type="checkbox" checked={rows.length>0&&rows.every(d=>selected.includes(d.id))} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,...rows.map(d=>d.id)])]:current.filter(id=>!rows.some(d=>d.id===id)))}/></th>{['Code','Type','Value','Applies To','Usage','Expiration','Status',''].map((label,i)=><th key={i}>{label}</th>)}</tr></thead><tbody>{rows.map(d=><tr key={d.id} className={selected.includes(d.id)?'selected':''}><td><input type="checkbox" aria-label={`Select ${d.code}`} checked={selected.includes(d.id)} onChange={()=>toggle(d.id)}/></td><td><button className="dc-code" onClick={()=>edit(d)}>{d.code}</button><small className="dc-description">{d.description}</small></td><td><span className="dc-type-badge">{d.type}</span></td><td className="dc-value">{d.type==='Percentage'?`${d.value}%`:`€${d.value}`}</td><td>{d.applies}{d.applies==='Specific Products'&&<span className="dc-thumbnails">{[course,templates,bundle].map((src,i)=><img src={src} alt={['AI Marketing Course','Social Media Templates','Business Growth Bundle'][i]} key={src}/>)}<span>+{d.code==='SUMMER25'?2:3}</span></span>}</td><td>{d.uses} / {d.limit||'∞'}</td><td>{d.expiry?new Date(`${d.expiry}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No expiry'}</td><td><span className={`dc-status ${d.active?'active':'inactive'}`}>{d.active?'Active':'Inactive'}</span></td><td className="dc-actions"><DiscountActionMenu id={d.id} code={d.code} open={menu===d.id} onOpenChange={setMenu}><button role="menuitem" onClick={()=>edit(d)}><Pencil size={13}/>Edit discount</button><button role="menuitem" onClick={()=>{setDiscounts(items=>items.map(item=>item.id===d.id?{...item,active:!item.active}:item));setMenu(null)}}><Power size={13}/>{d.active?'Deactivate':'Activate'}</button><button role="menuitem" onClick={()=>{navigate(discountNewPath,{state:{duplicate:{...d,id:'',code:`${d.code}_COPY`,uses:0}}})}}><Copy size={13}/>Duplicate</button><button role="menuitem" className="danger" onClick={()=>{setDeleteConfirm(d);setMenu(null)}}><Trash2 size={13}/>Delete discount</button></DiscountActionMenu></td></tr>)}</tbody></table>{rows.length===0&&<div className="dc-empty">No discounts match your filters.<button onClick={()=>{setSearch('');setType('All Types');setStatus('All Status')}}>Clear filters</button></div>}</div>
   <footer className="dc-pagination"><span>Showing {filtered.length?(currentPage-1)*8+1:0} - {Math.min(currentPage*8,filtered.length)} of {filtered.length} discounts</span><nav aria-label="Discount pagination"><button disabled={currentPage===1} aria-label="Previous page" onClick={()=>setPage(currentPage-1)}><ChevronLeft size={12}/></button>{Array.from({length:pages},(_,i)=><button key={i} className={currentPage===i+1?'active':''} aria-current={currentPage===i+1?'page':undefined} onClick={()=>setPage(i+1)}>{i+1}</button>)}<button disabled={currentPage===pages} aria-label="Next page" onClick={()=>setPage(currentPage+1)}><ChevronRight size={12}/></button></nav></footer></div>
   <section className="dc-performance"><div className="dc-chart"><header><h2>Discount Performance</h2><Select label="Performance date range" value={range} options={['Last 30 Days','Last 3 Months','Last 6 Months','Year to Date','Last 12 Months']} onChange={setRange} className="dc-performance-range" buttonClassName="flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 transition-colors"/></header><PerformanceChart range={range}/></div><div className="dc-summary">{[['Total Revenue from Discounts','€12,460','28%'],['Total Orders with Discount','428','32%'],['Average Order Value','€29.12','18%'],['Conversion Rate','6.2%','1.4%']].map(([label,value,growth])=><div key={label}><span>{label}</span><strong>{value}</strong><Growth>{growth}</Growth></div>)}</div></section>
  </section>
 </div>
 {deleteConfirm && createPortal(
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
          <Trash2 size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Discount</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to delete <strong className="text-slate-800">{deleteConfirm.code}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3 w-full">
          <button className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </button>
          <button className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors" onClick={() => {
            setDiscounts(items => items.filter(item => item.id !== deleteConfirm.id));
            setSelected(ids => ids.filter(id => id !== deleteConfirm.id));
            notify('Discount deleted.');
            setDeleteConfirm(null);
          }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
 , document.body)}
  </div></section>
}

function PerformanceChart({range}:{range:string}) {
 const months=range==='Last 3 Months'?['Aug','Sep','Oct']:range==='Last 12 Months'?['Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct']:['May','Jun','Jul','Aug','Sep','Oct'];
 const values=range==='Last 3 Months'?[4000,3300,3800]:range==='Last 12 Months'?[350,500,650,950,1300,2800,4200,4400,3800,5500,3900,4200]:[4200,4400,3800,5500,3300,4200];
 const points=values.map((value,i)=>({x:42+i*410/(values.length-1),y:92-value/6000*78}));
 const path=points.reduce((d,p,i)=>i===0?`M ${p.x} ${p.y}`:`${d} C ${points[i-1].x+(p.x-points[i-1].x)/3} ${points[i-1].y}, ${p.x-(p.x-points[i-1].x)/3} ${p.y}, ${p.x} ${p.y}`,'');
 const [hover,setHover]=React.useState<number|null>(null);
 return <svg viewBox="0 0 470 118" preserveAspectRatio="none" role="img" aria-label={`Discount revenue performance, ${range.toLowerCase()}`}><defs><linearGradient id="discount-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C5CFC" stopOpacity=".2"/><stop offset="100%" stopColor="#7C5CFC" stopOpacity=".025"/></linearGradient></defs>{[0,2000,4000,6000].map(value=><g key={value}><line x1="42" x2="452" y1={92-value/6000*78} y2={92-value/6000*78} stroke="#f0eef6" strokeDasharray="3 3"/><text x="3" y={95-value/6000*78} fill="#83859c" fontSize="8">€{value.toLocaleString('en-US')}</text></g>)}{points.map((p,i)=><g key={months[i]}><line x1={p.x} x2={p.x} y1="14" y2="92" stroke="#f3f1f8"/><text x={p.x} y="112" textAnchor="middle" fill="#72748d" fontSize="8">{months[i]}</text></g>)}<path d={`${path} L 452 92 L 42 92 Z`} fill="url(#discount-chart-fill)"/><path d={path} fill="none" stroke="#7C5CFC" strokeWidth="1.8"/>{points.map((p,i)=><g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}><circle cx={p.x} cy={p.y} r="8" fill="transparent"/><circle cx={p.x} cy={p.y} r="2.5" fill="#7C5CFC"/>{hover===i&&<g><rect x={Math.min(405,Math.max(42,p.x-24))} y={Math.max(0,p.y-23)} width="48" height="17" rx="4" fill="#332265"/><text x={Math.min(429,Math.max(66,p.x))} y={Math.max(12,p.y-11)} textAnchor="middle" fill="white" fontSize="8">€{values[i].toLocaleString('en-US')}</text></g>}</g>)}</svg>
}
