import fs from 'node:fs';

const LOCALE_TARGETS = [
  { lang: 'ar', label: 'Arabic' },
  { lang: 'nl', label: 'Dutch' },
  { lang: 'de', label: 'German' },
];

for (const { lang, label } of LOCALE_TARGETS) {
  const suffix = `-${lang}.tsv`;
  const files = fs
    .readdirSync('src/i18n/locales')
    .filter(f => f.endsWith(suffix))
    .sort();
  if (!files.length) continue;
  const dictionary = {};
  for (const file of files) {
    for (const line of fs.readFileSync(`src/i18n/locales/${file}`, 'utf8').split(/\r?\n/).filter(Boolean)) {
      const tabIdx = line.indexOf('\t');
      if (tabIdx <= 0) throw new Error(`Invalid ${label} translation in ${file}: ${line}`);
      const english = line.slice(0, tabIdx);
      const translated = line.slice(tabIdx + 1);
      if (!english || !translated) throw new Error(`Invalid ${label} translation in ${file}: ${line}`);
      dictionary[english] = translated;
    }
  }
  fs.writeFileSync(`src/i18n/locales/display-${lang}.json`, JSON.stringify(dictionary, null, 2) + '\n');
  console.log(`${Object.keys(dictionary).length} reviewed ${label} (${lang}) translations`);
}
