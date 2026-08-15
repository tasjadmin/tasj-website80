import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { db } from "../../lib/supabase";
import { useSettings } from "../../contexts/SettingsContext";
import { useLocation, useNavigate } from "react-router-dom";
import { sendEmailForMemberRegistration } from "../../lib/emailService";
import "./MembershipRegistration.css";

const MembershipRegistration = ({ selectedPlan }) => {
  const { settings } = useSettings();
  const location = useLocation();
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const savedStep = localStorage.getItem("tasj_membership_reg_step");
      if (savedStep) return parseInt(savedStep, 10) || 1;
    } catch (e) { }
    return 1;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState(() => {
    try {
      const savedData = localStorage.getItem("tasj_membership_reg_data");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return { ...parsed };
      }
    } catch (e) { }

    return {
      personalDetails: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
      },
      membershipDetails: {
        membershipType: "student",
        familyMembers: [],
        emergencyContact: {
          name: "",
          phone: "",
          relationship: "",
        },
      },
      paymentMethod: "card", // card, zelle, venmo
      transactionRef: "",
      paidAmount: "",
      paymentNote: "",
      termsAccepted: false,
    };
  });

  const locationData = {
    "New Jersey": ["Marlton", "Evesham", "Cherry Hill", "Mount Laurel", "Moorestown", "Voorhees", "Medford", "Edison", "Princeton", "Jersey City", "Hamilton", "Lawrenceville", "Burlington", "Robbinsville"],
    "Pennsylvania": ["Philadelphia", "Bensalem", "Langhorne", "Levittown", "Yardley", "Morrisville", "Newtown", "Doylestown", "Upper Darby", "Media"],
    "Delaware": ["Wilmington", "Newark", "Dover", "Middletown"],
    "New York": ["New York City", "Brooklyn", "Queens", "Manhattan", "Staten Island", "Bronx", "Yonkers", "Albany"],
    "Texas": ["Austin", "Dallas", "Houston", "San Antonio", "Plano", "Irving"],
    "California": ["Los Angeles", "San Francisco", "San Jose", "San Diego", "Sunnyvale", "Fremont"],
    "Illinois": ["Chicago", "Naperville", "Aurora", "Schaumburg"],
    "Virginia": ["Ashburn", "Richmond", "Arlington", "Fairfax"],
    "Maryland": ["Baltimore", "Rockville", "Gaithersburg", "Columbia"],
  };

  useEffect(() => {
    localStorage.setItem("tasj_membership_reg_step", currentStep.toString());
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem("tasj_membership_reg_data", JSON.stringify(formData));
  }, [formData]);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const plan = params.get("plan");
    if (plan === "student" || plan === "yearly" || plan === "lifetime" || plan === "life_donor") {
      setFormData((prev) => ({
        ...prev,
        membershipDetails: {
          ...prev.membershipDetails,
          membershipType: plan,
        },
      }));
    }
  }, [location.search]);

  useEffect(() => {
    if (
      selectedPlan === "student" ||
      selectedPlan === "yearly" ||
      selectedPlan === "lifetime" ||
      selectedPlan === "life_donor"
    ) {
      setFormData((prev) => ({
        ...prev,
        membershipDetails: {
          ...prev.membershipDetails,
          membershipType: selectedPlan,
        },
      }));
    }
  }, [selectedPlan]);

  const steps = [
    { number: 1, title: "Personal Details", completed: currentStep > 1 },
    { number: 2, title: "Membership Details", completed: currentStep > 2 },
    { number: 3, title: "Review & Submit", completed: false },
  ];

  const handleInputChange = (section, field, value) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
      
      // Clear city if state changes
      if (section === "personalDetails" && field === "state") {
        newData.personalDetails.city = "";
      }
      
      return newData;
    });
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = (step) => {
    const errors = {};

    if (step === 1) {
      // Personal details validation
      if (!formData.personalDetails.firstName.trim()) {
        errors.firstName = "First name is required";
      }
      if (!formData.personalDetails.lastName.trim()) {
        errors.lastName = "Last name is required";
      }
      if (!formData.personalDetails.email.trim()) {
        errors.email = "Email is required";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalDetails.email)
      ) {
        errors.email = "Please enter a valid email address";
      }
      if (!formData.personalDetails.phone.trim()) {
        errors.phone = "Phone number is required";
      } else if (
        !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(
          formData.personalDetails.phone.replace(/\s/g, ""),
        )
      ) {
        errors.phone = "Please enter a valid phone number (e.g., 123-456-7890)";
      }
      if (!formData.personalDetails.address.trim()) {
        errors.address = "Address is required";
      }
      if (!formData.personalDetails.city.trim()) {
        errors.city = "City is required";
      }
      if (!formData.personalDetails.state.trim()) {
        errors.state = "State is required";
      }
      if (!formData.personalDetails.zipCode.trim()) {
        errors.zipCode = "ZIP code is required";
      } else if (!/^\d{5}(-\d{4})?$/.test(formData.personalDetails.zipCode)) {
        errors.zipCode =
          "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)";
      }
    } else if (step === 2) {
      // Membership details validation
      if (!formData.membershipDetails.emergencyContact.name.trim()) {
        errors.emergencyName = "Emergency contact name is required";
      }
      if (!formData.membershipDetails.emergencyContact.phone.trim()) {
        errors.emergencyPhone = "Emergency contact phone is required";
      } else if (
        !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(
          formData.membershipDetails.emergencyContact.phone.replace(/\s/g, ""),
        )
      ) {
        errors.emergencyPhone = "Please enter a valid phone number";
      }
      if (!formData.membershipDetails.emergencyContact.relationship) {
        errors.emergencyRelationship = "Relationship is required";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Prepare member data for Supabase
      const newMemberId = crypto.randomUUID();
      const memberData = {
        id: newMemberId,
        first_name: formData.personalDetails.firstName,
        last_name: formData.personalDetails.lastName,
        email: formData.personalDetails.email,
        phone: formData.personalDetails.phone,
        address: formData.personalDetails.address,
        city: formData.personalDetails.city,
        state: formData.personalDetails.state,
        zip_code: formData.personalDetails.zipCode,
        membership_type: formData.membershipDetails.membershipType,
        family_members: formData.membershipDetails.familyMembers,
        emergency_contact: formData.membershipDetails.emergencyContact,
        status: "pending",
        payment_status: "pending",
        payment_method: "none",
        transaction_id: null,
      };

      // Check if member already exists with this email (Duplicate Prevention)
      const { data: existingMember } = await db.getMemberByEmail(
        memberData.email,
      );
      let memberId;

      if (existingMember) {
        // Update existing member
        memberId = existingMember.id;
        console.log(
          `Member exists (${memberId}), updating record instead of creating new.`,
        );

        // We update the contact info and pending details.
        // NOTE: We do NOT change status to 'pending' if they are already 'active' unless we want to force re-approval?
        // User logic: "Reactivate the same member record... Update payment details".
        // Payment success will set it to 'active'. Here we just prepare the record.

        const updates = {
          first_name: memberData.first_name,
          last_name: memberData.last_name,
          phone: memberData.phone,
          address: memberData.address,
          city: memberData.city,
          state: memberData.state,
          zip_code: memberData.zip_code,
          // If they changed membership type, we update it
          membership_type: memberData.membership_type,
          family_members: memberData.family_members,
          emergency_contact: memberData.emergency_contact,
          updated_at: new Date().toISOString(),
          // Only reset payment status if they are not already verified/paid or if it's a new registration cycle
          // We keep their current status if they are just updating info
          payment_status: (existingMember.payment_status === 'paid' || existingMember.payment_status === 'pending_verification') 
              ? existingMember.payment_status 
              : "pending",
          payment_method: existingMember.payment_method || "none",
          transaction_id: existingMember.transaction_id || null,
        };

        const { error: updateError } = await db.updateMember(memberId, updates);
        if (updateError) throw updateError;
      } else {
        // Create new member
        const { error } = await db.createMember(memberData);
        if (error) {
          setSubmitError(error.message);
          setIsSubmitting(false);
          return;
        }
        memberId = newMemberId;
      }

      if (memberId) {
        // Calculate amount for payment reference
        const type = memberData.membership_type;
        const priceMap = {
          student: settings.membership?.studentPrice || 25,
          yearly: settings.membership?.yearlyPrice || 100,
          lifetime: settings.membership?.lifetimePrice || 500,
          life_donor: settings.membership?.lifeDonorPrice || 1000,
        };
        const amount = priceMap[type]; // in dollars
        // eslint-disable-next-line no-unused-vars
        const expectedNote = `MEM-${formData.personalDetails.firstName}-${formData.personalDetails.lastName}`;

        // Before committing the payment intent or offline upload, clear the localized data saves
        localStorage.removeItem("tasj_membership_reg_data");
        localStorage.removeItem("tasj_membership_reg_step");

        try {
          const paymentUrl =
            window.location.origin + "/membership-payment/" + memberId;

          const dateISO = new Date().toISOString(); // e.g., "2025-03-15T22:53:00.000Z"

          // Create a Date object from the ISO string
          const dateObj = new Date(dateISO);

          // Format the date using Intl.DateTimeFormat
          const formattedDate = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "long", // 'long' for full month name
            year: "numeric",
          }).format(dateObj);

          const emailParmas1 = {
            name: `${memberData.first_name} ${memberData.last_name}`,
            email: memberData.email,
            phone: memberData.phone,

            registration_type: "Membership Registration",

            plan_name:
              memberData.membership_type.charAt(0).toUpperCase() +
              memberData.membership_type.slice(1),
            event_name: "",

            amount: amount.toFixed(2),
            date: formattedDate,

            payment_link: paymentUrl,

            logo_url: process.env.REACT_APP_BASE_IMAGE_URL,
            organization_email: "info@tasj.org",
            organization_website: window.location.origin,
          };

          await sendEmailForMemberRegistration(emailParmas1);
          console.log("Membership confirmation email sent successfully");
        } catch (emailError) {
          console.error("Email error:", emailError);
        }

        // Confirm submission
        setSubmitSuccess({
          name: `${memberData.first_name} ${memberData.last_name}`,
          email: memberData.email,
          membershipType: memberData.membership_type,
          price: amount,
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      setSubmitError("An unexpected error occurred. Please try again.");
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRelationship = (relationship) => {
    const relationshipMap = {
      spouse: "Spouse",
      parent: "Parent",
      friend: "Friend",
      children: "Children",
      sibling: "Sibling",
      // Legacy support
      father: "Father",
      mother: "Mother",
      son: "Son",
      wife: "Wife",
      daughter: "Daughter",
      brother: "Brother",
      sister: "Sister",
    };
    return relationshipMap[relationship] || relationship;
  };

  // Show success message
  if (submitSuccess) {
    return (
      <section className="membership-registration-section" ref={ref}>
        <div className="container">
          <motion.div
            className="registration-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h2>Registration Successful!</h2>
              <p>
                Thank you for joining TASJ. Your membership application has been
                submitted and is pending approval.
              </p>
              <div className="success-summary">
                <p>
                  <strong>Name:</strong> {submitSuccess.name}
                </p>
                <p>
                  <strong>Email:</strong> {submitSuccess.email}
                </p>
                <p>
                  <strong>Selected Plan:</strong>{" "}
                  {submitSuccess.membershipType === "lifetime"
                    ? "Lifetime Membership"
                    : submitSuccess.membershipType === "life_donor"
                    ? "Life Donor Membership"
                    : submitSuccess.membershipType.charAt(0).toUpperCase() +
                      submitSuccess.membershipType.slice(1)}
                </p>
                <p>
                  <strong>Price:</strong>{" "}
                  {submitSuccess.membershipType === "lifetime" || submitSuccess.membershipType === "life_donor"
                    ? `$${submitSuccess.price} one-time`
                    : `$${submitSuccess.price} / year`}
                </p>
              </div>
              <p>
                A confirmation email has been sent to your registered email
                address. Please check your email and click the payment link to
                complete your membership.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSubmitSuccess(false);
                  setCurrentStep(1);
                  setFormData({
                    personalDetails: {
                      firstName: "",
                      lastName: "",
                      email: "",
                      phone: "",
                      address: "",
                      city: "",
                      state: "",
                      zipCode: "",
                    },
                    membershipDetails: {
                      membershipType: "student",
                      familyMembers: [],
                      emergencyContact: {
                        name: "",
                        phone: "",
                        relationship: "",
                      },
                    },
                    paymentMethod: "card",
                    transactionRef: "",
                    paidAmount: "",
                    paymentNote: "",
                    termsAccepted: false,
                  });
                }}
              >
                Submit Another Application
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="membership-registration-section"
      ref={ref}
      id="register"
    >
      <div className="container">
        <motion.div
          className="registration-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Membership Registration</h2>
          <p>Complete your registration to join the TASJ community</p>
        </motion.div>

        {submitError && <div className="error-message">{submitError}</div>}

        <motion.div
          className="registration-container"
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="progress-indicator">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`step ${currentStep === step.number ? "active" : ""} ${step.completed ? "completed" : ""}`}
              >
                <div className="step-number">
                  {step.completed ? "✓" : step.number}
                </div>
                <div className="step-title">{step.title}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="registration-form">
            {currentStep === 1 && (
              <div className="form-step">
                <h3>Personal Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.personalDetails.firstName}
                      onChange={(e) =>
                        handleInputChange(
                          "personalDetails",
                          "firstName",
                          e.target.value,
                        )
                      }
                      required
                      aria-invalid={!!validationErrors.firstName}
                    />
                    {validationErrors.firstName && (
                      <span className="field-error">
                        {validationErrors.firstName}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.personalDetails.lastName}
                      onChange={(e) =>
                        handleInputChange(
                          "personalDetails",
                          "lastName",
                          e.target.value,
                        )
                      }
                      required
                      aria-invalid={!!validationErrors.lastName}
                    />
                    {validationErrors.lastName && (
                      <span className="field-error">
                        {validationErrors.lastName}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      value={formData.personalDetails.email}
                      onChange={(e) =>
                        handleInputChange(
                          "personalDetails",
                          "email",
                          e.target.value,
                        )
                      }
                      required
                      aria-invalid={!!validationErrors.email}
                    />
                    {validationErrors.email && (
                      <span className="field-error">
                        {validationErrors.email}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.personalDetails.phone}
                      onChange={(e) =>
                        handleInputChange(
                          "personalDetails",
                          "phone",
                          e.target.value,
                        )
                      }
                      required
                      placeholder="123-456-7890"
                      aria-invalid={!!validationErrors.phone}
                    />
                    {validationErrors.phone && (
                      <span className="field-error">
                        {validationErrors.phone}
                      </span>
                    )}
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="address">Address *</label>
                    <input
                      type="text"
                      id="address"
                      value={formData.personalDetails.address}
                      onChange={(e) =>
                        handleInputChange(
                          "personalDetails",
                          "address",
                          e.target.value,
                        )
                      }
                      required
                      aria-invalid={!!validationErrors.address}
                    />
                    {validationErrors.address && (
                      <span className="field-error">
                        {validationErrors.address}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="city">City *</label>
                    {formData.personalDetails.state && locationData[formData.personalDetails.state] ? (
                      <select
                        id="city"
                        value={formData.personalDetails.city}
                        onChange={(e) =>
                          handleInputChange(
                            "personalDetails",
                            "city",
                            e.target.value,
                          )
                        }
                        required
                        aria-invalid={!!validationErrors.city}
                      >
                        <option value="">Select City</option>
                        {locationData[formData.personalDetails.state].sort().map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        id="city"
                        value={formData.personalDetails.city}
                        onChange={(e) =>
                          handleInputChange(
                            "personalDetails",
                            "city",
                            e.target.value,
                          )
                        }
                        required
                        aria-invalid={!!validationErrors.city}
                        placeholder={formData.personalDetails.state ? "Enter city" : "Select state first"}
                      />
                    )}
                    {validationErrors.city && (
                      <span className="field-error">
                        {validationErrors.city}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State *</label>
                    <select
                      id="state"
                      value={formData.personalDetails.state}
                      onChange={(e) =>
                        handleInputChange(
                          "personalDetails",
                          "state",
                          e.target.value,
                        )
                      }
                      required
                      aria-invalid={!!validationErrors.state}
                    >
                      <option value="">Select State</option>
                      {Object.keys(locationData).sort().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {validationErrors.state && (
                      <span className="field-error">
                        {validationErrors.state}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="zipCode">ZIP Code *</label>
                    <input
                      type="text"
                      id="zipCode"
                      value={formData.personalDetails.zipCode}
                      onChange={(e) =>
                        handleInputChange(
                          "personalDetails",
                          "zipCode",
                          e.target.value,
                        )
                      }
                      required
                      placeholder="12345 or 12345-6789"
                      aria-invalid={!!validationErrors.zipCode}
                    />
                    {validationErrors.zipCode && (
                      <span className="field-error">
                        {validationErrors.zipCode}
                      </span>
                    )}
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn btn-primary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="form-step">
                <h3>Membership Details</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="membershipType">Membership Type *</label>
                    <select
                      id="membershipType"
                      value={formData.membershipDetails.membershipType}
                      onChange={(e) =>
                        handleInputChange(
                          "membershipDetails",
                          "membershipType",
                          e.target.value,
                        )
                      }
                      required
                    >
                      <option value="student">{`Student ($${settings.membership?.studentPrice || 25}/year)`}</option>
                      <option value="yearly">{`Yearly ($${settings.membership?.yearlyPrice || 100}/year)`}</option>
                      <option value="lifetime">{`Lifetime ($${settings.membership?.lifetimePrice || 500} one-time)`}</option>
                      <option value="life_donor">{`Life Donor ($${settings.membership?.lifeDonorPrice || 1000} one-time)`}</option>
                    </select>
                    <div className="field-help">
                      {formData.membershipDetails.membershipType ===
                        "student" && (
                          <span>{`Current price: $${settings.membership?.studentPrice || 25} / year`}</span>
                        )}
                      {formData.membershipDetails.membershipType ===
                        "yearly" && (
                          <span>{`Current price: $${settings.membership?.yearlyPrice || 100} / year`}</span>
                        )}
                      {formData.membershipDetails.membershipType ===
                        "lifetime" && (
                          <span>{`Current price: $${settings.membership?.lifetimePrice || 500} one-time`}</span>
                        )}
                      {formData.membershipDetails.membershipType ===
                        "life_donor" && (
                          <span>{`Current price: $${settings.membership?.lifeDonorPrice || 1000} one-time`}</span>
                        )}
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="emergencyName">
                      Emergency Contact Name *
                    </label>
                    <input
                      type="text"
                      id="emergencyName"
                      value={formData.membershipDetails.emergencyContact.name}
                      onChange={(e) =>
                        handleInputChange(
                          "membershipDetails",
                          "emergencyContact",
                          {
                            ...formData.membershipDetails.emergencyContact,
                            name: e.target.value,
                          },
                        )
                      }
                      required
                      aria-invalid={!!validationErrors.emergencyName}
                    />
                    {validationErrors.emergencyName && (
                      <span className="field-error">
                        {validationErrors.emergencyName}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="emergencyPhone">
                      Emergency Contact Phone *
                    </label>
                    <input
                      type="tel"
                      id="emergencyPhone"
                      value={formData.membershipDetails.emergencyContact.phone}
                      onChange={(e) =>
                        handleInputChange(
                          "membershipDetails",
                          "emergencyContact",
                          {
                            ...formData.membershipDetails.emergencyContact,
                            phone: e.target.value,
                          },
                        )
                      }
                      required
                      placeholder="123-456-7890"
                      aria-invalid={!!validationErrors.emergencyPhone}
                    />
                    {validationErrors.emergencyPhone && (
                      <span className="field-error">
                        {validationErrors.emergencyPhone}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="emergencyRelationship">
                      Relationship *
                    </label>
                    <select
                      id="emergencyRelationship"
                      value={
                        formData.membershipDetails.emergencyContact.relationship
                      }
                      onChange={(e) =>
                        handleInputChange(
                          "membershipDetails",
                          "emergencyContact",
                          {
                            ...formData.membershipDetails.emergencyContact,
                            relationship: e.target.value,
                          },
                        )
                      }
                      required
                      aria-invalid={!!validationErrors.emergencyRelationship}
                    >
                      <option value="">Select Relationship</option>
                      <option value="spouse">Spouse</option>
                      <option value="parent">Parent</option>
                      <option value="friend">Friend</option>
                      <option value="children">Children</option>
                      <option value="sibling">Sibling</option>
                    </select>
                    {validationErrors.emergencyRelationship && (
                      <span className="field-error">
                        {validationErrors.emergencyRelationship}
                      </span>
                    )}
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn btn-outline"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn btn-primary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="form-step">
                <h3>Review Your Information</h3>
                <div className="review-section">
                  <h4>Personal Details</h4>
                  <p>
                    <strong>Name:</strong> {formData.personalDetails.firstName}{" "}
                    {formData.personalDetails.lastName}
                  </p>
                  <p>
                    <strong>Email:</strong> {formData.personalDetails.email}
                  </p>
                  <p>
                    <strong>Phone:</strong> {formData.personalDetails.phone}
                  </p>
                  <p>
                    <strong>Address:</strong> {formData.personalDetails.address}
                    , {formData.personalDetails.city},{" "}
                    {formData.personalDetails.state}{" "}
                    {formData.personalDetails.zipCode}
                  </p>

                  <h4>Membership Details</h4>
                  <p>
                    <strong>Membership Type:</strong>{" "}
                    {formData.membershipDetails.membershipType}
                  </p>
                  <p>
                    <strong>Emergency Contact:</strong>{" "}
                    {formData.membershipDetails.emergencyContact.name} (
                    {formatRelationship(
                      formData.membershipDetails.emergencyContact.relationship,
                    )}
                    ) - {formData.membershipDetails.emergencyContact.phone}
                  </p>
                </div>

                <div className="terms-section">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.termsAccepted}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          termsAccepted: e.target.checked,
                        }))
                      }
                      required
                    />
                    <span className="checkmark"></span>I agree to the Terms and
                    Conditions and Privacy Policy *
                  </label>
                </div>

                <div className="form-actions" style={{ marginTop: "30px" }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn btn-outline"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!formData.termsAccepted || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="loading-spinner"></div>
                        Registering...
                      </>
                    ) : (
                      "Register Membership"
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default MembershipRegistration;
