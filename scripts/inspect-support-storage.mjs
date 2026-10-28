import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const cli = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
const { getGlobalDefaultAccount, getAccessToken } = cli('./lib/auth.js');
const account = getGlobalDefaultAccount();
if (!account) throw new Error('Firebase CLI sign-in is required.');
const access = account.tokens.access_token && account.tokens.expires_at > Date.now() + 60000 ? account.tokens : await getAccessToken(account.tokens.refresh_token, account.tokens.scopes ?? ['https://www.googleapis.com/auth/cloud-platform']);
const project = 'gos-app-3c7fb';
async function read(url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${access.access_token}` }, signal: AbortSignal.timeout(30000) });
  const data = await r.json();
  if (!r.ok && r.status !== 404) throw new Error(`Inspection HTTP ${r.status}: ${data.error?.message}`);
  return { status: r.status, data };
}
const projectInfo=await read('https://cloudresourcemanager.googleapis.com/v1/projects/'+project);
const number=projectInfo.data.projectNumber;
const agent='serviceAccount:service-'+number+'@gcp-sa-firebasestorage.iam.gserviceaccount.com';
const response=await fetch('https://cloudresourcemanager.googleapis.com/v1/projects/'+project+':getIamPolicy',{method:'POST',headers:{Authorization:'Bearer '+access.access_token,'Content-Type':'application/json'},body:JSON.stringify({options:{requestedPolicyVersion:3}}),signal:AbortSignal.timeout(30000)});
const policy=await response.json();if(!response.ok)throw Error('IAM inspection failed: '+response.status);
console.log(JSON.stringify({storageAgent:agent,storageAgentRoles:policy.bindings?.filter(b=>b.members?.includes(agent)).map(b=>b.role)}));
const releases=await read('https://firebaserules.googleapis.com/v1/projects/'+project+'/releases');
for(const release of releases.data.releases??[]){
 if(!release.name.includes('storage'))continue;
 const rules=await read('https://firebaserules.googleapis.com/v1/'+release.rulesetName);
 const text=rules.data.source?.files?.map(f=>f.content).join('\n')??'';
 console.log(JSON.stringify({release:release.name,updated:release.updateTime,hasSupportRules:text.includes('supportAttachments'),usesFirestore:text.includes('firestore.get')}));
}
const config=JSON.parse(readFileSync(new URL('../src/backend/gos-public-config.json',import.meta.url),'utf8'));
const bucket=await read('https://storage.googleapis.com/storage/v1/b/'+config.storageBucket+'?fields=name,cors');console.log(JSON.stringify({bucketStatus:bucket.status,...bucket.data}));
