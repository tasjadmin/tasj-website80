# EmailJS Integration Setup Guide

The website now uses [EmailJS](https://www.emailjs.com/) for sending emails directly from the client side, replacing the previous Supabase Edge Functions + Resend integration.

## 1. Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/) and sign up for a free account.

## 2. Add Email Service
1. In the EmailJS dashboard, go to the **Email Services** tab.
2. Click **Add New Service**.
3. Select your email provider (e.g., **Gmail**).
4. Connect the account and create the service.
5. Note the **Service ID** (e.g., `service_xxxxx`).

## 3. Create Email Template
1. Go to the **Email Templates** tab.
2. Click **Create New Template**.
3. **Subject Line**: set this to `{{subject}}`.
4. **Content**:
   - Switch to the "HTML" source mode (usually `<>` button) or simply paste this variable into the body:
   - `{{{message_html}}}`
   - **Important**: Use TRIPLE braces `{{{ }}}` to ensure the HTML content isn't escaped.
   - Alternatively, you can design a simple wrapper and put `{{{message_html}}}` inside the content area.
5. **To Email**: Set this to `{{to_email}}`.
6. **From Name**: Set this to `TASJ Website` (or whatever you prefer).
7. Save the template.
8. Note the **Template ID** (e.g., `template_xxxxx`).

## 4. Get Public Key
1. Go to the **Account** page (click your avatar -> Account).
2. Look for the **API Keys** section.
3. Note your **Public Key** (starts with a prefix, usually a mix of letters/numbers).

## 5. Configure Environment Variables
1. Open your `.env` file in the project root.
2. Add the following variables with your keys:

```bash
REACT_APP_EMAILJS_SERVICE_ID=service_xxxxx
REACT_APP_EMAILJS_TEMPLATE_ID=template_xxxxx
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key_here
```

3. **Restart your development server** (`npm start`) for the changes to take effect.

## Verification
1. Go to the Client Admin Panel -> Settings.
2. Use the "Send Test Email" function.
3. If configured correctly, you should receive the test email immediately.
