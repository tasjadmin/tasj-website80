import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './AboutOverview.css';

const AboutOverview = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section className="about-overview">
      <div className="container">
        <div className="about-content" ref={ref}>
          <motion.div
            className="about-text"
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8 }}
          >
            <h2>About TASJ</h2>
            <p>
              The Telugu Association of South Jersey (TASJ) has been a cornerstone
              of our community for over a decade. We are dedicated to preserving
              and promoting Telugu culture, language, and traditions while fostering
              a strong sense of community among Telugu families in Southern New Jersey.
            </p>
            <p>
              Our organization brings together people from all walks of life, creating
              meaningful connections and lasting friendships. Through cultural events,
              educational programs, and community service initiatives, we strive to
              make a positive impact both within our community and beyond.
            </p>
            <div className="about-stats">
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">Active Members</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">10+</div>
                <div className="stat-label">Years of Service</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">20+</div>
                <div className="stat-label">Events Annually</div>
              </div>
            </div>
            <Link to="/about" className="btn btn-primary">
              Learn More About Us
            </Link>
          </motion.div>

          <motion.div
            className="about-video"
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="video-wrapper">
              <iframe
                src="https://www.youtube.com/embed/jmGe6duoVts?si=iueYaB9o_Lr77b40"
                title="Telugu Association of South Jersey Introduction"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutOverview;
