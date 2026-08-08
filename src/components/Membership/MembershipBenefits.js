import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './MembershipBenefits.css';

const MembershipBenefits = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const benefits = [
    {
      title: 'Cultural Events Access',
      description: 'Attend all TASJ cultural celebrations, festivals, and community events at member rates or free.',
      icon: '🎭'
    },
    {
      title: 'Educational Programs',
      description: 'Participate in workshops, seminars, and educational programs designed for personal and professional growth.',
      icon: '📚'
    },
    {
      title: 'Community Network',
      description: 'Connect with like-minded individuals and build lasting relationships within our vibrant community.',
      icon: '🤝'
    },
    {
      title: 'Youth Programs',
      description: 'Access to youth leadership programs, cultural classes, and mentorship opportunities for children.',
      icon: '👨‍👩‍👧‍👦'
    },
    {
      title: 'Member Directory',
      description: 'Access to our exclusive member directory to connect with other TASJ members.',
      icon: '📋'
    },
    {
      title: 'Event Discounts',
      description: 'Enjoy significant discounts on event tickets, merchandise, and partner services.',
      icon: '💰'
    },
    {
      title: 'Newsletter & Updates',
      description: 'Stay informed with our monthly newsletter featuring community news and upcoming events.',
      icon: '📧'
    },
    {
      title: 'Volunteer Opportunities',
      description: 'Participate in community service projects and volunteer opportunities to give back.',
      icon: '❤️'
    }
  ];

  return (
    <section className="membership-benefits-section" ref={ref}>
      <div className="container">
        <motion.div
          className="benefits-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Membership Benefits</h2>
          <p>Discover all the exclusive benefits and privileges that come with TASJ membership</p>
        </motion.div>

        <motion.div
          className="benefits-grid"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="benefit-card"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="benefit-icon">{benefit.icon}</div>
              <h3 className="benefit-title">{benefit.title}</h3>
              <p className="benefit-description">{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MembershipBenefits;
