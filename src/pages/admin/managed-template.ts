import type { Template } from '../system-template-data';
import type { BuilderDocument } from '../BuilderWorkspace';
export type ManagedTemplate = Template & {
  active?: boolean; status?: 'Published' | 'Draft'; builderDocument?: BuilderDocument;
  assetType?: 'funnel' | 'website' | 'form' | 'booking' | 'product' | 'pipeline' | 'workspace';
  pageTemplate?: import('../page-template-data').PageTemplate;
  bookingPage?: import('../booking/model').BookingPage;
  productTemplate?: import('../commerce/productTemplates').ProductTemplate;
  pipelineTemplate?: { name: string; description: string; stages: string[] };
  schemaVersion?: number;
  /** Gallery card image shown to users; managed from the admin template editor. */
  thumbnail?: string;
};
export function templateIsActive(template: { active?: boolean; status?: string }) {
  return template.active !== false && (!template.status || template.status === 'Published');
}
