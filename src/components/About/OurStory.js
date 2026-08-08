import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './OurStory.css';

const OurStory = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section className="our-story-section" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Our Story</h2>
          <p>Over a decade of community building and cultural preservation</p>
        </motion.div>

        <motion.div
          className="story-content"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="story-text">
            <p>
              <strong>Founded in 2003</strong>, the <strong>Telugu Association of Southern Jersey (TASJ)</strong> began as a small 
              group of Telugu families who wanted to preserve their cultural heritage while building 
              a strong community in Southern New Jersey.
            </p>
            <p>
              Over the years, TASJ has grown from a handful of families to <strong>over 500 active members</strong>, 
              becoming one of the most vibrant and active Telugu associations in the region. Our 
              journey has been marked by countless cultural celebrations, educational programs, and 
              community service initiatives.
            </p>
            <p>
              Today, TASJ continues to serve as a bridge between our rich Telugu heritage and the 
              diverse American community, fostering understanding, friendship, and mutual respect 
              while ensuring that our <strong>traditions are passed down to future generations</strong>.
            </p>
          </div>
          <div className="story-image">
            <div className="placeholder-image">
              <span>🏛️</span>
              <h3>TASJ Heritage</h3>
              <p>Preserving Culture, Building Community</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OurStory;
