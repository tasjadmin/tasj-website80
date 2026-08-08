import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { db, supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/imageCompression';
import { formatEventDateTime } from '../../utils/timezoneDateUtils';
import './AdminGallery.css';

const AdminGallery = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [activeTab, setActiveTab] = useState('storage'); // 'storage' | 'drive'

  const [galleryImages, setGalleryImages] = useState([]);
  const [driveLink, setDriveLink] = useState('');

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Title Editing State
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [tempTitle, setTempTitle] = useState('');

  // Multi-select State
  const [selectedImages, setSelectedImages] = useState([]);

  // 1. Load Events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await db.getEvents();
      if (error) {
        setError('Failed to load events');
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const completedEvents = (data || []).filter(ev => {
          if (!ev.event_date) return false;
          const eventDate = formatEventDateTime(ev.event_date, ev.event_time).dateObj;
          eventDate.setHours(0, 0, 0, 0);
          return eventDate < today;
        })
        .sort((a, b) => {
           const dateA = formatEventDateTime(a.event_date, a.event_time).dateObj;
           const dateB = formatEventDateTime(b.event_date, b.event_time).dateObj;
           return dateB - dateA;
        });

        setEvents(completedEvents);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  // 2. Load Gallery Data when Event Selected
  const loadEventGallery = useCallback(async (eventId) => {
    if (!eventId) return;

    setLoading(true);
    setError('');

    // Fetch all gallery items for this event
    const { data, error } = await db.getGalleryImagesByEvent(eventId);

    if (error) {
      setError('Failed to load gallery items');
    } else {
      // Split into storage images and drive link
      const storageItems = data.filter(item => item.source === 'storage');
      const driveItem = data.find(item => item.source === 'drive');

      setGalleryImages(storageItems);
      setDriveLink(driveItem?.drive_url || '');

      // Legacy fallback: check event table if drive link missing in gallery
      if (!driveItem) {
        const { data: eventData } = await db.getEventById(eventId);
        if (eventData?.gallery_drive_url) {
          setDriveLink(eventData.gallery_drive_url);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventGallery(selectedEventId);
      setSelectedImages([]);
    } else {
      setGalleryImages([]);
      setDriveLink('');
      setSelectedImages([]);
    }
  }, [selectedEventId, loadEventGallery]);

  // Handle File Upload to Supabase Storage
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedEventId) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    let successCount = 0;
    const totalFiles = files.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const filePath = `events/${selectedEventId}/${fileName}`;

        // 1. Compress for Display (HD)
        const displayBlob = await compressImage(file, { maxWidth: 1600, maxHeight: 1200, quality: 0.85 });

        // 2. Compress for Thumbnail
        const thumbBlob = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.7 });

        // 3. Upload Display Image
        const { error: uploadError } = await supabase.storage
          .from('gallery images')
          .upload(filePath, displayBlob);

        if (uploadError) throw uploadError;

        // 4. Upload Thumbnail (suffix _thumb)
        const thumbPath = `events/${selectedEventId}/${fileName.replace('.', '_thumb.')}`;
        const { error: thumbError } = await supabase.storage
          .from('gallery images')
          .upload(thumbPath, thumbBlob);

        if (thumbError) console.warn('Thumbnail upload failed', thumbError);

        // 5. Get Public URLs
        const { data: { publicUrl: displayUrl } } = supabase.storage.from('gallery images').getPublicUrl(filePath);
        const { data: { publicUrl: thumbUrl } } = supabase.storage.from('gallery images').getPublicUrl(thumbPath);

        // 6. Insert into DB
        await supabase.from('gallery').insert({
          event_id: selectedEventId,
          source: 'storage',
          image_url: displayUrl, // Legacy column
          display_url: displayUrl,
          thumb_url: thumbUrl || displayUrl,
          storage_path: filePath,
          title: 'Event Photo'
        });

        successCount++;
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      setSuccessMsg(`Successfully uploaded ${successCount} images.`);
      loadEventGallery(selectedEventId); // Refresh

    } catch (err) {
      console.error(err);
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle Drive Link Save
  const handleSaveDriveLink = async () => {
    if (!selectedEventId) return;

    // Basic validation
    if (driveLink && !driveLink.includes('drive.google.com') && !driveLink.includes('photos.google.com')) {
      setError('Please enter a valid Google Drive or Photos URL');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Check if drive entry exists in gallery table
      const { data: existing } = await supabase
        .from('gallery')
        .select('id')
        .eq('event_id', selectedEventId)
        .eq('source', 'drive')
        .single();

      if (existing) {
        if (!driveLink) {
          // Delete if empty
          await supabase.from('gallery').delete().eq('id', existing.id);
        } else {
          // Update
          await supabase.from('gallery').update({ drive_url: driveLink }).eq('id', existing.id);
        }
      } else if (driveLink) {
        // Insert new
        await supabase.from('gallery').insert({
          event_id: selectedEventId,
          source: 'drive',
          drive_url: driveLink
        });
      }

      // 2. Sync with Legacy Events Table (for backup/compatibility)
      await db.updateEvent(selectedEventId, {
        has_gallery: true,
        gallery_drive_url: driveLink
      });

      setSuccessMsg('Drive link saved successfully!');

    } catch (err) {
      setError('Failed to save drive link');
    } finally {
      setSubmitting(false);
    }
  };

  /*
  const handleDeleteImage = async (item) => {
    if (!window.confirm('Delete this image?')) return;

    try {
      // 1. Delete from Storage
      if (item.storage_path) {
        await supabase.storage.from('gallery images').remove([item.storage_path]);
        // Try delete thumb too
        const thumbPath = item.storage_path.replace('.', '_thumb.');
        await supabase.storage.from('gallery images').remove([thumbPath]);
      }

      // 2. Delete from DB
      await supabase.from('gallery').delete().eq('id', item.id);

      // Refresh
      setGalleryImages(prev => prev.filter(img => img.id !== item.id));

    } catch (err) {
      setError('Failed to delete image');
    }
  };
  */

  const handleToggleSelect = (id) => {
    setSelectedImages(prev =>
      prev.includes(id) ? prev.filter(imgId => imgId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedImages.length === galleryImages.length && galleryImages.length > 0) {
      setSelectedImages([]);
    } else {
      setSelectedImages(galleryImages.map(img => img.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedImages.length) return;
    if (!window.confirm(`Delete ${selectedImages.length} selected image(s)? This action cannot be undone.`)) return;

    try {
      setLoading(true);
      setError('');

      const imagesToDelete = galleryImages.filter(img => selectedImages.includes(img.id));

      // 1. Delete from Storage
      const storagePaths = imagesToDelete.map(img => img.storage_path).filter(p => p);
      const thumbPaths = storagePaths.map(p => p.replace('.', '_thumb.'));

      if (storagePaths.length > 0) {
        await supabase.storage.from('gallery images').remove(storagePaths);
        await supabase.storage.from('gallery images').remove(thumbPaths);
      }

      // 2. Delete from DB
      for (const imgId of selectedImages) {
        await supabase.from('gallery').delete().eq('id', imgId);
      }

      // Refresh
      setGalleryImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
      setSelectedImages([]);
      setSuccessMsg(`Successfully deleted ${imagesToDelete.length} image(s).`);

    } catch (err) {
      console.error(err);
      setError('Failed to delete items');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditTitle = (img) => {
    setEditingTitleId(img.id);
    setTempTitle(img.title || 'Event Photo');
  };

  const handleSaveTitle = async (id) => {
    try {
      if (!tempTitle.trim()) {
        setEditingTitleId(null);
        return;
      }

      const { error } = await supabase
        .from('gallery')
        .update({ title: tempTitle })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setGalleryImages(prev => prev.map(img =>
        img.id === id ? { ...img, title: tempTitle } : img
      ));

      setEditingTitleId(null);
    } catch (err) {
      console.error('Error updating title:', err);
      // Optional: show error toast
    }
  };

  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="admin-gallery">
      <div className="gallery-header">
        <h1>Gallery Management</h1>
        <p>Manage event photos (Supabase Storage) or link Google Drive albums.</p>
      </div>

      {/* 1. Event Selector */}
      <div className="event-selector-section">
        <label>Select Event to Manage:</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="form-control"
          style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '1rem' }}
        >
          <option value="">-- Choose an Event --</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name} ({formatEventDateTime(ev.event_date, ev.event_time).shortDateLabel})</option>
          ))}
        </select>
      </div>

      {selectedEventId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Tabs */}
          <div className="gallery-tabs">
            <button
              className={`gallery-tab ${activeTab === 'storage' ? 'active' : ''}`}
              onClick={() => setActiveTab('storage')}
            >
              Storage Gallery
            </button>
            <button
              className={`gallery-tab ${activeTab === 'drive' ? 'active' : ''}`}
              onClick={() => setActiveTab('drive')}
            >
              Google Drive Link
            </button>
          </div>

          {/* Messages */}
          {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error} <button onClick={() => setError('')}>x</button></div>}
          {successMsg && <div className="success-message" style={{ color: 'green', marginBottom: '20px', padding: '10px', background: '#e6fffa', borderRadius: '4px' }}>{successMsg} <button onClick={() => setSuccessMsg('')}>x</button></div>}

          {/* STORAGE TAB */}
          {activeTab === 'storage' && (
            <div className="tab-content">
              <div className="file-upload-area" onClick={() => document.getElementById('galleryInput').click()}>
                <input
                  type="file"
                  id="galleryInput"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '2rem' }}>☁️</div>
                <h3>Click to Upload Photos</h3>
                <p>Supports JPG, PNG, WebP. Images will be automatically optimized.</p>
              </div>

              {uploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p>Uploading... {uploadProgress}%</p>
                </div>
              )}

              {/* Storage Actions Bar */}
              {galleryImages.length > 0 && (
                <div className="gallery-selection-bar">
                  <div className="selection-info">
                    <input
                      type="checkbox"
                      id="selectAll"
                      checked={selectedImages.length === galleryImages.length && galleryImages.length > 0}
                      onChange={handleSelectAll}
                    />
                    <label htmlFor="selectAll">
                      {selectedImages.length > 0 ? `${selectedImages.length} selected` : 'Select All'}
                    </label>
                  </div>
                  {selectedImages.length > 0 && (
                    <button className="delete-selected-btn" onClick={handleDeleteSelected}>
                      Delete Selected ({selectedImages.length})
                    </button>
                  )}
                </div>
              )}

              <div className="storage-grid">
                {galleryImages.map(img => (
                  <div
                    key={img.id}
                    className={`gallery-item ${selectedImages.includes(img.id) ? 'selected' : ''}`}
                    onClick={() => handleToggleSelect(img.id)}
                  >
                    <img src={img.thumb_url || img.display_url || img.image_url} alt="Gallery" loading="lazy" />

                    <div className="gallery-item-checkbox" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(img.id)}
                        onChange={() => handleToggleSelect(img.id)}
                      />
                    </div>

                    <div className="gallery-item-title-section" onClick={e => e.stopPropagation()}>
                      {editingTitleId === img.id ? (
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          onBlur={() => handleSaveTitle(img.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle(img.id);
                            if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                          autoFocus
                          className="gallery-title-input"
                        />
                      ) : (
                        <div
                          className="gallery-title-text"
                          onClick={() => handleStartEditTitle(img)}
                          title="Click to edit title"
                        >
                          {img.title || 'Event Photo'}
                          <span className="edit-icon">✎</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {galleryImages.length === 0 && !uploading && (
                <div className="empty-state">
                  No images uploaded directly. Add some photos or use the Drive Link tab.
                </div>
              )}
            </div>
          )}

          {/* DRIVE TAB */}
          {activeTab === 'drive' && (
            <div className="tab-content">
              <div className="upload-section">
                <h2>Google Drive / Photos Link</h2>
                <div className="form-group">
                  <label>Album URL:</label>
                  <input
                    type="url"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://photos.google.com/share/..."
                  />
                  <small>Paste the shared link to your Google Drive folder or Google Photos album.</small>
                </div>
                <div className="form-actions">
                  <button
                    className="submit-button"
                    onClick={handleSaveDriveLink}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Drive Link'}
                  </button>
                </div>

                {driveLink && (
                  <div style={{ marginTop: '30px' }}>
                    <h3>Preview</h3>
                    <a href={driveLink} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '15px', background: '#f0f4ff', borderRadius: '8px',
                      textDecoration: 'none', color: '#333', border: '1px solid #d0deff'
                    }}>
                      <div className="drive-icon" style={{ width: '40px', height: '40px' }}>
                        <svg viewBox="0 0 24 24" fill="#4285F4"><path d="M22.5 10.5L18 16.5H6L1.5 10.5L6 4.5H10.5V6H6L2.5 10.5L6 15H18L21.5 10.5L18 6H16.5V4.5H18L22.5 10.5Z" /></svg>
                      </div>
                      <div>
                        <strong>Open Linked Album</strong><br />
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>{driveLink}</span>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </motion.div>
      )}

      {!selectedEventId && !loading && (
        <div className="empty-state">
          Please select an event above to manage its gallery.
        </div>
      )}
    </div>
  );
};

export default AdminGallery;