-- Table to store video metadata, mapping hashed keys to physical files on disk
CREATE TABLE IF NOT EXISTS video_metadata (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_key VARCHAR(64) NOT NULL UNIQUE,       -- SHA-256 hash of the video content
    original_file_name VARCHAR(255) NOT NULL,    -- Original uploaded filename
    content_type VARCHAR(100) NOT NULL,          -- MIME content type
    file_size BIGINT NOT NULL,                   -- Total file size in bytes
    storage_path VARCHAR(512) NOT NULL,          -- Path to the stored file on the filesystem
    title VARCHAR(255) DEFAULT NULL,             -- Custom user-provided title
    description VARCHAR(1000) DEFAULT NULL,      -- Custom user-provided description
    INDEX idx_video_key (video_key)              -- Index for fast lookups
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
