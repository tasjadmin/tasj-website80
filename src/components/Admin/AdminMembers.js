import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { db } from "../../lib/supabase";
import { sendEmailForMemberShipPaymentConfirmation } from "../../lib/emailService";
import "./AdminMembers.css";
import ImageLightbox from "../ImageLightbox";

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewMember, setViewMember] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentRevenuePage, setCurrentRevenuePage] = useState(1);
  const [revenueItemsPerPage, setRevenueItemsPerPage] = useState(20);

  // Revenue View State
  const [showRevenueView, setShowRevenueView] = useState(false);
  const [revenueFilter, setRevenueFilter] = useState({
    plan: "all",
    method: "all",
    status: "all", // Default 'all' to show total revenue correctly, UI can default to something else if needed
    startDate: "",
    endDate: "",
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    membershipType: "student",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelationship: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const locationData = {
    "New Jersey": ["Marlton", "Evesham", "Cherry Hill", "Mount Laurel", "Moorestown", "Voorhees", "Medford", "Edison", "Princeton", "Jersey City", "Hamilton", "Lawrenceville", "Burlington", "Robbinsville"],
    "Pennsylvania": ["Philadelphia", "Bensalem", "Langhorne", "Levittown", "Yardley", "Morrisville", "Newtown", "Doylestown", "Upper Darby", "Media"],
    "Delaware": ["Wilmington", "Newark", "Dover", "Middletown"],
    "New York": ["New York City", "Brooklyn", "Queens", "Manhattan", "Staten Island", "Bronx", "Yonkers", "Albany"],
    "Texas": ["Austin", "Dallas", "Houston", "San Antonio", "Plano", "Irving"],
    "California": ["Los Angeles", "San Francisco", "San Jose", "San Diego", "Sunnyvale", "Fremont"],
    "Illinois": ["Chicago", "Naperville", "Aurora", "Schaumburg"],
    "Virginia": ["Ashburn", "Richmond", "Arlington", "Fairfax"],
    "Maryland": ["Baltimore", "Rockville", "Gaithersburg", "Columbia"]
  };

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await db.getMembersLite();
      if (error) {
        setError("Failed to load members");
        console.error("Error loading members:", error);
      } else {
        setMembers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error loading members:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (formData.membershipType === "lifetime" || formData.membershipType === "life_donor") {
      setFormData(prev => ({ ...prev, expiryDate: "" }));
    }
  }, [formData.membershipType]);

  const handleUpdateMember = async (id, updates) => {
    try {
      // If approving payment, also auto-approve general status if pending and set expiry
      let finalUpdates = { ...updates };
      if (updates.payment_status === "paid") {
        const member = members.find((m) => m.id === id);
        if (member) {
          finalUpdates.status = "active";
          finalUpdates.membership_start_date = new Date().toISOString();

          // Calculate Expiry
          const type = (member.membership_type || "student").toLowerCase();
          if (type.includes("life")) {
            finalUpdates.expiry_date = null; // No expiry for lifetime
          } else {
            // Default 1 year expiry for student, yearly, etc.
            const expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);
            finalUpdates.expiry_date = expiry.toISOString();
          }
        }



        // Send confirmation email
        try {
          const emailParams1 = {
            name: member.first_name + " " + member.last_name,
            email: member.email,
            registration_type: "Membership Registration",

            plan_name: member.membership_type,
            event_name: "",

            amount: member.paid_amount,

            transaction_id: member.transaction_id,
            payment_method: member.payment_method,
            payment_link: "",
            logo_url: process.env.REACT_APP_BASE_IMAGE_URL,
            organization_email: "info@tasj.org",
            organization_website: window.location.origin,
          };

          sendEmailForMemberShipPaymentConfirmation(emailParams1);
          alert("Member approved, expiry set, and email sent.");
        } catch (e) {
          console.error("Email failed", e);
          alert("Member approved but email failed.");
        }
      } else if (updates.payment_status === "rejected") {
        finalUpdates.status = "pending"; // Keep as pending/inactive if rejected
        // We keep payment_status as 'rejected'
      }

      const { error } = await db.updateMember(id, finalUpdates);
      if (error) {
        console.error("Update failed:", error);
        if (
          error.code === "PGRST204" ||
          error.message?.includes("column") ||
          error.code === "42703"
        ) {
          // 42703 is undefined_column
          alert(
            'SQL MIGRATION REQUIRED: The "payment_status" column is missing in your database.\n\nPlease go to Supabase SQL Editor and run the migration script provided.',
          );
        }
        setError("Failed to update member: " + error.message);
        return;
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...finalUpdates } : m)),
      );
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error updating member:", err);
    }
  };

  const handleDeleteMember = async (id) => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      try {
        const { error } = await db.deleteMember(id);
        if (error) {
          setError("Failed to delete member");
        } else {
          setMembers((prev) => prev.filter((m) => m.id !== id));
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error deleting member:", err);
      }
    }
  };

  const handleOpenViewModal = async (member) => {
    setViewMember(member);
    setIsViewOpen(true);
    try {
      const { data } = await db.getMemberById(member.id);
      if (data) {
        setViewMember(data);
      }
    } catch (e) { }
  };

  const handleCloseViewModal = () => {
    setIsViewOpen(false);
    setViewMember(null);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      membershipType: "student",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      purchaseDate: "",
      expiryDate: "",
      emergencyName: "",
      emergencyPhone: "",
      emergencyRelationship: "",
      transactionId: "",
    });
    setFormErrors({});
  };

  const handleOpenEditModal = async (member) => {
    let m = member;
    try {
      const { data } = await db.getMemberById(member.id);
      if (data) m = data;
    } catch (e) { }
    const fullName =
      m.first_name && m.last_name
        ? `${m.first_name} ${m.last_name}`
        : m.name || "";
    const ec = m.emergency_contact || {};
    setEditingMemberId(m.id);
    setFormData({
      fullName,
      email: m.email || "",
      phone: m.phone || "",
      membershipType: m.membership_type || "student",
      address: m.address || "",
      city: m.city || "",
      state: m.state || "",
      zipCode: m.zip_code || "",
      purchaseDate: m.membership_start_date
        ? new Date(m.membership_start_date).toISOString().split("T")[0]
        : "",
      expiryDate: m.expiry_date
        ? new Date(m.expiry_date).toISOString().split("T")[0]
        : "",
      emergencyName: ec.name || "",
      emergencyPhone: ec.phone || "",
      emergencyRelationship: ec.relationship || "",
      transactionId: m.transaction_id || "",
    });
    setFormErrors({});
    setIsModalOpen(true);
    setTimeout(() => {
      const el = document.getElementById("member-fullname");
      if (el) el.focus();
    }, 0);
  };

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = "Full name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!isValidEmail(formData.email.trim()))
      errors.email = "Please enter a valid email address";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "state") {
        newData.city = ""; // Reset city when state changes
      }
      return newData;
    });
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMemberId(null);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return; // Removed '!editingMemberId' check to allow creation
    setIsSubmitting(true);
    try {
      const parts = formData.fullName.trim().split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || parts[0] || "";
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: formData.email.trim(),
        phone: formData.phone || null,
        membership_type: formData.membershipType || "student",
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zipCode || null,
        membership_start_date: formData.purchaseDate || null,
        expiry_date: formData.expiryDate || null,
        emergency_contact: {
          name: formData.emergencyName || null,
          phone: formData.emergencyPhone || null,
          relationship: formData.emergencyRelationship || null,
        },
        transaction_id: formData.transactionId ? formData.transactionId.trim() : null,
      };

      // Global Transaction ID Uniqueness Check
      if (payload.transaction_id) {
        const { isUnique, type: duplicateType, error: checkError } = await db.checkTransactionIdUniqueness(payload.transaction_id, editingMemberId);
        if (checkError) {
          throw new Error('Verification failed. ' + (checkError || 'Unknown error'));
        }
        if (!isUnique) {
          setFormErrors(prev => ({ ...prev, transactionId: `This Transaction ID is already used in ${duplicateType}.` }));
          setIsSubmitting(false);
          return;
        }
      }

      if (editingMemberId) {
        // Update existing
        const { error } = await db.updateMember(editingMemberId, payload);
        if (error) {
          setFormErrors((prev) => ({
            ...prev,
            submit: error.message || "Failed to update member",
          }));
        } else {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === editingMemberId ? { ...m, ...payload } : m,
            ),
          );
          handleCloseModal();
          resetForm();
        }
      } else {
        // Create new
        // Set default status for manually added members? Let's say pending by default unless logic changes,
        // but usually manual add implies approval. Let's stick to database defaults (usually pending)
        // or we can explicitly set them if needed.
        // For now, let's just create.

        // Note: manual creation might need payment_status.
        // Let's assume 'pending' payment for now unless we add a checkbox.

        const newMemberId = crypto.randomUUID();
        const newMemberPayload = {
          ...payload,
          id: newMemberId,
          status: "active", // If admin adds, assume active? Or pending. Let's go with active for manual add convenience.
          payment_status: "paid", // Admin added = probably paid offline
          created_at: new Date().toISOString(),
        };

        const { error } = await db.createMember(newMemberPayload);

        if (error) {
          setFormErrors((prev) => ({
            ...prev,
            submit: error.message || "Failed to create member",
          }));
        } else {
          setMembers((prev) => [newMemberPayload, ...prev]);
          handleCloseModal();
          resetForm();
        }
      }
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: err.message || "Failed to save member",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show all members, don't filter out leadership anymore since they are separate now
  const applicationMembers = members;
  const filteredApplications = applicationMembers.filter((app) => {
    const name =
      app.first_name && app.last_name
        ? `${app.first_name} ${app.last_name}`
        : app.name || "";
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      name.toLowerCase().includes(q) ||
      (app.email || "").toLowerCase().includes(q) ||
      (app.phone || "").toLowerCase().includes(q) ||
      (app.membership_type || "").toLowerCase().includes(q) ||
      [app.address, app.city, app.state, app.zip_code]
        .filter(Boolean)
        .join(", ")
        .toLowerCase()
        .includes(q);

    let matchesStatus = true;
    if (statusFilter === "pending_verification") {
      matchesStatus = app.payment_status === "pending_verification";
    } else {
      matchesStatus =
        statusFilter === "all" || (app.status || "pending") === statusFilter;
    }

    const planValue = app.membership_type || "student";
    const matchesPlan = planFilter === "all" || planValue === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, planFilter, itemsPerPage]);

  // Pagination Logic
  const totalItems = filteredApplications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMembers = filteredApplications.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of table or container if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setCurrentRevenuePage(1);
  }, [revenueFilter, revenueItemsPerPage]);

  const handleRevenuePageChange = (pageNumber) => {
    setCurrentRevenuePage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportApplicationsCsv = () => {
    const base = applicationMembers;
    const exportList =
      statusFilter === "all"
        ? base
        : base.filter((m) => (m.status || "pending") === statusFilter);
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Membership Type",
      "Address",
      "Emergency Contact",
      "Status",
      "Created",
    ];
    const escape = (val) => {
      const s = val == null ? "" : String(val).replace(/"/g, '""');
      return '"' + s + '"';
    };
    const rows = exportList.map((m) => {
      const name =
        m.first_name && m.last_name
          ? `${m.first_name} ${m.last_name}`
          : m.name || "";
      const addr = [m.address, m.city, m.state, m.zip_code]
        .filter(Boolean)
        .join(", ");
      const emergency = m.emergency_contact
        ? `${m.emergency_contact.name || ""} (${m.emergency_contact.relationship || ""}) ${m.emergency_contact.phone || ""}`
        : "";
      const created = m.created_at
        ? new Date(m.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
        : "";
      return [
        name,
        m.email || "",
        m.phone || "",
        m.membership_type || "",
        addr,
        emergency,
        m.status || "pending",
        created,
      ]
        .map(escape)
        .join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const suffix = statusFilter;
    a.href = url;
    a.download = `members_${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getExpiryDisplay = (member) => {
    if (member.membership_type === "life" || member.membership_type === "lifetime" || member.membership_type === "life_donor")
      return (
        <span
          className="no-expiry"
          style={{ color: "#2b6cb0", fontWeight: "bold" }}
        >
          Lifetime
        </span>
      );
    if (!member.expiry_date) return <span style={{ color: "#999" }}>N/A</span>;
    return new Date(member.expiry_date).toLocaleDateString();
  };

  const isExpired = (member) => {
    if (member.membership_type === "life" || member.membership_type === "lifetime" || member.membership_type === "life_donor") return false;
    if (!member.expiry_date) return false;
    return new Date(member.expiry_date) < new Date();
  };

  // ---- REVENUE LOGIC ----

  const normalizePaymentMethod = (member) => {
    let method = (member.payment_method || "").toLowerCase();
    const note = (member.payment_note || "").toLowerCase();

    // Infer from note if method is vague
    if (!method || method === "offline" || method === "manual") {
      if (note.includes("zelle")) return "Zelle";
      if (note.includes("venmo")) return "Venmo";
      if (note.includes("cash") || note.includes("check")) return "Offline";
      return "Offline"; // Default fallback
    }

    if (
      method.includes("stripe") ||
      method.includes("card") ||
      method.includes("online")
    )
      return "Stripe";
    if (method.includes("zelle")) return "Zelle";
    if (method.includes("venmo")) return "Venmo";

    return "Offline";
  };

  const getRevenueMemberAmount = (member) => {
    // Source of truth: paid_amount if > 0
    if (member.paid_amount && Number(member.paid_amount) > 0)
      return Number(member.paid_amount);

    // Fallback: expected_amount
    if (member.expected_amount && Number(member.expected_amount) > 0)
      return Number(member.expected_amount);

    // Fallback: Infer from type (Hardcoded fallback if DB is empty on amounts)
    const type = (member.membership_type || "").toLowerCase();
    if (type === "student") return 25;
    if (type === "yearly") return 50;
    if (type === "lifetime" || type === "life") return 100;
    if (type === "life_donor") return 5000;

    return 0;
  };

  // Helper to get filtered list for Revenue View
  const getFilteredRevenueMembers = () => {
    return members.filter((m) => {
      // default view shows all time usually, but if dates are set:
      let dateMatch = true;
      // Use membership_start_date as payment date approximation or created_at
      const dateStr = m.membership_start_date || m.created_at;
      const payDate = dateStr ? new Date(dateStr) : null;

      if (revenueFilter.startDate && payDate) {
        const start = new Date(revenueFilter.startDate);
        if (payDate < start) dateMatch = false;
      }
      if (revenueFilter.endDate && payDate) {
        const end = new Date(revenueFilter.endDate);
        end.setHours(23, 59, 59, 999);
        if (payDate > end) dateMatch = false;
      }

      // Plan Filter
      const mType = (m.membership_type || "student").toLowerCase();
      const rPlan = revenueFilter.plan.toLowerCase();
      const planMatch =
        rPlan === "all" ||
        mType.includes(rPlan) ||
        (rPlan === "lifetime" && (mType === "life" || mType === "life_donor"));

      // Status Filter
      const pStatus = (m.payment_status || "pending").toLowerCase();
      let statusMatch = true;
      if (revenueFilter.status === "paid") statusMatch = pStatus === "paid";
      else if (revenueFilter.status === "pending")
        statusMatch = pStatus !== "paid" && pStatus !== "pending_verification";
      else if (revenueFilter.status === "pending_verification")
        statusMatch = pStatus === "pending_verification";

      // Method Filter
      let methodMatch = true;
      if (revenueFilter.method !== "all") {
        const normalizedMethod = normalizePaymentMethod(m).toLowerCase();
        if (revenueFilter.method === "stripe")
          methodMatch = normalizedMethod === "stripe";
        else if (revenueFilter.method === "venmo")
          methodMatch = normalizedMethod === "venmo";
        else if (revenueFilter.method === "zelle")
          methodMatch = normalizedMethod === "zelle";
        else if (revenueFilter.method === "offline")
          methodMatch = normalizedMethod === "offline";
      }

      return dateMatch && planMatch && statusMatch && methodMatch;
    });
  };

  const getRevenueStats = () => {
    // Calculate based on CURRENT FILTERS to show dynamic totals as requested
    const filtered = getFilteredRevenueMembers();

    const stats = {
      total: 0,
      online: 0,
      stripe: 0,
      venmo: 0,
      zelle: 0,
      offline: 0,
      pendingAmount: 0, // Amount for pending verification
    };

    filtered.forEach((m) => {
      const amount = getRevenueMemberAmount(m);
      const pStatus = (m.payment_status || "pending").toLowerCase();

      if (pStatus === "paid") {
        stats.total += amount;

        const method = normalizePaymentMethod(m);
        if (method === "Stripe") {
          stats.stripe += amount;
          stats.online += amount;
        } else if (method === "Venmo") {
          stats.venmo += amount;
        } else if (method === "Zelle") {
          stats.zelle += amount;
        } else {
          stats.offline += amount;
        }
      } else if (pStatus === "pending_verification") {
        stats.pendingAmount += amount;
      }
    });

    return stats;
  };

  const exportRevenueCsv = () => {
    const data = getFilteredRevenueMembers();
    const headers = [
      "Name",
      "Email",
      "Plan",
      "Payment Method",
      "Payment Status",
      "Paid Date",
      "Amount Paid",
      "Transaction ID",
    ];
    const escape = (val) => {
      const s = val == null ? "" : String(val).replace(/"/g, '""');
      return '"' + s + '"';
    };

    const rows = data.map((m) => {
      const name =
        m.first_name && m.last_name
          ? `${m.first_name} ${m.last_name}`
          : m.name || "";
      const date = m.membership_start_date
        ? new Date(m.membership_start_date).toLocaleDateString()
        : "";
      const amount = getRevenueMemberAmount(m);
      const method = normalizePaymentMethod(m);
      return [
        name,
        m.email || "",
        m.membership_type || "",
        method,
        m.payment_status || "pending",
        date,
        amount.toFixed(2),
        m.transaction_id || "",
      ]
        .map(escape)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `membership_revenue_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate Summary Stats from filtered list
  const summaryStats = {
    total: filteredApplications.length,
    active: filteredApplications.filter(
      (m) => (m.status || "pending").toLowerCase() === "active",
    ).length,
    pending: filteredApplications.filter(
      (m) => (m.status || "pending").toLowerCase() === "pending",
    ).length,
    expired: filteredApplications.filter((m) => isExpired(m)).length,
    student: filteredApplications.filter(
      (m) => (m.membership_type || "student").toLowerCase() === "student",
    ).length,
    yearly: filteredApplications.filter(
      (m) => (m.membership_type || "").toLowerCase() === "yearly",
    ).length,
    lifetime: filteredApplications.filter((m) =>
      (m.membership_type || "").toLowerCase() === "lifetime" || (m.membership_type || "").toLowerCase() === "life"
    ).length,
    lifeDonor: filteredApplications.filter((m) =>
      (m.membership_type || "").toLowerCase() === "life_donor"
    ).length,
  };

  return (
    <div className="admin-members">
      <motion.div
        className="members-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Members</h1>
        <p>Website membership applications and approved members</p>
        {/* Add Member Button - Matches Leadership style */}
        <button
          className="add-member-btn"
          onClick={() => handleOpenEditModal({})}
          style={{ marginTop: 16 }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
            style={{ marginRight: 6 }}
          >
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
          Add Member
        </button>
      </motion.div>

      {/* View Toggle */}

      <div className="members-control-bar revenue-control-bar">
        <div className="view-toggles revenue-view-toggles">
          <button
            className={`view-mode-btn ${!showRevenueView ? "active" : ""}`}
            onClick={() => setShowRevenueView(false)}
          >
            Members List
          </button>
          <button
            className={`view-mode-btn ${showRevenueView ? "active" : ""}`}
            onClick={() => setShowRevenueView(true)}
          >
            Revenue Report
          </button>
        </div>
      </div>

      {!showRevenueView ? (
        <motion.div
          className="members-table-container applications-table-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="table-controls">
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
              </svg>
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              className="mobile-filter-toggle"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M10,18H14V16H10V18M3,6V8H21V6H3M6,13H18V11H6V13Z" />
              </svg>
              Filters
            </button>

            <div
              className={`filter-groups ${showMobileFilters ? "show-mobile" : ""}`}
            >
              <div className="filter-group">
                <span className="filter-label">Plan:</span>
                <div className="filter-options">
                  <button
                    className={`filter-chip ${planFilter === "all" ? "active" : ""}`}
                    onClick={() => setPlanFilter("all")}
                  >
                    All
                  </button>
                  <button
                    className={`filter-chip ${planFilter === "student" ? "active" : ""}`}
                    onClick={() => setPlanFilter("student")}
                  >
                    Student
                  </button>
                  <button
                    className={`filter-chip ${planFilter === "yearly" ? "active" : ""}`}
                    onClick={() => setPlanFilter("yearly")}
                  >
                    Yearly
                  </button>
                  <button
                    className={`filter-chip ${planFilter === "lifetime" ? "active" : ""}`}
                    onClick={() => setPlanFilter("lifetime")}
                  >
                    Lifetime
                  </button>
                  <button
                    className={`filter-chip ${planFilter === "life_donor" ? "active" : ""}`}
                    onClick={() => setPlanFilter("life_donor")}
                  >
                    Life Donor
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Status:</span>
                <div className="filter-options">
                  <button
                    className={`filter-chip ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    All
                  </button>
                  <button
                    className={`filter-chip ${statusFilter === "active" ? "active" : ""}`}
                    onClick={() => setStatusFilter("active")}
                  >
                    Active
                  </button>
                  <button
                    className={`filter-chip ${statusFilter === "pending" ? "active" : ""}`}
                    onClick={() => setStatusFilter("pending")}
                  >
                    Pending
                  </button>
                  <button
                    className={`filter-chip ${statusFilter === "pending_verification" ? "active" : ""}`}
                    onClick={() => setStatusFilter("pending_verification")}
                  >
                    Pending Verification
                  </button>
                </div>
              </div>

              <button
                className="export-btn-small"
                onClick={exportApplicationsCsv}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Membership Summary Section */}
          <div className="membership-summary-section">
            <div className="summary-card total">
              <div className="summary-label">Total Members</div>
              <div className="summary-count">{summaryStats.total}</div>
            </div>
            <div className="summary-card active">
              <div className="summary-label">Active</div>
              <div className="summary-count">{summaryStats.active}</div>
            </div>
            <div className="summary-card pending">
              <div className="summary-label">Pending</div>
              <div className="summary-count">{summaryStats.pending}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Expired</div>
              <div className="summary-count">{summaryStats.expired}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Student</div>
              <div className="summary-count">{summaryStats.student}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Yearly</div>
              <div className="summary-count">{summaryStats.yearly}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Lifetime</div>
              <div className="summary-count">{summaryStats.lifetime}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Life Donor</div>
              <div className="summary-count">{summaryStats.lifeDonor}</div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
              </svg>
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading members...</p>
            </div>
          ) : (
            <div className="applications-table">
              <div className="applications-header-row">
                <div className="col-name">Member</div>
                <div className="col-email">Email</div>
                <div className="col-phone">Phone</div>
                <div className="col-type">Type</div>
                <div className="col-status">Status</div>
                <div className="col-payment">Payment</div>
                <div className="col-expiry">Expires</div>
                <div className="col-actions">Actions</div>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="no-members">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                  </svg>
                  <p>No matching members</p>
                </div>
              ) : (
                currentMembers.map((member) => {
                  const fullName =
                    member.first_name && member.last_name
                      ? `${member.first_name} ${member.last_name}`
                      : member.name || "Unknown";
                  // eslint-disable-next-line no-unused-vars
                  const addr = [
                    member.address,
                    member.city,
                    member.state,
                    member.zip_code,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  // eslint-disable-next-line no-unused-vars
                  const emergency = member.emergency_contact
                    ? `${member.emergency_contact.name || "N/A"} (${member.emergency_contact.relationship || "—"}) - ${member.emergency_contact.phone || "—"}`
                    : "—";
                  const statusValue = (
                    member.status || "pending"
                  ).toLowerCase();
                  const expired = isExpired(member);

                  return (
                    <div key={member.id} className="applications-row table-row">
                      {/* Name Column */}
                      <div className="col-name">
                        <div className="member-avatar">
                          {(fullName || "")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="name-details">
                          <span className="name-text">{fullName}</span>
                          {/* Mobile Only Details */}
                          <span className="mobile-only-detail email">
                            {member.email || "N/A"}
                          </span>
                          <div className="action-buttons-grid">
                            {member.payment_status ===
                              "pending_verification" ? (
                              <>
                                <button
                                  className="icon-btn success"
                                  title="Verify Payment"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        `Verify payment and Approve member ${member.first_name}?`,
                                      )
                                    )
                                      handleUpdateMember(member.id, {
                                        payment_status: "paid",
                                      });
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                  </svg>
                                </button>
                                <button
                                  className="icon-btn danger"
                                  title="Reject Payment"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        `Reject payment and member application for ${member.first_name}?`,
                                      )
                                    )
                                      handleUpdateMember(member.id, {
                                        payment_status: "rejected",
                                      });
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              member.payment_status !== "paid" && (
                                <button
                                  className="icon-btn success"
                                  title="Mark as Paid"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        `Mark payment as PAID for ${member.first_name || "this member"}?`,
                                      )
                                    )
                                      handleUpdateMember(member.id, {
                                        payment_status: "paid",
                                      });
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M5,20H19V22H5V20M19,12H15V6H9V12H5L12,19L19,12Z" />
                                  </svg>{" "}
                                  {/* Download/Paid icon metaphor? Or Check? Let's use check circle */}
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    style={{ display: "none" }}
                                  >
                                    <path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
                                  </svg>
                                </button>
                              )
                            )}

                            <button
                              className="icon-btn primary"
                              title="View Details"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenViewModal(member);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                              </svg>
                            </button>

                            <button
                              className="icon-btn secondary"
                              title="Edit Member"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(member);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                              </svg>
                            </button>

                            {/* Renewal */}
                            {(statusFilter === "inactive" ||
                              expired ||
                              statusValue !== "active") &&
                              member.payment_status === "paid" && (
                                <button
                                  className="icon-btn warning"
                                  title="Renew Membership"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        "Renew this membership for 1 year?",
                                      )
                                    ) {
                                      const nextYear = new Date();
                                      nextYear.setFullYear(
                                        nextYear.getFullYear() + 1,
                                      );
                                      handleUpdateMember(member.id, {
                                        status: "active",
                                        expiry_date: nextYear.toISOString(),
                                      });
                                    }
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
                                  </svg>
                                </button>
                              )}

                            {/* Status Actions */}
                            {statusFilter === "pending" ? (
                              <button
                                className="icon-btn success"
                                title="Activate"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateMember(member.id, {
                                    status: "active",
                                  });
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                className="icon-btn warning"
                                title="Suspend"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateMember(member.id, {
                                    status: "pending",
                                  });
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                                </svg>
                              </button>
                            )}

                            <button
                              className="icon-btn danger"
                              title="Delete Member"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMember(member.id);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Data Columns */}
                      <div className="col-email" title={member.email || ""}>
                        {member.email || "N/A"}
                      </div>
                      <div className="col-phone" title={member.phone || ""}>
                        {member.phone || "—"}
                      </div>

                      <div className="col-type">
                        <span
                          className={`type-badge ${(member.membership_type || "individual").toLowerCase().replace("_", "-")}`}
                        >
                          {member.membership_type
                            ? member.membership_type.charAt(0).toUpperCase() +
                            member.membership_type.slice(1)
                            : "Student"}
                        </span>
                      </div>

                      <div className="col-status">
                        <span
                          className={`status-badge ${expired ? "expired" : statusValue}`}
                          style={
                            expired
                              ? { background: "#fee2e2", color: "#ef4444" }
                              : {}
                          }
                        >
                          {expired
                            ? "Expired"
                            : statusValue.charAt(0).toUpperCase() +
                            statusValue.slice(1)}
                        </span>
                      </div>

                      <div className="col-payment">
                        <span
                          className={`status-badge ${(member.payment_status || "pending").toLowerCase() === "paid" ? "confirmed" : "off"}`}
                          style={{
                            background:
                              member.payment_status === "paid"
                                ? "#e6fffa"
                                : "#fff5f5",
                            color:
                              member.payment_status === "paid"
                                ? "#2c7a7b"
                                : "#c53030",
                            border: `1px solid ${member.payment_status === "paid" ? "#b2f5ea" : "#feb2b2"}`,
                          }}
                        >
                          {member.payment_status
                            ? member.payment_status.charAt(0).toUpperCase() +
                            member.payment_status.slice(1)
                            : "Pending"}
                        </span>
                      </div>

                      <div className="col-expiry">
                        {getExpiryDisplay(member)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filteredApplications.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(endIndex, totalItems)} of {totalItems} members
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
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="pagination-spacer">...</span>
                      <button
                        className={`page-num-btn ${currentPage === totalPages ? "active" : ""}`}
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
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
          )}
        </motion.div>
      ) : (
        <motion.div
          className="revenue-container"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="revenue-filters-bar">
            {/* Date Range */}
            <div className="revenue-filter-group">
              <input
                type="date"
                className="revenue-filter-input"
                value={revenueFilter.startDate}
                onChange={(e) =>
                  setRevenueFilter((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                className="revenue-filter-input"
                value={revenueFilter.endDate}
                onChange={(e) =>
                  setRevenueFilter((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
              {(revenueFilter.startDate || revenueFilter.endDate) && (
                <button
                  className="clear-date-btn"
                  onClick={() =>
                    setRevenueFilter((prev) => ({
                      ...prev,
                      startDate: "",
                      endDate: "",
                    }))
                  }
                >
                  Clear
                </button>
              )}
            </div>

            {/* Plan Filter */}
            <div className="revenue-filter-group">
              <label className="revenue-filter-label">Plan:</label>
              <select
                className="revenue-filter-select"
                value={revenueFilter.plan}
                onChange={(e) =>
                  setRevenueFilter((prev) => ({
                    ...prev,
                    plan: e.target.value,
                  }))
                }
              >
                <option value="all">All Plans</option>
                <option value="student">Student</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime</option>
                <option value="life_donor">Life Donor</option>
              </select>
            </div>

            {/* Method Filter */}
            <div className="revenue-filter-group">
              <label className="revenue-filter-label">Method:</label>
              <select
                className="revenue-filter-select"
                value={revenueFilter.method}
                onChange={(e) =>
                  setRevenueFilter((prev) => ({
                    ...prev,
                    method: e.target.value,
                  }))
                }
              >
                <option value="all">All Methods</option>
                <option value="stripe">Stripe (Online)</option>
                <option value="venmo">Venmo</option>
                <option value="zelle">Zelle</option>
                <option value="offline">Other Offline</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="revenue-filter-group">
              <label className="revenue-filter-label">Status:</label>
              <select
                className="revenue-filter-select"
                value={revenueFilter.status}
                onChange={(e) =>
                  setRevenueFilter((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid Only</option>
                <option value="pending">Pending</option>
                <option value="pending_verification">
                  Pending Verification
                </option>
              </select>
            </div>

            <button className="export-revenue-btn" onClick={exportRevenueCsv}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
              </svg>
              Export CSV
            </button>
          </div>

          {/* Revenue Summary Cards */}
          {(() => {
            const stats = getRevenueStats();
            return (
              <div className="revenue-dashboard-cards">
                <div className="revenue-card main-card">
                  <div className="icon">💰</div>
                  <div className="content">
                    <h3>Total Membership Revenue</h3>
                    <div className="value">
                      $
                      {stats.total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
                <div className="revenue-card">
                  <div className="icon">💳</div>
                  <div className="content">
                    <h3>Online Payments</h3>
                    <div className="value-sm">
                      $
                      {stats.online.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className="sub-text">
                      Stripe: $
                      {stats.stripe.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
                <div className="revenue-card">
                  <div className="icon">💵</div>
                  <div className="content">
                    <h3>Offline/Manual</h3>
                    <div className="value-sm">
                      $
                      {(
                        stats.venmo +
                        stats.zelle +
                        stats.offline
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="sub-text">
                      Venmo: ${stats.venmo} / Zelle: ${stats.zelle}
                    </div>
                  </div>
                </div>
                {stats.pendingAmount > 0 && (
                  <div className="revenue-card warning">
                    <div className="icon">⚠️</div>
                    <div className="content">
                      <h3>Pending Verification</h3>
                      <div className="value-sm text-warning">
                        $
                        {stats.pendingAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Revenue Detailed Table */}
          <div className="revenue-table-wrapper">
            <table className="revenue-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Paid Date</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredRevenueMembers().length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-cell">
                      No revenue records found for selected filters.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const revenueMembers = getFilteredRevenueMembers();
                    const revStartIndex = (currentRevenuePage - 1) * revenueItemsPerPage;
                    const revEndIndex = revStartIndex + revenueItemsPerPage;
                    const paginatedRevenue = revenueMembers.slice(revStartIndex, revEndIndex);

                    return (
                      <>
                        {paginatedRevenue.map((m) => {
                          const amount = getRevenueMemberAmount(m);
                          const method = normalizePaymentMethod(m);
                          const type = m.membership_type || "Unknown";
                          return (
                            <tr key={m.id}>
                              <td className="m-name">
                                {m.first_name} {m.last_name}
                              </td>
                              <td className="m-email">{m.email}</td>
                              <td>
                                <span className={`pill type-${type.toLowerCase()}`}>
                                  {type}
                                </span>
                              </td>
                              <td className="m-method">{method}</td>
                              <td>
                                <span
                                  className={`status-dot-text ${m.payment_status === "paid" ? "paid" : "pending"}`}
                                >
                                  <span className="dot"></span>
                                  {m.payment_status || "Pending"}
                                </span>
                              </td>
                              <td className="m-date">
                                {m.membership_start_date
                                  ? new Date(
                                    m.membership_start_date,
                                  ).toLocaleDateString()
                                  : "-"}
                              </td>
                              <td className="m-amount">${amount.toFixed(2)}</td>
                              <td>
                                <div className="action-row">
                                  {m.payment_screenshot_url && (
                                    <button
                                      onClick={() =>
                                        setLightboxImage(m.payment_screenshot_url)
                                      }
                                      className="btn-proof"
                                    >
                                      Proof
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEditModal(m)}
                                    className="btn-edit-sm"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Revenue Pagination Controls */}
          {(() => {
            const revenueMembers = getFilteredRevenueMembers();
            const totalRevItems = revenueMembers.length;
            if (totalRevItems === 0) return null;

            const totalRevPages = Math.ceil(totalRevItems / revenueItemsPerPage);
            const revStartIndex = (currentRevenuePage - 1) * revenueItemsPerPage;
            const revEndIndex = revStartIndex + revenueItemsPerPage;

            return (
              <div className="pagination-container revenue-pagination">
                <div className="pagination-info">
                  Showing {Math.min(revStartIndex + 1, totalRevItems)} to {Math.min(revEndIndex, totalRevItems)} of {totalRevItems} records
                </div>
                <div className="pagination-controls">
                  <button
                    className="page-btn"
                    onClick={() => handleRevenuePageChange(currentRevenuePage - 1)}
                    disabled={currentRevenuePage === 1}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
                    </svg>
                    Previous
                  </button>

                  <div className="page-numbers">
                    {Array.from({ length: Math.min(5, totalRevPages) }, (_, i) => {
                      let pageNum;
                      if (totalRevPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentRevenuePage <= 3) {
                        pageNum = i + 1;
                      } else if (currentRevenuePage >= totalRevPages - 2) {
                        pageNum = totalRevPages - 4 + i;
                      } else {
                        pageNum = currentRevenuePage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          className={`page-num-btn ${currentRevenuePage === pageNum ? "active" : ""}`}
                          onClick={() => handleRevenuePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="page-btn"
                    onClick={() => handleRevenuePageChange(currentRevenuePage + 1)}
                    disabled={currentRevenuePage === totalRevPages}
                  >
                    Next
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                    </svg>
                  </button>
                </div>

                <div className="items-per-page">
                  <select
                    value={revenueItemsPerPage}
                    onChange={(e) => setRevenueItemsPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <motion.div
            className="modal-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-member-title"
          >
            <button
              className="modal-close"
              aria-label="Close modal"
              onClick={handleCloseModal}
            >
              ×
            </button>
            <div className="modal-header">
              <h2 id="edit-member-title">Edit Member</h2>
              <p>Update membership application details</p>
            </div>
            <form className="modal-form" onSubmit={handleSubmitEdit} noValidate>
              {/* Personal Info Section */}
              <div className="form-section">
                <h3 className="form-section-title">Personal Information</h3>
                <div className="form-field">
                  <label htmlFor="member-fullname">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="member-fullname"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleFormChange}
                    aria-required="true"
                    aria-invalid={!!formErrors.fullName}
                    placeholder="e.g. John Doe"
                  />
                  {formErrors.fullName && (
                    <div className="field-error">{formErrors.fullName}</div>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="member-email">
                    Email <span className="req">*</span>
                  </label>
                  <input
                    id="member-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    aria-required="true"
                    aria-invalid={!!formErrors.email}
                    placeholder="john@example.com"
                  />
                  {formErrors.email && (
                    <div className="field-error">{formErrors.email}</div>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="member-phone">Phone</label>
                  <input
                    id="member-phone"
                    name="phone"
                    type="text"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Membership Section */}
              <div className="form-section">
                <h3 className="form-section-title">Membership Status</h3>
                <div className="form-field">
                  <label htmlFor="member-type">Plan Type</label>
                  <select
                    id="member-type"
                    name="membershipType"
                    value={formData.membershipType}
                    onChange={handleFormChange}
                  >
                    <option value="student">Student</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                    <option value="life_donor">Life Donor</option>
                  </select>
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="member-purchase-date">Purchase Date</label>
                    <input
                      id="member-purchase-date"
                      name="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="member-expiry-date">Expiry Date</label>
                    <input
                      id="member-expiry-date"
                      name="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={handleFormChange}
                      disabled={formData.membershipType === "lifetime" || formData.membershipType === "life_donor"}
                      className={(formData.membershipType === "lifetime" || formData.membershipType === "life_donor") ? "disabled-input" : ""}
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="form-section">
                <h3 className="form-section-title">Address</h3>
                <div className="form-field">
                  <label htmlFor="member-address">Street Address</label>
                  <input
                    id="member-address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleFormChange}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="member-state">State</label>
                    <select
                      id="member-state"
                      name="state"
                      value={formData.state}
                      onChange={handleFormChange}
                    >
                      <option value="">Select State</option>
                      {Object.keys(locationData).sort().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="member-city">City</label>
                    {formData.state && locationData[formData.state] ? (
                      <select
                        id="member-city"
                        name="city"
                        value={formData.city}
                        onChange={handleFormChange}
                      >
                        <option value="">Select City</option>
                        {locationData[formData.state].sort().map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <input
                        id="member-city"
                        name="city"
                        type="text"
                        value={formData.city}
                        onChange={handleFormChange}
                        placeholder={formData.state ? "Enter city" : "Select state first"}
                      />
                    )}
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="member-zip">Zip Code</label>
                  <input
                    id="member-zip"
                    name="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={handleFormChange}
                    style={{ maxWidth: "50%" }}
                  />
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="form-section">
                <h3 className="form-section-title">Emergency Contact</h3>
                <div className="form-field">
                  <label htmlFor="emergency-name">Contact Name</label>
                  <input
                    id="emergency-name"
                    name="emergencyName"
                    type="text"
                    value={formData.emergencyName}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="emergency-phone">Phone</label>
                    <input
                      id="emergency-phone"
                      name="emergencyPhone"
                      type="text"
                      value={formData.emergencyPhone}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="emergency-relationship">Relationship</label>
                    <select
                      id="emergency-relationship"
                      name="emergencyRelationship"
                      value={formData.emergencyRelationship}
                      onChange={handleFormChange}
                    >
                      <option value="">Select Relationship</option>
                      <option value="spouse">Spouse</option>
                      <option value="parent">Parent</option>
                      <option value="friend">Friend</option>
                      <option value="children">Children</option>
                      <option value="sibling">Sibling</option>
                      {formData.emergencyRelationship && 
                       !['spouse', 'parent', 'friend', 'children', 'sibling', ''].includes(formData.emergencyRelationship.toLowerCase()) && (
                        <option value={formData.emergencyRelationship}>{formData.emergencyRelationship}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Info Section */}
              <div className="form-section">
                <h3 className="form-section-title">Payment Information</h3>
                <div className="form-field">
                  <label htmlFor="member-transaction-id">Transaction ID (Manual Payment)</label>
                  <input
                    id="member-transaction-id"
                    name="transactionId"
                    type="text"
                    value={formData.transactionId}
                    onChange={handleFormChange}
                    placeholder="Reference Code"
                    aria-invalid={!!formErrors.transactionId}
                  />
                  {formErrors.transactionId && <div className="field-error">{formErrors.transactionId}</div>}
                </div>
              </div>

              {formErrors.submit && (
                <div className="form-submit-error" aria-live="polite">
                  <strong>Error:</strong> {formErrors.submit}
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-add"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {isViewOpen && viewMember && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseViewModal();
          }}
        >
          <motion.div
            className="modal-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-application-title"
          >
            <button
              className="modal-close"
              aria-label="Close modal"
              onClick={handleCloseViewModal}
            >
              ×
            </button>
            <div className="modal-header">
              <h2 id="view-application-title">Member Application Details</h2>
              <p>Full information</p>
            </div>
            <div className="modal-form">
              <div className="form-field">
                <label>Name</label>
                <div>
                  {viewMember.first_name && viewMember.last_name
                    ? `${viewMember.first_name} ${viewMember.last_name}`
                    : viewMember.name || "Unknown"}
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Email</label>
                  <div>{viewMember.email || "N/A"}</div>
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <div>{viewMember.phone || "—"}</div>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Membership Type</label>
                  <div>{viewMember.membership_type || "individual"}</div>
                </div>
                <div className="form-field">
                  <label>Status</label>
                  <div>{viewMember.status || "pending"}</div>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Purchase Date</label>
                  <div>
                    {viewMember.membership_start_date
                      ? new Date(
                        viewMember.membership_start_date,
                      ).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <div className="form-field">
                  <label>Expiry Date</label>
                  <div>
                    {viewMember.expiry_date
                      ? new Date(viewMember.expiry_date).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="form-field">
                <label>Address</label>
                <div>
                  {[
                    viewMember.address,
                    viewMember.city,
                    viewMember.state,
                    viewMember.zip_code,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
              </div>
              <div className="form-field">
                <label>Emergency Contact</label>
                <div>
                  {viewMember.emergency_contact
                    ? `${viewMember.emergency_contact.name || ""} (${viewMember.emergency_contact.relationship || ""}) ${viewMember.emergency_contact.phone || ""}`
                    : "—"}
                </div>
              </div>

              {/* Payment Details */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                }}
              >
                <h4 style={{ margin: "0 0 10px 0", fontSize: "1.1em" }}>
                  Payment Details
                </h4>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Payment Method</label>
                    <div>
                      {viewMember.payment_method
                        ? viewMember.payment_method.charAt(0).toUpperCase() +
                        viewMember.payment_method.slice(1)
                        : "—"}
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Payment Status</label>
                    <div>
                      {viewMember.payment_status
                        ? viewMember.payment_status.charAt(0).toUpperCase() +
                        viewMember.payment_status.slice(1)
                        : "Pending"}
                    </div>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Paid Amount</label>
                    <div>${Number(viewMember.paid_amount || 0).toFixed(2)}</div>
                  </div>
                  <div className="form-field">
                    <label>Expected Amount</label>
                    <div>
                      ${Number(viewMember.expected_amount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Transaction ID</label>
                    <div style={{ fontWeight: "600" }}>
                      {viewMember.transaction_id || "—"}
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Note/Memo</label>
                    <div>{viewMember.payment_note || "—"}</div>
                  </div>
                </div>
                {viewMember.payment_screenshot_url && (
                  <div className="form-field" style={{ marginTop: "10px" }}>
                    <label>Payment Proof</label>
                    <div>
                      <button
                        type="button"
                        className="btn-tap-to-view"
                        onClick={() =>
                          setLightboxImage(viewMember.payment_screenshot_url)
                        }
                      >
                        Tap to View Proof
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseViewModal}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage}
          altText="Payment Proof"
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default AdminMembers;
