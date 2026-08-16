// Admin Service - BNDY Centrestage API Integration
// Follows the venue-service.ts pattern but uses relative API calls for admin operations

import { API_BASE_URL } from '../../config/api';

export interface Act {
  id: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
}

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
  // Acts model (#60)
  actsEnabled?: boolean;
  acts?: Act[];
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
  // Enrichment fields (2026-08-11)
  enrichmentStatus?: 'needs_review' | 'high_confidence' | 'reviewed' | 'rejected' | null;
  enrichmentDate?: string | null;
  enrichmentData?: {
    suggested_facebookUrl?: string | null;
    suggested_websiteUrl?: string | null;
    suggested_bio?: string | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    notes: string;
    evidenceUrls?: string[];
    date: string;
  } | null;
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

/** Feature 19 — a venue ownership group. Robinsons is a brewery, Amber Taverns
 *  is a pubco, so this cannot be a boolean called isBrewery. */
export type VenueGroupType = 'brewery' | 'pubco' | 'chain' | 'operator';

/** Who owns the bricks is not who runs the pub. `unknown` is the default and is
 *  a real value, not an absence: blank beats wrong. The managed vs tenanted
 *  split arrives when claiming needs it. */
export type VenueTenure = 'unknown' | 'independent' | 'owned';

export interface VenueGroup {
  id: string;
  slug: string;
  name: string;
  groupType: VenueGroupType;
  website?: string;
  facebookUrl?: string;
  logoUrl?: string;
  bio?: string;
  /** DERIVED from the ownerGroupId index on every read, never a stored field.
   *  `null` means the index was unavailable, which is not the same as zero. */
  venueCount?: number | null;
  createdAt?: string;
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
  facebookUrl?: string;
  instagramUrl?: string;
  validated: boolean;
  nameVariants: string[];
  phone: string;
  postcode: string;
  facilities: string[];
  socialMediaUrls: Array<string | { platform: string; url: string }>;
  profileImageUrl: string | null;
  isTicketed?: boolean;
  standardTicketed?: boolean;  // API response name
  ticketInformation?: string;
  standardTicketInformation?: string;  // API response name
  ticketUrl?: string;
  standardTicketUrl?: string;  // API response name
  defaultTicketPrice?: number | null;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  /** Feature 19: the owner group. ONE per venue. Scope (many per venue) is
   *  Editions, and is not this field. */
  ownerGroupId?: string;
  ownerGroupName?: string;
  tenure?: VenueTenure;
  tenureCheckedAt?: string;
  enrichment_status?: 'high_confidence' | 'needs_review' | 'reviewed' | 'rejected';
  enrichment_data?: {
    suggested_website: string | null;
    suggested_facebook: string | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    notes: string;
    date: string;
  } | null;
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
  userSource: 'map' | 'backstage' | 'frontstage' | null;
  role: 'user' | 'curator' | 'owner' | 'staff';
  platformAdmin: boolean;
  createdAt: string;
}

export type UserRole = User['role'];

export interface FlagEntry {
  id: string;
  entityType: 'artist' | 'venue' | 'event';
  entityId: string;
  entityName: string | null;
  reason: string;
  reporterUserId: string | null;
  reporterName: string | null;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
}

export interface ActivityEntry {
  at: string;
  actorName: string | null;
  actorId: string;
  action: 'edit' | 'hide' | 'restore' | 'set-role' | string;
  entityType: 'artist' | 'venue' | 'event' | 'user' | string;
  entityId: string;
  entityName: string | null;
  detail: string | null;
}

export interface Membership {
  membership_id: string;
  user_id: string; // This is cognito_id
  artist_id: string;
  role: 'owner' | 'admin' | 'member' | 'pending';
  display_name: string | null;
  status: string;
}

export interface Event {
  id: string;
  artistId?: string;
  venueId?: string;
  type: string;
  title?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isPublic?: boolean;
  isAllDay?: boolean;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  artistName?: string;
  venueName?: string;
  venue?: {
    city?: string;
  };
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
        // Try to parse error body for conflict/validation errors
        let errorBody: any = null;
        try {
          errorBody = await response.json();
        } catch {
          // Body not JSON, ignore
        }

        const error = new Error(`Failed request: ${response.status}`) as any;
        error.status = response.status;
        error.body = errorBody;
        throw error;
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

