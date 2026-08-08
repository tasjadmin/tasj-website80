import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './CreateEventModal.css';

const CreateEventModal = ({ isOpen, onClose, onSubmit, editingEvent }) => {
  const [formData, setFormData] = useState({
    eventName: '',
    eventDateTime: '',
    registrationDeadline: '',
    locationName: '',
    locationUrl: '',
    mode: 'offline',
    description: '',
    foodAvailable: 'no',
    foodType: 'veg',
    organizerMessage: '',
    organizerName: '',
    organizerPhone: '',
    whatsappGroupUrl: '',
    googleFormUrl: '',
    registrationFee: '',
    memberPrice: '',
    nonMemberPrice: '',
    kidsPrice: '',
    kidsMemberPrice: '',
    kidsNonMemberPrice: '',
    memberPaymentLink: '',
    nonMemberPaymentLink: '',
    maxPeoplePerRegistration: '',
    eventImage: null,
    eventImageUrl: null,
    category: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or when editing event changes
  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        // Populate form with existing event data from Supabase
        const defaultDateTime = editingEvent.eventDateTime || '';

        setFormData({
          eventName: editingEvent.name || '',
          eventDateTime: defaultDateTime,
          registrationDeadline: editingEvent.registration_deadline ? new Date(editingEvent.registration_deadline).toISOString().slice(0, 16) : '',
          locationName: editingEvent.location_name || '',
          locationUrl: editingEvent.location_url || '',
          mode: editingEvent.mode || 'offline',
          description: editingEvent.description || '',
          foodAvailable: editingEvent.food_available ? 'yes' : 'no',
          foodType: editingEvent.food_type || 'veg',
          organizerMessage: editingEvent.organizer_message || '',
          organizerName: editingEvent.organizer_name || '',
          organizerPhone: editingEvent.organizer_phone || '',
          whatsappGroupUrl: editingEvent.whatsapp_group_url || '',
          googleFormUrl: editingEvent.google_form_url || '',
          registrationFee: editingEvent.registration_fee?.toString?.() || '',
          memberPrice: editingEvent.member_price?.toString?.() || '',
          nonMemberPrice: editingEvent.non_member_price?.toString?.() || '',
          kidsPrice: editingEvent.kids_price?.toString?.() || '',
          kidsMemberPrice: editingEvent.kids_member_price?.toString?.() || '',
          kidsNonMemberPrice: editingEvent.kids_non_member_price?.toString?.() || '',
          memberPaymentLink: editingEvent.member_payment_link || '',
          nonMemberPaymentLink: editingEvent.non_member_payment_link || '',
          maxPeoplePerRegistration: editingEvent.max_attendees || '',
          eventImage: null,
          eventImageUrl: editingEvent.event_image_url || null,
          category: editingEvent.category || ''
        });
      } else {
        // Reset form for new event
        setFormData({
          eventName: '',
          eventDateTime: '',
          registrationDeadline: '',
          locationName: '',
          locationUrl: '',
          mode: 'offline',
          description: '',
          foodAvailable: 'no',
          foodType: 'veg',
          organizerMessage: '',
          organizerName: '',
          organizerPhone: '',
          whatsappGroupUrl: '',
          googleFormUrl: '',
          registrationFee: '',
          memberPrice: '',
          nonMemberPrice: '',
          kidsPrice: '',
          kidsMemberPrice: '',
          kidsNonMemberPrice: '',
          memberPaymentLink: '',
          nonMemberPaymentLink: '',
          maxPeoplePerRegistration: '',
          eventImage: null,
          eventImageUrl: null,
          category: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editingEvent]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          eventImage: 'File size must be less than 2MB'
        }));
        return;
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          eventImage: 'Only PNG, JPG, and JPEG files are allowed'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        eventImage: file
      }));

      setErrors(prev => ({
        ...prev,
        eventImage: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.eventName.trim()) {
      newErrors.eventName = 'Event name is required';
    }

    if (!formData.eventDateTime) {
      newErrors.eventDateTime = 'Event date and time is required';
    }

    if (formData.mode === 'offline' && !formData.locationName.trim()) {
      newErrors.locationName = 'Location name is required for offline events';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required';
    }

    if (formData.organizerPhone && !/^\+?[0-9\-()\s]{7,20}$/.test(formData.organizerPhone)) {
      newErrors.organizerPhone = 'Enter a valid phone number';
    }

    if (formData.registrationDeadline && formData.eventDateTime) {
      const deadlineTs = new Date(formData.registrationDeadline).getTime();
      const eventTs = new Date(formData.eventDateTime).getTime();
      if (isFinite(deadlineTs) && isFinite(eventTs) && deadlineTs > eventTs) {
        newErrors.registrationDeadline = 'Deadline must be before event date/time';
      }
    }

    if (formData.organizerName && formData.organizerName.length > 120) {
      newErrors.organizerName = 'Organizer name must be 120 characters max';
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.organizerMessage.length > 120) {
      newErrors.organizerMessage = 'Message must be less than 120 characters';
    }

    // URL validation
    if (formData.locationUrl && !isValidUrl(formData.locationUrl)) {
      newErrors.locationUrl = 'Please enter a valid URL';
    }

    if (formData.whatsappGroupUrl && !isValidUrl(formData.whatsappGroupUrl)) {
      newErrors.whatsappGroupUrl = 'Please enter a valid WhatsApp group URL';
    }

    if (formData.googleFormUrl && !isValidUrl(formData.googleFormUrl)) {
      newErrors.googleFormUrl = 'Please enter a valid Google Form URL';
    }
    if (formData.memberPaymentLink && !isValidUrl(formData.memberPaymentLink)) {
      newErrors.memberPaymentLink = 'Please enter a valid Stripe Payment Link URL';
    }
    if (formData.nonMemberPaymentLink && !isValidUrl(formData.nonMemberPaymentLink)) {
      newErrors.nonMemberPaymentLink = 'Please enter a valid Stripe Payment Link URL';
    }

    if (formData.registrationFee) {
      const fee = parseFloat(formData.registrationFee);
      if (!isFinite(fee) || fee < 0) {
        newErrors.registrationFee = 'Enter a valid fee amount';
      }
    }
    if (formData.memberPrice) {
      const m = parseFloat(formData.memberPrice);
      if (!isFinite(m) || m < 0) {
        newErrors.memberPrice = 'Enter a valid member price';
      }
    }
    if (formData.nonMemberPrice) {
      const n = parseFloat(formData.nonMemberPrice);
      if (!isFinite(n) || n < 0) {
        newErrors.nonMemberPrice = 'Enter a valid non-member price';
      }
    }
    if (formData.kidsPrice) {
      const k = parseFloat(formData.kidsPrice);
      if (!isFinite(k) || k < 0) {
        newErrors.kidsPrice = 'Enter a valid kids price';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Focus on first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) element.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Call parent onSubmit with form data
      onSubmit(formData);

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLocationUrl = () => {
    if (formData.locationUrl) {
      window.open(formData.locationUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-container"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{editingEvent ? 'Edit Event' : 'Create New Event'}</h2>
            <button className="close-button" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <h3 className="form-section-title full-width">Basic Details</h3>
            {/* Event Name */}
            <div className="form-group">
              <label htmlFor="eventName">
                Event Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="eventName"
                name="eventName"
                value={formData.eventName}
                onChange={(e) => handleInputChange('eventName', e.target.value)}
                placeholder="Enter event name"
                className={errors.eventName ? 'error' : ''}
                autoFocus
              />
              {errors.eventName && <span className="error-message">{errors.eventName}</span>}
            </div>

            {/* Event Date and Time */}
            <div className="form-group">
              <label htmlFor="eventDateTime">
                Event Date and Time <span className="required">*</span>
              </label>
              <input
                type="datetime-local"
                id="eventDateTime"
                name="eventDateTime"
                value={formData.eventDateTime}
                onChange={(e) => handleInputChange('eventDateTime', e.target.value)}
                className={errors.eventDateTime ? 'error' : ''}
              />
              {errors.eventDateTime && <span className="error-message">{errors.eventDateTime}</span>}
            </div>

            {/* Mode of Event */}
            <div className="form-group">
              <label>
                Mode of Event <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="mode"
                    value="offline"
                    checked={formData.mode === 'offline'}
                    onChange={(e) => handleInputChange('mode', e.target.value)}
                  />
                  <span className="radio-label">Offline</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="mode"
                    value="online"
                    checked={formData.mode === 'online'}
                    onChange={(e) => handleInputChange('mode', e.target.value)}
                  />
                  <span className="radio-label">Online</span>
                </label>
              </div>
            </div>

            <h3 className="form-section-title full-width">Location & Logistics</h3>

            {/* Location Fields */}
            {formData.mode === 'offline' ? (
              <>
                <div className="form-group">
                  <label htmlFor="locationName">
                    Location Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="locationName"
                    name="locationName"
                    value={formData.locationName}
                    onChange={(e) => handleInputChange('locationName', e.target.value)}
                    placeholder="e.g. Community Center, Cherry Hill"
                    className={errors.locationName ? 'error' : ''}
                  />
                  {errors.locationName && <span className="error-message">{errors.locationName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="locationUrl">Location URL (Optional)</label>
                  <div className="input-with-icon">
                    <input
                      type="url"
                      id="locationUrl"
                      name="locationUrl"
                      value={formData.locationUrl}
                      onChange={(e) => handleInputChange('locationUrl', e.target.value)}
                      placeholder="Paste Google Maps link (https://maps.google.com/...)"
                      className={errors.locationUrl ? 'error' : ''}
                    />
                    {formData.locationUrl && (
                      <button
                        type="button"
                        className="map-link-button"
                        onClick={openLocationUrl}
                        title="Open in new tab"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {errors.locationUrl && <span className="error-message">{errors.locationUrl}</span>}
                </div>
              </>
            ) : (
              <div className="form-group">
                <label htmlFor="meetingLink">
                  Meeting Link (URL) <span className="required">*</span>
                </label>
                <input
                  type="url"
                  id="meetingLink"
                  name="meetingLink"
                  value={formData.locationUrl}
                  onChange={(e) => handleInputChange('locationUrl', e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className={errors.locationUrl ? 'error' : ''}
                />
                {errors.locationUrl && <span className="error-message">{errors.locationUrl}</span>}
              </div>
            )}

            <h3 className="form-section-title full-width">Links & Resources</h3>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="category">Category (Optional)</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Select a category</option>
                <option value="cultural">Cultural</option>
                <option value="educational">Educational</option>
                <option value="social">Social</option>
                <option value="convention">Convention</option>
                <option value="sports">Sports</option>
                <option value="festival">Festival</option>
                <option value="workshop">Workshop</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>

            {/* Registration Links & Fee */}
            <div className="form-group">
              <label htmlFor="whatsappGroupUrl">WhatsApp Group URL (Optional)</label>
              <input
                type="url"
                id="whatsappGroupUrl"
                name="whatsappGroupUrl"
                value={formData.whatsappGroupUrl}
                onChange={(e) => handleInputChange('whatsappGroupUrl', e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className={errors.whatsappGroupUrl ? 'error' : ''}
              />
              {errors.whatsappGroupUrl && <span className="error-message">{errors.whatsappGroupUrl}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="googleFormUrl">Google Form URL (Optional)</label>
              <input
                type="url"
                id="googleFormUrl"
                name="googleFormUrl"
                value={formData.googleFormUrl}
                onChange={(e) => handleInputChange('googleFormUrl', e.target.value)}
                placeholder="https://forms.gle/..."
                className={errors.googleFormUrl ? 'error' : ''}
              />
              {errors.googleFormUrl && <span className="error-message">{errors.googleFormUrl}</span>}
            </div>



            <h3 className="form-section-title full-width">Pricing & Registration</h3>

            <div className="form-group">
              <label htmlFor="registrationFee">Registration Fee (Optional)</label>
              <input
                type="number"
                id="registrationFee"
                name="registrationFee"
                min="0"
                step="0.01"
                value={formData.registrationFee}
                onChange={(e) => handleInputChange('registrationFee', e.target.value)}
                placeholder="e.g. 10.00"
                className={errors.registrationFee ? 'error' : ''}
              />
              {errors.registrationFee && <span className="error-message">{errors.registrationFee}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="memberPrice">Member Price (Optional)</label>
              <input
                type="number"
                id="memberPrice"
                name="memberPrice"
                min="0"
                step="0.01"
                value={formData.memberPrice}
                onChange={(e) => handleInputChange('memberPrice', e.target.value)}
                placeholder="e.g. 8.00"
                className={errors.memberPrice ? 'error' : ''}
              />
              {errors.memberPrice && <span className="error-message">{errors.memberPrice}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="nonMemberPrice">Non-Member Price (Optional)</label>
              <input
                type="number"
                id="nonMemberPrice"
                name="nonMemberPrice"
                min="0"
                step="0.01"
                value={formData.nonMemberPrice}
                onChange={(e) => handleInputChange('nonMemberPrice', e.target.value)}
                placeholder="e.g. 12.00"
                className={errors.nonMemberPrice ? 'error' : ''}
              />
              {errors.nonMemberPrice && <span className="error-message">{errors.nonMemberPrice}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="kidsPrice">Kids Price (Optional / Fallback)</label>
              <input
                type="number"
                id="kidsPrice"
                name="kidsPrice"
                min="0"
                step="0.01"
                value={formData.kidsPrice}
                onChange={(e) => handleInputChange('kidsPrice', e.target.value)}
                placeholder="e.g. 5.00"
                className={errors.kidsPrice ? 'error' : ''}
              />
              {errors.kidsPrice && <span className="error-message">{errors.kidsPrice}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="kidsMemberPrice">Kids Member Price</label>
              <input
                type="number"
                id="kidsMemberPrice"
                name="kidsMemberPrice"
                min="0"
                step="0.01"
                value={formData.kidsMemberPrice}
                onChange={(e) => handleInputChange('kidsMemberPrice', e.target.value)}
                placeholder="e.g. 4.00"
                className={errors.kidsMemberPrice ? 'error' : ''}
              />
              {errors.kidsMemberPrice && <span className="error-message">{errors.kidsMemberPrice}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="kidsNonMemberPrice">Kids Non-Member Price</label>
              <input
                type="number"
                id="kidsNonMemberPrice"
                name="kidsNonMemberPrice"
                min="0"
                step="0.01"
                value={formData.kidsNonMemberPrice}
                onChange={(e) => handleInputChange('kidsNonMemberPrice', e.target.value)}
                placeholder="e.g. 6.00"
                className={errors.kidsNonMemberPrice ? 'error' : ''}
              />
              {errors.kidsNonMemberPrice && <span className="error-message">{errors.kidsNonMemberPrice}</span>}
            </div>

            {/* Stripe Payment Links for Member/Non-Member */}
            <div className="form-group">
              <label htmlFor="memberPaymentLink">Member Stripe Payment Link (Optional)</label>
              <input
                type="url"
                id="memberPaymentLink"
                name="memberPaymentLink"
                value={formData.memberPaymentLink}
                onChange={(e) => handleInputChange('memberPaymentLink', e.target.value)}
                placeholder="https://buy.stripe.com/..."
                className={errors.memberPaymentLink ? 'error' : ''}
              />
              <small>Stripe checkout link specifically for members (uses member price)</small>
              {errors.memberPaymentLink && <span className="error-message">{errors.memberPaymentLink}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="nonMemberPaymentLink">Non-Member Stripe Payment Link (Optional)</label>
              <input
                type="url"
                id="nonMemberPaymentLink"
                name="nonMemberPaymentLink"
                value={formData.nonMemberPaymentLink}
                onChange={(e) => handleInputChange('nonMemberPaymentLink', e.target.value)}
                placeholder="https://buy.stripe.com/..."
                className={errors.nonMemberPaymentLink ? 'error' : ''}
              />
              <small>Stripe checkout link specifically for non-members (uses non-member price)</small>
              {errors.nonMemberPaymentLink && <span className="error-message">{errors.nonMemberPaymentLink}</span>}
            </div>

            {/* Registration Deadline */}
            <div className="form-group">
              <label htmlFor="registrationDeadline">Registration Deadline</label>
              <input
                type="datetime-local"
                id="registrationDeadline"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
                className={errors.registrationDeadline ? 'error' : ''}
              />
              {errors.registrationDeadline && <span className="error-message">{errors.registrationDeadline}</span>}
            </div>

            {/* Description */}
            <div className="form-group full-width">
              <label htmlFor="description">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the event (who, what, why, highlights)..."
                rows="4"
                maxLength="500"
                className={errors.description ? 'error' : ''}
              />
              <div className="character-count">
                {formData.description.length}/500 characters
              </div>
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>

            <h3 className="form-section-title full-width">Food & Organizer</h3>

            {/* Food Availability */}
            <div className="form-group">
              <label>
                Food Available? <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="foodAvailable"
                    value="yes"
                    checked={formData.foodAvailable === 'yes'}
                    onChange={(e) => handleInputChange('foodAvailable', e.target.value)}
                  />
                  <span className="radio-label">Yes</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="foodAvailable"
                    value="no"
                    checked={formData.foodAvailable === 'no'}
                    onChange={(e) => handleInputChange('foodAvailable', e.target.value)}
                  />
                  <span className="radio-label">No</span>
                </label>
              </div>
            </div>

            {/* Food Type (conditional) */}
            {formData.foodAvailable === 'yes' && (
              <div className="form-group">
                <label>Food Type</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="foodType"
                      value="veg"
                      checked={formData.foodType === 'veg'}
                      onChange={(e) => handleInputChange('foodType', e.target.value)}
                    />
                    <span className="radio-label">Veg</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="foodType"
                      value="non-veg"
                      checked={formData.foodType === 'non-veg'}
                      onChange={(e) => handleInputChange('foodType', e.target.value)}
                    />
                    <span className="radio-label">Non-Veg</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="foodType"
                      value="both"
                      checked={formData.foodType === 'both'}
                      onChange={(e) => handleInputChange('foodType', e.target.value)}
                    />
                    <span className="radio-label">Both</span>
                  </label>
                </div>
              </div>
            )}

            {/* Organizer Message */}
            <div className="form-group full-width">
              <label htmlFor="organizerMessage">Message from Organizer (Optional)</label>
              <textarea
                id="organizerMessage"
                name="organizerMessage"
                value={formData.organizerMessage}
                onChange={(e) => handleInputChange('organizerMessage', e.target.value)}
                placeholder="Add a welcome note or important information"
                rows="2"
                maxLength="120"
                className={errors.organizerMessage ? 'error' : ''}
              />
              <div className="character-count">
                {formData.organizerMessage.length}/120 characters
              </div>
              {errors.organizerMessage && <span className="error-message">{errors.organizerMessage}</span>}
            </div>

            {/* Organizer Phone */}
            <div className="form-group">
              <label htmlFor="organizerPhone">Organizer Phone (Optional)</label>
              <input
                type="tel"
                id="organizerPhone"
                name="organizerPhone"
                value={formData.organizerPhone}
                onChange={(e) => handleInputChange('organizerPhone', e.target.value)}
                placeholder="e.g. +1 555-123-4567"
                className={errors.organizerPhone ? 'error' : ''}
              />
              {errors.organizerPhone && <span className="error-message">{errors.organizerPhone}</span>}
            </div>

            {/* Organizer Name */}
            <div className="form-group">
              <label htmlFor="organizerName">Organizer Name (Optional)</label>
              <input
                type="text"
                id="organizerName"
                name="organizerName"
                value={formData.organizerName}
                onChange={(e) => handleInputChange('organizerName', e.target.value)}
                placeholder="e.g. TASJ Events Team"
                className={errors.organizerName ? 'error' : ''}
              />
              {errors.organizerName && <span className="error-message">{errors.organizerName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="maxPeoplePerRegistration">
                Max People Per Registration (Optional)
              </label>
              <select
                id="maxPeoplePerRegistration"
                name="maxPeoplePerRegistration"
                value={formData.maxPeoplePerRegistration}
                onChange={(e) => handleInputChange('maxPeoplePerRegistration', e.target.value)}
              >
                <option value="">Unlimited</option>
                <option value={1}>1 person</option>
                <option value={2}>2 people</option>
                <option value={3}>3 people</option>
                <option value={4}>4 people</option>
                <option value={5}>5 people</option>
                <option value={6}>6 people</option>
              </select>
            </div>

            <h3 className="form-section-title full-width">Event Imagery</h3>

            {/* Event Image Upload */}
            <div className="form-group full-width">
              <label htmlFor="eventImage">Upload Event Banner/Image (Optional)</label>
              <div className="file-upload">
                <input
                  type="file"
                  id="eventImage"
                  name="eventImage"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="eventImage" className="file-upload-label">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  <span>Choose file or drag and drop</span>
                  <small>PNG, JPG, JPEG up to 2MB</small>
                </label>
              </div>
              {formData.eventImage && (
                <div className="file-preview">
                  <span className="file-name">{formData.eventImage.name}</span>
                  <button
                    type="button"
                    className="remove-file"
                    onClick={() => handleInputChange('eventImage', null)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                  </button>
                </div>
              )}
              {errors.eventImage && <span className="error-message">{errors.eventImage}</span>}
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner"></div>
                    {editingEvent ? 'Updating Event...' : 'Creating Event...'}
                  </>
                ) : (
                  editingEvent ? 'Update Event' : 'Create Event'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateEventModal;
