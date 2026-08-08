import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { createSessionCheckout } from '../services/supabaseService';
import './MembershipPayment.css';

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

const MembershipPayment = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const enableStripe = false; // Toggle Stripe visibility

    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const { data: memberData, error: memberError } = await db.getMemberById(id);
                if (memberError || !memberData) {
                    throw new Error('Could not find membership details. Link may be invalid.');
                }

                setMember(memberData);
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

    if (loading) {
        return (
            <div className="membership-payment-page">
                <div className="loading-container" style={{ margin: 'auto', textAlign: 'center' }}>
                    <div className="loading-spinner"></div>
                    <p>Loading payment details...</p>
                </div>
            </div>
        );
    }

    if (error || !member) {
        return (
            <div className="membership-payment-page">
                <div className="error-container" style={{ margin: 'auto', textAlign: 'center', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ color: '#dc3545' }}>Payment Link Error</h2>
                    <p>{error || 'Details not found'}</p>
                    <button onClick={() => navigate('/membership-registration')} style={{ marginTop: '20px', padding: '10px 20px', background: '#FF6B35', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Return to Registration</button>
                </div>
            </div>
        );
    }

    if (submitSuccess) {
        return (
            <div className="membership-payment-page">
                <div className="payment-container" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', color: '#2e7d32', margin: '20px 0' }}>✓</div>
                    <h2 style={{ marginBottom: '15px' }}>Payment details submitted successfully!</h2>
                    <p style={{ color: '#495057', lineHeight: '1.6', fontSize: '15px' }}>
                        Awaiting admin verification. We will review the transaction and update your membership status shortly.
                    </p>
                    <button onClick={() => navigate('/')} className="proceed-btn" style={{ marginTop: '30px' }}>Return to Home</button>
                </div>
            </div>
        );
    }

    // Calculate expected amount
    const type = member.membership_type;
    const priceMap = {
        student: settings?.membership?.studentPrice || 25,
        yearly: settings?.membership?.yearlyPrice || 100,
        lifetime: settings?.membership?.lifetimePrice || 500,
        life_donor: settings?.membership?.lifeDonorPrice || 1000
    };
    const totalAmount = priceMap[type] || 0;

    const transactionRef = paymentMethod === 'venmo' ? venmoTransactionRef : zelleTransactionRef;
    const paidAmount = paymentMethod === 'venmo' ? venmoPaidAmount : zellePaidAmount;
    const paymentNote = paymentMethod === 'venmo' ? venmoPaymentNote : zellePaymentNote;

    const handleAmountChange = (e) => {
        let val = e.target.value;
        if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
            if (paymentMethod === 'venmo') setVenmoPaidAmount(val);
            else setZellePaidAmount(val);
        }
    };

    const handleNoteChange = (e) => {
        if (paymentMethod === 'venmo') setVenmoPaymentNote(e.target.value);
        else setZellePaymentNote(e.target.value);
    };

    const handleRefChange = (e) => {
        if (paymentMethod === 'venmo') setVenmoTransactionRef(e.target.value);
        else setZelleTransactionRef(e.target.value);
    };

    // Amount Validation check
    const amountPaidFloat = parseFloat(paidAmount) || 0;
    let amountError = '';
    if (paidAmount !== '') {
        if (amountPaidFloat < totalAmount) {
            amountError = 'The entered amount must match the expected payment amount.';
        } else if (amountPaidFloat > totalAmount) {
            amountError = 'The entered amount must match the expected payment amount.';
        }
    }

    const isMatchExact = amountPaidFloat === totalAmount;
    const isOfflineValid = (paymentMethod === 'zelle' || paymentMethod === 'venmo') && isMatchExact && paymentNote.trim() && transactionRef.trim();
    const isCardValid = paymentMethod === 'card';
    const isButtonDisabled = isSubmitting || !(isOfflineValid || isCardValid);
    const buttonText = isSubmitting ? 'Processing...' : (paymentMethod === 'card' ? 'Proceed to Secure Checkout' : 'Save Payment Details');

    const handleProceed = async () => {
        setIsSubmitting(true);
        setSubmitError('');

        try {
            if (paymentMethod === 'card') {
                // Stripe Checkout Logic
                const response = await createSessionCheckout({
                    amount: Math.round(totalAmount * 100), // ensure integer cents
                    currency: 'usd',
                    name: 'TASJ Membership Registration | ' + (member.membership_type || 'General'),
                    email: member.email,
                    description: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
                    metadata: {
                        type: 'membership',
                        memberId: member.id,
                        email: member.email
                    }
                });

                if (!response?.url) {
                    throw new Error('Failed to create checkout session. Please try again.');
                }

                window.location.href = response.url;
            } else if (paymentMethod === 'zelle' || paymentMethod === 'venmo') {
                const currentPaidAmount = parseFloat(paidAmount) || 0;
                const currentPaymentNote = paymentNote?.trim();
                const currentTransactionId = transactionRef?.trim();

                // Validation
                if (!paidAmount || currentPaidAmount <= 0) {
                    throw new Error('A valid Amount Paid is required.');
                }
                if (!currentPaymentNote) {
                    throw new Error('Payment Note is required for verification.');
                }
                if (!currentTransactionId) {
                    throw new Error('Transaction ID / Reference Code is required.');
                }
                if (!isMatchExact) {
                    throw new Error(`The entered amount ($${currentPaidAmount.toFixed(2)}) must exactly match the expected amount ($${totalAmount.toFixed(2)}).`);
                }

                // Global Uniqueness Check for Transaction ID
                const { isUnique, error: checkError } = await db.checkTransactionIdUniqueness(currentTransactionId, member.id);
                if (checkError) {
                    throw new Error('Could not verify Transaction ID uniqueness. Please try again.');
                }
                if (!isUnique) {
                    setIsSubmitting(false);
                    setShowDuplicateModal(true);
                    return;
                }

                console.log(`[MembershipPayment] Saving manual payment data for: ${member.id} (${member.email})`);

                const paymentUpdates = {
                    expected_amount: totalAmount,
                    paid_amount: currentPaidAmount,
                    payment_method: paymentMethod,
                    transaction_id: currentTransactionId,
                    payment_note: currentPaymentNote,
                    payment_status: 'pending_verification',
                    updated_at: new Date().toISOString()
                };

                // Use ID primarily, fallback check by email if needed but ID should be authoritative here
                const { data, error: updateError, count } = await db.updateMember(member.id, paymentUpdates);

                if (updateError) {
                    console.error('[MembershipPayment] Database update failed:', updateError);
                    throw new Error(`Failed to save payment details: ${updateError.message}`);
                }

                // Verify if update actually happened. 
                // We check count > 0 because if RLS blocks SELECT, data will be empty even on success.
                const isIdUpdateSuccess = (count > 0) || (data && data.length > 0);

                if (!isIdUpdateSuccess) {
                    console.warn('[MembershipPayment] No record found with ID or blocked by RLS, attempting update by email');
                    const { data: emailData, error: emailError, count: emailCount } = await db.updateMemberByEmail(member.email, paymentUpdates);
                    
                    const isEmailUpdateSuccess = (emailCount > 0) || (emailData && emailData.length > 0);

                    if (emailError || !isEmailUpdateSuccess) {
                        console.error('[MembershipPayment] Email update also failed. Error:', emailError, 'Count:', emailCount);
                        throw new Error('Could not find your membership record to update. Please contact support.');
                    }
                    console.log('[MembershipPayment] Successfully matched and updated by email');
                } else {
                    console.log('[MembershipPayment] Successfully updated record (Count: ' + count + ')');
                }

                // Show success confirmation
                setSubmitSuccess(true);
                window.scrollTo(0, 0);
            } else {
                throw new Error('Please select a payment method to continue.');
            }
        } catch (err) {
            console.error('[MembershipPayment] Error in handleProceed:', err);
            setSubmitError(err.message || 'An unexpected error occurred while processing your payment.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="membership-payment-page">
            <div className="payment-container">
                <div className="payment-header">
                    <h1>Complete Your Membership Registration</h1>
                    <p>Please review your details and confirm payment to secure your membership.</p>
                </div>

                <div className="payment-body">
                    <div className="details-grid">
                        <div className="detail-row">
                            <span className="detail-label">Full Name</span>
                            <span className="detail-value">{member.first_name} {member.last_name}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Email</span>
                            <span className="detail-value">{member.email}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Phone</span>
                            <span className="detail-value">{member.phone || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Membership Type</span>
                            <span className="detail-value text-capitalize">{member.membership_type}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Registration Status</span>
                            <span className="detail-value text-capitalize">
                                <span className={`status-badge ${member.status || 'pending'}`}>
                                    {member.status || 'Pending'}
                                </span>
                            </span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Payment Status</span>
                            <span className="detail-value">
                                <span className={`status-badge ${member.payment_status}`}>
                                    {member.payment_status?.replace('_', ' ') || 'Pending'}
                                </span>
                            </span>
                        </div>

                        <div className="detail-row" style={{ borderBottom: 'none', paddingTop: '10px' }}>
                            <span className="detail-label" style={{ fontSize: '16px' }}>Total Amount to Pay</span>
                            <span className="detail-value amount-highlight">${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {(member.payment_status === 'pending' || member.payment_status === 'overdue' || member.payment_status === 'failed' || member.payment_status === 'rejected') && totalAmount > 0 && (
                        <div className="payment-options-section">
                            <h3>Select Payment Method</h3>

                            {submitError && (
                                <div style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}>
                                    {submitError}
                                </div>
                            )}

                            <div className="payment-method-group">
                                {enableStripe && (
                                    <div
                                        className={`payment-option-card ${paymentMethod === 'card' ? 'selected' : ''}`}
                                        onClick={() => setPaymentMethod('card')}
                                    >
                                        <div className="payment-option-header">
                                            <input type="radio" name="paymentOption" checked={paymentMethod === 'card'} readOnly className="payment-radio" />
                                            <div className="payment-info">
                                                <span className="payment-title">Credit/Debit Card (Stripe) <span className="payment-badge instant" style={{ background: '#e3f2fd', color: '#0d47a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '6px' }}>Instant Activation</span></span>
                                                <span className="payment-subtitle">Pay securely via Stripe checkout</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. Zelle */}
                                {settings?.payment?.zelleQrUrl && (
                                    <div
                                        className={`payment-option-card ${paymentMethod === 'zelle' ? 'selected' : ''}`}
                                        onClick={() => setPaymentMethod('zelle')}
                                    >
                                        <div className="payment-option-header">
                                            <input type="radio" name="paymentOption" checked={paymentMethod === 'zelle'} readOnly className="payment-radio" />
                                            <div className="payment-info">
                                                <span className="payment-title">Zelle <span className="payment-badge manual">Manual Verify</span></span>
                                                <span className="payment-subtitle">Scan QR code & upload proof</span>
                                            </div>
                                        </div>

                                        {paymentMethod === 'zelle' && (
                                            <div className="offline-details" onClick={(e) => e.stopPropagation()}>
                                                <div className="qr-section">
                                                    <img src={settings?.payment?.zelleQrUrl} alt="Zelle QR" className="qr-image" />
                                                    <p className="qr-help-text">Scan via Zelle App</p>
                                                </div>
                                                <div className="payment-ids-section">
                                                    <CopyableField label="Zelle ID / Email" value={settings?.payment?.zelleId} />
                                                </div>
                                                <div className="payment-instructions-box">
                                                    <div className="instruction-row">
                                                        <span className="instruction-label">Expected Amount:</span>
                                                        <span className="instruction-value amount-highlight">${totalAmount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="instruction-row">
                                                        <span className="instruction-label">Memo/Note:</span>
                                                        <span className="instruction-value">{`MEM-${member.first_name?.split(' ').pop() || 'First'}-${member.last_name?.split(' ').pop() || 'Last'}`}</span>
                                                    </div>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '10px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Amount Paid *</label>
                                                    <div className="amount-input-wrapper">
                                                        <span className="currency-symbol">$</span>
                                                        <input type="text" className="amount-input" value={paidAmount} onChange={handleAmountChange} placeholder="0.00" style={{ border: amountError ? '1px solid #dc3545' : '1px solid #ddd' }} />
                                                    </div>
                                                    {amountError ? (
                                                        <p style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>{amountError}</p>
                                                    ) : !isMatchExact ? (
                                                        <p style={{ color: '#6c757d', fontSize: '12px', marginTop: '5px' }}>Enter the exact amount you paid using Zelle or Venmo. Only numeric values are allowed.</p>
                                                    ) : null}
                                                </div>
                                                <div className="form-group" style={{ marginBottom: '10px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Payment Note Used *</label>
                                                    <input type="text" value={paymentNote} onChange={handleNoteChange} placeholder="Note you used" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Transaction ID *</label>
                                                    <input id="zelle-transaction-id" type="text" value={transactionRef} onChange={handleRefChange} placeholder="Reference code" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. Venmo */}
                                {settings?.payment?.venmoQrUrl && (
                                    <div
                                        className={`payment-option-card ${paymentMethod === 'venmo' ? 'selected' : ''}`}
                                        onClick={() => setPaymentMethod('venmo')}
                                    >
                                        <div className="payment-option-header">
                                            <input type="radio" name="paymentOption" checked={paymentMethod === 'venmo'} readOnly className="payment-radio" />
                                            <div className="payment-info">
                                                <span className="payment-title">Venmo <span className="payment-badge manual">Manual Verify</span></span>
                                                <span className="payment-subtitle">Scan QR code & upload proof</span>
                                            </div>
                                        </div>

                                        {paymentMethod === 'venmo' && (
                                            <div className="offline-details" onClick={(e) => e.stopPropagation()}>
                                                <div className="qr-section">
                                                    <img src={settings?.payment?.venmoQrUrl} alt="Venmo QR" className="qr-image" />
                                                    <p className="qr-help-text">Scan via Venmo App</p>
                                                </div>
                                                <div className="payment-ids-section">
                                                    <CopyableField label="Venmo Username" value={settings?.payment?.venmoId} />
                                                </div>
                                                <div className="payment-instructions-box">
                                                    <div className="instruction-row">
                                                        <span className="instruction-label">Expected Amount:</span>
                                                        <span className="instruction-value amount-highlight">${totalAmount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="instruction-row">
                                                        <span className="instruction-label">Memo/Note:</span>
                                                        <span className="instruction-value">{`MEM-${member.first_name?.split(' ').pop() || 'First'}-${member.last_name?.split(' ').pop() || 'Last'}`}</span>
                                                    </div>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '10px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Amount Paid *</label>
                                                    <div className="amount-input-wrapper">
                                                        <span className="currency-symbol">$</span>
                                                        <input type="text" className="amount-input" value={paidAmount} onChange={handleAmountChange} placeholder="0.00" style={{ border: amountError ? '1px solid #dc3545' : '1px solid #ddd' }} />
                                                    </div>
                                                    {amountError ? (
                                                        <p style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>{amountError}</p>
                                                    ) : !isMatchExact ? (
                                                        <p style={{ color: '#6c757d', fontSize: '12px', marginTop: '5px' }}>Enter the exact amount you paid using Zelle or Venmo. Only numeric values are allowed.</p>
                                                    ) : null}
                                                </div>
                                                <div className="form-group" style={{ marginBottom: '10px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Payment Note Used *</label>
                                                    <input type="text" value={paymentNote} onChange={handleNoteChange} placeholder="Note you used" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>Transaction ID *</label>
                                                    <input id="venmo-transaction-id" type="text" value={transactionRef} onChange={handleRefChange} placeholder="Reference code" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                className="proceed-btn"
                                onClick={handleProceed}
                                disabled={isButtonDisabled}
                            >
                                {buttonText}
                            </button>
                        </div>
                    )}

                    {!(member.payment_status === 'pending' || member.payment_status === 'overdue' || member.payment_status === 'failed' || member.payment_status === 'rejected') && (
                        <div style={{ marginTop: '30px', padding: '20px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', textAlign: 'center' }}>
                            <strong>No Payment Due</strong>
                            <p style={{ margin: '5px 0 0', fontSize: '14px' }}>This registration is {member.payment_status.replace('_', ' ')}.</p>
                        </div>
                    )}
                </div>
            </div>

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

export default MembershipPayment;
