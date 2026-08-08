# Stripe Multiple Payment Links - Complete Setup Guide

## 📋 Overview

This guide explains how to set up multiple Stripe payment links for your TASJ website to handle different pricing tiers for events and memberships.

---

## ✅ What Was Fixed

### The Problem:
- Single Stripe payment link couldn't handle multiple prices
- No way to charge different amounts for members vs non-members (events)
- No way to handle different membership tiers (Individual $50, Family $100, Lifetime $500)

### The Solution:
- **Dynamic payment link selection** based on user choice
- System automatically selects the correct Stripe link
- Supports unlimited price points

---

## 🔧 Step 1: Update Your Database Schema

Run this SQL in your Supabase SQL Editor to add the new columns:

```sql
-- Add payment link columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS member_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS non_member_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS member_payment_link TEXT,
ADD COLUMN IF NOT EXISTS non_member_payment_link TEXT;

-- Add payment link column to membership_types table
ALTER TABLE membership_types 
ADD COLUMN IF NOT EXISTS payment_link TEXT;
```

---

## 🔗 Step 2: Create Stripe Payment Links

### A. For Event Registrations

1. **Log in to Stripe Dashboard** → https://dashboard.stripe.com
2. Go to **Products** → **Payment Links**
3. Click **+ New** to create payment links

#### Create Member Event Link ($20):
- Product name: "Event Registration - Member"
- Price: $20.00
- Click **Create link**
- **Copy the full URL** (e.g., `https://buy.stripe.com/test_xxxxxxxxxxxx`)

#### Create Non-Member Event Link ($30):
- Product name: "Event Registration - Non-Member"
- Price: $30.00
- Click **Create link**
- **Copy the full URL**

### B. For Membership Registrations

Create three payment links:

#### Individual Membership Link ($50):
- Product name: "Individual Membership - Annual"
- Price: $50.00
- Click **Create link**
- **Copy the URL**

#### Family Membership Link ($100):
- Product name: "Family Membership - Annual"
- Price: $100.00
- Click **Create link**
- **Copy the URL**

#### Lifetime Membership Link ($500):
- Product name: "Lifetime Membership"
- Price: $500.00 (one-time payment)
- Click **Create link**
- **Copy the URL**

---

## 📊 Step 3: Add Payment Links to Your Database

### For Events:

Go to your Admin Panel → Events → Edit Event, or use Supabase directly:

```sql
-- Example: Update event with payment links
UPDATE events 
SET 
  member_price = 20.00,
  non_member_price = 30.00,
  member_payment_link = 'https://buy.stripe.com/test_member_link_here',
  non_member_payment_link = 'https://buy.stripe.com/test_nonmember_link_here'
WHERE name = 'Your Event Name';
```

### For Memberships:

Update the membership_types table:

```sql
-- Update Individual membership
UPDATE membership_types 
SET payment_link = 'https://buy.stripe.com/test_individual_link_here'
WHERE name = 'Individual';

-- Update Family membership
UPDATE membership_types 
SET payment_link = 'https://buy.stripe.com/test_family_link_here'
WHERE name = 'Family';

-- Update Lifetime membership
UPDATE membership_types 
SET payment_link = 'https://buy.stripe.com/test_lifetime_link_here'
WHERE name = 'Life Membership';
```

---

## 🎯 How It Works

### Event Registration Flow:

1. User registers for event
2. User selects "I am a member" checkbox (or not)
3. System calculates correct amount:
   - Member: Uses `member_price` ($20)
   - Non-Member: Uses `non_member_price` ($30)
4. User clicks "Pay via Stripe Link"
5. **System automatically selects:**
   - If member → redirects to `member_payment_link`
   - If non-member → redirects to `non_member_payment_link`

### Membership Registration Flow:

1. User selects membership type (Individual/Family/Lifetime)
2. User fills out registration form
3. System looks up the membership type in database
4. **System automatically redirects to the correct Stripe link:**
   - Individual → `individual payment_link`
   - Family → `family payment_link`
   - Lifetime → `lifetime payment_link`

---

## 🔍 Testing the System

### Test Event Payments:

1. Go to your Events page
2. Select an event
3. Click "Register"
4. **Test as Member:**
   - Check "I am a member"
   - Click Register
   - Verify amount shows $20
   - Click "Pay via Stripe Link"
   - Should redirect to member payment link

5. **Test as Non-Member:**
   - Uncheck "I am a member"
   - Click Register
   - Verify amount shows $30
   - Click "Pay via Stripe Link"
   - Should redirect to non-member payment link

### Test Membership Payments:

1. Go to Membership page
2. **Test Individual ($50):**
   - Select "Individual" membership
   - Fill form and submit
   - Verify amount shows $50
   - Click "Pay via Stripe Link"
   - Should redirect to individual membership link

3. **Test Family ($100):**
   - Select "Family" membership
   - Repeat process
   - Verify correct link

4. **Test Lifetime ($500):**
   - Select "Life Membership"
   - Repeat process
   - Verify correct link

---

## 🛠️ Admin Configuration (Future Enhancement)

You can add a UI in the Admin panel to manage payment links without SQL:

### Events Admin:
Add fields to the Create/Edit Event form:
- Member Price ($)
- Non-Member Price ($)
- Member Payment Link (URL)
- Non-Member Payment Link (URL)

### Membership Admin:
Add field to membership types:
- Stripe Payment Link (URL)

This will allow you to update payment links directly from the admin interface.

---

## 🔐 Security Notes

1. **Payment links are safe to store in database** - they're public URLs designed for sharing
2. **Test mode vs Live mode:**
   - Create separate links for test and production
   - Test links start with `https://buy.stripe.com/test_`
   - Live links start with `https://buy.stripe.com/live_`
3. **Link validation:** Stripe handles all payment security
4. **Database encryption:** Supabase encrypts data at rest

---

## 📱 Fallback Options

The system includes intelligent fallbacks:

### If specific payment links not set:
1. First tries: Event-specific member/non-member links
2. Falls back to: General event payment link
3. Falls back to: Manual Stripe Checkout integration

### If membership payment link not set:
1. First tries: Membership type-specific link
2. Falls back to: General membership link from settings
3. Falls back to: Manual Stripe Checkout integration

---

## ❓ Troubleshooting

### Issue: Wrong amount being charged

**Solution:** 
- Verify payment link was created for correct amount in Stripe
- Check database has correct link URL
- Clear browser cache and test again

### Issue: Payment link not redirecting

**Solution:**
- Verify URL is complete (starts with `https://`)
- Check link is active in Stripe dashboard
- Ensure no extra spaces in database URL field

### Issue: Member/Non-Member selection not working

**Solution:**
- Verify `is_member` parameter is in URL
- Check event has both `member_price` and `non_member_price` set
- Verify both payment links are configured

---

## 📞 Support

For issues:
1. Check browser console for errors (F12)
2. Verify database values are correct
3. Test payment links directly in browser
4. Contact Stripe support for payment link issues

---

## ✨ Summary

You now have a flexible payment system that:
- ✅ Supports multiple price points per event
- ✅ Handles member vs non-member pricing
- ✅ Manages different membership tiers
- ✅ Automatically selects correct Stripe link
- ✅ No code changes needed to add new prices
- ✅ Admin can update links via database

**Just create new Stripe payment links and add them to your database - the system handles the rest!**
