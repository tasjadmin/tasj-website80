import React from 'react';
import Hero from '../components/Home/Hero';
import DynamicCarousel from '../components/Home/DynamicCarousel';
import UpcomingEvents3D from '../components/Home/UpcomingEvents3D';
import AboutOverview from '../components/Home/AboutOverview';
import PresidentMessage from '../components/Home/PresidentMessage';
import LeadershipPreview from '../components/Home/LeadershipPreview';
import CommunityHighlights from '../components/Home/CommunityHighlights';
import './Home.css';


const Home = () => {
  return (
    <div className="home-page">
      <Hero />
      <CommunityHighlights />
      <UpcomingEvents3D />
      <PresidentMessage />
      <AboutOverview />
      <LeadershipPreview />
      <DynamicCarousel source="gallery" title="Completed Events" subtitle="Relive our past celebrations and view galleries" />
    </div>
  );
};

export default Home;
