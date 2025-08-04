interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email?: string;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
    href: string;
  };
  external_urls: {
    spotify: string;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

interface SpotifyPlaylistTrack {
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string; height: number; width: number }>;
    };
    external_urls: {
      spotify: string;
    };
    preview_url: string | null;
  };
  added_at: string;
  added_by: {
    id: string;
  };
}

interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  country: string;
  product: string;
}

class SpotifyUserService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    
    console.log('SpotifyUserService initializing...');
    console.log('Client ID available:', !!this.clientId, this.clientId ? this.clientId.substring(0, 10) + '...' : 'MISSING');
    console.log('Client Secret available:', !!this.clientSecret);
    
    if (!this.clientId) {
      console.error('SPOTIFY_CLIENT_ID not found in environment');
    }
    if (!this.clientSecret) {
      console.error('SPOTIFY_CLIENT_SECRET not found in environment');
    }
    
    // Use Replit dev domain (works reliably) when running on Replit
    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';
    
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${baseUrl}/api/spotify/callback`;
  }

  // Generate authorization URL for user login
  getAuthorizationUrl(): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: this.redirectUri,
      state: 'torrists-band-app' // CSRF protection
    });

    return `https://accounts.spotify.com/authorize?${params}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(code: string): Promise<SpotifyTokens> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    console.log('Token exchange request:', {
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code: code.substring(0, 20) + '...'
    });
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Spotify token error:', response.status, errorBody);
      throw new Error(`Failed to get access token: ${response.status} - ${errorBody}`);
    }

    return response.json();
  }

  // Get user's playlists
  async getUserPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch playlists: ${response.status}`);
    }

    const data = await response.json();
    return data.items;
  }

  // Get tracks from a specific playlist
  async getPlaylistTracks(playlistId: string, accessToken: string): Promise<SpotifyPlaylistTrack[]> {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist tracks: ${response.status}`);
    }

    const data = await response.json();
    return data.items;
  }

  // Get user profile
  async getUserProfile(accessToken: string): Promise<SpotifyUser> {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    return response.json();
  }

  // Add track to playlist
  async addTrackToPlaylist(playlistId: string, trackUri: string, accessToken: string): Promise<void> {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [trackUri]
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add track to playlist: ${response.status}`);
    }
  }
}

export const spotifyUserService = new SpotifyUserService();
export type { SpotifyPlaylist, SpotifyPlaylistTrack, SpotifyUser, SpotifyTokens };