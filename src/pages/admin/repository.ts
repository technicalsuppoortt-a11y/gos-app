import { storageGet, storageSet } from '../../utils/browserStorage';
import { seedRows, type RecordRow } from './catalog';
export function readRows(moduleId:string, tab:number):RecordRow[] {
 try { const value=JSON.parse(storageGet(`gos.admin.v1.${moduleId}.${tab}`)??'null'); if(Array.isArray(value) && value.every(r=>r && typeof r.id==='string' && typeof r.name==='string' && typeof r.status==='string')) return value; } catch { /* Recover to sample records. */ }
 return seedRows(moduleId,tab);
}
export function saveRows(moduleId:string,tab:number,rows:RecordRow[]) { return storageSet(`gos.admin.v1.${moduleId}.${tab}`,JSON.stringify(rows)); }
export function downloadCSV(rows:RecordRow[], filename:string) {
 const keys=Array.from(new Set(rows.flatMap(Object.keys)));
 const cell=(value:string)=>`"${(/^[=+@\-\t\r]/.test(value)?"'":"")+value.replaceAll('"','""')}"`;
 const data=[keys,...rows.map(row=>keys.map(key=>row[key]??''))].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff',data],{type:'text/csv;charset=utf-8'})); const link=document.createElement('a'); link.href=url; link.download=filename; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
