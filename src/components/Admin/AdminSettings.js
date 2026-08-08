import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';

import './AdminSettings.css';

const AdminSettings = () => {
  const { settings: globalSettings, updateSettings: saveToDatabase, loading: loadingSettings } = useSettings();
  const [settings, setSettings] = useState({
    siteName: '',
    siteDescription: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    socialMedia: { facebook: '', twitter: '', instagram: '', email: '' },
    membership: { studentPrice: 0, yearlyPrice: 0, lifetimePrice: 0, lifeDonorPrice: 0, studentPaymentLink: '', yearlyPaymentLink: '', lifetimePaymentLink: '', lifeDonorPaymentLink: '' },
    payment: { zelleQrUrl: '', venmoQrUrl: '', zelleId: '', venmoId: '' }
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'social', label: 'Social' },
    { id: 'membership', label: 'Membership & Stripe' },
    { id: 'payment', label: 'Payment Options' }
  ];

  useEffect(() => {
    if (globalSettings && !loadingSettings) setSettings(globalSettings);
  }, [globalSettings, loadingSettings]);

  const handleInputChange = (section, field, value) => {
    if (section) {
      setSettings(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    } else {
      setSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const result = await saveToDatabase(settings);
      if (result.success) {
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setSaving(true);
      const oldUrl = settings.payment?.[`${type}QrUrl`];
      if (oldUrl) {
        const urlParts = oldUrl.split('/site-assets/');
        if (urlParts.length === 2) {
          await supabase.storage.from('site-assets').remove([urlParts[1]]).catch(err => console.error("Could not delete old qr:", err));
        }
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_qr_${Date.now()}.${fileExt}`;
      const filePath = `payment-qr-codes/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(filePath);
      
      setSettings(prev => ({ ...prev, payment: { ...prev.payment, [`${type}QrUrl`]: publicUrl } }));
    } catch (error) {
      console.error('Error uploading image:', error);
      setSaveMessage(`Error uploading image: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = async (type) => {
    try {
      setSaving(true);
      const oldUrl = settings.payment?.[`${type}QrUrl`];
      if (oldUrl) {
        const urlParts = oldUrl.split('/site-assets/');
        if (urlParts.length === 2) {
          await supabase.storage.from('site-assets').remove([urlParts[1]]);
        }
      }
      setSettings(prev => ({ ...prev, payment: { ...prev.payment, [`${type}QrUrl`]: '' } }));
    } catch (error) {
      console.error('Error removing old image:', error);
      setSaveMessage(`Error removing image: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-settings-container">
      <div className="settings-sticky-header">
        <div className="settings-header-top">
          <div className="settings-title-group">
            <h1>Settings</h1>
            <p>Manage TASJ website configurations</p>
          </div>
          <button className="save-button desktop-save" onClick={handleSave} disabled={saving || loadingSettings}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15,9H5V7H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
            </svg>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
            {saveMessage}
          </div>
        )}

        <div className="settings-tabs-scroll-area">
          <div className="settings-tabs">
            {tabs.map(tab => (
              <button 
                key={tab.id} 
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-content-wrapper">
        {activeTab === 'general' && (
          <motion.div className="settings-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
             <div className="card-header">
               <h2>General Information</h2>
               <p>Core contact and description data for the website.</p>
             </div>
             <div className="settings-form">
                <div className="form-group full-width">
                   <label htmlFor="siteName">Site Name</label>
                   <input type="text" id="siteName" value={settings.siteName} onChange={(e) => handleInputChange('', 'siteName', e.target.value)} />
                </div>
                <div className="form-row-2">
                   <div className="form-group">
                      <label htmlFor="contactEmail">Contact Email</label>
                      <input type="email" id="contactEmail" value={settings.contactEmail} onChange={(e) => handleInputChange('', 'contactEmail', e.target.value)} />
                   </div>
                   <div className="form-group">
                      <label htmlFor="contactPhone">Contact Phone</label>
                      <input type="tel" id="contactPhone" value={settings.contactPhone} onChange={(e) => handleInputChange('', 'contactPhone', e.target.value)} />
                   </div>
                </div>
                <div className="form-group full-width">
                   <label htmlFor="siteDescription">Site Description</label>
                   <textarea id="siteDescription" value={settings.siteDescription} onChange={(e) => handleInputChange('', 'siteDescription', e.target.value)} rows="3" />
                </div>
                <div className="form-group full-width">
                   <label htmlFor="address">Address</label>
                   <textarea id="address" value={settings.address} onChange={(e) => handleInputChange('', 'address', e.target.value)} rows="2" />
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'social' && (
          <motion.div className="settings-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
             <div className="card-header">
               <h2>Social Media Links</h2>
               <p>Connect your official social media profiles to the frontend.</p>
             </div>
             <div className="settings-form">
                <div className="form-row-2">
                   <div className="form-group">
                     <label htmlFor="facebook">Facebook URL</label>
                     <input type="url" id="facebook" value={settings.socialMedia?.facebook || ''} onChange={(e) => handleInputChange('socialMedia', 'facebook', e.target.value)} />
                   </div>
                   <div className="form-group">
                     <label htmlFor="twitter">Twitter URL</label>
                     <input type="url" id="twitter" value={settings.socialMedia?.twitter || ''} onChange={(e) => handleInputChange('socialMedia', 'twitter', e.target.value)} />
                   </div>
                   <div className="form-group">
                     <label htmlFor="instagram">Instagram URL</label>
                     <input type="url" id="instagram" value={settings.socialMedia?.instagram || ''} onChange={(e) => handleInputChange('socialMedia', 'instagram', e.target.value)} placeholder="https://instagram.com/tasj" />
                   </div>
                   <div className="form-group">
                     <label htmlFor="email">Email Link</label>
                     <input type="email" id="email" value={settings.socialMedia?.email || ''} onChange={(e) => handleInputChange('socialMedia', 'email', e.target.value)} placeholder="info@tasj.org" />
                   </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'membership' && (
          <motion.div className="settings-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
             <div className="card-header">
               <h2>Membership Pricing & Stripe Links</h2>
               <p>Set membership tier pricing and copy the explicit Stripe checkout URL handles here.</p>
             </div>
             <div className="settings-form">
                <div className="form-row-4">
                    <div className="form-group">
                       <label htmlFor="studentPrice">Student Price ($)</label>
                       <input 
                         type="number" 
                         id="studentPrice" 
                         min="0"
                         step="1"
                         onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                         value={settings.membership?.studentPrice || 0} 
                         onChange={(e) => handleInputChange('membership', 'studentPrice', parseInt(e.target.value) || 0)} 
                       />
                    </div>
                    <div className="form-group">
                       <label htmlFor="yearlyPrice">Yearly Price ($)</label>
                       <input 
                         type="number" 
                         id="yearlyPrice" 
                         min="0"
                         step="1"
                         onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                         value={settings.membership?.yearlyPrice || 0} 
                         onChange={(e) => handleInputChange('membership', 'yearlyPrice', parseInt(e.target.value) || 0)} 
                       />
                    </div>
                    <div className="form-group">
                       <label htmlFor="lifetimePrice">Lifetime Price ($)</label>
                       <input 
                         type="number" 
                         id="lifetimePrice" 
                         min="0"
                         step="1"
                         onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                         value={settings.membership?.lifetimePrice || 0} 
                         onChange={(e) => handleInputChange('membership', 'lifetimePrice', parseInt(e.target.value) || 0)} 
                       />
                    </div>
                    <div className="form-group">
                       <label htmlFor="lifeDonorPrice">Life Donor Price ($)</label>
                       <input 
                         type="number" 
                         id="lifeDonorPrice" 
                         min="0"
                         step="1"
                         onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                         value={settings.membership?.lifeDonorPrice || 0} 
                         onChange={(e) => handleInputChange('membership', 'lifeDonorPrice', parseInt(e.target.value) || 0)} 
                       />
                    </div>
                </div>
                
                <div className="settings-divider"></div>

                <div className="form-group full-width">
                   <label htmlFor="studentPaymentLink">Student Membership Link</label>
                   <div className="url-input-container">
                     <input type="url" id="studentPaymentLink" value={settings.membership?.studentPaymentLink || ''} onChange={(e) => handleInputChange('membership', 'studentPaymentLink', e.target.value)} placeholder="https://buy.stripe.com/..." />
                   </div>
                   <small>Stripe checkout link for Student Tier.</small>
                </div>
                <div className="form-group full-width">
                   <label htmlFor="yearlyPaymentLink">Yearly Membership Link</label>
                   <div className="url-input-container">
                     <input type="url" id="yearlyPaymentLink" value={settings.membership?.yearlyPaymentLink || ''} onChange={(e) => handleInputChange('membership', 'yearlyPaymentLink', e.target.value)} placeholder="https://buy.stripe.com/..." />
                   </div>
                   <small>Stripe checkout link for Yearly Tier.</small>
                </div>
                <div className="form-group full-width">
                   <label htmlFor="lifetimePaymentLink">Lifetime Membership Link</label>
                   <div className="url-input-container">
                     <input type="url" id="lifetimePaymentLink" value={settings.membership?.lifetimePaymentLink || ''} onChange={(e) => handleInputChange('membership', 'lifetimePaymentLink', e.target.value)} placeholder="https://buy.stripe.com/..." />
                   </div>
                   <small>Stripe checkout link for Lifetime Tier.</small>
                </div>
                <div className="form-group full-width">
                   <label htmlFor="lifeDonorPaymentLink">Life Donor Membership Link</label>
                   <div className="url-input-container">
                     <input type="url" id="lifeDonorPaymentLink" value={settings.membership?.lifeDonorPaymentLink || ''} onChange={(e) => handleInputChange('membership', 'lifeDonorPaymentLink', e.target.value)} placeholder="https://buy.stripe.com/..." />
                   </div>
                   <small>Stripe checkout link for Life Donor Tier.</small>
                </div>
             </div>
          </motion.div>
        )}

         {activeTab === 'payment' && (
          <motion.div className="settings-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
             <div className="card-header">
               <h2>Payment Options</h2>
               <p>Configure Zelle and Venmo identifiers and upload scannable QR codes.</p>
             </div>
             <div className="settings-form">
                <div className="form-row-2">
                   <div className="form-group">
                      <label htmlFor="zelleId">Zelle ID (Email/Phone)</label>
                      <input 
                        type="text" 
                        id="zelleId" 
                        value={settings.payment?.zelleId || ''} 
                        onChange={(e) => handleInputChange('payment', 'zelleId', e.target.value)} 
                        placeholder="e.g. info@tasj.org"
                      />
                   </div>
                   <div className="form-group">
                      <label htmlFor="venmoId">Venmo @Username</label>
                      <input 
                        type="text" 
                        id="venmoId" 
                        value={settings.payment?.venmoId || ''} 
                        onChange={(e) => handleInputChange('payment', 'venmoId', e.target.value)} 
                        placeholder="e.g. @TASJ-SouthJersey"
                      />
                   </div>
                </div>
                
                <div className="settings-divider"></div>
                <h3>Scannable QR Codes</h3>
                <p className="section-instruction">Upload images for users to scan during checkout.</p>
             </div>
             <div className="qr-cards-grid">
                
                {/* Zelle QR Card */}
                <div className="qr-card">
                  <div className="qr-card-header">
                    <h3>Zelle</h3>
                  </div>
                  <div className="qr-card-body">
                    {settings.payment?.zelleQrUrl ? (
                      <div className="qr-preview-wrapper">
                         <img src={settings.payment.zelleQrUrl} alt="Zelle Scan" />
                         <div className="qr-actions">
                            <label className="qr-btn outline">
                               Replace
                               <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'zelle')} style={{ display: 'none' }} />
                            </label>
                            <button onClick={() => handleRemoveImage('zelle')} className="qr-btn peril">Remove</button>
                         </div>
                      </div>
                    ) : (
                      <div className="qr-empty-state">
                         <label className="qr-btn primary">
                            Upload Image
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'zelle')} style={{ display: 'none' }} />
                         </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Venmo QR Card */}
                <div className="qr-card">
                  <div className="qr-card-header">
                    <h3>Venmo</h3>
                  </div>
                  <div className="qr-card-body">
                    {settings.payment?.venmoQrUrl ? (
                      <div className="qr-preview-wrapper">
                         <img src={settings.payment.venmoQrUrl} alt="Venmo Scan" />
                         <div className="qr-actions">
                            <label className="qr-btn outline">
                               Replace
                               <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'venmo')} style={{ display: 'none' }} />
                            </label>
                            <button onClick={() => handleRemoveImage('venmo')} className="qr-btn peril">Remove</button>
                         </div>
                      </div>
                    ) : (
                      <div className="qr-empty-state">
                         <label className="qr-btn primary">
                            Upload Image
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'venmo')} style={{ display: 'none' }} />
                         </label>
                      </div>
                    )}
                  </div>
                </div>

             </div>
          </motion.div>
        )}
      </div>

      <div className="mobile-sticky-footer">
         <button className="save-button" onClick={handleSave} disabled={saving || loadingSettings}>
           <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15,9H5V7H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
           </svg>
           {saving ? 'Saving...' : 'Save Settings'}
         </button>
      </div>
    </div>
  );
};

export default AdminSettings;
