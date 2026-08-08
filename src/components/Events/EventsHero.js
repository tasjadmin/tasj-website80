import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './EventsHero.css';

const EventsHero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToContent = () => {
    const nextSection = document.querySelector('.event-calendar-section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="events-hero">
      <div className="events-hero-background"></div>
      <div className="events-hero-content">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Events & Celebrations
        </motion.h1>
        
        <motion.p
          className="events-hero-subtitle"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Join us for cultural celebrations, educational programs, and community gatherings
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

export default EventsHero;
