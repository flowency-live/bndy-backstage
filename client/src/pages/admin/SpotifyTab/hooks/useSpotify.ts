import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useSpotify() {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('spotify_access_token')
  );

  // Fetch Spotify user profile
  const { data: spotifyUser, isLoading: userLoading } = useQuery({
    queryKey: ['/api/spotify/user'],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await fetch("/api/spotify/user", {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.status === 401) {
        localStorage.removeItem('spotify_access_token');
        throw new Error('Spotify access token expired');
      }
      return response.json();
    }
  });

  // Fetch playlists
  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ['/api/spotify/playlists'],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await fetch("/api/spotify/playlists", {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.status === 401) {
        localStorage.removeItem('spotify_access_token');
        throw new Error('Spotify access token expired');
      }
      return response.json();
    }
  });

  // Listen for Spotify auth completion
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('spotify_access_token');
      setAccessToken(token);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSpotifyLogin = async () => {
    try {
      const response = await fetch("/api/spotify/auth");
      const { authUrl } = await response.json();
      const authWindow = window.open(authUrl, 'spotify-auth', 'width=600,height=600');

      // Poll for access token
      const pollInterval = setInterval(() => {
        const token = localStorage.getItem('spotify_access_token');
        if (token) {
          clearInterval(pollInterval);
          setAccessToken(token);
          authWindow?.close();
          toast({
            title: "Connected to Spotify!",
            description: "You can now import and sync playlists"
          });
        } else if (authWindow?.closed) {
          clearInterval(pollInterval);
          toast({
            variant: "destructive",
            title: "Connection cancelled",
            description: "Spotify connection was not completed"
          });
        }
      }, 1000);
    } catch (error) {
      console.error('Spotify login error:', error);
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: "Could not connect to Spotify"
      });
    }
  };

  const handleSpotifyDisconnect = () => {
    if (confirm('Are you sure you want to disconnect from Spotify?')) {
      setAccessToken(null);
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      localStorage.removeItem('spotify_playlist_id');
      localStorage.removeItem('spotify_expires_at');
      toast({
        title: "Disconnected from Spotify",
        description: "Your Spotify account has been disconnected"
      });
    }
  };

  return {
    isConnected: !!accessToken,
    spotifyUser,
    userLoading,
    playlists: playlistsData?.items || [],
    playlistsLoading,
    handleSpotifyLogin,
    handleSpotifyDisconnect
  };
}
