import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

interface SpotifySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SpotifySettings({ isOpen, onClose }: SpotifySettingsProps) {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('spotify_access_token')
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    localStorage.getItem('spotify_playlist_id') || ''
  );
  const { toast } = useToast();

  const { data: playlists = [], isLoading: playlistsLoading } = useQuery<SpotifyPlaylist[]>({
    queryKey: ["/api/spotify/playlists"],
    queryFn: async () => {
      if (!accessToken) return [];
      
      const response = await fetch("/api/spotify/playlists", {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired
          setAccessToken(null);
          localStorage.removeItem('spotify_access_token');
          throw new Error('Spotify access token expired');
        }
        throw new Error('Failed to fetch playlists');
      }
      
      return response.json();
    },
    enabled: !!accessToken,
  });

  const handleSpotifyLogin = async () => {
    try {
      const response = await fetch("/api/spotify/auth");
      const { authUrl } = await response.json();
      
      // Open Spotify auth in new window
      const authWindow = window.open(authUrl, 'spotify-auth', 'width=600,height=600');
      
      // Listen for the callback
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          // Check if we got tokens in localStorage (set by callback handler)
          const token = localStorage.getItem('spotify_access_token');
          if (token) {
            setAccessToken(token);
            toast({
              title: "Connected to Spotify!",
              description: "You can now access your playlists"
            });
          }
        }
      }, 1000);
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Could not connect to Spotify",
        variant: "destructive"
      });
    }
  };

  const handlePlaylistSelect = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    localStorage.setItem('spotify_playlist_id', playlistId);
    toast({
      title: "Practice playlist set!",
      description: "This playlist will be used for importing/exporting songs"
    });
  };

  const handleDisconnect = () => {
    setAccessToken(null);
    setSelectedPlaylistId('');
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_playlist_id');
    toast({
      title: "Disconnected from Spotify",
      description: "You'll need to reconnect to access playlists"
    });
  };

  const importFromPlaylist = async () => {
    if (!selectedPlaylistId || !accessToken) return;
    
    try {
      const response = await fetch(`/api/spotify/playlists/${selectedPlaylistId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch playlist tracks');
      
      const tracks = await response.json();
      
      // Add each track to practice list
      let addedCount = 0;
      for (const item of tracks) {
        if (!item.track || !item.track.id) continue;
        
        try {
          const addResponse = await fetch("/api/songs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              spotifyId: item.track.id,
              title: item.track.name,
              artist: item.track.artists.map(a => a.name).join(", "),
              album: item.track.album.name,
              spotifyUrl: item.track.external_urls.spotify,
              imageUrl: item.track.album.images.length > 0 ? item.track.album.images[0].url : null,
              previewUrl: item.track.preview_url,
              addedBy: 'spotify-import'
            }),
          });
          
          if (addResponse.ok) {
            addedCount++;
          }
        } catch (error) {
          // Song might already exist, continue with others
          continue;
        }
      }
      
      toast({
        title: `Imported ${addedCount} songs!`,
        description: `Added ${addedCount} new songs from your Spotify playlist`
      });
      
      // Refresh songs list
      window.location.reload();
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Could not import songs from playlist",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className="fab fa-spotify text-2xl"></i>
            <h2 className="text-xl font-serif font-bold">Spotify Integration</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-serif text-lg font-semibold mb-3">Connection Status</h3>
            {accessToken ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-green-600">
                  <i className="fas fa-check-circle"></i>
                  <span>Connected to Spotify</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center space-x-2 text-gray-500 mb-3">
                  <i className="fas fa-times-circle"></i>
                  <span>Not connected to Spotify</span>
                </div>
                <button
                  onClick={handleSpotifyLogin}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-serif"
                >
                  Connect to Spotify
                </button>
              </div>
            )}
          </div>

          {/* Playlist Selection */}
          {accessToken && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-serif text-lg font-semibold mb-3">Practice Playlist</h3>
              <p className="text-gray-600 text-sm mb-4">
                Select the Spotify playlist that contains your band's practice songs.
              </p>
              
              {playlistsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex items-center space-x-3 ${
                        selectedPlaylistId === playlist.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                      onClick={() => handlePlaylistSelect(playlist.id)}
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                        {playlist.images.length > 0 ? (
                          <img 
                            src={playlist.images[0].url} 
                            alt={playlist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="fas fa-music text-gray-400"></i>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{playlist.name}</h4>
                        <p className="text-sm text-gray-600">
                          {playlist.tracks.total} tracks • by {playlist.owner.display_name}
                        </p>
                      </div>
                      {selectedPlaylistId === playlist.id && (
                        <i className="fas fa-check text-green-500"></i>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Import/Export Actions */}
          {accessToken && selectedPlaylist && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-serif text-lg font-semibold mb-3">Actions</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={importFromPlaylist}
                  className="flex-1 px-4 py-2 bg-torrist-green text-white rounded-lg hover:bg-torrist-green-dark font-serif flex items-center justify-center space-x-2"
                >
                  <i className="fas fa-download"></i>
                  <span>Import from "{selectedPlaylist.name}"</span>
                </button>
                <a
                  href={selectedPlaylist.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-serif flex items-center justify-center space-x-2"
                >
                  <i className="fab fa-spotify"></i>
                  <span>Open in Spotify</span>
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Import will add songs from your Spotify playlist to the practice list. Duplicates will be skipped.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}