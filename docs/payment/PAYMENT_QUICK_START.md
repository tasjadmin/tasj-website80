# TASJ Payment System - Quick Start Guide

## Overview
This guide provides step-by-step instructions for implementing the comprehensive payment authentication system for TASJ website.

---

## 📋 Prerequisites Checklist

- [ ] Active Supabase project
- [ ] Stripe account (create at https://stripe.com)
- [ ] Node.js v14+ and npm installed
- [ ] Git repository access
- [ ] Admin access to Supabase dashboard
- [ ] Access to Netlify deployment settings

---

## 🚀 Quick Implementation Steps

### Step 1: Database Setup (30 minutes)

1. **Run Database Migration:**
   ```bash
   # In Supabase SQL Editor, run:
   setup-payment-system.sql
   ```

2. **Verify Tables Created:**
   - Go to Supabase Dashboard → Table Editor
   - Confirm new tables: `payments`, `payment_transactions`, `subscription_plans`
   - Verify modified tables: `events`, `members`, `event_registrations`

3. **Test RLS Policies:**
   - Verify policies are active in Supabase Dashboard → Authentication → Policies

### Step 2: Stripe Setup (20 minutes)

1. **Create Stripe Account:**
   - Sign up at https://dashboard.stripe.com/register
   - Complete business verification (can be done later)
   - Stay in **Test Mode** for development

2. **Get API Keys:**
   ```
   Dashboard → Developers → API keys
   
   Copy these values:
   - Publishable key: pk_test_...
   - Secret key: sk_test_...
   ```

3. **Create Webhook Endpoint:**
   ```
   Dashboard → Developers → Webhooks → Add endpoint
   
   Endpoint URL: https://[your-project].supabase.co/functions/v1/stripe-webhook
   
   Events to send:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
   
   Copy: Webhook signing secret (whsec_...)
   ```

### Step 3: Environment Configuration (10 minutes)

1. **Update `.env` file:**
   ```bash
   # Add these new variables:
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
   
   # Note: Secret keys go in Supabase Edge Function settings, NOT in .env
   ```

2. **Configure Supabase Edge Function Secrets:**
   ```bash
   # In Supabase Dashboard → Edge Functions → Settings
   
   Add secrets:
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Step 4: Install Dependencies (5 minutes)

```bash
cd /Users/gandhirachuri/Desktop/TASJ_Website

# Install Stripe libraries
npm install @stripe/stripe-js @stripe/react-stripe-js

# Verify installation
npm list @stripe/stripe-js @stripe/react-stripe-js
```

### Step 5: Create Payment Components (2-3 hours)

Create these files in order:

1. **Payment Service** - `/src/lib/paymentService.js`
   - Copy implementation from PAYMENT_SYSTEM_DESIGN.md (Section 4.2)
   
2. **Payment Method Selector** - `/src/components/Payment/PaymentMethodSelector.js`
   - Copy from PAYMENT_SYSTEM_DESIGN.md (Section 4.1, Component 1)
   
3. **Stripe Payment Form** - `/src/components/Payment/StripePaymentForm.js`
   - Copy from PAYMENT_SYSTEM_DESIGN.md (Section 4.1, Component 2)
   
4. **Offline Payment Form** - `/src/components/Payment/OfflinePaymentForm.js`
   - Copy from PAYMENT_SYSTEM_DESIGN.md (Section 4.1, Component 3)
   
5. **Payment Page** - `/src/pages/PaymentPage.js`
   - Copy from PAYMENT_SYSTEM_DESIGN.md (Section 5.1)
   
6. **Admin Payment Verification** - `/src/components/Admin/AdminPaymentVerification.js`
   - Copy from PAYMENT_SYSTEM_DESIGN.md (Section 4.1, Component 4)

### Step 6: Create Supabase Edge Functions (1 hour)

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Initialize Functions:**
   ```bash
   supabase functions new create-payment-intent
   supabase functions new stripe-webhook
   ```

4. **Copy Function Code:**
   - Copy `create-payment-intent` code from PAYMENT_SYSTEM_DESIGN.md (Section 4.3)
   - Copy `stripe-webhook` code from PAYMENT_SYSTEM_DESIGN.md (Section 4.3)

5. **Deploy Functions:**
   ```bash
   supabase functions deploy create-payment-intent
   supabase functions deploy stripe-webhook
   ```

### Step 7: Update Existing Components (1-2 hours)

1. **Modify EventDetail.js:**
   - Add payment flow after registration
   - Redirect to payment page if event requires payment
   
2. **Modify MembershipRegistration.js:**
   - Add payment flow after membership registration
   - Redirect to payment page with membership amount

3. **Update Admin.js:**
   - Add new tab for "Payment Verification"
   - Import AdminPaymentVerification component

4. **Update Navigation (if needed):**
   - Add route for `/payment/:type/:id`

### Step 8: Create Payment Styles (30 minutes)

Create `/src/components/Payment/Payment.css`:

```css
.payment-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
}

