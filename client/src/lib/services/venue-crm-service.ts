// src/lib/services/venue-crm-service.ts
import { API_BASE_URL } from '../../config/api';

export interface ArtistVenue {
  id: string;
  artist_id: string;
  venue_id: string;
  notes?: string;
  custom_venue_name?: string;
  first_gig_date?: string;
  managed_on_bndy: boolean;
  last_venue_update_at?: string;
  created_at: string;
  updated_at: string;

  // Enriched from bndy-venues
  venue: {
    id: string;
    name: string;
    address: string;
    city?: string;
    postcode?: string;
    latitude: number;
    longitude: number;
    googlePlaceId?: string;
    website?: string;
    phone?: string;
  };

  // Computed counts
  contactCount: number;
  gigCount: number;
}

export interface VenueContact {
  id: string;
  artist_venue_id: string;
  artist_id: string;
  venue_id: string;
  name: string;
  mobile?: string;
  landline?: string;
  email?: string;
  contact_type: 'artist_added' | 'venue_provided';
  source_venue_contact_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateArtistVenueRequest {
  venueId: string;
  notes?: string;
  customVenueName?: string;
}

export interface UpdateArtistVenueRequest {
  notes?: string;
  customVenueName?: string;
}

export interface CreateContactRequest {
  name: string;
  mobile?: string;
  landline?: string;
  email?: string;
}

export interface UpdateContactRequest {
  name?: string;
  mobile?: string;
  landline?: string;
  email?: string;
}

class VenueCRMService {
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

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Handle empty responses (DELETE, etc.)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return await response.json();
  }

  // ===== Artist-Venue Relationships =====

  /**
   * Get all venues for an artist
   */
  async getArtistVenues(artistId: string): Promise<ArtistVenue[]> {
    return this.apiRequest<ArtistVenue[]>(`/api/artists/${artistId}/crm/venues`);
  }

  /**
   * Create a new artist-venue relationship
   */
  async createArtistVenue(
    artistId: string,
    request: CreateArtistVenueRequest
  ): Promise<ArtistVenue> {
    return this.apiRequest<ArtistVenue>(`/api/artists/${artistId}/crm/venues`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Update artist-venue relationship (notes, custom name)
   */
  async updateArtistVenue(
    artistId: string,
    venueId: string,
    request: UpdateArtistVenueRequest
  ): Promise<ArtistVenue> {
    return this.apiRequest<ArtistVenue>(
      `/api/artists/${artistId}/crm/venues/${venueId}`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Delete artist-venue relationship (cascades to contacts)
   */
  async deleteArtistVenue(artistId: string, venueId: string): Promise<void> {
    return this.apiRequest<void>(
      `/api/artists/${artistId}/crm/venues/${venueId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // ===== Venue Contacts =====

  /**
   * Get all contacts for a venue
   */
  async getVenueContacts(artistId: string, venueId: string): Promise<VenueContact[]> {
    return this.apiRequest<VenueContact[]>(
      `/api/artists/${artistId}/crm/venues/${venueId}/contacts`
    );
  }

  /**
   * Create a new contact for a venue
   */
  async createVenueContact(
    artistId: string,
    venueId: string,
    request: CreateContactRequest
  ): Promise<VenueContact> {
    return this.apiRequest<VenueContact>(
      `/api/artists/${artistId}/crm/venues/${venueId}/contacts`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Update a venue contact
   */
  async updateVenueContact(
    artistId: string,
    venueId: string,
    contactId: string,
    request: UpdateContactRequest
  ): Promise<VenueContact> {
    return this.apiRequest<VenueContact>(
      `/api/artists/${artistId}/crm/venues/${venueId}/contacts/${contactId}`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Delete a venue contact
   */
  async deleteVenueContact(
    artistId: string,
    venueId: string,
    contactId: string
  ): Promise<void> {
    return this.apiRequest<void>(
      `/api/artists/${artistId}/crm/venues/${venueId}/contacts/${contactId}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const venueCRMService = new VenueCRMService();
export default venueCRMService;
