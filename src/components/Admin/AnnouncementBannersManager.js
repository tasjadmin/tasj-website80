import React, { useState, useEffect } from 'react';
import { db, supabase } from '../../lib/supabase';
import './AnnouncementBannersManager.css';

const AnnouncementBannersManager = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const { data, error } = await db.getAnnouncementBanners();
            if (error) throw error;
            setBanners(data || []);
        } catch (err) {
            setError('Failed to load banners');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        try {
            setUploading(true);
            setError(null);

            const fileExt = file.name.split('.').pop();
            const fileName = `announcements/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            // Upload file to Supabase Storage 'event-banners'
            const { error: uploadError } = await supabase.storage
                .from('event-banners')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('event-banners')
                .getPublicUrl(fileName);

            // Save to DB
            const { error: dbError } = await db.createAnnouncementBanner({
                banner_image_url: publicUrl,
                is_active: true
            });

            if (dbError) throw dbError;

            // Refresh banners
            fetchBanners();
        } catch (err) {
            setError('Failed to upload banner');
            console.error(err);
        } finally {
            setUploading(false);
            event.target.value = ''; // Reset input
        }
    };

    const handleDelete = async (banner) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;

        try {
            setError(null);

            // Delete from storage
            if (banner.banner_image_url) {
                const urlParts = banner.banner_image_url.split('/event-banners/');
                if (urlParts.length > 1) {
                    const path = urlParts[1];
                    await supabase.storage.from('event-banners').remove([path]);
                }
            }

            // Delete from DB
            const { error: deleteError } = await db.deleteAnnouncementBanner(banner.id);
            if (deleteError) throw deleteError;

            fetchBanners();
        } catch (err) {
            setError('Failed to delete banner');
            console.error(err);
        }
    };

    const toggleStatus = async (banner) => {
        try {
            const { error } = await db.updateAnnouncementBanner(banner.id, {
                is_active: !banner.is_active
            });
            if (error) throw error;
            fetchBanners();
        } catch (err) {
            setError('Failed to update banner status');
            console.error(err);
        }
    };

    return (
        <div className="admin-banners-manager">
            <div className="banners-header">
                <h3>Announcement Banners</h3>
                <label className="btn btn-primary upload-btn">
                    {uploading ? 'Uploading...' : 'Upload Banner'}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            {error && (
                <div className="error-alert">
                    <span className="material-symbols-outlined">error</span>
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="loading-spinner"></div>
            ) : (
                <div className="banners-grid">
                    {banners.length === 0 ? (
                        <p className="no-data">No banners uploaded yet.</p>
                    ) : (
                        banners.map((banner) => (
                            <div key={banner.id} className={`banner-card ${!banner.is_active ? 'inactive' : ''}`}>
                                <div className="banner-img-container">
                                    <img src={banner.banner_image_url} alt="Banner" />
                                </div>
                                <div className="banner-details">
                                    <p className="date">Created: {new Date(banner.created_at).toLocaleDateString()}</p>
                                    <div className="banner-actions">
                                        <button
                                            className={`btn ${banner.is_active ? 'btn-outline' : 'btn-primary'}`}
                                            onClick={() => toggleStatus(banner)}
                                        >
                                            {banner.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            className="btn btn-outline btn-danger"
                                            onClick={() => handleDelete(banner)}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AnnouncementBannersManager;