  async deleteArtist(artistId: string, force: boolean = false): Promise<void> {
    const url = force ? `/api/artists/${artistId}?force=true` : `/api/artists/${artistId}`;
    return this.apiRequest<void>(url, {
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

  // ===== Venue group operations (feature 19) =====
  //
  // Reads are public. Writes are staff only and the lambda checks the role from
  // the bndy_session cookie, so `credentials: include` carries the gate.

  async getVenueGroups(): Promise<VenueGroup[]> {
    const data = await this.apiRequest<{ groups: VenueGroup[] }>('/api/venue-groups');
    return data.groups || [];
  }

  async getVenueGroup(slug: string): Promise<{ group: VenueGroup; venues: Venue[]; venueCount: number }> {
    return this.apiRequest(`/api/venue-groups/${encodeURIComponent(slug)}`);
  }

  async createVenueGroup(data: Partial<VenueGroup>): Promise<VenueGroup> {
    const res = await this.apiRequest<{ group: VenueGroup }>('/api/venue-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.group;
  }

  async updateVenueGroup(id: string, data: Partial<VenueGroup>): Promise<VenueGroup> {
    const res = await this.apiRequest<{ group: VenueGroup }>(`/api/venue-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.group;
  }

  /**
   * Set or clear a venue's owner group. Pass ownerGroupId: null to clear.
   * This route writes four fields only and can never reach venue identity.
   */
  async setVenueGroup(
    venueId: string,
    ownerGroupId: string | null,
    tenure?: VenueTenure,
  ): Promise<{ venueId: string; ownerGroupId: string | null; ownerGroupName?: string; tenure: VenueTenure }> {
    return this.apiRequest(`/api/venues/${venueId}/group`, {
      method: 'PUT',
      body: JSON.stringify({ ownerGroupId, ...(tenure ? { tenure } : {}) }),
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

  /** Feature 4: set the platform role on a user record. */
  async setUserRole(userId: string, role: UserRole): Promise<void> {
    await this.apiRequest(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  /** Feature 4: recent curator/admin activity across all users. */
  async getAllActivity(action?: string): Promise<ActivityEntry[]> {
    const q = action ? `?action=${encodeURIComponent(action)}` : '';
    const data = await this.apiRequest<{ entries: ActivityEntry[] }>(`/users/activity/all${q}`);
    return data.entries || [];
  }

  /** Feature 6: open flags for the godmode queue. */
  async getFlags(status: 'open' | 'resolved' = 'open'): Promise<FlagEntry[]> {
    const data = await this.apiRequest<{ flags: FlagEntry[] }>(`/users/flags?status=${status}`);
    return data.flags || [];
  }

  /** Feature 6: close a flag. */
  async resolveFlag(flagId: string): Promise<void> {
    await this.apiRequest(`/users/flags/${flagId}/resolve`, { method: 'PUT' });
  }

  /** Feature 4: bring a hidden record back (staff gate server-side). */
  async restoreHidden(entityType: 'artist' | 'venue' | 'event', id: string): Promise<void> {
    await this.apiRequest(`/api/curator/${entityType}s/${id}/restore`, { method: 'POST' });
  }

  // ===== Membership Operations =====

  async getAllMemberships(): Promise<Membership[]> {
    const data = await this.apiRequest<{ memberships: Membership[] }>('/api/memberships/all');
    return data.memberships || [];
  }

  // ===== Event Operations =====

  async getAllEvents(startDate?: string, endDate?: string): Promise<Event[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    const endpoint = queryString ? `/api/events/public?${queryString}` : '/api/events/public';
    const data = await this.apiRequest<{ events: Event[] }>(endpoint);
    return data.events || [];
  }

  async getEventById(artistId: string, eventId: string): Promise<Event | null> {
    if (!artistId || !eventId) return null;

    try {
      return await this.apiRequest<Event>(`/api/artists/${artistId}/events/${eventId}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updateEvent(artistId: string, eventId: string, eventData: Partial<Event>): Promise<Event> {
    return this.apiRequest<Event>(`/api/artists/${artistId}/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(artistId: string, eventId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Enrichment action methods (2026-08-11)
  async acceptArtistEnrichment(artistId: string, fields?: string[]): Promise<Artist> {
    return this.apiRequest<Artist>(`/api/artists/${artistId}/enrichment`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'accept', fields }),
    });
  }

  async rejectArtistEnrichment(artistId: string): Promise<Artist> {
    return this.apiRequest<Artist>(`/api/artists/${artistId}/enrichment`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject' }),
    });
  }

  async acceptVenueEnrichment(venueId: string, fields?: string[]): Promise<Venue> {
    return this.apiRequest<Venue>(`/api/venues/${venueId}/enrichment`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'accept', fields }),
    });
  }

  async rejectVenueEnrichment(venueId: string): Promise<Venue> {
    return this.apiRequest<Venue>(`/api/venues/${venueId}/enrichment`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject' }),
    });
  }
}

// Export singleton instance
export const godmodeService = new GodmodeService();

// Export individual methods for backward compatibility
export const getAllArtists = () => godmodeService.getAllArtists();
export const getArtistById = (artistId: string) => godmodeService.getArtistById(artistId);
export const createArtist = (artistData: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>) => godmodeService.createArtist(artistData);
export const updateArtist = (artistId: string, artistData: Partial<Artist>) => godmodeService.updateArtist(artistId, artistData);
export const deleteArtist = (artistId: string, force?: boolean) => godmodeService.deleteArtist(artistId, force);
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

export const getAllEvents = (startDate?: string, endDate?: string) => godmodeService.getAllEvents(startDate, endDate);
export const getEventById = (artistId: string, eventId: string) => godmodeService.getEventById(artistId, eventId);
export const updateEvent = (artistId: string, eventId: string, eventData: Partial<Event>) => godmodeService.updateEvent(artistId, eventId, eventData);
export const deleteEvent = (artistId: string, eventId: string) => godmodeService.deleteEvent(artistId, eventId);

export const acceptArtistEnrichment = (artistId: string, fields?: string[]) => godmodeService.acceptArtistEnrichment(artistId, fields);
export const rejectArtistEnrichment = (artistId: string) => godmodeService.rejectArtistEnrichment(artistId);
export const acceptVenueEnrichment = (venueId: string, fields?: string[]) => godmodeService.acceptVenueEnrichment(venueId, fields);
export const rejectVenueEnrichment = (venueId: string) => godmodeService.rejectVenueEnrichment(venueId);

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
