// Spotify sync utility for real-time bidirectional synchronisation
interface SpotifySettings {
  playlistId: string | null;
  accessToken: string | null;
}

class SpotifySync {
  private settings: SpotifySettings = {
    playlistId: null,
    accessToken: null
  };

  setSettings(playlistId: string, accessToken: string) {
    this.settings = {
      playlistId,
      accessToken
    };
    // Store in localStorage for persistence
    localStorage.setItem('spotify-settings', JSON.stringify(this.settings));
  }

  getSettings(): SpotifySettings {
    if (!this.settings.playlistId || !this.settings.accessToken) {
      // Try to load from localStorage
      const stored = localStorage.getItem('spotify-settings');
      if (stored) {
        try {
          this.settings = JSON.parse(stored);
        } catch (e) {
          // Failed to parse settings
        }
      }
    }
    return this.settings;
  }

  isConfigured(): boolean {
    const settings = this.getSettings();
    return !!(settings.playlistId && settings.accessToken);
  }

  async addTrackToSpotify(spotifyId: string): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings.playlistId || !settings.accessToken) {
      return false; // Not configured, skip sync
    }

    try {
      const response = await fetch(`/api/spotify/playlists/${settings.playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ spotifyId })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async removeTrackFromSpotify(spotifyId: string): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings.playlistId || !settings.accessToken) {
      return false; // Not configured, skip sync
    }

    try {
      const response = await fetch(`/api/spotify/playlists/${settings.playlistId}/tracks/${spotifyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  clearSettings() {
    this.settings = {
      playlistId: null,
      accessToken: null
    };
    localStorage.removeItem('spotify-settings');
  }
}

export const spotifySync = new SpotifySync();