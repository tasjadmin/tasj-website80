import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db, supabase } from '../lib/supabase';
import { sendEmailForEventRegistration } from '../lib/emailService';
import { formatEventDateTime } from '../utils/timezoneDateUtils';
import ImageLightbox from '../components/ImageLightbox';
import './EventDetail.css';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState(() => {
    try {
      if (id) {
        const savedData = localStorage.getItem(`tasj_event_reg_${id}`);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          delete parsed.paymentScreenshot; // skip non-serializable File
          return { ...parsed, paymentScreenshot: null };
        }
      }
    } catch (e) {
      console.warn("Could not load saved event registration data");
    }

    return {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      attendees: 1,
      kidsCount: 0,
      isMember: false,
      paymentMethod: 'online',
      transactionRef: '',
      paidAmount: '',
      paymentNote: '',
      paymentScreenshot: null
    };
  });

  useEffect(() => {
    if (id) {
      const dataToSave = { ...registrationData };
      delete dataToSave.paymentScreenshot;
      localStorage.setItem(`tasj_event_reg_${id}`, JSON.stringify(dataToSave));
    }
  }, [registrationData, id]);
  const [registrationError, setRegistrationError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState({
    isVerifying: false,
    isVerified: false,
    memberInfo: null,
    message: ''
  });

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showRegistration) {
        closeRegistrationModal();
      }
    };

    if (showRegistration) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showRegistration]);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch a single event by ID
      const { data, error } = await db.getEventById(id);

      if (error) {
        setError('Failed to load event');
        console.error('Error loading event:', error);
      } else if (data) {
        setEvent(data);
      } else {
        setError('Event not found');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading event:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [id, loadEvent]);

  // Ensure page opens at the top when navigating to an event
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  // Subscribe to realtime updates for this event so the detail page reflects edits immediately
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`events-updates-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${id}`
      }, (payload) => {
        if (payload.new) {
          setEvent(payload.new);
        } else {
          // For delete, navigate back
          if (payload.eventType === 'DELETE') {
            navigate('/events');
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  const getCategoryColor = (category) => {
    const colors = {
      cultural: '#FF6B35',
      educational: '#28a745',
      social: '#FFD700',
      convention: '#6f42c1',
      sports: '#17a2b8',
      festival: '#e83e8c',
      workshop: '#6c757d',
      meeting: '#20c997'
    };
    return colors[category] || '#6c757d';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const closeRegistrationModal = () => {
    setShowRegistration(false);
    setSubmitSuccess(false);
    setRegistrationError('');
    setRegistrationData({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      attendees: 1,
      kidsCount: 0,
      isMember: false
    });
    setMembershipStatus({
      isVerifying: false,
      isVerified: false,
      memberInfo: null,
      message: ''
    });
  };

  // Real-time membership verification when email changes
  useEffect(() => {
    const verifyMembership = async () => {
      const email = registrationData.email.trim();

      // Reset verification state if email is empty
      if (!email) {
        setMembershipStatus({
          isVerifying: false,
          isVerified: false,
          memberInfo: null,
          message: ''
        });
        setRegistrationData(prev => ({ ...prev, isMember: false }));
        return;
      }

      // Basic email validation
      if (!/\S+@\S+\.\S+/.test(email)) {
        setMembershipStatus({
          isVerifying: false,
          isVerified: false,
          memberInfo: null,
          message: ''
        });
        return;
      }

      // Set verifying state
      setMembershipStatus(prev => ({ ...prev, isVerifying: true, message: '' }));

      try {
        const { data, error } = await db.verifyMembershipByEmail(email);

        if (error) {
          setMembershipStatus({
            isVerifying: false,
            isVerified: false,
            memberInfo: null,
            message: 'Error verifying membership'
          });
          setRegistrationData(prev => ({ ...prev, isMember: false }));
          return;
        }

        if (data.isMember) {
          const memberName = data.familyMemberName
            ? `${data.familyMemberName} (Family member of ${data.memberInfo.first_name} ${data.memberInfo.last_name})`
            : `${data.memberInfo.first_name} ${data.memberInfo.last_name}`;

          setMembershipStatus({
            isVerifying: false,
            isVerified: true,
            memberInfo: data.memberInfo,
            membershipType: data.membershipType,
            message: `✓ Verified member: ${memberName} (${data.membershipType} membership)`
          });
          setRegistrationData(prev => ({ ...prev, isMember: true }));
        } else {
          setMembershipStatus({
            isVerifying: false,
            isVerified: false,
            memberInfo: null,
            message: 'Email not found in member database. If you are already a TASJ member, use your registered email ID or contact Registration team for help.'
          });
          setRegistrationData(prev => ({ ...prev, isMember: false }));
        }
      } catch (err) {
        console.error('Membership verification error:', err);
        setMembershipStatus({
          isVerifying: false,
          isVerified: false,
          memberInfo: null,
          message: 'Unable to verify membership at this time'
        });
        setRegistrationData(prev => ({ ...prev, isMember: false }));
      }
    };

    // Debounce the verification to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      verifyMembership();
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [registrationData.email]);

  const validateRegistration = () => {
    if (!registrationData.firstName.trim()) {
      setRegistrationError('Please enter your first name');
      return false;
    }
    if (!registrationData.lastName.trim()) {
      setRegistrationError('Please enter your last name');
      return false;
    }
    if (!registrationData.email.trim()) {
      setRegistrationError('Please enter your email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(registrationData.email)) {
      setRegistrationError('Please enter a valid email address');
      return false;
    }
    if (!registrationData.phone.trim()) {
      setRegistrationError('Please enter your phone number');
      return false;
    }
    if (registrationData.attendees < 1) {
      setRegistrationError('Number of attendees must be at least 1');
      return false;
    }

    const total = parseInt(registrationData.attendees) + parseInt(registrationData.kidsCount || 0);
    if (event.max_attendees && total > event.max_attendees) {
      setRegistrationError(`A maximum of ${event.max_attendees} people are allowed per registration for this event.`);
      return false;
    }

    return true;
  };

  const handleRegistration = async (e) => {
    e.preventDefault();

    if (!validateRegistration()) {
      return;
    }

    setIsSubmitting(true);
    setRegistrationError('');

    try {
      // 1. Check for existing registration before proceeding
      const { data: existingReg, error: checkError } = await db.getEventRegistrationByEmail(
        registrationData.email.trim(),
        event.id
      );

      if (checkError) {
        console.error('Check registration error:', checkError);
      }

      if (existingReg) {
        // Handle existing registration based on payment status
        const status = existingReg.payment_status;
        
        if (status === 'paid' || status === 'partially_paid') {
          setRegistrationError('You are already registered for this event.');
          setIsSubmitting(false);
          return;
        } else if (status !== 'refunded') {
          // It's pending, pending_verification, overdue, failed, rejected, etc.
          // These users should be sent back to their existing flow
          setRegistrationError('You already have a pending registration for this event. Redirecting you to the payment page...');
          setTimeout(() => {
            navigate(`/event-payment/${existingReg.id}`);
          }, 3000);
          return;
        }
        // If the registration was 'refunded', we allow them to register again (create new row)
      }

      // 2. Calculate amount logic before saving
      const hasMemberPrice = typeof event.member_price !== 'undefined' && event.member_price !== null;
      const hasNonMemberPrice = typeof event.non_member_price !== 'undefined' && event.non_member_price !== null;
      const hasKidsMemberPrice = typeof event.kids_member_price !== 'undefined' && event.kids_member_price !== null;
      const hasKidsNonMemberPrice = typeof event.kids_non_member_price !== 'undefined' && event.kids_non_member_price !== null;

      const adultFee = (() => {
        if (registrationData.isMember && hasMemberPrice) return Number(event.member_price);
        if (!registrationData.isMember && hasNonMemberPrice) return Number(event.non_member_price);
        const fee = typeof event.registration_fee === 'number' ? event.registration_fee : parseFloat(event.registration_fee || '0');
        return isFinite(fee) ? fee : 0;
      })();

      const kidsFee = (() => {
        if (registrationData.isMember && hasKidsMemberPrice) return Number(event.kids_member_price);
        if (!registrationData.isMember && hasKidsNonMemberPrice) return Number(event.kids_non_member_price);
        return Number(event.kids_price || 0);
      })();

      const totalAmount = (Number(adultFee) * parseInt(registrationData.attendees)) + (kidsFee * parseInt(registrationData.kidsCount || 0));

      const registrationId = crypto.randomUUID();
      const fullName = [
        registrationData.firstName.trim(),
        registrationData.middleName.trim(),
        registrationData.lastName.trim()
      ].filter(Boolean).join(' ');

      // Simplify registration status and payment details
      const isFreeEvent = totalAmount <= 0;
      const statusToSet = isFreeEvent ? 'paid' : 'pending';

      const registrationPayload = {
        id: registrationId,
        event_id: event.id,
        full_name: fullName,
        email: registrationData.email.trim(),
        phone: registrationData.phone.trim(),
        attendees: parseInt(registrationData.attendees),
        kids_count: parseInt(registrationData.kidsCount || 0),
        is_member: Boolean(registrationData.isMember),
        membership_type: Boolean(registrationData.isMember) ? (membershipStatus.membershipType || 'Member') : 'Non-Member',
        payment_method: 'none',
        expected_amount: totalAmount,
        payment_status: statusToSet
      };

      // Save registration to Supabase
      const { data: createdReg, error } = await db.createEventRegistration(registrationPayload);

      if (error) {
        const needsRetry = error.message && (error.message.includes('is_member') || error.message.includes('membership_type') || error.message.includes('column'));
        if (needsRetry) {
          const legacyPayload = { ...registrationPayload };
          
          if (error.message.includes('is_member')) {
            delete legacyPayload.is_member;
          }
          if (error.message.includes('membership_type') || error.message.includes('column')) {
            delete legacyPayload.membership_type;
          }
          
          const { error: retryError } = await db.createEventRegistration(legacyPayload);
          if (retryError) {
            throw new Error(retryError.message || 'Failed to register for event');
          }
          // If retry succeeded, we can proceed
        } else {
          throw new Error(error.message || 'Failed to register for event');
        }
      }

      // Finalized registration ID for the payment redirect
      const finalizedId = createdReg?.id || registrationId;

      // Update event attendees count
      const updatedAttendees = (event.current_attendees || 0) + parseInt(registrationData.attendees);
      await db.updateEventAttendees(event.id, updatedAttendees);

      // Create initial history record
      await db.createRegistrationHistory({
        registration_id: finalizedId,
        event_id: event.id,
        full_name: fullName,
        email: registrationData.email.trim(),
        phone: registrationData.phone.trim(),
        action_type: 'registration_created',
        amount: 0,
        previous_attendees: 0,
        updated_attendees: parseInt(registrationData.attendees) + parseInt(registrationData.kidsCount || 0),
        payment_status: statusToSet,
        payment_note: 'Initial event registration'
      });

      // Update local event state
      setEvent(prev => ({
        ...prev,
        current_attendees: updatedAttendees
      }));

      // Clear saved form data
      localStorage.removeItem(`tasj_event_reg_${id}`);

      try {

        const paymentUrl = window.location.origin + '/event-payment/' + finalizedId;

        const dateISO = new Date().toISOString(); // e.g., "2025-03-15T22:53:00.000Z"

        // Create a Date object from the ISO string
        const dateObj = new Date(dateISO);

        // Format the date using Intl.DateTimeFormat
        const formattedDate = new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "long", // 'long' for full month name
          year: "numeric",
        }).format(dateObj);

        const emailParams1 = {
          name: `${fullName}`,
          email: registrationData.email,
          phone: registrationData.phone,

          registration_type: "Event Registration",

          plan_name: "",
          event_name: event.name,

          amount: totalAmount.toFixed(2),
          date: formattedDate,

          payment_link: paymentUrl,

          logo_url: process.env.REACT_APP_BASE_IMAGE_URL,
          organization_email: "info@tasj.org",
          organization_website: window.location.origin,
        };


        await sendEmailForEventRegistration(emailParams1);
        console.log('Event confirmation email sent successfully');
      } catch (emailError) {
        console.error('Email error:', emailError);
      }


      setSubmitSuccess(true);

    } catch (error) {
      console.error('Registration error:', error);
      setRegistrationError(error.message || 'Failed to register for event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="event-detail-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-detail-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="not-found-container">
          <h2>Event Not Found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Format date and time safely
  const { dateLabel, timeLabel } = formatEventDateTime(event.event_date, event.event_time);
  const eventDate = dateLabel || 'Date TBD';
  const eventTime = timeLabel || 'Time TBD';

  const deadlineDate = event.registration_deadline ? new Date(event.registration_deadline) : null;
  const isRegistrationClosed = deadlineDate ? Date.now() > deadlineDate.getTime() : false;
  const deadlineDisplay = deadlineDate ? deadlineDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;

  // Pricing existence check to determine if registration is required
  const hasPricing = (
    (Number(event.member_price || 0) > 0) || 
    (Number(event.non_member_price || 0) > 0) || 
    (Number(event.kids_member_price || 0) > 0) || 
    (Number(event.kids_non_member_price || 0) > 0) ||
    (Number(event.registration_fee || 0) > 0) ||
    (Number(event.kids_price || 0) > 0)
  );

  const location = event.mode === 'online' ?
    (event.location_url ? (
      <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="location-link">
        Online Event (Join Meeting)
      </a>
    ) : 'Online Event') :
    (event.location_url ? (
      <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="location-link" title="Open in Google Maps">
        {event.location_name || 'View Location'}
      </a>
    ) : (event.location_name || 'Location TBD'));

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <div className="event-detail-page">
      <motion.div
        className="event-detail-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Back Button */}
        <div className="back-button-container">
          <button className="back-button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
            </svg>
            Back to Events
          </button>
        </div>
        {/* Event Banner */}
        <div className="event-banner">
          {event.event_image_url ? (
            <img
              src={event.event_image_url}
              alt={event.name}
              loading="lazy"
              decoding="async"
              onClick={() => setLightboxImage({ url: event.event_image_url, alt: event.name })}
              style={{ cursor: 'zoom-in' }}
            />
          ) : (
            <div className="banner-placeholder">
              <div className="placeholder-icon">📅</div>
              <p>Event Banner</p>
            </div>
          )}
          <div className="event-category-badge" style={{ backgroundColor: getCategoryColor(event.category) }}>
            {event.category ? (event.category.charAt(0).toUpperCase() + event.category.slice(1)) : 'Event'}
          </div>
        </div>

        {/* Event Content */}
        <div className="event-content">
          <div className="event-header">
            <h1 className="event-title">{event.name}</h1>

          </div>

          <div className="event-details">
            <div className="detail-section">
              <h2>Description</h2>
              <p className="event-description">{event.description || 'No description available for this event.'}</p>
            </div>

            {event.organizer_message && (
              <div className="detail-section">
                <h2>Message from Organizer</h2>
                <p className="organizer-message">{event.organizer_message}</p>
              </div>
            )}

            <div className="detail-grid">
              <div className="detail-card">
                <h3>Event Details</h3>
                <ul className="detail-list">
                  <li>
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">{eventDate}</span>
                  </li>
                  <li>
                    <span className="detail-label">Time:</span>
                    <span className="detail-value">{eventTime}</span>
                  </li>
                  <li>
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">
                      {location}
                    </span>
                  </li>
                  {event.location_url && (
                    <li>
                      <span className="detail-label">Link:</span>
                      <span className="detail-value">
                        <a href={event.location_url} target="_blank" rel="noopener noreferrer">
                          {event.mode === 'online' ? 'Join Meeting' : 'View on Map'}
                        </a>
                      </span>
                    </li>
                  )}
                  <li>
                    <span className="detail-label">Food:</span>
                    <span className="detail-value">
                      {event.food_available
                        ? <span style={{ color: '#28a745' }}>Available {event.food_type ? `(${event.food_type})` : ''}</span>
                        : <span style={{ color: '#666', fontWeight: 'normal' }}>Not provided</span>}
                    </span>
                  </li>
                  {event.organizer_name && (
                    <li>
                      <span className="detail-label">Organizer:</span>
                      <span className="detail-value">{event.organizer_name}</span>
                    </li>
                  )}
                  {event.organizer_phone && (
                    <li>
                      <span className="detail-label">Organizer Contact:</span>
                      <span className="detail-value"><a href={`tel:${event.organizer_phone}`}>{event.organizer_phone}</a></span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="detail-card">
                <h3>Registration Info</h3>
                <ul className="detail-list">
                  <li>
                    <span className="detail-label">Registration:</span>
                    <span className="detail-value">{isRegistrationClosed ? 'Closed' : 'Open'}</span>
                  </li>
                  {event.max_attendees && (
                    <li>
                      <span className="detail-label">Max per Registration:</span>
                      <span className="detail-value">{event.max_attendees} {event.max_attendees === 1 ? 'Person' : 'People'}</span>
                    </li>
                  )}
                  {deadlineDisplay && (
                    <li>
                      <span className="detail-label">Deadline:</span>
                      <span className="detail-value">{deadlineDisplay}</span>
                    </li>
                  )}
                  {typeof event.member_price !== 'undefined' && event.member_price !== null && (
                    <li>
                      <span className="detail-label">Member Price:</span>
                      <span className="detail-value">${Number(event.member_price).toFixed(2)}</span>
                    </li>
                  )}
                  {typeof event.non_member_price !== 'undefined' && event.non_member_price !== null && (
                    <li>
                      <span className="detail-label">Non-Member Price:</span>
                      <span className="detail-value">${Number(event.non_member_price).toFixed(2)}</span>
                    </li>
                  )}
                  {event.kids_member_price > 0 && (
                    <li>
                      <span className="detail-label">Kids Member Price:</span>
                      <span className="detail-value">${Number(event.kids_member_price).toFixed(2)}</span>
                    </li>
                  )}
                  {event.kids_non_member_price > 0 && (
                    <li>
                      <span className="detail-label">Kids Non-Member Price:</span>
                      <span className="detail-value">${Number(event.kids_non_member_price).toFixed(2)}</span>
                    </li>
                  )}
                  {((typeof event.member_price === 'undefined' || event.member_price === null) && (typeof event.non_member_price === 'undefined' || event.non_member_price === null) && typeof event.registration_fee !== 'undefined' && event.registration_fee !== null) && (
                    <li>
                      <span className="detail-label">Registration Fee:</span>
                      <span className="detail-value">${Number(event.registration_fee).toFixed(2)}</span>
                    </li>
                  )}
                  {typeof event.kids_price !== 'undefined' && event.kids_price !== null && !(event.kids_member_price > 0 || event.kids_non_member_price > 0) && (
                    <li>
                      <span className="detail-label">Kids Price:</span>
                      <span className="detail-value">${Number(event.kids_price).toFixed(2)}</span>
                    </li>
                  )}
                  {event.whatsapp_group_url && (
                    <li>
                      <span className="detail-label">WhatsApp Group:</span>
                      <span className="detail-value">
                        <a href={event.whatsapp_group_url} target="_blank" rel="noopener noreferrer">Join Group</a>
                      </span>
                    </li>
                  )}
                  {event.google_form_url && (
                    <li>
                      <span className="detail-label">Google Form:</span>
                      <span className="detail-value">
                        <a href={event.google_form_url} target="_blank" rel="noopener noreferrer">Open Form</a>
                      </span>
                    </li>
                  )}
                </ul>
                <button className="register-button" onClick={() => setShowRegistration(true)} disabled={isRegistrationClosed || !hasPricing}>
                  {isRegistrationClosed ? 'Registration Closed' : (!hasPricing ? 'Registration Not Required' : 'Register Now')}
                </button>
                {(!hasPricing && !isRegistrationClosed) && (
                   <p style={{ fontSize: '13px', color: '#666', marginTop: '10px', textAlign: 'center', fontStyle: 'italic' }}>
                      Registration not required for this event
                   </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Registration Modal */}
      {showRegistration && (
        <div className="registration-modal">
          <div className="registration-modal-content">
            <div className="registration-modal-header">
              <h2>Register for {event.name}</h2>
              <button className="close-button" onClick={closeRegistrationModal}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            </div>
            {isRegistrationClosed ? (
              <div className="registration-closed">
                <div className="registration-error">Registration is closed for this event.</div>
                {deadlineDisplay && <p>Deadline was {deadlineDisplay}.</p>}
                <button className="close-button" onClick={closeRegistrationModal}>Close</button>
              </div>
            ) : submitSuccess ? (
              <div className="registration-success">
                <div className="success-icon">✓</div>
                <h3>Registration Successful!</h3>
                <p>Event registration successful. A confirmation email has been sent to your registered email address. Please check the email for the payment link to complete your registration.</p>
                <button className="close-success-button" onClick={closeRegistrationModal}>
                  Close
                </button>
              </div>
            ) : (
              <form className="registration-form" onSubmit={handleRegistration}>
                {registrationError && (
                  <div className="registration-error">
                    {registrationError}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={registrationData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="middleName">Middle Name</label>
                    <input
                      type="text"
                      id="middleName"
                      name="middleName"
                      value={registrationData.middleName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={registrationData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={registrationData.email}
                      onChange={handleInputChange}
                      required
                    />
                    {/* Membership verification status */}
                    {membershipStatus.isVerifying && (
                      <div className="membership-status verifying">
                        <span className="status-icon">⏳</span>
                        <span>Verifying membership...</span>
                      </div>
                    )}
                    {!membershipStatus.isVerifying && membershipStatus.message && (
                      <div className={`membership-status ${membershipStatus.isVerified ? 'verified' : 'not-verified'}`}>
                        <span className="status-icon">{membershipStatus.isVerified ? '✓' : 'ℹ'}</span>
                        <span>{membershipStatus.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={registrationData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="attendees">Number of Adults (Age 12+) *</label>
                  <input
                    type="number"
                    id="attendees"
                    name="attendees"
                    min="1"
                    value={registrationData.attendees}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="kidsCount">Number of Kids (Age 5&ndash;12)</label>
                  <input
                    type="number"
                    id="kidsCount"
                    name="kidsCount"
                    min="0"
                    value={registrationData.kidsCount}
                    onChange={handleInputChange}
                  />
                  <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                    Total Attendees: {parseInt(registrationData.attendees || 0) + parseInt(registrationData.kidsCount || 0)}
                  </small>
                </div>

                <div className="form-group" style={{ display: 'none' }}>
                  <label>Are you a Community Member?</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="isMember"
                        value="yes"
                        checked={registrationData.isMember === true}
                        onChange={() => setRegistrationData(prev => ({ ...prev, isMember: true }))}
                        disabled={membershipStatus.isVerifying || !!membershipStatus.message}
                      />
                      <span className="radio-label">Yes, I’m a Member</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="isMember"
                        value="no"
                        checked={registrationData.isMember === false}
                        onChange={() => setRegistrationData(prev => ({ ...prev, isMember: false }))}
                        disabled={membershipStatus.isVerifying || !!membershipStatus.message}
                      />
                      <span className="radio-label">No, I’m not a Member</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Price</label>
                  <div className="price-summary">
                    {(() => {
                      const hasM = typeof event.member_price !== 'undefined' && event.member_price !== null;
                      const hasN = typeof event.non_member_price !== 'undefined' && event.non_member_price !== null;
                      const hasKM = typeof event.kids_member_price !== 'undefined' && event.kids_member_price !== null;
                      const hasKN = typeof event.kids_non_member_price !== 'undefined' && event.kids_non_member_price !== null;

                      const adultUnit = registrationData.isMember && hasM
                        ? Number(event.member_price)
                        : (!registrationData.isMember && hasN
                          ? Number(event.non_member_price)
                          : (typeof event.registration_fee === 'number' ? event.registration_fee : parseFloat(event.registration_fee || '0')));
                      
                      const kidsUnit = registrationData.isMember && hasKM
                        ? Number(event.kids_member_price)
                        : (!registrationData.isMember && hasKN
                          ? Number(event.kids_non_member_price)
                          : Number(event.kids_price || 0));

                      const validAdultUnit = isFinite(adultUnit) ? adultUnit : 0;
                      const validKidsUnit = isFinite(kidsUnit) ? kidsUnit : 0;
                      
                      const adultsTotal = validAdultUnit * Number(registrationData.attendees || 0);
                      const kidsTotal = validKidsUnit * Number(registrationData.kidsCount || 0);
                      const total = adultsTotal + kidsTotal;
                      
                      return (
                        <div className="price-details">
                          <div>Adults: ${validAdultUnit.toFixed(2)} × {registrationData.attendees} = ${adultsTotal.toFixed(2)}</div>
                          {Number(registrationData.kidsCount || 0) > 0 && (
                            <div>Kids: ${validKidsUnit.toFixed(2)} × {registrationData.kidsCount} = ${kidsTotal.toFixed(2)}</div>
                          )}
                          <div style={{ marginTop: '5px', fontWeight: 'bold', paddingTop: '5px', borderTop: '1px solid #eee' }}>
                            Total Amount: ${total.toFixed(2)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-button" onClick={closeRegistrationModal}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering...' : 'Register Event'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          altText={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default EventDetail;
