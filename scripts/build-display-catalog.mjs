import fs from 'node:fs';
const dictionary = {};
for (const file of fs.readdirSync('src/i18n/locales').filter(f=>f.endsWith('.tsv'))) {
  for (const line of fs.readFileSync(`src/i18n/locales/${file}`,'utf8').split(/\r?\n/).filter(Boolean)) {
    const [english, arabic] = line.split('\t');
    if (!english || !arabic) throw new Error(`Invalid translation: ${line}`);
    dictionary[english] = arabic;
  }
}
fs.writeFileSync('src/i18n/locales/display-ar.json', JSON.stringify(dictionary, null, 2)+'\n');
console.log(`${Object.keys(dictionary).length} reviewed Arabic translations`);
