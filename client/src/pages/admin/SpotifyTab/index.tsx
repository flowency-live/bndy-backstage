import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminContext } from '../AdminContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Music2, LogIn, LogOut } from 'lucide-react';
import { FaSpotify } from 'react-icons/fa6';

export default function SpotifyTab() {
  const { artistId } = useAdminContext();
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

  const isConnected = !!accessToken;
  const playlists = playlistsData?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Spotify Integration</h2>
        <p className="text-muted-foreground mt-1">
          Connect your Spotify account and sync playlists
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaSpotify className="w-6 h-6 text-[#1DB954]" />
            Spotify Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <>
              <p className="text-muted-foreground">
                Connect your Spotify account to import songs from your playlists and sync your setlists back to Spotify.
              </p>
              <Button onClick={handleSpotifyLogin} className="bg-[#1DB954] hover:bg-[#1ed760] text-white">
                <LogIn className="w-4 h-4 mr-2" />
                Connect with Spotify
              </Button>
            </>
          ) : (
            <>
              {userLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-muted-foreground">Loading Spotify profile...</span>
                </div>
              ) : spotifyUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={spotifyUser.images?.[0]?.url} />
                      <AvatarFallback>
                        <FaSpotify className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{spotifyUser.display_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Connected as Spotify user
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleSpotifyDisconnect}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* Playlists */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="w-5 h-5" />
              Your Playlists ({playlists.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playlistsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : playlists.length > 0 ? (
              <div className="space-y-2">
                {playlists.slice(0, 10).map((playlist: any) => (
                  <div
                    key={playlist.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {playlist.images?.[0]?.url && (
                      <img
                        src={playlist.images[0].url}
                        alt={playlist.name}
                        className="w-12 h-12 rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{playlist.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {playlist.tracks?.total || 0} tracks
                      </div>
                    </div>
                  </div>
                ))}
                {playlists.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    And {playlists.length - 10} more playlists...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No playlists found</p>
            )}
          </CardContent>
        </Card>
      )}

      {!isConnected && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FaSpotify className="w-16 h-16 mx-auto text-[#1DB954] opacity-50" />
              <div>
                <h3 className="font-semibold mb-2">Not connected to Spotify</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Spotify account to access advanced features like playlist import and setlist sync.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
