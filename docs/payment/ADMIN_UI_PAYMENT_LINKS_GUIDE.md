# 🎯 Admin UI Payment Links - User Guide

## ✅ What's New

You can now configure Stripe payment links directly from the Admin Panel without writing any SQL queries!

---

## 📋 Overview

### For Events:
Add **two separate Stripe links** per event:
- **Member Payment Link** → For members (e.g., $20)
- **Non-Member Payment Link** → For non-members (e.g., $30)

### For Memberships:
Add **three separate Stripe links** (one per tier):
- **Individual Membership Link** → For individual tier (e.g., $40-50)
- **Family Membership Link** → For family tier (e.g., $100)
- **Lifetime Membership Link** → For lifetime tier (e.g., $500)

---

## 🔧 Setup Instructions

### Part 1: Create Stripe Payment Links

#### Step 1: Login to Stripe Dashboard
Go to: https://dashboard.stripe.com/test/payment-links

#### Step 2: Create Payment Links for Events

**Create 2 links (you can reuse these for all events with same pricing):**

1. **Member Event Link ($20):**
   - Click **"+ New"**
   - Product name: "Event Registration - Member"
   - Amount: **$20.00**
   - Click **"Create link"**
   - **Copy the full URL** (e.g., `https://buy.stripe.com/test_xxxx`)
   - Save this URL somewhere temporarily

2. **Non-Member Event Link ($30):**
   - Click **"+ New"**
   - Product name: "Event Registration - Non-Member"
   - Amount: **$30.00**
   - Click **"Create link"**
   - **Copy the full URL**
   - Save this URL somewhere temporarily

#### Step 3: Create Payment Links for Memberships

**Create 3 links:**

1. **Individual Membership Link ($40 or $50):**
   - Click **"+ New"**
   - Product name: "Individual Membership - Annual"
   - Amount: **$40.00** or **$50.00** (check your pricing)
   - Click **"Create link"**
   - **Copy the URL**

2. **Family Membership Link ($100):**
   - Click **"+ New"**
   - Product name: "Family Membership - Annual"
   - Amount: **$100.00**
   - Click **"Create link"**
   - **Copy the URL**

3. **Lifetime Membership Link ($500):**
   - Click **"+ New"**
   - Product name: "Lifetime Membership"
   - Amount: **$500.00**
   - Click **"Create link"**
   - **Copy the URL**

---

### Part 2: Configure Admin Panel

#### A. For Events (Create/Edit Event)

1. **Login to Admin Panel**
   - Go to your website
   - Click **"Admin"** (top right)
   - Enter your credentials

2. **Navigate to Events Section**
   - Click **"Events"** in the admin menu

3. **Create New Event or Edit Existing**
   - To create: Click **"Create New Event"** button
   - To edit: Click the **edit icon** on an existing event

4. **Fill Event Details**
   - Fill in all required fields (name, date, location, etc.)

5. **Set Pricing** (scroll down to payment section)
   - **Member Price:** Enter `20` (or your member price)
   - **Non-Member Price:** Enter `30` (or your non-member price)

6. **Add Stripe Payment Links**
   - **Member Stripe Payment Link:**
     - Paste the Member link you created in Stripe
     - Example: `https://buy.stripe.com/test_member_link_here`
   
   - **Non-Member Stripe Payment Link:**
     - Paste the Non-Member link you created in Stripe
     - Example: `https://buy.stripe.com/test_nonmember_link_here`

7. **Save Event**
   - Click **"Create Event"** or **"Update Event"**

**✅ Done!** When users register:
- If they check "I am a member" → redirects to member link ($20)
- If they don't check member → redirects to non-member link ($30)

---

#### B. For Memberships (Settings Page)

1. **Navigate to Settings**
   - In Admin Panel, click **"Settings"** in the menu

2. **Scroll to "Membership Pricing" Section**

3. **Set Prices** (if not already set)
   - Individual Membership: `40` or `50`
   - Family Membership: `100`
   - Life Membership: `500`

4. **Scroll to "Stripe Payment Links" Section**

