import React from 'react';
import { motion } from 'framer-motion';
import './OnlinePaymentPlaceholder.css';

const OnlinePaymentPlaceholder = ({ amount, paymentType, onBack }) => {
  return (
    <motion.div 
      className="online-payment-placeholder"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="placeholder-header">
        <div className="icon-container">
          <svg viewBox="0 0 24 24" fill="currentColor" className="card-icon">
            <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
          </svg>
        </div>
        <h3>Online Payment Integration</h3>
        <p className="subtitle">Secure card payment processing</p>
      </div>

      <div className="payment-summary-card">
        <div className="summary-item">
          <span>Payment Type:</span>
          <strong>{paymentType === 'event_registration' ? 'Event Registration' : 'Membership Subscription'}</strong>
        </div>
        <div className="summary-item total">
          <span>Amount Due:</span>
          <strong>${amount.toFixed(2)}</strong>
        </div>
      </div>

      <div className="implementation-notice">
        <svg viewBox="0 0 24 24" fill="currentColor" className="notice-icon">
          <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" />
        </svg>
        <div className="notice-content">
          <h4>Stripe Integration Required</h4>
          <p>Online payment processing with Stripe will be implemented here. This includes:</p>
          <ul>
            <li>Secure credit/debit card processing</li>
            <li>PCI-compliant payment form (Stripe Elements)</li>
            <li>Real-time payment verification</li>
            <li>Instant confirmation and receipts</li>
          </ul>
          <p className="implementation-note">
            To enable online payments, please complete the Stripe integration as outlined in the 
            <strong> PAYMENT_SYSTEM_DESIGN.md</strong> documentation.
          </p>
        </div>
      </div>

      <div className="next-steps">
        <h4>Implementation Steps:</h4>
        <ol>
          <li>Create a Stripe account at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">stripe.com</a></li>
          <li>Install Stripe dependencies: <code>npm install @stripe/stripe-js @stripe/react-stripe-js</code></li>
          <li>Configure environment variables with Stripe API keys</li>
          <li>Deploy Supabase Edge Functions for payment processing</li>
          <li>Replace this placeholder with the actual Stripe payment form</li>
        </ol>
      </div>

      <div className="placeholder-actions">
        {onBack && (
          <button className="btn btn-outline" onClick={onBack}>
            ← Back to Payment Options
          </button>
        )}
        <button className="btn btn-disabled" disabled>
          <svg viewBox="0 0 24 24" fill="currentColor" className="lock-icon">
            <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" />
          </svg>
          Online Payment (Coming Soon)
        </button>
      </div>
    </motion.div>
  );
};

export default OnlinePaymentPlaceholder;
