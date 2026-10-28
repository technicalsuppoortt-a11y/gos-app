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
const role='roles/firebaserules.firestoreServiceAgent';
if(policy.bindings?.some(b=>b.role===role&&!b.condition&&b.members?.includes(agent))){console.log('Required Storage-to-Firestore service-agent grant is already enabled.');}
else{
 const bindings=policy.bindings??[];
 const existing=bindings.find(b=>b.role===role&&!b.condition);
 if(existing)existing.members=[...existing.members,agent];else bindings.push({role,members:[agent]});
 const updated=await fetch('https://cloudresourcemanager.googleapis.com/v1/projects/'+project+':setIamPolicy',{method:'POST',headers:{Authorization:'Bearer '+access.access_token,'Content-Type':'application/json'},body:JSON.stringify({policy:{...policy,bindings}}),signal:AbortSignal.timeout(30000)});
 if(!updated.ok)throw Error('Service-agent grant failed: HTTP '+updated.status);
 console.log('Enabled Firebase Rules Firestore Service Agent for this project Storage service agent only. Existing IAM bindings preserved using the policy etag.');
}
