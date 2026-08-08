import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdminHeader from '../components/Admin/AdminHeader';
import AdminDashboard from '../components/Admin/AdminDashboard';
import AdminLeadership from '../components/Admin/AdminLeadership';
import AdminMembers from '../components/Admin/AdminMembers';
import AdminEvents from '../components/Admin/AdminEvents';
import AdminGallery from '../components/Admin/AdminGallery';
import EventRegistrations from '../components/Admin/EventRegistrations';
import AdminSettings from '../components/Admin/AdminSettings';
import { auth } from '../lib/supabase';
import { clearAdminSession } from '../lib/sessionManager';
import './Admin.css';

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Read section from URL query params (e.g. ?tab=members)
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab') || 'dashboard';

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentSection, setCurrentSection] = useState(tabFromUrl);
  const [loading, setLoading] = useState(true);

  // Sync state if URL changes externally
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const currentTab = params.get('tab') || 'dashboard';
    if (currentTab !== currentSection) {
      setCurrentSection(currentTab);
    }
  }, [location.search, currentSection]);

  const handleSectionChange = (section) => {
    setCurrentSection(section);
    navigate(`/admin?tab=${section}`);
  };

  useEffect(() => {
    // Force reset the layout offset for admin pages to remove the 80px gap
    document.documentElement.style.setProperty('--navbar-height', '0px');
    
    // Prevent macOS elastic scrolling (overscroll) from revealing gaps
    // document.body.style.overscrollBehaviorY = 'none'; // Removed as it blocks mobile scrolling
    
    // Check if admin is authenticated with Supabase
    const checkAuth = async () => {
      try {
        const user = await auth.getCurrentUser();

        if (!user) {
          // Not logged in - redirect to login
          clearAdminSession();
          navigate('/login');
          setLoading(false);
          return;
        }

        // Check if user is an admin
        const isAdmin = await auth.isAdmin();
        if (!isAdmin) {
          // Not an admin - sign out and redirect
          await auth.signOut();
          clearAdminSession();
          navigate('/login');
          setLoading(false);
          return;
        }

        // User is authenticated and is an admin
        setIsLoggedIn(true);
        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        clearAdminSession();
        navigate('/login');
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local session data
      clearAdminSession();
      navigate('/login');
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <AdminDashboard onNavigate={handleSectionChange} />;
      case 'leadership':
        return <AdminLeadership />;
      case 'members':
        return <AdminMembers />;
      case 'events':
        return <AdminEvents />;
      case 'gallery':
        return <AdminGallery />;
      case 'registrations':
        return <EventRegistrations />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboard onNavigate={handleSectionChange} />;
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="admin-page">
      <AdminHeader
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        onLogout={handleLogout}
      />
      <motion.main
        className="admin-main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {renderSection()}
      </motion.main>
    </div>
  );
};

export default Admin;
