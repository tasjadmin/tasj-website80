# Netlify Deployment Setup Guide

## ⚠️ CRITICAL: Environment Variables Configuration

Your app requires Supabase environment variables to function. Without these, you'll see a **white screen** on Netlify.

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (the long string under "Project API keys")

### Step 2: Add Environment Variables to Netlify

1. Log in to Netlify: https://app.netlify.com
2. Select your site: **tasj_website999**
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable** and add these two:

   **Variable 1:**
   - Key: `REACT_APP_SUPABASE_URL`
   - Value: Your Supabase Project URL (e.g., `https://xxxxxxxxxxxxx.supabase.co`)

   **Variable 2:**
   - Key: `REACT_APP_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon/public key

5. Click **Save**

### Step 3: Trigger a Rebuild

After adding environment variables, you need to rebuild your site:

**Option A - Via Netlify Dashboard:**
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**

**Option B - Via Git Push:**
1. Make any small change to your code (or just push again)
2. Netlify will automatically rebuild with the new environment variables

### Step 4: Verify Deployment

1. Wait for the build to complete (usually 2-3 minutes)
2. Visit your Netlify URL
3. You should now see your website instead of a white screen

---

## 🔍 Troubleshooting

### Still seeing a white screen?

1. **Check Browser Console:**
   - Open your Netlify site
   - Press F12 to open Developer Tools
   - Go to the **Console** tab
   - Look for error messages (share these with your developer)

2. **Check Build Logs:**
   - In Netlify, go to **Deploys** → Click on the latest deploy
   - Scroll through the build log for any errors
   - Look for "Build failed" or error messages

3. **Verify Environment Variables:**
   - Go to **Site settings** → **Environment variables**
   - Confirm both variables are listed
   - Make sure there are no extra spaces or quotes

### Common Issues:

- **Wrong Supabase URL format**: Must start with `https://` and end with `.supabase.co`
- **Incorrect API key**: Must be the anon/public key, NOT the service role key
- **Environment variables not saved**: After adding, you MUST trigger a new deploy

---

## 📱 Additional Netlify Configuration

Your site is already configured with:
- ✅ SPA routing redirect (`public/_redirects` file)
- ✅ Production build optimizations
- ✅ React 18 compatibility

---

## 🆘 Need Help?

If you're still experiencing issues:
1. Check the browser console for specific error messages
2. Review the Netlify build logs
3. Verify your Supabase project is active and accessible
4. Contact your developer with specific error messages

---

## 🔗 Quick Links

- Netlify Dashboard: https://app.netlify.com
- Supabase Dashboard: https://supabase.com/dashboard
- GitHub Repository: https://github.com/Eswar9999-hash/tasj_website999
