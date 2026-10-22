import { useParams } from 'react-router-dom';
import { translateText, useUILanguage } from '../../i18n/display';
import './dynamic-checkout.css';

export function CommercePolicyPage() {
  useUILanguage();
  const { kind } = useParams();
  return <CommercePolicyDocument kind={kind === 'privacy' ? 'privacy' : 'terms'}/>;
}

export function CommercePolicyDocument({ kind }: { kind: 'terms' | 'privacy' }) {
  useUILanguage();
  const privacy = kind === 'privacy';
  return <main className="cx-policy-page"><span>GOS · {translateText('Checkout policies')}</span><h1>{translateText(privacy ? 'Privacy Policy' : 'Terms of Service')}</h1>{(privacy ? [
    ['Information collected', 'Checkout collects the contact details, billing details and custom information requested by the seller to process your order and provide access to your purchase.'],
    ['How information is used', 'Your information is used to fulfill purchases, send order communications, provide customer support and maintain transaction records. Payment credentials are handled by the connected payment provider.'],
    ['Sharing and retention', 'Order details may be shared with the seller and the service providers needed to deliver your purchase. Records are retained as needed for fulfillment and applicable recordkeeping requirements.'],
    ['Your choices', 'Contact the seller using the contact information on the product or order confirmation to request access, correction or deletion of your personal information. Some transaction records may need to be retained.'],
  ] : [
    ['Your purchase', 'Review the product description, price, currency, access conditions and any recurring or installment billing terms before placing your order. Optional add-ons are charged only when selected.'],
    ['Delivery and access', 'Services are delivered according to the seller’s booking and fulfillment instructions. Digital products and courses follow the access rules shown on the product page.'],
    ['Cancellations and refunds', 'Contact the seller for cancellations, rescheduling or refunds using the details provided with your order. Product-specific conditions and applicable consumer rights apply.'],
    ['Responsible use', 'Use purchased content for its stated purpose and respect the seller’s intellectual property. Do not share account credentials or redistribute paid resources without permission.'],
  ]).map(([title, body]) => <section key={title}><h2>{translateText(title)}</h2><p>{translateText(body)}</p></section>)}</main>;
}
