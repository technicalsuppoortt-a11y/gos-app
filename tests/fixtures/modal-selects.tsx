import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { useRef, useState } from 'react';
import { store } from '../../src/store';
import { hydrateCRM } from '../../src/store/slices/crmSlice';
import { mainPipeline } from '../../src/pages/crm/model';
import { CRMRouting, type CRMRoute } from '../../src/pages/CRMRouting';
import { BookingSelect } from '../../src/pages/booking/BookingSelect';
import { AssetSelect } from '../../src/pages/AssetControls';
import { CommerceSelect } from '../../src/components/ui/CommerceSelect';
import { Select } from '../../src/components/ui/Select';
import { AdminSelect } from '../../src/pages/admin/AdminSelect';
import { Combobox } from '../../src/components/ui/Combobox';
import { CustomSelect } from '../../src/pages/crm/CRMPrimitives';
import '../../src/pages/crm/crm-workspace.css';
import '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/pages/form-fields.css';
import '../../src/theme-controls.css';
import '../../src/control-polish.css';
store.dispatch(hydrateCRM({leads:[],pipelines:[mainPipeline,{...mainPipeline,id:'sales',name:'Sales pipeline'}]}));
const options=Array.from({length:40},(_,i)=>({value:String(i),label:`Option ${String(i).padStart(2,'0')}`}));
function Controls({prefix}:{prefix:string}) {
 const [value,setValue]=useState('0');
 return <div style={{display:'grid',gap:12}}>
  <AssetSelect label={`${prefix} Asset`} value={value} onChange={setValue} options={options}/>
  <CommerceSelect label={`${prefix} Commerce`} value={value} onChange={setValue} options={options}/>
  <Select label={`${prefix} Shared`} value={value} onChange={setValue} options={options}/>
  <AdminSelect label={`${prefix} Admin`} value={value} onChange={setValue} options={options}/>
  <Combobox label={`${prefix} Search`} searchable value={value} onChange={setValue} options={options}/>
  <CustomSelect aria-label={`${prefix} CRM`} value={value} onChange={setValue} options={options}/>
  <BookingSelect aria-label={`${prefix} Booking`} value={value} onChange={event=>setValue(event.target.value)}>{options.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</BookingSelect>
 </div>;
}
function Fixture() {
 const [routing,setRouting]=useState<CRMRoute>({});
 const native=useRef<HTMLDialogElement>(null);
 return <div className="layout-dashboard-shell"><div className="form-modal-overlay"><div className="form-modal-dialog" role="dialog" aria-label="CRM routing modal">
  <div className="form-modal-header"><h2>CRM & Lead Stage Routing</h2><button onClick={()=>document.documentElement.classList.toggle('dark')}>Toggle theme</button></div>
  <div className="form-modal-body" style={{maxHeight:300,overflow:'auto'}}><CRMRouting value={routing} onChange={setRouting}/><Controls prefix="Modal"/></div>
  <div className="form-modal-footer"><output data-testid="route">{JSON.stringify(routing)}</output><button onClick={()=>native.current?.showModal()}>Native dialog</button></div>
 </div></div><dialog ref={native} style={{width:500,maxHeight:'80vh',overflow:'hidden',borderRadius:14,padding:24}}><h2>Native modal</h2><div style={{maxHeight:250,overflow:'auto'}}><Controls prefix="Native"/></div><button onClick={()=>native.current?.close()}>Close native</button></dialog></div>;
}
createRoot(document.getElementById('root')!).render(<Provider store={store}><Fixture/></Provider>);
