import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from './Logo';
import './Navigation.css';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Global Layout Offset System 
  useLayoutEffect(() => {
    const navbar = navRef.current;
    if (!navbar) return;

    const updateHeight = () => {
      const height = navbar.offsetHeight;
      document.documentElement.style.setProperty('--navbar-height', `${height}px`);
    };

    updateHeight(); // First measure after mount

    // Dynamic resize observer
    let resizeObserver;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(navbar);
    } else {
      window.addEventListener('resize', updateHeight);
    }

    // React to orientation changes explicitly
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', updateHeight);
      
      window.removeEventListener('orientationchange', updateHeight);
      
      // Reset layout offset when navbar unmounts (e.g., login pages)
      document.documentElement.style.setProperty('--navbar-height', '0px');
    };
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Events', path: '/events' },
    { name: 'Membership', path: '/membership' },
    { name: 'Leadership', path: '/leadership' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Contact', path: '/contact' },
    { name: 'Admin Login', path: '/login', isAdmin: true }
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <motion.nav
      ref={navRef}
      className="navigation"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container">
        <div className="nav-content">
          <Link to="/" className="logo" onClick={scrollToTop}>
            <Logo />
          </Link>

          <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''} ${item.isAdmin ? 'admin-link' : ''}`}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  scrollToTop();
                }}
                aria-label={item.isAdmin ? 'Admin Login' : item.name}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
