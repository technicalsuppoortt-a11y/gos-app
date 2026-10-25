export interface TrackingConfiguration {
  schemaVersion: number;
  metaId: string;
  googleId: string;
  enabled: boolean;
  customEvents: string[];
  advancedMode: boolean;
  webhookUrl: string;
}
export const trackingDefaults: Readonly<TrackingConfiguration>;
export function normalizeTrackingConfig(input?: unknown): TrackingConfiguration;
