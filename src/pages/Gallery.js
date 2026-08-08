import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css"; // Import default styles
import { db, supabase } from '../lib/supabase';
import { formatUtcToLocalDateObj } from '../utils/timezoneDateUtils';
import './Gallery.css';

const Gallery = () => {
  const [eventsWithGalleries, setEventsWithGalleries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showStorageGallery, setShowStorageGallery] = useState(false);
  const [currentImages, setCurrentImages] = useState([]);

  const loadGalleryData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Load events that might have galleries (either legacy flag or new check)
      // For now, load all recent events to be safe, or filter by has_gallery
      const { data: eventsData, error: eventsError } = await db.getEvents();
      if (eventsError) throw eventsError;

      // 2. Load all gallery entries (we can optimize this with date range later)
      const { data: galleryData, error: galleryError } = await supabase
        .from('gallery')
        .select('event_id, source, drive_url, thumb_url, display_url, image_url')
        .order('created_at');

      if (galleryError) throw galleryError;

      // 3. Map events to their gallery content
      const processedEvents = eventsData
        .map(event => {
          // Find related gallery items
          const eventItems = galleryData.filter(g => g.event_id === event.id);
          const storageItems = eventItems.filter(g => g.source === 'storage');
          const driveItem = eventItems.find(g => g.source === 'drive');

          // Check legacy drive url
          const driveUrl = driveItem?.drive_url || event.gallery_drive_url;

          const hasStorage = storageItems.length > 0;
          const hasDrive = !!driveUrl;

          if (!hasStorage && !hasDrive) return null;

          return {
            ...event,
            driveUrl,
            storageImages: storageItems,
            hasStorage,
            hasDrive,
            // Logic for thumbnails: prefer Event Banner as per user request
            // Fallback to gallery images if no event banner exists
            thumbnail: event.event_image_url || storageItems[0]?.thumb_url || storageItems[0]?.image_url || event.thumbnail_url
          };
        })
        .filter(event => event !== null) // Remove events with no gallery
        .sort((a, b) => {
          const dateA = formatUtcToLocalDateObj(a.event_date, a.event_time);
          const dateB = formatUtcToLocalDateObj(b.event_date, b.event_time);
          return dateB - dateA;
        }); // Newest first

      setEventsWithGalleries(processedEvents);
    } catch (err) {
      console.error('Error loading gallery data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGalleryData();
  }, [loadGalleryData]);

  // Handle Deep Linking
  const [searchParams] = useSearchParams();
  const [initialDeepLinkProcessed, setInitialDeepLinkProcessed] = useState(false);

  useEffect(() => {
    if (!loading && eventsWithGalleries.length > 0 && !initialDeepLinkProcessed) {
      const eventId = searchParams.get('eventId');
      if (eventId) {
        const targetEvent = eventsWithGalleries.find(e => e.id === eventId);
        if (targetEvent) {
          // 1. Scroll to event
          const element = document.getElementById(`gallery-event-${eventId}`);
          if (element) {
            const offset = 100;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }

          // 2. Open Gallery safely (avoid window.open in useEffect)
          if (targetEvent.hasStorage) {
            handleEventClick(targetEvent);
          }
        }
      }
      setInitialDeepLinkProcessed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, eventsWithGalleries, searchParams, initialDeepLinkProcessed]);

  const handleEventClick = (event) => {
    if (event.hasStorage && event.hasDrive) {
      // Both options available -> Show Selection Modal
      setSelectedEvent(event);
      setShowSelectionModal(true);
    } else if (event.hasStorage) {
      // Only Storage -> Open Viewer directly
      openStorageGallery(event);
    } else if (event.hasDrive) {
      // Only Drive -> Redirect
      window.open(event.driveUrl, '_blank');
    }
  };

  const openStorageGallery = (event) => {
    // Format images for react-image-gallery
    const images = event.storageImages.map(img => ({
      original: img.display_url || img.image_url,
      thumbnail: img.thumb_url || img.image_url,
      description: img.title || event.name
    }));
    setCurrentImages(images);
    setShowSelectionModal(false);
    setShowStorageGallery(true);
  };

  const closeModals = () => {
    setShowSelectionModal(false);
    setShowStorageGallery(false);
    setSelectedEvent(null);
    setCurrentImages([]);
  };

  if (loading) {
    return (
      <div className="gallery-page">
        <section className="gallery-hero">
          <div className="container">
            <div className="hero-content"><h1>Gallery</h1><p>Relive our memorable moments</p></div>
          </div>
        </section>
        <section className="gallery-content">
          <div className="loading-state"><div className="loading-spinner"></div><p>Loading gallery...</p></div>
        </section>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <section className="gallery-hero">
        <div className="container">
          <div className="hero-content">
            <Link to="/events" className="back-to-events">← Back to Events</Link>
            <h1>Gallery</h1>
            <p>Relive our memorable moments and community celebrations</p>
          </div>
        </div>
      </section>

      <section className="gallery-content">
        <div className="container">
          {eventsWithGalleries.length === 0 ? (
            <div className="coming-soon">
              <h2>No Photos Available Yet</h2>
              <p>Check back soon for event photos.</p>
            </div>
          ) : (
            <div className="events-gallery" role="list">
              {eventsWithGalleries.map((event, index) => (
                <motion.div
                  key={event.id}
                  id={`gallery-event-${event.id}`}
                  className="event-section"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <h2 className="event-title">{event.name}</h2>
                  <div
                    className="event-gallery-card"
                    onClick={() => handleEventClick(event)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="event-banner">
                      {event.thumbnail ? (
                        <img src={event.thumbnail} alt={event.name} loading="lazy" />
                      ) : (
                        <div className="placeholder-banner"><span>🖼️</span></div>
                      )}
                    </div>

                    {/* Icon Logic */}
                    {event.hasDrive && !event.hasStorage && (
                      <div className="drive-icon"><svg viewBox="0 0 24 24" fill="#4285F4"><path d="M22.5 10.5L18 16.5H6L1.5 10.5L6 4.5H10.5V6H6L2.5 10.5L6 15H18L21.5 10.5L18 6H16.5V4.5H18L22.5 10.5Z" /></svg></div>
                    )}
                    {event.hasStorage && !event.hasDrive && (
                      <div className="drive-icon" style={{ color: '#f29f05' }}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z" /></svg></div>
                    )}
                    {event.hasStorage && event.hasDrive && (
                      <div className="drive-icon" style={{ display: 'flex', gap: '5px', width: 'auto' }}>
                        <svg viewBox="0 0 24 24" fill="#4285F4" style={{ width: '30px' }}><path d="M22.5 10.5L18 16.5H6L1.5 10.5L6 4.5H10.5V6H6L2.5 10.5L6 15H18L21.5 10.5L18 6H16.5V4.5H18L22.5 10.5Z" /></svg>
                        <svg viewBox="0 0 24 24" fill="#f29f05" style={{ width: '30px' }}><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                      </div>
                    )}

                    <div className="gallery-info">
                      <h3>{event.hasStorage && event.hasDrive ? 'View Photos' : (event.hasStorage ? 'View Gallery' : 'View Album')}</h3>
                      <p>
                        {event.hasStorage && event.hasDrive ? 'Choose between Site Gallery or Google Drive' :
                          (event.hasStorage ? `${event.storageImages.length} Photos Available` : 'Open in Google Drive')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {/* SELECTION MODAL */}
        {showSelectionModal && selectedEvent && (
          <motion.div className="gallery-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModals}>
            <motion.div className="gallery-modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={closeModals}>×</button>
              <h2 className="gallery-selection-title">Choose Viewing Option</h2>
              <div className="gallery-choices">
                {selectedEvent.hasStorage && (
                  <div className="choice-card" onClick={() => openStorageGallery(selectedEvent)}>
                    <div className="choice-icon">🖼️</div>
                    <h3>View Photos</h3>
                    <p>Fast slideshow view directly on this site.</p>
                  </div>
                )}
                {selectedEvent.hasDrive && (
                  <div className="choice-card" onClick={() => window.open(selectedEvent.driveUrl, '_blank')}>
                    <div className="choice-icon">📁</div>
                    <h3>Google Drive</h3>
                    <p>View original high-res album on Google Drive.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* LIGHTBOX MODAL */}
        {showStorageGallery && (
          <motion.div className="gallery-modal-overlay presentation-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModals}>
            <div className="gallery-modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={closeModals} style={{ position: 'absolute', zIndex: 2000 }}>×</button>
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageGallery
                  items={currentImages}
                  showPlayButton={true}
                  showFullscreenButton={true}
                  showThumbnails={true}
                  showIndex={true}
                  slideDuration={450}
                  slideInterval={3000}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
