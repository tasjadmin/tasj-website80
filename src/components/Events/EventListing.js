import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { db } from '../../lib/supabase';
import { formatUtcToLocalDateObj, formatEventDateTime } from '../../utils/timezoneDateUtils';
import './EventListing.css';

const EventListing = () => {
  const navigate = useNavigate();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const [filters, setFilters] = useState({
    category: 'all',
    month: 'all',
    location: 'all'
  });
  const [sortBy, setSortBy] = useState('date-newest');
  const [eventTimeFilter, setEventTimeFilter] = useState(() => {
    return localStorage.getItem('eventTimeFilter') || 'upcoming';
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await db.getEvents();
      if (error) {
        console.error('Error loading events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load events from Supabase
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'educational', label: 'Educational' },
    { value: 'social', label: 'Social' },
    { value: 'convention', label: 'Convention' },
    { value: 'sports', label: 'Sports' }
  ];

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' }
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'TASJ Cultural Center', label: 'TASJ Cultural Center' },
    { value: 'Community Center', label: 'Community Center' },
    { value: 'Hotel Ballroom', label: 'Hotel Ballroom' },
    { value: 'Convention Center', label: 'Convention Center' },
    { value: 'Sports Complex', label: 'Sports Complex' }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      cultural: '#FF6B35',
      educational: '#28a745',
      social: '#FFD700',
      convention: '#6f42c1',
      sports: '#17a2b8'
    };
    return colors[category] || '#6c757d';
  };

  const filteredEvents = events.filter(event => {
    // Safe date parsing
    const eventDate = event.event_date ? formatUtcToLocalDateObj(event.event_date, event.event_time) : null;
    const eventMonth = eventDate && !isNaN(eventDate.getTime()) ? String(eventDate.getMonth() + 1).padStart(2, '0') : null;
    const eventLocation = event.location_name || event.location || '';
    const eventCategory = event.category || '';

    // Date-based filtering for upcoming vs completed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isUpcoming = eventDate ? eventDate >= today : true;
    const timeFilterMatch = eventTimeFilter === 'upcoming' ? isUpcoming : !isUpcoming;

    return (
      timeFilterMatch &&
      (filters.category === 'all' || eventCategory.toLowerCase() === filters.category) &&
      (filters.month === 'all' || (eventMonth && eventMonth === filters.month)) &&
      (filters.location === 'all' || eventLocation === filters.location)
    );
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    // Safe date parsing
    const dateA = a.event_date ? formatUtcToLocalDateObj(a.event_date, a.event_time) : null;
    const dateB = b.event_date ? formatUtcToLocalDateObj(b.event_date, b.event_time) : null;
    const titleA = a.name || a.title || '';
    const titleB = b.name || b.title || '';

    switch (sortBy) {
      case 'date-newest':
        // Handle null dates - put them at the end
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      case 'date-oldest':
        // Handle null dates - put them at the end
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
      case 'alphabetical':
        return titleA.localeCompare(titleB);
      default:
        return 0;
    }
  });

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({ category: 'all', month: 'all', location: 'all' });
    setSortBy('date-newest');
  };

  const handleEventTimeFilterChange = (value) => {
    setEventTimeFilter(value);
    localStorage.setItem('eventTimeFilter', value);
  };

  const removeFilter = (filterType) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: 'all'
    }));
  };

  const onCardKeyDown = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/events/${id}`);
    }
  };

  return (
    <section className="event-listing-section" ref={ref}>
      <div className="container">
        <motion.div
          className="listing-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Event Listing</h2>
          <p>Filter and explore all our events</p>
        </motion.div>

        <motion.div
          className="listing-container"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="event-time-filter-tabs" role="tablist" aria-label="Filter events by time">
            <button
              role="tab"
              aria-selected={eventTimeFilter === 'upcoming'}
              aria-controls="events-panel"
              className={`time-filter-tab ${eventTimeFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => handleEventTimeFilterChange('upcoming')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M13,2.03V2.05L13,4.05C17.39,4.59 20.5,8.58 19.96,12.97C19.5,16.61 16.64,19.5 13,19.93V21.93C18.5,21.38 22.5,16.5 21.95,11C21.5,6.25 17.73,2.5 13,2.03M11,2.06C9.05,2.25 7.19,3 5.67,4.26L7.1,5.74C8.22,4.84 9.57,4.26 11,4.06V2.06M4.26,5.67C3,7.19 2.25,9.04 2.05,11H4.05C4.24,9.58 4.8,8.23 5.69,7.1L4.26,5.67M2.06,13C2.26,14.96 3.03,16.81 4.27,18.33L5.69,16.9C4.81,15.77 4.24,14.42 4.06,13H2.06M7.1,18.37L5.67,19.74C7.18,21 9.04,21.79 11,22V20C9.58,19.82 8.23,19.25 7.1,18.37M16.82,15.19L12.71,11.08C12.47,10.84 12.24,10.5 12.24,10.12C12.24,9.27 13.29,8.72 14,9.24L18.11,13.35C18.86,14.11 18.86,15.34 18.11,16.1C17.35,16.85 16.12,16.85 15.36,16.1M8.5,11A1.5,1.5 0 0,0 7,12.5A1.5,1.5 0 0,0 8.5,14A1.5,1.5 0 0,0 10,12.5A1.5,1.5 0 0,0 8.5,11M11.5,14.5A1.5,1.5 0 0,0 10,16A1.5,1.5 0 0,0 11.5,17.5A1.5,1.5 0 0,0 13,16A1.5,1.5 0 0,0 11.5,14.5Z" />
              </svg>
              Upcoming Events
            </button>
            <button
              role="tab"
              aria-selected={eventTimeFilter === 'completed'}
              aria-controls="events-panel"
              className={`time-filter-tab ${eventTimeFilter === 'completed' ? 'active' : ''}`}
              onClick={() => handleEventTimeFilterChange('completed')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
              </svg>
              Completed Events
            </button>
          </div>

          <div className="filters-section">
            <div className="filters-row">
              <div className="filter-group">
                <label htmlFor="category-filter">Category</label>
                <select
                  id="category-filter"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="filter-select"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="month-filter">Month</label>
                <select
                  id="month-filter"
                  value={filters.month}
                  onChange={(e) => handleFilterChange('month', e.target.value)}
                  className="filter-select"
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="location-filter">Location</label>
                <select
                  id="location-filter"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="filter-select"
                >
                  {locations.map(location => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="sort-filter">Sort By</label>
                <select
                  id="sort-filter"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="date-newest">Date (Newest First)</option>
                  <option value="date-oldest">Date (Oldest First)</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
            </div>
            <div className="filters-actions">
              <div className="active-filters">
                {filters.category !== 'all' && (
                  <button className="filter-chip" onClick={() => removeFilter('category')} aria-label="Remove category filter">
                    Category: {categories.find(c => c.value === filters.category)?.label || filters.category}
                    <span className="chip-remove">×</span>
                  </button>
                )}
                {filters.month !== 'all' && (
                  <button className="filter-chip" onClick={() => removeFilter('month')} aria-label="Remove month filter">
                    Month: {months.find(m => m.value === filters.month)?.label || filters.month}
                    <span className="chip-remove">×</span>
                  </button>
                )}
                {filters.location !== 'all' && (
                  <button className="filter-chip" onClick={() => removeFilter('location')} aria-label="Remove location filter">
                    Location: {filters.location}
                    <span className="chip-remove">×</span>
                  </button>
                )}
              </div>
              <button className="btn btn-outline" onClick={clearFilters}>Reset Filters</button>
            </div>
          </div>

          <div className="events-grid" id="events-panel" role="tabpanel" aria-label={`${eventTimeFilter === 'upcoming' ? 'Upcoming' : 'Completed'} events listing`}>
            {loading ? (
              <div className="event-listing-loading">
                <div className="event-listing-spinner"></div>
                <p>Loading events...</p>
              </div>
            ) : (
              sortedEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  className="event-card hover-lift"
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${event.name || event.title}`}
                  onClick={() => navigate(`/events/${event.id}`)}
                  onKeyDown={(e) => onCardKeyDown(e, event.id)}
                >
                  <div className="event-image">
                    {event.event_image_url ? (
                      <img src={event.event_image_url} alt={event.name} className="event-banner-image" />
                    ) : (
                      <div className="placeholder-image">
                        <span>📅</span>
                      </div>
                    )}
                    <div
                      className="event-category-badge"
                      style={{ backgroundColor: getCategoryColor(event.category) }}
                    >
                      {event.category ? (event.category.charAt(0).toUpperCase() + event.category.slice(1)) : 'Event'}
                    </div>
                    <div className="date-badge">
                      {(() => {
                        if (!event.event_date) return <><span className="month">—</span><span className="day">—</span></>;
                        const { monthLabel, dayLabel } = formatEventDateTime(event.event_date, event.event_time);
                        return (
                          <>
                            <span className="month">{monthLabel || '—'}</span>
                            <span className="day">{dayLabel || '—'}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="event-content">
                    <div className="event-meta">
                      <div className="event-date">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z" />
                        </svg>
                        {event.event_date ? formatEventDateTime(event.event_date, event.event_time).dateLabel : 'Date TBD'}
                      </div>
                      <div className="event-time">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z" />
                        </svg>
                        {event.event_date ? formatEventDateTime(event.event_date, event.event_time).timeLabel : 'TBD'}
                      </div>
                    </div>

                    {typeof event.registration_fee !== 'undefined' && event.registration_fee !== null && (
                      <div className="event-fee">
                        Registration Fee: ${event.registration_fee.toFixed ? event.registration_fee.toFixed(2) : event.registration_fee}
                      </div>
                    )}

                    {event.registration_deadline && (() => {
                      const deadline = new Date(event.registration_deadline);
                      const now = new Date();
                      const isExpired = deadline < now;
                      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

                      return (
                        <div className={`event-deadline ${isExpired ? 'expired' : daysLeft <= 3 ? 'urgent' : ''}`}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                          </svg>
                          <span>
                            <strong>Registration Deadline:</strong> {deadline.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {!isExpired && daysLeft <= 7 && (
                              <span className="deadline-warning"> ({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)</span>
                            )}
                            {isExpired && <span className="deadline-warning"> (Expired)</span>}
                          </span>
                        </div>
                      );
                    })()}

                    <h3 className="event-title">{event.name || event.title}</h3>

                    <div className="event-location">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22S19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z" />
                      </svg>
                      {event.mode === 'online' ? (
                        event.location_url ? (
                          <a href={event.location_url} target="_blank" rel="noopener noreferrer">
                            Online Event (Join Meeting)
                          </a>
                        ) : 'Online Event'
                      ) : (event.location_name || event.location || 'Location TBD')}
                    </div>
                    {event.organizer_name && (
                      <div className="event-organizer">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                        </svg>
                        Organizer: {event.organizer_name}
                      </div>
                    )}

                    <p className="event-description">{event.description || 'Event details coming soon.'}</p>

                    <div className="event-details-footer">
                    </div>

                    <div className="card-actions">
                      <Link to={`/events/${event.id}`} className="btn btn-primary" onClick={(e) => e.stopPropagation()}>
                        Learn More
                      </Link>
                      {event.has_gallery && (
                        <Link to={`/gallery?eventId=${event.id}`} className="btn btn-outline" onClick={(e) => e.stopPropagation()}>
                          View Gallery
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {!loading && sortedEvents.length === 0 && (
            <div className="no-events">
              <div className="no-events-icon">📅</div>
              <h3>No events found</h3>
              <p>Try adjusting your filters to see more events.</p>
            </div>
          )}
        </motion.div>
      </div >
    </section >
  );
};

export default EventListing;
