import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../lib/supabase';
import { formatEventDateTime } from '../../utils/timezoneDateUtils';
import './EventRegistrations.css';
// import { createSessionCheckout } from '../../services/supabaseService';
import { sendEmailForEventPaymentConfirmation } from '../../lib/emailService';

const EventRegistrations = () => {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');



  const [eventRegistrationCounts, setEventRegistrationCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [refundModalReg, setRefundModalReg] = useState(null);
  const [detailModalReg, setDetailModalReg] = useState(null);
  const [regHistory, setRegHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [refundHistory, setRefundHistory] = useState([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Load events on component mount
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.getEvents();
      if (error) {
        setError('Failed to load events');
        console.error('Error loading events:', error);
      } else {
        const eventsData = data || [];
        
        // Custom sort: Upcoming first (soonest first), then Completed (most recent first)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        const upcoming = eventsData
          .filter(e => {
            const date = e.event_date ? formatEventDateTime(e.event_date, e.event_time).dateObj : new Date(0);
            return date >= now;
          })
          .sort((a, b) => {
            const dateA = a.event_date ? formatEventDateTime(a.event_date, a.event_time).dateObj : new Date(0);
            const dateB = b.event_date ? formatEventDateTime(b.event_date, b.event_time).dateObj : new Date(0);
            return dateA - dateB;
          });
          
        const completed = eventsData
          .filter(e => {
            const date = e.event_date ? formatEventDateTime(e.event_date, e.event_time).dateObj : new Date(0);
            return date < now;
          })
          .sort((a, b) => {
            const dateA = a.event_date ? formatEventDateTime(a.event_date, a.event_time).dateObj : new Date(0);
            const dateB = b.event_date ? formatEventDateTime(b.event_date, b.event_time).dateObj : new Date(0);
            return dateB - dateA;
          });

        const sortedEvents = [...upcoming, ...completed];
        setEvents(sortedEvents);

        // Fetch actual registration counts for each event
        const counts = {};
        await Promise.all(
          eventsData.map(async (event) => {
            const { count } = await db.getRegistrationCountByEvent(event.id);
            counts[event.id] = count;
          })
        );
        setEventRegistrationCounts(counts);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async (eventId) => {
    if (!eventId) {
      setRegistrations([]);
      return;
    }

    try {
      setLoading(true);
      const [{ data: regs, error: regErr }, { data: pays }, { data: members }] = await Promise.all([
        db.getEventRegistrations(eventId),
        db.getPaymentsByEvent(eventId),
        db.getMembersLite()
      ]);
      if (regErr) {
        setError('Failed to load registrations');
        console.error('Error loading registrations:', regErr);
      } else {

        // Enrich registrations with payment method/status from payments if missing
        const enrich = (list) => {
          const byEmail = new Map();
          const byPhone = new Map();
          (pays || []).forEach(p => {
            if (p.payer_email) byEmail.set(p.payer_email.toLowerCase(), p);
            if (p.payer_phone) byPhone.set(String(p.payer_phone), p);
          });
          return (list || []).map(r => {
            let method = r.payment_method;
            let status = r.payment_status;
            if (!method || !status) {
              const match = (r.email && byEmail.get(r.email.toLowerCase())) || (r.phone && byPhone.get(String(r.phone)));
              if (match) {
                method = method || (match.payment_mode || (match.method === 'stripe' ? 'online' : 'offline'));
                status = status || (match.status || 'pending');
              }
            }

            let matchedMember = null;
            if (members) {
              matchedMember = r.email ? members.find(m => m.email?.toLowerCase() === r.email.toLowerCase()) : null;
              if (!matchedMember && r.phone) {
                // Secondary check by phone just in case
                matchedMember = members.find(m => String(m.phone).replace(/\D/g, '') === String(r.phone).replace(/\D/g, ''));
              }
            }

            // matchedMember.status is typically 'active' or 'approved'
            const isReallyMember = matchedMember && (matchedMember.status === 'approved' || matchedMember.status === 'active');
            const membershipType = isReallyMember ? matchedMember.membership_type : 'Non-Member';

            return {
              ...r,
              payment_method: method,
              payment_status: status,
              is_member: r.is_member != null ? r.is_member : isReallyMember,
              membership_type: r.membership_type && r.membership_type !== 'Non-Member' ? r.membership_type : (r.is_member != null ? (r.is_member ? 'Member' : 'Non-Member') : (isReallyMember ? membershipType : 'Non-Member'))
            };
          });
        };
        setRegistrations(enrich(regs || []));

        // Load refund history as well
        const { data: refunds } = await db.getEventRefundHistory(eventId);
        setRefundHistory(refunds || []);

        // Update the registration count for this event
        const { count } = await db.getRegistrationCountByEvent(eventId);
        setEventRegistrationCounts(prev => ({ ...prev, [eventId]: count }));
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (e) => {
    const eventId = e.target.value;
    setSelectedEvent(eventId);
    loadRegistrations(eventId);
    setCurrentPage(1);
  };

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [datePreset, setDatePreset] = useState('total'); // total, 24hours, 2days, 7days, 14days, custom

  // Handle date preset change
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);

    if (preset === 'total') {
      setDateRange({ start: '', end: '' });
      return;
    }

    if (preset === 'custom') return;

    const end = new Date();
    const start = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '24hours':
        start.setTime(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '2days':
        start.setDate(end.getDate() - 2);
        break;
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '14days':
        start.setDate(end.getDate() - 14);
        break;
      default:
        break;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
    setCurrentPage(1);
  };

  const handleViewDetails = async (reg) => {
    setDetailModalReg(reg);
    setLoadingHistory(true);
    try {
      const { data } = await db.getRegistrationHistory(reg.id);
      setRegHistory(data || []);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Initialize default date range
  useEffect(() => {
    handleDatePresetChange('total');
  }, []);

  const getFilteredRegistrations = () => {
    let filtered = registrations;

    // Apply date filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => new Date(r.registration_date) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.registration_date) <= endDate);
    }

    // Apply payment method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(r => {
        const isMember = r.is_member === true;
        const method = r.payment_method;
        if (methodFilter === 'pending_verification') return r.payment_status === 'pending_verification';
        if (methodFilter === 'online_member') return isMember && method === 'online';
        if (methodFilter === 'online_non_member') return !isMember && method === 'online';
        if (methodFilter === 'offline_member') return isMember && method === 'offline';
        if (methodFilter === 'offline_non_member') return !isMember && method === 'offline';
        return true;
      });
    }

    // Apply name search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.full_name && r.full_name.toLowerCase().includes(query)
      );
    }

    if (viewMode === 'attended') {
      filtered = filtered.filter(r => r.attended === true);
    }

    return filtered;
  };



  const [viewMode, setViewMode] = useState('registrations'); // 'registrations' | 'revenue' | 'refunds'
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const getRefundStatistics = () => {
    if (!selectedEvent || refundHistory.length === 0) {
      return {
        totalRefunded: 0,
        refundCount: 0,
        originalRevenue: 0,
        netRevenue: 0
      };
    }

    const regStats = getEventStatistics();
    const totalRefunded = refundHistory.reduce((acc, h) => acc + (Number(h.refund_amount) || 0), 0);
    const refundCount = refundHistory.length;
    const netRevenue = regStats.revenue.total; // already net in getEventStatistics because it uses paid_amount
    const originalRevenue = netRevenue + totalRefunded;

    return {
      totalRefunded,
      refundCount,
      originalRevenue,
      netRevenue
    };
  };



  // Helper to calculate revenue for a single registration
  const calculateRegistrationRevenue = (reg, event) => {
    if (!event) return 0;

    // Check payment status - only count confirmed payments
    // Online: paid, Offline: approved or paid
    const isOnline = reg.payment_method === 'online';
    const isPaid = reg.payment_status === 'paid' ||
      (!isOnline && reg.payment_status === 'approved');

    if (!isPaid) return 0;

    // Use stored amount if available (future proofing), else calculate
    if (reg.paid_amount !== undefined && reg.paid_amount !== null) {
      return Number(reg.paid_amount);
    }

    // Default calculation based on event prices
    const hasMemberPrice = event.member_price !== null && event.member_price !== undefined;
    const hasNonMemberPrice = event.non_member_price !== null && event.non_member_price !== undefined;
    const hasKidsMemberPrice = event.kids_member_price !== null && event.kids_member_price !== undefined;
    const hasKidsNonMemberPrice = event.kids_non_member_price !== null && event.kids_non_member_price !== undefined;

    let unitPrice = 0;
    if (reg.is_member && hasMemberPrice) {
      unitPrice = Number(event.member_price);
    } else if (!reg.is_member && hasNonMemberPrice) {
      unitPrice = Number(event.non_member_price);
    } else {
      unitPrice = Number(event.registration_fee || 0);
    }

    let kidsUnitPrice = 0;
    if (reg.is_member && hasKidsMemberPrice) {
      kidsUnitPrice = Number(event.kids_member_price);
    } else if (!reg.is_member && hasKidsNonMemberPrice) {
      kidsUnitPrice = Number(event.kids_non_member_price);
    } else {
      kidsUnitPrice = Number(event.kids_price || 0);
    }

    return (unitPrice * Number(reg.attendees || 0)) + (kidsUnitPrice * Number(reg.kids_count || 0));
  };

  // Enhanced statistics including Revenue
  const getEventStatistics = () => {
    const filtered = getFilteredRegistrations();
    if (!selectedEvent || filtered.length === 0) {
      return {
        totalRegistrations: 0,
        totalAttendees: 0,
        totalKids: 0,
        memberCount: 0,
        memberAttendees: 0,
        nonMemberCount: 0,
        nonMemberAttendees: 0,
        paidCount: 0,
        pendingCount: 0,
        onlineCount: 0,
        offlineCount: 0,
        revenue: {
          total: 0,
          member: 0,
          nonMember: 0,
          online: 0,
          offline: 0,
          memberOnline: 0,
          memberOffline: 0,
          nonMemberOnline: 0,
          nonMemberOffline: 0,
          zelle: { amount: 0, count: 0 },
          venmo: { amount: 0, count: 0 }
        }
      };
    }

    const event = events.find(e => e.id === selectedEvent);

    const stats = filtered.reduce((acc, reg) => {
      // Basic Counts
      acc.totalRegistrations++;
      const attendees = reg.attendees || 1;
      acc.totalAttendees += attendees;
      acc.totalKids += (reg.kids_count || 0);

      const isMember = reg.is_member === true;
      if (isMember) {
        acc.memberCount++;
        acc.memberAttendees += attendees;
      } else {
        acc.nonMemberCount++;
        acc.nonMemberAttendees += attendees;
      }

      const isPaid = reg.payment_status === 'paid';
      if (isPaid) acc.paidCount++;
      else acc.pendingCount++;

      // Payment Method Count (regardless of payment status, or typically we count tried methods)
      // Here usually we care about method if we want to know how they tried to pay.
      const isOnline = reg.payment_method === 'online';
      if (isOnline) acc.onlineCount++;
      else acc.offlineCount++;


      // Revenue Calculation
      const amount = calculateRegistrationRevenue(reg, event);
      if (amount > 0) {
        acc.revenue.total += amount;

        if (isMember) {
          acc.revenue.member += amount;
          if (isOnline) acc.revenue.memberOnline += amount;
          else acc.revenue.memberOffline += amount;
        } else {
          acc.revenue.nonMember += amount;
          if (isOnline) acc.revenue.nonMemberOnline += amount;
          else acc.revenue.nonMemberOffline += amount;
        }

        if (isOnline) acc.revenue.online += amount;
        else acc.revenue.offline += amount;

        // Payment Method Details for Zelle and Venmo
        const method = (reg.payment_method || '').toLowerCase();
        if (method.includes('zelle')) {
          acc.revenue.zelle.amount += amount;
          acc.revenue.zelle.count++;
        } else if (method.includes('venmo')) {
          acc.revenue.venmo.amount += amount;
          acc.revenue.venmo.count++;
        }
      }

      return acc;
    }, {
      totalRegistrations: 0,
      totalAttendees: 0,
      totalKids: 0,
      memberCount: 0,
      memberAttendees: 0,
      nonMemberCount: 0,
      nonMemberAttendees: 0,
      paidCount: 0,
      pendingCount: 0,
      onlineCount: 0,
      offlineCount: 0,
      revenue: {
        total: 0,
        member: 0,
        nonMember: 0,
        online: 0,
        offline: 0,
        memberOnline: 0,
        memberOffline: 0,
        nonMemberOnline: 0,
        nonMemberOffline: 0,
        zelle: { amount: 0, count: 0 },
        venmo: { amount: 0, count: 0 }
      }
    });

    return stats;
  };

  // Reset to page 1 when filters or view mode change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEvent, searchQuery, methodFilter, dateRange, viewMode, itemsPerPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Find the table container and scroll it into view if needed
    const tableEl = document.querySelector('.registrations-table-container');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };



  /*
  const handleApprove = async (reg) => {
    try {
      const event = events.find(e => e.id === selectedEvent);
      if (!event) {
        alert("Event not found");
        return;
      }

      // Calculate Price
      const hasMemberPrice = event.member_price !== null && event.member_price !== undefined;
      const hasNonMemberPrice = event.non_member_price !== null && event.non_member_price !== undefined;

      let unitPrice = 0;
      if (reg.is_member && hasMemberPrice) {
        unitPrice = Number(event.member_price);
      } else if (!reg.is_member && hasNonMemberPrice) {
        unitPrice = Number(event.non_member_price);
      } else {
        unitPrice = Number(event.registration_fee || 0);
      }

      const totalAmount = unitPrice * (reg.attendees || 1);
      console.log(totalAmount);
      const response = await createSessionCheckout({
        amount: Math.round(totalAmount * 100), // Convert to cents (Dollars * 100)
        currency: 'usd',
        name: event.name,
        email: reg.email,
        description: `Event Registration: ${event.name} (${reg.attendees} attendees)`,
        metadata: {
          type: 'event',
          eventId: event.id,
          regId: reg.id
        }
      });

      window.location.href = response.url;
    } catch (error) {
      console.error('Error while payment creation:', error);
      alert('Payment creation failed');
    }
  };
  */

  const handleVerifyPayment = async (reg) => {
    if (window.confirm(`Verify payment for ${reg.full_name}? This will mark it as PAID and send a confirmation email.`)) {
      try {
        // Update status to 'paid'
        const { error } = await db.updateEventRegistration(reg.id, { payment_status: 'paid' });
        if (error) throw error;

        // Send confirmation email
        try {
          const event = events.find(e => e.id === selectedEvent);
          await db.createRegistrationHistory({
            registration_id: reg.id,
            event_id: selectedEvent,
            full_name: reg.full_name,
            email: reg.email,
            phone: reg.phone,
            action_type: 'payment_verified',
            amount: reg.paid_amount || 0,
            previous_attendees: reg.attendees,
            updated_attendees: reg.attendees,
            payment_status: 'paid',
            transaction_id: reg.transaction_id,
            payment_note: 'Verified by Admin'
          });

          const paymentUrl = window.location.origin + '/event-payment/' + reg.id;

          const emailParams1 = {
            name: reg.full_name,
            email:reg.email,
            registration_type: "Event Registration",

            plan_name: "",
            event_name: event?.name || 'Event',

            amount: reg.paid_amount || 0,

            transaction_id: reg.transaction_id,
            payment_method: reg.payment_method,

            logo_url: process.env.REACT_APP_BASE_IMAGE_URL,
            payment_link:paymentUrl,
            organization_email: "info@tasj.org",
            organization_website: window.location.origin,
          };

          sendEmailForEventPaymentConfirmation(emailParams1);
          alert('Payment verified and confirmation email sent.');
        } catch (e) {
          console.error('Email failed', e);
          alert('Payment verified but email failed.');
        }

        // Refresh
        if (selectedEvent) {
          loadRegistrations(selectedEvent);
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        alert('Failed to verify payment');
      }
    }
  };

  const handleToggleAttendance = async (reg) => {
    const newValue = !reg.attended;
    // Optimistic UI update
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, attended: newValue } : r));
    
    try {
      const { error } = await db.updateEventRegistration(reg.id, { attended: newValue });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance');
      // Revert optimism
      setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, attended: !newValue } : r));
    }
  };

  const handleRejectPayment = async (reg) => {
    if (window.confirm(`Reject payment for ${reg.full_name}? This will mark it as REJECTED.`)) {
      try {
        await db.updateEventRegistration(reg.id, { payment_status: 'rejected' });
        
        await db.createRegistrationHistory({
          registration_id: reg.id,
          event_id: selectedEvent,
          full_name: reg.full_name,
          email: reg.email,
          phone: reg.phone,
          action_type: 'rejected_payment',
          amount: 0,
          previous_attendees: reg.attendees,
          updated_attendees: reg.attendees,
          payment_status: 'rejected',
          transaction_id: reg.transaction_id,
          payment_note: 'Rejected by Admin'
        });

        if (selectedEvent) loadRegistrations(selectedEvent);
      } catch (error) {
        console.error('Error rejecting:', error);
        alert('Failed to reject payment');
      }
    }
  };

  const handleApproveRefund = async (reg) => {
    if (window.confirm(`Approve refund of $${reg.refund_amount.toFixed(2)} for ${reg.refund_requested_attendees} attendees?`)) {
      try {
        const newAttendees = Math.max(0, (reg.attendees || 0) - (reg.refund_requested_attendees || 0));
        const newPaidAmount = Math.max(0, (reg.paid_amount || 0) - (reg.refund_amount || 0));
        const newExpectedAmount = Math.max(0, (reg.expected_amount || 0) - (reg.refund_amount || 0));
        
        const updates = {
          attendees: newAttendees,
          paid_amount: newPaidAmount,
          expected_amount: newExpectedAmount,
          refund_status: 'approved',
          payment_note: `${reg.payment_note || ''}\n[REFUND APPROVED] -${reg.refund_amount.toFixed(2)} for ${reg.refund_requested_attendees} spots. Reason: ${reg.refund_reason || 'N/A'}`,
          updated_at: new Date().toISOString()
        };

        const { error } = await db.updateEventRegistration(reg.id, updates);
        if (error) throw error;

        await db.createRegistrationHistory({
          registration_id: reg.id,
          event_id: selectedEvent,
          full_name: reg.full_name,
          email: reg.email,
          phone: reg.phone,
          action_type: 'refund_approved',
          amount: 0,
          refund_amount: reg.refund_amount,
          previous_attendees: reg.attendees,
          updated_attendees: newAttendees,
          payment_status: reg.payment_status,
          refund_status: 'approved',
          payment_note: reg.refund_reason,
          transaction_id: reg.transaction_id
        });

        alert('Refund approved successfully. Attendee count and revenue updated.');
        setRefundModalReg(null);
        if (selectedEvent) loadRegistrations(selectedEvent);
      } catch (error) {
        console.error('Error approving refund:', error);
        alert('Failed to approve refund');
      }
    }
  };

  const handleRejectRefund = async (reg) => {
    if (window.confirm(`Reject refund request for ${reg.full_name}?`)) {
      try {
        const updates = {
          refund_status: 'rejected',
          payment_note: `${reg.payment_note || ''}\n[REFUND REJECTED] Requested $${reg.refund_amount?.toFixed(2)} for ${reg.refund_requested_attendees} spots.`,
          updated_at: new Date().toISOString()
        };

        const { error } = await db.updateEventRegistration(reg.id, updates);
        if (error) throw error;

        await db.createRegistrationHistory({
          registration_id: reg.id,
          event_id: selectedEvent,
          full_name: reg.full_name,
          email: reg.email,
          phone: reg.phone,
          action_type: 'refund_rejected',
          amount: 0,
          refund_amount: 0,
          previous_attendees: reg.attendees,
          updated_attendees: reg.attendees,
          payment_status: reg.payment_status,
          refund_status: 'rejected',
          payment_note: 'Refund request was rejected by Admin.',
          transaction_id: reg.transaction_id
        });

        alert('Refund request rejected.');
        setRefundModalReg(null);
        if (selectedEvent) loadRegistrations(selectedEvent);
      } catch (error) {
        console.error('Error rejecting refund:', error);
        alert('Failed to reject refund');
      }
    }
  };

  const handleMarkPaid = async (reg) => {
    if (window.confirm(`Are you sure you want to mark ${reg.full_name} as basic Paid (Offline/Cash)?`)) {
      try {
        await db.markEventRegistrationPaid(reg.id, 'offline');
        
        await db.createRegistrationHistory({
          registration_id: reg.id,
          event_id: selectedEvent,
          full_name: reg.full_name,
          email: reg.email,
          phone: reg.phone,
          action_type: 'mark_paid_offline',
          amount: reg.paid_amount || 0,
          previous_attendees: reg.attendees,
          updated_attendees: reg.attendees,
          payment_status: 'paid',
          payment_method: 'offline',
          payment_note: 'Marked as paid (offline) by Admin'
        });

        // Refresh registrations
        if (selectedEvent) {
          loadRegistrations(selectedEvent);
        }
      } catch (error) {
        console.error('Error marking paid:', error);
        alert('Failed to update status');
      }
    }
  };

  const handleExportCSV = async () => {
    const isRefundView = viewMode === 'refunds';
    const filtered = isRefundView ? refundHistory : getFilteredRegistrations();
    
    if (!selectedEvent || (filtered.length === 0)) {
      alert('Please select an event with data to export');
      return;
    }

    try {
      setExporting(true);

      // Get event name for filename
      const eventName = events.find(e => e.id === selectedEvent)?.name || 'event';
      const cleanEventName = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      let filename;
      const typeLabel = isRefundView ? 'refunds' : 'revenue';
      if (dateRange.start || dateRange.end) {
        filename = `event-${typeLabel}-${cleanEventName}-${dateRange.start || 'start'}-to-${dateRange.end || 'end'}.csv`;
      } else {
        filename = `event-${typeLabel}-${cleanEventName}-all-data.csv`;
      }

      // Create CSV content
      let csvContent = '';
      if (isRefundView) {
        csvContent = `Name,Email,Phone,Original Attendees,Updated Attendees,Total Amount Paid,Refund Amount,Payment Method,Transaction ID,Reason,Status,Approved Date\n`;
      } else {
        csvContent = `Name,Email,${viewMode === 'registrations' ? 'Phone,Attendees,' : ''}Membership,Payment Method,Payment Status,${viewMode === 'revenue' ? 'Amount Paid,' : ''}${viewMode === 'registrations' ? 'Transaction ID,' : ''}Registration Date\n`;
      }

      const event = events.find(e => e.id === selectedEvent);

      filtered.forEach(item => {
        // Escape check
        const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
        let row = '';

        if (isRefundView) {
          const date = new Date(item.created_at).toLocaleDateString();
          const reg = registrations.find(r => r.id === item.registration_id);
          row = `${escape(item.full_name)},${escape(item.email)},${escape(item.phone)},${item.previous_attendees},${item.updated_attendees},${Number(reg?.paid_amount || 0).toFixed(2)},${Number(item.refund_amount).toFixed(2)},${escape(item.payment_method)},${escape(item.transaction_id)},${escape(item.payment_note)},Approved,${date}\n`;
        } else {
          const reg = item;
          let membershipFormatted = 'Non-Member';
          if (reg.is_member) {
            membershipFormatted = reg.membership_type ? reg.membership_type.charAt(0).toUpperCase() + reg.membership_type.slice(1) : 'Member';
          }

          const method = reg.payment_method || '-';
          const status = reg.payment_status || '-';
          const date = new Date(reg.registration_date).toLocaleDateString();

          row = `${escape(reg.full_name)},${escape(reg.email)},`;

          if (viewMode === 'registrations') {
            row += `${escape(reg.phone)},${reg.attendees || 1},`;
          }

          row += `${escape(membershipFormatted)},${escape(method)},${escape(status)},`;

          if (viewMode === 'revenue') {
            const amount = calculateRegistrationRevenue(reg, event);
            row += `${amount.toFixed(2)},`;
          }

          if (viewMode === 'registrations') {
            row += `${escape(reg.transaction_id)},`;
          }

          row += `${date}\n`;
        }
        csvContent += row;
      });

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // alert('Exported successfully!'); // Optional feedback
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="event-registrations">
      <motion.div
        className="registrations-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Event Registrations</h1>
        <p>View and manage event registrations</p>
      </motion.div>

      {error && (
        <div className="error-message" style={{ margin: '20px', padding: '15px', background: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
      )}

      {/* Top Control Bar */}
      <div className="registrations-controls" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
        <div className="control-row-main" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>

          <div className="event-selector" style={{ flex: '1 1 300px' }}>
            <label htmlFor="eventSelect">Select Event:</label>
            <select
              id="eventSelect"
              value={selectedEvent}
              onChange={handleEventChange}
              disabled={loading}
            >
              <option value="">-- Select an Event --</option>
              
              {events.filter(e => e.event_date && formatEventDateTime(e.event_date, e.event_time).dateObj >= new Date().setHours(0,0,0,0)).length > 0 && (
                <optgroup label="Upcoming Events">
                  {events
                    .filter(e => e.event_date && formatEventDateTime(e.event_date, e.event_time).dateObj >= new Date().setHours(0,0,0,0))
                    .map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name} ({eventRegistrationCounts[event.id] ?? 0} registered)
                      </option>
                    ))
                  }
                </optgroup>
              )}

              {events.filter(e => e.event_date && formatEventDateTime(e.event_date, e.event_time).dateObj < new Date().setHours(0,0,0,0)).length > 0 && (
                <optgroup label="Completed Events">
                  {events
                    .filter(e => e.event_date && formatEventDateTime(e.event_date, e.event_time).dateObj < new Date().setHours(0,0,0,0))
                    .map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name} ({eventRegistrationCounts[event.id] ?? 0} registered)
                      </option>
                    ))
                  }
                </optgroup>
              )}
            </select>
          </div>

          <div className="view-toggles" style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`view-mode-btn ${viewMode === 'registrations' ? 'active' : ''}`}
              onClick={(e) => {
                setViewMode('registrations');
                if (window.innerWidth <= 768) e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: viewMode === 'registrations' ? '2px solid #FF9933' : '1px solid #ddd',
                background: viewMode === 'registrations' ? '#fff5e6' : '#fff',
                color: viewMode === 'registrations' ? '#b35900' : '#333',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Registrations
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'revenue' ? 'active' : ''}`}
              onClick={(e) => {
                setViewMode('revenue');
                if (window.innerWidth <= 768) e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: viewMode === 'revenue' ? '2px solid #28a745' : '1px solid #ddd',
                background: viewMode === 'revenue' ? '#e6f4ea' : '#fff',
                color: viewMode === 'revenue' ? '#1e7e34' : '#333',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Revenue
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'refunds' ? 'active' : ''}`}
              onClick={(e) => {
                setViewMode('refunds');
                if (window.innerWidth <= 768) e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: viewMode === 'refunds' ? '2px solid #dc3545' : '1px solid #ddd',
                background: viewMode === 'refunds' ? '#fdecea' : '#fff',
                color: viewMode === 'refunds' ? '#b02a37' : '#333',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Refund Report
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'attended' ? 'active' : ''}`}
              onClick={(e) => {
                setViewMode('attended');
                if (window.innerWidth <= 768) e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: viewMode === 'attended' ? '2px solid #17a2b8' : '1px solid #ddd',
                background: viewMode === 'attended' ? '#e0f3f8' : '#fff',
                color: viewMode === 'attended' ? '#0c5460' : '#333',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Attended
            </button>

            <button
              className="export-button"
              onClick={handleExportCSV}
              disabled={exporting || !selectedEvent || getFilteredRegistrations().length === 0}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Filter Controls (Date) */}
        {selectedEvent && (
          <div className="filter-controls-container" style={{ width: '100%' }}>
            <div className="mobile-filter-header" onClick={() => setShowMobileFilters(!showMobileFilters)}>
              <span style={{ fontWeight: '600', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                Filter Options
              </span>
              <span style={{ transform: showMobileFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', fontSize: '12px' }}>▼</span>
            </div>

            <div className={`filter-content ${showMobileFilters ? 'show' : ''}`}>
              <div className="filter-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ margin: 0 }}>Date Range:</label>
                  {(dateRange.start || dateRange.end || datePreset !== 'total') && (
                    <button
                      className="clear-date-filter-btn"
                      onClick={() => handleDatePresetChange('total')}
                      style={{
                        fontSize: '0.85rem',
                        color: '#dc3545',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '5px'
                      }}
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div className="date-presets">
                  {['total', 'today', '24hours', '2days', '7days', '14days', 'custom'].map(preset => (
                    <button
                      key={preset}
                      className={`filter-btn ${datePreset === preset ? 'active' : ''}`}
                      onClick={() => handleDatePresetChange(preset)}
                    >
                      {preset === 'total' ? 'All Time' :
                        preset === 'today' ? 'Today' :
                          preset === '24hours' ? 'Last 24h' :
                            preset === 'custom' ? 'Custom' :
                              `Last ${preset.replace('days', '')} Days`}
                    </button>
                  ))}
                </div>
              </div>

              {datePreset === 'custom' && (
                <div className="custom-date-inputs">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics Dashboard */}
      {selectedEvent && registrations.length > 0 && (() => {
        const stats = getEventStatistics();
        return (
          <motion.div
            className={`event-stats-dashboard ${viewMode === 'revenue' ? 'revenue-mode' : ''}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {viewMode === 'revenue' ? (
              <>
                <div className="revenue-hero-card">
                  <div className="hero-icon">💰</div>
                  <div className="hero-label">Total Revenue</div>
                  <div className="hero-value">${stats.revenue.total.toFixed(2)}</div>
                </div>

                <div className="revenue-sub-grid" style={{ gridColumn: '1 / -1' }}>
                  <div className="revenue-sub-card">
                    <div className="sub-header">💳 Online Revenue</div>
                    <div className="sub-value">${stats.revenue.online.toFixed(2)}</div>
                    <div className="sub-details">
                      <span>Make up: Member: <strong>${stats.revenue.memberOnline.toFixed(2)}</strong></span>
                      <span>Non-Mem: <strong>${stats.revenue.nonMemberOnline.toFixed(2)}</strong></span>
                    </div>
                  </div>
                  <div className="revenue-sub-card">
                    <div className="sub-header">💵 Cash Revenue</div>
                    <div className="sub-value">${stats.revenue.offline.toFixed(2)}</div>
                    <div className="sub-details">
                      <span>Make up: Member: <strong>${stats.revenue.memberOffline.toFixed(2)}</strong></span>
                      <span>Non-Mem: <strong>${stats.revenue.nonMemberOffline.toFixed(2)}</strong></span>
                    </div>
                    <div className="method-breakdown-wrapper">
                      <div className="method-divider"></div>
                      <div className="method-badges-container">
                        <div className="method-badge zelle">
                          Zelle ${stats.revenue.zelle.amount.toFixed(2)} • {stats.revenue.zelle.count}
                        </div>
                        <div className="method-badge venmo">
                          Venmo ${stats.revenue.venmo.amount.toFixed(2)} • {stats.revenue.venmo.count}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="revenue-sub-card">
                    <div className="sub-header">⭐ Member Revenue</div>
                    <div className="sub-value">${stats.revenue.member.toFixed(2)}</div>
                    <div className="sub-details">
                      <span>From: Online: <strong>${stats.revenue.memberOnline.toFixed(2)}</strong></span>
                      <span>Cash: <strong>${stats.revenue.memberOffline.toFixed(2)}</strong></span>
                    </div>
                  </div>
                  <div className="revenue-sub-card">
                    <div className="sub-header">👤 Non-Member Revenue</div>
                    <div className="sub-value">${stats.revenue.nonMember.toFixed(2)}</div>
                    <div className="sub-details">
                      <span>From: Online: <strong>${stats.revenue.nonMemberOnline.toFixed(2)}</strong></span>
                      <span>Cash: <strong>${stats.revenue.nonMemberOffline.toFixed(2)}</strong></span>
                    </div>
                  </div>
                </div>
              </>
            ) : viewMode === 'refunds' ? (
              <>
                <div className="revenue-hero-card" style={{ boxShadow: '0 4px 20px rgba(220, 53, 69, 0.15)', border: '1px solid #f5c6cb', background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 100%)' }}>
                  <div className="hero-icon" style={{ background: '#f8d7da', color: '#721c24' }}>💸</div>
                  <div className="hero-label" style={{ color: '#721c24' }}>Total Refunded</div>
                  <div className="hero-value" style={{ color: '#721c24' }}>${getRefundStatistics().totalRefunded.toFixed(2)}</div>
                </div>

                <div className="revenue-sub-grid" style={{ gridColumn: '1 / -1' }}>
                  <div className="revenue-sub-card">
                    <div className="sub-header">📉 Approved Refunds</div>
                    <div className="sub-value">{getRefundStatistics().refundCount}</div>
                    <div className="sub-details">
                      <span>Records of finalized refunds</span>
                    </div>
                  </div>
                  <div className="revenue-sub-card">
                    <div className="sub-header">🏦 Net Revenue</div>
                    <div className="sub-value" style={{ color: '#28a745' }}>${getRefundStatistics().netRevenue.toFixed(2)}</div>
                    <div className="sub-details">
                      <span>Revenue after all refunds</span>
                    </div>
                  </div>
                  <div className="revenue-sub-card">
                    <div className="sub-header">💰 Original Revenue</div>
                    <div className="sub-value">${getRefundStatistics().originalRevenue.toFixed(2)}</div>
                    <div className="sub-details">
                      <span>Revenue before refunds</span>
                    </div>
                  </div>
                  <div className="revenue-sub-card">
                    <div className="sub-header">📊 Ratio</div>
                    <div className="sub-value" style={{ fontSize: '1.2rem', paddingTop: '10px' }}>
                      <span style={{ color: '#dc3545' }}>{((getRefundStatistics().totalRefunded / (getRefundStatistics().originalRevenue || 1)) * 100).toFixed(1)}%</span>
                      <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '5px' }}>Refund Rate</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Original Registration Stats
              <>
                <div className="stats-card">
                  <div className="stat-icon" style={{ background: '#FF9933' }}>📋</div>
                  <div className="stat-content">
                    <div className="stat-label">Registrations</div>
                    <div className="stat-value">{stats.totalRegistrations}</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="stat-icon" style={{ background: '#1A237E' }}>👥</div>
                  <div className="stat-content">
                    <div className="stat-label">Total Adults</div>
                    <div className="stat-value">{stats.totalAttendees}</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="stat-icon" style={{ background: '#6f42c1' }}>👶</div>
                  <div className="stat-content">
                    <div className="stat-label">Total Kids</div>
                    <div className="stat-value">{stats.totalKids}</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="stat-icon" style={{ background: '#28a745' }}>⭐</div>
                  <div className="stat-content">
                    <div className="stat-label">Members</div>
                    <div className="stat-value">{stats.memberCount}</div>
                    <div className="stat-subtext">{stats.memberAttendees} People</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="stat-icon" style={{ background: '#6c757d' }}>👤</div>
                  <div className="stat-content">
                    <div className="stat-label">Non-Members</div>
                    <div className="stat-value">{stats.nonMemberCount}</div>
                    <div className="stat-subtext">{stats.nonMemberAttendees} People</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="stat-icon" style={{ background: '#17a2b8' }}>✅</div>
                  <div className="stat-content">
                    <div className="stat-label">Payment Status</div>
                    <div className="stat-value">{stats.paidCount} Paid</div>
                    <div className="stat-subtext">{stats.pendingCount} Pending</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="stat-icon" style={{ background: '#007bff' }}>💳</div>
                  <div className="stat-content">
                    <div className="stat-label">Online Payments</div>
                    <div className="stat-value">{stats.onlineCount}</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="stat-icon" style={{ background: '#6f42c1' }}>💵</div>
                  <div className="stat-content">
                    <div className="stat-label">Offline Payments</div>
                    <div className="stat-value">{stats.offlineCount}</div>
                    <div className="method-breakdown-wrapper">
                      <div className="method-divider"></div>
                      <div className="method-badges-container">
                        <div className="method-badge zelle">
                          Zelle ${stats.revenue.zelle.amount.toFixed(2)} • {stats.revenue.zelle.count}
                        </div>
                        <div className="method-badge venmo">
                          Venmo ${stats.revenue.venmo.amount.toFixed(2)} • {stats.revenue.venmo.count}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        );
      })()}


      {loading ? (
        <div className="loading-state" style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 20px', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #FF9933', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p>Loading data...</p>
        </div>
      ) : (
        <motion.div
          className="registrations-table-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {registrations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
              <p>{selectedEvent ? 'No data found for this event' : 'Please select an event to view details'}</p>
            </div>
          ) : (
            <>
              {/* Revenue/Registration Filters */}
              {selectedEvent && (
                <div className="method-filters-container">
                  <span style={{ fontWeight: '600', marginRight: '10px' }}>Filter by:</span>
                  <div className="method-pills">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'online_member', label: 'Online Member' },
                      { key: 'online_non_member', label: 'Online Non-Member' },
                      { key: 'offline_member', label: 'Cash Member' },
                      { key: 'offline_non_member', label: 'Cash Non-Member' },
                      { key: 'pending_verification', label: 'Pending Verification' },
                    ].map(f => (
                      <button
                        key={f.key}
                        className={`method-pill ${methodFilter === f.key ? 'active' : ''}`}
                        onClick={() => setMethodFilter(f.key)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {methodFilter !== 'all' && (
                    <button className="reset-filters-btn" onClick={() => setMethodFilter('all')}>
                      Reset
                    </button>
                  )}
                </div>
              )}

              {/* Search Bar */}
              {selectedEvent && registrations.length > 0 && (
                <div className="search-bar-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
                    {viewMode === 'revenue' ? (
                      <>
                        <span style={{ color: '#28a745' }}>Revenue Details</span>
                      </>
                    ) : viewMode === 'refunds' ? (
                      <>
                        <span style={{ color: '#dc3545' }}>Refunded Transactions</span>
                      </>
                    ) : (
                      'Attendee List'
                    )}
                  </h2>
                  <div className="search-bar" style={{ margin: 0 }}>
                    <svg
                      className="search-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    {searchQuery && (
                      <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
                    )}
                  </div>
                </div>
              )}




              <table className="registrations-table">
                <thead>
                  {viewMode === 'refunds' ? (
                    <tr>
                      <th>Member Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Original Attendees</th>
                      <th>Updated Attendees</th>
                      <th>Total Amount Paid</th>
                      <th>Refund Amount</th>
                      <th>Method</th>
                      <th>Transaction ID</th>
                      <th>Refund Reason</th>
                      <th>Status</th>
                      <th>Approved Date</th>
                    </tr>
                  ) : (
                    <tr>
                      {(viewMode === 'registrations' || viewMode === 'attended') && <th>Attended</th>}
                      <th>Name</th>
                      <th>Email</th>
                      {(viewMode === 'registrations' || viewMode === 'attended') && <th>Phone</th>}
                      {(viewMode === 'registrations' || viewMode === 'attended') && <th>Adults</th>}
                      {(viewMode === 'registrations' || viewMode === 'attended') && <th>Kids</th>}
                      <th>Membership</th>
                      <th>Payment Method</th>
                      <th>Payment Status</th>
                      {viewMode === 'revenue' && <th>Amount Paid</th>}
                      {(viewMode === 'registrations' || viewMode === 'attended') && <th>Paid Amount</th>}
                      {(viewMode === 'registrations' || viewMode === 'attended') && <th>Payment Note</th>}
                      {(viewMode === 'registrations' || viewMode === 'attended') && <th>Transaction ID</th>}
                      <th>Date</th>
                      {(viewMode === 'registrations' || viewMode === 'attended') && <th>Actions</th>}
                    </tr>
                  )}
                </thead>
                <tbody>
                   {viewMode === 'refunds' ? (
                    // Refund Report Table
                    (() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const paginatedList = refundHistory.slice(startIndex, startIndex + itemsPerPage);

                      if (refundHistory.length === 0) {
                        return <tr><td colSpan="12" style={{ textAlign: 'center', color: '#666', padding: '40px' }}>No refunds records found for this event.</td></tr>;
                      }

                      return paginatedList.map(item => {
                        const reg = registrations.find(r => r.id === item.registration_id);

                        return (
                          <tr key={item.id}>
                            <td data-label="Member Name" style={{ fontWeight: 600 }}>{item.full_name}</td>
                            <td data-label="Email">{item.email}</td>
                            <td data-label="Phone">{item.phone}</td>
                            <td data-label="Original Attendees" style={{ textAlign: 'center' }}>{item.previous_attendees}</td>
                            <td data-label="Updated Attendees" style={{ textAlign: 'center', fontWeight: 600 }}>{item.updated_attendees}</td>
                            <td data-label="Total Amount Paid" style={{ fontWeight: 700, color: '#28a745' }}>
                              ${Number(reg?.paid_amount || 0).toFixed(2)}
                            </td>
                            <td data-label="Refund Amount" style={{ fontWeight: 700, color: '#dc3545' }}>
                              ${Number(item.refund_amount || 0).toFixed(2)}
                            </td>
                            <td data-label="Method">
                              <span className={`badge badge-${(item.payment_method || '').toLowerCase()}`}>
                                {item.payment_method}
                              </span>
                            </td>
                            <td data-label="Transaction ID">{item.transaction_id || '-'}</td>
                            <td data-label="Refund Reason" style={{ fontSize: '0.9em', fontStyle: 'italic', maxWidth: '200px' }} title={item.payment_note}>
                              {item.payment_note || 'N/A'}
                            </td>
                            <td data-label="Status">
                              <span className="badge badge-paid">Approved</span>
                            </td>
                            <td data-label="Approved Date">{new Date(item.created_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      });
                    })()
                  ) : (
                    // Existing Table Logic (Registrations & Revenue)
                    (() => {
                      const filtered = getFilteredRegistrations();
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const paginatedList = filtered.slice(startIndex, startIndex + itemsPerPage);

                      if (filtered.length === 0) {
                        return <tr><td colSpan={viewMode === 'registrations' ? 12 : 7} style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                          {searchQuery ? `No records found matching "${searchQuery}"` : 'No records for this filter'}
                        </td></tr>;
                      }

                      return paginatedList.map(reg => {
                        const eventObj = events.find(e => e.id === selectedEvent);
                        const amount = selectedEvent && viewMode === 'revenue'
                          ? calculateRegistrationRevenue(reg, eventObj)
                          : 0;

                      return (
                        <tr key={reg.id} style={{ background: reg.attended ? 'var(--bg-success, #e6f4ea)' : 'transparent' }}>
                          {(viewMode === 'registrations' || viewMode === 'attended') && (
                            <td data-label="Attended" style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={reg.attended || false} 
                                onChange={() => handleToggleAttendance(reg)} 
                                style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                              />
                            </td>
                          )}
                          <td data-label="Name" style={{ fontWeight: 600 }}>{reg.full_name}</td>
                          <td data-label="Email">{reg.email}</td>
                          {(viewMode === 'registrations' || viewMode === 'attended') && <td data-label="Phone">{reg.phone}</td>}
                          {(viewMode === 'registrations' || viewMode === 'attended') && <td data-label="Adults">{reg.attendees}</td>}
                          {(viewMode === 'registrations' || viewMode === 'attended') && <td data-label="Kids">{reg.kids_count || 0}</td>}
                          <td data-label="Membership">
                            <span className={`badge ${reg.is_member ? 'badge-member' : 'badge-non-member'}`}>
                              {reg.is_member ? (reg.membership_type ? reg.membership_type.charAt(0).toUpperCase() + reg.membership_type.slice(1) : 'Member') : 'Non-Member'}
                            </span>
                          </td>
                          <td data-label="Payment Method">
                            {reg.payment_method ? (
                              <span className={`badge badge-${(reg.payment_method || '').toLowerCase().split(' ')[0]}`}>
                                {reg.payment_method}
                              </span>
                            ) : '-'}
                          </td>
                          <td data-label="Status">
                            <span className={`badge badge-${reg.payment_status || 'pending'}`}>
                              {reg.payment_status || 'pending'}
                            </span>
                          </td>

                          {viewMode === 'revenue' && (
                            <td data-label="Amount Paid" style={{ fontWeight: 700, fontSize: '1.1em', color: amount > 0 ? '#155724' : '#999' }}>
                              ${amount.toFixed(2)}
                            </td>
                          )}

                          {(viewMode === 'registrations' || viewMode === 'attended') && (
                            <td data-label="Paid Amount" style={{ fontWeight: 600 }}>
                              {reg.paid_amount ? `$${Number(reg.paid_amount).toFixed(2)}` : '-'}
                            </td>
                          )}
                          {(viewMode === 'registrations' || viewMode === 'attended') && (
                            <td data-label="Note" style={{ fontSize: '0.9em', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={reg.payment_note}>
                              {reg.payment_note || '-'}
                            </td>
                          )}

                          {(viewMode === 'registrations' || viewMode === 'attended') && <td data-label="Trans ID">{reg.transaction_id || '-'}</td>}
                          <td data-label="Date">{new Date(reg.registration_date).toLocaleDateString()}</td>
                          {(viewMode === 'registrations' || viewMode === 'attended') && (
                            <td data-label="Actions">
                              {(reg.payment_status === 'pending_verification') ? (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <button onClick={() => handleVerifyPayment(reg)} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Verify</button>
                                  <button onClick={() => handleRejectPayment(reg)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                                  <button onClick={() => handleViewDetails(reg)} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Details</button>
                                </div>
                              ) : (
                                (reg.payment_status !== 'paid') ? (
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <button
                                      onClick={() => handleMarkPaid(reg)}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#17a2b8',
                                        color: '#fff',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                      title="Mark as Paid (Cash/Offline)"
                                    >
                                      Mark Paid
                                    </button>
                                    <button onClick={() => handleViewDetails(reg)} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginLeft: '5px' }}>Details</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ color: '#28a745', fontWeight: 600 }}>Paid</span>
                                    {reg.refund_status === 'pending' && (
                                      <button 
                                        onClick={() => setRefundModalReg(reg)}
                                        style={{ 
                                          background: '#ffc107', 
                                          color: '#000', 
                                          border: 'none', 
                                          padding: '5px 10px', 
                                          borderRadius: '4px', 
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          fontWeight: '700'
                                        }}
                                      >
                                        Refund Req
                                      </button>
                                    )}
                                    <button onClick={() => handleViewDetails(reg)} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Details</button>
                                  </div>
                                ))}
                            </td>
                          )}
                        </tr>
                      );
                      })
                    })()
                  )}

                </tbody>
              </table>

              {/* Pagination Controls */}
              {(() => {
                const filtered = viewMode === 'refunds' ? refundHistory : getFilteredRegistrations();
                const totalItems = filtered.length;
                if (totalItems === 0) return null;

                const totalPages = Math.ceil(totalItems / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;

                return (
                  <div className={`pagination-container ${viewMode === 'revenue' ? 'revenue-mode' : ''}`}>
                    <div className="pagination-info">
                      Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(endIndex, totalItems)} of {totalItems} records
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="page-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                          <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
                        </svg>
                        Previous
                      </button>

                      <div className="page-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              className={`page-num-btn ${currentPage === pageNum ? "active" : ""}`}
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        className="page-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                          <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                        </svg>
                      </button>
                    </div>

                    <div className="items-per-page">
                      <select
                        className="items-per-page-select"
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>
                  </div>
                );
              })()}

            </>
          )}
        </motion.div>
      )}
      {/* Refund Request Modal */}
      {refundModalReg && (
        <div className="refund-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="refund-modal" style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px', background: '#dc3545', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Refund Request</h2>
              <button 
                onClick={() => setRefundModalReg(null)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div><strong style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Member Name</strong>{refundModalReg.full_name}</div>
                <div><strong style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Email</strong>{refundModalReg.email}</div>
                <div><strong style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Phone</strong>{refundModalReg.phone}</div>
                <div><strong style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Payment Method</strong>{refundModalReg.payment_method}</div>
                <div><strong style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Transaction ID</strong>{refundModalReg.transaction_id || 'N/A'}</div>
              </div>
              <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#856404' }}>Requested Changes</h3>
                <p style={{ margin: '5px 0' }}><strong>Original Attendees:</strong> {refundModalReg.attendees}</p>
                <p style={{ margin: '5px 0' }}><strong>Spots to Cancel:</strong> <span style={{ color: '#dc3545', fontWeight: 'bold' }}>{refundModalReg.refund_requested_attendees}</span></p>
                <p style={{ margin: '5px 0' }}><strong>Updated Attendees:</strong> {Math.max(0, refundModalReg.attendees - (refundModalReg.refund_requested_attendees || 0))}</p>
                <p style={{ margin: '10px 0 5px 0', fontSize: '16px' }}><strong>Refund Amount:</strong> <span style={{ color: '#dc3545', fontWeight: 'bold' }}>${Number(refundModalReg.refund_amount || 0).toFixed(2)}</span></p>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase', marginBottom: '5px' }}>Reason provided:</strong>
                <p style={{ margin: 0, padding: '10px', background: '#f8f9fa', borderRadius: '4px', fontStyle: 'italic', borderLeft: '3px solid #ccc' }}>
                  {refundModalReg.refund_reason || 'No specific reason provided.'}
                </p>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                <button 
                  onClick={() => setRefundModalReg(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleRejectRefund(refundModalReg)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#6c757d', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Reject Refund
                </button>
                <button 
                  onClick={() => handleApproveRefund(refundModalReg)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#d39e00', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Approve Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Details & History Modal */}
      {detailModalReg && (
        <div className="refund-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="detail-modal" style={{
            background: 'white', borderRadius: '12px', width: '95%', maxWidth: '1000px',
            maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px', background: '#1a365d', color: 'white', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Registration Details & History</h2>
              <button onClick={() => setDetailModalReg(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'white' }}>×</button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <h3 style={{ fontSize: '16px', borderBottom: '2px solid #f1f3f5', paddingBottom: '10px', marginBottom: '15px' }}>Summary Information</h3>
              <div className="refund-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div className="detail-item"><label style={{ display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Full Name</label><p style={{ margin: '4px 0', fontWeight: '600', wordBreak: 'break-word' }}>{detailModalReg.full_name}</p></div>
                <div className="detail-item"><label style={{ display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Email</label><p style={{ margin: '4px 0', fontSize: '14px', wordBreak: 'break-all' }}>{detailModalReg.email}</p></div>
                <div className="detail-item"><label style={{ display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Phone</label><p style={{ margin: '4px 0', fontSize: '14px', wordBreak: 'break-word' }}>{detailModalReg.phone}</p></div>
                <div className="detail-item"><label style={{ display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Status</label>
                  <div style={{ marginTop: '5px' }}><span className={`badge badge-${detailModalReg.payment_status}`}>{detailModalReg.payment_status}</span></div>
                </div>
                <div className="detail-item"><label style={{ display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Adults</label><p style={{ margin: '4px 0', fontSize: '16px', fontWeight: '700' }}>{detailModalReg.attendees}</p></div>
                <div className="detail-item"><label style={{ display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Kids</label><p style={{ margin: '4px 0', fontSize: '16px', fontWeight: '700' }}>{detailModalReg.kids_count || 0}</p></div>
                <div className="detail-item"><label style={{ display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Amount Paid</label><p style={{ margin: '4px 0', fontSize: '16px', fontWeight: '700', color: '#28a745' }}>${Number(detailModalReg.paid_amount || 0).toFixed(2)}</p></div>
              </div>

              <h3 style={{ fontSize: '16px', borderBottom: '2px solid #f1f3f5', paddingBottom: '10px', marginBottom: '15px' }}>Transaction History</h3>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Loading history...</div>
              ) : (
                <div className="admin-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {regHistory.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No history records found.</p>
                  ) : (
                    regHistory.map((item) => (
                      <div key={item.id} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', border: '1px solid #edf2f7' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ 
                            background: '#1a365d', color: 'white', padding: '4px 8px', 
                            borderRadius: '4px', fontSize: '11px', fontWeight: '700', display: 'inline-block' 
                          }}>
                            {item.action_type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span style={{ fontSize: '12px', color: '#888', alignSelf: 'center' }}>{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', fontSize: '13px' }}>
                          <div><label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '3px' }}>AMOUNT</label>
                            <p style={{ margin: 0, fontWeight: '700', color: item.amount > 0 ? '#28a745' : (item.refund_amount > 0 ? '#dc3545' : 'inherit') }}>
                               {item.amount > 0 ? `+$${item.amount}` : (item.refund_amount > 0 ? `-$${item.refund_amount}` : '$0')}
                            </p>
                          </div>
                          <div><label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '3px' }}>SPOTS</label><p style={{ margin: 0 }}>{item.previous_attendees} → {item.updated_attendees}</p></div>
                          <div><label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '3px' }}>METHOD</label><p style={{ margin: 0 }}>{item.payment_method || '-'}</p></div>
                          <div style={{ wordBreak: 'break-all' }}><label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '3px' }}>TRANS ID</label><p style={{ margin: 0 }}>{item.transaction_id || '-'}</p></div>
                        </div>
                        {item.payment_note && (
                          <div style={{ marginTop: '12px', padding: '10px', background: 'white', borderLeft: '3px solid #FF9933', fontSize: '12px', wordBreak: 'break-word' }}>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>Note:</strong> {item.payment_note}
                          </div>
                        )}
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '12px', color: '#666' }}>
                          Status: <span style={{ fontWeight: 600 }}>{item.payment_status || item.refund_status || 'N/A'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '15px 20px', background: '#f8f9fa', borderTop: '1px solid #eee', textAlign: 'right' }}>
              <button onClick={() => setDetailModalReg(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', fontWeight: '600', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default EventRegistrations;

