# Supabase Integration Setup Guide

This guide will help you set up Supabase for your TASJ website project.

## 🚀 Quick Setup

### 1. Database Setup

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `fguygjyhvopyeztebgdb`
3. **Navigate to SQL Editor**
4. **Copy and paste the entire contents of `database-schema.sql`** into the SQL Editor
5. **Click "Run"** to create all tables and set up the database

### 2. Authentication Setup

1. **Go to Authentication > Settings** in your Supabase dashboard
2. **Enable Email Authentication**:
   - Go to "Auth" > "Settings"
   - Under "Auth Providers", enable "Email"
   - Set "Confirm email" to `true` (recommended for production)
3. **Configure Email Templates** (optional):
   - Customize the confirmation email template
   - Add your organization branding

### 3. Row Level Security (RLS)

The database schema includes RLS policies, but you may need to:

1. **Go to Authentication > Policies** in your Supabase dashboard
2. **Verify all policies are enabled** for each table
3. **Test the policies** by creating a test user

### 4. Create Admin User

To create your first admin user:

1. **Go to Authentication > Users** in your Supabase dashboard
2. **Click "Add user"**
3. **Create a user** with email and password
4. **Note the User ID** from the created user
5. **Go to SQL Editor** and run:

```sql
-- Replace 'your-user-id-here' with the actual user ID from step 4
INSERT INTO admin_users (user_id, username, role) VALUES
('your-user-id-here', 'admin', 'admin');
```

### 5. Test the Integration

1. **Start your development server**:
   ```bash
   npm start
   ```

2. **Test the login page**:
   - Go to `/login`
   - Try creating a new account
   - Try logging in with your admin credentials

3. **Test membership registration**:
   - Go to `/membership`
   - Fill out the registration form
   - Check your Supabase dashboard to see the data

## 📊 Database Tables

Your Supabase database now includes these tables:

- **`members`** - Store member information and registrations
- **`events`** - Manage TASJ events
- **`leadership`** - Store leadership team information
- **`admin_users`** - Manage admin access
- **`membership_types`** - Define membership tiers and pricing
- **`gallery`** - Store gallery images
- **`sponsors`** - Manage sponsor information
- **`contact_messages`** - Store contact form submissions

## 🔐 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Public read access** for most content (events, leadership, etc.)
- **Admin-only access** for sensitive operations
- **Secure authentication** with Supabase Auth

## 🛠️ Available Functions

The integration includes these helper functions:

### Authentication
```javascript
import { auth } from './lib/supabase';

// Sign up
await auth.signUp(email, password, userData);

// Sign in
await auth.signIn(email, password);

// Sign out
await auth.signOut();

// Check if user is admin
await auth.isAdmin();
```

### Database Operations
```javascript
import { db } from './lib/supabase';

// Members
await db.getMembers();
await db.createMember(memberData);
await db.updateMember(id, updates);
await db.deleteMember(id);

// Events
await db.getEvents();
await db.createEvent(eventData);
await db.updateEvent(id, updates);
await db.deleteEvent(id);

// And more...
```

## 🎯 Next Steps

1. **Customize the database schema** if needed
2. **Set up email notifications** for new members
3. **Configure file storage** for images and documents
4. **Set up real-time subscriptions** for live updates
5. **Add data validation** and error handling

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid API key" error**:
   - Check that your Supabase URL and API key are correct
   - Verify the project is active

2. **"Permission denied" errors**:
   - Check RLS policies are enabled
   - Verify user authentication status
   - Ensure admin user is properly set up

3. **Database connection issues**:
   - Check your internet connection
   - Verify Supabase project is not paused
   - Check browser console for detailed error messages

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the browser console for error messages
- Check the Supabase dashboard logs

## 📝 Environment Variables (Optional)

For production, consider using environment variables:

Then update `src/lib/supabase.js` to use these variables.

---

**Your TASJ website is now fully integrated with Supabase! 🎉**

The website now has:
- ✅ User authentication and authorization
- ✅ Database persistence for all forms
- ✅ Admin panel with real data
- ✅ Secure data storage
- ✅ Scalable backend infrastructure
