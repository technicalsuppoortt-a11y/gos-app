import catalog from './locales/display-ar.json';
import patterns from './locales/patterns-ar.json';

const dictionary: Readonly<Record<string, string>> = catalog;
const normalized = new Map(Object.entries(dictionary).filter(([key])=>key.length>1).map(([key,value]) => [key.toLocaleLowerCase('en'),value]));
const actions: Readonly<Record<string,string>> = {
  'add ': 'إضافة ', 'add a ': 'إضافة ', 'add an ': 'إضافة ',
  'create ': 'إنشاء ', 'create a ': 'إنشاء ', 'create an ': 'إنشاء ',
  'edit ': 'تعديل ', 'delete ': 'حذف ', 'remove ': 'إزالة ',
  'duplicate ': 'إنشاء نسخة من ', 'clone ': 'إنشاء نسخة من ',
  'view ': 'عرض ', 'preview ': 'معاينة ', 'save ': 'حفظ ',
  'copy ': 'نسخ ', 'download ': 'تنزيل ', 'upload ': 'رفع ',
  'export ': 'تصدير ', 'import ': 'استيراد ', 'select ': 'اختيار ',
  'select a ': 'اختيار ', 'select an ': 'اختيار ', 'choose ': 'اختيار ',
  'choose a ': 'اختيار ', 'choose an ': 'اختيار ', 'search ': 'البحث عن ',
  'search for ': 'البحث عن ', 'filter by ': 'تصفية حسب ',
  'close ': 'إغلاق ', 'open ': 'فتح ', 'enable ': 'تفعيل ',
  'disable ': 'تعطيل ', 'show ': 'إظهار ', 'hide ': 'إخفاء ',
  'connect ': 'ربط ', 'disconnect ': 'قطع اتصال ', 'manage ': 'إدارة ',
  'update ': 'تحديث ', 'reset ': 'إعادة تعيين ', 'clear ': 'مسح ',
  'publish ': 'نشر ', 'unpublish ': 'إلغاء نشر ',
  'collapse ': 'طي ', 'expand ': 'توسيع ', 'rename ': 'إعادة تسمية ',
};
const sortedActions = Object.keys(actions).sort((a,b)=>b.length-a.length);
const templates=Object.entries(patterns).sort(([a],[b])=>b.replace(/\{\{\d+\}\}/g,'').length-a.replace(/\{\{\d+\}\}/g,'').length).map(([english,arabic])=>{
  const indexes: number[]=[];
  const regex=english.split(/(\{\{\d+\}\})/).map(part=>{
    const index=part.match(/^\{\{(\d+)\}\}$/);
    if(index){indexes.push(Number(index[1]));return '(.*?)';}
    return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }).join('');
  return {regex:new RegExp('^'+regex+'$'),arabic,indexes};
});

