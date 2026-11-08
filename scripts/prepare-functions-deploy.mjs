import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const featureNames = ['DEPLOY_COPILOT', 'ENABLE_GOS_METERING_BRIDGE', 'ENABLE_OUTBOX', 'ENABLE_META_WEBHOOK'];

export function deploymentFeatures(...sources) {
  const env = Object.assign({}, ...sources);
  return Object.fromEntries(featureNames.map(name => {
    const value = env[name] ?? 'false';
    if (value !== 'true' && value !== 'false') throw new Error(`${name} must be true or false in the Functions dotenv file.`);
    return [name, value];
  }));
}

export async function readDeploymentFeatures(source, projectId) {
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId || '')) throw new Error('A Firebase project ID is required to prepare Functions.');
  const readEnv = async name => {
    try { return parseEnv(await readFile(path.join(source, name), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
  };
  // Only non-secret export switches enter discovery. The CLI supplies runtime
  // dotenv values later; neither provider keys nor credentials go in the manifest.
  return deploymentFeatures(await readEnv('.env'), await readEnv(`.env.${projectId}`));
}

export async function prepareFunctionsDeploy(projectId) {
  const source = path.join(root, 'functions');
  const manifestPath = path.join(source, 'functions.yaml');
  const temporaryPath = path.join(source, `.functions-manifest-${process.pid}.json`);
  // A failed analysis must never leave an old manifest available for deployment.
  await rm(manifestPath, { force: true });
  const features = await readDeploymentFeatures(source, projectId);
  const sdkPackagePath = path.join(source, 'node_modules/firebase-functions/package.json');
  const sdk = JSON.parse(await readFile(sdkPackagePath, 'utf8'));
  const binary = path.resolve(path.dirname(sdkPackagePath), sdk.bin['firebase-functions']);
  console.log(`Preparing Functions for ${projectId} (Copilot ${features.DEPLOY_COPILOT === 'true' ? 'enabled' : 'disabled'})…`);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [binary, source], {
        cwd: source, stdio: 'inherit', timeout: 180_000,
        env: { ...process.env, ...features, GCLOUD_PROJECT: projectId,
          FIREBASE_CONFIG: JSON.stringify({ projectId }),
          FUNCTIONS_CONTROL_API: 'true', FUNCTIONS_MANIFEST_OUTPUT_PATH: temporaryPath },
      });
      child.once('error', reject);
      child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Functions analysis failed (${signal || code}).`)));
    });
    const manifest = JSON.parse(await readFile(temporaryPath, 'utf8'));
    if (manifest.specVersion !== 'v1alpha1' || !Object.keys(manifest.endpoints || {}).length) throw new Error('Functions analysis produced an invalid manifest.');
    if (features.DEPLOY_COPILOT === 'false' && manifest.params?.some(param => param.name === 'OPENAI_API_KEY')) throw new Error('Disabled Copilot must not require OPENAI_API_KEY.');
    // JSON is valid YAML; Firebase reads this SDK-generated file without HTTP discovery.
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Prepared ${Object.keys(manifest.endpoints).length} Functions from the current source.`);
    return manifest;
  } finally { await rm(temporaryPath, { force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projectId = process.env.GCLOUD_PROJECT || process.argv[2];
  await prepareFunctionsDeploy(projectId).catch(error => { console.error(error.message); process.exitCode = 1; });
}
