import React, { useState, useEffect, useRef } from 'react';
import { getStreamUrl } from '../config/authguide';

export default function ReelSlide({ index, videoKey, title, description, isMuted, registerVideoRef }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Register the video reference to the parent for active index autoplay coordination
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
        // Pause all other video elements currently playing
        document.querySelectorAll('video').forEach(v => {
          if (v !== videoRef.current) v.pause();
        });
        videoRef.current.play().catch(err => console.log("Play blocked by browser autoplay constraints:", err));
      } else {
        videoRef.current.pause();
      }
    }
  };

  const streamUrl = getStreamUrl(videoKey);

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
