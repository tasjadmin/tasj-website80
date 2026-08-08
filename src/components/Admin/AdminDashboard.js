import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatEventDateTime } from '../../utils/timezoneDateUtils';
import './AdminDashboard.css';

const AdminDashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState([
    { title: 'Total Members', value: '-', trend: '+0%', icon: '👥', color: 'blue' },
    { title: 'New Members (This Month)', value: '-', trend: '+0%', icon: '✨', color: 'orange' },
    { title: 'Active Events', value: '-', trend: 'Steady', icon: '📅', color: 'green' }
  ]);

  const [recentActivities, setRecentActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('All');

  const [revenueData, setRevenueData] = useState({
    totalThisMonth: 0,
    totalThisYear: 0,
    pendingPayments: 0,
    methods: { stripe: { amount: 0, count: 0 }, zelle: { amount: 0, count: 0 }, venmo: { amount: 0, count: 0 }, other: { amount: 0, count: 0 } },
    monthlyMethods: { zelle: { amount: 0, count: 0 }, venmo: { amount: 0, count: 0 } },
    yearlyMethods: { zelle: { amount: 0, count: 0 }, venmo: { amount: 0, count: 0 } }
  });

  const [chartData, setChartData] = useState({
    members: [],
    revenue: []
  });

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const calculateRevenue = (reg, event) => {
    if (reg.payment_status !== 'paid' && reg.status !== 'approved' && reg.payment_status !== 'approved') return 0;

    if (reg.paid_amount) return Number(reg.paid_amount);

    const isMember = reg.is_member === true;
    let unitPrice = 0;
    if (isMember && event.member_price !== undefined && event.member_price !== null) {
      unitPrice = Number(event.member_price);
    } else if (!isMember && event.non_member_price !== undefined && event.non_member_price !== null) {
      unitPrice = Number(event.non_member_price);
    } else {
      unitPrice = Number(event.registration_fee || 0);
    }
    return unitPrice * (reg.attendees || 1);
  };

  const trackMethod = (methodStr, amount, methodsObj) => {
    if (!methodStr) methodStr = 'other';
    const m = methodStr.toLowerCase();
    
    // Initialize if structure is old or new
    const ensureObj = (key) => {
      if (typeof methodsObj[key] === 'number') {
        methodsObj[key] = { amount: methodsObj[key], count: 0 };
      } else if (!methodsObj[key]) {
        methodsObj[key] = { amount: 0, count: 0 };
      }
    };

    ['stripe', 'zelle', 'venmo', 'other'].forEach(ensureObj);

    if (m.includes('stripe') || m.includes('online') || m.includes('card')) {
      methodsObj.stripe.amount += amount;
      methodsObj.stripe.count += 1;
    } else if (m.includes('zelle')) {
      methodsObj.zelle.amount += amount;
      methodsObj.zelle.count += 1;
    } else if (m.includes('venmo')) {
      methodsObj.venmo.amount += amount;
      methodsObj.venmo.count += 1;
    } else {
      methodsObj.other.amount += amount;
      methodsObj.other.count += 1;
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [membersResult, eventsResult, recentRegsResult] = await Promise.all([
        db.getMembersLite(),
        db.getEvents(),
        db.getRecentRegistrations(400) // Increase limits for better year tracking & charts
      ]);

      const members = membersResult.data || [];
      const events = eventsResult.data || [];
      const recentRegistrations = recentRegsResult.data || [];

      // Time variables
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const newMembers = members.filter(m => {
        const d = new Date(m.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeEventsCount = events.filter(e => {
        if (!e.event_date) return false;
        const d = formatEventDateTime(e.event_date, e.event_time).dateObj;
        d.setHours(0, 0, 0, 0);
        return d >= today && e.status !== 'draft' && e.status !== 'cancelled';
      }).length;

      // Initialize 30-day arrays for charts
      const membersMap = {};
      const revenueMap = {};
      for (let i = 0; i <= 30; i++) {
        const d = new Date(thirtyDaysAgo);
        d.setDate(d.getDate() + i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        membersMap[key] = { date: key, count: 0 };
        revenueMap[key] = { date: key, revenue: 0 };
      }

      // Activities & Revenue Tracking
      let activities = [];
      let calculatedMonthlyRevenue = 0;
      let calculatedYearlyRevenue = 0;
      let calculatedPending = 0;
      let methodTracking = { 
        stripe: { amount: 0, count: 0 }, 
        zelle: { amount: 0, count: 0 }, 
        venmo: { amount: 0, count: 0 }, 
        other: { amount: 0, count: 0 } 
      };
      let monthlyBreakdown = { zelle: { amount: 0, count: 0 }, venmo: { amount: 0, count: 0 } };
      let yearlyBreakdown = { zelle: { amount: 0, count: 0 }, venmo: { amount: 0, count: 0 } };

      // Membership data passes
      members.forEach((m, idx) => {
        const d = new Date(m.created_at);
        if (idx < 20) {
          activities.push({
            type: 'Members',
            action: 'New member registered',
            name: `${m.first_name} ${m.last_name}`,
            email: m.email,
            date: d,
            link: 'members'
          });
        }

        // Member Chart Data check
        if (d >= thirtyDaysAgo) {
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (membersMap[key]) membersMap[key].count += 1;
        }

        let amount = Number(m.paid_amount || 0);

        if (d.getFullYear() === currentYear) {
          if (m.payment_status === 'pending') calculatedPending += 1;

          if (m.payment_status === 'paid' || m.status === 'approved') {
            calculatedYearlyRevenue += amount;
            if (d.getMonth() === currentMonth) {
              calculatedMonthlyRevenue += amount;
            }
            trackMethod(m.payment_method, amount, methodTracking);
          }
        }

        // Revenue Chart tracking (from membership payments)
        if ((m.payment_status === 'paid' || m.status === 'approved') && d >= thirtyDaysAgo) {
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (revenueMap[key]) revenueMap[key].revenue += amount;
        }
      });

      // Events activity pass
      events.slice(0, 20).forEach(e => {
        if (e.created_at) {
          activities.push({
            type: 'Events',
            action: 'Event created',
            name: e.name,
            date: new Date(e.created_at),
            link: 'events'
          });
        }
      });

      // Registrations & Revenue pass
      for (const r of recentRegistrations) {
        const event = events.find(e => e.id === r.event_id);
        const eventName = event ? event.name : 'Unknown Event';
        const d = new Date(r.created_at);
        let amount = calculateRevenue(r, event || {});

        if (d.getFullYear() === currentYear) {
          if (r.payment_status === 'paid' || r.status === 'approved' || r.payment_status === 'approved') {
            calculatedYearlyRevenue += amount;
            if (d.getMonth() === currentMonth) {
              calculatedMonthlyRevenue += amount;
            }
            trackMethod(r.payment_method, amount, methodTracking);
            
            // Registration-specific Monthly/Yearly Breakdown
            const m = (r.payment_method || '').toLowerCase();
            if (m.includes('zelle')) {
              yearlyBreakdown.zelle.amount += amount;
              yearlyBreakdown.zelle.count += 1;
              if (d.getMonth() === currentMonth) {
                monthlyBreakdown.zelle.amount += amount;
                monthlyBreakdown.zelle.count += 1;
              }
            } else if (m.includes('venmo')) {
              yearlyBreakdown.venmo.amount += amount;
              yearlyBreakdown.venmo.count += 1;
              if (d.getMonth() === currentMonth) {
                monthlyBreakdown.venmo.amount += amount;
                monthlyBreakdown.venmo.count += 1;
              }
            }
          } else if (r.payment_status === 'pending' || r.status === 'pending') {
            if (d.getMonth() === currentMonth) {
              calculatedPending += 1;
            }
          }
        }

        // Action grouping
        activities.push({
          type: 'Registrations',
          action: 'New event registration',
          name: r.full_name,
          subText: `for ${eventName}`,
          date: d,
          link: 'events'
        });

        let paymentConfirmedDate = d;

        if ((r.payment_status === 'paid' || r.payment_status === 'approved') && r.updated_at && r.updated_at !== r.created_at) {
          paymentConfirmedDate = new Date(r.updated_at);
          activities.push({
            type: 'Payments',
            action: 'Payment verified',
            name: r.full_name,
            subText: `$${amount.toLocaleString()} for ${eventName}`,
            date: paymentConfirmedDate,
            link: 'events'
          });
        }

        // Revenue Chart tracking (from event registrations)
        if ((r.payment_status === 'paid' || r.status === 'approved' || r.payment_status === 'approved') && paymentConfirmedDate >= thirtyDaysAgo) {
          const key = paymentConfirmedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (revenueMap[key]) revenueMap[key].revenue += amount;
        }
      }

      // Convert Chart Map objects to arrays
      const memberChartArr = Object.values(membersMap);
      const revenueChartArr = Object.values(revenueMap);

      setChartData({
        members: memberChartArr,
        revenue: revenueChartArr
      });

      setStats([
        { title: 'Total Members', value: members.length.toLocaleString(), trend: members.length > 0 ? `+${Math.round((newMembers / members.length) * 100)}% m/m` : '+0%', icon: '👥', color: 'blue' },
        { title: 'New Members (This Month)', value: newMembers.toLocaleString(), trend: 'Active', icon: '✨', color: 'orange' },
        { title: 'Active Events', value: activeEventsCount.toLocaleString(), trend: 'Next 30d', icon: '📅', color: 'green' }
      ]);

      setRevenueData({
        totalThisMonth: calculatedMonthlyRevenue,
        totalThisYear: calculatedYearlyRevenue,
        pendingPayments: calculatedPending,
        methods: methodTracking,
        monthlyMethods: monthlyBreakdown,
        yearlyMethods: yearlyBreakdown
      });

      const sortedActivities = activities.sort((a, b) => b.date - a.date).slice(0, 60);
      setRecentActivities(sortedActivities);
      setFilteredActivities(sortedActivities);

      // Upcoming Events logic
      const upcoming = events
        .filter(e => {
          if (!e.event_date) return false;
          const d = formatEventDateTime(e.event_date, e.event_time).dateObj;
          d.setHours(0, 0, 0, 0);
          return d >= today;
        })
        .sort((a, b) => formatEventDateTime(a.event_date, a.event_time).dateObj - formatEventDateTime(b.event_date, b.event_time).dateObj)
        .slice(0, 4); // Fetch top 6 for nice 3x2 grid

      const upcomingWithDetails = await Promise.all(upcoming.map(async (event) => {
        const { data: regs } = await db.getEventRegistrations(event.id);
        const eventRegs = regs || [];
        const confirmedRevenue = eventRegs.reduce((sum, reg) => sum + calculateRevenue(reg, event), 0);
        return { ...event, regCount: eventRegs.length, confirmedRevenue };
      }));

      setUpcomingEvents(upcomingWithDetails);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Filter Activities when selection changes
  useEffect(() => {
    if (activityFilter === 'All') {
      setFilteredActivities(recentActivities);
    } else {
      setFilteredActivities(recentActivities.filter(a => a.type === activityFilter));
    }
  }, [activityFilter, recentActivities]);

  // Custom tooltips for charts
  const CustomMemberTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          <p className="val members">{`${payload[0].value} signups`}</p>
        </div>
      );
    }
    return null;
  };

  const CustomRevenueTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          <p className="val rev">{`$${payload[0].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="admin-overview-container">
      {/* 1. Header Section */}
      <motion.div className="overview-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="header-titles">
          <h1>Dashboard Overview</h1>
          <p className="subtitle">Real-time system insights</p>
        </div>
        <div className="header-date">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </motion.div>

      {/* 12-Column Grid Implementation (Top Main Panel) */}
      <div className="dashboard-grid-12">

        {/* LEFT COLUMN (8 cols) */}
        <div className="dashboard-col-left">

          {/* KPI Section (Top Row inside Left) */}
          <div className="kpi-grid">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                className={`kpi-card bg-${stat.color}`}
                onClick={() => stat.title.includes('Member') ? onNavigate?.('members') : onNavigate?.('events')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ cursor: 'pointer' }}
              >
                <div className="kpi-top-accent"></div>
                <div className="kpi-content">
                  <div className="kpi-meta">
                    <span className="kpi-title">{stat.title}</span>
                    <span className="kpi-icon">{stat.icon}</span>
                  </div>
                  <div className="kpi-value-row">
                    <h3>{loading ? '-' : stat.value}</h3>
                    <div className="kpi-trend">
                      <span className={`trend-pill ${stat.trend.includes('+') ? 'positive' : 'neutral'}`}>{stat.trend}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Analytics Overview Section - Real Dynamic Charts */}
          <motion.div className="section-card analytics-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="panel-header">
              <h2>Analytics Overview (Last 30 Days)</h2>
            </div>
            <div className="charts-grid-res">

              {/* Member Growth Chart */}
              <div className="chart-block">
                <h4>Member Growth</h4>
                <div className="chart-area-wrapper">
                  {loading ? (
                    <div className="spinner">Analysing...</div>
                  ) : chartData.members.every(d => d.count === 0) ? (
                    <div className="empty-state">No Data Available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData.members} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} interval="preserveStartEnd" minTickGap={20} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip content={<CustomMemberTooltip />} />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMembers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Revenue Trend Chart */}
              <div className="chart-block">
                <h4>Revenue Trend</h4>
                <div className="chart-area-wrapper">
                  {loading ? (
                    <div className="spinner">Analysing...</div>
                  ) : chartData.revenue.every(d => d.revenue === 0) ? (
                    <div className="empty-state">No Data Available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData.revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} interval="preserveStartEnd" minTickGap={20} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                        <Tooltip content={<CustomRevenueTooltip />} />
                        <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          </motion.div>

          {/* Recent Activities */}
          <motion.div className="section-card activities-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="panel-header">
              <h2>Recent Activities</h2>
              <div className="filter-wrapper">
                <select className="ui-select" value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}>
                  <option value="All">All Feed</option>
                  <option value="Members">Members</option>
                  <option value="Events">Events</option>
                  <option value="Payments">Payments</option>
                  <option value="Registrations">Registrations</option>
                </select>
              </div>
            </div>

            <div className="activities-list-container scrollable-y">
              {loading ? (
                <div className="spinner">Loading data...</div>
              ) : filteredActivities.length === 0 ? (
                <div className="empty-state">No activities match this filter.</div>
              ) : (
                filteredActivities.map((act, i) => (
                  <div key={i} className="activity-row list-item-hover">
                    <div className={`act-icon-wrapper type-${act.type.toLowerCase()}`}>
                      {act.type === 'Members' && '👤'}
                      {act.type === 'Events' && '📅'}
                      {act.type === 'Registrations' && '📝'}
                      {act.type === 'Payments' && '💰'}
                    </div>
                    <div className="act-details">
                      <h4>{act.action}</h4>
                      <p className="act-target">{act.name} {act.subText && <span className="txt-muted">{act.subText}</span>}</p>
                    </div>
                    <div className="act-right">
                      <span className="act-time">{getTimeAgo(act.date)}</span>
                      {onNavigate && (
                        <button className="act-view-btn outline-btn" onClick={() => onNavigate(act.link)}>View</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN (4 cols) */}
        <div className="dashboard-col-right">

          {/* Revenue Snapshot Upgrade */}
          <motion.div className="section-card revenue-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="panel-header">
              <h2>Revenue Snapshot</h2>
            </div>
            <div className="revenue-metrics-list">
              <div className="metric-row-container">
                <div className="metric-row">
                  <span className="m-label">This Month</span>
                  {loading ? <span className="m-val">-</span> : <span className="m-val primary-highlight">${revenueData.totalThisMonth.toLocaleString()}</span>}
                </div>
                {!loading && (
                  <div className="metric-method-details">
                    <span>Zelle: ${revenueData.monthlyMethods.zelle.amount.toLocaleString()} ({revenueData.monthlyMethods.zelle.count})</span>
                    <span>Venmo: ${revenueData.monthlyMethods.venmo.amount.toLocaleString()} ({revenueData.monthlyMethods.venmo.count})</span>
                  </div>
                )}
              </div>

              <div className="metric-row-container">
                <div className="metric-row">
                  <span className="m-label">Year to Date</span>
                  {loading ? <span className="m-val">-</span> : <span className="m-val bold-dark">${revenueData.totalThisYear.toLocaleString()}</span>}
                </div>
                {!loading && (
                  <div className="metric-method-details">
                    <span>Zelle: ${revenueData.yearlyMethods.zelle.amount.toLocaleString()} ({revenueData.yearlyMethods.zelle.count})</span>
                    <span>Venmo: ${revenueData.yearlyMethods.venmo.amount.toLocaleString()} ({revenueData.yearlyMethods.venmo.count})</span>
                  </div>
                )}
              </div>

              <div className="metric-row pending-row">
                <span className="m-label">Pending Verifications</span>
                {loading ? <span className="m-val">-</span> : <span className="m-val warning-highlight">{revenueData.pendingPayments}</span>}
              </div>
            </div>

            <div className="revenue-divider"></div>

            <h4 className="sub-heading-sm">Method Breakdown (YTD)</h4>
            <div className="method-breakdown">
              <div className="method-pill stripe">
                <span className="method-name">Online / Card</span>
                <span className="method-val">${revenueData.methods.stripe.amount.toLocaleString()}</span>
              </div>
              <div className="method-pill zelle">
                <span className="method-name">Zelle ({revenueData.methods.zelle.count})</span>
                <span className="method-val">${revenueData.methods.zelle.amount.toLocaleString()}</span>
              </div>
              <div className="method-pill venmo">
                <span className="method-name">Venmo ({revenueData.methods.venmo.count})</span>
                <span className="method-val">${(revenueData.methods.venmo.amount + revenueData.methods.other.amount).toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions (Grid based) */}
          <motion.div className="section-card actions-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="panel-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="quick-action-square-grid">
              <button className="q-action-tile" onClick={() => onNavigate && onNavigate('members')}>
                <span className="q-icon">👤</span>
                <span className="q-text">Members</span>
              </button>
              <button className="q-action-tile" onClick={() => onNavigate && onNavigate('events')}>
                <span className="q-icon">📅</span>
                <span className="q-text">Events</span>
              </button>
              <button className="q-action-tile" onClick={() => onNavigate && onNavigate('gallery')}>
                <span className="q-icon">📷</span>
                <span className="q-text">Gallery</span>
              </button>
              <button className="q-action-tile" onClick={() => onNavigate && onNavigate('settings')}>
                <span className="q-icon">⚙️</span>
                <span className="q-text">Settings</span>
              </button>

              <button className="q-action-tile primary-action" onClick={() => onNavigate && onNavigate('events')}>
                <span className="q-icon">➕</span>
                <span className="q-text">Add Event</span>
              </button>
              <button className="q-action-tile primary-action" onClick={() => onNavigate && onNavigate('members')}>
                <span className="q-icon">➕</span>
                <span className="q-text">Add Member</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* HORIZONTAL FULL-WIDTH UPCOMING EVENTS SECTION */}
      <div className="upcoming-full-width-section">
        <motion.div className="section-card upcoming-horizontal-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="panel-header">
            <h2>Upcoming Events System</h2>
          </div>

          <div className="upcoming-events-grid-3">
            {loading ? (
              <div className="spinner" style={{ gridColumn: '1 / -1' }}>Loading events...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>No upcoming events ahead.</div>
            ) : (
              upcomingEvents.map(event => {
                return (
                  <div key={event.id} className="upcoming-card-advanced">
                    <div className="upcoming-card-top">
                      <div className="admin-event-date">
                        <span className="date-month">{formatEventDateTime(event.event_date, event.event_time).monthLabel}</span>
                        <span className="date-day">{formatEventDateTime(event.event_date, event.event_time).dayLabel}</span>
                      </div>
                      <div className="event-info-main">
                        <h4 className="event-title-trunc" title={event.name}>{event.name}</h4>
                        <span className={`status-pill ${event.status}`}>{event.status}</span>
                      </div>
                    </div>

                    <div className="upcoming-card-middle">
                      <div className="stat-group">
                        <span className="stat-icon">👥</span>
                        <span className="stat-val">{event.regCount} <small>registered</small></span>
                      </div>
                      <div className="stat-group">
                        <span className="stat-icon">💰</span>
                        <span className="stat-val rev">${event.confirmedRevenue.toLocaleString()} <small>revenue</small></span>
                      </div>
                    </div>

                    <div className="upcoming-card-bottom" style={{ marginTop: 'auto' }}>
                      <button className="action-btn-full" onClick={() => onNavigate && onNavigate('events')}>Manage Event</button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default AdminDashboard;