5. **Add Payment Links for Each Tier:**

   **Individual Membership Stripe Link:**
   - Paste: `https://buy.stripe.com/test_individual_link_here`
   - You'll see: "(for $40)" or "(for $50)" next to it

   **Family Membership Stripe Link:**
   - Paste: `https://buy.stripe.com/test_family_link_here`
   - You'll see: "(for $100)" next to it

   **Lifetime Membership Stripe Link:**
   - Paste: `https://buy.stripe.com/test_lifetime_link_here`
   - You'll see: "(for $500)" next to it

   **(Optional) General Stripe Link (Fallback):**
   - This is only used if tier-specific links are not set
   - You can leave this blank if you've added all three links above

6. **Save Settings**
   - Click **"Save Settings"** button at the bottom

**✅ Done!** When users register for membership:
- Select "Individual" → redirects to individual link ($40/$50)
- Select "Family" → redirects to family link ($100)
- Select "Lifetime" → redirects to lifetime link ($500)

---

## 🎯 How It Works

### Event Registration Flow:

```
User registers for event
    ↓
Selects "I am a member" checkbox (or not)
    ↓
System shows correct price
    ↓
User clicks "Pay via Stripe Link"
    ↓
System checks:
  - Is member? → Use member_payment_link
  - Not member? → Use non_member_payment_link
    ↓
Redirects to Stripe checkout with correct amount
```

### Membership Registration Flow:

```
User selects membership tier
    ↓
User fills registration form
    ↓
User submits
    ↓
System checks settings for tier-specific link:
  - Individual? → Use individualPaymentLink
  - Family? → Use familyPaymentLink
  - Lifetime? → Use lifePaymentLink
    ↓
Redirects to Stripe checkout
```

---

## 💡 Pro Tips

### 1. Reuse Links Across Events
If all your events have the same member/non-member pricing:
- Create ONE member link ($20)
- Create ONE non-member link ($30)
- Use these same links for ALL events
- Just copy-paste when creating new events

### 2. Update Prices Anytime
To change event pricing:
1. Create NEW Stripe links with new prices
2. Edit events in admin panel
3. Replace old links with new links
4. Save
✅ Price updated instantly!

### 3. Test Before Going Live
1. Use **TEST MODE** links first (contain `/test_` in URL)
2. Register as member and non-member
3. Verify correct amounts show in Stripe
4. Once confirmed, switch to **LIVE MODE** links

### 4. Check Payment Link Validity
Make sure your Stripe links:
- Start with `https://`
- Contain `buy.stripe.com`
- Are complete (no spaces or cuts)
- Are active in your Stripe dashboard

---

## 🔍 Troubleshooting

### Issue: "Invalid URL" error in admin panel
**Solution:**
- Make sure URL starts with `https://`
- Remove any spaces before/after the URL
- Copy the complete link from Stripe

### Issue: Wrong amount charged
**Solution:**
- Verify the Stripe link amount matches the price field
- If Member Price = $20, member link should be for $20
- Check in Stripe dashboard that link is for correct amount

### Issue: Payment link not working
**Solution:**
- Verify link is active in Stripe dashboard
- Test link directly in browser (should open Stripe checkout)
- Check you're not using expired or deleted links

### Issue: User sees no payment option
**Solution:**
- Make sure you saved the event/settings after adding links
- Check both price AND payment link fields are filled
- Refresh admin panel and verify links are still there

---

## 📸 Visual Guide

### Admin Events - Payment Section

When creating/editing an event, you'll see:

```
┌────────────────────────────────────────┐
│ Registration Fee (Optional)            │
│ [         ] e.g. 10.00                 │
├────────────────────────────────────────┤
│ Member Price (Optional)                │
│ [   20    ] e.g. 8.00                  │
├────────────────────────────────────────┤
│ Non-Member Price (Optional)            │
│ [   30    ] e.g. 12.00                 │
├────────────────────────────────────────┤
│ Member Stripe Payment Link (Optional)  │
│ [https://buy.stripe.com/test_member]   │
│ Stripe checkout link specifically for  │
│ members (uses member price)            │
├────────────────────────────────────────┤
│ Non-Member Stripe Payment Link         │
│ [https://buy.stripe.com/test_nonmem]   │
│ Stripe checkout link specifically for  │
│ non-members (uses non-member price)    │
└────────────────────────────────────────┘
```

