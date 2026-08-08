# Email Confirmation Setup Guide

This guide explains how to set up email confirmation functionality for membership and event registrations using Supabase Edge Functions and Resend.

## 📧 Overview

The TASJ website automatically sends confirmation emails when users:
1. Complete membership registration
2. Register for any event

## 🚀 Setup Instructions

### Step 1: Create a Resend Account

1. Go to [Resend.com](https://resend.com) and create a free account
2. Verify your email address
3. Navigate to **API Keys** in the dashboard
4. Create a new API key and save it securely

**Free tier includes:**
- 100 emails per day
- 3,000 emails per month
- Perfect for testing and small organizations

### Step 2: Add Your Domain (Optional but Recommended)

For production use:
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `tasj.org`)
4. Follow the DNS configuration instructions
5. Wait for verification (usually 5-10 minutes)

**Without domain verification:**
- Emails will be sent from `onboarding@resend.dev`
- May be marked as spam

**With domain verification:**
- Emails sent from `noreply@yourdomain.com`
- Better deliverability and trust

### Step 3: Deploy Supabase Edge Function

1. **Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

2. **Login to Supabase**:
```bash
supabase login
```

3. **Link your project**:
```bash
supabase link --project-ref your-project-ref
```

4. **Set the Resend API key as a secret**:
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

5. **Deploy the email function**:
```bash
supabase functions deploy send-email
```

### Step 4: Update Email Configuration

Edit `/src/lib/emailService.js` and update the `from` field:

```javascript
// In the Resend API call, update:
from: 'TASJ <noreply@yourdomain.com>', // Update with your actual domain
```

### Step 5: Test the Integration

1. **Start your development server**:
```bash
npm start
```

2. **Test membership registration**:
   - Go to `/membership`
   - Complete the registration form
   - Check your email for confirmation

3. **Test event registration**:
   - Go to any event detail page
   - Register for the event
   - Check your email for confirmation

## 📋 Email Templates

### Membership Confirmation Email Includes:

- Welcome message
- Confirmation number
- Member details (name, email, phone)
- Membership type selected
- List of membership benefits
- Next steps for approval and payment
- Contact information

### Event Registration Email Includes:

- Registration confirmation
- Confirmation number
- Event details (name, date, time, location)
- Number of attendees
- Registration fee breakdown (member/non-member rates)
- Registrant details
- Dietary restrictions and special requests
- Important information and arrival instructions
- Contact information

## 🔧 Customization

### Modify Email Templates

Email templates are in `/src/lib/emailService.js`:

1. **Update branding**: Edit HTML/CSS in the email templates
2. **Change content**: Modify the text sections
3. **Add/remove sections**: Adjust the template structure

### Change Email Sender

Update the `from` field in the Edge Function:

```typescript
// In supabase/functions/send-email/index.ts
from: 'Your Organization <noreply@yourdomain.com>',
```

### Update Contact Information

In `/src/lib/emailService.js`, update contact details:

```javascript
Email: <a href="mailto:info@tasj.org">info@tasj.org</a>
Phone: (856) 123-4567
```

## 🐛 Troubleshooting

### Emails Not Sending

1. **Check Supabase logs**:
```bash
supabase functions logs send-email
```

2. **Verify API key**:
```bash
supabase secrets list
```

3. **Test Resend API directly**:
   - Use Resend dashboard to send a test email
   - Verify your API key is active

### Emails Going to Spam

1. **Set up SPF, DKIM, and DMARC records** for your domain
2. **Use a verified domain** instead of the default sender
3. **Avoid spam trigger words** in subject lines
4. **Include unsubscribe links** (for marketing emails)

### Common Errors

**"Missing RESEND_API_KEY"**
- Run: `supabase secrets set RESEND_API_KEY=your_key`
- Redeploy the function after setting secrets

**"Failed to send email"**
- Check Resend API status
- Verify API key permissions
- Check Resend dashboard for error logs

**"CORS error"**
- Edge function includes CORS headers by default
- Verify function is deployed correctly

## 📊 Monitoring

### Check Email Delivery

1. **Resend Dashboard**:
   - View all sent emails
   - Check delivery status
   - See bounce and complaint rates

2. **Supabase Logs**:
```bash
supabase functions logs send-email --limit 50
```

3. **Application Logs**:
   - Check browser console for email service responses
   - Look for success/error messages

## 💰 Cost Considerations

### Resend Pricing (as of 2024):

**Free Tier:**
- 3,000 emails/month
- 100 emails/day
- 1 domain

**Paid Plans:**
- Start at $20/month for 50,000 emails
- Pay-as-you-go options available

### Alternative Email Services

You can replace Resend with:
- **SendGrid**: Popular choice, free tier available
- **Mailgun**: Developer-friendly API
- **Amazon SES**: Cost-effective for high volume
- **Postmark**: Excellent deliverability

To switch providers, update the Edge Function API calls accordingly.

## 🔐 Security Best Practices

1. **Never commit API keys** to version control
2. **Use Supabase secrets** for all sensitive data
3. **Validate email inputs** to prevent injection
4. **Rate limit email sending** to prevent abuse
5. **Log email activity** for audit trails

## 📝 Additional Features

### Future Enhancements

Consider adding:
- Email verification for new registrations
- Password reset emails
- Event reminder emails (24 hours before)
- Payment confirmation emails
- Membership renewal reminders
- Welcome email series for new members

### Email Templates Library

Store templates in Supabase:
1. Create an `email_templates` table
2. Store HTML/text templates
3. Allow admin editing through dashboard
4. Version control for templates

## ✅ Testing Checklist

- [ ] Resend account created and verified
- [ ] API key generated and saved
- [ ] Edge function deployed successfully
- [ ] Secrets configured in Supabase
- [ ] Domain verified (for production)
- [ ] Test membership registration email sent
- [ ] Test event registration email sent
- [ ] Emails display correctly on mobile
- [ ] All links in emails work correctly
- [ ] Contact information is accurate
- [ ] Error handling tested and working

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Email Best Practices](https://sendgrid.com/blog/email-best-practices/)
- [DMARC Setup Guide](https://dmarc.org/)

---

**Email confirmation system is now ready!** 🎉

Users will receive professional confirmation emails for:
- ✅ Membership registrations
- ✅ Event registrations
- ✅ Detailed information and next steps
- ✅ Confirmation numbers for reference
