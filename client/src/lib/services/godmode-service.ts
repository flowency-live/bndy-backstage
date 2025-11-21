// Admin Service - BNDY Centrestage API Integration
// Follows the venue-service.ts pattern but uses relative API calls for admin operations

import { API_BASE_URL } from '../../config/api';

export interface Artist {
  id: string;
  name: string;
  bio: string;
  location: string;
  locationType?: 'national' | 'region' | 'city';
  locationLat?: number | null;
  locationLng?: number | null;
  genres: string[];
  artistType?: string;
  actType?: string[];
  acoustic?: boolean;
  facebookUrl: string;
  instagramUrl: string;
  websiteUrl: string;
  socialMediaUrls: Array<{ platform: string; url: string }>;
  profileImageUrl: string;
  isVerified: boolean;
  followerCount: number;
  claimedByUserId: string | null;
  owner_user_id?: string | null;
  source?: 'frontstage' | 'community' | 'backstage' | null;
  needs_review?: boolean | null;
  validated?: boolean;
  eventCount?: number;
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
  website?: string;
  validated: boolean;
  nameVariants: string[];
  phone: string;
  postcode: string;
  facilities: string[];
  socialMediaUrls: Array<string | { platform: string; url: string }>;
  profileImageUrl: string | null;
  standardTicketed: boolean;
  standardTicketInformation: string;
  standardTicketUrl: string;
  enrichment_status?: 'high_confidence' | 'needs_review' | 'reviewed' | 'rejected';
  enrichment_data?: {
    suggested_website: string | null;
    suggested_facebook: string | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    notes: string;
    date: string;
  };
  enrichment_date?: string;
  eventCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  cognitoId: string;
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

class GodmodeService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request with credentials
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);

      if (!response.ok) {
        throw new Error(`Failed request: ${response.status}`);
      }

      // Handle empty responses (DELETE, etc.)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // ===== Artist Operations =====

  async getAllArtists(): Promise<Artist[]> {
    return this.apiRequest<Artist[]>('/api/artists');
  }

  async getArtistById(artistId: string): Promise<Artist | null> {
    if (!artistId) return null;

    try {
      return await this.apiRequest<Artist>(`/api/artists/${artistId}`);
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createArtist(artistData: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>): Promise<Artist> {
    return this.apiRequest<Artist>('/api/artists', {
      method: 'POST',
      body: JSON.stringify(artistData),
    });
  }

  async updateArtist(artistId: string, artistData: Partial<Artist>): Promise<Artist> {
    return this.apiRequest<Artist>(`/api/artists/${artistId}`, {
      method: 'PUT',
      body: JSON.stringify(artistData),
    });
  }

  async deleteArtist(artistId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}`, {
      method: 'DELETE',
    });
  }

  async markArtistAsReviewed(artistId: string): Promise<Artist> {
    return this.apiRequest<Artist>(`/api/artists/${artistId}`, {
      method: 'PUT',
      body: JSON.stringify({ needs_review: false }),
    });
  }

  // ===== Song Operations =====

  async getAllSongs(): Promise<Song[]> {
    return this.apiRequest<Song[]>('/api/songs');
  }

  async getSongById(songId: string): Promise<Song | null> {
    if (!songId) return null;

    try {
      return await this.apiRequest<Song>(`/api/songs/${songId}`);
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createSong(songData: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Promise<Song> {
    return this.apiRequest<Song>('/api/songs', {
      method: 'POST',
      body: JSON.stringify(songData),
    });
  }

  async updateSong(songId: string, songData: Partial<Song>): Promise<Song> {
    return this.apiRequest<Song>(`/api/songs/${songId}`, {
      method: 'PUT',
      body: JSON.stringify(songData),
    });
  }

  async deleteSong(songId: string): Promise<void> {
    return this.apiRequest<void>(`/api/songs/${songId}`, {
      method: 'DELETE',
    });
  }

  // ===== Venue Operations =====

  async getAllVenues(): Promise<Venue[]> {
    return this.apiRequest<Venue[]>('/api/venues');
  }

  async getVenueById(venueId: string): Promise<Venue | null> {
    if (!venueId) return null;

    try {
      return await this.apiRequest<Venue>(`/api/venues/${venueId}`);
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createVenue(venueData: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>): Promise<Venue> {
    return this.apiRequest<Venue>('/api/venues', {
      method: 'POST',
      body: JSON.stringify(venueData),
    });
  }

  async updateVenue(venueId: string, venueData: Partial<Venue>): Promise<Venue> {
    return this.apiRequest<Venue>(`/api/venues/${venueId}`, {
      method: 'PUT',
      body: JSON.stringify(venueData),
    });
  }

  async deleteVenue(venueId: string): Promise<void> {
    return this.apiRequest<void>(`/api/venues/${venueId}`, {
      method: 'DELETE',
    });
  }

  // ===== User Operations =====

  async getAllUsers(): Promise<User[]> {
    const data = await this.apiRequest<{ users: User[] }>('/users');
    return data.users || [];
  }

  async deleteUser(userId: string): Promise<void> {
    return this.apiRequest<void>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // ===== Membership Operations =====

  async getAllMemberships(): Promise<Membership[]> {
    const data = await this.apiRequest<{ memberships: Membership[] }>('/api/memberships/all');
    return data.memberships || [];
  }
}

// Export singleton instance
export const godmodeService = new GodmodeService();

// Export individual methods for backward compatibility
export const getAllArtists = () => godmodeService.getAllArtists();
export const getArtistById = (artistId: string) => godmodeService.getArtistById(artistId);
export const createArtist = (artistData: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>) => godmodeService.createArtist(artistData);
export const updateArtist = (artistId: string, artistData: Partial<Artist>) => godmodeService.updateArtist(artistId, artistData);
export const deleteArtist = (artistId: string) => godmodeService.deleteArtist(artistId);
export const markArtistAsReviewed = (artistId: string) => godmodeService.markArtistAsReviewed(artistId);

export const getAllSongs = () => godmodeService.getAllSongs();
export const getSongById = (songId: string) => godmodeService.getSongById(songId);
export const createSong = (songData: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>) => godmodeService.createSong(songData);
export const updateSong = (songId: string, songData: Partial<Song>) => godmodeService.updateSong(songId, songData);
export const deleteSong = (songId: string) => godmodeService.deleteSong(songId);

export const getAllVenues = () => godmodeService.getAllVenues();
export const getVenueById = (venueId: string) => godmodeService.getVenueById(venueId);
export const createVenue = (venueData: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>) => godmodeService.createVenue(venueData);
export const updateVenue = (venueId: string, venueData: Partial<Venue>) => godmodeService.updateVenue(venueId, venueData);
export const deleteVenue = (venueId: string) => godmodeService.deleteVenue(venueId);

export const getAllUsers = () => godmodeService.getAllUsers();
export const deleteUser = (userId: string) => godmodeService.deleteUser(userId);

export const getAllMemberships = () => godmodeService.getAllMemberships();

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

export default godmodeService;
