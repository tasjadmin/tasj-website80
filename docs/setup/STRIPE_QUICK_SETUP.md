# 🚀 Quick Setup Guide - Stripe Multiple Payment Links

## ⚡ 3-Step Setup (15 minutes)

### Step 1: Update Database (2 minutes)

1. Go to your Supabase Dashboard
2. Click **SQL Editor**
3. Open the file: `setup-stripe-payment-links.sql`
4. Copy ALL the SQL code
5. Paste into Supabase SQL Editor
6. Click **Run**
7. ✅ Done! Tables are now updated

---

### Step 2: Create Stripe Links (10 minutes)

**Go to:** https://dashboard.stripe.com/test/payment-links

#### For Events (create 2 links):

**Link 1 - Members:**
- Name: "Event Registration - Member"
- Amount: **$20.00**
- Click Create → **Copy URL**

**Link 2 - Non-Members:**
- Name: "Event Registration - Non-Member"  
- Amount: **$30.00**
- Click Create → **Copy URL**

#### For Memberships (create 3 links):

**Link 1 - Individual:**
- Name: "Individual Membership"
- Amount: **$40.00** (or $50 - check your pricing)
- Click Create → **Copy URL**

**Link 2 - Family:**
- Name: "Family Membership"
- Amount: **$100.00**
- Click Create → **Copy URL**

**Link 3 - Lifetime:**
- Name: "Lifetime Membership"
- Amount: **$500.00**
- Click Create → **Copy URL**

---

### Step 3: Add Links to Database (3 minutes)

Go back to Supabase SQL Editor and run these queries **with your actual URLs:**

```sql
-- FOR EVENTS
-- Replace 'Your Event Name' and the URLs with your actual values
UPDATE events 
SET 
  member_price = 20.00,
  non_member_price = 30.00,
  member_payment_link = 'PASTE_MEMBER_STRIPE_URL_HERE',
  non_member_payment_link = 'PASTE_NONMEMBER_STRIPE_URL_HERE'
WHERE name = 'Your Event Name';

-- FOR MEMBERSHIPS
UPDATE membership_types 
SET payment_link = 'PASTE_INDIVIDUAL_STRIPE_URL_HERE'
WHERE name = 'Individual';

UPDATE membership_types 
SET payment_link = 'PASTE_FAMILY_STRIPE_URL_HERE'
WHERE name = 'Family';

UPDATE membership_types 
SET payment_link = 'PASTE_LIFETIME_STRIPE_URL_HERE'
WHERE name = 'Life Membership';
```

---

## ✅ Test It

### Test Event Payment:
1. Go to your website → Events
2. Click on the event you configured
3. Click "Register"
4. ☑️ Check "I am a member" → Should show $20
5. Click "Pay via Stripe Link" → Should go to member link
6. Go back, uncheck member → Should show $30
7. Click "Pay via Stripe Link" → Should go to non-member link

### Test Membership Payment:
1. Go to Membership page
2. Select "Individual" → Submit → Should go to individual link ($40/$50)
3. Select "Family" → Submit → Should go to family link ($100)
4. Select "Lifetime" → Submit → Should go to lifetime link ($500)

---

## 🎯 How to Get Event Name for SQL Query

Don't know your exact event name? Run this query first:

```sql
-- See all your events
SELECT id, name, event_date 
FROM events 
ORDER BY event_date DESC;
```

Copy the exact `name` value and use it in the UPDATE query.

---

## 📋 Template for Multiple Events

If you have 3 events, run this for each one:

```sql
-- Event 1
UPDATE events SET 
  member_price = 20.00,
  non_member_price = 30.00,
  member_payment_link = 'URL_HERE',
  non_member_payment_link = 'URL_HERE'
WHERE name = 'Event Name 1';

-- Event 2
UPDATE events SET 
  member_price = 20.00,
  non_member_price = 30.00,
  member_payment_link = 'URL_HERE',
  non_member_payment_link = 'URL_HERE'
WHERE name = 'Event Name 2';

-- Event 3
UPDATE events SET 
  member_price = 20.00,
  non_member_price = 30.00,
  member_payment_link = 'URL_HERE',
  non_member_payment_link = 'URL_HERE'
WHERE name = 'Event Name 3';
```

**Tip:** You can reuse the same payment links for all events if the prices are the same!

---

## ⚠️ Important Notes

1. **Test Mode First:**
   - Use Stripe TEST mode links initially
   - Test links look like: `https://buy.stripe.com/test_xxxxx`
   - Once tested, create LIVE mode links

2. **Prices Must Match:**
   - Stripe link price = Database price
   - If member_price = 20, Stripe member link must also be $20

3. **URL Format:**
   - Must start with `https://`
   - Must be complete Stripe payment link
   - No spaces before/after URL

---

## 🆘 Troubleshooting

**"Query failed" error?**
→ Check event name is spelled exactly as in database (case-sensitive)

**Payment link not working?**
→ Make sure URL is complete and starts with `https://buy.stripe.com/`

**Wrong price showing?**
→ Clear browser cache (Ctrl+Shift+Delete) and refresh

**Need to change a link?**
→ Just run the UPDATE query again with new URL

---

## 📞 Need Help?

1. Check the full guide: `STRIPE_PAYMENT_LINKS_GUIDE.md`
2. Verify database with: `SELECT * FROM events WHERE name = 'Your Event'`
3. Test Stripe link directly in browser
4. Check browser console (F12) for errors

---

## ✨ You're Done!

Your payment system now:
- ✅ Charges members $20, non-members $30 for events
- ✅ Handles 3 different membership tiers automatically
- ✅ Uses Stripe's secure hosted checkout
- ✅ Works on all devices
- ✅ No code changes needed to update prices

**To change prices in the future:** Just create new Stripe links and update the database!
