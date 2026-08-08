import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../lib/supabase';
import './AdminMembers.css'; // Shared CSS for consistent Admin UI
import './AdminMembersModalStyles.css';
import CreateLeadershipModal from './CreateLeadershipModal';

const AdminLeadership = () => {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [members, setMembers] = useState([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewMember, setViewMember] = useState(null);

    const [memberMap, setMemberMap] = useState({});

    const loadLeaders = useCallback(async () => {
        try {
            setLoading(true);
            const [leadersData, membersData] = await Promise.all([
                db.getLeadership(),
                db.getMembersLite()
            ]);

            if (leadersData.error) {
                setError('Failed to load leadership team');
                console.error('Leadership Error:', leadersData.error);
            } else {
                const list = Array.isArray(leadersData.data) ? leadersData.data : [];
                list.sort((a, b) => (a.order_index || 999) - (b.order_index || 999));
                setLeaders(list);
            }

            if (membersData.data) {
                const map = {};
                membersData.data.forEach(m => {
                    if (m.email && m.email.trim() !== '') {
                        let mType = (m.membership_type || 'UNKNOWN').trim().toUpperCase();
                        if (mType === 'LIFE' || mType === 'LIFETIME') mType = 'LIFETIME';
                        if (mType === 'LIFE_DONOR') mType = 'LIFE DONOR';
                        if (mType === '') mType = 'UNKNOWN';
                        map[m.email.toLowerCase().trim()] = mType;
                    }
                });
                setMemberMap(map);
                setMembers(membersData.data);
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLeaders();
    }, [loadLeaders]);

    const handleOpenModal = () => {
        setEditingMember(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = async (member) => {
        // Fetch full detail to get the image base64 if needed
        if (member.id) {
            try {
                const { data } = await db.getLeadershipById(member.id);
                if (data) {
                    setEditingMember(data);
                    setIsModalOpen(true);
                    return;
                }
            } catch (e) {
                console.error("Error fetching leader details", e);
            }
        }
        setEditingMember(member);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingMember(null);
    };

    const handleOpenViewModal = async (leader) => {
        // Fetch full detail to get the image base64 if needed for view
        let dataToView = leader;
        if (leader.id) {
            try {
                const { data } = await db.getLeadershipById(leader.id);
                if (data) {
                    dataToView = data;
                }
            } catch (e) {
                console.error("Error fetching leader details", e);
            }
        }
        setViewMember(dataToView);
        setIsViewOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewOpen(false);
        setViewMember(null);
    };


    const handleLeaderSubmit = async (formData, id) => {
        const payload = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email ? formData.email.trim() : formData.email,
            phone: formData.phone,

            committee: formData.committee,
            role: formData.role,
            bio: formData.bio,
            occupation: formData.occupation,
            social: {
                instagram: formData.instagram,
                facebook: formData.facebook,
                linkedin: formData.linkedin
            },
            profile_image_base64: formData.profileImagePreview,
            member_id: formData.member_id
        };

        // If updating an existing leader, we don't want to inadvertently clear the member_id 
        // if for some reason it's missing from the form state (since it's locked anyway).
        if (id && !payload.member_id) {
            delete payload.member_id;
        }

        if (id) {
            const { error } = await db.updateLeadership(id, payload);
            if (error) throw error;
            setLeaders(prev => prev.map(m => m.id === id ? { ...m, ...payload } : m));
        } else {
            const { data, error } = await db.createLeadership(payload);
            if (error) throw error;
            const newLeader = Array.isArray(data) ? data[0] : (data || { ...payload, id: Date.now() });
            setLeaders(prev => [...prev, newLeader]);
        }
    };

    const handleDeleteLeader = async (id) => {
        if (window.confirm('Are you sure you want to remove this leader?')) {
            try {
                const { error } = await db.deleteLeadership(id);
                if (error) throw error;
                setLeaders(prev => prev.filter(m => m.id !== id));
            } catch (err) {
                setError('Failed to delete leader');
            }
        }
    };

    // Filter
    const filteredLeaders = leaders.filter(l => {
        const name = `${l.first_name} ${l.last_name}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase()) || (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    return (
        <div className="admin-members">
            <motion.div
                className="members-header"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1>Leadership Team</h1>
                <p>Manage Executive Committee and Team Leads</p>
                <button className="add-member-btn" onClick={handleOpenModal}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ marginRight: 6 }}><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" /></svg>
                    Add Leader
                </button>
            </motion.div>

            <div className="members-table-container">
                <div className="table-controls">
                    <div className="search-box">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search leaders..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading leaders...</p>
                    </div>
                ) : (
                    filteredLeaders.length === 0 ? (
                        <div className="no-members">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 17V19H2V17S2 13 9 13 16 17 16 17M9 10C11.21 10 13 8.21 13 6S11.21 2 9 2 5 3.79 5 6 6.79 10 9 10M15.47 20.5L12 17L13.41 15.59L15.47 17.66L18.89 14.24L20.3 15.65L15.47 20.5Z" /></svg>
                            <p>No leaders found</p>
                        </div>
                    ) : (
                        (() => {
                            const order = [
                                'Board Members',
                                'Executive Committee', 
                                'Event Committee', 
                                'Registration and Membership Committee', 
                                'Food Committee', 
                                'IT Committee', 
                                'Cultural Committee', 
                                'Sports Committee', 
                                'Volunteer Team', 
                                'Unassigned'
                            ];
                            // Add any newly discovered committees to the start or end if they aren't in the list? 
                            // For now we strictly follow common logic but catching unassigned is good.

                            const groups = filteredLeaders.reduce((acc, m) => {
                                let key = m.committee || 'Unassigned';
                                if (key === 'Education Committee') key = 'IT Committee';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(m);
                                return acc;
                            }, {});

                            // If there are committees not in our 'order' list, append them
                            const existingKeys = Object.keys(groups);
                            const otherKeys = existingKeys.filter(k => !order.includes(k));
                            const finalOrder = [...order, ...otherKeys];

                            return finalOrder.map(committee => {
                                if (!groups[committee] || groups[committee].length === 0) return null;
                                return (
                                    <div className="committee-section" key={committee}>
                                        <div className="committee-title">{committee}</div>
                                        <div className="leadership-header-row">
                                            <div className="col-name">Name</div>
                                            <div className="col-email">Email</div>
                                            <div className="col-role">Role</div>
                                            <div className="col-membership">Membership</div>
                                            <div className="col-actions">Actions</div>
                                        </div>
                                        {groups[committee].map(member => (
                                            <div className="leadership-row" key={member.id}>
                                                <div className="col-name">
                                                    <div className="member-avatar">{(member.first_name || 'U')[0]}</div>
                                                    <div className="name-details">
                                                        <span className="name-text">{member.first_name} {member.last_name}</span>
                                                        <span className="email-mobile">{member.email}</span>
                                                    </div>
                                                </div>
                                                <div className="col-email">{member.email}</div>
                                                <div className="col-role">{member.role}</div>
                                                <div className="col-membership">
                                                    {memberMap[member.email?.toLowerCase()?.trim()] ? (
                                                        <span className="status-badge active">
                                                            {memberMap[member.email?.toLowerCase()?.trim()]}
                                                        </span>
                                                    ) : (
                                                        <span className="status-badge off">
                                                            No Match
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="col-actions">
                                                    <button className="action-btn view" onClick={() => handleOpenViewModal(member)} title="View Details">
                                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z" /></svg>
                                                    </button>
                                                    <button className="action-btn edit" onClick={() => handleOpenEditModal(member)} title="Edit">
                                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>
                                                    </button>
                                                    <button className="action-btn delete" onClick={() => handleDeleteLeader(member.id)} title="Delete">
                                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            });
                        })()
                    )
                )}
            </div>

            <CreateLeadershipModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleLeaderSubmit}
                editingMember={editingMember}
                members={members}
            />

            {isViewOpen && viewMember && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseViewModal(); }}>
                    <motion.div
                        className="modal-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        role="dialog"
                        aria-modal="true"
                    >
                        <button className="modal-close" onClick={handleCloseViewModal}>×</button>
                        <div className="modal-header">
                            <h2>Leader Details</h2>
                            <p>Information shown on the website</p>
                        </div>
                        <div className="modal-form">
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                                {viewMember.profile_image_base64 && (
                                    <img
                                        src={viewMember.profile_image_base64}
                                        alt="Profile"
                                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                                    />
                                )}
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{viewMember.first_name} {viewMember.last_name}</h3>
                                    <div style={{ color: '#666' }}>{viewMember.role}</div>
                                    <div style={{ color: '#888', fontSize: '0.9rem' }}>{viewMember.committee}</div>
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-field"><label>Email</label><div>{viewMember.email || 'N/A'}</div></div>
                                <div className="form-field"><label>Phone</label><div>{viewMember.phone || '—'}</div></div>
                            </div>

                            <div className="form-field">
                                <label>Occupation</label>
                                <div>{viewMember.occupation || '—'}</div>
                            </div>

                            <div className="form-field">
                                <label>Bio</label>
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{viewMember.bio || '—'}</div>
                            </div>

                            <div className="form-field">
                                <label>Social Links</label>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    {viewMember.social?.instagram ? <a href={viewMember.social.instagram} target="_blank" rel="noopener noreferrer" style={{ color: '#C13584' }}>Instagram</a> : <span style={{ color: '#ccc' }}>Instagram</span>}
                                    {viewMember.social?.facebook ? <a href={viewMember.social.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#1877F2' }}>Facebook</a> : <span style={{ color: '#ccc' }}>Facebook</span>}
                                    {viewMember.social?.linkedin ? <a href={viewMember.social.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0A66C2' }}>LinkedIn</a> : <span style={{ color: '#ccc' }}>LinkedIn</span>}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseViewModal}>Close</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AdminLeadership;
