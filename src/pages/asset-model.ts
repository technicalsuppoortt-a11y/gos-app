import { cloudStorage } from '../backend/workspace';
import { createBuilderDocument } from './BuilderWorkspace';
import type { BuilderDocument } from './BuilderWorkspace';
export type BuilderMode = 'funnel' | 'website';
export type Asset = {
    id: string;
    kind: BuilderMode;
    name: string;
    domain: string;
    publishedUrl?: string;
    image: string;
    updated: string;
    archived?: boolean;
    sampleData?: boolean;
    formAsset?: boolean;
    crmRouting?: { pipelineId?: string; stageId?: string };
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
    siteId?: string;
    dnsRecords?: { domainName: string; type: string; rdata: string; requiredAction?: string }[];
    issues?: string[];
    checkedAt?: string;
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
export function seedWorkspace(): Workspace { return { assets: [], domains: [] }; }
export function readWorkspace(): Workspace { try {
    const data = JSON.parse(cloudStorage.getItem(storageKey) || 'null');
    if (data?.assets && data?.domains)
        return data;
}
catch { /* Storage unavailable. */ } return seedWorkspace(); }
