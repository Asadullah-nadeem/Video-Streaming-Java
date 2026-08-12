import React, { useState, useEffect, useRef } from 'react';
import { API_URL, getHeaders } from './config/authguide';
import ReelSlide from './components/ReelSlide';

export default function App() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const containerRef = useRef(null);
  const videoRefs = useRef([]);

  // Fetch list of video metadata securely
  useEffect(() => {
    fetch(`${API_URL}/api/v1/videos/list`, {
      headers: getHeaders()
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Unable to fetch video list. Check database connection.");
        }
        return res.json();
      })
      .then(data => {
        setReels(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const registerVideoRef = (index, ref) => {
    videoRefs.current[index] = ref;
  };

  // Track active slide index on scrolling (snaps when 60% of the slide is visible)
  useEffect(() => {
    if (reels.length === 0) return;

    const observerOptions = {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: 0.6
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index'), 10);
          setActiveIdx(index);
        }
      });
    }, observerOptions);

    const slideElements = document.querySelectorAll('.slide');
    slideElements.forEach(el => observer.observe(el));

    return () => {
      slideElements.forEach(el => observer.unobserve(el));
    };
  }, [reels]);

  // Autoplay current active video and pause others
  useEffect(() => {
    if (reels.length === 0) return;

    videoRefs.current.forEach((video, idx) => {
      if (!video) return;
      if (idx === activeIdx) {
        video.currentTime = 0; // Reset video to beginning
        video.play().catch(err => {
          console.log("Autoplay blocked by browser. Play with sound manually.", err);
        });
      } else {
        video.pause();
      }
    });
  }, [activeIdx, reels]);

  // Handle dot/sidebar click navigation
  const handleDotClick = (index) => {
    const targetSlide = document.querySelector(`.slide[data-index='${index}']`);
    if (targetSlide && containerRef.current) {
      containerRef.current.scrollTo({
        top: targetSlide.offsetTop,
        behavior: 'smooth'
      });
      setActiveIdx(index);
    }
  };

  // Enforce keyboard ArrowUp and ArrowDown scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDotClick(Math.min(activeIdx + 1, reels.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleDotClick(Math.max(activeIdx - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIdx, reels]);

  // Loading state view
  if (loading) {
    return (
      <div className="state-container">
        <i className="fas fa-circle-notch fa-spin" />
        <h1>Loading Reels...</h1>
        <p>Connecting securely to MySQL video database</p>
      </div>
    );
  }

  // Error state view
  if (error) {
    return (
      <div className="state-container">
        <i className="fas fa-exclamation-triangle" style={{ color: '#d9534f' }} />
        <h1>Connection Error</h1>
        <p>{error}</p>
        <p style={{ marginTop: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          Please make sure the Spring Boot server is running on port 8080 and MySQL is active.
        </p>
      </div>
    );
  }

  // Empty state view
  if (reels.length === 0) {
    return (
      <div className="state-container">
        <i className="fas fa-video-slash" />
        <h1>No Reels Found</h1>
        <p>Please upload video files using Postman or curl to see them stream here!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Top Header & Branding */}
      <header className="header-bar">
        <button
          className="action-btn"
          onClick={() => setIsMuted(!isMuted)}
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
          aria-label={isMuted ? "Unmute sound" : "Mute sound"}
        >
          <i className={isMuted ? "fas fa-volume-mute" : "fas fa-volume-up"} />
        </button>
      </header>

      {/* Scrollable vertical reels snaps */}
      <div className="reel-container" ref={containerRef}>
        {reels.map((video, index) => (
          <ReelSlide
            key={video.videoKey}
            index={index}
            videoKey={video.videoKey}
            title={video.title}
            description={video.description}
            isMuted={isMuted}
            registerVideoRef={registerVideoRef}
          />
        ))}
      </div>
    </div>
  );
}