/** Limited, reviewed grammatical patterns; no word-by-word machine translation. */
export function resolveDisplayTranslation(text: string): string | undefined {
  const direct = dictionary[text] ?? normalized.get(text.toLocaleLowerCase('en'));
  if (direct !== undefined) return direct;
  const clock=text.match(/^(\d{1,2}:\d{2}) (AM|PM)$/);
  if(clock)return clock[1]+' '+dictionary[clock[2]];
  const decorated=text.match(/^([·•]\s*)(.+)$/);
  if(decorated){const copy=resolveDisplayTranslation(decorated[2]);if(copy)return decorated[1]+copy;}
  for(const template of templates) {
    const match=text.match(template.regex);
    if(!match)continue;
    return template.arabic.replace(/\{\{(\d+)\}\}/g,(_,index)=>{
      const value=match[template.indexes.indexOf(Number(index))+1];
      return dictionary[value]??normalized.get(value.toLocaleLowerCase('en'))??value;
    });
  }
  const punctuation = text.match(/^(.*?)(\s*\*|\s*\(optional\)|\s*\(required\)|[.:!?…]+)$/i);
  if (punctuation) {
    const base = resolveDisplayTranslation(punctuation[1].trim());
    if (base) return base + punctuation[2].replace(/optional/i,'اختياري').replace(/required/i,'مطلوب').replace('?', '؟');
  }
  const lower = text.toLocaleLowerCase('en');
  const labelWithName = text.match(/^(Delete|Remove|Edit|Open|Preview|Duplicate|Rename|Options for|Change domain for) (.+?)(\?)?$/);
  if (labelWithName) {
    const action: Record<string,string> = {Delete:'حذف',Remove:'إزالة',Edit:'تعديل',Open:'فتح',Preview:'معاينة',Duplicate:'إنشاء نسخة من',Rename:'إعادة تسمية','Options for':'خيارات','Change domain for':'تغيير نطاق'};
    const noun = normalized.get(labelWithName[2].toLocaleLowerCase('en')) ?? labelWithName[2];
    return action[labelWithName[1]]+' '+noun+(labelWithName[3]?'؟':'');
  }
  for (const prefix of sortedActions) {
    if (!lower.startsWith(prefix)) continue;
    const noun = normalized.get(lower.slice(prefix.length));
    if (noun) return actions[prefix] + noun;
  }
  const time = text.match(/^(\d+)\s+(min(?:ute)?s?|h(?:ou)?rs?|hours?|days?|weeks?|months?|years?)\s*(ago|before|after)?$/i);
  if (time) {
    const unit = /^(min)/i.test(time[2]) ? 'دقيقة' : /^h/i.test(time[2]) ? 'ساعة' : /^d/i.test(time[2]) ? 'يوم' : /^w/i.test(time[2]) ? 'أسبوع' : /^m/i.test(time[2]) ? 'شهر' : 'عام';
    const plural: Record<string,string>={'دقيقة':'دقائق','ساعة':'ساعات','يوم':'أيام','أسبوع':'أسابيع','شهر':'أشهر','عام':'أعوام'};
    const amount=Number(time[1])%100;
    const prefix = time[3] === 'ago' || time[3] === 'before' ? 'قبل ' : time[3] === 'after' ? 'بعد ' : '';
    return `${prefix}${time[1]} ${amount>=3&&amount<=10?plural[unit]:unit}`;
  }
  const count = text.match(/^([+−\-]?\d[\d,.%]*\s*(?:·|×)?\s*)(.+)$/);
  if (count) {
    const noun = resolveDisplayTranslation(count[2]);
    if (noun) return count[1]+noun;
  }
  const suffixCount = text.match(/^(.+?)(\s*\(\d+\)|\s*·\s*\d[\d,.%]*)$/);
  if (suffixCount) {
    const base = resolveDisplayTranslation(suffixCount[1]);
    if (base) return base+suffixCount[2];
  }
  const shorthand = text.match(/^(\d+)([mhd]) ago$/);
  if (shorthand) return `قبل ${shorthand[1]} ${{m:'دقيقة',h:'ساعة',d:'يوم'}[shorthand[2]]}`;
  const plus = text.match(/^\+\s*(.+)$/);
  if (plus) { const base=resolveDisplayTranslation(plus[1]); if(base) return '+ '+base; }
  const pair = text.split(/\s+(?:&|\/|·)\s+/);
  if (pair.length > 1) {
    const translated = pair.map(resolveDisplayTranslation);
    if (translated.every(Boolean)) return translated.join(text.includes(' & ') ? ' و' : text.includes(' / ') ? ' / ' : ' · ');
  }
  const showing = text.match(/^Showing (\d+)(?:\s*[–-]| to )(\d+) of (\d+)(?: (.+))?$/i);
  if(showing) return `عرض ${showing[1]}–${showing[2]} من ${showing[3]}${showing[4]?' '+(resolveDisplayTranslation(showing[4])??showing[4]):''}`;
  const date = text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})(?:,? (\d{4}))?$/);
  if(date) return `${date[2]} ${normalized.get(date[1].toLowerCase())}${date[3]?' '+date[3]:''}`;
  return undefined;
}
