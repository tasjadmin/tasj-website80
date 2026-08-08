import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { formatUtcToLocalDateObj } from '../utils/timezoneDateUtils';
import './EventPayment.css';

const CopyableField = ({ label, value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        if (!value) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!value) return null;

    return (
        <div className="copyable-field">
            <span className="copyable-label">{label}</span>
            <div className="copyable-value-container" onClick={handleCopy}>
                <span className="copyable-value">{value}</span>
                <span className={`copy-badge ${copied ? 'copied' : ''}`}>
                    {copied ? '✓ Copied' : 'Copy'}
                </span>
            </div>
        </div>
    );
};

const EventPayment = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { settings } = useSettings();

    const [registration, setRegistration] = useState(null);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [attendees, setAttendees] = useState(1);
    const [kidsCount, setKidsCount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [zelleTransactionRef, setZelleTransactionRef] = useState('');
    const [zellePaidAmount, setZellePaidAmount] = useState('');
    const [zellePaymentNote, setZellePaymentNote] = useState('');

    const [venmoTransactionRef, setVenmoTransactionRef] = useState('');
    const [venmoPaidAmount, setVenmoPaidAmount] = useState('');
    const [venmoPaymentNote, setVenmoPaymentNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [refundSuccess, setRefundSuccess] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);

    // Add/Remove Attendees State
    const [mode, setMode] = useState('view'); // 'view', 'add'
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [removeCount, setRemoveCount] = useState(1);
    const [removeReason, setRemoveReason] = useState('');
    const [isRemoving, setIsRemoving] = useState(false);
    const [history, setHistory] = useState([]);

    // Calculate prices early to avoid ReferenceErrors
    const hasMemberPrice = event && typeof event.member_price !== 'undefined' && event.member_price !== null;
    const hasNonMemberPrice = event && typeof event.non_member_price !== 'undefined' && event.non_member_price !== null;

    const unitPrice = (registration && event) ? (
        registration.is_member && hasMemberPrice
            ? Number(event.member_price)
            : (!registration.is_member && hasNonMemberPrice
                ? Number(event.non_member_price)
                : (typeof event.registration_fee === 'number' ? event.registration_fee : parseFloat(event.registration_fee || '0')))
    ) : 0;

    const kidsPrice = (registration && event) ? (
        registration.is_member && typeof event.kids_member_price !== 'undefined' && event.kids_member_price !== null
            ? Number(event.kids_member_price)
            : (!registration.is_member && typeof event.kids_non_member_price !== 'undefined' && event.kids_non_member_price !== null
                ? Number(event.kids_non_member_price)
                : Number(event.kids_price || 0))
    ) : 0;

    const validUnitPrice = isFinite(unitPrice) ? unitPrice : 0;
    const validKidsPrice = isFinite(kidsPrice) ? kidsPrice : 0;
    const totalAmount = (validUnitPrice * attendees) + (validKidsPrice * kidsCount);
    
    // Add Participants Logic Constants
    const additionalAdults = registration ? Math.max(0, attendees - registration.attendees) : 0;
    const additionalKids = registration ? Math.max(0, kidsCount - (registration.kids_count || 0)) : 0;
    const additionalTotal = additionalAdults + additionalKids;
    const additionalAmount = (validUnitPrice * additionalAdults) + (validKidsPrice * additionalKids);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Load Registration Using ID
                const { data: regData, error: regError } = await db.getEventRegistrationById(id);
                if (regError || !regData) {
                    console.error(`Fetch error: Registration with ID ${id} not found.`, regError);
                    throw new Error('Could not find registration details. Link may be invalid.');
                }

                // Load Event Details
                const { data: evtData, error: evtError } = await db.getEventById(regData.event_id);
                if (evtError || !evtData) {
                    throw new Error('Event details could not be loaded.');
                }

                setRegistration(regData);
                setEvent(evtData);
                setAttendees(regData.attendees || 1);
                setKidsCount(regData.kids_count || 0);

                // Load History
                const { data: histData } = await db.getRegistrationHistory(regData.id);
                if (histData) setHistory(histData);
            } catch (err) {
                console.error('Fetch error:', err);
                setError(err.message || 'Error loading payment details.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id]);

    // Keep paid amounts in sync with total expected amount
    useEffect(() => {
        if (!event || !registration) return;

        const expected = mode === 'add' 
            ? ((validUnitPrice * (attendees - registration.attendees)) + (validKidsPrice * (kidsCount - (registration.kids_count || 0))))
            : totalAmount;
        
        const formatted = expected.toFixed(2);
        
        setZellePaidAmount(formatted);
        setVenmoPaidAmount(formatted);
    }, [totalAmount, attendees, kidsCount, mode, validUnitPrice, validKidsPrice, registration, event]);

    if (loading) {
        return (
            <div className="event-payment-page">
                <div className="loading-container" style={{ margin: 'auto', textAlign: 'center' }}>
                    <div className="loading-spinner"></div>
                    <p>Loading payment details...</p>
                </div>
            </div>
        );
    }

    if (error || !registration || !event) {
        return (
            <div className="event-payment-page">
                <div className="error-container" style={{ margin: 'auto', textAlign: 'center', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ color: '#dc3545' }}>Payment Link Error</h2>
                    <p>{error || 'Details not found'}</p>
                    <button onClick={() => navigate('/events')} style={{ marginTop: '20px', padding: '10px 20px', background: '#FF6B35', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Return to Events</button>
                </div>
            </div>
        );
    }

    if (submitSuccess) {
        return (
            <div className="event-payment-page">
                <div className="payment-container" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', color: '#2e7d32', margin: '20px 0' }}>✓</div>
                    <h2 style={{ marginBottom: '15px' }}>Payment details submitted successfully!</h2>
                    <p style={{ color: '#495057', lineHeight: '1.6', fontSize: '15px' }}>
                        Awaiting admin verification. We will review the transaction and update your registration status shortly.
                    </p>
                    <button onClick={() => navigate('/events')} className="proceed-btn" style={{ marginTop: '30px' }}>Return to Events</button>
                </div>
            </div>
        );
    }

    if (refundSuccess) {
        const refundAmount = validUnitPrice * removeCount;
        return (
            <div className="event-payment-page">
                <div className="payment-container" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', color: '#FF6B35', margin: '20px 0' }}>📩</div>
                    <h2 style={{ marginBottom: '15px' }}>Refund Request Submitted Successfully</h2>
                    <p style={{ color: '#495057', lineHeight: '1.6', fontSize: '15px', marginBottom: '25px' }}>
                        Your attendee removal request has been submitted successfully. The refund request is now pending admin review.
                    </p>

                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '30px', border: '1px solid #eee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ color: '#666' }}>Event Name</span>
                            <span style={{ fontWeight: '600' }}>{event.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ color: '#666' }}>Updated Attendees</span>
                            <span style={{ fontWeight: '600' }}>{registration.attendees - removeCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ color: '#666' }}>Refund Amount</span>
                            <span style={{ fontWeight: '600', color: '#dc3545' }}>${refundAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666' }}>Refund Status</span>
                            <span style={{ fontWeight: '600', color: '#FF6B35' }}>Pending Admin Review</span>
                        </div>
                    </div>

                    <button onClick={() => navigate(`/events/${event.id}`)} className="proceed-btn">Return to Event Details</button>
                </div>
            </div>
        );
    }


    // Format Display Dates
    const eventDateStr = event.event_date ? formatUtcToLocalDateObj(event.event_date, event.event_time).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) : 'Date TBD';

    const decreaseAttendees = () => {
        if (attendees > 1) {
            setAttendees(prev => prev - 1);
        }
    };

    const increaseAttendees = () => {
        if (!event.max_attendees || (attendees + kidsCount < event.max_attendees)) {
            setAttendees(prev => prev + 1);
        }
    };

    const transactionRef = paymentMethod === 'venmo' ? venmoTransactionRef : zelleTransactionRef;
    const paidAmount = paymentMethod === 'venmo' ? venmoPaidAmount : zellePaidAmount;
    const paymentNote = paymentMethod === 'venmo' ? venmoPaymentNote : zellePaymentNote;

    // Amount Validation check
    const expectedPayment = mode === 'add' 
        ? (validUnitPrice * (attendees - registration.attendees)) 
        : totalAmount;

    const amountPaidFloat = parseFloat(paidAmount) || 0;
    const isMatchExact = Math.abs(amountPaidFloat - expectedPayment) < 0.01;
    const isOfflineValid = paymentMethod && isMatchExact && paymentNote?.trim() && transactionRef?.trim();
    const isButtonDisabled = isSubmitting || !isOfflineValid;
    const buttonText = isSubmitting ? 'Processing...' : 'Save Payment Details';

    const handleRemoveSubmit = async () => {
        setIsRemoving(true);
        setSubmitError('');

        try {
            const registrationId = registration?.id || id;
            const refundAmount = validUnitPrice * removeCount;

            const { error: updateError } = await db.updateEventRegistration(registrationId, {
                refund_requested_attendees: removeCount,
                refund_amount: refundAmount,
                refund_reason: removeReason,
                refund_status: 'pending',
                updated_at: new Date().toISOString()
            });

            if (updateError) throw updateError;

            // Create History Record
            await db.createRegistrationHistory({
                registration_id: registrationId,
                event_id: registration.event_id,
                full_name: registration.full_name,
                email: registration.email,
                phone: registration.phone,
                action_type: 'refund_request',
                amount: 0,
                refund_amount: refundAmount,
                previous_attendees: registration.attendees,
                updated_attendees: registration.attendees, // They are still "at" current until approved, but request is for reduction
                payment_status: registration.payment_status,
                refund_status: 'pending',
                payment_note: removeReason,
                transaction_id: registration.transaction_id || ''
            });

            // Refresh history
            const { data: histData } = await db.getRegistrationHistory(registrationId);
            if (histData) setHistory(histData);

            // Success
            setShowRemoveModal(false);
            setRefundSuccess(true);
        } catch (err) {
            console.error('Handle Remove Error:', err);
            setSubmitError(err.message || 'Failed to request refund.');
        } finally {
            setIsRemoving(false);
        }
    };

    const handleProceed = async () => {
        setIsSubmitting(true);
        setSubmitError('');

        try {
            if (paymentMethod === 'zelle' || paymentMethod === 'venmo') {
                const currentPaidAmount = parseFloat(paidAmount) || 0;
                const currentPaymentNote = paymentNote?.trim();
                const currentTransactionId = transactionRef?.trim();

                // Validate required fields
                if (!paidAmount || currentPaidAmount <= 0) {
                    throw new Error('Valid Amount Paid is required.');
                }
                if (!currentPaymentNote) {
                    throw new Error('Payment Note is required.');
                }
                if (!currentTransactionId) {
                    throw new Error('Transaction ID is required.');
                }

                const expectedAdd = mode === 'add' ? additionalAmount : totalAmount;
                
                if (currentPaidAmount < expectedAdd) {
                    throw new Error(`The entered amount ($${currentPaidAmount.toFixed(2)}) must exactly match the expected amount ($${expectedAdd.toFixed(2)}).`);
                }

                const registrationId = registration?.id || id;

                // Global Uniqueness Check for Transaction ID
                // IMPORTANT: If 'add' mode, we do NOT exclude the current registration, because they are making a NEW payment
                // and should not reuse a transaction ID they or anyone else already used.
                const excludeRegId = mode === 'add' ? null : registrationId;
                const { isUnique, error: checkError } = await db.checkTransactionIdUniqueness(currentTransactionId, null, excludeRegId);
                if (checkError) {
                    throw new Error('Could not verify Transaction ID uniqueness. Please try again.');
                }
                if (!isUnique) {
                    setIsSubmitting(false);
                    setShowDuplicateModal(true);
                    return;
                }
                
                let updates = {
                    updated_at: new Date().toISOString()
                };

                if (mode === 'add') {
                    // Update for additional attendees
                    updates = {
                        ...updates,
                        attendees: parseInt(attendees),
                        kids_count: parseInt(kidsCount),
                        expected_amount: totalAmount, // Should reflect new total
                        payment_method: paymentMethod, // Store most recent method
                        transaction_id: currentTransactionId, // Store most recent ref
                        paid_amount: currentPaidAmount + (registration.paid_amount || 0), // Cumulative
                        payment_note: `[ADDONS] ${currentPaymentNote} | Prev: ${registration.payment_note || ''}`,
                        payment_status: 'pending_verification' // Reset to pending for admin check
                    };
                } else {
                    // Initial payment
                    updates = {
                        ...updates,
                        attendees: parseInt(attendees),
                        kids_count: parseInt(kidsCount),
                        expected_amount: totalAmount,
                        payment_method: paymentMethod,
                        transaction_id: currentTransactionId,
                        paid_amount: currentPaidAmount,
                        payment_note: currentPaymentNote,
                        payment_status: 'pending_verification'
                    };
                }

                const { error: updateError } = await db.updateEventRegistration(registrationId, updates);

                if (updateError) throw updateError;

                // Create History Record
                await db.createRegistrationHistory({
                    registration_id: registrationId,
                    event_id: registration.event_id,
                    full_name: registration.full_name,
                    email: registration.email,
                    phone: registration.phone,
                    action_type: mode === 'add' ? 'additional_payment' : 'initial_payment',
                    payment_method: paymentMethod,
                    transaction_id: currentTransactionId,
                    amount: currentPaidAmount,
                    previous_attendees: (registration.attendees || 0) + (registration.kids_count || 0),
                    updated_attendees: parseInt(attendees) + parseInt(kidsCount),
                    payment_status: 'pending_verification',
                    payment_note: currentPaymentNote
                });

                // Show success confirmation
                setSubmitSuccess(true);
                window.scrollTo(0, 0);
            } else {
                throw new Error('Please select a payment method.');
            }
        } catch (err) {
            console.error('Handle Proceed Error:', err);
            setSubmitError(err.message || 'Failed to process payment.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="event-payment-page">
            <div className={`payment-container ${showRemoveModal ? 'modal-open' : ''}`}>
                <div className="payment-header">
                    <h1>Complete Your Registration</h1>
                    <p>Please review your details and confirm payment to secure your spots.</p>
                </div>

                <div className="payment-body">
                    <div className="details-grid">
                        <div className="detail-row">
                            <span className="detail-label">Event Name</span>
                            <span className="detail-value">{event.name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Event Date</span>
                            <span className="detail-value">{eventDateStr}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Full Name</span>
                            <span className="detail-value">{registration.full_name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Email</span>
                            <span className="detail-value">{registration.email}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Membership</span>
                            <span className="detail-value">{registration.is_member ? 'TASJ Member' : 'Non-Member'}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Payment Status</span>
                            <span className="detail-value">
                                <span className={`status-badge ${registration.payment_status}`}>
                                    {registration.payment_status?.replace('_', ' ') || 'Pending'}
                                </span>
                            </span>
                        </div>

                        {/* Editable Attendees (Conditional) */}
                        <div className="detail-row stepper-row">
                            <span className="detail-label">Number of Adults (Age 12+)</span>
                            {(registration.payment_status === 'paid' && mode === 'view') ? (
                                <span className="detail-value">{registration.attendees}</span>
                            ) : (
                                <div className="stepper-control">
                                    <button 
                                        type="button" 
                                        className="stepper-btn" 
                                        onClick={decreaseAttendees} 
                                        disabled={attendees <= (mode === 'add' ? registration.attendees : 1) || isSubmitting}
                                    >-</button>
                                    <span className="stepper-value">{attendees}</span>
                                    <button 
                                        type="button" 
                                        className="stepper-btn" 
                                        onClick={increaseAttendees} 
                                        disabled={isSubmitting || (event.max_attendees && (attendees + kidsCount >= event.max_attendees))}
                                    >+</button>
                                </div>
                            )}
                        </div>

                        {/* Kids Stepper */}
                        <div className="detail-row stepper-row">
                            <span className="detail-label">Number of Kids (Age 5&ndash;12)</span>
                            {(registration.payment_status === 'paid' && mode === 'view') ? (
                                <span className="detail-value">{registration.kids_count || 0}</span>
                            ) : (
                                <div className="stepper-control">
                                    <button 
                                        type="button" 
                                        className="stepper-btn" 
                                        onClick={() => setKidsCount(prev => Math.max(mode === 'add' ? (registration.kids_count || 0) : 0, prev - 1))} 
                                        disabled={kidsCount <= (mode === 'add' ? (registration.kids_count || 0) : 0) || isSubmitting}
                                    >-</button>
                                    <span className="stepper-value">{kidsCount}</span>
                                    <button 
                                        type="button" 
                                        className="stepper-btn" 
                                        onClick={() => setKidsCount(prev => prev + 1)} 
                                        disabled={isSubmitting || (event.max_attendees && (attendees + kidsCount >= event.max_attendees))}
                                    >+</button>
                                </div>
                            )}
                        </div>

                        <div className="detail-row" style={{ borderTop: 'none', paddingTop: '0' }}>
                           <span className="detail-label"></span>
                           <span className="detail-value" style={{ fontSize: '12px', color: '#666' }}>
                               Total Attendees: {attendees + kidsCount}
                           </span>
                        </div>

                        <div className="detail-row total-row">
                            <span className="detail-label">Total Amount</span>
                            <span className="detail-value amount-highlight">${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* PAID STATE ACTIONS */}
                    {registration.payment_status === 'paid' && mode === 'view' && (
                        <div className="paid-actions-section">
                            <div className="paid-status-banner">
                                <span className="check-icon">✓</span>
                                <div>
                                    <p className="main-status">Already Paid & Verified</p>
                                    <p className="sub-status">Manage your registration below</p>
                                </div>
                            </div>
                            <div className="paid-buttons-grid" style={{ gridTemplateColumns: '1fr' }}>
                                <button className="paid-secondary-btn" onClick={() => setMode('add')}>
                                    <span>➕</span> Add Attendees
                                </button>
                                {/* Temporarily hiding Remove Attendees per request, logic remains intact */}
                                <button className="paid-secondary-btn remove" onClick={() => setShowRemoveModal(true)} style={{ display: 'none' }}>
                                    <span>➖</span> Remove Attendees
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ADD ATTENDEES EXTRA PAYMENT FLOW */}
                    {mode === 'add' && additionalTotal > 0 && additionalAmount > 0 && (
                        <div className="add-attendees-form">
                            <div className="info-banner">
                                <h3>Adding Members</h3>
                                <p>Additional Adults: {additionalAdults}</p>
                                <p>Additional Kids: {additionalKids}</p>
                                <p>Additional Payment Required: <strong>${additionalAmount.toFixed(2)}</strong></p>
                            </div>

                            <div className="payment-options-section">
                                <h3>Select Payment Method for Extra Attendees</h3>
                                {submitError && <div className="error-banner">{submitError}</div>}
                                
                                <div className="payment-method-group">
                                    {settings?.payment?.zelleQrUrl && (
                                        <div className={`payment-option-card ${paymentMethod === 'zelle' ? 'selected' : ''}`} onClick={() => setPaymentMethod('zelle')}>
                                            <div className="payment-option-header">
                                                <input type="radio" checked={paymentMethod === 'zelle'} readOnly className="payment-radio" />
                                                <span className="payment-title">Zelle</span>
                                            </div>
                                            {paymentMethod === 'zelle' && (
                                                <div className="offline-details">
                                                    <div className="qr-section">
                                                        <img src={settings?.payment?.zelleQrUrl} alt="Zelle QR" className="qr-image" />
                                                        <p className="qr-help-text">Scan to pay ${ additionalAmount.toFixed(2) }</p>
                                                    </div>
                                                    <div className="payment-ids-section">
                                                        <CopyableField label="Zelle ID / Email" value={settings?.payment?.zelleId} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Amount Paid (Fixed) *</label>
                                                        <div className="amount-input-wrapper">
                                                            <span className="currency-symbol">$</span>
                                                            <input type="text" className="amount-input read-only-input" value={zellePaidAmount} readOnly placeholder="0.00" />
                                                        </div>
                                                        <p className="field-hint">Amount matches your current selection</p>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Transaction ID / Ref *</label>
                                                        <input id="zelle-transaction-id" type="text" value={zelleTransactionRef} onChange={(e) => setZelleTransactionRef(e.target.value)} placeholder="Entry 10-digit Ref #" />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Payment Note Used *</label>
                                                        <input type="text" value={zellePaymentNote} onChange={(e) => setZellePaymentNote(e.target.value)} placeholder="e.g., Event Name - Member Name" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {settings?.payment?.venmoQrUrl && (
                                        <div className={`payment-option-card ${paymentMethod === 'venmo' ? 'selected' : ''}`} onClick={() => setPaymentMethod('venmo')}>
                                            <div className="payment-option-header">
                                                <input type="radio" checked={paymentMethod === 'venmo'} readOnly className="payment-radio" />
                                                <span className="payment-title">Venmo</span>
                                            </div>
                                            {paymentMethod === 'venmo' && (
                                                <div className="offline-details">
                                                    <div className="qr-section">
                                                        <img src={settings?.payment?.venmoQrUrl} alt="Venmo QR" className="qr-image" />
                                                        <p className="qr-help-text">Scan to pay ${ additionalAmount.toFixed(2) }</p>
                                                    </div>
                                                    <div className="payment-ids-section">
                                                        <CopyableField label="Venmo Username" value={settings?.payment?.venmoId} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Amount Paid (Fixed) *</label>
                                                        <div className="amount-input-wrapper">
                                                            <span className="currency-symbol">$</span>
                                                            <input type="text" className="amount-input read-only-input" value={venmoPaidAmount} readOnly placeholder="0.00" />
                                                        </div>
                                                        <p className="field-hint">Amount matches your current selection</p>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Transaction ID / Ref *</label>
                                                        <input id="venmo-transaction-id" type="text" value={venmoTransactionRef} onChange={(e) => setVenmoTransactionRef(e.target.value)} placeholder="Enter Transaction Ref" />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Payment Note Used *</label>
                                                        <input type="text" value={venmoPaymentNote} onChange={(e) => setVenmoPaymentNote(e.target.value)} placeholder="e.g., Event Name - Member Name" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button className="proceed-btn" onClick={handleProceed} disabled={isSubmitting || !paymentMethod}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Additional Payment'}
                                </button>
                                <button className="cancel-btn" onClick={() => { setMode('view'); setAttendees(registration.attendees); setKidsCount(registration.kids_count || 0); }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* INITIAL PAYMENT FLOW */}
                    {(registration.payment_status === 'pending' || registration.payment_status === 'overdue' || registration.payment_status === 'failed' || registration.payment_status === 'rejected') && (
                        <div className="payment-options-section">
                            <h3>Secure Your Spot</h3>
                            {submitError && <div className="error-banner">{submitError}</div>}
                            
                            <div className="payment-method-group">
                                {settings?.payment?.zelleQrUrl && (
                                    <div className={`payment-option-card ${paymentMethod === 'zelle' ? 'selected' : ''}`} onClick={() => setPaymentMethod('zelle')}>
                                        <div className="payment-option-header">
                                            <input type="radio" checked={paymentMethod === 'zelle'} readOnly className="payment-radio" />
                                            <span className="payment-title">Zelle</span>
                                        </div>
                                        {paymentMethod === 'zelle' && (
                                            <div className="offline-details" onClick={e => e.stopPropagation()}>
                                                <div className="qr-section">
                                                    <img src={settings?.payment?.zelleQrUrl} alt="Zelle QR" className="qr-image" />
                                                    <p className="qr-help-text">Scan to pay ${totalAmount.toFixed(2)}</p>
                                                </div>
                                                <div className="payment-ids-section">
                                                    <CopyableField label="Zelle ID / Email" value={settings?.payment?.zelleId} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Amount Paid (Fixed) *</label>
                                                    <div className="amount-input-wrapper">
                                                        <span className="currency-symbol">$</span>
                                                        <input type="text" className="amount-input read-only-input" value={zellePaidAmount} readOnly placeholder="0.00" />
                                                    </div>
                                                    <p className="field-hint">Amount matches your current selection</p>
                                                </div>
                                                <div className="form-group">
                                                    <label>Transaction ID / Ref *</label>
                                                    <input id="zelle-transaction-id" type="text" value={zelleTransactionRef} onChange={(e) => setZelleTransactionRef(e.target.value)} placeholder="Entry 10-digit Ref #" />
                                                </div>
                                                <div className="form-group">
                                                    <label>Payment Note Used *</label>
                                                    <input type="text" value={zellePaymentNote} onChange={(e) => setZellePaymentNote(e.target.value)} placeholder="e.g., Event Name - Member Name" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {settings?.payment?.venmoQrUrl && (
                                    <div className={`payment-option-card ${paymentMethod === 'venmo' ? 'selected' : ''}`} onClick={() => setPaymentMethod('venmo')}>
                                        <div className="payment-option-header">
                                            <input type="radio" checked={paymentMethod === 'venmo'} readOnly className="payment-radio" />
                                            <span className="payment-title">Venmo</span>
                                        </div>
                                        {paymentMethod === 'venmo' && (
                                            <div className="offline-details" onClick={e => e.stopPropagation()}>
                                                <div className="qr-section">
                                                    <img src={settings?.payment?.venmoQrUrl} alt="Venmo QR" className="qr-image" />
                                                    <p className="qr-help-text">Scan to pay ${totalAmount.toFixed(2)}</p>
                                                </div>
                                                <div className="payment-ids-section">
                                                    <CopyableField label="Venmo Username" value={settings?.payment?.venmoId} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Amount Paid (Fixed) *</label>
                                                    <div className="amount-input-wrapper">
                                                        <span className="currency-symbol">$</span>
                                                        <input type="text" className="amount-input read-only-input" value={venmoPaidAmount} readOnly placeholder="0.00" />
                                                    </div>
                                                    <p className="field-hint">Amount matches your current selection</p>
                                                </div>
                                                <div className="form-group">
                                                    <label>Transaction ID / Ref *</label>
                                                    <input id="venmo-transaction-id" type="text" value={venmoTransactionRef} onChange={(e) => setVenmoTransactionRef(e.target.value)} placeholder="Enter Transaction Ref" />
                                                </div>
                                                <div className="form-group">
                                                    <label>Payment Note Used *</label>
                                                    <input type="text" value={venmoPaymentNote} onChange={(e) => setVenmoPaymentNote(e.target.value)} placeholder="e.g., Event Name - Member Name" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button className="proceed-btn" onClick={handleProceed} disabled={isButtonDisabled}>
                                {buttonText}
                            </button>
                        </div>
                    )}

                    {/* Pending Verification Message */}
                    {registration.payment_status === 'pending_verification' && (
                        <div className="info-banner" style={{ background: '#e3f2fd', color: '#0d47a1', border: '1px solid #bbdefb', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
                            <h3>Awaiting Admin Verification</h3>
                            <p>We've received your payment details and are currently reviewing them. Your registration status will be updated once verified.</p>
                            <button onClick={() => navigate('/events')} className="proceed-btn" style={{ marginTop: '20px' }}>Return to Events</button>
                        </div>
                    )}
                </div>

                {/* Transaction History Section */}
                {history.length > 0 && (
                    <div className="transaction-history-section">
                        <div className="section-divider"></div>
                        <h2 className="history-title">Transaction History</h2>
                        <div className="history-timeline">
                            {history.map((item, index) => (
                                <div key={item.id} className="history-item">
                                    <div className="history-dot"></div>
                                    <div className="history-content">
                                        <div className="history-header">
                                            <span className="action-tag">{item.action_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                                            <span className="history-date">{new Date(item.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="history-details-grid">
                                            <div className="h-detail">
                                                <span className="h-label">Amount</span>
                                                <span className={`h-value ${item.amount > 0 ? 'pos' : (item.refund_amount > 0 ? 'neg' : '')}`}>
                                                    {item.amount > 0 ? `+$${Number(item.amount).toFixed(2)}` : (item.refund_amount > 0 ? `-$${Number(item.refund_amount).toFixed(2)}` : '$0.00')}
                                                </span>
                                            </div>
                                            <div className="h-detail">
                                                <span className="h-label">Attendees</span>
                                                <span className="h-value">{item.previous_attendees} → {item.updated_attendees}</span>
                                            </div>
                                            {item.payment_method && (
                                                <div className="h-detail">
                                                    <span className="h-label">Method</span>
                                                    <span className="h-value">{item.payment_method}</span>
                                                </div>
                                            )}
                                            {item.transaction_id && (
                                                <div className="h-detail">
                                                    <span className="h-label">ID / Ref</span>
                                                    <span className="h-value">{item.transaction_id}</span>
                                                </div>
                                            )}
                                        </div>
                                        {item.payment_note && (
                                            <div className="history-note">
                                                <span className="h-label">Note:</span> {item.payment_note}
                                            </div>
                                        )}
                                        <div className="history-status-line">
                                            Status: <span className={`status-text ${item.payment_status || item.refund_status}`}>
                                                {(item.payment_status || item.refund_status || 'Pending').replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Remove Attendees Modal */}
            {showRemoveModal && (
                <div className="payment-modal-overlay">
                    <div className="payment-modal">
                        <div className="modal-header">
                            <h2>Remove Attendees</h2>
                            <button className="close-btn" onClick={() => setShowRemoveModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-info-grid">
                                <div className="info-item"><label>Name</label><p>{registration.full_name}</p></div>
                                <div className="info-item"><label>Current Attendees</label><p>{registration.attendees}</p></div>
                                <div className="info-item"><label>Email</label><p>{registration.email}</p></div>
                            </div>

                            <div className="modal-form">
                                <div className="form-group">
                                    <label>Number of Attendees to Remove</label>
                                    <div className="stepper-control modal-stepper">
                                        <button className="stepper-btn" onClick={() => setRemoveCount(Math.max(1, removeCount - 1))}>-</button>
                                        <span className="stepper-value">{removeCount}</span>
                                        <button className="stepper-btn" onClick={() => setRemoveCount(Math.min(registration.attendees - 1, removeCount + 1))}>+</button>
                                    </div>
                                    <p className="hint">New total will be {registration.attendees - removeCount}</p>
                                </div>

                                <div className="form-group">
                                    <label>Reason for Removing Attendees *</label>
                                    <textarea 
                                        value={removeReason}
                                        onChange={(e) => setRemoveReason(e.target.value)}
                                        placeholder="Reason for refund request..."
                                        rows="4"
                                    />
                                </div>

                                <div className="refund-summary">
                                    <span>Estimated Refund:</span>
                                    <span className="refund-amount">${(validUnitPrice * removeCount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setShowRemoveModal(false)}>Cancel</button>
                            <button className="confirm-btn" disabled={isRemoving || !removeReason.trim()} onClick={handleRemoveSubmit}>
                                {isRemoving ? 'Submitting...' : 'Request Refund'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicate Transaction ID Modal */}
            {showDuplicateModal && (
                <div 
                    style={{ 
                        zIndex: 9999, 
                        position: 'fixed', 
                        top: 0, left: 0, right: 0, bottom: 0, 
                        backgroundColor: 'rgba(0, 0, 0, 0.6)', 
                        backdropFilter: 'blur(4px)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        animation: 'fadeIn 0.2s ease-out',
                        padding: '20px'
                    }}
                >
                    <div 
                        style={{ 
                            background: '#fff', 
                            padding: '32px 24px', 
                            borderRadius: '12px', 
                            textAlign: 'center', 
                            maxWidth: '400px', 
                            width: '100%', 
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.05)',
                            animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                    >
                        <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            backgroundColor: '#ffebee', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 20px auto',
                            color: '#e53935'
                        }}>
                            <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', color: '#1a1a1a', margin: '0 0 10px 0', fontWeight: '700' }}>
                            Duplicate Transaction ID
                        </h3>
                        <p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 25px 0' }}>
                            This transaction ID has already been used.<br/>Please enter a unique one.
                        </p>
                        <button 
                            style={{ 
                                background: '#FF6B35', 
                                color: '#fff', 
                                border: 'none', 
                                padding: '14px', 
                                borderRadius: '8px', 
                                fontSize: '1.05rem', 
                                cursor: 'pointer', 
                                fontWeight: '600',
                                width: '100%',
                                transition: 'background 0.2s ease, transform 0.1s ease',
                                boxShadow: '0 4px 10px rgba(255, 107, 53, 0.2)'
                            }}
                            onMouseOver={(e) => { e.target.style.background = '#e85a20'; }}
                            onMouseOut={(e) => { e.target.style.background = '#FF6B35'; }}
                            onClick={() => {
                                setShowDuplicateModal(false);
                                setTimeout(() => {
                                    const inputId = paymentMethod === 'venmo' ? 'venmo-transaction-id' : 'zelle-transaction-id';
                                    const inputEl = document.getElementById(inputId);
                                    if (inputEl) inputEl.focus();
                                }, 100);
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
            <style>
                {`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { opacity: 0; transform: scale(0.92) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                `}
            </style>
        </div>
    );
};

export default EventPayment;
