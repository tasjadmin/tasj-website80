# TASJ Website - Settings Management System

## Overview

The TASJ website now features a comprehensive settings management system that allows administrators to update site-wide information through the admin panel. Changes made in the admin settings are automatically reflected across all pages of the website.

## Features

The settings system manages the following information:

### 1. **General Information**
- Site Name
- Site Description
- Contact Email
- Contact Phone
- Physical Address

### 2. **Social Media Links**
- Facebook URL
- X (Twitter) URL
- Instagram URL
- Email Contact

### 3. **Membership Pricing**
- Individual Membership Price
- Family Membership Price
- Life Membership Price

## Database Setup

### Step 1: Create the Settings Table

Run the following SQL script in your Supabase SQL Editor:

```sql
-- Located in: setup-site-settings-table.sql
```

Or manually execute:
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Run the `setup-site-settings-table.sql` file

This will:
- Create the `site_settings` table
- Insert default settings
- Disable Row Level Security (as we're using localStorage authentication)
- Create necessary indexes

## How It Works

### Architecture

1. **Settings Context** (`src/contexts/SettingsContext.js`)
   - Provides global access to settings throughout the app
   - Loads settings from Supabase on app startup
   - Provides methods to update settings

2. **Admin Settings Panel** (`src/components/Admin/AdminSettings.js`)
   - Allows admins to edit all settings
   - Saves changes to Supabase database
   - Provides real-time feedback on save operations

3. **Dynamic Components**
   - **Footer**: Uses settings for contact info, social links, and site name
   - **Membership Pricing**: Displays dynamic pricing from settings
   - All components automatically update when settings change

### Data Flow

```
Admin Panel → Update Settings → Supabase Database → Settings Context → All Components
```

## Usage

### For Administrators

1. **Access Admin Settings**
   - Log in to the admin panel
   - Navigate to the "Settings" tab
   - Modify any settings as needed

2. **Update Settings**
   - Edit the desired fields
   - Click "Save Settings"
   - Wait for confirmation message
   - Changes are immediately reflected site-wide

3. **Supported Updates**
   - General Information: Site name, description, contact details
   - Social Media: Facebook, Twitter, Instagram, Email links
   - Membership: Individual, Family, and Life membership prices

### Where Settings Are Used

1. **Footer (Every Page)**
   - Site Name → Copyright text
   - Site Description → Footer description
   - Contact Email → Email link and display
   - Contact Phone → Phone link and display
   - Address → Physical address display
   - Social Media Links → Social media icons

2. **Membership Page**
   - Individual Price → Individual plan pricing card
   - Family Price → Family plan pricing card
   - Life Price → Life membership pricing card

3. **Future Expansions**
   - Any new component can access settings via `useSettings()` hook

## Developer Guide

### Using Settings in Components

```javascript
import { useSettings } from '../contexts/SettingsContext';

function MyComponent() {
  const { settings, loading, error } = useSettings();
  
  return (
    <div>
      <h1>{settings.siteName}</h1>
      <p>{settings.contactEmail}</p>
    </div>
  );
}
```

### Updating Settings Programmatically

```javascript
const { updateSettings } = useSettings();

const handleUpdate = async () => {
  const result = await updateSettings({
    siteName: 'New Site Name',
    contactEmail: 'new@email.com'
  });
  
  if (result.success) {
    console.log('Settings updated!');
  }
};
```

### Settings Structure

```javascript
{
  siteName: string,
  siteDescription: string,
  contactEmail: string,
  contactPhone: string,
  address: string,
  socialMedia: {
    facebook: string,
    twitter: string,
    instagram: string,
    email: string
  },
  membership: {
    individualPrice: number,
    familyPrice: number,
    lifePrice: number
  }
}
```

## Default Values

All components use fallback values if settings are not available:

- Site Name: "TASJ - Telugu Association of Southern Jersey"
- Site Description: "Building community, celebrating culture, and creating lasting connections."
- Contact Email: "info@tasj.org"
- Contact Phone: "+1 (555) 123-4567"
- Address: "123 Community Street, South Jersey, NJ 08000"
- Individual Price: $50
- Family Price: $100
- Life Price: $500

## Troubleshooting

### Settings Not Loading

1. Check Supabase connection in `src/lib/supabase.js`
2. Verify `site_settings` table exists in Supabase
3. Check browser console for errors

### Settings Not Updating

1. Ensure you're logged in as admin
2. Check that the `site_settings` table has Row Level Security disabled
3. Verify Supabase credentials are correct

### Changes Not Reflecting

1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check if the SettingsProvider is wrapping your app in App.js

## Files Modified

- `src/contexts/SettingsContext.js` (NEW) - Settings context provider
- `src/lib/supabase.js` - Added settings API methods
- `src/App.js` - Wrapped app with SettingsProvider
- `src/components/Admin/AdminSettings.js` - Connected to settings context
- `src/components/Admin/AdminSettings.css` - Added save message styles
- `src/components/Footer.js` - Uses dynamic settings
- `src/components/Membership/MembershipPricing.js` - Uses dynamic pricing
- `setup-site-settings-table.sql` (NEW) - Database migration

## Benefits

1. **Centralized Management**: All site-wide settings in one place
2. **Real-time Updates**: Changes immediately reflect across the site
3. **No Code Changes**: Non-technical admins can update information
4. **Persistent Storage**: Settings stored in Supabase database
5. **Fallback Values**: Site works even if database is unavailable
6. **Type Safety**: Settings structure is well-defined
7. **Performance**: Settings loaded once and cached in context

## Future Enhancements

Potential additions to the settings system:

1. SEO settings (meta tags, descriptions)
2. Theme customization (colors, fonts)
3. Feature flags (enable/disable features)
4. Email templates configuration
5. Payment gateway settings
6. Google Analytics tracking ID
7. Social media share images
8. Custom HTML/CSS injection

## Support

For issues or questions about the settings system:
1. Check this documentation
2. Review the code comments in SettingsContext.js
3. Contact the development team
