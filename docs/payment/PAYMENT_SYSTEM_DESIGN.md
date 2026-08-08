# TASJ Payment Authentication System - Design & Implementation Plan

## Executive Summary

This document outlines a comprehensive payment authentication system for the TASJ website that handles both **event registration payments** and **membership subscription payments** with support for **online** and **offline** payment modes.

### Current State Analysis

**Existing Infrastructure:**
- ✅ Supabase backend with authentication system
- ✅ Event registration system (event_registrations table)
- ✅ Membership registration system (members table)
- ✅ Admin authentication with role-based access control
- ✅ React 18 frontend with modern state management
- ❌ No payment processing infrastructure
- ❌ No payment gateway integration
- ❌ No transaction tracking system

---

## 1. Recommended Authentication & Payment Architecture

### 1.1 Authentication Framework Recommendation

**Primary Authentication: Supabase Auth (Already Implemented) + JWT Tokens**

**Why This Choice?**
- ✅ Already integrated in the codebase
- ✅ Provides secure session management via JWT tokens
- ✅ Row Level Security (RLS) support for data protection
- ✅ Built-in email verification and password reset
- ✅ OAuth support for future expansion (Google, Facebook, etc.)
- ✅ Automatic token refresh mechanism
- ✅ Server-side validation through Supabase backend

**Current Implementation Status:**
- Admin authentication: ✅ Implemented (`/src/lib/supabase.js`, `/src/pages/Login.js`)
- User authentication for payments: ❌ **Needs Implementation**

### 1.2 Payment Gateway Recommendation

**Recommended: Stripe + Offline Payment Tracking**

