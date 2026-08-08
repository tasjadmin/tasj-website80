import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import ProfileCard from './ProfileCard';
import { db } from '../../lib/supabase';
import './LeadershipGrid.css';

const LeadershipGrid = () => {
  const [leadershipData, setLeadershipData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeadershipData();
  }, []);

  const loadLeadershipData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load database leadership data
      const databaseResponse = await db.getPublicLeadership().catch(e => {
        console.warn('Failed to load database leadership data:', e);
        return { error: e };
      });

      let databaseLeaders = [];
      const { data: leaders, error: dbError } = databaseResponse;
      
      if (dbError) {
        console.warn('Database error when fetching leadership:', dbError);
      } else if (Array.isArray(leaders)) {
        databaseLeaders = leaders.map(leader => ({
          id: leader.id,
          name: `${leader.first_name || ''} ${leader.last_name || ''}`.trim() || 'Unknown',
          position: leader.role || 'Member',
          category: leader.committee,
          description: leader.bio || `Member of ${leader.committee}`,
          photo: leader.profile_image_base64 || 'https://via.placeholder.com/300x300/1A237E/FFFFFF?text=Member',
          social: {
            ...(leader.social || {}),
            ...(leader.email ? { email: leader.email } : {})
          }
        }));
      }

      setLeadershipData(databaseLeaders);
    } catch (error) {
      console.error('Error loading leadership data:', error);
      setError('Failed to load leadership data');
    } finally {
      setLoading(false);
    }
  };

  // Group and sort data using useMemo for stability
  const processedGroups = useMemo(() => {
    if (leadershipData.length === 0) return { groups: {}, categories: [] };

    const roleHierarchy = {
      'President': 1,
      'Vice President': 2,
      'Elected President': 3,
      'Secretary': 4,
      'Joint Secretary': 5,
      'Treasurer': 6,
      'Joint Treasurer': 7,
      'Chair': 8,
      'Co-Chair': 9,
      'Member': 10
    };

    const committeeOrder = {
      'Board Members': 1,
      'Executive Committee': 2,
      'Event Committee': 3,
      'Registration and Membership Committee': 4,
      'Food Committee': 5,
      'IT Committee': 6,
      'Cultural Committee': 7,
      'Sports Committee': 8,
      'Volunteer Team': 9
    };

    const sortLeaders = (leaders) => {
      return [...leaders].sort((a, b) => {
        const roleA = a.position || '';
        const roleB = b.position || '';
        const rankA = roleHierarchy[roleA] || 999;
        const rankB = roleHierarchy[roleB] || 999;
        if (rankA !== 999 && rankB !== 999) return rankA - rankB;
        if (rankA !== 999) return -1;
        if (rankB !== 999) return 1;
        return roleA.localeCompare(roleB);
      });
    };

    const groups = leadershipData.reduce((acc, leader) => {
      let cat = leader.category || 'Executive Committee';
      if (cat === 'Education Committee') cat = 'IT Committee';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(leader);
      return acc;
    }, {});

    Object.keys(groups).forEach(cat => {
      groups[cat] = sortLeaders(groups[cat]);
    });

    const categories = Object.keys(groups).sort((a, b) => {
      const orderA = committeeOrder[a] || 999;
      const orderB = committeeOrder[b] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    return { groups, categories };
  }, [leadershipData]);

  const { groups: groupedLeaders, categories: sortedCategories } = processedGroups;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  if (loading) {
    return (
      <section className="leadership-grid-main">
        <div className="container">
          <div className="leadership-content">
            <div className="leadership-section">
              <div className="skeleton-title" style={{ maxWidth: '300px' }}></div>
              <div className="profile-cards-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={`skeleton-${n}`} className="skeleton-card">
                    <div className="skeleton-image"></div>
                    <div className="skeleton-content">
                      <div className="skeleton-line title"></div>
                      <div className="skeleton-line subtitle"></div>
                      <div className="skeleton-line description"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="leadership-grid-main">
        <div className="container">
          <div className="error-message">
            <p>{error}</p>
            <button onClick={loadLeadershipData} className="retry-btn">Retry</button>
          </div>
        </div>
      </section>
    );
  }

  // Check if we have any leadership data to display
  const hasLeadershipData = Object.keys(groupedLeaders).length > 0;

  return (
    <section className="leadership-grid-main">
      <div className="container">
        <motion.div
          className="leadership-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {hasLeadershipData ? (
            <>
              {sortedCategories.map((category) => {
                const leaders = groupedLeaders[category];
                return (
                  <motion.div
                    key={category}
                    className="leadership-section"
                    variants={sectionVariants}
                  >
                    <h2 className="section-title">{category}</h2>
                    <div className="profile-cards-grid">
                      {leaders.map((leader) => (
                        <ProfileCard 
                          key={leader.id} 
                          leader={{
                            ...leader,
                            position: category === 'Board Members' ? null : leader.position
                          }} 
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}

              <motion.div
                className="contact-leadership"
                variants={sectionVariants}
              >
                <a href="/contact" className="btn btn-primary contact-btn">
                  Contact Leadership
                </a>
              </motion.div>
            </>
          ) : (
            <motion.div
              className="no-leadership-data"
              variants={sectionVariants}
            >
              <h2>No Leadership Data Available</h2>
              <p>There are currently no committee members to display.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default LeadershipGrid;
