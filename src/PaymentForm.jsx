import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePublicKey = 'pk_live_51Rv1X3By3HHUeuve2mwl2HJqUYgFuSa2xWM6AwjbcM10Ts6jqdsrtT5RZ9DkK754BEHQ68jqKZ0w0N32zQHLT9Xr007tOweb2G'; // keep live key, per your plan

// A tiny wrapper to render the form inside a Stripe Elements context
export default function PaymentForm({ amount, description, email }) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  // Build clientSecret from backend
  useEffect(() => {
    const createPI = async () => {
      if (!amount) return;
      const amountCents = Math.round(parseFloat(amount) * 100);
      try {
        const resp = await fetch('/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountCents, currency: 'usd', description, receipt_email: email })
        });
        const data = await resp.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          console.error('No clientSecret returned', data);
        }
      } catch (err) {
        console.error('Error creating PaymentIntent', err);
      }
    };
    createPI();
  }, [amount, description, email]);

  // Ensure we have a clientSecret before rendering the form
  const options = useMemo(() => ({
    clientSecret,
    // Optional: appearance tweaks
    appearance: { theme: 'stripe' }
  }), [clientSecret]);

  // On submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: 'https://uniquitysolutions.com/success' } });
    if (error) {
      // Show error to your customer
      alert(error.message);
      setLoading(false);
    } else {
      // Payment completed or will redirect
    }
  };

  // Render only after clientSecret is ready
  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      {clientSecret ? (
        <Elements options={options} stripe={loadStripe(stripePublicKey)}>
          <PaymentElement />
        </Elements>
      ) : (
        <div>Loading payment form...</div>
      )}
      <button disabled={!clientSecret || loading} type="submit" id="pay-btn">
        {loading ? 'Processing...' : `Pay $${Number(amount || 0).toFixed(2)}`}
      </button>
    </form>
  );
}
