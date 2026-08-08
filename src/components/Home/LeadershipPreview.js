import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../lib/supabase';
import './LeadershipPreview.css';

const LeadershipPreview = () => {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                const { data, error } = await db.getPublicLeadership();
                if (error) throw error;

                let fetchedLeaders = data || [];
                
                // Define the executive order
                const executiveOrder = [
                    "President",
                    "Vice President",
                    "Elected President",
                    "Secretary",
                    "Joint Secretary",
                    "Treasurer",
                    "Joint Treasurer"
                ];

                if (fetchedLeaders.length === 0) {
                    fetchedLeaders = [
                        { id: 1, first_name: 'Example', last_name: 'President', role: 'President', profile_image_base64: null },
                        { id: 2, first_name: 'Example', last_name: 'VP', role: 'Vice President', profile_image_base64: null },
                        { id: 7, first_name: 'Example', last_name: 'E-President', role: 'Elected President', profile_image_base64: null },
                        { id: 3, first_name: 'Example', last_name: 'Secretary', role: 'Secretary', profile_image_base64: null },
                        { id: 4, first_name: 'Example', last_name: 'J-Secretary', role: 'Joint Secretary', profile_image_base64: null },
                        { id: 5, first_name: 'Example', last_name: 'Treasurer', role: 'Treasurer', profile_image_base64: null },
                        { id: 6, first_name: 'Example', last_name: 'J-Treasurer', role: 'Joint Treasurer', profile_image_base64: null }
                    ];
                }

                // Filter and sort by the executive roles defined above
                const executiveLeaders = fetchedLeaders
                    .filter(leader => {
                        const role = (leader.role || '').trim().toLowerCase();
                        return executiveOrder.some(execRole => role === execRole.toLowerCase());
                    })
                    .sort((a, b) => {
                        const roleA = executiveOrder.findIndex(r => r.toLowerCase() === (a.role || '').trim().toLowerCase());
                        const roleB = executiveOrder.findIndex(r => r.toLowerCase() === (b.role || '').trim().toLowerCase());
                        return roleA - roleB;
                    });

                setLeaders(executiveLeaders);
            } catch (err) {
                console.error('Error fetching leadership:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaders();
    }, []);

    if (loading || leaders.length === 0) return null;
    return (
        <section className="leadership-preview-section section-spacing">
            <div className="container">
                <div className="section-header text-center">
                    <motion.h2
                        className="section-title"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        Our Leadership
                    </motion.h2>
                    <motion.p
                        className="section-subtitle"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        Meet the dedicated committee members serving our community
                    </motion.p>
                </div>

                <div className="leadership-grid">
                    {leaders.map((leader, index) => (
                        <motion.div
                            key={leader.id}
                            className="leadership-card"
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="leader-image-wrapper">
                                <img
                                    src={leader.profile_image_base64 || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
                                    alt={`${leader.first_name} ${leader.last_name}`}
                                    className="leader-image"
                                />
                            </div>
                            <h3 className="leader-name">{`${leader.first_name || ''} ${leader.last_name || ''}`.trim() || 'Leader'}</h3>
                            <p className="leader-role">{leader.role || leader.committee}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default LeadershipPreview;
