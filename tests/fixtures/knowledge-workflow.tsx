import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../src/store';
import { AIFollowUp } from '../../src/pages/AIFollowUp';
import { KnowledgeWorkflow } from '../../src/pages/KnowledgeWorkflow';
import { gosApi, type GosSource, type GosAssistant } from '../../src/backend/gosApi';
import type { Conversation } from '../../src/pages/inbox/inboxData';
import '../../src/index.css';
import '../../src/layout-shell.css';
import '../../src/pages/ai-followup.css';

const calls: { operation: string; name?: string; type?: string }[] = [];
let records: GosSource[] = [{ id: 'existing', name: 'Existing policies', type: 'text', status: 'ready', chunk_count: 3 }];
let sync = () => {};
let rejectDocx = true;
let configuration: GosAssistant = { channels: { webchat: true }, live_enabled: false };
const threads: Conversation[] = (['whatsapp','instagram','messenger'] as const).map((channel,index)=>({
  id:`thread-${index}`,name:['Sara Ahmed','Omar Ali','Lina Hassan'][index],initials:'SA',channel,preview:'Can I book a consultation?',time:'10:45',unread:0,tags:[],stage:['BOOKED','QUALIFIED','IN PROGRESS'][index],source:'Inbox',phone:'',email:'',location:'',assignee:'',aiAutoReply:true,takenOver:index===1,followUp:false,followUpRules:[],starred:false,
  messages:[{id:`question-${index}`,sender:'customer',text:'Can I book a consultation?',time:'10:44'},{id:`answer-${index}`,sender:'ai',text:'Yes. You can choose an available consultation time on our booking page.',time:'10:45'}],activity:[],
}));
gosApi.playground = async()=>({tests:[]});
gosApi.ask = async (question, context)=>{calls.push({operation:'ask',name:question,type:context?.session_id});return{session_id:'session-1',test:{id:crypto.randomUUID(),question,answer:'Support is available Sunday through Thursday.',outcome:'answered',citations:['existing']}};};
gosApi.grade = async(id,verdict)=>{calls.push({operation:'grade',name:verdict});return{test:{id,question:'When is support available?',answer:'Support is available Sunday through Thursday.',outcome:'answered',citations:['existing'],verdict}};};
gosApi.me = async () => ({ user: { id: 'qa-user' } });
gosApi.sources = async () => ({ sources: [...records] });
gosApi.source = async id => ({ source: records.find(source => source.id === id)! });
gosApi.training = async () => ({ embedding_percentage: records.every(source => source.status === 'ready') ? 100 : 0 });
gosApi.channels = async () => ({ channels: configuration.channels });
gosApi.updateChannel = async (channel, enabled) => { calls.push({operation:'channel',name:channel,type:String(enabled)}); configuration = { ...configuration, channels: { ...configuration.channels, [channel]: enabled } }; return {}; };
gosApi.receiveMessage = async body => { calls.push({operation:'receive',name:body.body,type:body.channel}); return {outcome:'answered',conversation:{id:'live-test'},reply:{body:'Support is available Sunday through Thursday.'}}; };
gosApi.assistant = async () => ({ assistant: configuration });
gosApi.updateAssistant = async changes => {
  calls.push({ operation: 'assistant' });
  configuration = { ...configuration, ...changes };
  return { assistant: configuration };
};
gosApi.createSource = async body => {
  const name = body instanceof FormData ? String(body.get('name')) : body.name;
  const type = body instanceof FormData ? 'file' : body.type;
  calls.push({ operation: 'create', name, type });
  if (name.endsWith('.docx') && rejectDocx) { rejectDocx = false; throw new Error('DOCX extraction unavailable'); }
  if (type === 'url') throw new Error('Website crawling unavailable');
  const source: GosSource = { id: crypto.randomUUID(), name, type: type as GosSource['type'], status: 'queued' };
  records = [...records, source]; sync(); return { source };
};
gosApi.deleteSource = async id => { calls.push({ operation: 'delete', name: id }); records = records.filter(s => s.id !== id); sync(); return {}; };
function Fixture() {
  const [sources, setSources] = useState(records);
  const [assistant, setAssistant] = useState<GosAssistant>({ channels: { webchat: true }, live_enabled: false });
  const [mounted, setMounted] = useState(true);
  sync = () => setSources([...records]);
  Object.assign(window, {
    __knowledge: {
      calls,
      records: () => records,
      assistant: () => assistant,
      complete: () => { records = records.map(s => ({ ...s, status: 'ready', chunk_count: 4 })); sync(); },
      remount: () => { setMounted(false); setTimeout(() => setMounted(true), 20); },
    },
  });
  const fullWidth = new URLSearchParams(location.search).has('full');
  return <div className="af-page" style={{ maxWidth: fullWidth ? 'none' : 1100, height:fullWidth?'100vh':undefined, padding: 16, margin: 'auto' }}>{mounted && <KnowledgeWorkflow sources={sources} loading={false} error="" refresh={sync} assistant={assistant} saving={false} assistantName="Workspace Assistant" conversations={threads} updateAssistant={async changes => { calls.push({operation:'assistant',type:changes.channels?'channels':'live'});setAssistant(p => ({ ...p, ...changes })); return true; }} onTest={() => { calls.push({ operation: 'test' }); }} onConnect={() => { calls.push({ operation: 'connect' }); }}/>}</div>;
}
const integrated = new URLSearchParams(location.search).has('integrated');
createRoot(document.getElementById('root')!).render(integrated
  ? <Provider store={store}><MemoryRouter><div className="layout-route-content" style={{ height: '100vh', padding: 12 }}><AIFollowUp/></div></MemoryRouter></Provider>
  : <Fixture/>);
