import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import { BookingSelect } from './BookingSelect';
import type { Dispatch, SetStateAction } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { BookingPage } from './model';

export function InviteeFields({ page, answers, setAnswers, guests, setGuests }: {
  page: BookingPage; answers: Record<string,string>; setAnswers:Dispatch<SetStateAction<Record<string,string>>>;
  guests:{name:string;email:string}[]; setGuests:Dispatch<SetStateAction<{name:string;email:string}[]>>;
}) {
  useUILanguage();
  const answer=(id:string,value:string)=>setAnswers(a=>({...a,[id]:value}));
  const guestField=(id:string)=>page.formSettings.guestDetails.find(g=>g.id===id);
  return <>
    {localizeNode(page.questions.filter(q=>q.active!==false).map(q=>{
      if(q.type==='text-block')return <section className="bk-public-text-block" key={q.id}><h3>{localizeNode(q.label)}</h3><p>{localizeNode(q.text)}</p></section>;
      if(q.id==='name'&&page.formSettings.nameType==='firstlast')return <div className="bk-form-grid" key={q.id}>{localizeNode((['firstName','lastName'] as const).map(key=><label key={key}>{localizeNode(key==='firstName'?page.formSettings.firstNameLabel:page.formSettings.lastNameLabel)} *<input required value={answers[key]||''} onChange={e=>setAnswers(a=>{const next={...a,[key]:e.target.value};return {...next,name:[next.firstName,next.lastName].filter(Boolean).join(' ')}})}/></label>))}</div>;
      return <div className={q.type==='textarea'||q.type==='radio'?'bk-question-wide':undefined} key={q.id}><label htmlFor={'question-'+q.id}>{localizeNode(q.label)}{localizeNode(q.required&&<span className="bk-required"> *</span>)}</label>{localizeNode(q.type==='textarea'?<textarea id={'question-'+q.id} required={q.required} value={answers[q.id]||''} onChange={e=>answer(q.id,e.target.value)}/>:q.type==='select'?<BookingSelect id={'question-'+q.id} required={q.required} value={answers[q.id]||''} onChange={e=>answer(q.id,e.target.value)}><option value="">{translateText("Select an option")}</option>{localizeNode(q.options.map(o=><option key={o} value={o}>{localizeNode(o)}</option>))}</BookingSelect>:q.type==='radio'?<div className="bk-radio-options" role="radiogroup" aria-label={translateText(q.label)}>{localizeNode(q.options.map(o=><label key={o}><input type="radio" name={q.id} required={q.required} checked={answers[q.id]===o} onChange={()=>answer(q.id,o)}/>{localizeNode(o)}</label>))}</div>:<input id={'question-'+q.id} type={q.type} required={q.required} value={answers[q.id]||''} onChange={e=>answer(q.id,e.target.value)}/>)}</div>;
    }))}
    {page.formSettings.guestsActive&&<section className="bk-public-guests"><div className="bk-question-footer"><label>{localizeNode(page.formSettings.guestsLabel)}{localizeNode(page.formSettings.guestsRequired&&' *')}</label>{localizeNode(page.formSettings.guestsShowCounter&&<span className="bk-count">{localizeNode(guests.length)}</span>)}</div>{guests.map((g,index)=><div className="bk-guest" key={index}>{localizeNode(guestField('name')?.active&&<label>{localizeNode(guestField('name')!.label)}<input required={guestField('name')!.required} value={g.name} onChange={e=>setGuests(list=>list.map((v,i)=>i===index?{...v,name:e.target.value}:v))}/></label>)}{guestField('email')?.active&&<label>{localizeNode(guestField('email')!.label)}<input type="email" required={guestField('email')!.required} value={g.email} onChange={e=>setGuests(list=>list.map((v,i)=>i===index?{...v,email:e.target.value}:v))}/></label>}<button className="bk-icon danger" type="button" aria-label={translateText("Remove guest")} onClick={()=>setGuests(list=>list.filter((_,i)=>i!==index))}><Trash2 size={14}/></button></div>)}<button className="bk-button" type="button" onClick={()=>setGuests(list=>[...list,{name:'',email:''}])}><Plus size={14}/>{translateText("Add guest")}</button></section>}
  </>;
}