**Why Stripe?**
- ✅ Industry-leading security (PCI DSS Level 1 certified)
- ✅ Supports one-time payments and recurring subscriptions
- ✅ Built-in fraud detection (Stripe Radar)
- ✅ Excellent React integration (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
- ✅ Webhook support for real-time payment verification
- ✅ Supports multiple payment methods (cards, ACH, digital wallets)
- ✅ Detailed transaction logs and reporting
- ✅ Test mode for development

**Alternative Options Considered:**
- **PayPal**: Good brand recognition, but higher fees and less flexible
- **Square**: Excellent for in-person, limited for online subscriptions
- **Razorpay**: Great for India, limited US presence (TASJ is US-based)

---

## 2. System Architecture

### 2.1 Data Flow Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   User/Member   │────────▶│  React Frontend  │────────▶│  Supabase Auth  │
│  (Browser)      │         │  (Payment Form)  │         │   (JWT Token)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │                              │
                                     │                              │
                            ┌────────▼────────┐                     │
                            │  Payment Type   │                     │
                            │   Selection     │                     │
                            └────────┬────────┘                     │
                                     │                              │
                    ┌────────────────┴────────────────┐            │
                    │                                  │            │
            ┌───────▼────────┐              ┌────────▼────────┐   │
            │ Online Payment │              │ Offline Payment │   │
            │  (Stripe API)  │              │  (Manual Entry) │   │
            └───────┬────────┘              └────────┬────────┘   │
                    │                                 │            │
                    │                                 │            │
            ┌───────▼─────────────────────────────────▼────────────▼──┐
            │              Supabase Database                           │
            │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
            │  │  payments    │  │ transactions │  │ payment_logs │  │
            │  └──────────────┘  └──────────────┘  └──────────────┘  │
            └──────────────────────────────────────────────────────────┘
                    │
            ┌───────▼────────┐
            │  Stripe Webhook│
            │  (Verification)│
            └────────────────┘
```

### 2.2 Database Schema Design

**New Tables Required:**

#### Table 1: `payments`
Stores all payment records (both online and offline).

```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_type VARCHAR(20) NOT NULL, -- 'event_registration' or 'membership'
  reference_id UUID NOT NULL, -- Foreign key to events or members table
  payment_method VARCHAR(20) NOT NULL, -- 'stripe', 'check', 'cash', 'bank_transfer'
  payment_mode VARCHAR(10) NOT NULL, -- 'online' or 'offline'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
  
  -- Stripe-specific fields
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  
  -- Offline payment fields
  check_number VARCHAR(100),
  transaction_reference VARCHAR(255),
  receipt_url TEXT,
  notes TEXT,
  
  -- Metadata
  payer_name VARCHAR(255),
  payer_email VARCHAR(255),
  payer_phone VARCHAR(20),
  billing_address JSONB,
  
  -- Admin tracking
  verified_by UUID REFERENCES admin_users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_reference_id ON payments(reference_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_type ON payments(payment_type);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
```

#### Table 2: `payment_transactions`
Detailed transaction logs for audit trail.

```sql
CREATE TABLE payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'charge', 'refund', 'verification', 'update'
  amount DECIMAL(10,2),
  status VARCHAR(20) NOT NULL,
  gateway_response JSONB, -- Full response from payment gateway
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);
```

#### Table 3: `subscription_plans`
For recurring membership payments (future enhancement).

```sql
CREATE TABLE subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  membership_type VARCHAR(50) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'expired'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_user_id ON subscription_plans(user_id);
CREATE INDEX idx_subscription_plans_member_id ON subscription_plans(member_id);
CREATE INDEX idx_subscription_plans_stripe_subscription_id ON subscription_plans(stripe_subscription_id);
```

### 2.3 Modified Existing Tables

**Update `events` table:**
```sql
ALTER TABLE events 
ADD COLUMN registration_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN payment_required BOOLEAN DEFAULT false,
ADD COLUMN accept_offline_payment BOOLEAN DEFAULT true;
```

**Update `members` table:**
```sql
ALTER TABLE members 
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'partially_paid', 'overdue'
ADD COLUMN payment_id UUID REFERENCES payments(id),
ADD COLUMN subscription_id UUID REFERENCES subscription_plans(id);
```

**Update `event_registrations` table:**
```sql
ALTER TABLE event_registrations 
ADD COLUMN payment_id UUID REFERENCES payments(id),
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
```

---

## 3. Security Architecture

### 3.1 Multi-Layer Security Approach

#### Layer 1: Client-Side Security
- ✅ Supabase JWT token validation
- ✅ HTTPS-only communication
- ✅ Stripe Elements (PCI-compliant card input)
- ✅ Input validation and sanitization
- ✅ CSRF token implementation
- ✅ Environment variable protection

#### Layer 2: Network Security
- ✅ API rate limiting (Supabase built-in)
- ✅ IP whitelisting for admin actions
- ✅ Request signing for webhook verification
- ✅ TLS 1.3 encryption

#### Layer 3: Database Security
- ✅ Row Level Security (RLS) policies
- ✅ Encrypted sensitive data fields
- ✅ Audit logging for all payment operations
- ✅ Parameterized queries (SQL injection protection)

#### Layer 4: Payment Gateway Security
- ✅ PCI DSS compliance (handled by Stripe)
- ✅ 3D Secure authentication
- ✅ Stripe Radar fraud detection
- ✅ Webhook signature verification

### 3.2 Row Level Security (RLS) Policies

**For `payments` table:**
```sql
-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can view all payments
CREATE POLICY "Admins can view all payments"
ON payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Only admins can create offline payments
CREATE POLICY "Admins can create offline payments"
ON payments FOR INSERT
WITH CHECK (
  payment_mode = 'offline' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- System/authenticated users can create online payments
CREATE POLICY "Users can create online payments"
ON payments FOR INSERT
WITH CHECK (
  payment_mode = 'online' AND
  auth.uid() = user_id
);

-- Only admins can update payment verification
CREATE POLICY "Admins can verify payments"
ON payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
```

### 3.3 Authentication Flow

**For Payment Transactions:**

1. **Guest/Member Authentication:**
   - User enters payment page (event or membership)
   - System checks if user is logged in
   - If not logged in → Redirect to optional guest checkout OR login/signup
   - Generate JWT token with payment intent metadata

2. **Payment Token Generation:**
   ```javascript
   // Frontend creates payment intent with Supabase user context
   const { user } = await supabase.auth.getUser();
   const paymentIntent = await createPaymentIntent({
     userId: user?.id,
     amount: calculatedAmount,
     paymentType: 'event_registration',
     referenceId: eventId,
     metadata: { email, name, phone }
   });
   ```

3. **Transaction Authorization:**
   - Stripe validates payment method
   - Supabase validates user session
   - Server creates payment record with 'processing' status
   - Stripe processes payment
   - Webhook confirms payment success
   - Update payment status to 'completed'

4. **Admin Verification (Offline Payments):**
   - Admin logs in with Supabase Auth
   - Checks `admin_users` table for permissions
   - Creates payment record with 'pending' status
   - Admin uploads receipt/proof
   - Admin marks as 'verified'
   - System updates related records (event registration, membership)

---

## 4. Implementation Components

### 4.1 Frontend Components (React)

#### Component 1: PaymentMethodSelector
**Purpose:** Allow users to choose online or offline payment

```jsx
// /src/components/Payment/PaymentMethodSelector.js
import React from 'react';

const PaymentMethodSelector = ({ onSelect, allowOffline = true }) => {
  return (
    <div className="payment-method-selector">
      <h3>Select Payment Method</h3>
      
      <button onClick={() => onSelect('online')} className="payment-option">
        <div className="icon">💳</div>
        <div className="details">
          <h4>Pay Online</h4>
          <p>Credit/Debit Card, Digital Wallets</p>
        </div>
      </button>
      
      {allowOffline && (
        <button onClick={() => onSelect('offline')} className="payment-option">
          <div className="icon">📄</div>
          <div className="details">
            <h4>Pay Offline</h4>
            <p>Check, Cash, Bank Transfer</p>
          </div>
        </button>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
```

#### Component 2: StripePaymentForm
**Purpose:** Stripe Elements integration for online payments

```jsx
// /src/components/Payment/StripePaymentForm.js
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPayment } from '../../lib/paymentService';

const StripePaymentForm = ({ amount, paymentType, referenceId, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setProcessing(true);
    
    try {
      // Create payment intent on backend
      const { clientSecret, paymentId } = await createPayment({
        amount,
        paymentType,
        referenceId
      });
      
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });
      
      if (error) {
        onError(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentId);
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="card-element-container">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' },
            },
          },
        }} />
      </div>
      
      <button type="submit" disabled={!stripe || processing}>
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
};

export default StripePaymentForm;
```

#### Component 3: OfflinePaymentForm
**Purpose:** Capture offline payment details

```jsx
// /src/components/Payment/OfflinePaymentForm.js
import React, { useState } from 'react';
import { recordOfflinePayment } from '../../lib/paymentService';

const OfflinePaymentForm = ({ amount, paymentType, referenceId, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    paymentMethod: 'check',
    checkNumber: '',
    transactionReference: '',
    notes: '',
    payerName: '',
    payerEmail: '',
    payerPhone: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const paymentId = await recordOfflinePayment({
        ...formData,
        amount,
        paymentType,
        referenceId
      });
      
      onSuccess(paymentId);
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="offline-payment-form">
      <h3>Offline Payment Details</h3>
      
      <div className="form-group">
        <label>Payment Method</label>
        <select 
          value={formData.paymentMethod} 
          onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
        >
          <option value="check">Check</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
      </div>
      
      {formData.paymentMethod === 'check' && (
        <div className="form-group">
          <label>Check Number</label>
          <input 
            type="text" 
            value={formData.checkNumber}
            onChange={(e) => setFormData({...formData, checkNumber: e.target.value})}
            required
          />
        </div>
      )}
      
      <div className="form-group">
        <label>Transaction Reference (Optional)</label>
        <input 
          type="text" 
          value={formData.transactionReference}
          onChange={(e) => setFormData({...formData, transactionReference: e.target.value})}
        />
      </div>
      
      <div className="form-group">
        <label>Notes</label>
        <textarea 
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Add any additional payment details..."
        />
      </div>
      
      <div className="payment-summary">
        <p>Amount: <strong>${amount.toFixed(2)}</strong></p>
        <p className="info-text">
          Your registration will be marked as pending until payment is verified by an administrator.
        </p>
      </div>
      
      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Payment Information'}
      </button>
    </form>
  );
};

export default OfflinePaymentForm;
```

#### Component 4: AdminPaymentVerification
**Purpose:** Admin panel for verifying offline payments

```jsx
// /src/components/Admin/AdminPaymentVerification.js
import React, { useState, useEffect } from 'react';
import { getPendingPayments, verifyPayment } from '../../lib/paymentService';

const AdminPaymentVerification = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    const payments = await getPendingPayments();
    setPendingPayments(payments);
    setLoading(false);
  };

  const handleVerify = async (paymentId) => {
    try {
      await verifyPayment(paymentId);
      loadPendingPayments(); // Refresh list
    } catch (err) {
      alert('Failed to verify payment: ' + err.message);
    }
  };

  return (
    <div className="admin-payment-verification">
      <h2>Pending Payment Verification</h2>
      
      {loading ? (
        <p>Loading...</p>
      ) : pendingPayments.length === 0 ? (
        <p>No pending payments to verify.</p>
      ) : (
        <table className="payments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Payer</th>
              <th>Type</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingPayments.map(payment => (
              <tr key={payment.id}>
                <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                <td>{payment.payer_name}</td>
                <td>{payment.payment_type}</td>
                <td>{payment.payment_method}</td>
                <td>${payment.amount.toFixed(2)}</td>
                <td>{payment.check_number || payment.transaction_reference || 'N/A'}</td>
                <td>
                  <button onClick={() => handleVerify(payment.id)}>
                    Verify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPaymentVerification;
```

### 4.2 Backend Services

#### Service 1: Payment Service
**File:** `/src/lib/paymentService.js`

```javascript
import { supabase } from './supabase';

const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

export const createPayment = async ({ amount, paymentType, referenceId, metadata = {} }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Call Supabase Edge Function to create Stripe payment intent
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: Math.round(amount * 100), // Convert to cents
        paymentType,
        referenceId,
        userId: user?.id,
        metadata
      }
    });
    
    if (error) throw error;
    
    return {
      clientSecret: data.clientSecret,
      paymentId: data.paymentId
    };
  } catch (err) {
    console.error('Create payment error:', err);
    throw err;
  }
};

export const recordOfflinePayment = async (paymentData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_id: user?.id,
        payment_type: paymentData.paymentType,
        reference_id: paymentData.referenceId,
        payment_method: paymentData.paymentMethod,
        payment_mode: 'offline',
        amount: paymentData.amount,
        currency: 'USD',
        status: 'pending',
        check_number: paymentData.checkNumber,
        transaction_reference: paymentData.transactionReference,
        notes: paymentData.notes,
        payer_name: paymentData.payerName,
        payer_email: paymentData.payerEmail,
        payer_phone: paymentData.payerPhone,
        payment_date: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return data.id;
  } catch (err) {
    console.error('Record offline payment error:', err);
    throw err;
  }
};

export const getPendingPayments = async () => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  } catch (err) {
    console.error('Get pending payments error:', err);
    throw err;
  }
};

