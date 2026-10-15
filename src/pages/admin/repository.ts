import { storageGet, storageSet } from '../../utils/browserStorage';
import { seedRows, type RecordRow } from './catalog';
import { readSystemTemplates, saveSystemTemplates } from './template-library';
// Keep original storage addresses so inserting Leads cannot shift existing CRM data.
function recordKey(moduleId:string,tab:number) {
 if(moduleId==='crm') return tab===0?'gos.admin.v1.leads.0':`gos.admin.v1.crm.${tab-1}`;
 return `gos.admin.v1.${moduleId}.${tab}`;
}
function liveSites(rows:RecordRow[]) { return rows.filter(row=>row.status==='Published' && row.tenant!=='Platform' && !row.category && !!row.domain); }
export function readRows(moduleId:string, tab:number):RecordRow[] {
 if(moduleId==='templates') return readSystemTemplates();
 if(moduleId==='funnels-websites' && tab!==0) return [];
 try { const value=JSON.parse(storageGet(recordKey(moduleId,tab))??'null'); if(Array.isArray(value) && value.every(r=>r && typeof r.id==='string' && typeof r.name==='string' && typeof r.status==='string')) return moduleId==='funnels-websites' && tab===0?liveSites(value):value; } catch { /* Recover to sample records. */ }
 const rows=seedRows(moduleId,tab); return moduleId==='funnels-websites' && tab===0?liveSites(rows):rows;
}
export function saveRows(moduleId:string,tab:number,rows:RecordRow[]) {
 if(moduleId==='booking') return false;
 if(moduleId==='templates') return saveSystemTemplates(rows);
 if(moduleId==='funnels-websites' && tab!==0) return false;
 return storageSet(recordKey(moduleId,tab),JSON.stringify(rows));
}
export function downloadCSV(rows:RecordRow[], filename:string) {
 const keys=Array.from(new Set(rows.flatMap(Object.keys)));
 const cell=(value:string)=>`"${(/^[=+@\-\t\r]/.test(value)?"'":"")+value.replaceAll('"','""')}"`;
 const data=[keys,...rows.map(row=>keys.map(key=>row[key]??''))].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff',data],{type:'text/csv;charset=utf-8'})); const link=document.createElement('a'); link.href=url; link.download=filename; link.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
