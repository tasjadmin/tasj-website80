import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    siteName: 'TASJ - Telugu Association of South Jersey',
    siteDescription: 'Building community, celebrating culture, and creating lasting connections.',
    contactEmail: 'info@tasj.org',
    contactPhone: '+1 (555) 123-4567',
    address: '123 Community Street, South Jersey, NJ 08000',
    socialMedia: {
      facebook: 'https://facebook.com/tasj',
      twitter: 'https://twitter.com/tasj',
      instagram: 'https://instagram.com/tasj',
      email: 'mailto:info@tasj.org'
    },
    membership: {
      studentPrice: 25,
      yearlyPrice: 100,
      lifetimePrice: 500,
      lifeDonorPrice: 1000
    },
    payment: {
      zelleQrUrl: '',
      venmoQrUrl: '',
      zelleId: '',
      venmoId: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Check if Supabase is configured
      if (!db || typeof db.getSettings !== 'function') {
        console.warn('Supabase not configured, using default settings');
        setLoading(false);
        return;
      }

      const { data, error } = await db.getSettings();

      if (error) {
        // If no settings exist yet, use defaults
        if (error.code === 'PGRST116') {
          console.log('No settings found, using defaults');
        } else {
          console.error('Error loading settings:', error);
          setError(error.message);
        }
      } else if (data) {
        // Merge database settings with defaults to ensure all fields exist
        setSettings(prev => ({
          ...prev,
          ...data,
          socialMedia: {
            ...prev.socialMedia,
            ...(data.socialMedia || {})
          },
          membership: {
            ...prev.membership,
            ...(data.membership || {})
          },
          payment: {
            ...prev.payment,
            ...(data.payment || {})
          }
        }));
      }
    } catch (err) {
      console.error('Unexpected error loading settings:', err);
      setError(err.message);
      // Continue with default settings instead of crashing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (newSettings) => {
    try {
      // Check if Supabase is configured
      if (!db || typeof db.updateSettings !== 'function') {
        throw new Error('Supabase not configured. Please add environment variables.');
      }

      const { data, error } = await db.updateSettings(newSettings);

      if (error) {
        throw new Error(error.message || 'Failed to update settings');
      }

      if (data) {
        // Merge updated settings with defaults to ensure all fields exist
        setSettings(prev => ({
          ...prev,
          ...data,
          socialMedia: {
            ...prev.socialMedia,
            ...(data.socialMedia || {})
          },
          membership: {
            ...prev.membership,
            ...(data.membership || {})
          },
          payment: {
            ...prev.payment,
            ...(data.payment || {})
          }
        }));
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error updating settings:', err);
      return { success: false, error: err.message };
    }
  };

  const value = {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: loadSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
