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

export const SuperAdminDashboard: React.FC = () => <div className="sa-dashboard">
  <section className="sa-welcome">
    <span className="sa-crown"><Crown size={20} fill="currentColor"/></span>
    <span><b>Super Admin (Internal)</b><small>Full control over all software, clients and data</small></span>
  </section>

  <section className="sa-overview-panel" aria-label="Platform overview">
    <div className="sa-overview-label"><span><i/> Overview</span><button aria-label="Overview options">•••</button></div>
    <div className="sa-metrics-grid">
      <Metric label="Total Clients" value="128" delta="+12%" icon={Building2}/>
      <Metric label="Active Softwares" value="86" delta="+8%" icon={Boxes}/>
      <Metric label="Monthly Revenue" value="€12,430" delta="+24%" icon={Wallet}/>
      <Metric label="Team Members" value="5" delta="+0%" icon={Users}/>
    </div>
    <section className="sa-clients-card">
      <div className="sa-clients-heading"><h2>Recent Clients</h2><button>View All <ArrowUpRight size={12}/></button></div>
      <div className="sa-table-scroll"><table><thead><tr><th>Name</th><th>Software</th><th>Status</th><th>Revenue</th></tr></thead><tbody>{clients.map(client=><tr key={client.name}><td>{client.name}</td><td>{client.software}</td><td><span className={`sa-status ${client.status==='Active'?'active':'setup'}`}>{client.status}</span></td><td>{client.revenue}</td></tr>)}</tbody></table></div>
    </section>
  </section>
  <a className="sa-manage-clients" href="/super-admin/clients"><span/>Manage all clients and software installations <ArrowUpRight size={13}/></a>
</div>;

function Metric({label,value,delta,icon:Icon}:{label:string;value:string;delta:string;icon:React.ElementType}){return <article className="sa-metric"><div className="sa-metric-label">{label}<Icon size={13}/></div><div className="sa-metric-value">{value}</div><span className={`sa-metric-delta ${delta==='+0%'?'flat':''}`}>{delta}</span></article>}
