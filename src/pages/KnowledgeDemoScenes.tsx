import { Check, ShieldCheck } from 'lucide-react';
import { WhatsappLogo, MessengerLogo, InstagramLogo, ChatDots } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { translateText as t } from '../i18n/display';

export type DemoSource = { name: string; type: 'file' | 'url' };
export type DemoChannel = 'WhatsApp' | 'Messenger' | 'Instagram' | 'Web Chat';
export const demoChannels: DemoChannel[] = ['WhatsApp', 'Messenger', 'Instagram', 'Web Chat'];
export const sampleFiles = ['fees-2026.pdf', 'services.md', 'faq-en.csv', 'policies.docx', 'scripts.json', 'onboarding.pdf', 'team-bios.md', 'case-studies.md', 'glossary.csv', 'partner-availability.json'];
const sampleLinks = ['blog/misa-licensing', 'blog/rhq', 'faq', 'case-studies', 'pricing', 'contact', 'team'];
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function ChannelMark({ channel }: { channel: DemoChannel }) {
  const Icon = { WhatsApp: WhatsappLogo, Messenger: MessengerLogo, Instagram: InstagramLogo, 'Web Chat': ChatDots }[channel];
  return <span aria-hidden="true" className={`kd-brand kd-brand-${channel.toLowerCase().replace(' ', '-')}`}><Icon size={22} weight={channel === 'Messenger' || channel === 'Web Chat' ? 'fill' : 'regular'}/></span>;
}

export function KnowledgeOrb({ progress = 70, network = false }: { progress?: number; network?: boolean }) {
  const phase = progress < 55 ? 'READING' : progress < 90 ? 'EMBEDDING' : 'TUNING';
  const phaseProgress = clamp((progress - (progress < 55 ? 0 : progress < 90 ? 55 : 90)) / (progress < 55 ? 55 : progress < 90 ? 35 : 10) * 100);
  return <div className={`kd-orb ${network ? 'kd-orb-network' : ''}`}>
    <svg className="kd-orb-rings" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="91" className="kd-orb-guide"/>
      <circle cx="100" cy="100" r="79" className="kd-orb-guide dashed"/>
      <g className="kd-orbit outer"><circle cx="100" cy="100" r="88" pathLength="100" strokeDasharray="29 71"/><circle cx="188" cy="100" r="2.7" className="kd-orbit-dot"/></g>
      <g className="kd-orbit inner"><circle cx="100" cy="100" r="81" pathLength="100" strokeDasharray="21 79"/><circle cx="100" cy="181" r="2.3" className="kd-orbit-dot"/></g>
      {!network && <circle cx="100" cy="100" r="61" pathLength="100" className="kd-orb-meter" strokeDasharray={`${progress} 100`} transform="rotate(-90 100 100)"/>}
    </svg>
    <div className="kd-orb-core"><span>{network ? 'ReachMore' : t('Training')}</span><small>{network ? t('YOUR AI') : t(phase)}</small>{!network && <b>{phaseProgress}%</b>}<i aria-hidden="true">•••</i></div>
  </div>;
}

