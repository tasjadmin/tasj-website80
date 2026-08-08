# 🎨 Payment Flow Diagrams

## Event Registration Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REGISTERS FOR EVENT                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         User Checks: ☑ "I am a member"  (or leaves unchecked)│
└─────────────────────────────────────────────────────────────┘
                           ↓
         ┌─────────────────┴─────────────────┐
         ↓                                    ↓
   ┌──────────┐                         ┌──────────┐
   │ IS MEMBER │                         │NOT MEMBER│
   └──────────┘                         └──────────┘
         ↓                                    ↓
   Price = $20                           Price = $30
         ↓                                    ↓
┌─────────────────┐                  ┌─────────────────┐
│ member_price    │                  │non_member_price │
│ member_payment_ │                  │non_member_      │
│ link            │                  │payment_link     │
└─────────────────┘                  └─────────────────┘
         ↓                                    ↓
         └────────────────┬─────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│          REDIRECT TO CORRECT STRIPE CHECKOUT                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT COMPLETED                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Membership Registration Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│              USER SELECTS MEMBERSHIP TYPE                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                  ↓
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │INDIVIDUAL│      │  FAMILY  │      │ LIFETIME │
  │  $40-50  │      │   $100   │      │   $500   │
  └──────────┘      └──────────┘      └──────────┘
        ↓                 ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Query DB for │  │ Query DB for │  │ Query DB for │
│ 'Individual' │  │   'Family'   │  │     'Life    │
│ payment_link │  │ payment_link │  │  Membership' │
│              │  │              │  │ payment_link │
└──────────────┘  └──────────────┘  └──────────────┘
        ↓                 ↓                  ↓
        └─────────────────┼──────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│          REDIRECT TO TIER-SPECIFIC STRIPE LINK               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT COMPLETED                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        EVENTS TABLE                          │
├─────────────────────────────────────────────────────────────┤
│ id                    │ UUID                                 │
│ name                  │ VARCHAR(255)                         │
│ member_price          │ DECIMAL(10,2) ────┐                 │
│ non_member_price      │ DECIMAL(10,2) ────┼─ NEW COLUMNS    │
│ member_payment_link   │ TEXT          ────┼─ NEW COLUMNS    │
│ non_member_payment_   │ TEXT          ────┘ NEW COLUMNS     │
│   link                │                                      │
│ ...                   │                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   MEMBERSHIP_TYPES TABLE                     │
├─────────────────────────────────────────────────────────────┤
│ id                    │ UUID                                 │
│ name                  │ VARCHAR(100)                         │
│ price                 │ DECIMAL(10,2)                        │
│ payment_link          │ TEXT ──────────── NEW COLUMN        │
│ ...                   │                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Payment Link Selection Logic

### For Events:

```javascript
if (isMember && event.member_payment_link) {
    → Use member_payment_link
} else if (!isMember && event.non_member_payment_link) {
    → Use non_member_payment_link
} else if (event.payment_link_url) {
    → Fallback to general link
} else {
    → Use manual Stripe checkout
}
```

### For Memberships:

```javascript
1. Get membership type name (e.g., 'Individual')
2. Query database: SELECT payment_link FROM membership_types WHERE name = 'Individual'
3. If payment_link exists:
    → Redirect to that link
4. Else:
    → Fallback to general settings link
5. Else:
    → Use manual Stripe checkout
```

---

## Complete System Architecture

```
┌──────────────┐
│    USER      │
└──────┬───────┘
       │
       ↓
┌────────────────────────────────────────────────────────┐
│              FRONTEND (React Components)                │
│                                                         │
│  EventDetail.js → Collects registration + is_member    │
│  MembershipReg.js → Collects data + membership_type    │
└────────────────┬───────────────────────────────────────┘
                 ↓
          Pass via URL params
                 ↓
┌────────────────────────────────────────────────────────┐
│              PaymentPage.js                             │
│                                                         │
│  1. Read: is_member, membership_type from URL           │
│  2. Query database for event or membership type         │
│  3. Select correct payment link                         │
│  4. Display payment options                             │
└────────────────┬───────────────────────────────────────┘
                 ↓
          User clicks "Pay via Stripe Link"
                 ↓
┌────────────────────────────────────────────────────────┐
│              PaymentMethodSelector.js                   │
│                                                         │
│  onClick('link') → window.location.assign(paymentLink)  │
└────────────────┬───────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│              STRIPE CHECKOUT PAGE                       │
│            (Hosted by Stripe)                           │
│                                                         │
│  - Secure payment processing                            │
│  - Card collection                                      │
│  - Payment confirmation                                 │
└────────────────┬───────────────────────────────────────┘
                 ↓
        User completes payment
                 ↓
┌────────────────────────────────────────────────────────┐
│           PAYMENT SUCCESS PAGE                          │
│         (Back to your website)                          │
└────────────────────────────────────────────────────────┘
```

