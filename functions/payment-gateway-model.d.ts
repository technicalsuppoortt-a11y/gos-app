export type GatewayProvider = 'paddle' | 'paymob' | 'stripe' | 'paypal' | 'paytabs' | 'fawry' | 'kashier';
export interface GatewayField { key: string; label: string; secret?: boolean; optional?: boolean }
export interface GatewaySummary { fields: Record<string, string>; configuredSecrets: Record<string, boolean>; mode: 'sandbox' | 'live'; region: string }
export const gatewayFields: Record<GatewayProvider, GatewayField[]>;
export const paytabsRegions: string[];
export function gatewaySummary(provider: GatewayProvider, config?: Record<string, unknown>): GatewaySummary;
