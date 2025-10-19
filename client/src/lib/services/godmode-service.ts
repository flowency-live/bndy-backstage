// Admin Service - BNDY Centrestage API Integration
// Follows the venue-service.ts pattern but uses relative API calls for admin operations

import { API_BASE_URL } from '../../config/api';

export interface Artist {
  id: string;
  name: string;
  bio: string;
  location: string;
  genres: string[];
  facebookUrl: string;
  instagramUrl: string;
  websiteUrl: string;
  socialMediaUrls: Array<{ platform: string; url: string }>;
  profileImageUrl: string;
  isVerified: boolean;
  followerCount: number;
  claimedByUserId: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Song {
  id: string;
  title: string;
  artistName: string;
  duration: number | null;
  genre: string;
  releaseDate: string | null;
  album: string | null;
  spotifyUrl: string;
  appleMusicUrl: string;
  youtubeUrl: string;
  audioFileUrl: string;
  isFeatured: boolean;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  location: { lat: number; lng: number };
  googlePlaceId: string;
  validated: boolean;
  nameVariants: string[];
  phone: string;
  postcode: string;
  facilities: string[];
  socialMediaURLs: Array<{ platform: string; url: string }>;
  profileImageUrl: string | null;
  standardTicketed: boolean;
  standardTicketInformation: string;
  standardTicketUrl: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  cognitoId: string; // Added for matching with memberships
  email: string | null;
  phone: string | null;
  username: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profileCompleted: boolean;
  membershipCount: number;
  authType: 'Phone' | 'Google' | 'Facebook' | 'Email';
  createdAt: string;
}

export interface Membership {
  membership_id: string;
  user_id: string; // This is cognito_id
  artist_id: string;
  role: 'owner' | 'admin' | 'member' | 'pending';
  display_name: string | null;
  status: string;
}

// Artist Operations
export async function getAllArtists(): Promise<Artist[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/artists`);
    if (!response.ok) {
      throw new Error(`Failed to fetch artists: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching artists:', error);
    throw error;
  }
}

