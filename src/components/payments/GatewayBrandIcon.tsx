import './gateway-brand.css';

const gatewayAssets: Record<string, string> = {
  stripe: 'stripe.svg', paddle: 'paddle.svg', fawry: 'fawry.png',
  kashier: 'kashier.png', paymob: 'paymob.svg',
};

export function GatewayBrandIcon({ provider }: { provider: string }) {
  const asset = gatewayAssets[provider];
  if (!asset) return null;
  return <span className={`gateway-brand-icon gateway-brand-${provider}`}><img src={`/payment-brands/${asset}`} alt="" aria-hidden="true"/></span>;
}

export const hasGatewayBrand = (provider: string) => Object.hasOwn(gatewayAssets, provider);
