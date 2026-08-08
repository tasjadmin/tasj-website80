import React, { useState } from 'react';
import { motion } from 'framer-motion'; // Force Webpack ESLint to parse this!
import './AdminHeader.css';

const AdminHeader = ({ currentSection, onSectionChange, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sections = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'leadership', label: 'Leadership', icon: '👔' },
    { id: 'members', label: 'Members', icon: '👥' },
    { id: 'events', label: 'Events', icon: '📅' },
    { id: 'gallery', label: 'Gallery', icon: '🖼️' },
    { id: 'registrations', label: 'Registration', icon: '📝' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const handleSectionClick = (sectionId) => {
    onSectionChange(sectionId);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="admin-header">
      <div className="admin-header-content">
        <div className="admin-logo">
          <div className="admin-logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
            </svg>
          </div>
          <div className="admin-logo-text">
            <h1>TASJ Admin</h1>
            <p>Administration Panel</p>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="nav-sections">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`nav-section ${currentSection === section.id ? 'active' : ''} ${section.id === 'settings' ? 'settings-nav' : ''}`}
                onClick={() => handleSectionClick(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-label">{section.label}</span>
              </button>
            ))}
            <button className="logout-button" onClick={onLogout}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.08,15.59L16.67,13H7V11H16.67L14.08,8.41L15.5,7L20.5,12L15.5,17L14.08,15.59M19,3A2,2 0 0,1 21,5V9.67L19,7.67V5H5V19H19V16.33L21,14.33V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19Z"/>
              </svg>
              <span className="nav-label">Logout</span>
            </button>
          </div>
        </nav>

        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {isMobileMenuOpen && (
        <motion.div
          className="mobile-menu"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mobile-nav-sections">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`mobile-nav-section ${currentSection === section.id ? 'active' : ''}`}
                onClick={() => handleSectionClick(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-label">{section.label}</span>
              </button>
            ))}
            <button className="mobile-nav-section logout-nav" onClick={onLogout}>
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path d="M14.08,15.59L16.67,13H7V11H16.67L14.08,8.41L15.5,7L20.5,12L15.5,17L14.08,15.59M19,3A2,2 0 0,1 21,5V9.67L19,7.67V5H5V19H19V16.33L21,14.33V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19Z"/>
                </svg>
              </span>
              <span className="nav-label">Logout</span>
            </button>
          </div>
        </motion.div>
      )}
    </header>
  );
};

export default AdminHeader;