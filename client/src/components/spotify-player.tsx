import { useState, useEffect, useRef } from 'react';

interface SpotifyPlayerProps {
  accessToken: string | null;
  onPlayerReady?: (deviceId: string) => void;
}

interface SpotifyPlayerState {
  isReady: boolean;
  isPaused: boolean;
  currentTrack: {
    name: string;
    artists: string;
    album: string;
    imageUrl: string;
    uri: string;
  } | null;
}

export function SpotifyPlayer({ accessToken, onPlayerReady }: SpotifyPlayerProps) {
  const [playerState, setPlayerState] = useState<SpotifyPlayerState>({
    isReady: false,
    isPaused: true,
    currentTrack: null,
  });
  const playerRef = useRef<any>(null);
  const deviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Load Spotify Web Playback SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    // Spotify SDK ready callback
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const player = new (window as any).Spotify.Player({
        name: 'BNDY Practice Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: 0.8,
      });

      // Error handling
      player.addListener('initialization_error', ({ message }: any) => {
        console.error('Spotify initialization error:', message);
      });

      player.addListener('authentication_error', ({ message }: any) => {
        console.error('Spotify authentication error:', message);
      });

      player.addListener('account_error', ({ message }: any) => {
        console.error('Spotify account error:', message);
      });

      player.addListener('playback_error', ({ message }: any) => {
        console.error('Spotify playback error:', message);
      });

      // Ready
      player.addListener('ready', ({ device_id }: any) => {
        console.log('Spotify Player Ready with Device ID:', device_id);
        deviceIdRef.current = device_id;
        setPlayerState(prev => ({ ...prev, isReady: true }));
        onPlayerReady?.(device_id);
      });

      // Not Ready
      player.addListener('not_ready', ({ device_id }: any) => {
        console.log('Spotify Player Device has gone offline:', device_id);
        setPlayerState(prev => ({ ...prev, isReady: false }));
      });

      // Player state changed
      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        setPlayerState(prev => ({
          ...prev,
          isPaused: state.paused,
          currentTrack: state.track_window.current_track ? {
            name: state.track_window.current_track.name,
            artists: state.track_window.current_track.artists.map((a: any) => a.name).join(', '),
            album: state.track_window.current_track.album.name,
            imageUrl: state.track_window.current_track.album.images[0]?.url || '',
            uri: state.track_window.current_track.uri,
          } : null,
        }));
      });

      // Connect to the player
      player.connect();
      playerRef.current = player;
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [accessToken, onPlayerReady]);

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    playerRef.current.togglePlay();
  };

  const previousTrack = () => {
    if (!playerRef.current) return;
    playerRef.current.previousTrack();
  };

  const nextTrack = () => {
    if (!playerRef.current) return;
    playerRef.current.nextTrack();
  };

  if (!accessToken || !playerState.isReady || !playerState.currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Album Art */}
          <div className="w-14 h-14 flex-shrink-0 bg-muted rounded overflow-hidden">
            {playerState.currentTrack.imageUrl ? (
              <img
                src={playerState.currentTrack.imageUrl}
                alt={playerState.currentTrack.album}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className="fas fa-music text-muted-foreground"></i>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground truncate">
              {playerState.currentTrack.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {playerState.currentTrack.artists}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={previousTrack}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Previous"
            >
              <i className="fas fa-step-backward"></i>
            </button>
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
              title={playerState.isPaused ? 'Play' : 'Pause'}
            >
              <i className={`fas ${playerState.isPaused ? 'fa-play' : 'fa-pause'}`}></i>
            </button>
            <button
              onClick={nextTrack}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Next"
            >
              <i className="fas fa-step-forward"></i>
            </button>
          </div>

          {/* Spotify Logo */}
          <div className="hidden sm:flex items-center text-green-500">
            <i className="fab fa-spotify text-xl"></i>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to use Spotify player
export function useSpotifyPlayer() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for Spotify access token in localStorage
    const token = localStorage.getItem('spotify_access_token');
    const expiresAt = localStorage.getItem('spotify_expires_at');

    if (token && expiresAt) {
      const now = new Date().getTime();
      if (now < parseInt(expiresAt)) {
        setAccessToken(token);
      } else {
        // Token expired, clear it
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_expires_at');
      }
    }
  }, []);

  const playTrack = async (spotifyUri: string) => {
    if (!accessToken || !deviceId) {
      console.error('Spotify player not ready');
      return;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          uris: [spotifyUri],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to play track');
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  return {
    accessToken,
    deviceId,
    setDeviceId,
    playTrack,
    isReady: !!accessToken && !!deviceId,
  };
}
