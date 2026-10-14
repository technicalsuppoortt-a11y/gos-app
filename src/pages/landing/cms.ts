import { landingContent, type LandingCopy } from './landing-content';
import { storageGet, storageSet } from '../../utils/browserStorage';
export type LandingCMS = { en: LandingCopy; ar: LandingCopy; bookingUrl:string; loginUrl:string; pricingTitle:{en:string;ar:string}; pricingDescription:{en:string;ar:string}; pricingCTA:{en:string;ar:string}; pricing: { name:string; nameAr:string; monthly:number; annual:number; features:string; featuresAr:string }[]; publishedAt?:string };
export const cmsEvent='gos:landing-published';
export function defaultCMS():LandingCMS { return {en:structuredClone(landingContent.en),ar:structuredClone(landingContent.ar),bookingUrl:'/dashboard/booking',loginUrl:'/login',pricingTitle:{en:'A plan for every stage',ar:'خطة مناسبة لكل مرحلة'},pricingDescription:{en:'Choose the right plan for your business growth.',ar:'اختر الخطة المناسبة لنمو أعمالك.'},pricingCTA:{en:'Get started',ar:'ابدأ الآن'},pricing:[{name:'Starter',nameAr:'البداية',monthly:29,annual:290,features:'CRM · Booking · 3 users',featuresAr:'علاقات العملاء · الحجوزات · ٣ مستخدمين'},{name:'Pro',nameAr:'احترافي',monthly:79,annual:790,features:'All tools · AI · 15 users',featuresAr:'كل الأدوات · الذكاء الاصطناعي · ١٥ مستخدماً'},{name:'Agency',nameAr:'وكالة',monthly:199,annual:1990,features:'White label · 100 users',featuresAr:'علامة تجارية مخصصة · ١٠٠ مستخدم'}]}; }
function matchesShape(value:unknown,base:unknown):boolean {
 if(Array.isArray(base))return Array.isArray(value)&&value.length===base.length&&base.every((item,i)=>matchesShape(value[i],item));
 if(base&&typeof base==='object')return !!value&&typeof value==='object'&&Object.entries(base).every(([key,item])=>matchesShape((value as Record<string,unknown>)[key],item));
 return typeof value===typeof base&&(typeof value!=='number'||Number.isFinite(value));
}
export function readCMS(draft=false):LandingCMS {
 const fallback=defaultCMS(); try { const raw=storageGet(draft?'gos.landing.draft.v1':'gos.landing.published.v1'); if(!raw&&draft)return readCMS();const value={...fallback,...JSON.parse(raw??'null')}; if(matchesShape(value,fallback)&&safeLink(value.bookingUrl)&&safeLink(value.loginUrl)) return value; } catch { /* Use shipped copy. */ } return fallback;
}
export function writeCMS(value:LandingCMS,draft=false) { const saved=storageSet(draft?'gos.landing.draft.v1':'gos.landing.published.v1',JSON.stringify(value)); if(saved&&!draft) window.dispatchEvent(new Event(cmsEvent)); return saved; }
export function safeLink(value:string) { if(typeof value!=='string'||/[\\\s]/.test(value)||Array.from(value).some(c=>c.charCodeAt(0)<32))return false;if(/^\/(?!\/)/.test(value))return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;} }
export function contentLeaves(value:unknown,path:string[]=[]):{path:string[];value:string|number}[] {
 if(typeof value==='string'||typeof value==='number') return ['id','kind','suffix','langLabel','from'].includes(path.at(-1)??'')?[]:[{path,value}];
 if(value&&typeof value==='object') return Object.entries(value).flatMap(([key,item])=>contentLeaves(item,[...path,key])); return [];
}
export function setContentValue(copy:LandingCopy,path:string[],value:string|number):LandingCopy {
 const next=structuredClone(copy); let cursor=next as unknown as Record<string,unknown>;
 for(const key of path.slice(0,-1)) cursor=cursor[key] as Record<string,unknown>; cursor[path.at(-1)!]=value; return next;
}
