import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './OurValues.css';

const OurValues = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const values = [
    {
      icon: '🤝',
      title: 'Community Unity',
      description: 'Building strong bonds within our Telugu community and fostering connections with the broader society.'
    },
    {
      icon: '🎭',
      title: 'Cultural Preservation',
      description: 'Maintaining and celebrating our rich Telugu heritage, traditions, and cultural practices.'
    },
    {
      icon: '📚',
      title: 'Education & Growth',
      description: 'Promoting learning, personal development, and educational opportunities for all members.'
    },
    {
      icon: '❤️',
      title: 'Service & Giving',
      description: 'Contributing to the community through volunteer work, charity, and social service initiatives.'
    },
    {
      icon: '🌟',
      title: 'Excellence',
      description: 'Striving for the highest standards in everything we do, from events to community programs.'
    },
    {
      icon: '👥',
      title: 'Inclusivity',
      description: 'Welcoming all members regardless of background, age, or experience level.'
    }
  ];

  return (
    <section className="our-values-section" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Our Values</h2>
          <p>The principles that guide our community and shape our future</p>
        </motion.div>

        <motion.div
          className="values-grid"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {values.map((value, index) => (
            <motion.div
              key={index}
              className="value-card"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="value-icon">{value.icon}</div>
              <h3 className="value-title">{value.title}</h3>
              <p className="value-description">{value.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default OurValues;
