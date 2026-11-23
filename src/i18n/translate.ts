import catalogAr from './locales/display-ar.json';
import patternsAr from './locales/patterns-ar.json';
import catalogNl from './locales/display-nl.json';
import patternsNl from './locales/patterns-nl.json';
import catalogDe from './locales/display-de.json';
import patternsDe from './locales/patterns-de.json';

export type TranslatedLocale = 'ar' | 'nl' | 'de';

interface CompiledPattern {
  regex: RegExp;
  target: string;
  indexes: number[];
}

interface LocaleBundle {
  dictionary: Readonly<Record<string, string>>;
  normalized: Map<string, string>;
  patterns: Readonly<Record<string, string>>;
  templates: CompiledPattern[];
}

function compileTemplates(patterns: Readonly<Record<string, string>>): CompiledPattern[] {
  return Object.entries(patterns)
    .sort(([a], [b]) => b.replace(/\{\{\d+\}\}/g, '').length - a.replace(/\{\{\d+\}\}/g, '').length)
    .map(([english, target]) => {
      const indexes: number[] = [];
      const regex = english
        .split(/(\{\{\d+\}\})/)
        .map(part => {
          const index = part.match(/^\{\{(\d+)\}\}$/);
          if (index) {
            indexes.push(Number(index[1]));
            return '(.*?)';
          }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('');
      return { regex: new RegExp('^' + regex + '$'), target, indexes };
    });
}

function createBundle(
  dictionary: Readonly<Record<string, string>>,
  patterns: Readonly<Record<string, string>>,
): LocaleBundle {
  const normalized = new Map(
    Object.entries(dictionary)
      .filter(([key]) => key.length > 1)
      .map(([key, value]) => [key.toLocaleLowerCase('en'), value]),
  );
  return {
    dictionary,
    normalized,
    patterns,
    templates: compileTemplates(patterns),
  };
}

const bundles: Readonly<Record<TranslatedLocale, LocaleBundle>> = {
  ar: createBundle(catalogAr, patternsAr),
  nl: createBundle(catalogNl, patternsNl),
  de: createBundle(catalogDe, patternsDe),
};

const arActions: Readonly<Record<string, string>> = {
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

const nlVerbSuffixes: Readonly<Record<string, { prefix?: string; suffix?: string }>> = {
  'add a ': { suffix: ' toevoegen' }, 'add an ': { suffix: ' toevoegen' }, 'add ': { suffix: ' toevoegen' },
  'create a ': { suffix: ' aanmaken' }, 'create an ': { suffix: ' aanmaken' }, 'create ': { suffix: ' aanmaken' },
  'edit ': { suffix: ' bewerken' }, 'delete ': { suffix: ' verwijderen' }, 'remove ': { suffix: ' verwijderen' },
  'duplicate ': { suffix: ' dupliceren' }, 'clone ': { suffix: ' klonen' },
  'view ': { suffix: ' bekijken' }, 'preview ': { prefix: 'Voorbeeld van ' }, 'save ': { suffix: ' opslaan' },
  'copy ': { suffix: ' kopiëren' }, 'download ': { suffix: ' downloaden' }, 'upload ': { suffix: ' uploaden' },
  'export ': { suffix: ' exporteren' }, 'import ': { suffix: ' importeren' },
  'select a ': { prefix: 'Selecteer een ' }, 'select an ': { prefix: 'Selecteer een ' }, 'select ': { prefix: 'Selecteer ' },
  'choose a ': { prefix: 'Kies een ' }, 'choose an ': { prefix: 'Kies een ' }, 'choose ': { prefix: 'Kies ' },
  'search for ': { prefix: 'Zoeken naar ' }, 'search ': { prefix: 'Zoek ' },
  'filter by ': { prefix: 'Filteren op ' },
  'close ': { suffix: ' sluiten' }, 'open ': { suffix: ' openen' },
  'enable ': { suffix: ' inschakelen' }, 'disable ': { suffix: ' uitschakelen' },
  'show ': { suffix: ' tonen' }, 'hide ': { suffix: ' verbergen' },
  'connect ': { suffix: ' koppelen' }, 'disconnect ': { suffix: ' ontkoppelen' },
  'manage ': { suffix: ' beheren' }, 'update ': { suffix: ' bijwerken' },
  'reset ': { suffix: ' herstellen' }, 'clear ': { suffix: ' wissen' },
  'publish ': { suffix: ' publiceren' }, 'unpublish ': { prefix: 'Publicatie ongedaan maken van ' },
  'collapse ': { suffix: ' inklappen' }, 'expand ': { suffix: ' uitklappen' }, 'rename ': { suffix: ' hernoemen' },
};

const deVerbSuffixes: Readonly<Record<string, { prefix?: string; suffix?: string }>> = {
  'add a ': { suffix: ' hinzufügen' }, 'add an ': { suffix: ' hinzufügen' }, 'add ': { suffix: ' hinzufügen' },
  'create a ': { suffix: ' erstellen' }, 'create an ': { suffix: ' erstellen' }, 'create ': { suffix: ' erstellen' },
  'edit ': { suffix: ' bearbeiten' }, 'delete ': { suffix: ' löschen' }, 'remove ': { suffix: ' entfernen' },
  'duplicate ': { suffix: ' duplizieren' }, 'clone ': { suffix: ' klonen' },
  'view ': { suffix: ' anzeigen' }, 'preview ': { prefix: 'Vorschau: ' }, 'save ': { suffix: ' speichern' },
  'copy ': { suffix: ' kopieren' }, 'download ': { suffix: ' herunterladen' }, 'upload ': { suffix: ' hochladen' },
  'export ': { suffix: ' exportieren' }, 'import ': { suffix: ' importieren' },
  'select a ': { suffix: ' auswählen' }, 'select an ': { suffix: ' auswählen' }, 'select ': { suffix: ' auswählen' },
  'choose a ': { suffix: ' auswählen' }, 'choose an ': { suffix: ' auswählen' }, 'choose ': { suffix: ' auswählen' },
  'search for ': { prefix: 'Suche nach ' }, 'search ': { suffix: ' suchen' },
  'filter by ': { prefix: 'Filtern nach ' },
  'close ': { suffix: ' schließen' }, 'open ': { suffix: ' öffnen' },
  'enable ': { suffix: ' aktivieren' }, 'disable ': { suffix: ' deaktivieren' },
  'show ': { suffix: ' anzeigen' }, 'hide ': { suffix: ' ausblenden' },
  'connect ': { suffix: ' verbinden' }, 'disconnect ': { suffix: ' trennen' },
  'manage ': { suffix: ' verwalten' }, 'update ': { suffix: ' aktualisieren' },
  'reset ': { suffix: ' zurücksetzen' }, 'clear ': { suffix: ' leeren' },
  'publish ': { suffix: ' veröffentlichen' }, 'unpublish ': { suffix: ' zurückziehen' },
  'collapse ': { suffix: ' einklappen' }, 'expand ': { suffix: ' ausklappen' }, 'rename ': { suffix: ' umbenennen' },
};

const sortedArActions = Object.keys(arActions).sort((a, b) => b.length - a.length);
const sortedNlActions = Object.keys(nlVerbSuffixes).sort((a, b) => b.length - a.length);
const sortedDeActions = Object.keys(deVerbSuffixes).sort((a, b) => b.length - a.length);

const MONTHS_NL: Readonly<Record<string, string>> = {
  jan: 'jan.', feb: 'feb.', mar: 'mrt.', apr: 'apr.', may: 'mei', jun: 'jun.',
  jul: 'jul.', aug: 'aug.', sep: 'sep.', oct: 'okt.', nov: 'nov.', dec: 'dec.',
};
const MONTHS_DE: Readonly<Record<string, string>> = {
  jan: 'Jan.', feb: 'Feb.', mar: 'Mär.', apr: 'Apr.', may: 'Mai', jun: 'Jun.',
  jul: 'Jul.', aug: 'Aug.', sep: 'Sep.', oct: 'Okt.', nov: 'Nov.', dec: 'Dez.',
};

const CURRENCY_CODE_OR_AMOUNT_RE = /^(?:≈\s*)?(?:[+−\-]?\s*)?(?:[$€£]|USD|EUR|EGP|GBP|AED|SAR|KWD|QAR|BHD|OMR|JOD|LBP|MAD|TND|DZD|IQD)(?:\s*[\d,.]+(?:[KMB])?(?:\s*\([^)]+\))?)?$/i;

export function resolveTranslatedLocale(language?: string): TranslatedLocale | null {
  if (!language) return null;
  const lower = language.toLowerCase();
  if (lower.startsWith('ar')) return 'ar';
  if (lower.startsWith('nl')) return 'nl';
  if (lower.startsWith('de')) return 'de';
  return null;
}

export function resolvePatternTemplate(message: string, language: string): string {
  const locale = resolveTranslatedLocale(language);
  if (!locale) return message;
  return bundles[locale].patterns[message] ?? message;
}

function capitalizeIfNeeded(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Limited, reviewed grammatical patterns; no word-by-word machine translation. */
export function resolveDisplayTranslation(text: string, language: string = 'ar'): string | undefined {
  const locale = resolveTranslatedLocale(language);
  if (!locale) return undefined;

  if (CURRENCY_CODE_OR_AMOUNT_RE.test(text.trim()) || /^[+−\-]?\d[\d,.]*(?:[KMB%])?$/i.test(text.trim())) {
    return undefined;
  }

  const { dictionary, normalized, templates } = bundles[locale];
  const direct = dictionary[text] ?? normalized.get(text.toLocaleLowerCase('en'));
  if (direct !== undefined) return direct;

  const clock = text.match(/^(\d{1,2}:\d{2}) (AM|PM)$/);
  if (clock) {
    const period = dictionary[clock[2]] ?? clock[2];
    return `${clock[1]} ${period}`;
  }

  const decorated = text.match(/^([·•←→↗]\s*)(.+)$/);
  if (decorated) {
    const copy = resolveDisplayTranslation(decorated[2], locale);
    if (copy) return decorated[1] + copy;
  }

  for (const template of templates) {
    const match = text.match(template.regex);
    if (!match) continue;
    return template.target.replace(/\{\{(\d+)\}\}/g, (_, index) => {
      const value = match[template.indexes.indexOf(Number(index)) + 1];
      return (
        dictionary[value] ??
        normalized.get(value.toLocaleLowerCase('en')) ??
        (value && value !== text ? resolveDisplayTranslation(value, locale) : undefined) ??
        value
      );
    });
  }

  const punctuation = text.match(/^(.*?)(\s*\*|\s*\(optional\)|\s*\(required\)|[.:!?…]+)$/i);
  if (punctuation) {
    const base = resolveDisplayTranslation(punctuation[1].trim(), locale);
    if (base) {
      if (locale === 'ar') {
        return base + punctuation[2].replace(/optional/i, 'اختياري').replace(/required/i, 'مطلوب').replace('?', '؟');
      }
      if (locale === 'nl') {
        return base + punctuation[2].replace(/optional/i, 'optioneel').replace(/required/i, 'verplicht');
      }
      return base + punctuation[2].replace(/optional/i, 'optional').replace(/required/i, 'erforderlich');
    }
  }

  const lower = text.toLocaleLowerCase('en');
  const labelWithName = text.match(/^(Delete|Remove|Edit|Open|Preview|Duplicate|Rename|Options for|Change domain for) (.+?)(\?)?$/);
  if (labelWithName) {
    const rawNoun = labelWithName[2];
    const noun = normalized.get(rawNoun.toLocaleLowerCase('en')) ?? rawNoun;
    const q = labelWithName[3] ? (locale === 'ar' ? '؟' : '?') : '';
    if (locale === 'ar') {
      const action: Record<string, string> = {
        Delete: 'حذف', Remove: 'إزالة', Edit: 'تعديل', Open: 'فتح',
        Preview: 'معاينة', Duplicate: 'إنشاء نسخة من', Rename: 'إعادة تسمية',
        'Options for': 'خيارات', 'Change domain for': 'تغيير نطاق',
      };
      return `${action[labelWithName[1]]} ${noun}${q}`;
    }
    if (locale === 'nl') {
      const nlMap: Record<string, (n: string) => string> = {
        Delete: n => `${capitalizeIfNeeded(n)} verwijderen`,
        Remove: n => `${capitalizeIfNeeded(n)} verwijderen`,
        Edit: n => `${capitalizeIfNeeded(n)} bewerken`,
        Open: n => `${capitalizeIfNeeded(n)} openen`,
        Preview: n => `Voorbeeld van ${n}`,
        Duplicate: n => `${capitalizeIfNeeded(n)} dupliceren`,
        Rename: n => `${capitalizeIfNeeded(n)} hernoemen`,
        'Options for': n => `Opties voor ${n}`,
        'Change domain for': n => `Domein wijzigen voor ${n}`,
      };
      return `${nlMap[labelWithName[1]](noun)}${q}`;
    }
    const deMap: Record<string, (n: string) => string> = {
      Delete: n => `${capitalizeIfNeeded(n)} löschen`,
      Remove: n => `${capitalizeIfNeeded(n)} entfernen`,
      Edit: n => `${capitalizeIfNeeded(n)} bearbeiten`,
      Open: n => `${capitalizeIfNeeded(n)} öffnen`,
      Preview: n => `Vorschau von ${n}`,
      Duplicate: n => `${capitalizeIfNeeded(n)} duplizieren`,
      Rename: n => `${capitalizeIfNeeded(n)} umbenennen`,
      'Options for': n => `Optionen für ${n}`,
      'Change domain for': n => `Domain ändern für ${n}`,
    };
    return `${deMap[labelWithName[1]](noun)}${q}`;
  }

  if (locale === 'ar') {
    for (const prefix of sortedArActions) {
      if (!lower.startsWith(prefix)) continue;
      const noun = normalized.get(lower.slice(prefix.length));
      if (noun) return arActions[prefix] + noun;
    }
  } else if (locale === 'nl') {
    for (const prefix of sortedNlActions) {
      if (!lower.startsWith(prefix)) continue;
      const noun = normalized.get(lower.slice(prefix.length));
      if (!noun) continue;
      const rule = nlVerbSuffixes[prefix];
      return rule.prefix ? `${rule.prefix}${noun.toLowerCase()}` : `${capitalizeIfNeeded(noun)}${rule.suffix ?? ''}`;
    }
  } else {
    for (const prefix of sortedDeActions) {
      if (!lower.startsWith(prefix)) continue;
      const noun = normalized.get(lower.slice(prefix.length));
      if (!noun) continue;
      const rule = deVerbSuffixes[prefix];
      return rule.prefix ? `${rule.prefix}${noun}` : `${capitalizeIfNeeded(noun)}${rule.suffix ?? ''}`;
    }
  }

  const time = text.match(/^(\d+)\s+(min(?:ute)?s?|h(?:ou)?rs?|hours?|days?|weeks?|months?|years?)\s*(ago|before|after)?$/i);
  if (time) {
    const n = Number(time[1]);
    if (locale === 'ar') {
      const unit = /^(min)/i.test(time[2]) ? 'دقيقة' : /^h/i.test(time[2]) ? 'ساعة' : /^d/i.test(time[2]) ? 'يوم' : /^w/i.test(time[2]) ? 'أسبوع' : /^m/i.test(time[2]) ? 'شهر' : 'عام';
      const plural: Record<string, string> = { 'دقيقة': 'دقائق', 'ساعة': 'ساعات', 'يوم': 'أيام', 'أسبوع': 'أسابيع', 'شهر': 'أشهر', 'عام': 'أعوام' };
      const amount = n % 100;
      const prefix = time[3] === 'ago' || time[3] === 'before' ? 'قبل ' : time[3] === 'after' ? 'بعد ' : '';
      return `${prefix}${time[1]} ${amount >= 3 && amount <= 10 ? plural[unit] : unit}`;
    }
    if (locale === 'nl') {
      const shortMin = /^min(s)?$/i.test(time[2]);
      const unit = shortMin ? 'min' : /^min/i.test(time[2]) ? (n === 1 ? 'minuut' : 'minuten')
        : /^h/i.test(time[2]) ? 'uur'
        : /^d/i.test(time[2]) ? (n === 1 ? 'dag' : 'dagen')
        : /^w/i.test(time[2]) ? (n === 1 ? 'week' : 'weken')
        : /^m/i.test(time[2]) ? (n === 1 ? 'maand' : 'maanden')
        : (n === 1 ? 'jaar' : 'jaren');
      if (time[3]?.toLowerCase() === 'ago') return `${time[1]} ${unit} geleden`;
      if (time[3]?.toLowerCase() === 'before') return `${time[1]} ${unit} ervoor`;
      if (time[3]?.toLowerCase() === 'after') return `${time[1]} ${unit} erna`;
      return `${time[1]} ${unit}`;
    }
    const shortMin = /^min(s)?$/i.test(time[2]);
    const isAgoOrBeforeOrAfter = Boolean(time[3]);
    const unit = shortMin ? 'Min.' : /^min/i.test(time[2]) ? (n === 1 ? 'Minute' : 'Minuten')
      : /^h/i.test(time[2]) ? (n === 1 ? 'Stunde' : 'Stunden')
      : /^d/i.test(time[2]) ? (n === 1 ? 'Tag' : isAgoOrBeforeOrAfter ? 'Tagen' : 'Tage')
      : /^w/i.test(time[2]) ? (n === 1 ? 'Woche' : 'Wochen')
      : /^m/i.test(time[2]) ? (n === 1 ? 'Monat' : isAgoOrBeforeOrAfter ? 'Monaten' : 'Monate')
      : (n === 1 ? 'Jahr' : isAgoOrBeforeOrAfter ? 'Jahren' : 'Jahre');
    if (time[3]?.toLowerCase() === 'ago') return `vor ${time[1]} ${unit}`;
    if (time[3]?.toLowerCase() === 'before') return `${time[1]} ${unit} vorher`;
    if (time[3]?.toLowerCase() === 'after') return `${time[1]} ${unit} danach`;
    return `${time[1]} ${unit}`;
  }

  const count = text.match(/^([+−\-]?\d[\d,.%]*\s*(?:·|×)?\s*)(.+)$/);
  if (count) {
    const noun = resolveDisplayTranslation(count[2], locale);
    if (noun) return count[1] + noun;
  }

  const suffixCount = text.match(/^(.+?)(\s*\(\d+\)|\s*·\s*\d[\d,.%]*)$/);
  if (suffixCount) {
    const base = resolveDisplayTranslation(suffixCount[1], locale);
    if (base) return base + suffixCount[2];
  }

  const shorthand = text.match(/^(\d+)([mhd]) ago$/);
  if (shorthand) {
    if (locale === 'ar') return `قبل ${shorthand[1]} ${{ m: 'دقيقة', h: 'ساعة', d: 'يوم' }[shorthand[2]]}`;
    if (locale === 'nl') return `${shorthand[1]}${{ m: 'm', h: 'u', d: 'd' }[shorthand[2]]} geleden`;
    return `vor ${shorthand[1]} ${{ m: 'Min.', h: 'Std.', d: 'T.' }[shorthand[2]]}`;
  }

  const plus = text.match(/^\+\s*(.+)$/);
  if (plus) {
    const base = resolveDisplayTranslation(plus[1], locale);
    if (base) return '+ ' + base;
  }

  const pair = text.split(/\s+(?:&|\/|·)\s+/);
  if (pair.length > 1) {
    const translated = pair.map(part => resolveDisplayTranslation(part, locale));
    if (translated.every(Boolean)) {
      const andSep = locale === 'ar' ? ' و' : locale === 'nl' ? ' & ' : ' & ';
      return translated.join(text.includes(' & ') ? andSep : text.includes(' / ') ? ' / ' : ' · ');
    }
  }

  const showing = text.match(/^Showing (\d+)(?:\s*[–-]| to )(\d+) of (\d+)(?: (.+))?$/i);
  if (showing) {
    const tail = showing[4] ? ' ' + (resolveDisplayTranslation(showing[4], locale) ?? showing[4]) : '';
    if (locale === 'ar') return `عرض ${showing[1]}–${showing[2]} من ${showing[3]}${tail}`;
    if (locale === 'nl') return `${showing[1]}–${showing[2]} van ${showing[3]}${tail} weergegeven`;
    return `${showing[1]}–${showing[2]} von ${showing[3]}${tail} angezeigt`;
  }

  const date = text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})(?:,? (\d{4}))?$/);
  if (date) {
    const mKey = date[1].toLowerCase();
    if (locale === 'ar') {
      const month = normalized.get(mKey) ?? date[1];
      return `${date[2]} ${month}${date[3] ? ' ' + date[3] : ''}`;
    }
    if (locale === 'nl') {
      return `${date[2]} ${MONTHS_NL[mKey] ?? date[1]}${date[3] ? ' ' + date[3] : ''}`;
    }
    return `${date[2]}. ${MONTHS_DE[mKey] ?? date[1]}${date[3] ? ' ' + date[3] : ''}`;
  }

  if (locale === 'nl' || locale === 'de') {
    const trial = text.match(/^(\d+)-day free trial$/i);
    if (trial) return locale === 'nl' ? `${trial[1]} dagen gratis proefperiode` : `${trial[1]}-tägige kostenlose Testphase`;

    const forDays = text.match(/^for (\d+) days$/i);
    if (forDays) return locale === 'nl' ? `voor ${forDays[1]} dagen` : `für ${forDays[1]} Tage`;

    const payWallet = text.match(/^Pay (\S+) from Wallet$/i);
    if (payWallet) return locale === 'nl' ? `Betaal ${payWallet[1]} vanuit portemonnee` : `${payWallet[1]} aus Guthaben bezahlen`;

    const maxCredits = text.match(/^Maximum is ([\d,]+) credits \(([^)]+)\)\.?$/i);
    if (maxCredits) return locale === 'nl' ? `Maximum is ${maxCredits[1]} tegoed (${maxCredits[2]}).` : `Maximum beträgt ${maxCredits[1]} Guthaben (${maxCredits[2]}).`;

    const cfgSaved = text.match(/^Configuration for (.+) saved successfully\.$/);
    if (cfgSaved) {
      const name = resolveDisplayTranslation(cfgSaved[1], locale) ?? cfgSaved[1];
      return locale === 'nl' ? `Configuratie voor ${name} succesvol opgeslagen.` : `Konfiguration für ${name} erfolgreich gespeichert.`;
    }

    const globalToggle = text.match(/^(.+) (disabled|activated) globally across all tenants\.$/);
    if (globalToggle) {
      const name = resolveDisplayTranslation(globalToggle[1], locale) ?? globalToggle[1];
      if (locale === 'nl') return `${name} wereldwijd ${globalToggle[2] === 'disabled' ? 'uitgeschakeld' : 'geactiveerd'} voor alle werkruimten.`;
      return `${name} global für alle Arbeitsbereiche ${globalToggle[2] === 'disabled' ? 'deaktiviert' : 'aktiviert'}.`;
    }

    const prevNext = text.match(/^(Previous|Next): (.+)$/);
    if (prevNext) {
      const label = resolveDisplayTranslation(prevNext[2], locale) ?? prevNext[2];
      if (locale === 'nl') return `${prevNext[1] === 'Previous' ? 'Vorige' : 'Volgende'}: ${label}`;
      return `${prevNext[1] === 'Previous' ? 'Zurück' : 'Weiter'}: ${label}`;
    }

    const copied = text.match(/^Copied (.+)$/);
    if (copied) return locale === 'nl' ? `${copied[1]} gekopieerd` : `${copied[1]} kopiert`;

    const vsPrev = text.match(/^(.+) vs previous (period|cycle)$/i);
    if (vsPrev) {
      if (locale === 'nl') return `${vsPrev[1]} t.o.v. vorige ${vsPrev[2].toLowerCase() === 'cycle' ? 'cyclus' : 'periode'}`;
      return `${vsPrev[1]} ggü. vorherigem ${vsPrev[2].toLowerCase() === 'cycle' ? 'Zyklus' : 'Zeitraum'}`;
    }

    const speedDiff = text.match(/^(.+) (faster|slower)$/i);
    if (speedDiff) {
      if (locale === 'nl') return `${speedDiff[1]} ${speedDiff[2].toLowerCase() === 'faster' ? 'sneller' : 'langzamer'}`;
      return `${speedDiff[1]} ${speedDiff[2].toLowerCase() === 'faster' ? 'schneller' : 'langsamer'}`;
    }
  }

  return undefined;
}
