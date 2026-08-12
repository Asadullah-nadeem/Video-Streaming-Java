import React, { useState, useEffect, useRef } from 'react';
function ReelSlide({ index, videoKey, title, description, isMuted, registerVideoRef }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    registerVideoRef(index, videoRef.current);
  }, [index, registerVideoRef]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percentage || 0);
    }
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        document.querySelectorAll('video').forEach(v => {
          if (v !== videoRef.current) v.pause();
        });
        videoRef.current.play().catch(err => console.log("Play blocked:", err));
      } else {
        videoRef.current.pause();
      }
    }
  };

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const apiKey = import.meta.env.VITE_API_KEY || 'e7b065a7d32c4b5e8f1d2c6b0a4e8d32';
  const streamUrl = `${apiUrl}/api/v1/videos/stream/${videoKey}?apiKey=${apiKey}`;

  return (
    <section className="slide" data-index={index}>
      <div className="video-wrap" onClick={handleVideoClick}>
        <video
          ref={videoRef}
          src={streamUrl}
          loop
          playsInline
          muted={isMuted}
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          preload={index === 0 ? "auto" : "metadata"}
        />
        <div className="play-badge">
          <i className={isPlaying ? "fas fa-pause-circle" : "fas fa-play-circle"} />
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="slide-caption">
        <h2>{title || `Reel #${index + 1}`}</h2>
        <p>{description || `Key: ${videoKey.substring(0, 10)}...`}</p>
      </div>
    </section>
  );
}
export default function App() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const apiKey = import.meta.env.VITE_API_KEY || 'e7b065a7d32c4b5e8f1d2c6b0a4e8d32';

    fetch(`${apiUrl}/api/v1/videos/list`, {
      headers: {
        'X-API-KEY': apiKey
      }
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
          console.log("Autoplay paused. Click play icon to start with sound.", err);
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
