// src/lib/services/spotify-service.ts
import { API_BASE_URL } from '../../config/api';

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string; height: number; width: number }>;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: {
    total: number;
  };
  images: Array<{ url: string; height: number; width: number }>;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  preview_url?: string;
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

class SpotifyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle redirect responses for auth
      if (response.type === 'opaqueredirect' || response.status === 302) {
        return response as unknown as T;
      }

      // Handle empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Spotify authorization URL
   */
  async getAuthUrl(): Promise<Response> {
    return this.apiRequest<Response>('/api/spotify/auth');
  }

  /**
   * Get current Spotify user info
   */
  async getCurrentUser(): Promise<SpotifyUser> {
    return this.apiRequest<SpotifyUser>('/api/spotify/user');
  }

  /**
   * Get user's Spotify playlists
   */
  async getPlaylists(): Promise<SpotifyPlaylist[]> {
    return this.apiRequest<SpotifyPlaylist[]>('/api/spotify/playlists');
  }

  /**
   * Get tracks from a specific playlist
   */
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    return this.apiRequest<SpotifyTrack[]>(`/api/spotify/playlists/${playlistId}/tracks`);
  }

  /**
   * Add track to playlist
   */
  async addTrackToPlaylist(playlistId: string, spotifyId: string): Promise<void> {
    return this.apiRequest<void>(`/api/spotify/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ spotifyId }),
    });
  }

  /**
   * Remove track from playlist
   */
  async removeTrackFromPlaylist(playlistId: string, spotifyId: string): Promise<void> {
    return this.apiRequest<void>(`/api/spotify/playlists/${playlistId}/tracks/${spotifyId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search Spotify for tracks
   */
  async searchTracks(query: string, limit: number = 20): Promise<SpotifySearchResult> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    return this.apiRequest<SpotifySearchResult>(`/api/spotify/search?${params.toString()}`);
  }

  /**
   * Sync playlist with band songs
   */
  async syncPlaylist(playlistId: string): Promise<void> {
    return this.apiRequest<void>(`/api/spotify/playlists/${playlistId}/sync`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService();
export default spotifyService;