import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../../firebase';
import { libraryStorage } from '../../../firebaseLibrary';
import { useToast } from '../../../context/ToastContext';
import TermsContent from '../../../components/common/TermsContent';
import { X, ShieldCheck, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  paymentMethods,
  plans,
  userData, 
  adminUid, 
  adminBrandName, 
  lang 
}) {
  const toast = useToast();
  const [screenshot, setScreenshot] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [phoneInput, setPhoneInput] = useState(userData?.phoneNumber || '');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [isPaddleLoading, setIsPaddleLoading] = useState(false);

  // Check for existing pending payment whenever modal opens
  useEffect(() => {
    if (!isOpen || !userData?.uid) return;

    const checkPending = async () => {
      setCheckingPending(true);
      try {
        const q = query(
          collection(db, 'payments'),
          where('userId', '==', userData.uid),
          where('status', '==', 'pending')
        );
        const snap = await getDocs(q);
        setHasPendingRequest(!snap.empty);
      } catch (err) {
      console.error(err);
      if (err?.message === 'OUT_OF_CREDITS' || err?.message?.includes('OUT_OF_CREDITS')) {
        toast(lang === 'en' ? 'Monthly Credits Exhausted. Please add your Personal API Key in Settings.' : 'لقد نفد رصيدك الشهري. يرجى إضافة مفتاح الـ API الخاص بك في الإعدادات.', 'error');
      } else {
        toast(lang === 'en' ? 'Error generating AI response.' : 'حدث خطأ أثناء التوليد.', 'error');
      }
    } finally {
        setCheckingPending(false);
      }
    };

    // Reset states on open
    setSuccess(false);
    setError('');
    setScreenshot(null);
    checkPending();
  }, [isOpen, userData?.uid]);

  // Load and initialize Paddle SDK if client key is configured and enabled
  useEffect(() => {
    if (!isOpen || !paymentMethods?.paddleKeys?.enabled || !paymentMethods?.paddleKeys?.clientKey) return;

    const loadPaddle = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({ 
          token: paymentMethods.paddleKeys.clientKey,
          environment: paymentMethods.paddleKeys.environment || 'sandbox'
        });
        return;
      }

      const script = document.createElement('script');
      script.src = "https://cdn.paddle.com/paddle/v3/paddle.js";
      script.async = true;
      script.onload = () => {
        if (window.Paddle) {
          window.Paddle.Initialize({ 
            token: paymentMethods.paddleKeys.clientKey,
            environment: paymentMethods.paddleKeys.environment || 'sandbox'
          });
        }
      };
      document.body.appendChild(script);
    };

    loadPaddle();
  }, [isOpen, paymentMethods?.paddleKeys?.enabled, paymentMethods?.paddleKeys?.clientKey, paymentMethods?.paddleKeys?.environment]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!screenshot) {
      setError(lang?.startsWith('ar') ? 'يرجى إرفاق صورة التحويل' : 'Please upload transfer screenshot');
      return;
    }
    if (!acceptedTerms) {
      setError(lang?.startsWith('ar') ? 'يجب الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة' : 'You must accept the Terms & Conditions and Privacy Policy to continue');
      return;
    }
    if (!phoneInput) {
      setError(lang?.startsWith('ar') ? 'يرجى إدخال رقم الهاتف' : 'Please enter your phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload image
      const imgRef = ref(libraryStorage, `payments/${Date.now()}_${userData.uid}_${screenshot.name}`);
      await uploadBytes(imgRef, screenshot);
      const screenshotUrl = await getDownloadURL(imgRef);

      // Save to Firestore
      await addDoc(collection(db, 'payments'), {
        userId: userData.uid,
        userName: userData.ownerName || 'User',
        userEmail: userData.email,
        userPhone: phoneInput,
        adminUid: adminUid,
        brandName: adminBrandName,
        screenshotUrl: screenshotUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setHasPendingRequest(true);
    } catch (err) {
      console.error(err);
      if (err?.message === 'OUT_OF_CREDITS' || err?.message?.includes('OUT_OF_CREDITS')) {
        toast(lang === 'en' ? 'Monthly Credits Exhausted. Please add your Personal API Key in Settings.' : 'لقد نفد رصيدك الشهري. يرجى إضافة مفتاح الـ API الخاص بك في الإعدادات.', 'error');
      } else {
        toast(lang === 'en' ? 'Error generating AI response.' : 'حدث خطأ أثناء التوليد.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!selectedPlanId) {
      setError(lang?.startsWith('ar') ? 'يرجى اختيار الباقة أولاً' : 'Please select a plan first');
      return;
    }
    if (!acceptedTerms) {
      setError(lang?.startsWith('ar') ? 'يجب الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة' : 'You must accept the Terms & Conditions and Privacy Policy to continue');
      return;
    }

    const selectedPlan = plans?.find(p => p.id === Number(selectedPlanId) || p.name === selectedPlanId);
    
    setIsStripeLoading(true);
    setError('');
    try {
      // Use deployed backend URL in production, localhost for dev
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.uid,
          adminUid: adminUid,
          planId: selectedPlan?.id || selectedPlanId,
          planName: selectedPlan?.name_ar || selectedPlan?.name || 'Subscription',
          planPrice: selectedPlan?.price || 0,
          planCurrency: 'EGP', // or fetch from plan if available
          durationDays: selectedPlan?.durationDays || selectedPlan?.duration || 30,
          successUrl: window.location.href.split('?')[0] + '?payment=success',
          cancelUrl: window.location.href.split('?')[0] + '?payment=cancel'
        })
      });
      const data = await response.json();
      if (data.url) {
        window.top.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error(err);
      if (err?.message === 'OUT_OF_CREDITS' || err?.message?.includes('OUT_OF_CREDITS')) {
        toast(lang === 'en' ? 'Monthly Credits Exhausted. Please add your Personal API Key in Settings.' : 'لقد نفد رصيدك الشهري. يرجى إضافة مفتاح الـ API الخاص بك في الإعدادات.', 'error');
      } else {
        toast(lang === 'en' ? 'Error generating AI response.' : 'حدث خطأ أثناء التوليد.', 'error');
      }
    } finally {
      setIsStripeLoading(false);
    }
  };

  const handlePaddleCheckout = async () => {
    if (!selectedPlanId) {
      setError(lang?.startsWith('ar') ? 'يرجى اختيار الباقة أولاً' : 'Please select a plan first');
      return;
    }
    if (!acceptedTerms) {
      setError(lang?.startsWith('ar') ? 'يجب الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة' : 'You must accept the Terms & Conditions and Privacy Policy to continue');
      return;
    }

    const selectedPlan = plans?.find(p => p.id === Number(selectedPlanId) || p.name === selectedPlanId);
    if (!selectedPlan?.paddlePriceId) {
      setError(lang?.startsWith('ar') 
        ? 'بوابة Paddle غير مهيأة لهذه الباقة. يرجى اختيار وسيلة دفع أخرى أو مراجعة المشرف.' 
        : 'Paddle is not configured for this plan. Please select another payment method or contact support.');
      return;
    }

    if (!window.Paddle) {
      setError(lang?.startsWith('ar') ? 'فشل تحميل مكتبة دفع Paddle' : 'Failed to load Paddle SDK');
      return;
    }

    setIsPaddleLoading(true);
    setError('');
    try {
      window.Paddle.Checkout.open({
        items: [
          {
            priceId: selectedPlan.paddlePriceId,
            quantity: 1
          }
        ],
        customer: {
          email: userData.email
        },
        customData: {
          userId: userData.uid,
          adminUid: adminUid,
          planId: (selectedPlan.id || selectedPlanId).toString(),
          durationDays: (selectedPlan.durationDays || selectedPlan.duration || 30).toString()
        }
      });
    } catch (err) {
      console.error(err);
      if (err?.message === 'OUT_OF_CREDITS' || err?.message?.includes('OUT_OF_CREDITS')) {
        toast(lang === 'en' ? 'Monthly Credits Exhausted. Please add your Personal API Key in Settings.' : 'لقد نفد رصيدك الشهري. يرجى إضافة مفتاح الـ API الخاص بك في الإعدادات.', 'error');
      } else {
        toast(lang === 'en' ? 'Error generating AI response.' : 'حدث خطأ أثناء التوليد.', 'error');
      }
    } finally {
      setIsPaddleLoading(false);
    }
  };

  return (
    <div className="payment-modal-overlay" style={overlayStyle}>
      <div className="payment-modal-card" style={cardStyle} dir={lang?.startsWith('ar') ? 'rtl' : 'ltr'}>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
        
        {checkingPending ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '3px solid var(--line)', borderTopColor: 'var(--accent)',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
            }} />
            <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
              {lang?.startsWith('ar') ? 'جاري التحقق...' : 'Checking...'}
            </p>
          </div>
        ) : hasPendingRequest && !success ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏳</div>
            <h3 style={{ color: '#F59E0B', marginBottom: '12px', fontSize: '18px' }}>
              {lang?.startsWith('ar') ? 'طلبك قيد المراجعة حالياً' : 'Your Request is Under Review'}
            </h3>
            <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' }}>
              {lang?.startsWith('ar')
                ? 'لقد قمت بإرسال طلب اشتراك مسبقاً وهو الآن قيد المراجعة من قِبَل الفريق. سيتم تفعيل اشتراكك فور التحقق من التحويل.'
                : 'You have already submitted a subscription request and it is currently under review by our team. Your subscription will be activated once the transfer is verified.'}
            </p>
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#F59E0B'
            }}>
              {lang?.startsWith('ar')
                ? '✅ تم استلام طلبك. يُرجى الانتظار حتى يتم مراجعته والرد عليك.'
                : '✅ Your request has been received. Please wait while it is reviewed.'}
            </div>
            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              {lang?.startsWith('ar') ? 'حسناً، سأنتظر' : 'OK, I will wait'}
            </button>
          </div>
        ) : success ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
            <h3 style={{ color: 'var(--green)', marginBottom: '10px' }}>
              {lang?.startsWith('ar') ? 'تم إرسال طلبك بنجاح' : 'Request Submitted Successfully'}
            </h3>
            <p style={{ color: 'var(--text2)' }}>
              {lang?.startsWith('ar') 
                ? 'الطلب الآن قيد المراجعة، سيتم تفعيل اشتراكك بمجرد التأكد من التحويل.' 
                : 'Your request is under review. Your subscription will be activated once the transfer is verified.'}
            </p>
            <button onClick={onClose} className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }}>
              {lang?.startsWith('ar') ? 'حسناً' : 'OK'}
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ marginBottom: '16px', color: '#fff' }}>
              {lang?.startsWith('ar') ? 'الدفع والاشتراك' : 'Pay and Subscribe'}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '24px' }}>
              {lang?.startsWith('ar') 
                ? 'يرجى اختيار الباقة المناسبة، ثم الدفع عبر البطاقة البنكية أو التحويل لإحدى المحافظ.' 
                : 'Please select a plan, then pay via Credit Card or transfer to one of the wallets.'}
            </p>

            {plans && plans.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text2)', fontSize: '14px' }}>
                  {lang?.startsWith('ar') ? 'اختر الباقة:' : 'Select Plan:'}
                </label>
                <select 
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  style={inputStyle}
                  dir={lang?.startsWith('ar') ? 'rtl' : 'ltr'}
                >
                  <option value="">{lang?.startsWith('ar') ? '-- اختر الباقة --' : '-- Select a Plan --'}</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name_ar || p.name} - {p.price} {p.currency || 'EGP'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px', color: '#fff' }}>
                {lang?.startsWith('ar') ? 'المحافظ المتاحة:' : 'Available Wallets:'}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text)' }}>
                {paymentMethods?.vodafone && (
                  <li style={walletItemStyle}>
                    <span style={{color: '#E60000', fontWeight: 'bold'}}>Vodafone Cash:</span> 
                    <span dir="ltr">{paymentMethods.vodafone}</span>
                  </li>
                )}
                {paymentMethods?.etisalat && (
                  <li style={walletItemStyle}>
                    <span style={{color: '#006B33', fontWeight: 'bold'}}>Etisalat Cash:</span> 
                    <span dir="ltr">{paymentMethods.etisalat}</span>
                  </li>
                )}
                {paymentMethods?.orange && (
                  <li style={walletItemStyle}>
                    <span style={{color: '#FF6600', fontWeight: 'bold'}}>Orange Cash:</span> 
                    <span dir="ltr">{paymentMethods.orange}</span>
                  </li>
                )}
                {paymentMethods?.instapay && (
                  <li style={walletItemStyle}>
                    <span style={{color: '#8A2BE2', fontWeight: 'bold'}}>InstaPay:</span> 
                    <span dir="ltr">{paymentMethods.instapay}</span>
                  </li>
                )}
                {!paymentMethods?.vodafone && !paymentMethods?.etisalat && !paymentMethods?.orange && !paymentMethods?.instapay && (
                  <li style={{ color: 'var(--text3)' }}>
                    {lang?.startsWith('ar') ? 'لا توجد محافظ متاحة حالياً' : 'No wallets available currently'}
                  </li>
                )}
              </ul>
            </div>

            {(paymentMethods?.stripeKeys?.publishableKey || (paymentMethods?.paddleKeys?.enabled && paymentMethods?.paddleKeys?.clientKey)) && (
              <div style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
                
                {/* TERMS CHECKBOX FOR ELECTRONIC PAYMENT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div
                    onClick={() => setAcceptedTerms(!acceptedTerms)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '6px',
                      border: `1.5px solid ${acceptedTerms ? 'var(--accent, #3B82F6)' : 'rgba(255,255,255,0.3)'}`,
                      background: acceptedTerms ? 'var(--accent, #3B82F6)' : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    {acceptedTerms && <Check size={14} color="#fff" />}
                  </div>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                    {lang?.startsWith('ar') ? 'أوافق على ' : 'I agree to the '}
                    <span 
                      onClick={() => setShowTermsModal(true)}
                      style={{ color: 'var(--accent, #3B82F6)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {lang?.startsWith('ar') ? 'الشروط والأحكام وسياسة الخصوصية' : 'Terms & Conditions and Privacy Policy'}
                    </span>
                  </span>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '12px', marginTop: '-8px' }}>
                  {lang?.startsWith('ar') ? 'بإتمام عملية الشراء، فإنك توافق على الشروط والأحكام وسياسة الاسترجاع.' : 'By completing the purchase, you agree to the Terms and Conditions and Refund Policy.'}
                </p>

                <h4 style={{ marginBottom: '12px', color: '#fff' }}>
                  {lang?.startsWith('ar') ? 'أو الدفع الإلكتروني السريع:' : 'Or Fast Electronic Payment:'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                  {paymentMethods?.stripeKeys?.publishableKey && (
                    <button 
                      onClick={handleStripeCheckout}
                      disabled={isStripeLoading}
                      style={{
                        width: '100%',
                        background: '#6772E5',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        boxShadow: '0 4px 10px rgba(103, 114, 229, 0.3)',
                        cursor: isStripeLoading ? 'not-allowed' : 'pointer',
                        opacity: isStripeLoading ? 0.7 : 1
                      }}
                    >
                      {isStripeLoading ? '⏳ ...' : '💳 ' + (lang?.startsWith('ar') ? 'الدفع الآمن عبر Stripe' : 'Secure Payment via Stripe')}
                    </button>
                  )}
                  {paymentMethods?.paddleKeys?.enabled && paymentMethods?.paddleKeys?.clientKey && (
                    <button 
                      onClick={handlePaddleCheckout}
                      disabled={isPaddleLoading}
                      style={{
                        width: '100%',
                        background: '#00bfff',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        boxShadow: '0 4px 10px rgba(0, 191, 255, 0.3)',
                        cursor: isPaddleLoading ? 'not-allowed' : 'pointer',
                        opacity: isPaddleLoading ? 0.7 : 1
                      }}
                    >
                      {isPaddleLoading ? '⏳ ...' : '💳 ' + (lang?.startsWith('ar') ? 'الدفع الآمن عبر Paddle' : 'Secure Payment via Paddle')}
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text2)', fontSize: '14px' }}>
                  {lang?.startsWith('ar') ? 'رقم الهاتف (الذي تم التحويل منه):' : 'Phone Number (transferred from):'}
                </label>
                <input 
                  type="text" 
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  style={inputStyle}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text2)', fontSize: '14px' }}>
                  {lang?.startsWith('ar') ? 'إرفاق صورة التحويل:' : 'Attach Transfer Screenshot:'}
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  style={fileInputStyle}
                />
              </div>

              {/* TERMS CHECKBOX FOR MANUAL PAYMENT */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <div
                  onClick={() => setAcceptedTerms(!acceptedTerms)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: `1.5px solid ${acceptedTerms ? 'var(--accent, #3B82F6)' : 'rgba(255,255,255,0.3)'}`,
                    background: acceptedTerms ? 'var(--accent, #3B82F6)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {acceptedTerms && <Check size={14} color="#fff" />}
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                  {lang?.startsWith('ar') ? 'أوافق على ' : 'I agree to the '}
                  <span 
                    onClick={() => setShowTermsModal(true)}
                    style={{ color: 'var(--accent, #3B82F6)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {lang?.startsWith('ar') ? 'الشروط والأحكام وسياسة الخصوصية' : 'Terms & Conditions and Privacy Policy'}
                  </span>
                </span>
              </div>

              {error && <div style={{ color: 'var(--red)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (lang?.startsWith('ar') ? 'جاري الإرسال...' : 'Submitting...') : (lang?.startsWith('ar') ? 'تأكيد الدفع' : 'Confirm Payment')}
              </button>
            </form>
          </>
        )}
      </div>

      {/* TERMS MODAL */}
      <AnimatePresence>
        {showTermsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(12px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                background: 'var(--bg2, #0D1220)',
                width: '100%',
                maxWidth: '700px',
                borderRadius: '24px',
                border: '1px solid var(--line, rgba(255,255,255,0.08))',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid var(--line, rgba(255,255,255,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="var(--accent, #3B82F6)" />
                  {lang?.startsWith('ar') ? 'الشروط والأحكام وسياسة الخصوصية' : 'Terms & Conditions'}
                </h3>
                <button
                  onClick={() => setShowTermsModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'var(--text2, #94A3B8)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text2, #94A3B8)'; }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="custom-scrollbar" style={{
                padding: '24px',
                maxHeight: '75vh',
                overflowY: 'auto'
              }}>
                <TermsContent isRtl={lang?.startsWith('ar')} />
              </div>
              
              {/* Modal Footer */}
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid var(--line, rgba(255,255,255,0.08))',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                  }}
                  style={{
                    background: 'var(--accent, #3B82F6)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Check size={16} />
                  {lang?.startsWith('ar') ? 'موافق' : 'I Agree'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline Styles for isolation
const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100000,
  backdropFilter: 'blur(4px)',
};

const cardStyle = {
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--line)',
  borderRadius: '24px',
  padding: '32px',
  width: '90%',
  maxWidth: '500px',
  position: 'relative',
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
};

const closeBtnStyle = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text3)',
  fontSize: '20px',
  cursor: 'pointer',
};

const walletItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid var(--line)',
  fontSize: '15px'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: 'var(--bg2)',
  border: '1px solid var(--line)',
  borderRadius: '8px',
  color: 'var(--text)',
  outline: 'none',
  fontSize: '14px',
};

const fileInputStyle = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: 'var(--bg2)',
  border: '1px solid var(--line)',
  borderRadius: '8px',
  color: 'var(--text)',
  outline: 'none',
  fontSize: '14px',
};
