import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { db, supabase } from '../../lib/supabase'
import { formatEventDateTime } from '../../utils/timezoneDateUtils'
import './UpcomingEvents3D.css'

const clamp = (min, v, max) => Math.max(min, Math.min(v, max))

const UpcomingEvents3D = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const navigate = useNavigate()
  const stageRef = useRef(null)
  const [radius, setRadius] = useState(240)

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await db.getEvents()
      if (error) {
        console.error('Error loading events:', error)
        setItems([])
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const all = (data || [])
          .filter(ev => ev.event_date)
          .map(ev => ({ ...ev, _date: new Date(`${ev.event_date}T00:00:00`) }))
          .sort((a, b) => a._date - b._date)

        const upcomingRaw = all.filter(ev => ev._date >= today)

        const minCount = 4
        const selectedRaw = upcomingRaw.slice(0, minCount)

        const selected = selectedRaw.map(ev => ({
          id: ev.id,
          title: ev.name,
          description: (() => {
            const txt = (ev.description || 'Event details coming soon.').replace(/\s+/g, ' ').trim()
            return txt.length > 180 ? txt.slice(0, 177) + '…' : txt
          })(),
          date: ev.event_date ? formatEventDateTime(ev.event_date, ev.event_time).dateLabel : 'Date TBD',
          time: ev.event_date ? formatEventDateTime(ev.event_date, ev.event_time).timeLabel : null,
          location: ev.mode === 'online' ? 'Online Event' : (ev.location_name || 'Venue TBD'),
          deadline: (() => {
            const d = ev.registration_deadline ? new Date(ev.registration_deadline) : null
            if (!d) return null
            return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          })(),
          organizerName: ev.organizer_name || null,
          imageUrl: ev.event_image_url || null,
          _rawDate: ev._date
        }))
        setItems(selected)
        setActive(0)
      }
    } catch (e) {
      console.error('Error loading events:', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  // Refresh when events change in Supabase and at local midnight so completed events disappear automatically
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('home-upcoming-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        loadEvents()
      })
      .subscribe()

    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    const timeoutId = setTimeout(() => loadEvents(), midnight.getTime() - now.getTime())

    return () => {
      supabase.removeChannel(channel)
      clearTimeout(timeoutId)
    }
  }, [loadEvents])

  // Countdown timer logic for the active event
  useEffect(() => {
    if (items.length === 0 || !items[active]) return
    const activeEventDate = new Date(items[active]._rawDate)
    if (isNaN(activeEventDate)) {
      setTimeLeft('')
      return
    }

    const timer = setInterval(() => {
      const now = new Date()
      const diff = activeEventDate - now
      if (diff <= 0) {
        setTimeLeft('Event has started or ended')
        clearInterval(timer)
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24))
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const m = Math.floor((diff / 1000 / 60) % 60)
        setTimeLeft(`${d}d ${h}h ${m}m`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [active, items])

  useEffect(() => {
    const updateRadius = () => {
      const w = stageRef.current?.clientWidth || window.innerWidth
      setRadius(clamp(150, Math.floor(w * 0.26), 340))
    }
    updateRadius()
    window.addEventListener('resize', updateRadius)
    return () => window.removeEventListener('resize', updateRadius)
  }, [])

  const angleStep = useMemo(() => (items.length > 0 ? (360 / items.length) : 0), [items.length])

  const next = useCallback(() => {
    if (animating || items.length === 0) return
    setAnimating(true)
    setActive(prev => (prev + 1) % items.length)
    setTimeout(() => setAnimating(false), 300)
  }, [animating, items.length])

  const prev = useCallback(() => {
    if (animating || items.length === 0) return
    setAnimating(true)
    setActive(prev => (prev - 1 + items.length) % items.length)
    setTimeout(() => setAnimating(false), 300)
  }, [animating, items.length])

  const onWheel = useCallback((e) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (delta > 10) next()
    if (delta < -10) prev()
  }, [next, prev])

  const onKey = useCallback((e) => {
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft') prev()
  }, [next, prev])

  const renderCard = (item, i) => {
    const angle = (i - active) * angleStep
    const rad = (angle * Math.PI) / 180
    const depthFactor = (Math.cos(rad) + 1) / 2
    const scale = 0.65 + 0.35 * depthFactor
    const opacity = 0.35 + 0.65 * depthFactor
    const blur = 2.5 * (1 - depthFactor)
    const zIndex = Math.round(100 * depthFactor)
    const isActive = Math.abs(angle) < 1e-6

    const handleCardClick = (e) => {
      // If it's a drag, don't trigger click
      // We can also check if it's the active card, but the user requested redirection for "the card"
      navigate(`/events/${item.id}`)
    }

    return (
      <motion.div
        key={item.id}
        className={`circle-card ${isActive ? 'active' : ''}`}
        style={{ zIndex }}
        initial={false}
        animate={{
          transform: `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px) rotateY(${-angle}deg) scale(${scale})`,
          opacity,
          filter: `blur(${blur}px)`
        }}
        transition={{ type: 'spring', stiffness: 180, damping: 24 }}
        onClick={handleCardClick}
        whileHover={{ scale: scale * 1.05 }}
      >
        <div className="circle-card-image">
          <div className="circle-card-category">Event</div>
          {item.deadline && (
            <div className="circle-deadline-badge">Closes {item.deadline}</div>
          )}
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" />
          ) : (
            <div className="circle-placeholder">📅</div>
          )}
        </div>
        <div className="circle-card-content">
          <h3 className="circle-card-title">{item.title}</h3>
          <div className="circle-meta-row">
            <div className="circle-meta"><span className="meta-icon">📅</span><span>{item.date}{item.time ? ` · ${item.time}` : ''}</span></div>
            <div className="circle-meta"><span className="meta-icon">📍</span><span>{item.location}</span></div>
            {item.organizerName && (
              <div className="circle-meta"><span className="meta-icon">👤</span><span>{item.organizerName}</span></div>
            )}
            {item.deadline && (
              <div className="circle-meta"><span className="meta-icon">⏰</span><span>Closes {item.deadline}</span></div>
            )}
          </div>
          <p className="circle-card-description">{item.description}</p>
          <div className="circle-card-actions">
            <Link to={`/events/${item.id}`} className="btn btn-outline">Learn More</Link>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <section className="upcoming-circle-section">
      <div className="container">
        <div className="events-bar-header">
          <h2>Upcoming Events</h2>
          <p>Swipe or scroll to rotate the carousel</p>
          {timeLeft && !timeLeft.includes('started') && (
            <div className="event-countdown">
              <strong>Time until {items[active]?.title}:</strong>
              <span className="countdown-clock">{timeLeft}</span>
            </div>
          )}
        </div>
        <div
          className="circle-stage"
          ref={stageRef}
          onWheel={onWheel}
          onKeyDown={onKey}
          tabIndex={0}
          aria-label="Upcoming events 3D carousel"
        >
          {loading ? (
            <div className="events-loading">
              <div className="loading-spinner"></div>
              <p>Loading events...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="events-loading"><p>No upcoming events.</p></div>
          ) : (
            <motion.div className="circle-wrap" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1}
              onDragEnd={(e, info) => { 
                if (info.offset.x < -30) next(); 
                else if (info.offset.x > 30) prev(); 
              }}>
              {items.map((it, i) => renderCard(it, i))}
            </motion.div>
          )}
          <button className="circle-nav prev" onClick={prev} aria-label="Previous event">‹</button>
          <button className="circle-nav next" onClick={next} aria-label="Next event">›</button>
        </div>
      </div>
    </section>
  )
}

export default UpcomingEvents3D
