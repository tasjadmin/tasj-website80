import React from 'react';
import './Logo.css';

const Logo = () => {
  return (
    <div className="logo-container">
      <div className="logo-image-container">
        <img 
          src="/tasj-transparent-logo.png" 
          alt="TASJ Logo"
          className="logo-image"
        />
      </div>
    </div>
  );
};

export default Logo;