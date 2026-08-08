import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../lib/supabase';
import './CommunityHighlights.css';

const CommunityHighlights = () => {
    const [highlights, setHighlights] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchHighlights = async () => {
            try {
                const { data, error } = await db.getGalleryImages();
                if (error) throw error;

                if (isMounted) {
                    let urls = (data || []).map(item => item.image_url).filter(Boolean).slice(0, 10);

                    if (urls.length === 0) {
                        urls = [
                            'https://images.unsplash.com/photo-1543332164-6e82f355badc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                            'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                            'https://images.unsplash.com/photo-1533174000255-1bdde7b8c8d2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                            'https://images.unsplash.com/photo-1565592873138-1dd38f8ad71e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                            'https://images.unsplash.com/photo-1504609774693-e4d3f57242ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                            'https://images.unsplash.com/photo-1542125204-7489ab38b815?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
                        ];
                    }
                    setHighlights(urls);
                }
            } catch (err) {
                console.error('Error fetching highlights:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchHighlights();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading || highlights.length === 0) return null;
    return (
        <section className="highlights-section">
            <div className="highlights-header text-center">
                <h2>Community Highlights</h2>
                <p>Glimpses of joy and togetherness</p>
            </div>

            <div className="highlights-strip-container">
                <motion.div
                    className="highlights-strip"
                    animate={{ x: [0, -1000] }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 25,
                            ease: "linear",
                        },
                    }}
                >
                    {/* Double the array for seamless infinite scroll */}
                    {[...highlights, ...highlights, ...highlights, ...highlights].map((img, index) => (
                        <div key={index} className="highlight-image-wrapper">
                            <img src={img} alt={`Highlight center ${index}`} className="highlight-img" />
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default CommunityHighlights;
