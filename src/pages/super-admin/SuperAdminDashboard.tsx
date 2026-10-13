import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React from 'react';
import { ArrowUpRight, Boxes, Building2, Crown, Users, Wallet } from 'lucide-react';
import '../../role-dashboards.css';
import '../../components/layout/super-admin.css';

const clients = [
  { name: 'Ahmed Ali', software: 'AI Sales', status: 'Active', revenue: '€97' },
  { name: 'Sara Mohamed', software: 'Coaching', status: 'Active', revenue: '€67' },
  { name: 'Omar Khaled', software: 'E-Commerce', status: 'Active', revenue: '€67' },
  { name: 'Lina Mansour', software: 'Real Estate', status: 'Setup', revenue: '€97' },
  { name: 'Nour Hassan', software: 'Agency', status: 'Active', revenue: '€47' },
];

export const SuperAdminDashboard: React.FC = () => { useUILanguage(); return (<div className="sa-dashboard">
  <section className="sa-welcome">
    <span className="sa-crown"><Crown size={20} fill="currentColor"/></span>
    <span><b>{translateText("Super Admin (Internal)")}</b><small>{translateText("Full control over all software, clients and data")}</small></span>
  </section>

  <section className="sa-overview-panel" aria-label={translateText("Platform overview")}>
    <div className="sa-overview-label"><span><i/>{translateText(" Overview")}</span><button aria-label={translateText("Overview options")}>•••</button></div>
    <div className="sa-metrics-grid">
      <Metric label="Total Clients" value="128" delta="+12%" icon={Building2}/>
      <Metric label="Active Softwares" value="86" delta="+8%" icon={Boxes}/>
      <Metric label="Monthly Revenue" value="€12,430" delta="+24%" icon={Wallet}/>
      <Metric label="Team Members" value="5" delta="+0%" icon={Users}/>
    </div>
    <section className="sa-clients-card">
      <div className="sa-clients-heading"><h2>{translateText("Recent Clients")}</h2><button>{translateText("View All ")}<ArrowUpRight size={12}/></button></div>
      <div className="sa-table-scroll"><table><thead><tr><th className="text-start">{translateText("Name")}</th><th className="text-start">{translateText("Software")}</th><th className="text-center">{translateText("Status")}</th><th className="text-center">{translateText("Revenue")}</th></tr></thead><tbody>{localizeNode(clients.map(client=><tr key={client.name}><td className="text-start">{localizeNode(client.name)}</td><td className="text-start">{localizeNode(client.software)}</td><td className="text-center"><span className={`sa-status mx-auto ${client.status==='Active'?'active':'setup'}`}>{localizeNode(client.status)}</span></td><td className="text-center">{localizeNode(client.revenue)}</td></tr>))}</tbody></table></div>
    </section>
  </section>
  <a className="sa-manage-clients" href="/super-admin/clients"><span/>{translateText("Manage all clients and software installations ")}<ArrowUpRight size={13}/></a>
</div>); };

function Metric({label,value,delta,icon:Icon}:{label:string;value:string;delta:string;icon:React.ElementType}){
  useUILanguage();return <article className="sa-metric"><div className="sa-metric-label">{localizeNode(label)}<Icon size={13}/></div><div className="sa-metric-value">{localizeNode(value)}</div><span className={`sa-metric-delta ${delta==='+0%'?'flat':''}`}>{localizeNode(delta)}</span></article>}
