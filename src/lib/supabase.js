import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
console.log('Supabase URL:', supabaseUrl);
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
console.log('Supabase Anon Key:', supabaseAnonKey);

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables!\n' +
    'Please configure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY\n' +
    'See NETLIFY_SETUP.md for instructions'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Database table names
export const TABLES = {
  MEMBERS: 'members',
  EVENTS: 'events',
  PAYMENTS: 'payments',
  LEADERSHIP: 'leadership',
  ADMIN_USERS: 'admin_users',
  MEMBERSHIP_TYPES: 'membership_types',
  GALLERY: 'gallery',
  SPONSORS: 'sponsors',
  CONTACT_MESSAGES: 'contact_messages',
  EVENT_REGISTRATIONS: 'event_registrations',
  SITE_SETTINGS: 'site_settings',
  ANNOUNCEMENT_BANNERS: 'announcement_banners',
  REGISTRATION_HISTORY: 'registration_history'
}

// Auth helper functions
export const auth = {
  // Sign up new user
  async signUp(email, password, userData = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  // Sign in user
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    console.log(error);
    return { data, error }
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Check if user is admin
  async isAdmin() {
    const user = await this.getCurrentUser()
    if (!user) return false

    const { data, error } = await supabase
      .from(TABLES.ADMIN_USERS)
      .select('*')
      .eq('user_id', user.id)
      .single()

    return !error && data
  }
  ,
  async resetPassword(email, redirectTo) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { data, error }
  }
}

