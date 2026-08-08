import React from 'react';
import EventsHero from '../components/Events/EventsHero';
import EventCalendar from '../components/Events/EventCalendar';
import EventListing from '../components/Events/EventListing';
import './Events.css';

const Events = () => {
  return (
    <div className="events-page">
      <EventsHero />
      <EventCalendar />
      <EventListing />
    </div>
  );
};

export default Events;
