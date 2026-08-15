import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navigation from '../components/Navigation';
import { auth } from '../lib/supabase';
import { 
  setupAdminSession
} from '../lib/sessionManager';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await auth.getCurrentUser();
        if (user && isMountedRef.current) {
          navigate('/admin');
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };
    
    checkUser();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Normalize inputs to prevent whitespace issues
      const email = formData.email.trim();
      const password = formData.password.trim();

      // Sign in with Supabase Auth
      const { data, error: signInError } = await auth.signIn(email, password);

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError('Invalid email or password');
        return;
      }

      if (!data.session) {
        setError('Failed to create session. Please try again.');
        return;
      }

      // Check if user is an admin
      const isAdmin = await auth.isAdmin();
      if (!isAdmin) {
        // Sign out non-admin users
        await auth.signOut();
        setError('Access denied. Admin privileges required.');
        return;
      }

      try { localStorage.setItem('adminRememberMe', rememberMe ? 'true' : 'false'); } catch {}
      setupAdminSession();
      
      // Navigate to admin dashboard
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Navigation />
      <div className="login-container">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="login-header">
            <div className="admin-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
              </svg>
            </div>
            <h1>Admin Login</h1>
            <p>TASJ Administration Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <motion.div
                className="login-error-message"
                role="alert"
                aria-live="polite"
                id="login-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {error}
              </motion.div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="forgot-password"
                onClick={async () => {
                  try {
                    if (!formData.email.trim()) {
                      setError('Enter your email to reset password');
                      return;
                    }
                    setError('');
                    const { error: resetError } = await auth.resetPassword(formData.email.trim(), window.location.origin + '/login');
                    if (resetError) {
                      setError('Unable to start password reset.');
                    } else {
                      setError('Password reset email sent if the account exists.');
                    }
                  } catch {
                    setError('Unable to start password reset.');
                  }
                }}
                aria-describedby={error ? 'login-error' : undefined}
              >
                Forgot password?
              </button>
            </div>
          </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                </svg>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Sign in with your admin email and password</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
