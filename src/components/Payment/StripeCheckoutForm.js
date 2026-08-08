import React, { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import './StripeCheckoutForm.css';
import { db } from '../../lib/supabase';

const StripeCheckoutForm = ({ amount, paymentType, referenceId, payerInfo = {}, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const cardElement = elements.getElement(CardElement);
      const { token, error: tokenError } = await stripe.createToken(cardElement, {
        name: payerInfo.name || undefined,
      });
      if (tokenError) throw new Error(tokenError.message);

      const basePayload = {
        // Map to your table's NOT NULL columns
        payment_type: paymentType,
        type: paymentType,
        reference_id: referenceId,
        payment_mode: 'online',
        payment_method: 'stripe',
        method: 'stripe',
        amount,
        currency: 'USD',
        status: 'requires_processing',
        payer_name: payerInfo.name || null,
        payer_email: payerInfo.email || null,
        payer_phone: payerInfo.phone || null,
        stripe_token_id: token.id
      };

      // Attempt insert with minor fallback for unknown columns
      let payload = { ...basePayload };
      let inserted = null;
      let lastError = null;
      for (let i = 0; i < 5; i++) {
        const { data, error: dbError } = await db.createPayment(payload);
        if (!dbError) {
          inserted = data;
          break;
        }
        lastError = dbError;
        const match = (dbError.message || '').match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && Object.prototype.hasOwnProperty.call(payload, match[1])) {
          delete payload[match[1]];
          continue;
        }
        break;
      }
      if (!inserted) {
        throw new Error(lastError?.message || 'Failed to record payment');
      }

      if (onSuccess) onSuccess({ paymentMethod: 'online', tokenId: token.id, id: inserted?.[0]?.id });
    } catch (err) {
      console.error('Stripe payment error:', err);
      setError(err.message || 'Payment failed');
      if (onError) onError(err.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stripe-checkout-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Card Details</label>
        <div className="card-element">
          <CardElement options={{ hidePostalCode: true }} />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!stripe || submitting}>
          {submitting ? 'Processing...' : `Pay $${Number(amount).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};

export default StripeCheckoutForm;

