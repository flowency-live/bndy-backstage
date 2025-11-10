import { useAdminContext } from '../AdminContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Music2, LogIn, LogOut } from 'lucide-react';
import { FaSpotify } from 'react-icons/fa6';
import { useSpotify } from './hooks/useSpotify';

export default function SpotifyTab() {
  const { artistId } = useAdminContext();
  const {
    isConnected,
    spotifyUser,
    userLoading,
    playlists,
    playlistsLoading,
    handleSpotifyLogin,
    handleSpotifyDisconnect
  } = useSpotify();

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