.payment-method-selector {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 30px 0;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.payment-option:hover {
  border-color: #1A237E;
  box-shadow: 0 4px 12px rgba(26, 35, 126, 0.1);
  transform: translateY(-2px);
}

.payment-option .icon {
  font-size: 2.5rem;
}

.payment-option .details h4 {
  margin: 0 0 5px 0;
  color: #1A237E;
  font-size: 1.2rem;
}

.payment-option .details p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.stripe-payment-form,
.offline-payment-form {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.card-element-container {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 20px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

.payment-summary {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.payment-summary p {
  margin: 10px 0;
}

.info-text {
  color: #666;
  font-size: 0.9rem;
  font-style: italic;
}

button[type="submit"] {
  width: 100%;
  padding: 15px;
  background: #1A237E;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

button[type="submit"]:hover:not(:disabled) {
  background: #0D1446;
}

button[type="submit"]:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

### Step 9: Testing (1-2 hours)

1. **Test Online Payment:**
   ```
   Use Stripe test cards:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002
   - 3D Secure: 4000 0027 6000 3184
   
   Any future expiry date, any CVC
   ```

2. **Test Offline Payment:**
   - Submit offline payment form
   - Login as admin
   - Verify payment in admin panel

3. **Test Webhooks Locally:**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   
   # Forward webhooks to local
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```

### Step 10: Deployment (30 minutes)

1. **Build Application:**
   ```bash
   npm run build
   ```

2. **Update Netlify Environment Variables:**
   - Go to Netlify → Site settings → Environment variables
   - Add: `REACT_APP_STRIPE_PUBLISHABLE_KEY`

3. **Deploy to Netlify:**
   ```bash
   git add .
   git commit -m "Add payment system implementation"
   git push origin main
   ```

4. **Update Stripe Webhook:**
   - Go to Stripe Dashboard → Webhooks
   - Update endpoint URL to production:
     `https://[your-project].supabase.co/functions/v1/stripe-webhook`

5. **Switch to Production Keys (when ready):**
   - Replace test keys with live keys
   - Complete Stripe account verification
   - Test with real card (small amount)

---

## 🔍 Testing Checklist

### Online Payment Tests
- [ ] Successful payment (4242 4242 4242 4242)
- [ ] Declined payment (4000 0000 0000 0002)
- [ ] 3D Secure authentication (4000 0027 6000 3184)
- [ ] Payment webhook received and processed
- [ ] Payment status updated in database
- [ ] Event registration/membership marked as paid

### Offline Payment Tests
- [ ] Submit check payment details
- [ ] Submit cash payment details
- [ ] Admin can view pending payments
- [ ] Admin can verify payment
- [ ] Payment status updated after verification
- [ ] Related record updated (event registration/membership)

### Security Tests
- [ ] Non-admin cannot verify payments
- [ ] User can only view their own payments
- [ ] Stripe Elements loads correctly (PCI compliance)
- [ ] Environment variables not exposed in frontend
- [ ] Webhook signature verification works

### Integration Tests
- [ ] Event registration → Payment → Confirmation flow
- [ ] Membership registration → Payment → Confirmation flow
- [ ] Payment history displays correctly
- [ ] Admin payment dashboard shows all payments

---

## 🐛 Troubleshooting

### Issue: Stripe Elements not loading
**Solution:** Check if publishable key is correct and starts with `pk_test_` or `pk_live_`

### Issue: Webhook not receiving events
**Solution:** 
1. Verify webhook URL is correct
2. Check webhook signing secret matches
3. Test with Stripe CLI locally

### Issue: RLS blocking queries
**Solution:**
1. Check if user is authenticated
2. Verify RLS policies are correct
3. Use Supabase service role for Edge Functions

### Issue: Payment intent creation fails
**Solution:**
1. Check Stripe secret key is set in Edge Function
2. Verify amount is in cents (multiply by 100)
3. Check Edge Function logs in Supabase

---

## 📊 Monitoring & Maintenance

### Daily Tasks
- [ ] Check Stripe dashboard for failed payments
- [ ] Review pending offline payments for verification

### Weekly Tasks
- [ ] Reconcile payment records with Stripe
- [ ] Review payment failure logs
- [ ] Check for refund requests

### Monthly Tasks
- [ ] Generate payment analytics report
- [ ] Review and update payment policies if needed
- [ ] Check for Stripe API updates

---

## 📚 Additional Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe Test Cards:** https://stripe.com/docs/testing
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **React Stripe.js:** https://stripe.com/docs/stripe-js/react
- **PCI Compliance:** https://stripe.com/docs/security/guide

---

## ✅ Launch Checklist

Before going live with production:

- [ ] Complete Stripe account verification
- [ ] Switch to production API keys
- [ ] Update all environment variables
- [ ] Test payment flow end-to-end with real card
- [ ] Update privacy policy with payment processing info
- [ ] Update terms of service with refund policy
- [ ] Set up payment failure email notifications
- [ ] Configure admin alert for pending offline payments
- [ ] Document payment reconciliation process
- [ ] Train admin team on payment verification

---

## 🎯 Success Metrics

Track these KPIs after launch:

- **Payment Success Rate:** Target > 95%
- **Average Payment Processing Time:** Target < 5 seconds
- **Offline Payment Verification Time:** Target < 24 hours
- **Failed Payment Rate:** Target < 5%
- **Refund Rate:** Target < 2%

---

## 🆘 Support Contacts

- **Stripe Support:** https://support.stripe.com
- **Supabase Support:** https://supabase.com/support
- **Technical Issues:** Create issue in GitHub repository

---

**Last Updated:** December 2025  
**Version:** 1.0.0  
**Status:** Ready for Implementation
