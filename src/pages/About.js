import React from 'react';
import AboutHero from '../components/About/AboutHero';
import OurStory from '../components/About/OurStory';
import OurValues from '../components/About/OurValues';
import Achievements from '../components/About/Achievements';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <AboutHero />
      <OurStory />
      <OurValues />
      <Achievements />
    </div>
  );
};

export default About;
