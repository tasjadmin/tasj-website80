# 🚀 Email Confirmation Quick Start

Get your email confirmation system running in **10 minutes**!

## Step 1: Create Resend Account (3 minutes)

1. Go to **[https://resend.com](https://resend.com)**
2. Click **Sign Up** (free account)
3. Verify your email
4. Go to **API Keys** section
5. Click **Create API Key**
6. Copy the key (starts with `re_`)

**Free Tier**: 3,000 emails/month, 100/day - perfect for getting started!

## Step 2: Deploy Edge Function (5 minutes)

Open your terminal and run these commands:

```bash
# 1. Install Supabase CLI (if not already installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project (get project-ref from Supabase dashboard)
supabase link --project-ref your-project-ref-here

# 4. Set your Resend API key as a secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# 5. Deploy the email function
supabase functions deploy send-email
```

✅ **Done!** The Edge Function is now deployed and ready.

## Step 3: Test It (2 minutes)

```bash
# Start your development server
npm start
```

### Test Membership Registration:
1. Navigate to `/membership` page
2. Fill out registration form
3. Submit the form
4. **Check your email** for confirmation! 📧

### Test Event Registration:
1. Go to any event detail page
2. Click **Register** button
3. Fill out registration form
4. Submit the form
5. **Check your email** for confirmation! 📧

## ✅ Success!

You should receive professional confirmation emails with:
- **Unique confirmation numbers**
- **Complete registration details**
- **TASJ branding and colors**
- **Next steps information**

## 🎨 Customize (Optional)

### Change Email Content

Edit `/src/lib/emailService.js`:
```javascript
// Update welcome message
<h2 style="color: #1A237E;">Welcome to TASJ, ${memberData.first_name}!</h2>

// Update contact information
Email: <a href="mailto:info@tasj.org">info@tasj.org</a>
Phone: (856) 123-4567
```

### Change Email Sender

Edit `/supabase/functions/send-email/index.ts`:
```typescript
from: 'TASJ <noreply@yourdomain.com>', // Update with your domain
```

### Add Domain Verification (Production)

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `tasj.org`)
4. Follow DNS configuration steps
5. Wait for verification (~5-10 minutes)

**Benefits**: Better email deliverability, professional sender address

## 🐛 Troubleshooting

### Emails Not Sending?

```bash
# Check Edge Function logs
supabase functions logs send-email

# Verify API key is set
supabase secrets list

# Test in Resend dashboard
# Go to Resend → Emails → Send Test Email
```

### Common Issues:

**"Missing RESEND_API_KEY"**
```bash
supabase secrets set RESEND_API_KEY=your_key_here
```

**"Function not found"**
```bash
supabase functions deploy send-email
```

**Registration works but no email**
- Check browser console for errors
- Verify Supabase Edge Function is deployed
- Check Resend dashboard for delivery status

## 📊 Monitor Emails

### In Resend Dashboard:
- View all sent emails
- Check delivery status
- See bounce/complaint rates
- Track email opens (if enabled)

### In Browser Console:
```javascript
// Look for these messages:
"Confirmation email sent successfully: ABC123XYZ"
"Email sending failed, but registration was successful"
```

## 💰 Cost Reference

**Resend Pricing:**
- **Free**: 3,000 emails/month, 100/day
- **Pro**: $20/month for 50,000 emails
- **Enterprise**: Custom pricing

**Most organizations start with the free tier!**

## 📚 Full Documentation

For detailed information:
- **Setup Guide**: `/docs/setup/EMAIL_SETUP.md` (complete setup instructions)
- **Feature Docs**: `/docs/features/EMAIL_CONFIRMATION.md` (implementation details)
- **Summary**: `EMAIL_CONFIRMATION_SUMMARY.md` (what was implemented)

## ✨ What's Included

### Membership Confirmation Email:
✅ Welcome message  
✅ Confirmation number  
✅ Member details  
✅ Membership benefits list  
✅ Next steps  
✅ Contact info  

### Event Registration Email:
✅ Event details (date, time, location)  
✅ Confirmation number  
✅ Attendee count  
✅ Fee breakdown  
✅ Important information  
✅ Contact info  

---

**That's it!** 🎉

Your email confirmation system is now live and sending professional emails to your users.

**Questions?** See full documentation in `/docs/setup/EMAIL_SETUP.md`
