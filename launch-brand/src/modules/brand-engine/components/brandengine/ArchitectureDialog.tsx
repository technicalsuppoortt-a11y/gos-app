import { X, Workflow, TrendingUp, Route, Orbit, Boxes } from 'lucide-react';
import { Button } from "@/modules/brand-engine/components/ui/button";
import { steps } from "@/modules/brand-engine/data/mockData";
export function ArchitectureDialog({ id, onClose }: { id: number; onClose: () => void }) {
 const step = steps.find(s => s.id === id); const icons = { 7: Workflow, 9: Boxes, 10: TrendingUp, 11: Route, 12: Orbit }; const Icon = icons[id as keyof typeof icons] ?? Workflow;
 const details: Record<number,string> = { 7:"Your web experience, data, automations, and AI tools work as one connected system.",9:"Templates, modules, subscriptions, and services combine into a flexible business model.",10:"Subscriptions, marketplace sales, templates, and add-ons create multiple recurring revenue streams.",11:"Every stage—from signup and setup to launch and growth—is designed as one continuous journey.",12:"CRM, marketing, content, commerce, community, and AI share context inside one ecosystem." };
 return <div className="modal-backdrop" onMouseDown={onClose}><div className="architecture-modal animate-scale-in" onMouseDown={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="modal-close" onClick={onClose}><X /></Button><div className="architecture-icon"><Icon /></div><p className="eyebrow">Architecture · Step {id}</p><h2>{step?.title}</h2><p>{details[id]}</p><div className="architecture-flow"><span>Inputs</span><i /><span>Joe Academy</span><i /><span>Growth</span></div><Button onClick={onClose}>Got it</Button></div></div>;
}
