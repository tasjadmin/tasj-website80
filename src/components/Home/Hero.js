import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { db } from '../../lib/supabase';
// import Logo from '../Logo'; // Logo removed dynamically as requested
import './Hero.css';

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    setIsVisible(true);
    const fetchBanners = async () => {
      const { data, error } = await db.getAnnouncementBanners(true);
      if (!error && data && data.length > 0) {
        setBanners(data);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const scrollToContent = () => {
    const nextSection = document.querySelector('.events-bar-section') || document.querySelector('.home-page > section:nth-child(2)');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero">
      <div className="hero-background static-bg"></div>
      <div className="hero-overlay"></div>

      <div className="hero-content">
        <div className="hero-text-content">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Telugu Association of South Jersey
          </motion.h1>

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Preserving Telugu Heritage in South Jersey
          </motion.p>

        </div>



        {banners.length > 0 && (
          <motion.div
            className="hero-banner-slider"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="hero-slider-container">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentBannerIndex}
                  src={banners[currentBannerIndex].banner_image_url}
                  alt="Announcement Banner"
                  className="hero-slider-img"
                  drag={banners.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset }) => {
                    if (offset.x < -50) {
                      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
                    } else if (offset.x > 50) {
                      setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
                    }
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  onClick={() => setSelectedImage(banners[currentBannerIndex].banner_image_url)}
                  style={{ cursor: 'pointer' }}
                />
              </AnimatePresence>

              {banners.length > 1 && (
                <>
                  <button className="hero-slider-nav prev" onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}>&#10094;</button>
                  <button className="hero-slider-nav next" onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}>&#10095;</button>
                  <div className="hero-slider-dots">
                    {banners.map((_, idx) => (
                      <span
                        key={idx}
                        className={`hero-slider-dot ${idx === currentBannerIndex ? 'active' : ''}`}
                        onClick={() => setCurrentBannerIndex(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        <motion.div 
          className="hero-action-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <Link to="/membership" className="btn btn-primary hero-btn">
            Become a Member
          </Link>
          <Link to="/events" className="btn btn-white hero-btn">
            View Events
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="scroll-indicator"
        role="button"
        tabIndex={0}
        aria-label="Scroll to content"
        onClick={scrollToContent}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToContent(); } }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      >
        <span className="material-symbols-outlined">keyboard_arrow_down</span>
      </motion.div>

      {/* Full-screen Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="hero-image-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <div className="hero-modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="hero-modal-close"
                onClick={() => setSelectedImage(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
              <img
                src={selectedImage}
                alt="Full size banner"
                className="hero-modal-fullsize-img"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Hero;