### Admin Settings - Membership Section

In settings, you'll see:

```
┌────────────────────────────────────────┐
│ Membership Pricing                     │
├────────────────────────────────────────┤
│ Individual Membership ($)              │
│ [   40    ]                            │
├────────────────────────────────────────┤
│ Family Membership ($)                  │
│ [   100   ]                            │
├────────────────────────────────────────┤
│ Life Membership ($)                    │
│ [   500   ]                            │
├────────────────────────────────────────┤
│ Stripe Payment Links                   │
│ Add Stripe payment links for each      │
│ membership tier. When users select a   │
│ tier, they'll be redirected to the     │
│ corresponding link.                    │
├────────────────────────────────────────┤
│ Individual Membership Stripe Link      │
│ [https://buy.stripe.com/test_indiv]    │
│ Stripe checkout link for individual    │
│ membership ($40)                       │
├────────────────────────────────────────┤
│ Family Membership Stripe Link          │
│ [https://buy.stripe.com/test_family]   │
│ Stripe checkout link for family        │
│ membership ($100)                      │
├────────────────────────────────────────┤
│ Lifetime Membership Stripe Link        │
│ [https://buy.stripe.com/test_life]     │
│ Stripe checkout link for lifetime      │
│ membership ($500)                      │
├────────────────────────────────────────┤
│ General Stripe Link (Fallback)         │
│ [                                    ]  │
│ Fallback link if tier-specific links   │
│ are not set                            │
└────────────────────────────────────────┘

[Save Settings]
```

---

## ✨ Benefits

### No SQL Required ✅
- Configure everything from admin UI
- No database queries needed
- User-friendly interface

### Flexible Pricing ✅
- Different prices for members vs non-members
- Different prices for each membership tier
- Easy to update anytime

### One-Time Setup ✅
- Create Stripe links once
- Reuse for multiple events
- Quick event creation

### Instant Updates ✅
- Change links in admin panel
- Updates apply immediately
- No code deployment needed

---

## 🚀 Going to Production

When you're ready to accept real payments:

1. **Switch Stripe to Live Mode**
   - Go to Stripe dashboard
   - Toggle from "Test mode" to "Live mode"

2. **Create Live Payment Links**
   - Repeat the Stripe link creation
   - Links will now start with `/live_` instead of `/test_`

3. **Update Admin Panel**
   - Go to Events → Edit each event
   - Replace test links with live links
   - Go to Settings
   - Replace test membership links with live links

4. **Save Everything**
   - Save all events
   - Save settings

5. **Test One Payment**
   - Use a small amount to verify
   - Check money arrives in Stripe

**✅ You're live!**

---

## 📞 Need Help?

### Common Questions:

**Q: Do I need to create new links for each event?**
A: No! If all events have same pricing, reuse the same links.

**Q: Can I change prices later?**
A: Yes! Create new Stripe links with new prices, then update in admin panel.

**Q: What if I only want one price (no member discount)?**
A: Just fill the "Registration Fee" field and leave member/non-member fields empty.

**Q: Can I have different event prices?**
A: Yes! Create different Stripe links for different price points, then use them accordingly.

**Q: Do I need both member and non-member links?**
A: Only if you want different pricing. Otherwise, use the general payment link field.

---

## ✅ Summary

**For Events:**
1. Create 2 Stripe links (member $20, non-member $30)
2. Add links when creating/editing event in admin
3. Users get redirected to correct link based on member status

**For Memberships:**
1. Create 3 Stripe links (individual, family, lifetime)
2. Add links in Settings → Membership section
3. Users get redirected based on selected tier

**No database, no SQL, no code changes needed!**

Everything is managed from the admin panel UI. 🎉
