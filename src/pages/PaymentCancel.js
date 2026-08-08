import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './PaymentSuccess.css';

const PaymentCancel = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="payment-success-page">
            <div className="success-container">
                <motion.div
                    className="success-content"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="success-icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)' }}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                        </svg>
                    </motion.div>

                    <h1>Transaction Failed</h1>
                    <p className="success-message">
                        We could not complete your payment. Please try again or use a different payment method.
                    </p>

                    <div className="payment-details-card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ marginBottom: '1rem' }}>You can try again or choose a different payment method.</p>
                        <p style={{ fontSize: '0.9rem' }}>If you continue to experience issues, please contact support.</p>
                    </div>

                    <div className="success-actions">
                        <Link to="/" className="btn btn-outline">
                            Return Home
                        </Link>
                        <Link to="/events" className="btn btn-primary">
                            Back to Events
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PaymentCancel;
