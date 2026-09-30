import React from 'react';
import { ArrowUpRight, Bot, CalendarDays, CheckCircle2, CreditCard, MoreHorizontal, Plus, Users } from 'lucide-react';
import '../../role-dashboards.css';

const activity = [
  ['SC', 'Sarah Chen', 'Booked a strategy session', '4 min ago', 'avatar-peach'],
  ['MJ', 'Marcus Johnson', 'New lead from Instagram', '22 min ago', 'avatar-blue'],
  ['PP', 'Priya Patel', 'Replied to AI follow-up', '1 hr ago', 'avatar-lilac'],
];

export const AdminDashboard: React.FC = () => <div className="role-dashboard">
  <div className="role-head"><div><span className="eyebrow">BRAND STUDIO · WORKSPACE ADMIN</span><h1>Good morning, Taylor</h1><p>Here’s how your workspace is doing today.</p></div><button className="button-primary"><Plus size={15}/> Invite team member</button></div>
  <div className="role-metrics"><Metric label="Active users" value="24" delta="4 this month" icon={Users}/><Metric label="AI conversations" value="386" delta="12.8% this week" icon={Bot}/><Metric label="Bookings" value="48" delta="8 new today" icon={CalendarDays}/><Metric label="Monthly revenue" value="$24,680" delta="18.2% this month" icon={CreditCard}/></div>
  <div className="role-main-grid"><section className="panel role-tool-panel"><div className="section-heading"><div><h2>Workspace tools</h2><p className="muted-caption">Manage the services available to your team</p></div><button className="text-link">Manage tools <ArrowUpRight size={13}/></button></div><div className="role-tool-grid">{[['AI Copilot','Ready','avatar-lilac',Bot],['CRM & leads','Ready','avatar-blue',Users],['Booking','Connected','avatar-mint',CalendarDays],['Payments','Connected','avatar-peach',CreditCard]].map(([name,status,color,Icon])=><div className="role-tool" key={String(name)}><span className={`role-tool-icon ${String(color)}`}><Icon size={17}/></span><span><b>{String(name)}</b><small><i className="live-dot"/> {String(status)}</small></span><MoreHorizontal size={16}/></div>)}</div></section><section className="panel role-status-panel"><div className="section-heading"><div><h2>Workspace status</h2><p className="muted-caption">Your connected services</p></div><button className="subtle-icon"><MoreHorizontal size={16}/></button></div><Status name="Google Calendar" desc="Availability sync is on"/><Status name="Stripe payments" desc="Payments verified"/><Status name="WhatsApp" desc="Connected and ready"/><div className="role-status-foot"><CheckCircle2 size={14}/> All systems operational</div></section></div>
  <section className="panel role-activity"><div className="section-heading"><div><h2>Recent activity</h2><p className="muted-caption">A snapshot of what’s happening across your workspace.</p></div><button className="subtle-icon"><MoreHorizontal size={16}/></button></div>{activity.map(([initials,name,event,time,color])=><div className="role-activity-row" key={name}><span className={`avatar ${color}`}>{initials}</span><span><b>{name}</b><small>{event}</small></span><time>{time}</time></div>)}</section>
</div>;

function Metric({label,value,delta,icon:Icon}:{label:string;value:string;delta:string;icon:React.ElementType}){return <div className="metric-card"><div className="metric-top"><span>{label}</span><i className="metric-icon icon-lilac"><Icon size={16}/></i></div><div className="metric-value">{value}</div><div className="metric-bottom"><span className="trend-positive"><ArrowUpRight size={13}/></span><span>{delta}</span></div></div>}
function Status({name,desc}:{name:string;desc:string}){return <div className="role-service"><span className="role-service-dot"><CheckCircle2 size={14}/></span><span><b>{name}</b><small>{desc}</small></span><i className="live-dot"/></div>}
