import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { db } from '../../lib/supabase';
import { formatEventDateTime } from '../../utils/timezoneDateUtils';
import './EventCalendar.css';

const EventCalendar = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

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
        // Group events by date
        const groupedEvents = {};
        data.forEach(event => {
          if (event.event_date) {
            const { dateObj, timeLabel } = formatEventDateTime(event.event_date, event.event_time);
            if (dateObj) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;

              if (!groupedEvents[dateStr]) {
                groupedEvents[dateStr] = [];
              }
              groupedEvents[dateStr].push({
                id: event.id,
                title: event.name,
                time: timeLabel || 'TBD',
                category: event.category || 'cultural',
                description: event.description || ''
              });
            }
          }
        });
        setEvents(groupedEvents);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const hasEvents = (day) => {
    if (!day) return false;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events[dateStr] && events[dateStr].length > 0;
  };

  const getEventsForDate = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events[dateStr] || [];
  };

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

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isSameMonthYear = (date) => date.getFullYear() === currentDate.getFullYear() && date.getMonth() === currentDate.getMonth();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <section className="event-calendar-section" ref={ref}>
      <div className="container">
        <motion.div
          className="calendar-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Event Calendar</h2>
          <p>Browse events by date and discover what's happening in our community</p>
        </motion.div>

        <motion.div
          className="calendar-container"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="calendar-wrapper">
            {loading ? (
              <div className="calendar-loading">
                <div className="loading-spinner"></div>
                <p>Loading events...</p>
              </div>
            ) : (
              <>
                <div className="calendar-header-controls">
                  <button 
                    className="calendar-nav-btn"
                    onClick={() => navigateMonth(-1)}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <h3 className="calendar-month-year">{getMonthName(currentDate)}</h3>
                  <button 
                    className="calendar-nav-btn"
                    onClick={() => navigateMonth(1)}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>

                <div className="calendar-grid">
                  <div className="calendar-day-names">
                    {dayNames.map(day => (
                      <div key={day} className="day-name">{day}</div>
                    ))}
                  </div>
                  
                  <div className="calendar-days">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`calendar-day ${day ? 'has-day' : 'empty'} ${hasEvents(day) ? 'has-events' : ''} ${selectedDate === day ? 'selected' : ''} ${(day && isSameMonthYear(today) && today.getDate() === day) ? 'today' : ''}`}
                        onClick={() => {
                          if (day) {
                            setSelectedDate(selectedDate === day ? null : day);
                            setModalDate(day);
                            setShowModal(true);
                          }
                        }}
                      >
                        {day && (
                          <>
                            <span className="day-number">{day}</span>
                            {hasEvents(day) && (
                              <div className="event-indicator">
                                <div 
                                  className="event-dot"
                                  style={{ backgroundColor: getCategoryColor(getEventsForDate(day)[0].category) }}
                                ></div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedDate && getEventsForDate(selectedDate).length > 0 && (
                  <motion.div
                    className="events-tooltip"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <h4>Events on {selectedDate} {getMonthName(currentDate)}</h4>
                    {getEventsForDate(selectedDate).map((event, index) => (
                      <div key={index} className="event-item">
                        <div 
                          className="event-category-dot"
                          style={{ backgroundColor: getCategoryColor(event.category) }}
                        ></div>
                        <div className="event-details">
                          <div className="event-title">{event.title}</div>
                          <div className="event-time">{event.time}</div>
                          {event.description && (
                            <div className="event-description">{event.description.substring(0, 60)}{event.description.length > 60 ? '...' : ''}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </div>

          <div className="calendar-legend">
            <h4>Event Categories</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#FF6B35' }}></div>
                <span>Cultural</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#28a745' }}></div>
                <span>Educational</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#FFD700' }}></div>
                <span>Social</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#6f42c1' }}></div>
                <span>Convention</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            className="event-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              className="event-modal-container"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="event-modal-header">
                <h3>Events on {modalDate} {getMonthName(currentDate)}</h3>
                <button className="event-modal-close" onClick={() => setShowModal(false)} aria-label="Close">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="event-modal-body">
                {getEventsForDate(modalDate).length > 0 ? (
                  <div className="modal-events-list">
                    {getEventsForDate(modalDate).map((event, index) => (
                      <div key={index} className="modal-event-item">
                        <div 
                          className="modal-event-category"
                          style={{ backgroundColor: getCategoryColor(event.category) }}
                        >
                          {event.category}
                        </div>
                        <h4 className="modal-event-title">{event.title}</h4>
                        <div className="modal-event-time">
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>schedule</span>
                          {event.time}
                        </div>
                        {event.description && (
                          <div className="modal-event-description">
                            {event.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="modal-no-events">
                    <div className="no-events-icon">
                      <span className="material-symbols-outlined" style={{ fontSize: '4rem' }}>event_busy</span>
                    </div>
                    <p>No events scheduled for this date.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default EventCalendar;
