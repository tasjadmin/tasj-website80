import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './Achievements.css';

const Achievements = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const achievements = [
    {
      number: '500+',
      label: 'Active Members',
      description: 'Growing community of engaged members'
    },
    {
      number: '10+',
      label: 'Years of Service',
      description: 'A decade of community building'
    },
    {
      number: '20+',
      label: 'Events Annually',
      description: 'Cultural celebrations and programs'
    },
    {
      number: '$100K+',
      label: 'Community Impact',
      description: 'Funds raised for charitable causes'
    },
    {
      number: '15+',
      label: 'Awards Received',
      description: 'Recognition for community service'
    },
    {
      number: '1000+',
      label: 'Lives Touched',
      description: 'Positive impact on community members'
    }
  ];

  return (
    <section className="achievements-section" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Our Achievements</h2>
          <p>Celebrating our impact and growth over the years</p>
        </motion.div>

        <motion.div
          className="achievements-grid"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {achievements.map((achievement, index) => (
            <motion.div
              key={index}
              className="achievement-card"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="achievement-number">{achievement.number}</div>
              <div className="achievement-label">{achievement.label}</div>
              <div className="achievement-description">{achievement.description}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="achievements-note"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <p>
            These numbers represent more than just statistics – they represent the lives we've touched, 
            the communities we've built, and the positive impact we continue to make every day.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Achievements;
