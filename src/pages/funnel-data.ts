import type { Asset } from './asset-model';
export type FunnelRange = { start: string; end: string };
export function rangeFor(days: number): FunnelRange {
 const end=new Date().toISOString().slice(0,10), start=new Date(end+'T00:00:00Z');
 start.setUTCDate(start.getUTCDate()-days+1); return {start:start.toISOString().slice(0,10),end};
}
export function sampleSeries(asset: Asset, range: FunnelRange) {
 const start=Date.parse(range.start+'T00:00:00Z'),end=Date.parse(range.end+'T00:00:00Z');
 const days=Math.min(366,Math.max(1,Math.round((end-start)/86400000)+1));
 const seed=Array.from(asset.id).reduce((sum,char)=>sum+char.charCodeAt(0),0);
 return Array.from({length:days},(_,index)=>{const day=new Date(start+index*86400000),ordinal=Math.floor(day.getTime()/86400000),views=86+(ordinal*19+seed*7)%99;
 return {date:day.toISOString().slice(0,10),views,conversions:Math.round(views*(.19+((ordinal+seed)%9)/100))};});
}
export function sampleLeads(asset: Asset) {
 const names=['Sarah Mitchell','Omar Hassan','Emma Wilson','Youssef Ahmed','Alex Morgan','Nour Khaled','Daniel Brooks','Maya Ibrahim','James Carter','Lina Farouk','Sophie Taylor','Adam Salem'];
 return names.map((name,index)=>({id:asset.id+'-lead-'+index,name,email:name.toLowerCase().replace(' ','.')+'@example.com',phone:'+20 100 555 '+String(1000+index),step:asset.document.pages.find(page=>page.sections.some(section=>section.type==='Form'))?.name??asset.document.pages[0]?.name??'Landing Page',source:['Meta Ads','Organic Search','Direct','Referral'][index%4],date:rangeFor(index+1).start,tag:['New lead','Qualified','Booked'][index%3]}));
}
export function downloadLeads(rows: ReturnType<typeof sampleLeads>,assetId:string) {
 const cell=(value:string)=>'"'+(/^[\s]*[=+@-]/.test(value)?"'":'')+value.replaceAll('"','""')+'"';
 const csv='\uFEFF'+[['Name','Email','Phone','Step Captured','Source','Date','Tag'],...rows.map(row=>[row.name,row.email,row.phone,row.step,row.source,row.date,row.tag])].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
 link.href=url;link.download=assetId+'-sample-leads.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
