// Session management utility for admin authentication
export const SESSION_TOKEN_KEY = 'adminSessionToken';
export const ADMIN_LOGGED_IN_KEY = 'adminLoggedIn';
export const ADMIN_USER_KEY = 'adminUser';
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
export const REMEMBER_ME_KEY = 'adminRememberMe';

/**
 * Retrieves the stored session token from localStorage
 * @returns {Object|null} Session object or null if invalid/missing
 */
export const getStoredSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!raw) return null;
    
    const session = JSON.parse(raw);
    
    // Validate session structure
    if (!session || typeof session !== 'object' || 
        !session.createdAt || typeof session.createdAt !== 'number') {
      // Clean up malformed session
      localStorage.removeItem(SESSION_TOKEN_KEY);
      return null;
    }
    
    return session;
  } catch (error) {
    console.warn('Failed to parse session token:', error);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    return null;
  }
};

/**
 * Checks if a session object is still valid (not expired)
 * @param {Object} sessionObj - Session object to validate
 * @returns {boolean} True if session is valid and not expired
 */
export const isSessionValid = (sessionObj) => {
  if (!sessionObj || !sessionObj.createdAt) return false;
  
  const remember = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  const ttl = remember ? (30 * 24 * 60 * 60 * 1000) : SESSION_TTL_MS;
  const age = Date.now() - Number(sessionObj.createdAt);
  return age >= 0 && age <= ttl;
};

/**
 * Creates a new session token
 * @returns {Object} New session token object
 */
export const createSessionToken = () => {
  return {
    token: Math.random().toString(36).slice(2) + Date.now().toString(36),
    createdAt: Date.now()
  };
};

/**
 * Sets up admin session with both active flags and session token
 */
export const setupAdminSession = () => {
  try {
    localStorage.setItem(ADMIN_LOGGED_IN_KEY, 'true');
    localStorage.setItem(ADMIN_USER_KEY, 'admin');
    
    const tokenPayload = createSessionToken();
    localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(tokenPayload));
  } catch (error) {
    console.warn('Failed to setup admin session:', error);
    // Session setup failed - localStorage might be disabled
  }
};

/**
 * Clears all admin session data
 */
export const clearAdminSession = () => {
  try {
    localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to clear admin session:', error);
  }
};

/**
 * Checks if user is currently logged in (active session)
 * @returns {boolean} True if user has active login session
 */
export const isCurrentlyLoggedIn = () => {
  try {
    return localStorage.getItem(ADMIN_LOGGED_IN_KEY) === 'true';
  } catch (error) {
    console.warn('Failed to check login status:', error);
    return false;
  }
};

/**
 * Attempts to restore admin session from valid token
 * @returns {boolean} True if session was restored, false otherwise
 */
export const attemptSessionRestore = () => {
  try {
    const sessionObj = getStoredSession();
    
    if (isSessionValid(sessionObj)) {
      localStorage.setItem(ADMIN_LOGGED_IN_KEY, 'true');
      localStorage.setItem(ADMIN_USER_KEY, 'admin');
      return true;
    }
    
    // Clean up expired token
    if (sessionObj) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    
    return false;
  } catch (error) {
    console.warn('Failed to restore session:', error);
    return false;
  }
};

/**
 * Cleans up expired tokens (utility function)
 */
export const cleanupExpiredTokens = () => {
  try {
    const sessionObj = getStoredSession();
    if (sessionObj && !isSessionValid(sessionObj)) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch (error) {
    console.warn('Failed to cleanup expired tokens:', error);
  }
};
