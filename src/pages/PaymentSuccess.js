import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../lib/supabase';
import { sendEmailForMemberRegistration, sendEmailForEventRegistration } from '../lib/emailService';
import { getTranscationDetails } from '../services/supabaseService';
import { formatUtcToLocalDateObj } from '../utils/timezoneDateUtils';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const hasProcessed = useRef(false);

  const [loading, setLoading] = useState(false);
  const [verifiedData, setVerifiedData] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const typeParam = searchParams.get('type');
  const amountParam = searchParams.get('amount');
  const sessionId = searchParams.get('session_id');

  const paymentDataState = location.state?.paymentData;

  useEffect(() => {
    window.scrollTo(0, 0);

    const processStripeSession = async () => {
      // Prevent double-processing
      if (!sessionId || hasProcessed.current) return;
      hasProcessed.current = true;
      setLoading(true);

      try {
        console.log("Verifying session:", sessionId);
        const session = await getTranscationDetails(sessionId);

        if (session) {
          const email = session.customer_email || session.customer_details?.email;
          const amount = (session.amount_total || 0) / 100;
          const txnId = session.id;
          const metadata = session.metadata || {};

          let additionalInfo = {};
          let detectedType = metadata.type || 'membership';

          // Handle Event Payment
          if (detectedType === 'event' && metadata.regId) {
            console.log("Processing Event Registration:", metadata.regId);

            // Update Registration Status
            await db.markEventRegistrationPaid(metadata.regId, 'online', txnId);

            // Fetch Data
            const { data: eventData } = await db.getEventById(metadata.eventId);
            const { data: regData } = await db.getEventRegistrationById(metadata.regId);

            additionalInfo = {
              eventName: eventData?.name,
              refId: metadata.eventId
            };

            // Send Email
            if (eventData && regData) {
              const eventDateObj = formatUtcToLocalDateObj(eventData.event_date, eventData.event_time);
              const eventDateStr = eventDateObj ? eventDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date TBD';
              const eventTimeStr = eventDateObj ? eventDateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

              const emailParams = {
                full_name: regData.full_name || regData.name || 'Participant',
                event_name: eventData.name,
                event_datetime: `${eventDateStr} at ${eventTimeStr}`,
                event_location: eventData.location_name || eventData.location_url || 'Online/TBD',
                attendees: String(regData.attendees || 1),
                phone: regData.phone || 'N/A',
                email: regData.email,
                amount_usd: amount.toFixed(2),
                payment_method: "Credit Card (Stripe)",
                transaction_id: txnId,
                payment_status: "Paid",
                year: new Date().getFullYear().toString()
              };

              await sendEmailForEventRegistration(emailParams);
            }
          }
          // Handle Membership Payment
          else {
            let member = null;
            if (metadata && metadata.memberId) {
              const { data } = await db.getMemberById(metadata.memberId);
              member = data;
            } else if (email) {
              const { data } = await db.getMemberByEmail(email);
              member = data;
            }

            if (member) {
              await db.markMembershipPaid(member.id, 'online', txnId, amount);

              const emailParams = {
                member_name: member.first_name + ' ' + member.last_name,
                membership_type: (member.membership_type || 'Membership').charAt(0).toUpperCase() + (member.membership_type || '').slice(1),
                email: member.email,
                phone: member.phone,
                status: "Approved",
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                amount_usd: amount.toFixed(2),
                payment_method: "Credit Card (Stripe)",
                transaction_id: txnId,
                payment_status: "Paid",
                year: new Date().getFullYear().toString()
              };
              await sendEmailForMemberRegistration(emailParams);
            }
          }


          setVerifiedData({
            id: txnId,
            amount: amount,
            email: email,
            paymentMethod: 'online',
            type: detectedType,
            ...additionalInfo
          });
        }
      } catch (e) {
        console.error("Payment Verification Failed", e);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      processStripeSession();
    }
  }, [sessionId]);

  const getTitle = () => {
    if (loading) return "Verifying Payment...";
    const t = verifiedData?.type;
    if (t === 'event') {
      return 'Registration Confirmed!';
    } else if (t === 'membership') {
      return 'Membership Confirmed!';
    }
    return 'Payment Successful!';
  };

  const getMessage = () => {
    if (loading) return "Please wait while we confirm your transaction details...";
    if (verifiedData?.type === 'event') return `You have successfully registered for ${verifiedData.eventName || 'the event'}. A confirmation email has been sent.`;
    return "Your payment has been processed successfully. A confirmation email has been sent to your registered email address.";
  };

  const finalAmount = verifiedData?.amount?.toFixed(2) || (amountParam ? parseFloat(amountParam).toFixed(2) : null);
  const finalTxnId = verifiedData?.id || paymentDataState?.id || paymentDataState?.tokenId;

  return (
    <div className="payment-success-page">
      <div className="success-container">
        <motion.div
          className="success-content"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {loading ? (
            <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
          ) : (
            <motion.div
              className="success-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
              </svg>
            </motion.div>
          )}

          <h1>{getTitle()}</h1>
          <p className="success-message">{getMessage()}</p>

          {!loading && (
            <div className="payment-details-card">
              {verifiedData?.type === 'event' ? (
                <>
                  <h3>Event Registration Details</h3>
                  <div className="detail-row">
                    <span className="detail-label">Event Name:</span>
                    <span className="detail-value">{verifiedData.eventName || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Amount Paid:</span>
                    <span className="detail-value amount">${finalAmount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Confirmation Email:</span>
                    <span className="detail-value">{verifiedData.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Transaction ID:</span>
                    <span className="detail-value">{finalTxnId}</span>
                  </div>
                </>
              ) : (
                <>
                  <h3>Payment Details</h3>
                  <div className="detail-row">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value capitalize">{verifiedData?.type || 'Membership'}</span>
                  </div>
                  {finalAmount && (
                    <div className="detail-row">
                      <span className="detail-label">Amount:</span>
                      <span className="detail-value amount">${finalAmount}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Transaction ID:</span>
                    <span className="detail-value">{finalTxnId}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="success-actions">
            <Link to="/" className="btn btn-primary">
              Return to Home
            </Link>
            {verifiedData?.type === 'event' ? (
              <Link to={`/events/${verifiedData.refId || ''}`} className="btn btn-outline">
                Return to Event
              </Link>
            ) : (
              <Link to="/membership" className="btn btn-outline">
                View Membership
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