export const verifyPayment = async (paymentId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get admin user info
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!adminUser) throw new Error('Unauthorized');
    
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        verified_by: adminUser.id,
        verified_at: new Date().toISOString()
      })
      .eq('id', paymentId);
    
    if (error) throw error;
    
    // TODO: Update related event_registration or member record
    
    return true;
  } catch (err) {
    console.error('Verify payment error:', err);
    throw err;
  }
};

export const getPaymentHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  } catch (err) {
    console.error('Get payment history error:', err);
    throw err;
  }
};
```

### 4.3 Supabase Edge Functions

#### Edge Function: create-payment-intent
**File:** `/supabase/functions/create-payment-intent/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, paymentType, referenceId, userId, metadata } = await req.json();
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        paymentType,
        referenceId,
        userId,
        ...metadata
      },
      automatic_payment_methods: { enabled: true },
    });
    
    // Create payment record in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const paymentRecord = await fetch(`${supabaseUrl}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey!,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        payment_type: paymentType,
        reference_id: referenceId,
        payment_method: 'stripe',
        payment_mode: 'online',
        amount: amount / 100,
        currency: 'USD',
        status: 'processing',
        stripe_payment_intent_id: paymentIntent.id,
      })
    });
    
    const paymentData = await paymentRecord.json();
    
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentId: paymentData[0].id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

