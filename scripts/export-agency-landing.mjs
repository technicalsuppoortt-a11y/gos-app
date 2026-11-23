import { writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';

// Resolve the app's extensionless TypeScript imports and JSON files when running the builder model in Node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('.json')) {
      const result = nextResolve(specifier, context);
      return { ...result, importAttributes: { ...result.importAttributes, type: 'json' } };
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});

const { buildAgencyLandingAsset } = await import('../src/pages/agency-landing-asset.ts');
const templates = { en: buildAgencyLandingAsset('en'), ar: buildAgencyLandingAsset('ar') };
await writeFile(new URL('../functions/seed-data/agency-landing.json', import.meta.url), `${JSON.stringify(templates)}\n`);
