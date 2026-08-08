import React from 'react';
import { motion } from 'framer-motion';
import './PaymentMethodSelector.css';

const PaymentMethodSelector = ({ onSelect, allowOffline = true, allowOnline = true, paymentLinkUrl }) => {
  return (
    <div className="payment-method-selector">
      <h3>Select Payment Method</h3>
      <p className="selector-subtitle">Choose how you would like to complete your payment</p>
      
      <div className="payment-options">
        {allowOnline && (
          <motion.button 
            onClick={() => onSelect('online')} 
            className="payment-option online"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="option-icon">💳</div>
            <div className="option-content">
              <h4>Pay Online</h4>
              <p>Credit Card, Debit Card</p>
              <span className="option-badge">Instant Confirmation</span>
            </div>
            <div className="option-arrow">→</div>
          </motion.button>
        )}

        {paymentLinkUrl && (
          <motion.button 
            onClick={() => onSelect('link')} 
            className="payment-option online"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="option-icon">🔗</div>
            <div className="option-content">
              <h4>Pay via Stripe Link</h4>
              <p>Redirect to Stripe Checkout</p>
              <span className="option-badge">Hosted by Stripe</span>
            </div>
            <div className="option-arrow">→</div>
          </motion.button>
        )}

        {allowOffline && (
          <motion.button 
            onClick={() => onSelect('offline')} 
            className="payment-option offline"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="option-icon">📄</div>
            <div className="option-content">
              <h4>Pay Offline</h4>
              <p>Check, Cash, Bank Transfer</p>
              <span className="option-badge">Pending Verification</span>
            </div>
            <div className="option-arrow">→</div>
          </motion.button>
        )}
      </div>

      <div className="payment-security-note">
        <svg viewBox="0 0 24 24" fill="currentColor" className="security-icon">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.1 14.8,9.5V11C15.4,11 16,11.6 16,12.3V15.8C16,16.4 15.4,17 14.7,17H9.2C8.6,17 8,16.4 8,15.7V12.2C8,11.6 8.6,11 9.2,11V9.5C9.2,8.1 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,9.5V11H13.5V9.5C13.5,8.7 12.8,8.2 12,8.2Z" />
        </svg>
        <span>Your payment information is secure and encrypted</span>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
