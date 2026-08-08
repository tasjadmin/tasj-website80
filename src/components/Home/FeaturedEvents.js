import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { db } from '../../lib/supabase';
import ImageLightbox from '../ImageLightbox';
import { formatUtcToLocalDateObj, formatEventDateTime } from '../../utils/timezoneDateUtils';
import './FeaturedEvents.css';

const FeaturedEvents = () => {
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.1
  });

  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('soonest');
  const [viewStyle, setViewStyle] = useState('cards'); // 'cards' | 'highlight'

  // Load events from Supabase
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.getEvents();
      
      if (error) {
        console.error('Error loading events:', error);
      } else {
        // Get current date at start of day for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter for upcoming events only and format for display
        const formattedEvents = (data || [])
          .filter(event => {
            // Only include events with future dates
            if (event.event_date) {
              const eventDate = formatUtcToLocalDateObj(event.event_date, event.event_time);
              eventDate.setHours(0, 0, 0, 0);
              return eventDate >= today;
            }
            // Include events without dates (TBD)
            return true;
          })
          .slice(0, 8)
          .map(event => {
            // Format the date for display
            let displayDate = 'Date TBD';
            let fullDateStr = 'Date TBD';

            if (event.event_date) {
              const { shortDateLabel, dateLabel } = formatEventDateTime(event.event_date, event.event_time);
              displayDate = shortDateLabel || 'Date TBD';
              fullDateStr = dateLabel || 'Date TBD';
            }
            
            return {
              id: event.id,
              title: event.name,
              date: displayDate,
              fullDate: fullDateStr,
              description: event.description || 'Event details coming soon.',
              image: event.event_image_url || null,
              link: `/events/${event.id}`,
              category: event.category || 'Event',
              rawDate: event.event_date || null,
              rawTime: event.event_time || null
            };
          });
        setFeaturedEvents(formattedEvents);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'cultural', 'educational', 'social', 'convention', 'sports', 'festival', 'workshop', 'meeting'];

  const sortedAndFiltered = featuredEvents
    .filter(ev => filterCategory === 'all' || (ev.category || '').toLowerCase() === filterCategory)
    .sort((a, b) => {
      const aTs = a.rawDate ? new Date(`${a.rawDate}T${a.rawTime || '00:00:00'}`).getTime() : Infinity;
      const bTs = b.rawDate ? new Date(`${b.rawDate}T${b.rawTime || '00:00:00'}`).getTime() : Infinity;
      if (!isFinite(aTs) && !isFinite(bTs)) return 0;
      if (!isFinite(aTs)) return 1;
      if (!isFinite(bTs)) return -1;
      return sortOrder === 'soonest' ? aTs - bTs : bTs - aTs;
    });

  const featuredPrimary = viewStyle === 'highlight' ? sortedAndFiltered[0] : null;
  const remainingEvents = viewStyle === 'highlight' ? sortedAndFiltered.slice(1) : sortedAndFiltered;

  const handleShare = async (ev) => {
    const shareData = {
      title: ev.title,
      text: `Check out this event: ${ev.title} on ${ev.fullDate}`,
      url: window.location.origin + ev.link
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        window.open(twitterUrl, '_blank');
      }
    } catch (e) {
      console.warn('Share failed:', e);
    }
  };

  return (
    <section className="featured-events" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Featured Events & News</h2>
          <p>Discover what's happening in our community</p>
        </motion.div>

        <div className="featured-content">
          <motion.div
            className="events-section"
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h3>Upcoming Events</h3>
            <div className="events-controls" aria-label="Event filters and layout">
              <div className="controls-left">
                <label htmlFor="category-filter" className="sr-only">Filter by category</label>
                <select
                  id="category-filter"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="control-select"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <label htmlFor="sort-order" className="sr-only">Sort order</label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="control-select"
                >
                  <option value="soonest">Soonest</option>
                  <option value="latest">Latest</option>
                </select>
              </div>
              <div className="controls-right">
                <div className="view-toggle" role="group" aria-label="View style">
                  <button
                    className={`toggle-btn ${viewStyle === 'cards' ? 'active' : ''}`}
                    onClick={() => setViewStyle('cards')}
                    aria-pressed={viewStyle === 'cards'}
                  >Cards</button>
                  <button
                    className={`toggle-btn ${viewStyle === 'highlight' ? 'active' : ''}`}
                    onClick={() => setViewStyle('highlight')}
                    aria-pressed={viewStyle === 'highlight'}
                  >Highlight</button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading events...</p>
              </div>
            ) : (
              <>
                {featuredPrimary && (
                  <motion.div
                    className="event-featured-card hover-lift"
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <Link to={featuredPrimary.link} className="event-card-link">
                      <div className="event-image large">
                        <div className="event-category">{featuredPrimary.category}</div>
                        {featuredPrimary.date !== 'Date TBD' && (
                          <div className="event-date-banner">{featuredPrimary.date}</div>
                        )}
                        {featuredPrimary.image ? (
                          <img 
                            src={featuredPrimary.image} 
                            alt={featuredPrimary.title} 
                            loading="lazy" 
                            decoding="async"
                            sizes="(max-width: 768px) 100vw, 1200px"
                          />
                        ) : (
                          <div className="placeholder-image">
                            <span>📅</span>
                          </div>
                        )}
                      </div>
                      <div className="event-content">
                        <div className="event-date">{featuredPrimary.fullDate}</div>
                        <h4 className="event-title">{featuredPrimary.title}</h4>
                        <p className="event-description">{featuredPrimary.description}</p>
                        <div className="event-actions-row">
                          <div className="btn btn-outline">Learn More</div>
                          <button className="share-btn" onClick={(e) => { e.preventDefault(); handleShare(featuredPrimary); }} aria-label="Share event">Share</button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )}
                <div className="events-grid">
                  {remainingEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      className="event-card hover-lift"
                      initial={{ opacity: 0, y: 30 }}
                      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                      transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    >
                      <Link to={event.link} className="event-card-link">
                        <div className="event-image">
                          <div className="event-category">{event.category}</div>
                          {event.date !== 'Date TBD' && (
                            <div className="event-date-banner">{event.date}</div>
                          )}
                          {event.image ? (
                            <img 
                              src={event.image} 
                              alt={event.title} 
                              loading="lazy" 
                              decoding="async"
                              sizes="(max-width: 768px) 100vw, 600px"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLightboxImage({ url: event.image, alt: event.title });
                              }}
                              style={{ cursor: 'zoom-in' }}
                            />
                          ) : (
                            <div className="placeholder-image">
                              <span>📅</span>
                            </div>
                          )}
                        </div>
                        <div className="event-content">
                          <div className="event-date">{event.fullDate}</div>
                          <h4 className="event-title">{event.title}</h4>
                          <p className="event-description">{event.description}</p>
                          <div className="event-actions-row">
                            <div className="btn btn-outline">Read More</div>
                            <button className="share-btn" onClick={(e) => { e.preventDefault(); handleShare(event); }} aria-label="Share event">Share</button>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <Link to="/events" className="btn btn-primary btn-view-all">
                  View All Events
                </Link>
              </>
            )}
          </motion.div>

          {/* Image Lightbox */}
          {lightboxImage && (
            <ImageLightbox
              imageUrl={lightboxImage.url}
              altText={lightboxImage.alt}
              onClose={() => setLightboxImage(null)}
            />
          )}

          {/* 
          <motion.div
            className="news-section"
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h3>Latest News</h3>
            <div className="news-grid">
              {featuredNews.map((news, index) => (
                <motion.div
                  key={news.id}
                  className="news-card hover-lift"
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                >
                  <div className="news-image">
                    <div className="news-category">{news.category}</div>
                    <div className="placeholder-image">
                      <span>📰</span>
                    </div>
                  </div>
                  <div className="news-content">
                    <div className="news-date">{news.date}</div>
                    <h4 className="news-title">{news.title}</h4>
                    <p className="news-description">{news.description}</p>
                    <Link to={news.link} className="btn btn-outline">
                      Read More
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
            <Link to="/news" className="btn btn-primary btn-view-all">
              View All News
            </Link>
          </motion.div>
          */}
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;