export async function getArtistById(artistId: string): Promise<Artist | null> {
  if (!artistId) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/artists/${artistId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch artist: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching artist ${artistId}:`, error);
    throw error;
  }
}

export async function createArtist(artistData: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>): Promise<Artist> {
  try {
    const response = await fetch('/api/artists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(artistData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create artist: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating artist:', error);
    throw error;
  }
}

export async function updateArtist(artistId: string, artistData: Partial<Artist>): Promise<Artist> {
  try {
    const response = await fetch(`/api/artists/${artistId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(artistData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update artist: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating artist ${artistId}:`, error);
    throw error;
  }
}

export async function deleteArtist(artistId: string): Promise<void> {
  try {
    const response = await fetch(`/api/artists/${artistId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete artist: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error deleting artist ${artistId}:`, error);
    throw error;
  }
}

// Song Operations
export async function getAllSongs(): Promise<Song[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/songs`);
    if (!response.ok) {
      throw new Error(`Failed to fetch songs: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching songs:', error);
    throw error;
  }
}

export async function getSongById(songId: string): Promise<Song | null> {
  if (!songId) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/songs/${songId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch song: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching song ${songId}:`, error);
    throw error;
  }
}

export async function createSong(songData: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Promise<Song> {
  try {
    const response = await fetch('/api/songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(songData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create song: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating song:', error);
    throw error;
  }
}

export async function updateSong(songId: string, songData: Partial<Song>): Promise<Song> {
  try {
    const response = await fetch(`/api/songs/${songId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(songData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update song: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating song ${songId}:`, error);
    throw error;
  }
}

export async function deleteSong(songId: string): Promise<void> {
  try {
    const response = await fetch(`/api/songs/${songId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete song: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error deleting song ${songId}:`, error);
    throw error;
  }
}

// Venue Operations
export async function getAllVenues(): Promise<Venue[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/venues`);
    if (!response.ok) {
      throw new Error(`Failed to fetch venues: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching venues:', error);
    throw error;
  }
}

export async function getVenueById(venueId: string): Promise<Venue | null> {
  if (!venueId) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/venues/${venueId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch venue: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching venue ${venueId}:`, error);
    throw error;
  }
}

export async function createVenue(venueData: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>): Promise<Venue> {
  try {
    const response = await fetch('/api/venues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(venueData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create venue: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating venue:', error);
    throw error;
  }
}

export async function updateVenue(venueId: string, venueData: Partial<Venue>): Promise<Venue> {
  try {
    const response = await fetch(`/api/venues/${venueId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(venueData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update venue: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating venue ${venueId}:`, error);
    throw error;
  }
}

export async function deleteVenue(venueId: string): Promise<void> {
  try {
    const response = await fetch(`/api/venues/${venueId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete venue: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error deleting venue ${venueId}:`, error);
    throw error;
  }
}

// Helper Functions
export function formatGenres(genres: string[]): string {
  return genres.length > 0 ? genres.join(', ') : 'No genres';
}

export function formatLocation(venue: Venue): string {
  return `${venue.name} - ${venue.address}`;
}

export function formatDuration(duration: number | null): string {
  if (!duration) return 'Unknown';
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getSocialMediaCount(artist: Artist): number {
  let count = 0;
  if (artist.facebookUrl) count++;
  if (artist.instagramUrl) count++;
  if (artist.websiteUrl) count++;
  return count + artist.socialMediaUrls.length;
}

// User Operations
export async function getAllUsers(): Promise<User[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      credentials: 'include' // Include cookies for authentication
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
}

// Membership Operations
export async function getAllMemberships(): Promise<Membership[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/memberships/all`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch memberships: ${response.status}`);
    }
    const data = await response.json();
    return data.memberships || [];
  } catch (error) {
    console.error('Error fetching memberships:', error);
    throw error;
  }
}

// Agentic Event Ingestion Queue Types
export interface VenueResolution {
  action: 'MATCH_EXISTING' | 'CREATE_NEW' | 'REVIEW';
  venue_id?: string;
  confidence: number;
  reasons: string[];
  enrichments?: {
    website?: string;
    google_place_id?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
}

export interface ArtistCandidate {
  artist: Artist;
  score: number;
  reasons: string[];
}

export interface ArtistResolution {
  action: 'MATCH_EXISTING' | 'CREATE_NEW' | 'REVIEW';
  artist_id?: string;
  confidence: number;
  reasons: string[];
  artist_data?: {
    name: string;
    location?: string;
  };
  candidates?: ArtistCandidate[];
  suggestion?: string;
}

export interface QueueItem {
  queue_id: string;
  venueName: string;
  artistName: string;
  date: string;
  time?: string;
  notes?: string;
  facebookUrl?: string;
  venueResolution: VenueResolution;
  artistResolution: ArtistResolution;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// Event Queue Operations
export async function getEventQueue(): Promise<QueueItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ingest/queue`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch event queue: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching event queue:', error);
    throw error;
  }
}

export async function approveQueueItem(queueId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ingest/queue/${queueId}/approve`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to approve queue item: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error approving queue item ${queueId}:`, error);
    throw error;
  }
}

export async function rejectQueueItem(queueId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ingest/queue/${queueId}/reject`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to reject queue item: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error rejecting queue item ${queueId}:`, error);
    throw error;
  }
}

export async function loadPOCResults(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ingest/load-poc`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to load POC results: ${response.status}`);
    }
  } catch (error) {
    console.error('Error loading POC results:', error);
    throw error;
  }
}

export async function extractFromGigsNews(): Promise<{ extracted: number; queued: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ingest/extract-from-url`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to extract from gigs-news: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error extracting from gigs-news:', error);
    throw error;
  }
}

export async function extractFromHTML(html: string): Promise<{ extracted: number; queued: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ingest/extract-from-html`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ html })
    });
    if (!response.ok) {
      throw new Error(`Failed to extract from HTML: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error extracting from HTML:', error);
    throw error;
  }
}