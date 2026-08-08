import React, { useState, useEffect } from 'react';
import MembershipHero from '../components/Membership/MembershipHero';
import MembershipPricing from '../components/Membership/MembershipPricing';
import MembershipRegistration from '../components/Membership/MembershipRegistration';
import MembershipBenefits from '../components/Membership/MembershipBenefits';
import './Membership.css';

const Membership = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleChoosePlan = (planId) => {
    setSelectedPlan(planId);
    try {
      localStorage.setItem('selectedPlan', planId);
    } catch {}
    try {
      if (window.gtag) {
        window.gtag('event', 'membership_plan_selected', {
          plan: planId
        });
      } else if (window.dataLayer && Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event: 'membership_plan_selected', plan: planId });
      }
    } catch {}
    const el = document.getElementById('register');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const url = new URL(window.location.href);
    url.searchParams.set('plan', planId);
    url.hash = 'register';
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan) {
      setSelectedPlan(plan);
      try { localStorage.setItem('selectedPlan', plan); } catch {}
    } else {
      try {
        const saved = localStorage.getItem('selectedPlan');
        if (saved) setSelectedPlan(saved);
      } catch {}
    }
  }, []);

  return (
    <div className="membership-page">
      <MembershipHero />
      <MembershipPricing onChoosePlan={handleChoosePlan} selectedPlan={selectedPlan} />
      <MembershipBenefits />
      <MembershipRegistration selectedPlan={selectedPlan} />
    </div>
  );
};

export default Membership;
