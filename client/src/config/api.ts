// API Configuration
export const API_BASE_URL = 'https://api.bndy.co.uk';

// Helper function for API requests
export const apiUrl = (path: string) => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};