---

## Data Flow Example: Member Registers for Event

```
Step 1: User Input
┌────────────────────────────────────────┐
│ Name: John Doe                         │
│ Email: john@example.com                │
│ ☑ I am a member                        │
│ Attendees: 2                           │
└────────────────────────────────────────┘

Step 2: Price Calculation
┌────────────────────────────────────────┐
│ is_member = true                       │
│ event.member_price = $20               │
│ attendees = 2                          │
│ total = $20 × 2 = $40                  │
└────────────────────────────────────────┘

Step 3: Create URL
┌────────────────────────────────────────┐
│ /payment/event/{event-id}?             │
│   amount=40.00                         │
│   &name=John%20Doe                     │
│   &email=john@example.com              │
│   &is_member=true                      │
│   &reg_id={registration-id}            │
└────────────────────────────────────────┘

Step 4: Load Payment Link
┌────────────────────────────────────────┐
│ isMember = true (from URL)             │
│ Query: SELECT * FROM events WHERE id   │
│ Result: member_payment_link =          │
│   'https://buy.stripe.com/member'      │
└────────────────────────────────────────┘

Step 5: Redirect to Stripe
┌────────────────────────────────────────┐
│ window.location.assign(                │
│   'https://buy.stripe.com/member'      │
│ )                                      │
└────────────────────────────────────────┘
```

---

## Stripe Dashboard Setup

```
┌───────────────────────────────────────────────────────────┐
│                STRIPE DASHBOARD                            │
│           dashboard.stripe.com/payment-links               │
└───────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
┌─────────────────┐           ┌─────────────────┐
│   TEST MODE     │           │   LIVE MODE     │
│                 │           │                 │
│ For development │           │ For production  │
│ & testing       │           │ Real payments   │
└─────────────────┘           └─────────────────┘
        ↓                               ↓
   Create 5 links                  Create 5 links
   Copy URLs                       Copy URLs
        ↓                               ↓
   Add to database                 Replace test URLs
   (test mode)                     with live URLs
```

---

## Quick Reference: Which Link Gets Used?

### Event Registration:

| User Action        | Database Field Used        | Stripe Link Selected           |
|-------------------|---------------------------|--------------------------------|
| ☑ I am a member   | `member_payment_link`     | Member link ($20)              |
| ☐ I am a member   | `non_member_payment_link` | Non-member link ($30)          |
| No links set      | `payment_link_url`        | General fallback               |

### Membership Registration:

| Tier Selected     | Database Query            | Stripe Link Selected           |
|-------------------|---------------------------|--------------------------------|
| Individual        | `WHERE name='Individual'` | Individual link ($40/$50)      |
| Family            | `WHERE name='Family'`     | Family link ($100)             |
| Lifetime          | `WHERE name='Life...'`    | Lifetime link ($500)           |

---

## File Modification Summary

```
Modified Files:
├── database-schema.sql ──────────── Updated schema
├── src/
│   ├── lib/
│   │   └── supabase.js ──────────── Added getMembershipTypeByName()
│   ├── pages/
│   │   ├── EventDetail.js ───────── Added is_member to URL
│   │   └── PaymentPage.js ───────── Smart link selection logic
│   └── components/
│       └── Membership/
│           └── MembershipRegistration.js ─ Added membership_type to URL

New Files:
├── setup-stripe-payment-links.sql ─ Database migration
├── STRIPE_QUICK_SETUP.md ────────── Quick start guide
├── STRIPE_PAYMENT_LINKS_GUIDE.md ─ Detailed guide
├── PAYMENT_SYSTEM_FIX_SUMMARY.md ─ This summary
└── PAYMENT_FLOW_DIAGRAMS.md ─────── Visual diagrams
```

---

## Success Criteria ✅

| Feature | Status |
|---------|--------|
| Events charge different prices for members vs non-members | ✅ Done |
| Memberships support multiple tiers with different prices | ✅ Done |
| System automatically selects correct Stripe link | ✅ Done |
| Works with existing payment methods (fallback) | ✅ Done |
| No code changes needed to update prices | ✅ Done |
| Easy to add more events/tiers | ✅ Done |
| Documented for client handover | ✅ Done |

**All requirements met!** 🎉
