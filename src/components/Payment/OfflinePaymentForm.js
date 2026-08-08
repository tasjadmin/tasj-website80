import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './OfflinePaymentForm.css';
import { db } from '../../lib/supabase';

const OfflinePaymentForm = ({ 
  amount, 
  paymentType, 
  referenceId, 
  payerInfo = {},
  onSuccess, 
  onError,
  onBack 
}) => {
  const [formData, setFormData] = useState({
    paymentMethod: 'check',
    checkNumber: '',
    transactionReference: '',
    notes: '',
    payerName: payerInfo.name || '',
    payerEmail: payerInfo.email || '',
    payerPhone: payerInfo.phone || ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.payerName.trim()) {
      newErrors.payerName = 'Name is required';
    }
    
    if (!formData.payerEmail.trim()) {
      newErrors.payerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.payerEmail)) {
      newErrors.payerEmail = 'Please enter a valid email';
    }
    
    if (!formData.payerPhone.trim()) {
      newErrors.payerPhone = 'Phone is required';
    }
    
    if (formData.paymentMethod === 'check' && !formData.checkNumber.trim()) {
      newErrors.checkNumber = 'Check number is required for check payments';
    }
    
    if (formData.paymentMethod === 'bank_transfer' && !formData.transactionReference.trim()) {
      newErrors.transactionReference = 'Transaction reference is required for bank transfers';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const basePayload = {
        // Column names for both legacy and current schemas
        type: paymentType,
        payment_type: paymentType,
        reference_id: referenceId,
        method: formData.paymentMethod,
        payment_mode: 'offline',
        payment_method: formData.paymentMethod,
        amount,
        currency: 'USD',
        status: 'pending',
        payment_status: 'pending',
        payer_name: formData.payerName,
        payer_email: formData.payerEmail,
        payer_phone: formData.payerPhone,
        check_number: formData.paymentMethod === 'check' ? formData.checkNumber : null,
        transaction_reference: formData.paymentMethod === 'bank_transfer' ? formData.transactionReference : null,
        notes: formData.notes || null
      };
      
      // Attempt insert with fallback: remove unknown columns if Supabase schema lacks them
      let payload = { ...basePayload };
      let attempts = 0;
      let inserted = null;
      let lastError = null;
      while (attempts < 6) {
        const { data, error } = await db.createPayment(payload);
        if (!error) {
          inserted = data;
          break;
        }
        lastError = error;
        const match = (error.message || '').match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          const missing = match[1];
          if (Object.prototype.hasOwnProperty.call(payload, missing)) {
            delete payload[missing];
            attempts += 1;
            continue;
          }
        }
        // If not a specific missing-column error, break
        break;
      }
      
      if (!inserted) {
        throw new Error(lastError?.message || 'Failed to record payment');
      }

      const paymentData = { ...basePayload, id: inserted?.[0]?.id };
      if (onSuccess) onSuccess(paymentData);
    } catch (err) {
      console.error('Offline payment submission error:', err);
      if (onError) {
        onError(err.message || 'Failed to submit payment information');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="offline-payment-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="form-header">
        <h3>Offline Payment Details</h3>
        <p>Please provide your payment information for verification</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h4>Contact Information</h4>
          
          <div className="form-group">
            <label htmlFor="payerName">Full Name *</label>
            <input
              type="text"
              id="payerName"
              name="payerName"
              value={formData.payerName}
              onChange={handleChange}
              className={errors.payerName ? 'error' : ''}
              disabled={submitting}
            />
            {errors.payerName && <span className="error-message">{errors.payerName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="payerEmail">Email *</label>
              <input
                type="email"
                id="payerEmail"
                name="payerEmail"
                value={formData.payerEmail}
                onChange={handleChange}
                className={errors.payerEmail ? 'error' : ''}
                disabled={submitting}
              />
              {errors.payerEmail && <span className="error-message">{errors.payerEmail}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="payerPhone">Phone *</label>
              <input
                type="tel"
                id="payerPhone"
                name="payerPhone"
                value={formData.payerPhone}
                onChange={handleChange}
                placeholder="123-456-7890"
                className={errors.payerPhone ? 'error' : ''}
                disabled={submitting}
              />
              {errors.payerPhone && <span className="error-message">{errors.payerPhone}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Payment Method</h4>
          
          <div className="form-group">
            <label htmlFor="paymentMethod">Payment Method *</label>
            <select 
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod} 
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          {formData.paymentMethod === 'check' && (
            <div className="form-group">
              <label htmlFor="checkNumber">Check Number *</label>
              <input 
                type="text" 
                id="checkNumber"
                name="checkNumber"
                value={formData.checkNumber}
                onChange={handleChange}
                placeholder="e.g., 1234"
                className={errors.checkNumber ? 'error' : ''}
                disabled={submitting}
              />
              {errors.checkNumber && <span className="error-message">{errors.checkNumber}</span>}
            </div>
          )}

          {formData.paymentMethod === 'bank_transfer' && (
            <div className="form-group">
              <label htmlFor="transactionReference">Transaction Reference *</label>
              <input 
                type="text" 
                id="transactionReference"
                name="transactionReference"
                value={formData.transactionReference}
                onChange={handleChange}
                placeholder="e.g., Transfer confirmation number"
                className={errors.transactionReference ? 'error' : ''}
                disabled={submitting}
              />
              {errors.transactionReference && <span className="error-message">{errors.transactionReference}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="notes">Additional Notes (Optional)</label>
            <textarea 
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional payment details or comments..."
              rows="3"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="payment-summary">
          <div className="summary-row">
            <span>Payment Type:</span>
            <strong>{paymentType === 'event_registration' ? 'Event Registration' : 'Membership'}</strong>
          </div>
          <div className="summary-row total">
            <span>Amount Due:</span>
            <strong>${amount.toFixed(2)}</strong>
          </div>
        </div>

        <div className="info-box">
          <svg viewBox="0 0 24 24" fill="currentColor" className="info-icon">
            <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
          <p>Your {paymentType === 'event_registration' ? 'registration' : 'membership application'} will be marked as <strong>pending</strong> until payment is verified by an administrator. You will receive an email confirmation once your payment has been verified.</p>
        </div>

        <div className="form-actions">
          {onBack && (
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onBack}
              disabled={submitting}
            >
              ← Back
            </button>
          )}
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner"></span>
                Submitting...
              </>
            ) : (
              'Submit Payment Information'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default OfflinePaymentForm;
