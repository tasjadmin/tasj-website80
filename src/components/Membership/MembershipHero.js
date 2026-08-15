import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './MembershipHero.css';

const MembershipHero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToContent = () => {
    const nextSection = document.querySelector('.membership-pricing-section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="membership-hero">
      <div className="membership-hero-background"></div>
      <div className="membership-hero-content">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Join the TASJ Family Member
        </motion.h1>
        
        <motion.p
          className="membership-hero-subtitle"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Become part of our vibrant community and enjoy exclusive benefits -- and privileges as a TASJ member.!
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

export default MembershipHero;
