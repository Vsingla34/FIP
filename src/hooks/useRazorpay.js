import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';

function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    if (document.getElementById('rzp-sdk')) { resolve(true); return; }
    const s = document.createElement('script');
    s.id  = 'rzp-sdk';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function useRazorpay() {
  const { user, profile, fetchProfile } = useAuth();
  const { showToast } = useApp();

  const pay = useCallback(async ({
    purchaseType,  // 'membership' | 'course'
    planName,      // 'Standard' | 'Renewal'  (membership only)
    itemRefId,     // course slug              (course only)
    onSuccess,     // callback after verified
  }) => {
    if (!user) { showToast('Please log in first.', true); return false; }

    // 1. Load Razorpay SDK
    const loaded = await loadRazorpayScript();
    if (!loaded) { showToast('Payment gateway failed to load. Please check your connection.', true); return false; }

    // 2. Create order on backend
    let orderData;
    try {
      const res = await fetch('/api/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, purchaseType, planName, itemRefId }),
      });

      // On localhost Vite dev server, /api routes return 404
      if (res.status === 404) {
        showToast('Payment only works on the live site (Vercel). Push to deploy and test there.', true);
        return false;
      }

      orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || 'Failed to create order');
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('Failed to fetch')) {
        showToast('Payment only works on the live deployed site, not localhost.', true);
        return false;
      }
      showToast('Could not initiate payment: ' + err.message, true);
      return false;
    }

    // 3. Open Razorpay checkout
    return new Promise(resolve => {
      const rzp = new window.Razorpay({
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    orderData.currency || 'INR',
        name:        'Federation of Indian Professionals',
        description: orderData.itemName,
        image:       '/fip-logo.png',
        order_id:    orderData.orderId,
        prefill: {
          name:    orderData.prefill?.name  || profile?.full_name || '',
          email:   orderData.prefill?.email || user.email || '',
          contact: profile?.phone || '',
        },
        theme:  { color: '#1A3C6E' },
        modal:  {
          confirm_close: true,
          escape: false,
          ondismiss: async () => {
            // User closed the popup without paying — mark order as failed
            try {
              await fetch('/api/create-order', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ razorpayOrderId: orderData.orderId }),
              });
            } catch (e) { /* best effort, ignore */ }
            showToast('Payment cancelled.', true);
            resolve(false);
          },
        },

        handler: async (response) => {
          // 4. Verify on backend
          try {
            const vRes = await fetch('/api/verify-payment', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                userId: user.id,
              }),
            });
            const result = await vRes.json();
            if (!vRes.ok || !result.verified) throw new Error('Verification failed');

            // 5. Refresh profile so UI updates immediately
            await fetchProfile(user.id);

            showToast('Payment successful! 🎉');
            onSuccess?.(result.payment);
            resolve(true);
          } catch (err) {
            showToast('Payment received but verification failed. Contact support.', true);
            resolve(false);
          }
        },
      });

      rzp.on('payment.failed', resp => {
        showToast('Payment failed: ' + (resp.error?.description || 'Please try again.'), true);
        resolve(false);
      });

      rzp.open();
    });
  }, [user, profile, fetchProfile, showToast]);

  return { pay };
}