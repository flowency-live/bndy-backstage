// src/lib/services/songs-service.ts
import { API_BASE_URL } from '../../config/api';

export interface GlobalSong {
  spotifyUrl: string;
  title: string;
  artistName: string;
  album: string;
  albumImageUrl: string | null;
  previewUrl: string | null;
  duration: number;
  bpm?: number;
  key?: string;
  releaseDate?: string;
  genre?: string;
}

export interface ArtistSong {
  id: string;
  artistId: string;
  globalSongId: string;
  tuning?: string;
  notes?: string;
  customDuration?: number;
  guitarChordsUrl?: string;
  additionalUrl?: string;
  createdAt: string;
  globalSong?: GlobalSong;
  readiness: Array<{
    id: string;
    songId: string;
    membershipId: string;
    status: "red" | "amber" | "green";
    updatedAt: string;
  }>;
  vetos: Array<{
    id: string;
    songId: string;
    membershipId: string;
    createdAt: string;
  }>;
}

export interface AddSongRequest {
  spotifyUrl: string;
  tuning?: string;
  notes?: string;
  customDuration?: number;
  guitarChordsUrl?: string;
  additionalUrl?: string;
}

export interface UpdateSongRequest {
  tuning?: string;
  notes?: string;
  customDuration?: number;
  guitarChordsUrl?: string;
  additionalUrl?: string;
}

class SongsService {
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search for global songs
   */
  async searchSongs(query: string): Promise<any[]> {
    return this.apiRequest<any[]>(`/api/songs?q=${encodeURIComponent(query)}`);
  }

  /**
   * Create a global song (from Spotify data)
   */
  async createGlobalSong(songData: {
    title: string;
    artistName: string;
    album: string;
    albumImageUrl?: string;
    spotifyUrl: string;
    duration: number;
    genre?: string;
    releaseDate?: string;
    previewUrl?: string;
  }): Promise<{ id: string }> {
    return this.apiRequest<{ id: string }>('/api/songs', {
      method: 'POST',
      body: JSON.stringify(songData),
    });
  }

  /**
   * Get all songs for an artist (playbook)
   */
  async getArtistSongs(artistId: string): Promise<ArtistSong[]> {
    return this.apiRequest<ArtistSong[]>(`/api/artists/${artistId}/playbook`);
  }

  /**
   * Add a song to an artist's playbook
   */
  async addSong(artistId: string, song: AddSongRequest): Promise<ArtistSong> {
    return this.apiRequest<ArtistSong>(`/api/artists/${artistId}/playbook`, {
      method: 'POST',
      body: JSON.stringify(song),
    });
  }

  /**
   * Update a song in an artist's playbook
   */
  async updateSong(artistId: string, songId: string, updates: UpdateSongRequest): Promise<ArtistSong> {
    return this.apiRequest<ArtistSong>(`/api/artists/${artistId}/playbook/${songId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a song from an artist's playbook
   */
  async deleteSong(artistId: string, songId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}/playbook/${songId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update song readiness status for a member
   */
  async updateReadiness(
    artistId: string,
    songId: string,
    status: "red" | "amber" | "green"
  ): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}/playbook/${songId}/readiness`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Toggle veto status for a song
   */
  async toggleVeto(artistId: string, songId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}/playbook/${songId}/veto`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const songsService = new SongsService();
export default songsService;
