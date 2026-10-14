import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, LockKeyhole, ShieldCheck, Loader2 } from 'lucide-react';
import type { Billing, Product } from './model';
import { defaultExperience, productKind } from './model';
import { checkoutTotals } from './checkout-model';
import { showToast } from '../../utils/toast';
import { recordTransaction } from './transactions';
import { addPurchasedProduct } from './purchases';

export function CheckoutScreen({ product, billing }: { product: Product; billing?: Billing }) {
  useUILanguage();
  const navigate = useNavigate();
  const c = product.config!;
  const e = c.experience ?? defaultExperience();
  const kind = productKind(product.type);
  const totals = checkoutTotals(product, billing);
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
    setIsSubmitting(true);
    setSubmitted(true);

    // 1. Automatically append that product to the "My Purchases" list
    if (product.id) addPurchasedProduct(product.id);
    if (product.name) addPurchasedProduct(product.name);

    // 2. Register purchase into transactions repository
    recordTransaction({
      productName: product.name,
      amount: money(totals.dueToday),
      status: 'Completed',
      customerName: fullName.trim() || 'Demo Customer',
      customerEmail: email.trim() || 'customer@example.com',
      method: method || 'Credit Card',
    });

    // 3. High-fidelity toast notification
    showToast.success('Payment Successful! Product added to your account');

    // 4. Smooth redirection back to Products & Payments dashboard focused on "My Purchases" tab
    setTimeout(() => {
      navigate('/dashboard/products-payments?tab=products&sub=purchases');
    }, 450);
  };

  return (
    <div className="cp-checkout">
      <main>
        <div className="cp-eyebrow">
          <LockKeyhole size={14}/>{translateText("CHECKOUT PREVIEW")}
        </div>
        <h1>{product.name}</h1>
        <p>{translateText("Secure checkout · Live transaction sync with your account.")}</p>

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
            <small>{translateText("Interactive payment simulation. Charges will be recorded into your dashboard transactions.")}</small>
          </fieldset>

          <button
            className="cp-primary"
            type="submit"
            disabled={!e.paymentMethods.length || isSubmitting}
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
            <p>{localizeNode(c.installments)}{translateText(" payments of ")}{localizeNode(money(totals.total))} · {localizeNode(e.paymentInterval.toLowerCase())}{translateText(" · Total including tax ")}{localizeNode(money(totals.total * c.installments))}</p>
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
