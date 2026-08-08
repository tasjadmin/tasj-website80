import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../../lib/supabase';
import { formatUtcToLocalDateObj, formatEventDateTime } from '../../utils/timezoneDateUtils';
import './DynamicCarousel.css';

const DynamicCarousel = ({ source = 'events', title, subtitle }) => {
  const [carouselItems, setCarouselItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Load events from Supabase (after defining loadEvents)

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await db.getEvents();

      if (error) {
        console.error('Error loading events:', error);
      } else {
        if (source === 'gallery') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const galleryEvents = (data || [])
            .filter(ev => ev.has_gallery && ev.gallery_drive_url && ev.event_date)
            .filter(ev => {
              const d = formatUtcToLocalDateObj(ev.event_date, ev.event_time);
              d.setHours(0, 0, 0, 0);
              return d < today;
            })
            .sort((a, b) => formatUtcToLocalDateObj(b.event_date, b.event_time) - formatUtcToLocalDateObj(a.event_date, a.event_time))
            .slice(0, 20);
          const formatted = galleryEvents.map(ev => {
            const { dateLabel: safeDateLabel, timeLabel: safeTimeLabel } = ev.event_date ? formatEventDateTime(ev.event_date, ev.event_time) : { dateLabel: 'Date TBD', timeLabel: null };
            return {
              id: ev.id,
              title: ev.name,
              description: ev.description || 'View event photos and moments',
              link: `/events/${ev.id}`,
              galleryUrl: ev.gallery_drive_url,
              category: 'Gallery',
              date: safeDateLabel,
              time: safeTimeLabel,
              location: ev.location_name || '—',
              imageUrl: ev.thumbnail_url || ev.event_image_url || null
            };
          });
          setCarouselItems(formatted);
        } else {
          const sortedEvents = (data || [])
            .filter(event => event.event_date)
            .sort((a, b) => {
              const dateA = formatUtcToLocalDateObj(a.event_date, a.event_time);
              const dateB = formatUtcToLocalDateObj(b.event_date, b.event_time);
              return dateB - dateA;
            })
            .slice(0, 12);

          const formattedEvents = sortedEvents.map(event => {
            const { shortDateLabel: safeShortDate, timeLabel: safeTime } = event.event_date ? formatEventDateTime(event.event_date, event.event_time) : { shortDateLabel: 'Date TBD', timeLabel: null };
            return {
              id: event.id,
              title: event.name,
              description: event.description || 'Event details coming soon.',
              link: `/events/${event.id}`,
              category: event.category || 'Event',
              date: safeShortDate,
              time: safeTime,
              location: event.mode === 'online' ? 'Online Event' : (event.location_name || 'Venue TBD'),
              imageUrl: event.event_image_url || null
            };
          });
          setCarouselItems(formattedEvents);
        }
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, [source]);
  const updateScrollIndicators = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 0);
    setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    updateScrollIndicators();
    const onResize = () => updateScrollIndicators();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [carouselItems]);

  const scrollByAmount = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(300, el.clientWidth * 0.8);
    el.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' });
  };

  const onKeyScroll = (e) => {
    if (e.key === 'ArrowRight') scrollByAmount('next');
    if (e.key === 'ArrowLeft') scrollByAmount('prev');
  };

  useEffect(() => { loadEvents(); }, [loadEvents]);

  return (
    <section className="events-bar-section">
      <div className="container">
        <div className="events-bar-header">
          <h2>{title || (source === 'gallery' ? 'Completed Events' : 'Upcoming Events')}</h2>
          <p>{subtitle || (source === 'gallery' ? 'Browse galleries from past events' : 'Scroll to explore what’s coming up')}</p>
        </div>

        <div className="events-bar-wrapper">
          {loading ? (
            <div className="events-loading">
              <div className="loading-spinner"></div>
              <p>Loading events...</p>
            </div>
          ) : carouselItems.length === 0 ? (
            <div className="events-loading">
              <p>No events available at the moment. Check back soon!</p>
            </div>
          ) : (
            <>
              <div
                id="events-scroll"
                className="events-scroll"
                ref={scrollRef}
                onScroll={updateScrollIndicators}
                onKeyDown={onKeyScroll}
                role="list"
                aria-label="Upcoming events"
                tabIndex={0}
              >
                {carouselItems.map((item) => (
                  <motion.div
                    key={item.id}
                    className="events-card hover-lift"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    role="listitem"
                    aria-label={item.title}
                  >
                    {source === 'gallery' ? (
                      <div className="event-card-link-wrapper">
                        <Link to={item.link} className="event-card-link">
                          <div className="events-card-image">
                            <div className="events-card-category">{item.category}</div>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                loading="lazy"
                                decoding="async"
                                sizes="(max-width: 768px) 80vw, 360px"
                              />
                            ) : (
                              <div className="placeholder-image"><span>🖼️</span></div>
                            )}
                          </div>
                          <div className="events-card-content">
                            <h3 className="events-card-title">{item.title}</h3>
                            <div className="events-meta-row">
                              <div className="events-meta">
                                <span className="meta-icon">📅</span>
                                <span>{item.date}</span>
                              </div>
                              <div className="events-meta">
                                <span className="meta-icon">📍</span>
                                <span>{item.location}</span>
                              </div>
                            </div>
                            <p className="events-card-description">{item.description}</p>
                          </div>
                        </Link>
                        <div className="events-card-actions">
                          {item.galleryUrl ? (
                            <Link
                              to={`/gallery?eventId=${item.id}`}
                              className="btn btn-outline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Gallery
                            </Link>
                          ) : (
                            <Link to={item.link} className="btn btn-outline">View Details</Link>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Link to={item.link} className="event-card-link">
                        <div className="events-card-image">
                          <div className="events-card-category">{item.category}</div>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              loading="lazy"
                              decoding="async"
                              sizes="(max-width: 768px) 80vw, 360px"
                            />
                          ) : (
                            <div className="placeholder-image"><span>📅</span></div>
                          )}
                        </div>
                        <div className="events-card-content">
                          <h3 className="events-card-title">{item.title}</h3>
                          <div className="events-meta-row">
                            <div className="events-meta">
                              <span className="meta-icon">📅</span>
                              <span>
                                {item.date}{item.time ? ` · ${item.time}` : ''}
                              </span>
                            </div>
                            <div className="events-meta">
                              <span className="meta-icon">📍</span>
                              <span>{item.location}</span>
                            </div>
                          </div>
                          <p className="events-card-description">{item.description}</p>
                          <div className="events-card-actions">
                            <div className="btn btn-outline">Learn More</div>
                          </div>
                        </div>
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className={`scroll-shadow left ${canScrollPrev ? 'visible' : ''}`} aria-hidden="true"></div>
              <div className={`scroll-shadow right ${canScrollNext ? 'visible' : ''}`} aria-hidden="true"></div>
              <button
                className="scroll-nav prev"
                onClick={() => scrollByAmount('prev')}
                aria-label="Scroll previous"
                aria-controls="events-scroll"
                disabled={!canScrollPrev}
              >
                ‹
              </button>
              <button
                className="scroll-nav next"
                onClick={() => scrollByAmount('next')}
                aria-label="Scroll next"
                aria-controls="events-scroll"
                disabled={!canScrollNext}
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default DynamicCarousel;
