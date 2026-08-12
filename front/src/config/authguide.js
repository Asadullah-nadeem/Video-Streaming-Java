// Centralized security configuration and API helpers
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const API_KEY = import.meta.env.VITE_API_KEY || 'e7b065a7d32c4b5e8f1d2c6b0a4e8d32';

/**
 * Returns the default authorization headers required by the backend API.
 */
export const getHeaders = () => {
  return {
    'X-API-KEY': API_KEY
  };
};

/**
 * Generates the fully authorized streaming URL for a given video key.
 */
export const getStreamUrl = (videoKey) => {
  return `${API_URL}/api/v1/videos/stream/${videoKey}?apiKey=${API_KEY}`;
};
