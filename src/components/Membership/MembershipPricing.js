import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useSettings } from '../../contexts/SettingsContext';
import './MembershipPricing.css';

const MembershipPricing = ({ onChoosePlan, selectedPlan }) => {
  const { settings } = useSettings();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const pricingPlans = [
    {
      id: 'student',
      name: 'Students',
      price: `$${settings.membership?.studentPrice || 25}`,
      period: 'per year',
      description: 'Discounted membership for students',
      features: [
        'Access to all cultural events at student rates',
        'Student network access',
        'Newsletter subscription',
        'Volunteer opportunities',
        'Event discounts (50%)',
        'Cultural workshop participation',
        'Not eligible to vote in TASJ elections & decisions'
      ],
      popular: false,
      color: '#4CAF50'
    },
    {
      id: 'yearly',
      name: 'Yearly Membership',
      price: `$${settings.membership?.yearlyPrice || 100}`,
      period: 'per year',
      description: 'Standard annual membership for individuals',
      features: [
        'Access to all cultural events',
        'Member directory access',
        'Newsletter subscription',
        'Community forum access',
        'Event discounts (10%)',
        'Voting rights'
      ],
      popular: true,
      color: '#FF6B35'
    },
    {
      id: 'lifetime',
      name: 'Lifetime Membership',
      price: `$${settings.membership?.lifetimePrice || 500}`,
      period: 'one-time',
      description: 'Lifetime commitment to TASJ benefits',
      features: [
        'Everything in Yearly plan',
        'Lifetime membership status',
        'VIP event access',
        'Board meeting observer rights',
        'Event discounts (25%)',
        'Recognition in annual report',
        'Priority for leadership roles'
      ],
      popular: false,
      color: '#FFD700'
    },
    {
      id: 'life_donor',
      name: 'Life Donor Membership',
      price: `$${settings.membership?.lifeDonorPrice || 1000}`,
      period: 'one-time',
      description: 'Premium lifetime patronage & recognition',
      features: [
        'Everything in Lifetime plan',
        'Platinum donor recognition',
        'Major event sponsorship credits',
        'Exclusive donor-only summits',
        'Recognition on wall of honor',
        'Custom donor plaque',
        'Lifetime voting rights'
      ],
      popular: false,
      color: '#E5E4E2' // Platinum/Silver color
    }
  ];

  return (
    <section className="membership-pricing-section" ref={ref}>
      <div className="container">
        <motion.div
          className="pricing-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Membership Plans Available Now</h2>
          <p>Choose the plan that best fits your needs and join our community</p>
        </motion.div>

        <motion.div
          className="pricing-grid"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              className={`pricing-card ${plan.popular ? 'popular' : ''} ${selectedPlan === plan.id ? 'selected' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -10 }}
              aria-selected={selectedPlan === plan.id}
            >
              {plan.popular && (
                <div className="popular-badge">
                  <span>MOST POPULAR</span>
                </div>
              )}

              <div className="pricing-card-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price">{plan.price}</span>
                  <span className="period">{plan.period}</span>
                </div>
                <p className="plan-description">{plan.description}</p>
              </div>

              <div className="pricing-card-body">
                <ul className="features-list">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="feature-item">
                      <span className="feature-icon">✓</span>
                      <span className="feature-text">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pricing-card-footer">
                {onChoosePlan ? (
                  <button
                    type="button"
                    className={`btn ${selectedPlan === plan.id ? 'btn-primary' : (plan.popular ? 'btn-primary' : 'btn-outline')}`}
                    onClick={() => onChoosePlan(plan.id)}
                    aria-pressed={selectedPlan === plan.id}
                  >
                    {selectedPlan === plan.id ? 'Selected' : 'Choose Plan'}
                  </button>
                ) : (
                  <Link
                    to={`/membership?plan=${plan.id}#register`}
                    className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                  >
                    Choose Plan
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="pricing-note"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <p>
            <strong>Note:</strong> All memberships include access to our online community portal,
            event notifications, and cultural resources. Family memberships cover immediate family
            members living in the same household.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default MembershipPricing;
