import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useState } from 'react';
import { useProducts } from './repository';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, LockKeyhole, ShieldCheck, Loader2 } from 'lucide-react';
import type { Billing, Product } from './model';
import { defaultExperience, productKind } from './model';
import { checkoutTotals } from './checkout-model';
import { showToast } from '../../utils/toast';
import { addPurchasedProduct } from './purchases';

export function CheckoutScreen({ product, billing }: { product: Product; billing?: Billing }) {
  useUILanguage();
  const navigate = useNavigate();
  const c = product.config!;
  const e = c.experience ?? defaultExperience();
  const kind = productKind(product.type);
  const products = useProducts();
  const [acceptedTerms, setAcceptedTerms] = useState(false), [bumpSelected, setBumpSelected] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const bump = e.checkout.bumpEnabled && products.find(item => item.id === e.checkout.bumpProductId && item.status === 'Active' && item.config?.currency === c.currency);
  const totals = checkoutTotals(product, billing, bumpSelected && bump ? bump.config?.amount : 0, couponCode);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMethod, setMethod] = useState(e.paymentMethods[0] ?? '');
  const method = e.paymentMethods.includes(selectedMethod) ? selectedMethod : e.paymentMethods[0] ?? '';
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [payment, setPayment] = useState({ number: '', expiry: '', cvc: '', paypal: '' });
  const [walletReady, setWalletReady] = useState(false);
  const cardMethod = method === 'Visa' || method === 'Mastercard';
  const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c.currency }).format(value);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    showToast.info('Connect a payment provider in Settings before accepting payments.');
  };

  return (
    <div className="cp-checkout">
      <main>
        <div className="cp-eyebrow">
          <LockKeyhole size={14}/>{translateText("CHECKOUT PREVIEW")}
        </div>
        <h1>{product.name}</h1>
        <p>{translateText("Checkout preview · connect a payment provider to accept payments.")}</p>

        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>{translateText("1. Your information")}</legend>
            <label>
              {translateText("Email address")}
              <input
                type="email"
                placeholder={translateText("you@example.com")}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>
            {localizeNode(e.checkout.collectInfo && (
              <label>
                {translateText("Full name")}
                <input
                  autoComplete="name"
                  placeholder={translateText("Your name")}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </label>
            ))}
            {localizeNode(e.checkout.requirePhone && (
              <label>
                {translateText("Phone number")}
                <input type="tel" placeholder={translateText("+1 555 012 3456")} required/>
              </label>
            ))}
            {localizeNode(c.checkoutFields.split(',').map(value => value.trim()).filter(Boolean).map((field, i) => (
              <label key={i}>
                {localizeNode(field)}
                <input placeholder={translateText(field)}/>
              </label>
            )))}
          </fieldset>

          <fieldset>
            <legend>{translateText("2. Payment details")}</legend>
            <div className="cp-payment-methods" role="group" aria-label={translateText("Payment method")}>
              {localizeNode(e.paymentMethods.map(option => (
                <button
                  type="button"
                  aria-pressed={method === option}
                  className={method === option ? 'selected' : ''}
                  key={option}
                  onClick={() => { setMethod(option); setWalletReady(false); setSubmitted(false); }}
                >
                  {localizeNode(option)}
                  {localizeNode(method === option && <Check size={12}/>)}
                </button>
              )))}
            </div>

            {localizeNode(!e.paymentMethods.length ? (
              <p role="status">{translateText("No payment methods enabled. Enable a method in checkout settings to preview payment details.")}</p>
            ) : cardMethod ? (
              <>
                <label>
                  {translateText("Card number")}
                  <div className="cp-card-field">
                    <CreditCard size={17}/>
                    <input
                      placeholder={translateText("4242 4242 4242 4242")}
                      aria-label={translateText("Mock card number")}
                      inputMode="numeric"
                      maxLength={23}
                      value={payment.number}
                      onChange={event => { setPayment({ ...payment, number: event.target.value.replace(/[^0-9 ]/g, '') }); setSubmitted(false); }}
                    />
                  </div>
                </label>
                <div className="cp-two-fields">
                  <label>
                    {translateText("Expiry date")}
                    <input
                      placeholder={translateText("MM / YY")}
                      inputMode="numeric"
                      maxLength={7}
                      value={payment.expiry}
                      onChange={event => setPayment({ ...payment, expiry: event.target.value })}
                    />
                  </label>
                  <label>
                    {translateText("Security code")}
                    <input
                      placeholder={translateText("CVC")}
                      inputMode="numeric"
                      maxLength={4}
                      value={payment.cvc}
                      onChange={event => setPayment({ ...payment, cvc: event.target.value.replace(/\D/g, '') })}
                    />
                  </label>
                </div>
              </>
            ) : method === 'PayPal' ? (
              <label>
                {translateText("PayPal email")}
                <input
                  type="email"
                  placeholder={translateText("paypal@example.com")}
                  value={payment.paypal}
                  onChange={event => setPayment({ ...payment, paypal: event.target.value })}
                />
              </label>
            ) : (
              <div className="cp-wallet-preview">
                <p>{translateText("Preview the ")}{localizeNode(method)}{translateText(" payment experience.")}</p>
                <button type="button" className="cw-button" aria-pressed={walletReady} onClick={() => setWalletReady(current => !current)}>
                  {localizeNode(walletReady ? 'Demo wallet selected ✓' : 'Select demo wallet')}
                </button>
              </div>
            ))}
            <small>{translateText("Checkout preview. Payments require a connected payment provider.")}</small>
          </fieldset>
          {bump && <label><input type="checkbox" checked={bumpSelected} onChange={event => setBumpSelected(event.target.checked)}/>{bump.name} · {money(bump.config!.amount)}</label>}
          {e.coupon.enabled && <label>{translateText('Discount code')}<input value={couponCode} onChange={event => setCouponCode(event.target.value)}/></label>}
          {e.checkout.requireTerms && <label><input type="checkbox" required checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)}/>{translateText('I agree to the terms and privacy policy')}{e.checkout.termsUrl && <a href={e.checkout.termsUrl} target="_blank" rel="noreferrer">{translateText('Terms')}</a>}{e.checkout.privacyUrl && <a href={e.checkout.privacyUrl} target="_blank" rel="noreferrer">{translateText('Privacy policy')}</a>}</label>}

          <button
            className="cp-primary"
            type="submit"
            disabled={!e.paymentMethods.length || isSubmitting || !!e.checkout.requireTerms && !acceptedTerms}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {translateText("Processing & Syncing...")}
              </>
            ) : (
              <>
                {translateText("Complete ")}{localizeNode(kind === 'course' ? 'Enrollment' : kind === 'service' ? 'Booking' : 'Purchase')} · {localizeNode(money(totals.dueToday))}
              </>
            )}
          </button>

          {localizeNode(submitted && !isSubmitting && (
            <p className="cp-success" role="status">
              <Check size={16}/>{translateText("Payment successful! Redirecting to products & payments...")}
            </p>
          ))}
        </form>

        <div className="cp-guarantees">
          <span><ShieldCheck size={17}/>{translateText("Protected checkout")}</span>
          <span><LockKeyhole size={17}/>{translateText("Private customer details")}</span>
          <span><Check size={17}/>{translateText("Clear pricing")}</span>
        </div>
      </main>

      <aside>
        <div className="cp-order-summary">
          {product.image && <img src={product.image} alt={translateText(product.name)}/>}
          <span className="cp-eyebrow">{translateText("ORDER SUMMARY")}</span>
          <h2>{product.name}</h2>
          <p>{localizeNode(e.shortDescription || product.description.slice(0, 160))}</p>
          <div>
            <span>{localizeNode(totals.selected === 'One-time' ? 'Product price' : 'First payment')}</span>
            <b>{localizeNode(money(totals.subtotal))}</b>
          </div>
          <div>
            <span>{translateText("Tax (")}{localizeNode(c.taxRate)}%{localizeNode(totals.included ? ', included' : '')})</span>
            <b>{localizeNode(money(totals.tax))}</b>
          </div>
          <div className="cp-total">
            <span>{translateText("Due today")}</span>
            <b>{localizeNode(money(totals.dueToday))}</b>
          </div>
          {localizeNode(totals.selected === 'Payment plan' && (
            <p>{localizeNode(c.installments)}{translateText(" payments of ")}{localizeNode(money(totals.total))} · {localizeNode(e.paymentInterval.toLowerCase())}{translateText(" · Total including tax ")}{localizeNode(money(totals.total * c.installments + totals.bumpTotal))}</p>
          ))}
          {localizeNode(totals.selected === 'Subscription' && (
            <p>{translateText("Renews ")}{localizeNode(c.frequency.toLowerCase())}{translateText(" at ")}{localizeNode(money(totals.total))}{localizeNode(c.trialDays ? ` · ${c.trialDays}-day trial configured` : '')}</p>
          ))}
          <small>{localizeNode(kind === 'service' ? `${c.duration} minutes · ${e.serviceMode}` : `${c.access} · ${e.accessRule}`)}</small>
        </div>
      </aside>
    </div>
  );
}
