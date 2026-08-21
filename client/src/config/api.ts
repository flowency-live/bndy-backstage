// API Configuration
// Same-origin detection: when on bndy.live, CloudFront routes /api/* to API Gateway
export const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname.endsWith('bndy.live')
  ? ''  // Same-origin, no CORS preflight needed
  : 'https://api.bndy.co.uk';

// Helper function for API requests
export const apiUrl = (path: string) => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};