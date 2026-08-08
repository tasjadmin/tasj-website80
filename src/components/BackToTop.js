import React, { useEffect, useState, useRef } from 'react'
import './BackToTop.css'

const BackToTop = () => {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        const y = window.scrollY || window.pageYOffset
        setVisible(y > 300)
      }, 100)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // Initialize state on mount
    onScroll()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      scrollToTop()
    }
  }

  return (
    <button
      className={`back-to-top ${visible ? 'show' : ''}`}
      onClick={scrollToTop}
      onKeyDown={onKeyDown}
      aria-label="Back to top"
      title="Back to top"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l-7 7h4v9h6V9h4l-7-7z" />
      </svg>
    </button>
  )
}

export default BackToTop