export function TrainingScene({ sources, percent }: { sources: DemoSource[]; percent: number }) {
  const files = Array.from(new Set([...sources.filter(source => source.type === 'file').map(source => source.name), ...sampleFiles])).slice(0, 10);
  const links = Array.from(new Set([...sources.filter(source => source.type === 'url').map(source => source.name.replace(/^https?:\/\//, '')), ...sampleLinks])).slice(0, 7);
  const sourceProgress = Math.min(100, percent * 1.18);
  const progressFor = (index: number) => clamp((sourceProgress - index * 8) * 4);
  const indexed = files.filter((_, index) => progressFor(index) === 100).length;
  const crawled = Math.min(50, Math.floor(Math.pow(sourceProgress / 100, 3.5) * 50));
  return <section className="kd-training" aria-label={t('Training simulation')}>
    <h3 className="sr-only">{t('Building your knowledge')}</h3>
    <div className="kd-training-columns">
      <section className="kd-source-panel"><header><span>{t('FILES')}</span><b>{indexed} / {files.length}</b></header>
        <div className="kd-file-list">{files.map((name, index) => {
          const value = progressFor(index);
          return <div className={`kd-file-row ${value === 100 ? 'done' : ''}`} key={name}>
            <span title={name}>{name}</span><div className="kd-file-track" role="progressbar" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><i style={{ width: `${value}%` }}/></div>
            <small>{value === 100 ? <Check size={13}/> : `${value}%`}</small>
          </div>;
        })}</div>
      </section>
      <section className="kd-source-panel"><header><span>{t('CRAWLING LINKS')}</span><b>{crawled} / 50</b></header>
        <div className="kd-link-list">{links.map((name, index) => <div key={name} className={crawled > index * 2 ? 'done' : 'waiting'}><span>{crawled > index * 2 ? <Check size={13}/> : '/'}</span><b title={name}>{name}</b></div>)}</div>
      </section>
    </div>
    <div className="kd-training-orb" role="progressbar" aria-label={t('Demo training progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <KnowledgeOrb progress={percent}/>
      <div className="kd-training-phases">{['Reading', 'Embedding', 'Tuning'].map((phase, index) => <span key={phase} className={percent >= [55, 90, 100][index] ? 'done' : ''}><i/>{t(phase)}</span>)}</div>
    </div>
  </section>;
}

const transcript = [
  { ai: false, text: 'Hi, I want to set up a company in Riyadh. Can you help?' },
  { ai: true, text: "Hi — I’m the Khalid & Partners AI assistant. We specialise in company formation in Saudi. What’s the activity and how many employees are you planning for?" },
  { ai: false, text: 'Tech consultancy, around 12 staff. Do I need a MISA licence?' },
  { ai: true, text: 'Yes — foreign ownership requires MISA. For tech consultancy: government fees are SAR 62,000/yr, and our fee is SAR 18,000 for the full setup in 4–6 weeks.' },
];

export function ChatScene({ time, asked, reducedMotion }: { time: number; asked: string; reducedMotion: boolean }) {
  const count = asked ? 4 : Math.min(4, 1 + Math.floor(time / 1500));
  return <section className="kd-chat" aria-label={t('Chat simulation')}>
    <h3 className="sr-only">{t('Test your assistant')}</h3>
    <div className="kd-signal-bar"><span><i/>{t('TEST')} · <ChannelMark channel="WhatsApp"/>{t(" WHATSAPP · ")}<b>{t("RIYADH")}</b></span><time>00:{String(Math.floor(time / 1000)).padStart(2, '0')}</time></div>
    <div className="kd-transcript">{transcript.slice(0, count).map((message, index) => <motion.div key={`${index}-${index === 0 ? asked : ''}`} className={`kd-chat-row ${message.ai ? 'ai' : 'customer'}`} initial={reducedMotion ? false : { opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .3, ease: 'easeOut' }}>
      <span className="kd-chat-avatar">{message.ai ? 'RM' : 'A'}</span><p>{index === 0 && asked ? asked : t(message.text)}</p>
    </motion.div>)}{count < 4 && <div className="kd-typing" aria-label={t('Preparing sample reply')}><i/><i/><i/></div>}</div>
    <div className="kd-context-bar"><span>{t('KNOWLEDGE')}<br/>{t('RETRIEVED:')}</span><b>PARTNER-<br/>AVAILABILITY.JSON</b><strong><ShieldCheck size={14}/>{t('CONTEXT')}<br/>{t('CONSISTENT')}</strong></div>
    <small className="kd-sample-note">{t('Illustrative conversation and pricing · demo only')}</small>
  </section>;
}

export function ConnectScene({ time, channels, toggle }: { time: number; channels: Partial<Record<DemoChannel, boolean>>; toggle: (channel: DemoChannel, enabled: boolean) => void }) {
  return <section className="kd-connect" aria-label={t('Channel network simulation')}>
    <h3 className="sr-only">{t('Connect your customer channels')}</h3>
    <div className="kd-network">
      <svg viewBox="0 0 600 430" preserveAspectRatio="none" className="kd-node-wires" aria-hidden="true">{['M300 215 L120 60', 'M300 215 L480 60', 'M300 215 L120 370', 'M300 215 L480 370'].map((d, index) => <g key={d} className={(channels[demoChannels[index]] ?? time > 1100 + index * 850) ? 'connected' : ''}><path d={d} className="kd-wire-base"/><path d={d} className="kd-wire-pulse"/></g>)}</svg>
      <div className="kd-network-hub"><KnowledgeOrb network/></div>
      {demoChannels.map((channel, index) => {
        const enabled = channels[channel] ?? time > 1100 + index * 850;
        return <button key={channel} type="button" aria-pressed={enabled} className={`kd-network-card kw-demo-channel kd-position-${index} ${enabled ? 'connected' : ''}`} onClick={() => toggle(channel, !enabled)}>
          <ChannelMark channel={channel}/><b>{channel}</b><span><i/>{t(enabled ? 'LIVE' : 'IDLE')}</span>
        </button>;
      })}
    </div>
  </section>;
}

const conversations: { channel: DemoChannel; customer: string; answer: string; followup?: string; stamp: string }[] = [
  { channel: 'WhatsApp', customer: "Hi, I’d like to book an appointment", answer: 'Sure — Tuesday 4pm or Wednesday 10am works', followup: 'Tuesday 4', stamp: '✓ BOOKED' },
  { channel: 'Instagram', customer: 'do you ship gift boxes to Riyadh?', answer: 'Yes — same-day before 3pm. SAR 25 delivery.', stamp: '+1 ORDER · SAR 480' },
  { channel: 'Messenger', customer: 'need RHQ + MISA for UK parent, 25 staff', answer: 'RHQ track, 8–12 weeks. Booking Khalid for Tue 4pm.', stamp: '→ QUALIFIED · PARTNER KHALID' },
];

export function LiveScene({ time, channels, reducedMotion }: { time: number; channels: Partial<Record<DemoChannel, boolean>>; reducedMotion: boolean }) {
  const active = conversations.filter(conversation => channels[conversation.channel] !== false).length;
  return <section className="kd-live" aria-label={t('Live conversation monitor')}>
    <h3 className="sr-only">{t('Your demo assistant is live')}</h3>
    <div className="kd-signal-bar live"><span><i/>{t('LIVE')} · {t('TALKING TO')} {active} {t('CUSTOMERS')}</span><span className="kd-live-counter">{t('DEMO')}</span></div>
    <div className="kd-live-streams">{conversations.map((conversation, index) => {
      const enabled = channels[conversation.channel] !== false;
      const progress = time - index * 700;
      return <article key={conversation.channel} className={`kd-stream ${enabled ? '' : 'paused'}`} aria-label={`${conversation.channel} ${t('conversation')}`}>
        <ChannelMark channel={conversation.channel}/>
        <div className="kd-stream-messages">
          <motion.p className="customer" initial={reducedMotion ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .3 }}>{t(conversation.customer)}</motion.p>
          {enabled && progress > 800 && <motion.p className="ai" initial={reducedMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .3 }}>{t(conversation.answer)}</motion.p>}
          {enabled && conversation.followup && progress > 1700 && <motion.p className="customer followup" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{t(conversation.followup)}</motion.p>}
        </div>
        {enabled && progress > 2500 && <motion.span className="kd-outcome" initial={reducedMotion ? false : { opacity: 0, scale: 1.25, rotate: -12 }} animate={{ opacity: 1, scale: 1, rotate: -5 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>{t(conversation.stamp)}</motion.span>}
        {!enabled && <span className="kd-paused-label">{t('PAUSED')}</span>}
      </article>;
    })}</div>
    <div className="kd-live-stats"><span><b>{Math.round((26 + Math.min(12, time / 600)) * active / 3)}</b>{t('CONVERSATIONS TODAY')}</span><span><b>{time > 4000 && active ? 2 : 0}</b>{t('NEEDED YOUR TEAM')}</span></div>
  </section>;
}
