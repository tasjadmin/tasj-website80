import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Remove unused db import
import './CreateLeadershipModal.css';

const CreateLeadershipModal = ({ isOpen, onClose, onSubmit, editingMember, members = [] }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        committee: '',
        role: '',
        bio: '',
        occupation: '',
        instagram: '',
        facebook: '',
        linkedin: '',
        email: '',
        phone: '',
        profileImage: null,
        profileImagePreview: '',
        member_id: null
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    // Searchable Dropdown State
    const [memberSearch, setMemberSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Filter eligible members
    const eligibleMembers = members.filter(m =>
        (m.status === 'active' || m.status === 'approved' || m.payment_status === 'paid')
    ).sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

    const filteredMembers = eligibleMembers.filter(m =>
        (m.first_name + ' ' + m.last_name).toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
    );

    const selectMember = (member) => {
        setFormData(prev => ({
            ...prev,
            member_id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email,
            phone: member.phone || prev.phone
        }));
        setMemberSearch(`${member.first_name} ${member.last_name}`);
        setShowDropdown(false);
        setErrors(prev => ({ ...prev, member_id: '', first_name: '', last_name: '', email: '' }));
    };

    /*
    const handleMemberSelect = (e) => {
        // Deprecated in favor of selectMember
    };
    */

    // Dynamic role options based on committee selection
    const getRoleOptions = () => {
        if (formData.committee === 'Board Members') {
            return [];
        }
        if (formData.committee === 'Executive Committee') {
            return [
                'President', 
                'Vice President', 
                'Elected President', 
                'Secretary', 
                'Joint Secretary', 
                'Treasurer', 
                'Joint Treasurer'
            ];
        }
        return ['Chair', 'Co-Chair', 'Member'];
    };

    useEffect(() => {
        if (isOpen) {
            if (editingMember) {
                // Pre-fill form
                const social = editingMember.social || {};

                setFormData({
                    first_name: editingMember.first_name || '',
                    last_name: editingMember.last_name || '',
                    committee: editingMember.committee === 'Education Committee' ? 'IT Committee' : (editingMember.committee || ''),
                    role: editingMember.role || '',
                    bio: editingMember.bio || '',
                    occupation: editingMember.occupation || '',
                    instagram: social.instagram || '',
                    facebook: social.facebook || '',
                    linkedin: social.linkedin || '',
                    email: editingMember.email || '',
                    phone: editingMember.phone || '',
                    profileImage: null,
                    profileImagePreview: editingMember.profile_image_base64 || '',
                    member_id: editingMember.member_id || null
                });
                setMemberSearch(`${editingMember.first_name} ${editingMember.last_name}`);
            } else {
                // Reset form
                setFormData({
                    first_name: '',
                    last_name: '',
                    committee: '',
                    role: '',
                    bio: '',
                    occupation: '',
                    instagram: '',
                    facebook: '',
                    linkedin: '',
                    email: '',
                    phone: '',
                    profileImage: null,
                    profileImagePreview: '',
                    member_id: null
                });
                setMemberSearch('');
            }

            setErrors({});
        }
    }, [isOpen, editingMember]);

    const handleChange = (field, value) => {
        // If committee changes, reset role
        if (field === 'committee') {
            setFormData(prev => ({ ...prev, [field]: value, role: '' }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }

        // Clear error
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, profileImage: 'File too large. Max 10 MB.' }));
            return;
        }

        const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.type)) {
            setErrors(prev => ({ ...prev, profileImage: 'Only JPG, JPEG, or PNG allowed' }));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setFormData(prev => ({ ...prev, profileImage: file, profileImagePreview: String(reader.result) }));
            setErrors(prev => ({ ...prev, profileImage: '' }));
        };
        reader.readAsDataURL(file);
    };

    const validateForm = () => {
        const newErrors = {};
        // Only require member selection for new leaders, not when editing
        if (!editingMember?.id && !formData.member_id) {
            newErrors.member_id = 'Please select a member';
        }
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.committee) newErrors.committee = 'Committee is required';
        if (formData.committee !== 'Board Members' && !formData.role) newErrors.role = 'Role is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) newErrors.email = 'Enter a valid email address';

        const isValidUrl = (url) => {
            try { return Boolean(new URL(url)); } catch (e) { return false; }
        };

        if (formData.instagram && !isValidUrl(formData.instagram)) newErrors.instagram = 'Enter a valid URL';
        if (formData.facebook && !isValidUrl(formData.facebook)) newErrors.facebook = 'Enter a valid URL';
        if (formData.linkedin && !isValidUrl(formData.linkedin)) newErrors.linkedin = 'Enter a valid URL';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            const firstErrorField = Object.keys(errors)[0];
            const el = document.querySelector(`[name="${firstErrorField}"]`);
            if (el) el.focus();
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData, editingMember?.id);
            onClose();
        } catch (err) {
            console.error(err);
            setErrors(prev => ({ ...prev, submit: err.message || 'Failed to save leadership member' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="modal-container member-modal"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <div>
                            <h2>{editingMember ? 'Edit Leader' : 'Add Leader'}</h2>
                            <p className="modal-subtitle">Manage leadership team details and roles</p>
                        </div>
                        <button className="close-button" onClick={onClose}>
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="modal-form">
                        <h3 className="form-section-title full-width">Personal Information</h3>

                        <div className="form-group full-width">
                            <label htmlFor="memberSelect">Select Member <span className="required">*</span> (Must have active membership)</label>
                            <div className="searchable-select-wrapper">
                                <div className="input-group-with-icon">
                                    <input
                                        type="text"
                                        id="memberSelect"
                                        value={memberSearch}
                                        onChange={(e) => {
                                            setMemberSearch(e.target.value);
                                            setShowDropdown(true);
                                            setFormData(p => ({ ...p, member_id: null }));
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        placeholder="Type to search member..."
                                        className={errors.member_id ? 'error' : ''}
                                        disabled={!!editingMember?.id}
                                    />
                                    <div className="input-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </div>
                                </div>
                                {showDropdown && !editingMember?.id && (
                                    <div className="search-results-dropdown">
                                        {filteredMembers.length > 0 ? (
                                            filteredMembers.map(m => (
                                                <div
                                                    key={m.id}
                                                    className={`search-result-item ${formData.member_id === m.id ? 'selected' : ''}`}
                                                    onClick={() => selectMember(m)}
                                                >
                                                    <span className="item-main">{m.first_name} {m.last_name}</span>
                                                    <span className="item-sub">{m.membership_type} • {m.email}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-results">No active members found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {errors.member_id && <span className="error-message">{errors.member_id}</span>}
                            {editingMember?.id && <div className="field-note">Member selection cannot be changed for existing leaders.</div>}

                            {/* Overlay to close dropdown on click outside - basic implementation */}
                            {showDropdown && (
                                <div
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                                    onClick={() => setShowDropdown(false)}
                                ></div>
                            )}
                        </div>

                        {/* Hidden fields for validation continuity if needed, or just relied on state */}
                        <div className="form-grid-2">
                            {/* Read-only name display for confirmation */}
                            <div className="form-group">
                                <label>First Name</label>
                                <input type="text" value={formData.first_name} disabled className="readonly-input" />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input type="text" value={formData.last_name} disabled className="readonly-input" />
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label htmlFor="email">Email <span className="required">*</span></label>
                                <div className="input-group-with-icon">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        readOnly={true}
                                        disabled={true}
                                        placeholder="Auto-filled"
                                        className={`readonly-input ${errors.email ? 'error' : ''}`}
                                    />
                                    <div className="input-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    </div>
                                </div>
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone</label>
                                <div className="input-group-with-icon">
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => handleChange('phone', e.target.value)}
                                        placeholder="Phone"
                                    />
                                    <div className="input-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="occupation">Occupation</label>
                            <input
                                id="occupation"
                                name="occupation"
                                type="text"
                                value={formData.occupation}
                                onChange={e => handleChange('occupation', e.target.value)}
                                placeholder="e.g. Software Engineer"
                            />
                        </div>

                        <h3 className="form-section-title full-width">Role & Committee</h3>

                        <div className="form-group">
                            <label htmlFor="committee">Committee <span className="required">*</span></label>
                            <select
                                id="committee"
                                name="committee"
                                value={formData.committee}
                                onChange={e => handleChange('committee', e.target.value)}
                                className={errors.committee ? 'error' : ''}
                            >
                                <option value="">Select Committee</option>
                                <option>Board Members</option>
                                <option>Executive Committee</option>
                                <option>Event Committee</option>
                                <option>Registration and Membership Committee</option>
                                <option>Food Committee</option>
                                <option>IT Committee</option>
                                <option>Cultural Committee</option>
                                <option>Sports Committee</option>
                                <option>Volunteer Team</option>
                            </select>
                            {errors.committee && <span className="error-message">{errors.committee}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="role">Role <span className="required">*</span></label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={e => handleChange('role', e.target.value)}
                                className={errors.role ? 'error' : ''}
                                disabled={!formData.committee || formData.committee === 'Board Members'}
                            >
                                <option value="">{formData.committee === 'Board Members' ? 'No Role Required' : 'Select Role'}</option>
                                {getRoleOptions().map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            {errors.role && <span className="error-message">{errors.role}</span>}
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="bio">Bio / Message</label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={e => handleChange('bio', e.target.value)}
                                placeholder="Brief bio or message..."
                                maxLength={300}
                            />
                            <div className="character-count">{formData.bio.length} / 300</div>
                        </div>

                        <h3 className="form-section-title full-width">Social & Profile</h3>

                        <div className="form-group">
                            <label>Instagram URL</label>
                            <div className="input-group-with-icon">
                                <input
                                    type="url"
                                    name="instagram"
                                    value={formData.instagram}
                                    onChange={e => handleChange('instagram', e.target.value)}
                                    placeholder="https://instagram.com/..."
                                    className={errors.instagram ? 'error' : ''}
                                />
                                <div className="input-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                </div>
                            </div>
                            {errors.instagram && <span className="error-message">{errors.instagram}</span>}
                        </div>

                        <div className="form-group">
                            <label>Facebook URL</label>
                            <div className="input-group-with-icon">
                                <input
                                    type="url"
                                    name="facebook"
                                    value={formData.facebook}
                                    onChange={e => handleChange('facebook', e.target.value)}
                                    placeholder="https://facebook.com/..."
                                    className={errors.facebook ? 'error' : ''}
                                />
                                <div className="input-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                                </div>
                            </div>
                            {errors.facebook && <span className="error-message">{errors.facebook}</span>}
                        </div>

                        <div className="form-group">
                            <label>LinkedIn URL</label>
                            <div className="input-group-with-icon">
                                <input
                                    type="url"
                                    name="linkedin"
                                    value={formData.linkedin}
                                    onChange={e => handleChange('linkedin', e.target.value)}
                                    placeholder="https://linkedin.com/in/..."
                                    className={errors.linkedin ? 'error' : ''}
                                />
                                <div className="input-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                </div>
                            </div>
                            {errors.linkedin && <span className="error-message">{errors.linkedin}</span>}
                        </div>

                        <div className="form-group full-width">
                            <label>Profile Image</label>
                            <div
                                className={`file-drop ${isDragOver ? 'drag-over' : ''}`}
                                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={e => {
                                    e.preventDefault();
                                    setIsDragOver(false);
                                    if (e.dataTransfer.files[0]) handleImageChange({ target: { files: e.dataTransfer.files } });
                                }}
                                onClick={() => document.getElementById('profileImageInput').click()}
                            >
                                <input
                                    type="file"
                                    id="profileImageInput"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="file-input-hidden"
                                />
                                <div className="file-ui-content">
                                    <div className="upload-icon">☁️</div>
                                    <p>Drag & Drop or <span className="browse-link">Browse</span></p>
                                    <small>JPG, PNG up to 10MB</small>
                                </div>
                            </div>
                            {formData.profileImagePreview && (
                                <div className="file-preview-row">
                                    <img src={formData.profileImagePreview} alt="Preview" className="preview-thumb" />
                                    <div className="file-info">
                                        <span>{formData.profileImage ? formData.profileImage.name : 'Current Image'}</span>
                                        <button type="button" onClick={() => handleChange('profileImagePreview', '')} className="remove-btn">Remove</button>
                                    </div>
                                </div>
                            )}
                            {errors.profileImage && <span className="error-message">{errors.profileImage}</span>}
                        </div>

                        {errors.submit && (
                            <div className="form-group full-width">
                                <div className="error-message global-error">{errors.submit}</div>
                            </div>
                        )}

                        <div className="form-actions">
                            <button type="button" className="cancel-button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                            <button type="submit" className="submit-button" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : (editingMember ? 'Update Leader' : 'Add Leader')}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CreateLeadershipModal;
