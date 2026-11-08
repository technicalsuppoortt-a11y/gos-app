import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { deploymentFeatures, readDeploymentFeatures } from '../../scripts/prepare-functions-deploy.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const scratch = path.join(root, '.firebase');
async function fixture(run) {
  await mkdir(scratch, { recursive: true });
  const directory = await mkdtemp(path.join(scratch, 'functions-discovery-test-'));
  try { return await run(directory); }
  finally {
    assert.equal(path.dirname(path.resolve(directory)), scratch);
    await rm(directory, { recursive: true, force: true });
  }
}

test('optional provider and outbound switches fail closed and exclude secrets', () => {
  assert.deepEqual(deploymentFeatures({ OPENAI_API_KEY: 'never-copy', RESEND_API_KEY: 'never-copy' }), {
    DEPLOY_COPILOT: 'false', ENABLE_GOS_METERING_BRIDGE: 'false', ENABLE_OUTBOX: 'false', ENABLE_META_WEBHOOK: 'false',
  });
  assert.equal(deploymentFeatures({ DEPLOY_COPILOT: 'true' }, { DEPLOY_COPILOT: 'false' }).DEPLOY_COPILOT, 'false');
  assert.throws(() => deploymentFeatures({ DEPLOY_COPILOT: 'not-a-valid-flag' }), error => error.message.includes('DEPLOY_COPILOT') && !error.message.includes('not-a-valid-flag'));
});

test('production discovery uses the selected project dotenv, excluding emulator overrides', async () => fixture(async directory => {
  await writeFile(path.join(directory, '.env'), 'DEPLOY_COPILOT=true\nENABLE_OUTBOX=true\nOPENAI_API_KEY=never-copy\n');
  await writeFile(path.join(directory, '.env.demo-gos-check'), 'DEPLOY_COPILOT="false"\nENABLE_OUTBOX=false\nENABLE_META_WEBHOOK=true\n');
  await writeFile(path.join(directory, '.env.local'), 'DEPLOY_COPILOT=true\nENABLE_OUTBOX=true\n');
  assert.deepEqual(await readDeploymentFeatures(directory, 'demo-gos-check'), {
    DEPLOY_COPILOT: 'false', ENABLE_GOS_METERING_BRIDGE: 'false', ENABLE_OUTBOX: 'false', ENABLE_META_WEBHOOK: 'true',
  });
  await assert.rejects(readDeploymentFeatures(directory, '../outside'), /project ID/);
}));

async function discover(directory, copilot) {
  const source = path.join(root, 'functions');
  const sdkRoot = path.join(source, 'node_modules/firebase-functions');
  const sdk = JSON.parse(await readFile(path.join(sdkRoot, 'package.json'), 'utf8'));
  const output = path.join(directory, `manifest-${copilot}.json`);
  const guard = pathToFileURL(path.join(root, 'tests/helpers/functions-discovery-guard.mjs')).href;
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', guard, path.resolve(sdkRoot, sdk.bin['firebase-functions']), source], {
      cwd: source, timeout: 180_000, stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, ...deploymentFeatures({ DEPLOY_COPILOT: copilot }), GCLOUD_PROJECT: 'demo-gos-check',
        FIREBASE_CONFIG: JSON.stringify({ projectId: 'demo-gos-check' }), FUNCTIONS_CONTROL_API: 'true', FUNCTIONS_MANIFEST_OUTPUT_PATH: output },
    });
    let stderr = '';
    child.stderr.on('data', data => { stderr += data; });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Discovery failed (${signal || code}): ${stderr}`)));
  });
  return JSON.parse(await readFile(output, 'utf8'));
}

test('real SDK discovery preserves core functions without OpenAI, network calls or audio-parser startup', async () => fixture(async directory => {
  const manifest = await discover(directory, 'false');
  assert.equal(manifest.specVersion, 'v1alpha1');
  for (const name of ['phoenixPlatform', 'manageUser', 'supportChat', 'publicBooking', 'processCommerceDeliveries', 'transcribeCopilotVoice']) assert.ok(manifest.endpoints[name], name);
  for (const name of ['copilot', 'generateFollowUp', 'extractCopilotVoice', 'dispatchOutbox', 'metaWebhook', 'gosLiveUsage']) assert.equal(manifest.endpoints[name], undefined, name);
  assert.equal(manifest.params.some(param => param.name === 'OPENAI_API_KEY'), false);
  assert.deepEqual(manifest.endpoints.transcribeCopilotVoice.secretEnvironmentVariables, []);
  assert.deepEqual(manifest.endpoints.processCommerceDeliveries.secretEnvironmentVariables, [{ key: 'RESEND_API_KEY' }]);
}));

test('explicit Copilot activation still declares and binds its required secret', async () => fixture(async directory => {
  const manifest = await discover(directory, 'true');
  assert.ok(manifest.params.some(param => param.name === 'OPENAI_API_KEY' && param.type === 'secret'));
  for (const name of ['copilot', 'generateFollowUp', 'extractCopilotVoice', 'transcribeCopilotVoice']) {
    assert.ok(manifest.endpoints[name].secretEnvironmentVariables.some(secret => secret.key === 'OPENAI_API_KEY'), name);
  }
  assert.equal(manifest.endpoints.dispatchOutbox, undefined);
}));
