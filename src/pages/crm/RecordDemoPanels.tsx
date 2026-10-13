import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { CalendarDays, Mail, MessageCircle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CanonicalLead } from '../../store/slices/crmSlice';

const formatTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

export function DemoConversations({ lead }: { lead: CanonicalLead }) {
  useUILanguage();
  const threads = [
    { channel: 'WhatsApp', icon: MessageCircle, subject: 'Discovery call follow-up', messages: [
      { at: '2026-10-09T09:15:00+03:00', sender: lead.name, text: 'Thanks for the call! Could you send the package options and available start dates?' },
      { at: '2026-10-09T09:22:00+03:00', sender: lead.owner, text: 'Absolutely. The strategy package includes a kickoff session, roadmap and two follow-up calls. We can start next Tuesday.' },
      { at: '2026-10-09T09:28:00+03:00', sender: lead.name, text: 'Tuesday works. Please send the proposal to my email.' },
    ] },
    { channel: 'Email', icon: Mail, subject: 'Your proposal and onboarding checklist', messages: [
      { at: '2026-10-10T11:00:00+03:00', sender: lead.owner, text: `Hi ${lead.name.split(' ')[0]}, I’ve shared the proposal and onboarding checklist. The deposit reserves your kickoff session.` },
      { at: '2026-10-10T14:35:00+03:00', sender: lead.name, text: 'Proposal received, thank you. I’ve approved the scope and will arrange the deposit today.' },
    ] },
    { channel: 'Live chat', icon: MessageCircle, subject: 'Website inquiry', messages: [
      { at: '2026-10-08T16:10:00+03:00', sender: lead.name, text: 'We’re planning a new launch and would like help with positioning. Do you offer a consultation?' },
      { at: '2026-10-08T16:12:00+03:00', sender: lead.owner, text: 'Yes! I’ve sent you a booking link for a 30-minute discovery call.' },
    ] },
  ];
  return <><p className="crm-demo-label">{translateText("Sample conversations · illustrative data")}</p><div className="crm-conversation-grid">{threads.map(thread => <article className="crm-thread" key={thread.channel}><header><thread.icon size={16}/><div><b>{localizeNode(thread.channel)}</b><p>{localizeNode(thread.subject)}</p></div></header>{thread.messages.map(message => <div className={`crm-message ${message.sender === lead.owner ? 'outgoing' : ''}`} key={message.at}><div><b>{localizeNode(message.sender)}</b><time dateTime={message.at}>{localizeNode(formatTime(message.at))}</time></div><p>{message.text}</p></div>)}</article>)}</div></>;
}

export function DemoAppointments({ lead }: { lead: CanonicalLead }) {
  useUILanguage();
  const appointments = [
    { id: 'discovery', title: 'Discovery call', at: '2026-10-09T10:00:00+03:00', end: '2026-10-09T10:30:00+03:00', status: 'Completed', location: 'Google Meet', agenda: 'Goals, launch timeline and scope' },
    { id: 'kickoff', title: 'Strategy kickoff', at: '2026-10-13T11:00:00+03:00', end: '2026-10-13T12:00:00+03:00', status: 'Confirmed', location: 'Google Meet', agenda: 'Positioning workshop and project roadmap' },
    { id: 'review', title: 'Proposal review', at: '2026-10-15T14:30:00+03:00', end: '2026-10-15T15:00:00+03:00', status: 'Pending confirmation', location: 'Phone call', agenda: 'Budget approval and next steps' },
  ];
  return <><p className="crm-demo-label">{translateText("Sample appointments · illustrative data")}</p><div className="crm-demo-list">{localizeNode(appointments.map(a => {
    const dates = [a.at, a.end].map(d => new Date(d).toISOString().replace(/[-:]/g, '').replace('.000', '')).join('/');
    const calendarUrl = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: `${a.title} — ${lead.name}`, dates, details: `Sample appointment: ${a.agenda}`, location: a.location });
    return <article className="crm-appointment" key={a.id}><CalendarDays size={20}/><div><b>{localizeNode(a.title)}</b><p><time dateTime={a.at}>{localizeNode(formatTime(a.at))}</time> · {localizeNode(Math.round((Date.parse(a.end) - Date.parse(a.at)) / 60000))}{translateText(" min")}</p><small>{localizeNode(a.location)} · {localizeNode(a.agenda)}{translateText(" · Host: ")}{localizeNode(lead.owner)}</small></div><span className={`crm-status ${a.status === 'Completed' ? 'paid' : a.status === 'Confirmed' ? 'confirmed' : 'pending'}`}>{localizeNode(a.status)}</span><a className="crm2-btn-secondary" href={calendarUrl} target="_blank" rel="noreferrer">{translateText("Add to calendar")}</a></article>;
  }))}</div></>;
}

export function DemoOrders({ lead }: { lead: CanonicalLead }) {
  useUILanguage();
  const suffix = lead.id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
  const orders = [
    { id: `DEMO-${suffix}-01`, product: 'Brand strategy session', type: 'Service', date: '2026-10-09', status: 'Paid', amount: 1200, fulfillment: 'Session booked' },
    { id: `DEMO-${suffix}-02`, product: 'The Brand Foundations', type: 'Course', date: '2026-10-10', status: 'Paid', amount: 349, fulfillment: 'Access delivered' },
    { id: `DEMO-${suffix}-03`, product: 'Launch-ready brand kit', type: 'Digital product', date: '2026-10-10', status: 'Pending payment', amount: 89, fulfillment: 'Awaiting payment' },
  ];
  return <><p className="crm-demo-label">{translateText("Sample orders · illustrative data · USD")}</p><div className="crm-order-metrics"><div><small>{translateText("Total ordered")}</small><b>$1,638</b></div><div><small>{translateText("Paid")}</small><b>$1,549</b></div><div><small>{translateText("Outstanding")}</small><b>$89</b></div></div><div className="crm-orders-table"><table><thead><tr><th className="text-start">{translateText("Product")}</th><th className="text-start">{translateText("Order / Date")}</th><th className="text-center">{translateText("Payment")}</th><th className="text-center">{translateText("Value")}</th><th className="text-center">{translateText("Fulfillment")}</th></tr></thead><tbody>{localizeNode(orders.map(order => <tr key={order.id}><td className="text-start"><span className="crm-order-product"><Package size={16}/><span><b>{localizeNode(order.product)}</b><small>{localizeNode(order.type)}</small></span></span></td><td className="text-start"><b>{localizeNode(order.id)}</b><small>{localizeNode(order.date)}</small></td><td className="text-center"><span className={`crm-status mx-auto inline-flex ${order.status === 'Paid' ? 'paid' : 'pending'}`}>{localizeNode(order.status)}</span></td><td className="text-center">{localizeNode(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.amount))}</td><td className="text-center">{localizeNode(order.fulfillment)}</td></tr>))}</tbody></table></div><Link className="crm-link-button" to="/dashboard/products">{translateText("Browse product catalog")}</Link></>;
}
