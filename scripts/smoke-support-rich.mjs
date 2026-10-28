import { initializeApp as initializeClient, deleteApp as deleteClient } from 'firebase/app';
import { getAuth as getClientAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getStorage as getClientStorage, ref as fileRef, uploadBytes, getMetadata, getDownloadURL } from 'firebase/storage';
// Disposable fixtures only. Never logs identity tokens, credentials or user data.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const cli = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
const sdk = createRequire(new URL('../functions/package.json', import.meta.url));
const { getGlobalDefaultAccount, getAccessToken } = cli('./lib/auth.js');
const account = getGlobalDefaultAccount();
if (!account) throw new Error('Firebase CLI sign-in required.');
const access = account.tokens.access_token && account.tokens.expires_at > Date.now() + 60000 ? account.tokens : await getAccessToken(account.tokens.refresh_token, account.tokens.scopes ?? ['https://www.googleapis.com/auth/cloud-platform']);
const project = 'gos-app-3c7fb', run = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const { initializeApp, deleteApp } = sdk('firebase-admin/app');
const { getAuth } = sdk('firebase-admin/auth');
const app = initializeApp({ projectId: project, credential: { getAccessToken: async () => ({ access_token: access.access_token, expires_in: 3600 }) } }, `hotfix-${run}`);
const auth = getAuth(app);
const config = JSON.parse(readFileSync(new URL('../src/backend/gos-public-config.json', import.meta.url), 'utf8'));
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const fixtures = [];
const roomIds = new Set(), uploadedPaths = [];
let client;
const encode = value => value === null ? { nullValue: null } : typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, v]) => [key, encode(v)])) } };
async function firestore(path, token, method = 'GET', fields, precondition) {
  const response = await fetch(`${base}/${path}${precondition ? `?currentDocument.updateTime=${encodeURIComponent(precondition)}` : ''}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: fields ? JSON.stringify({ fields }) : undefined, signal: AbortSignal.timeout(30000) });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}
async function put(path, value) {
  const response = await firestore(path, access.access_token, 'PATCH', encode(value).mapValue.fields);
  assert.equal(response.status, 200, 'Create disposable fixture document');
}
async function remove(path) {
  const response = await firestore(path, access.access_token, 'DELETE');
  assert.ok([200,204,404].includes(response.status), 'Remove disposable fixture document');
}
async function callable(name, token, data) {
  const response = await fetch(`https://us-central1-${project}.cloudfunctions.net/${name}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify({ data }), signal: AbortSignal.timeout(60000) });
  const payload = await response.json();
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173', `${name}: missing CORS header`);
  return { status: response.status, data: payload.result ?? payload.data, error: payload.error };
}
async function fixture(kind, role, parent = '') {
  const scope = `hotfix-${run}-${kind}`;
  const password = `Hotfix_${crypto.randomUUID()}_aA1!`;
  const account = await auth.createUser({ email: `hotfix-${run}-${kind}@example.invalid`, password, displayName: 'Hotfix test account' });
  const f = { uid: account.uid, scope };
  fixtures.push(f);
  await put(`users/${f.uid}`, { id: f.uid, name: 'Hotfix test account', email: account.email, role, tenantId: scope, status: 'Active', supportParentId: parent || 'unassigned-hotfix-super' });
  await put(`tenants/${scope}`, { name: 'Disposable hotfix test', ownerId: f.uid });
  await put(`tenants/${scope}/members/${f.uid}`, { role: 'Owner', active: true, permissions: ['*'] });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password, returnSecureToken: true }), signal: AbortSignal.timeout(30000) });
  const signedIn = await response.json();
  assert.equal(response.status, 200, 'Disposable fixture sign-in');
  f.token = signedIn.idToken; f.email = account.email; f.password = password;
  return f;
}
try {
  const admin = await fixture('admin', 'ADMIN');
  const user = await fixture('user', 'USER', admin.uid);
  const target = await fixture('forward', 'USER', admin.uid);
  const outsider = await fixture('outsider', 'USER');
  const contacts = await callable('supportChat', admin.token, { operation: 'contacts' });
  assert.ok(contacts.data.contacts.some(c=>c.id===target.uid), 'Unmessaged managed user is available for New Chat');
  const opened = await callable('supportChat', user.token, { operation: 'open', recipientId: admin.uid });
  assert.equal(opened.status, 200);
  const roomId = opened.data.roomId; roomIds.add(roomId);
  const firstId = crypto.randomUUID(), replyId = crypto.randomUUID();
  const sourcePath = 'supportRooms/'+roomId+'/messages/'+firstId;
  assert.equal((await callable('supportChat', user.token, { operation:'send', recipientId:admin.uid,messageId:firstId,text:'Rich messaging test',files:[] })).status,200);
  assert.equal((await callable('supportChat', admin.token, { operation:'send',recipientId:user.uid,messageId:replyId,text:'Reply test',replyToId:firstId,files:[] })).status,200);
  assert.equal((await firestore('supportRooms/'+roomId+'/messages/'+replyId,user.token)).data.fields.replyContext.mapValue.fields.id.stringValue,firstId);
  assert.equal((await callable('supportChat',admin.token,{operation:'react',recipientId:user.uid,messageId:firstId,emoji:'👍'})).status,200);
  assert.equal((await firestore(sourcePath,user.token)).data.fields.reactions.mapValue.fields[admin.uid].stringValue,'👍');
  assert.equal((await callable('supportChat',admin.token,{operation:'react',recipientId:user.uid,messageId:firstId,emoji:'👍'})).status,200);
  assert.ok(!(await firestore(sourcePath,user.token)).data.fields.reactions.mapValue.fields?.[admin.uid]);
  assert.equal((await callable('supportChat',user.token,{operation:'edit',recipientId:admin.uid,messageId:firstId,text:'Edited rich message'})).status,200);
  assert.equal((await firestore(sourcePath,admin.token)).data.fields.text.stringValue,'Edited rich message');
  assert.equal((await callable('supportChat',admin.token,{operation:'edit',recipientId:user.uid,messageId:firstId,text:'forged'})).status,403);
  assert.equal((await callable('supportChat',user.token,{operation:'delete',recipientId:admin.uid,messageId:replyId,scope:'everyone'})).status,403);
  client=initializeClient(config,'rich-client-'+run);
  const clientAuth=getClientAuth(client), clientStorage=getClientStorage(client);
  await signInWithEmailAndPassword(clientAuth,user.email,user.password);
  const wav=Buffer.alloc(44+32000); wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X7wAAAABJRU5ErkJggg==','base64');
  const mediaId=crypto.randomUUID(), files=[];
  for(const [index,bytes,type,name] of [[0,wav,'audio/wav','voice.wav'],[1,png,'image/png','image.png']]){
    const path='supportAttachments/'+roomId+'/'+user.uid+'/'+mediaId+'-'+index;uploadedPaths.push(path);
    await uploadBytes(fileRef(clientStorage,path),bytes,{contentType:type});
    files.push({path,name,type,size:bytes.length,...(type.startsWith('audio/')?{duration:2,waveform:Array(40).fill(0)}:{})});
  }
  assert.equal((await callable('supportChat',user.token,{operation:'send',recipientId:admin.uid,messageId:mediaId,text:'Media test',files})).status,200);
  const forwardId=crypto.randomUUID(), targetRoom=[admin.uid,target.uid].sort().join('~');roomIds.add(targetRoom);
  files.forEach((_,i)=>uploadedPaths.push('supportAttachments/'+targetRoom+'/'+admin.uid+'/'+forwardId+'-'+i));
  const forwarded=await callable('supportChat',admin.token,{operation:'forward',recipientId:user.uid,messageId:mediaId,targetId:target.uid,forwardId});
  assert.equal(forwarded.status,200,'Forwarded attachments must be copied by the deployed service');
  const delivered=await firestore('supportRooms/'+targetRoom+'/messages/'+forwardId,target.token);
  assert.equal(delivered.status,200);
  assert.equal(delivered.data.fields.forwarded.mapValue.fields.authorName.stringValue,'Hotfix test account');
  const copied=delivered.data.fields.files.arrayValue.values.map(v=>v.mapValue.fields);
  assert.equal(Number(copied[0].duration.integerValue??copied[0].duration.doubleValue),2);
  assert.equal(copied[0].waveform.arrayValue.values.length,40);
  await signOut(clientAuth);await signInWithEmailAndPassword(clientAuth,target.email,target.password);
  for(const [i,file]of copied.entries()){
    const path=file.path.stringValue;
    assert.ok(path.startsWith('supportAttachments/'+targetRoom+'/'+admin.uid+'/'));
    const metadata=await getMetadata(fileRef(clientStorage,path));assert.equal(Number(metadata.size),files[i].size);
    const response=await fetch(await getDownloadURL(fileRef(clientStorage,path)),{headers:{Origin:'http://localhost:5173'},signal:AbortSignal.timeout(30000)});
    assert.ok(['*','http://localhost:5173'].includes(response.headers.get('access-control-allow-origin')),'Attachment download must allow browser CORS');
    assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,files[i].size);
  }
  await signOut(clientAuth);await signInWithEmailAndPassword(clientAuth,outsider.email,outsider.password);
  await assert.rejects(getMetadata(fileRef(clientStorage,copied[0].path.stringValue)),error=>error.code==='storage/unauthorized');
  assert.equal((await callable('supportChat',admin.token,{operation:'delete',recipientId:user.uid,messageId:firstId,scope:'me'})).status,200);
  const hidden=await firestore(sourcePath,user.token);
  assert.equal(hidden.data.fields.text.stringValue,'Edited rich message');
  assert.ok(hidden.data.fields.hiddenFor.arrayValue.values.some(v=>v.stringValue===admin.uid));
  assert.equal((await callable('supportChat',admin.token,{operation:'delete',recipientId:user.uid,messageId:replyId,scope:'everyone'})).status,200);
  assert.equal((await firestore('supportRooms/'+roomId+'/messages/'+replyId,user.token)).data.fields.deleted.booleanValue,true);
  console.log('PASS: live send/reply, reaction add/remove, author-only edit/delete, per-user hide, attachment upload/download, server-side forwarding with waveform/duration, and recipient storage isolation.');
}finally{
  const failures=[];
  if(client)await deleteClient(client).catch(e=>failures.push(e.message));
  for(const path of uploadedPaths){
    assert.ok([...roomIds].some(id=>path.startsWith('supportAttachments/'+id+'/')));
    try{const r=await fetch('https://storage.googleapis.com/storage/v1/b/'+config.storageBucket+'/o/'+encodeURIComponent(path),{method:'DELETE',headers:{Authorization:'Bearer '+access.access_token},signal:AbortSignal.timeout(30000)});if(![200,204,404].includes(r.status))failures.push('Storage cleanup HTTP '+r.status);}catch(e){failures.push(e.message)}
  }
  for(const id of roomIds){
    const path='supportRooms/'+id,r=await firestore(path,access.access_token);if(r.status===404)continue;
    const participants=r.data.fields?.participants?.arrayValue?.values?.map(v=>v.stringValue)??[];
    assert.ok(participants.length===2&&participants.every(uid=>fixtures.some(f=>f.uid===uid)));
    const messages=await firestore(path+'/messages',access.access_token);
    for(const message of messages.data.documents??[])await remove(path+'/messages/'+message.name.split('/').at(-1)).catch(e=>failures.push(e.message));
    await remove(path).catch(e=>failures.push(e.message));
  }
  for(const f of fixtures){
    assert.match(f.scope,new RegExp('^hotfix-'+run+'-(admin|user|forward|outsider)$'));
    for(const path of ['tenants/'+f.scope+'/members/'+f.uid,'tenants/'+f.scope,'users/'+f.uid])await remove(path).catch(e=>failures.push(e.message));
    await auth.deleteUser(f.uid).catch(e=>failures.push(e.message));
  }
  await deleteApp(app);
  if(failures.length)throw Error('Disposable cleanup failed: '+failures.join('; '));
  console.log('Disposable rich-chat fixtures and attachments cleaned up.');
}
