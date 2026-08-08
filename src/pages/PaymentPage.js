import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sendInvoice, sendEmailForMemberRegistration } from '../lib/emailService';
import PaymentMethodSelector from '../components/Payment/PaymentMethodSelector';
import OnlinePaymentPlaceholder from '../components/Payment/OnlinePaymentPlaceholder';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripeCheckoutForm from '../components/Payment/StripeCheckoutForm';
import OfflinePaymentForm from '../components/Payment/OfflinePaymentForm';
import './PaymentPage.css';
import { db } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';

const PaymentPage = () => {
  const { type, id } = useParams(); // type: 'event' or 'membership', id: reference ID
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const amount = parseFloat(searchParams.get('amount') || '0');
  const payerName = searchParams.get('name') || '';
  const payerEmail = searchParams.get('email') || '';
  const payerPhone = searchParams.get('phone') || '';
  const regId = searchParams.get('reg_id') || '';
  const isMember = searchParams.get('is_member') === 'true';
  const membershipType = searchParams.get('membership_type') || '';

  const [paymentMode, setPaymentMode] = useState(null);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState('');
  const publishableKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
  const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
  const { settings } = useSettings();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const loadPaymentLink = async () => {
      if (type === 'event' && id) {
        const { data, error } = await db.getEventById(id);
        if (!error && data) {
          // Select the correct payment link based on member status
          let link = '';
          if (isMember && data.member_payment_link) {
            link = data.member_payment_link;
          } else if (!isMember && data.non_member_payment_link) {
            link = data.non_member_payment_link;
          } else if (data.payment_link_url) {
            // Fallback to general payment link if specific ones not set
            link = data.payment_link_url;
          }
          setPaymentLinkUrl(link);
        } else {
          setPaymentLinkUrl('');
        }
      } else if (type === 'membership') {
        // For membership, try to get payment link from settings based on membership type
        let link = '';

        if (membershipType) {
          // Map membership type to settings field
          const typeMap = {
            'individual': settings?.membership?.individualPaymentLink,
            'family': settings?.membership?.familyPaymentLink,
            'life': settings?.membership?.lifePaymentLink
          };

          link = typeMap[membershipType] || '';

          // If no tier-specific link, try database lookup
          if (!link) {
            try {
              const { data, error } = await db.getMembershipTypeByName(membershipType);
              if (!error && data && data.payment_link) {
                link = data.payment_link;
              }
            } catch (e) {
              console.log('Failed to load membership type payment link:', e);
            }
          }
        }

        setPaymentLinkUrl(link);
      }
    };
    loadPaymentLink();
  }, [type, id, settings, isMember, membershipType]);

  const handlePaymentSuccess = async (paymentData) => {
    // Update registration status based on selected mode
    try {
      if (regId) {
        if (paymentMode === 'online') {
          // Use RPC function to bypass potential RLS issues for public users
          const { error } = await db.markEventRegistrationPaid(regId, 'online');

          if (error) {
            console.error('Failed to auto-update registration status:', error);
            // Don't block the UI, but log it. The user has paid.
          }

          // Also try to link the payment record if we have an ID
          if (paymentData && paymentData.id) {
            await db.updateEventRegistration(regId, { payment_id: paymentData.id }).catch(e => console.warn('Failed to link payment ID', e));
          }
        } else {
          // Offline mode
          const status = 'pending';
          const updates = { payment_status: status, payment_method: 'offline' };
          const { error } = await db.updateEventRegistration(regId, updates);

          if (error) {
            console.warn('Failed to update offline registration status', error);
          }
        }

        // Send Confirmation Email
        try {
          const { data: regData } = await db.getEventRegistrationById(regId);
          if (regData) {
            const { data: eventData } = await db.getEventById(regData.event_id);
            if (eventData) {
              const paymentDetails = {
                status: paymentMode === 'online' ? 'paid' : 'pending',
                method: paymentMode === 'online' ? 'online' : 'offline',
                paymentId: paymentData?.id || (typeof paymentData === 'object' ? paymentData.id : null) || 'N/A'
              };
              await sendInvoice(regData, eventData, paymentDetails);
            }
          }
        } catch (emailErr) {
          console.error('Failed to send confirmation email:', emailErr);
        }
      } else if (type === 'membership' && id) {
        // Membership Payment Success
        if (paymentMode === 'online') {
          // 1. Update Member Status to Paid/Approved
          const updates = {
            payment_status: 'paid',
            status: 'approved',
            payment_method: 'online'
          };
          await db.updateMember(id, updates).catch(e => console.error('Failed to update member status', e));

          // 2. Send Confirmation Email
          try {
            const emailParams = {
              member_name: payerName,
              membership_type: (membershipType || 'Membership').charAt(0).toUpperCase() + (membershipType || '').slice(1),
              email: payerEmail,
              phone: payerPhone,
              status: "Approved",
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              amount_usd: amount.toFixed(2),
              payment_method: "Card (Stripe)",
              transaction_id: paymentData?.tokenId || paymentData?.id || 'Online',
              payment_status: "Paid",
              year: new Date().getFullYear().toString()
            };
            await sendEmailForMemberRegistration(emailParams);
          } catch (emailErr) {
            console.error('Failed to send membership confirmation email:', emailErr);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to update payment status:', e);
    }
    // Navigate to success page
    navigate(`/payment/success?type=${type}&amount=${amount}&ref_id=${id}`, {
      state: { paymentData }
    });
  };

  const handlePaymentError = (errorMessage) => {
    alert(`Payment Error: ${errorMessage}`);
  };

  const handleBackToSelector = () => {
    setPaymentMode(null);
  };

  const getPaymentType = () => {
    return type === 'event' ? 'event_registration' : 'membership';
  };

  const getPageTitle = () => {
    if (type === 'event') {
      return 'Event Registration Payment';
    } else if (type === 'membership') {
      return 'Membership Payment';
    }
    return 'Payment';
  };

  const getPageDescription = () => {
    if (type === 'event') {
      return 'Complete your event registration by selecting a payment method below';
    } else if (type === 'membership') {
      return 'Complete your membership subscription by selecting a payment method below';
    }
    return 'Select your preferred payment method to continue';
  };

  return (
    <div className="payment-page">
      <div className="payment-container">
        <motion.div
          className="payment-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Page Header */}
          <div className="payment-header">
            <div className="payment-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z" />
              </svg>
            </div>
            <h1>{getPageTitle()}</h1>
            <p className="page-description">{getPageDescription()}</p>
          </div>

          {/* Payment Amount Display */}
          <div className="amount-display">
            <span className="amount-label">Total Amount:</span>
            <span className="amount-value">${amount.toFixed(2)}</span>
          </div>

          {/* Payment Method Selection or Forms */}
          <div className="payment-body">
            {!paymentMode ? (
              <PaymentMethodSelector
                onSelect={async (mode) => {
                  // Record chosen payment method on registration with fallback if columns missing
                  if (regId) {
                    const updates = {
                      payment_method: mode === 'offline' ? 'offline' : 'online',
                      payment_status: 'pending'
                    };
                    try {
                      const { error } = await db.updateEventRegistration(regId, updates);
                      if (error) {
                        // Retry removing missing columns mentioned in error
                        let payload = { ...updates };
                        const match = (error.message || '').match(/column "?([^"']+)"? does not exist|Could not find the '([^']+)' column/i);
                        const missing = match ? (match[1] || match[2]) : null;
                        if (missing && Object.prototype.hasOwnProperty.call(payload, missing)) {
                          delete payload[missing];
                          await db.updateEventRegistration(regId, payload);
                        }
                      }
                    } catch {
                      // swallow to avoid blocking UX
                    }
                  }
                  if (mode === 'link' && paymentLinkUrl) {
                    window.location.assign(paymentLinkUrl);
                    return;
                  }
                  setPaymentMode(mode);
                }}
                allowOffline={true}
                allowOnline={false}
                paymentLinkUrl={paymentLinkUrl}
              />
            ) : paymentMode === 'online' ? (
              stripePromise ? (
                <Elements stripe={stripePromise}>
                  <StripeCheckoutForm
                    amount={amount}
                    paymentType={getPaymentType()}
                    referenceId={id}
                    payerInfo={{ name: payerName, email: payerEmail, phone: payerPhone }}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              ) : (
                <OnlinePaymentPlaceholder
                  amount={amount}
                  paymentType={getPaymentType()}
                  onBack={handleBackToSelector}
                />
              )
            ) : (
              <OfflinePaymentForm
                amount={amount}
                paymentType={getPaymentType()}
                referenceId={id}
                payerInfo={{
                  name: payerName,
                  email: payerEmail,
                  phone: payerPhone
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onBack={handleBackToSelector}
              />
            )}
          </div>

          {/* Help Section */}
          {!paymentMode && (
            <div className="payment-help">
              <h3>Need Help?</h3>
              <p>
                If you have any questions about payments or need assistance,
                please contact us at <a href="mailto:info@tasj.org">info@tasj.org</a>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentPage;
