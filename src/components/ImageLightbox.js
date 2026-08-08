import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ImageLightbox.css';

const ImageLightbox = ({ imageUrl, altText, onClose }) => {
  // Handle escape key to close lightbox
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="image-lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Image preview"
      >
        <button
          className="lightbox-close-button"
          onClick={onClose}
          aria-label="Close image preview"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
          </svg>
        </button>

        <motion.div
          className="lightbox-image-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={altText}
            className="lightbox-image"
            loading="eager"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageLightbox;
