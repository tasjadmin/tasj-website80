import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../lib/supabase';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const messageData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim()
      };
      
      const { error } = await db.createContactMessage(messageData);
      
      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }
      
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (error) {
      setSubmitError(error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="container">
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1>Contact Us</h1>
            <p>Get in touch with our team and community</p>
          </motion.div>
        </div>
      </section>
      
      <section className="contact-content">
        <div className="container">
          <div className="contact-grid">
            <motion.div 
              className="contact-info"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2>Get In Touch</h2>
              <p>Have questions about TASJ? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
              
              <div className="contact-details">
                <div className="contact-item">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
                  </svg>
                  <div>
                    <h3>Email</h3>
                    <p>info@tasj.org</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22S19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z"/>
                  </svg>
                  <div>
                    <h3>Location</h3>
                    <p>Southern New Jersey, USA</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                  </svg>
                  <div>
                    <h3>Response Time</h3>
                    <p>Within 24-48 hours</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="contact-form-wrapper"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {submitSuccess && (
                <div className="success-message" role="alert">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.5,8L11,13.5L7.5,10L6,11.5L11,16.5Z"/>
                  </svg>
                  <p>Thank you for your message! We'll get back to you soon.</p>
                </div>
              )}
              
              {submitError && (
                <div className="error-message" role="alert">
                  {submitError}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="contact-form" noValidate>
                <div className="form-group">
                  <label htmlFor="name">Your Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    aria-required="true"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <span className="field-error" role="alert">{errors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    aria-required="true"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    aria-required="true"
                    aria-invalid={!!errors.subject}
                  />
                  {errors.subject && <span className="field-error" role="alert">{errors.subject}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows="5"
                    aria-required="true"
                    aria-invalid={!!errors.message}
                  />
                  {errors.message && <span className="field-error" role="alert">{errors.message}</span>}
                </div>
                
                <button type="submit" className="submit-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
