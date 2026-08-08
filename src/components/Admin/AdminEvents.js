import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { db, supabase } from '../../lib/supabase';
import { parseAdminDateToUTCStr, formatUtcToNYDatetimeString, formatEventDateTime } from '../../utils/timezoneDateUtils';
import CreateEventModal from './CreateEventModal';
import AnnouncementBannersManager from './AnnouncementBannersManager';
import './AdminEvents.css';

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [timeFilter, setTimeFilter] = useState('upcoming');

  // Helper function to upload event image to Supabase Storage
  const uploadEventImage = async (file) => {
    try {

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in to upload images. Please log in again.');
      }

      // Check if file is a valid File object
      if (!(file instanceof File)) {
        throw new Error('Invalid file object');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);

        // Check if bucket doesn't exist
        if (uploadError.message && uploadError.message.includes('not found')) {
          throw new Error('Storage bucket "event-banners" not found. Please create it in Supabase Dashboard -> Storage.');
        }

        // Check if it's a permissions issue
        if (uploadError.message && (uploadError.message.includes('permission') || uploadError.message.includes('policy'))) {
          throw new Error('Permission denied. Please ensure the "event-banners" bucket has proper RLS policies.');
        }

        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('event-banners')
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Helper function to delete event image from Supabase Storage
  const deleteEventImage = async (url) => {
    if (!url) return;
    try {
      const bucketName = 'event-banners';
      if (!url.includes(bucketName)) return;

      // Extract path: URL is .../event-banners/path/to/file
      const parts = url.split(`${bucketName}/`);
      if (parts.length < 2) return;

      const path = parts[1]; // content after bucket name

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) {
        console.error('Error deleting old image:', error);
      } else {
        console.log('Old image deleted successfully');
      }
    } catch (err) {
      console.error('Error in deleteEventImage:', err);
    }
  };

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await db.getEvents();
      if (error) {
        setError('Failed to load events');
        console.error('Error loading events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load events from Supabase on component mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreateEvent = async (eventData) => {
    try {
      // Parse date and time safely from the datetime-local string using our NY formatting util
      const [datePart, timePartRaw] = (eventData.eventDateTime || '').split('T');
      const estDate = datePart || null;
      const estTime = timePartRaw ? (timePartRaw.length === 5 ? `${timePartRaw}:00` : timePartRaw) : null;
      
      const { utcDate, utcTime } = parseAdminDateToUTCStr(estDate, estTime);
      const eventDate = utcDate;
      const eventTime = utcTime;

      // Handle image upload if present
      let imageUrl = eventData.eventImageUrl || null;
      if (eventData.eventImage) {
        // Upload image to Supabase Storage and get permanent public URL
        try {
          imageUrl = await uploadEventImage(eventData.eventImage);
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
          alert('Warning: Failed to upload banner image. Event will be created without banner.');
          imageUrl = null;
        }
      }

      // Prepare payload for Supabase
      const payload = {
        name: eventData.eventName,
        description: eventData.description || null,
        event_date: eventDate,
        event_time: eventTime,
        location_name: eventData.mode === 'offline' ? (eventData.locationName || null) : null,
        location_url: eventData.locationUrl || null,
        mode: eventData.mode || 'offline',
        category: eventData.category || null,
        max_attendees: eventData.maxPeoplePerRegistration ? parseInt(eventData.maxPeoplePerRegistration) : null,
        current_attendees: 0,
        food_available: eventData.foodAvailable === 'yes' ? true : false,
        food_type: eventData.foodType || null,
        organizer_message: eventData.organizerMessage || null,
        organizer_phone: eventData.organizerPhone || null,
        organizer_name: eventData.organizerName || null,
        registration_deadline: eventData.registrationDeadline ? new Date(eventData.registrationDeadline).toISOString() : null,
        whatsapp_group_url: eventData.whatsappGroupUrl || null,
        google_form_url: eventData.googleFormUrl || null,
        member_price: (eventData.memberPrice && isFinite(parseFloat(eventData.memberPrice))) ? parseFloat(eventData.memberPrice) : null,
        non_member_price: (eventData.nonMemberPrice && isFinite(parseFloat(eventData.nonMemberPrice))) ? parseFloat(eventData.nonMemberPrice) : null,
        member_payment_link: eventData.memberPaymentLink || null,
        non_member_payment_link: eventData.nonMemberPaymentLink || null,
        registration_fee: (eventData.registrationFee && isFinite(parseFloat(eventData.registrationFee))) ? parseFloat(eventData.registrationFee) : null,
        kids_price: (eventData.kidsPrice && isFinite(parseFloat(eventData.kidsPrice))) ? parseFloat(eventData.kidsPrice) : null,
        kids_member_price: (eventData.kidsMemberPrice && isFinite(parseFloat(eventData.kidsMemberPrice))) ? parseFloat(eventData.kidsMemberPrice) : 0,
        kids_non_member_price: (eventData.kidsNonMemberPrice && isFinite(parseFloat(eventData.kidsNonMemberPrice))) ? parseFloat(eventData.kidsNonMemberPrice) : 0,
        event_image_url: imageUrl || eventData.eventImageUrl || null,
        status: 'confirmed'
      };

      const { error } = await db.createEvent(payload);

      if (error) {
        console.error('Supabase error:', error);
        // Check if it's the recursion error
        if (error.message && error.message.includes('infinite recursion')) {
          alert('Failed to create event: Database policy error. Please contact administrator.');
        } else {
          // Backward compatibility: retry without new columns if schema not updated
          const needsRetry = ['organizer_phone', 'organizer_name', 'registration_deadline', 'whatsapp_group_url', 'google_form_url', 'payment_link_url', 'member_price', 'non_member_price', 'member_payment_link', 'non_member_payment_link', 'registration_fee']
            .some((col) => error.message && error.message.includes(col));
          if (needsRetry || (error.message && error.message.includes('schema cache'))) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.organizer_phone;
            delete fallbackPayload.organizer_name;
            delete fallbackPayload.registration_deadline;
            delete fallbackPayload.whatsapp_group_url;
            delete fallbackPayload.google_form_url;
            delete fallbackPayload.payment_link_url;
            delete fallbackPayload.member_price;
            delete fallbackPayload.non_member_price;
            delete fallbackPayload.member_payment_link;
            delete fallbackPayload.non_member_payment_link;
            delete fallbackPayload.registration_fee;
            delete fallbackPayload.kids_price;
            delete fallbackPayload.kids_member_price;
            delete fallbackPayload.kids_non_member_price;
            const { error: retryError } = await db.createEvent(fallbackPayload);
            if (retryError) {
              alert('Failed to create event: ' + retryError.message);
              return;
            }
          } else {
            alert('Failed to create event: ' + error.message);
            return;
          }
        }
      }

      // Reload events to get the new one
      await loadEvents();
      alert('Event created successfully!');
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      console.error('Create event failed:', err);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleEditEvent = (event) => {
    // Format the event data to match what the modal expects
    const formattedEvent = {
      ...event,
      eventDateTime: formatUtcToNYDatetimeString(event.event_date, event.event_time),
      locationName: event.location_name || '',
      locationUrl: event.location_url || '',
      mode: event.mode || 'offline',
      description: event.description || '',
      foodAvailable: event.food_available ? 'yes' : 'no',
      foodType: event.food_type || 'veg',
      organizerMessage: event.organizer_message || '',
      organizerName: event.organizer_name || '',
      organizerPhone: event.organizer_phone || '',
      registrationDeadline: event.registration_deadline ? new Date(event.registration_deadline).toISOString().slice(0, 16) : '',
      whatsappGroupUrl: event.whatsapp_group_url || '',
      googleFormUrl: event.google_form_url || '',
      registrationFee: (typeof event.registration_fee !== 'undefined' && event.registration_fee !== null) ? String(event.registration_fee) : '',
      kidsPrice: (typeof event.kids_price !== 'undefined' && event.kids_price !== null) ? String(event.kids_price) : '',
      maxPeoplePerRegistration: event.max_attendees || '',
      eventImage: null,
      eventImageUrl: event.event_image_url || null
    };

    setEditingEvent(formattedEvent);
    setIsModalOpen(true);
  };

  const handleViewEvent = async (event) => {
    try {
      // Get event registrations
      const { data: registrations, error: regError } = await db.getEventRegistrations(event.id);

      if (regError) {
        console.error('Error fetching registrations:', regError);
        alert('Error fetching event registrations');
        return;
      }

      const safeFormatted = event.event_date ? formatEventDateTime(event.event_date, event.event_time) : null;
      const displayDate = safeFormatted ? safeFormatted.dateLabel : 'N/A';
      const displayTime = safeFormatted ? safeFormatted.timeLabel : 'N/A';

      const displayLocation = event.mode === 'online' ?
        (event.location_url ? `Online Event (${event.location_url})` : 'Online Event') :
        (event.location_name || 'Location TBD');

      // Format registrations for display
      const registrationDetails = registrations && registrations.length > 0
        ? `\n\nRegistrations (${registrations.length}):\n${registrations.map(reg =>
          `- ${reg.full_name} (${reg.email}) - ${reg.attendees} attendee(s)`).join('\n')}`
        : '\n\nNo registrations yet';

      alert(`Event Details:

Name: ${event.name}
Date: ${displayDate}
Time: ${displayTime}
Location: ${displayLocation}
Description: ${event.description || 'N/A'}
Status: ${event.status}
Category: ${event.category || 'N/A'}
Attendees: ${event.current_attendees || 0}/${event.max_attendees || 'Unlimited'}${registrationDetails}`);
    } catch (err) {
      console.error('Error viewing event:', err);
      alert('Error viewing event details');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const { error } = await db.deleteEvent(eventId);
        if (error) {
          alert('Failed to delete event');
          console.error('Delete error:', error);
        } else {
          // Delete image from storage if exists
          const eventToDelete = events.find(e => e.id === eventId);
          if (eventToDelete && eventToDelete.event_image_url) {
            deleteEventImage(eventToDelete.event_image_url);
          }

          setEvents(events.filter(event => event.id !== eventId));
          alert('Event deleted successfully!');
        }
      } catch (err) {
        console.error('Delete event failed:', err);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleUpdateEvent = async (eventData) => {
    if (editingEvent) {
      try {
        // Parse date and time safely from the datetime-local string
        const [datePart, timePartRaw] = (eventData.eventDateTime || '').split('T');
        const estDate = datePart || null;
        const estTime = timePartRaw ? (timePartRaw.length === 5 ? `${timePartRaw}:00` : timePartRaw) : null;
        
        const { utcDate, utcTime } = parseAdminDateToUTCStr(estDate, estTime);
        const eventDate = utcDate;
        const eventTime = utcTime;

        // Handle image upload if present
        let imageUrl = eventData.eventImageUrl || editingEvent.eventImageUrl || null;

        if (eventData.eventImage) {
          // Upload new image to Supabase Storage and get permanent public URL
          try {
            imageUrl = await uploadEventImage(eventData.eventImage);

            // Old image deletion deferred until after DB update is confirmed
            // to avoid broken links if DB update fails.

          } catch (uploadErr) {
            console.error('Image upload failed:', uploadErr);
            console.error('Upload error message:', uploadErr.message);

            // Show detailed error message to user
            let errorMessage = 'Failed to upload banner image. ';
            if (uploadErr.message) {
              errorMessage += uploadErr.message;
            } else {
              errorMessage += 'Event will be updated without changing the banner.';
            }

            alert('Warning: ' + errorMessage);

            // Keep existing image URL if upload fails
            imageUrl = editingEvent.event_image_url || null;
          }
        }

        // Prepare update payload
        const updates = {
          name: eventData.eventName,
          description: eventData.description || null,
          event_date: eventDate,
          event_time: eventTime,
          location_name: eventData.mode === 'offline' ? (eventData.locationName || null) : null,
          location_url: eventData.locationUrl || null,
          mode: eventData.mode || 'offline',
          category: eventData.category || null,
          max_attendees: eventData.maxPeoplePerRegistration ? parseInt(eventData.maxPeoplePerRegistration) : null,
          food_available: eventData.foodAvailable === 'yes' ? true : false,
          food_type: eventData.foodType || null,
          organizer_message: eventData.organizerMessage || null,
          organizer_phone: eventData.organizerPhone || null,
          organizer_name: eventData.organizerName || null,
          registration_deadline: eventData.registrationDeadline ? new Date(eventData.registrationDeadline).toISOString() : null,
          whatsapp_group_url: eventData.whatsappGroupUrl || null,
          google_form_url: eventData.googleFormUrl || null,
          member_price: (eventData.memberPrice && isFinite(parseFloat(eventData.memberPrice))) ? parseFloat(eventData.memberPrice) : null,
          non_member_price: (eventData.nonMemberPrice && isFinite(parseFloat(eventData.nonMemberPrice))) ? parseFloat(eventData.nonMemberPrice) : null,
          member_payment_link: eventData.memberPaymentLink || null,
          non_member_payment_link: eventData.nonMemberPaymentLink || null,
          registration_fee: (eventData.registrationFee && isFinite(parseFloat(eventData.registrationFee))) ? parseFloat(eventData.registrationFee) : null,
          kids_price: (eventData.kidsPrice && isFinite(parseFloat(eventData.kidsPrice))) ? parseFloat(eventData.kidsPrice) : null,
          kids_member_price: (eventData.kidsMemberPrice && isFinite(parseFloat(eventData.kidsMemberPrice))) ? parseFloat(eventData.kidsMemberPrice) : 0,
          kids_non_member_price: (eventData.kidsNonMemberPrice && isFinite(parseFloat(eventData.kidsNonMemberPrice))) ? parseFloat(eventData.kidsNonMemberPrice) : 0,
          event_image_url: imageUrl
        };

        const { error } = await db.updateEvent(editingEvent.id, updates);

        if (error) {
          console.error('Supabase error:', error);
          // Backward compatibility: retry without new columns if schema not updated
          const needsRetry = ['organizer_phone', 'organizer_name', 'registration_deadline', 'whatsapp_group_url', 'google_form_url', 'payment_link_url', 'member_price', 'non_member_price', 'member_payment_link', 'non_member_payment_link', 'registration_fee']
            .some((col) => error.message && error.message.includes(col));
          if (needsRetry || (error.message && error.message.includes('schema cache'))) {
            const fallbackUpdates = { ...updates };
            delete fallbackUpdates.organizer_phone;
            delete fallbackUpdates.organizer_name;
            delete fallbackUpdates.registration_deadline;
            delete fallbackUpdates.whatsapp_group_url;
            delete fallbackUpdates.google_form_url;
            delete fallbackUpdates.payment_link_url;
            delete fallbackUpdates.member_price;
            delete fallbackUpdates.non_member_price;
            delete fallbackUpdates.member_payment_link;
            delete fallbackUpdates.non_member_payment_link;
            delete fallbackUpdates.registration_fee;
            delete fallbackUpdates.kids_price;
            delete fallbackUpdates.kids_member_price;
            delete fallbackUpdates.kids_non_member_price;
            const { error: retryError } = await db.updateEvent(editingEvent.id, fallbackUpdates);
            if (retryError) {
              alert('Failed to update event: ' + retryError.message);
              return;
            }
          } else {
            alert('Failed to update event: ' + error.message);
            return;
          }
        }

        // DB Update Successful: Clean up old image if we replaced it
        if (eventData.eventImage && imageUrl && editingEvent.event_image_url && imageUrl !== editingEvent.event_image_url) {
          await deleteEventImage(editingEvent.event_image_url);
        }

        // Reload events
        await loadEvents();
        setEditingEvent(null);
        alert('Event updated successfully!');
      } catch (err) {
        console.error('Update event failed:', err);
        alert('Failed to update event. Please try again.');
        // If critical failure after upload but before DB update, we technically have an orphaned NEW image.
        // We could implement cleanup here too, but prioritized keeping old valid image above.
      }
    } else {
      // Create new event
      await handleCreateEvent(eventData);
    }
  };

  // Derived list based on Upcoming/Completed filter
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filteredEvents = events.filter((event) => {
    const d = event.event_date ? formatEventDateTime(event.event_date, event.event_time).dateObj : null;
    if (!d || isNaN(d)) return timeFilter === 'upcoming';
    d.setHours(0, 0, 0, 0);
    return timeFilter === 'upcoming' ? d >= today : d < today;
  }).sort((a, b) => {
    const aTs = a.event_date ? formatEventDateTime(a.event_date, a.event_time).dateObj.getTime() : NaN;
    const bTs = b.event_date ? formatEventDateTime(b.event_date, b.event_time).dateObj.getTime() : NaN;
    const aValid = isFinite(aTs);
    const bValid = isFinite(bTs);
    if (!aValid && !bValid) return 0;
    if (!aValid) return 1;
    if (!bValid) return -1;
    return bTs - aTs;
  });

  return (
    <div className="admin-events">
      <AnnouncementBannersManager />
      <motion.div
        className="events-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="events-header-left">
          <h1>Events Management</h1>
          <p>Manage TASJ events and registrations</p>
        </div>
        <div className="events-header-actions">
          <div className="events-filter-buttons">
            <button
              className={`events-filter-btn ${timeFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setTimeFilter('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`events-filter-btn ${timeFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setTimeFilter('completed')}
            >
              Completed
            </button>
          </div>
          <button
            className="add-event-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
            Create New Event
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="events-error-message">
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : (
        <motion.div
          className="events-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
              <p>No events found. Create your first event!</p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              // Format date and time for display
              const formattedPayload = event.event_date ? formatEventDateTime(event.event_date, event.event_time) : null;
              const displayDate = formattedPayload ? formattedPayload.dateLabel : 'N/A';
              const displayTime = formattedPayload ? formattedPayload.timeLabel : 'N/A';
              const displayLocation = event.mode === 'online' ? 'Online Event' : (event.location_name || 'TBD');
              const attendees = event.current_attendees || 0;

              return (
                <div key={event.id} className="event-card">
                  <div className="event-header">
                    <h3>{event.name}</h3>
                    <span className={`event-status ${event.status}`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="event-details">
                    <div className="event-detail">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z" />
                      </svg>
                      <span>{displayDate} at {displayTime}</span>
                    </div>
                    <div className="event-detail">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22S19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z" />
                      </svg>
                      <span>{displayLocation}</span>
                    </div>
                    <div className="event-detail">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,13C18.67,13 24,14.33 24,17V20H8V17C8,14.33 13.33,13 16,13M2,12V15H0V12C0,10.34 8.03,9 18,9C19.11,9 20,9.89 20,11V12H18V11C18,10.45 17.55,10 17,10H16.5C15.67,10 14.83,10.17 14,10.5C12.5,11.17 11.17,12.5 10.5,14C9.83,15.5 9.5,17.17 9.5,19H7.5C7.5,17.17 7.17,15.5 6.5,14C5.83,12.5 4.5,11.17 3,10.5C2.17,10.17 1.33,10 0.5,10H0V12Z" />
                      </svg>
                      <span>{attendees} attendees</span>
                    </div>
                    {typeof event.registration_fee !== 'undefined' && event.registration_fee !== null && (
                      <div className="event-detail">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,3A9,9 0 1,0 21,12A9,9 0 0,0 12,3M11,17H13V15H15A1,1 0 0,0 16,14A1,1 0 0,0 15,13H13V11H15A1,1 0 0,0 16,10A1,1 0 0,0 15,9H13V7H11V9H9A1,1 0 0,0 8,10A1,1 0 0,0 9,11H11V13H9A1,1 0 0,0 8,14A1,1 0 0,0 9,15H11V17Z" />
                        </svg>
                        <span>Fee: ${event.registration_fee.toFixed ? event.registration_fee.toFixed(2) : event.registration_fee}</span>
                      </div>
                    )}
                  </div>
                  <div className="event-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => handleEditEvent(event)}
                      title="Edit event"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                      </svg>
                      Edit
                    </button>

                    <button
                      className="action-btn view"
                      onClick={() => handleViewEvent(event)}
                      title="View event details"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                      </svg>
                      View
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteEvent(event.id)}
                      title="Delete event"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      )}

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleUpdateEvent}
        editingEvent={editingEvent}
      />
    </div>
  );
};

export default AdminEvents;