// Database helper functions
export const db = {
  // Members
  async getMembers() {
    const { data, error } = await supabase
      .from(TABLES.MEMBERS)
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getMembersLite() {
    const { data, error } = await supabase
      .from(TABLES.MEMBERS)
      .select('id, first_name, last_name, email, phone, membership_type, address, city, state, zip_code, emergency_contact, status, payment_status, payment_method, committee, role, created_at, expiry_date, membership_start_date, expected_amount, paid_amount, payment_note, payment_screenshot_url, transaction_id')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getMemberById(id) {
    const { data, error } = await supabase
      .rpc('get_member_by_id_public', { query_id: id })
      .single()
    return { data, error }
  },

  async createMember(memberData) {
    const { data, error } = await supabase
      .from(TABLES.MEMBERS)
      .insert([memberData])
    return { data, error }
  },

  async updateMember(id, updates) {
    const { data, error, count } = await supabase
      .from(TABLES.MEMBERS)
      .update(updates, { count: 'exact' })
      .eq('id', id)
      .select()
    return { data, error, count }
  },

  async updateMemberByEmail(email, updates) {
    const { data, error, count } = await supabase
      .from(TABLES.MEMBERS)
      .update(updates, { count: 'exact' })
      .eq('email', email)
      .select()
    return { data, error, count }
  },

  async deleteMember(id) {
    const { error } = await supabase
      .from(TABLES.MEMBERS)
      .delete()
      .eq('id', id)
    return { error }
  },

  async getMemberByEmail(email) {
    const { data, error } = await supabase
      .rpc('get_member_by_email_public', { query_email: email })
      .single()
    return { data, error }
  },

  // Verify membership by email
  async verifyMembershipByEmail(email) {
    if (!email || !email.trim()) {
      return { data: null, error: { message: 'Email is required' } }
    }

    const { data, error } = await supabase
      .rpc('verify_membership_public', { query_email: email })

    if (error) {
      return { data: { isMember: false, memberInfo: null }, error };
    }

    return { data: data || { isMember: false, memberInfo: null }, error: null };
  },

  // Events
  async getEvents() {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .select('*')
      .order('event_date', { ascending: true })
    return { data, error }
  },

  async getEventById(id) {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createEvent(eventData) {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .insert([eventData])
      .select()
    return { data, error }
  },

  async updateEvent(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deleteEvent(id) {
    const { error } = await supabase
      .from(TABLES.EVENTS)
      .delete()
      .eq('id', id)
    return { error }
  },

  // Leadership
  async getLeadership() {
    const { data, error } = await supabase
      .from(TABLES.LEADERSHIP)
      // Exclude profile_image_base64 to improve load times
      .select('id, first_name, last_name, email, phone, committee, role, member_id, bio, occupation, social, order_index')
      .order('order_index', { ascending: true })

    // If table is empty (migration lag), try fallback to members for now ?? 
    // Actually better to return empty than confusing data if we are switching tables.
    return { data, error }
  },

  async getPublicLeadership() {
    const { data, error } = await supabase
      .from(TABLES.LEADERSHIP)
      .select('*') // Select all including profile_image_base64
      .eq('status', 'active') // Only active leaders
      .order('order_index', { ascending: true })
    return { data, error }
  },

  async getLeadershipById(id) {
    const { data, error } = await supabase
      .from(TABLES.LEADERSHIP)
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createLeadership(leadershipData) {
    const { data, error } = await supabase
      .from(TABLES.LEADERSHIP)
      .insert([leadershipData])
      .select()
    return { data, error }
  },

  async updateLeadership(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.LEADERSHIP)
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deleteLeadership(id) {
    const { error } = await supabase
      .from(TABLES.LEADERSHIP)
      .delete()
      .eq('id', id)
    return { error }
  },

  // Contact Messages
  async createContactMessage(messageData) {
    const { data, error } = await supabase
      .from(TABLES.CONTACT_MESSAGES)
      .insert([messageData])
      .select()
    return { data, error }
  },

  // Gallery
  async getGalleryImages() {
    const { data, error } = await supabase
      .from(TABLES.GALLERY)
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getGalleryImagesByEvent(eventId) {
    const { data, error } = await supabase
      .from(TABLES.GALLERY)
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getGalleryImagesGroupedByEvent() {
    const { data, error } = await supabase
      .from(TABLES.GALLERY)
      .select(`
        *,
        events(name)
      `)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createGalleryImage(imageData) {
    const { data, error } = await supabase
      .from(TABLES.GALLERY)
      .insert([imageData])
      .select()
    return { data, error }
  },

  async updateGalleryImage(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.GALLERY)
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deleteGalleryImage(id) {
    const { error } = await supabase
      .from(TABLES.GALLERY)
      .delete()
      .eq('id', id)
    return { error }
  },

  // Sponsors
  async getSponsors() {
    const { data, error } = await supabase
      .from(TABLES.SPONSORS)
      .select('*')
      .order('order_index', { ascending: true })
    return { data, error }
  },

  // Event Registrations
  async createEventRegistration(registrationData) {
    const { data, error } = await supabase
      .from(TABLES.EVENT_REGISTRATIONS)
      .insert([registrationData])
      .select()
      .single()
    return { data, error }
  },

  async getEventRegistrations(eventId) {
    const { data, error } = await supabase
      .from(TABLES.EVENT_REGISTRATIONS)
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getEventRegistrationById(id) {
    const { data, error } = await supabase
      .from(TABLES.EVENT_REGISTRATIONS)
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async getEventRegistrationByEmail(email, eventId) {
    const { data, error } = await supabase
      .from(TABLES.EVENT_REGISTRATIONS)
      .select('*')
      .eq('email', email.trim())
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return { data, error }
  },

  async updateEventRegistration(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.EVENT_REGISTRATIONS)
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async createRegistrationHistory(historyData) {
    const { data, error } = await supabase
      .from(TABLES.REGISTRATION_HISTORY)
      .insert([historyData])
      .select()
    return { data, error }
  },

  async getRegistrationHistory(registrationId) {
    const { data, error } = await supabase
      .from(TABLES.REGISTRATION_HISTORY)
      .select('*')
      .eq('registration_id', registrationId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getEventRefundHistory(eventId) {
    const { data, error } = await supabase
      .from(TABLES.REGISTRATION_HISTORY)
      .select('*')
      .eq('event_id', eventId)
      .eq('action_type', 'refund_approved')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async markMembershipPaid(memberId, paymentMethod = 'online', transactionId = null, amount = null) {
    const { data, error } = await supabase
      .rpc('mark_membership_paid', {
        p_member_id: memberId,
        p_payment_method: paymentMethod,
        p_transaction_id: transactionId
      })

    if (error) {
      console.warn('RPC mark_membership_paid failed, using direct update fallback:', error);
      const updates = {
        payment_status: 'paid',
        status: 'active',
        payment_method: paymentMethod,
        updated_at: new Date().toISOString()
      };
      if (transactionId) updates.transaction_id = transactionId;
      if (amount) {
        updates.paid_amount = amount;
        updates.expected_amount = amount;
      }

      return await supabase.from(TABLES.MEMBERS).update(updates).eq('id', memberId).select();
    }
    
    // If RPC succeeded but we have an amount to update separately (if RPC doesn't handle it)
    if (amount) {
      await supabase.from(TABLES.MEMBERS).update({
        paid_amount: amount,
        expected_amount: amount
      }).eq('id', memberId);
    }
    
    return { data, error };
  },

  async markEventRegistrationPaid(regId, paymentMethod = 'online', transactionId = null) {
    const { data, error } = await supabase
      .rpc('mark_event_registration_paid', {
        p_reg_id: regId,
        p_payment_method: paymentMethod,
        p_transaction_id: transactionId
      })

    // Fallback to direct update if RPC fails (e.g. not migrated yet)
    if (error && (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('arguments'))) {
      console.warn('RPC mark_event_registration_paid issue, falling back to direct update');
      const updates = {
        payment_status: 'paid',
        payment_method: paymentMethod,
        updated_at: new Date().toISOString()
      };

      if (transactionId) {
        updates.transaction_id = transactionId;
      }

      return await supabase
        .from(TABLES.EVENT_REGISTRATIONS)
        .update(updates)
        .eq('id', regId)
        .select()
    }

    return { data, error }
  },

  async getPaymentsByEvent(referenceId) {
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .select('*')
      .eq('reference_id', referenceId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async updatePayment(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async getRegistrationsCount() {
    const { count, error } = await supabase
      .from(TABLES.EVENT_REGISTRATIONS)
      .select('id', { count: 'exact', head: true })
    return { count: count || 0, error }
  },

  async getRegistrationCountByEvent(eventId) {
    const { count, error } = await supabase
      .from(TABLES.EVENT_REGISTRATIONS)
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
    return { count: count || 0, error }
  },

  async getRecentRegistrations(limit = 1) {
    const { data, error } = await supabase
      .from(TABLES.EVENT_REGISTRATIONS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async updateEventAttendees(eventId, currentAttendees) {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .update({ current_attendees: currentAttendees })
      .eq('id', eventId)
      .select()
    return { data, error }
  },

  // Payments
  async createPayment(paymentData) {
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .insert([paymentData])
      .select()
    return { data, error }
  },

  // Site Settings
  async getSettings() {
    const { data, error } = await supabase
      .from(TABLES.SITE_SETTINGS)
      .select('*')
      .single()
    return { data, error }
  },

  async getMembershipTypeByName(typeName) {
    const { data, error } = await supabase
      .from(TABLES.MEMBERSHIP_TYPES)
      .select('*')
      .eq('name', typeName)
      .single()
    return { data, error }
  },

  async updateSettings(settings) {
    // First check if settings exist
    const { data: existing, error: checkError } = await supabase
      .from(TABLES.SITE_SETTINGS)
      .select('id')
      .limit(1)
      .maybeSingle()

    // Handle check errors
    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError }
    }

    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from(TABLES.SITE_SETTINGS)
        .update({
          ...settings,
          updatedAt: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      return { data, error }
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from(TABLES.SITE_SETTINGS)
        .insert([{
          ...settings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }])
        .select()
        .single()
      return { data, error }
    }
  },

  // Announcement Banners
  async getAnnouncementBanners(activeOnly = false) {
    let query = supabase.from(TABLES.ANNOUNCEMENT_BANNERS).select('*').order('created_at', { ascending: false });
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    return { data, error };
  },

  async createAnnouncementBanner(data) {
    const { data: result, error } = await supabase.from(TABLES.ANNOUNCEMENT_BANNERS).insert([data]).select();
    return { data: result, error };
  },

  async updateAnnouncementBanner(id, updates) {
    const { data, error } = await supabase.from(TABLES.ANNOUNCEMENT_BANNERS).update(updates).eq('id', id).select();
    return { data, error };
  },

  async deleteAnnouncementBanner(id) {
    const { error } = await supabase.from(TABLES.ANNOUNCEMENT_BANNERS).delete().eq('id', id);
    return { error };
  },

  /**
   * Global check for Transaction ID duplicate across multiple tables.
   * @param {string} transactionId - The ID to check
   * @param {string} excludeMemberId - Optional member ID to exclude (useful when editing existing record)
   * @param {string} excludeEventRegId - Optional event registration ID to exclude
   */
  async checkTransactionIdUniqueness(transactionId, excludeMemberId = null, excludeEventRegId = null) {
    if (!transactionId || !transactionId.trim()) return { isUnique: true };

    const cleanId = transactionId.trim();

    try {
      // 1. Check Members table
      let memberQuery = supabase
        .from(TABLES.MEMBERS)
        .select('id, first_name, last_name, email')
        .eq('transaction_id', cleanId);
      
      if (excludeMemberId) {
        memberQuery = memberQuery.neq('id', excludeMemberId);
      }

      const { data: memberMatches, error: memberError } = await memberQuery;
      if (memberError) throw memberError;
      if (memberMatches && memberMatches.length > 0) {
        return { 
          isUnique: false, 
          type: 'Membership', 
          match: memberMatches[0] 
        };
      }

      // 2. Check Event Registrations
      let eventQuery = supabase
        .from(TABLES.EVENT_REGISTRATIONS)
        .select('id, full_name, email')
        .eq('transaction_id', cleanId);
      
      if (excludeEventRegId) {
        eventQuery = eventQuery.neq('id', excludeEventRegId);
      }

      const { data: eventMatches, error: eventError } = await eventQuery;
      if (eventError) throw eventError;
      if (eventMatches && eventMatches.length > 0) {
        return { 
          isUnique: false, 
          type: 'Event Registration', 
          match: eventMatches[0] 
        };
      }

      // 3. Check Event Registration History (prevents reuse in "Add Addons" flows)
      // This enforces that the same transaction ID is not used twice for the SAME registration.
      let historyQuery = supabase
        .from(TABLES.REGISTRATION_HISTORY)
        .select('id, registration_id, transaction_id')
        .eq('transaction_id', cleanId)
        .not('transaction_id', 'is', null);

      if (excludeEventRegId) {
        historyQuery = historyQuery.neq('registration_id', excludeEventRegId);
      }

      const { data: historyMatches, error: historyError } = await historyQuery;
      if (historyError) throw historyError;
      if (historyMatches && historyMatches.length > 0) {
        return {
          isUnique: false,
          type: 'Event Registration History',
          match: historyMatches[0]
        };
      }

      return { isUnique: true };
    } catch (err) {
      console.error('Error checking transaction ID uniqueness:', err);
      return { isUnique: false, error: err.message || 'Verification Error' };
    }
  }
}

export default supabase
