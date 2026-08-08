import React from 'react';
import LeadershipHero from '../components/Leadership/LeadershipHero';
import LeadershipGrid from '../components/Leadership/LeadershipGrid';
import './Leadership.css';

const Leadership = () => {
  return (
    <div className="leadership-page">
      <LeadershipHero />
      <LeadershipGrid />
    </div>
  );
};

export default Leadership;
