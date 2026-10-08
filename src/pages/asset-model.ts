import { createBuilderDocument } from './BuilderWorkspace';
import type { BuilderDocument } from './BuilderWorkspace';
export type BuilderMode = 'funnel' | 'website';
export type Asset = {
    id: string;
    kind: BuilderMode;
    name: string;
    domain: string;
    image: string;
    updated: string;
    archived?: boolean;
    sampleData?: boolean;
    integrations?: Record<string, { enabled: boolean; configuration: string }>;
    document: BuilderDocument;
    description: string;
    settings: {
        seo: string;
        navigation: string;
        color: string;
    };
};
export type Domain = {
    id: string;
    name: string;
    status: 'Connected' | 'Pending' | 'Disconnected';
    assetId: string;
    ssl: 'Active' | 'Not configured' | 'Inactive';
    default: boolean;
    renewalAt?: string | null;
};
export type Workspace = {
    assets: Asset[];
    domains: Domain[];
};
export type Dialog = {
    type: 'create' | 'rename' | 'delete' | 'add' | 'domain' | 'domain-select' | 'preview' | 'ai';
    assetId?: string;
    pageId?: string;
    template?: string;
    domainId?: string;
};
export const storageKey = 'gos.assets.workspace.v1';
export const images = { fitness: '/dashboard/funnel-fitness.png', nutrition: '/dashboard/funnel-nutrition.png', consultation: '/dashboard/funnel-consultation.png', agency: '/dashboard/funnel-consultation.png' };
export const templates = ['Coaching Website', 'Local Business', 'E-commerce', 'Agency Website', 'Clinic Website'];
export function seedWorkspace(): Workspace {
    const rows: [
        string,
        BuilderMode,
        string,
        string,
        string,
        number,
        boolean
    ][] = [
        ['fitness', 'funnel', 'Fitness Coaching Funnel', 'fitzone.com', images.fitness, 5, true], ['nutrition', 'funnel', 'Nutrition Plan Funnel', 'nutritionpro.com', images.nutrition, 4, true], ['consultation', 'funnel', 'Free Consultation Funnel', 'coachjoe.com', images.consultation, 3, true], ['gym', 'funnel', 'Gym Membership Funnel', 'mygym.com', images.fitness, 3, false], ['training', 'funnel', 'Personal Training Funnel', 'trainwithus.com', images.fitness, 5, true], ['agency', 'funnel', 'Agency Application Funnel', 'agencypro.com', images.agency, 4, true], ['fitzone-site', 'website', 'FitZone Website', 'fitzone.com', images.fitness, 7, true], ['nutrition-site', 'website', 'Nutrition Pro', 'nutritionpro.com', images.nutrition, 6, true], ['cafe-site', 'website', 'Yalla Cafe', 'yallacafe.nl', images.consultation, 5, false], ['agency-site', 'website', 'Joe Agency', 'joegroup.co', images.agency, 7, true]
    ];
    return { assets: rows.map(([id, kind, name, domain, image, count, published], i) => { const document = createBuilderDocument(kind, name, image, count); document.funnel.status = published ? 'Published' : 'Draft';
        document.pages.forEach(page => { page.status = page.id === 'blog' ? 'Draft' : document.funnel.status; }); return { id, kind, name, domain, image, document, sampleData:true, updated: new Date(Date.UTC(2026, 9, 8 - i)).toISOString(), description: kind === 'website' ? ['Fitness coaching & programs', 'Nutrition plans and coaching', 'Juices, desserts and more', 'Marketing agency website'][i - 6] : 'A connected journey for your customers', settings: { seo: name, navigation: document.pages.map(page => page.name).join(', '), color: '#6366f1' } }; }), domains: [{ id: 'd1', name: 'fitzone.com', status: 'Connected', assetId: 'fitness', ssl: 'Active', default: true }, { id: 'd2', name: 'coachgrowth.com', status: 'Connected', assetId: 'fitzone-site', ssl: 'Active', default: false }, { id: 'd3', name: 'mygym.com', status: 'Connected', assetId: 'gym', ssl: 'Active', default: false }, { id: 'd4', name: 'nutritionpro.com', status: 'Connected', assetId: 'nutrition-site', ssl: 'Active', default: false }, { id: 'd5', name: 'agencypro.com', status: 'Pending', assetId: '', ssl: 'Not configured', default: false }, { id: 'd6', name: 'consultation.co', status: 'Disconnected', assetId: '', ssl: 'Inactive', default: false }] };
}
export function readWorkspace(): Workspace { try {
    const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (data?.assets && data?.domains)
        return data;
}
catch { /* Storage unavailable. */ } return seedWorkspace(); }
