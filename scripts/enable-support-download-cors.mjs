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
const config=JSON.parse(readFileSync(new URL('../src/backend/gos-public-config.json',import.meta.url),'utf8'));
const bucket=config.storageBucket;
if(bucket!=='gos-app-3c7fb.firebasestorage.app')throw Error('Unexpected bucket target');
const metadata=await read('https://storage.googleapis.com/storage/v1/b/'+bucket+'?fields=name,cors,metageneration');
if(metadata.status!==200)throw Error('Bucket metadata unavailable');
const cors=metadata.data.cors??[];
if(cors.some(rule=>rule.origin?.includes('*')&&rule.method?.includes('GET')&&rule.method?.includes('HEAD'))){console.log('Browser media-download CORS is already configured.');}
else{
 cors.push({origin:['*'],method:['GET','HEAD'],responseHeader:['Content-Type','Content-Disposition','Content-Length','Accept-Ranges','Content-Range'],maxAgeSeconds:3600});
 const response=await fetch('https://storage.googleapis.com/storage/v1/b/'+bucket+'?ifMetagenerationMatch='+metadata.data.metageneration,{method:'PATCH',headers:{Authorization:'Bearer '+access.access_token,'Content-Type':'application/json'},body:JSON.stringify({cors}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Download CORS update failed: HTTP '+response.status);
 console.log('Added GET/HEAD download CORS while retaining existing bucket CORS entries. Storage access rules and write permissions are unchanged.');
}