#### Edge Function: stripe-webhook
**File:** `/supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Update payment status in database
        await fetch(`${supabaseUrl}/rest/v1/payments?stripe_payment_intent_id=eq.${paymentIntent.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey!,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            status: 'completed',
            payment_date: new Date().toISOString(),
            stripe_charge_id: paymentIntent.latest_charge
          })
        });
        
        // Log transaction
        // TODO: Update event_registration or member payment_status
        
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        await fetch(`${supabaseUrl}/rest/v1/payments?stripe_payment_intent_id=eq.${paymentIntent.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey!,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            status: 'failed'
          })
        });
        
        break;
      }
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
```

---

## 5. Integration Points

### 5.1 Event Registration Payment Flow

**Modify `/src/pages/EventDetail.js`:**

```javascript
// Add after registration form submission
const handleRegistrationWithPayment = async (registrationData) => {
  // 1. Create event registration (status: pending_payment)
  const registration = await createEventRegistration({
    ...registrationData,
    payment_status: 'pending'
  });
  
  // 2. If event requires payment
  if (event.payment_required) {
    // Redirect to payment page
    navigate(`/payment/event/${registration.id}?amount=${event.registration_fee}`);
  } else {
    // Complete registration
    await updateRegistrationStatus(registration.id, 'confirmed');
  }
};
```

**Create new page `/src/pages/PaymentPage.js`:**

```javascript
import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentMethodSelector from '../components/Payment/PaymentMethodSelector';
import StripePaymentForm from '../components/Payment/StripePaymentForm';
import OfflinePaymentForm from '../components/Payment/OfflinePaymentForm';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const PaymentPage = () => {
  const { type, id } = useParams(); // type: 'event' or 'membership'
  const [searchParams] = useSearchParams();
  const amount = parseFloat(searchParams.get('amount') || '0');
  
  const [paymentMode, setPaymentMode] = useState(null);

  const handlePaymentSuccess = (paymentId) => {
    // Redirect to success page
    navigate(`/payment/success/${paymentId}`);
  };

  return (
    <div className="payment-page">
      <h1>Complete Your Payment</h1>
      
      {!paymentMode ? (
        <PaymentMethodSelector onSelect={setPaymentMode} />
      ) : paymentMode === 'online' ? (
        <Elements stripe={stripePromise}>
          <StripePaymentForm 
            amount={amount}
            paymentType={type === 'event' ? 'event_registration' : 'membership'}
            referenceId={id}
            onSuccess={handlePaymentSuccess}
            onError={(err) => alert(err)}
          />
        </Elements>
      ) : (
        <OfflinePaymentForm 
          amount={amount}
          paymentType={type === 'event' ? 'event_registration' : 'membership'}
          referenceId={id}
          onSuccess={handlePaymentSuccess}
          onError={(err) => alert(err)}
        />
      )}
    </div>
  );
};

export default PaymentPage;
```

### 5.2 Membership Registration Payment Flow

**Modify `/src/components/Membership/MembershipRegistration.js`:**

```javascript
// After successful membership registration
const handleSubmit = async (e) => {
  e.preventDefault();
  // ... existing registration logic
  
  const { data: member, error } = await db.createMember(memberData);
  
  if (!error) {
    // Redirect to payment
    navigate(`/payment/membership/${member.id}?amount=${getMembershipPrice(membershipType)}`);
  }
};
```

---

## 6. Environment Variables Required

Add to `.env` file:

```bash
# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase (already exists)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 7. Dependencies to Install

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

Update `package.json`:
```json
{
  "dependencies": {
    "@stripe/stripe-js": "^2.1.0",
    "@stripe/react-stripe-js": "^2.3.0"
  }
}
```

---

## 8. Testing Strategy

### 8.1 Test Environment Setup
1. Use Stripe test mode keys
2. Create test payment scenarios
3. Test webhook locally using Stripe CLI

### 8.2 Test Cases

**Online Payment:**
- ✅ Successful card payment
- ✅ Card declined
- ✅ Insufficient funds
- ✅ 3D Secure authentication
- ✅ Network failure during payment
- ✅ Webhook verification

**Offline Payment:**
- ✅ Check payment submission
- ✅ Cash payment recording
- ✅ Bank transfer verification
- ✅ Admin verification workflow
- ✅ Receipt upload

**Security:**
- ✅ Unauthorized access attempt
- ✅ JWT token expiration
- ✅ SQL injection attempts
- ✅ XSS attacks
- ✅ CSRF token validation

---

## 9. Deployment Checklist

### Phase 1: Database Setup
- [ ] Run database migration scripts
- [ ] Create RLS policies
- [ ] Set up indexes
- [ ] Test with sample data

### Phase 2: Stripe Configuration
- [ ] Create Stripe account
- [ ] Get API keys (test and production)
- [ ] Configure webhook endpoints
- [ ] Test webhook signature validation

### Phase 3: Frontend Implementation
- [ ] Create payment components
- [ ] Integrate Stripe Elements
- [ ] Build offline payment forms
- [ ] Add admin verification UI

### Phase 4: Backend Implementation
- [ ] Deploy Supabase Edge Functions
- [ ] Set up environment variables
- [ ] Configure CORS policies
- [ ] Test API endpoints

### Phase 5: Integration Testing
- [ ] End-to-end payment flow testing
- [ ] Webhook testing
- [ ] Error handling verification
- [ ] Security audit

### Phase 6: Production Deployment
- [ ] Switch to production Stripe keys
- [ ] Update environment variables
- [ ] Deploy to Netlify
- [ ] Monitor initial transactions
- [ ] Set up error logging

---

## 10. Compliance & Legal Considerations

### 10.1 PCI DSS Compliance
✅ **Using Stripe:** Stripe handles PCI compliance
✅ **Never store card numbers** in your database
✅ **Use Stripe Elements** for card input (prevents card data from touching your servers)

### 10.2 Privacy Policy Updates
Update privacy policy to include:
- Payment processing disclosure
- Data retention for transaction records
- Third-party payment processor (Stripe) usage
- Refund policy

### 10.3 Terms of Service Updates
Add sections for:
- Payment terms
- Refund policy
- Offline payment acceptance terms
- Membership payment obligations

---

## 11. Future Enhancements

### Phase 2 Features
1. **Recurring Subscriptions:**
   - Automatic annual membership renewals
   - Stripe Subscriptions API integration
   - Payment reminder emails

2. **Multiple Payment Methods:**
   - ACH direct debit
   - Apple Pay / Google Pay
   - PayPal integration

3. **Advanced Features:**
   - Partial payments / payment plans
   - Automatic late fee calculation
   - Multi-currency support
   - Receipt generation and email

4. **Reporting & Analytics:**
   - Payment analytics dashboard
   - Revenue forecasting
   - Payment failure analysis
   - Churn prediction

---

## 12. Support & Maintenance

### Monitoring
- Set up Stripe Dashboard monitoring
- Create Supabase alerts for failed transactions
- Log all payment errors to admin dashboard

### Regular Tasks
- Monthly reconciliation of payments
- Review failed payment logs
- Update Stripe API version as needed
- Security patch updates

---

## Conclusion

This comprehensive payment authentication system provides:
✅ Secure, PCI-compliant online payments
✅ Flexible offline payment tracking
✅ Role-based admin verification
✅ Complete audit trail
✅ Scalable architecture
✅ User-friendly experience

**Estimated Implementation Time:**
- Phase 1 (Database + Basic Setup): 1-2 weeks
- Phase 2 (Frontend Components): 2-3 weeks
- Phase 3 (Backend + Webhooks): 1-2 weeks
- Phase 4 (Testing + Deployment): 1-2 weeks

**Total: 5-9 weeks** for full implementation with comprehensive testing.

---

## Questions or Need Help?

For implementation assistance, refer to:
- Stripe Documentation: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- React Stripe.js: https://stripe.com/docs/stripe-js/react
