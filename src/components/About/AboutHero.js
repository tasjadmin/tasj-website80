import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './AboutHero.css';

const AboutHero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToContent = () => {
    const nextSection = document.querySelector('.our-story-section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="about-hero">
      <div className="about-hero-background"></div>
      <div className="about-hero-content">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          About TASJ
        </motion.h1>
        
        <motion.p
          className="about-hero-subtitle"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Discover our story, values, and commitment to the Telugu community
        </motion.p>
      </div>
      
      <motion.div
        className="scroll-indicator"
        onClick={scrollToContent}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="scroll-chevron"></div>
      </motion.div>
    </section>
  );
};

export default AboutHero;
