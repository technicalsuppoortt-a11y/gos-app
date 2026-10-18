import { mkdirSync, writeFileSync } from 'node:fs';
import { MASTER_TEMPLATES } from '../src/pages/system-template-data.ts';
mkdirSync(new URL('../functions/seed-data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../functions/seed-data/template-catalog.json', import.meta.url), JSON.stringify(MASTER_TEMPLATES, null, 2) + '\n');
console.log(`Prepared ${MASTER_TEMPLATES.length} catalog templates for trusted Firestore seeding.`);
