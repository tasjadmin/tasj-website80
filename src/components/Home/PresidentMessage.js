import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../lib/supabase';
import './PresidentMessage.css';

const PresidentMessage = () => {
    const [presidentData, setPresidentData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        const fetchPresidentData = async () => {
            try {
                const { data, error } = await db.getPublicLeadership();

                if (!error && data && isMounted) {
                    // Find president - use exact match to avoid picking up 'Vice President'
                    const president = data.find(leader =>
                        leader.role && leader.role.toLowerCase().trim() === 'president'
                    );

                    if (president) {
                        setPresidentData(president);
                    }
                }
            } catch (err) {
                console.error("Error fetching president info:", err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchPresidentData();
        
        return () => {
            isMounted = false;
        };
    }, []);

    // Prevent rendering fallbacks during initial hydration/loading to stop flickering
    if (loading) {
        return (
            <section className="president-message-section section-spacing">
                <div className="container"></div>
            </section>
        );
    }

    const name = presidentData ? `${presidentData.first_name || ''} ${presidentData.last_name || ''}`.trim() || 'President, TASJ' : "President, TASJ";
    const title = presidentData ? `${presidentData.role || 'President'}, TASJ` : "Leadership Message";
    const image = presidentData && presidentData.profile_image_base64 && presidentData.profile_image_base64.trim() !== ''
        ? presidentData.profile_image_base64
        : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // A professional portrait placeholder
    const message = presidentData && presidentData.bio && presidentData.bio.trim() !== ''
        ? presidentData.bio
        : "Welcome to the Telugu Association of South Jersey (TASJ). Our mission is to promote, preserve, and pass on our rich cultural heritage to the next generation while serving as a vibrant community hub. We invite you to join our journey, celebrate our traditions, and make lasting memories with us.";

    return (
        <section className="president-message-section section-spacing">
            <div className="container">
                <motion.div
                    className="president-card"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="president-photo-wrapper">
                        <img
                            src={image}
                            alt="President"
                            className="president-photo"
                        />
                        <div className="president-photo-decoration"></div>
                    </div>
                    <div className="president-content">
                        <h2 className="section-title">President's Message</h2>
                        <div className="quote-icon">"</div>
                        <p className="message-text">
                            {message}
                        </p>
                        <div className="president-signature">
                            <h3 className="president-name">{name}</h3>
                            <p className="president-title">{title}</p>
                            <div className="signature-font">{name}</div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default PresidentMessage;
