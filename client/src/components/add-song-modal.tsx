import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useToast } from "@/hooks/use-toast";
import { spotifyService, type SpotifyTrack } from "@/lib/services/spotify-service";
import type { ArtistMembership, Artist } from "@/types/api";

// Unified song result type combining bndy-songs and Spotify
interface SongSearchResult {
  id: string;
  title: string;
  artistName: string;
  album?: string | null;
  imageUrl?: string | null;
  spotifyUrl?: string;
  source: "bndy" | "spotify"; // Track source for visual differentiation
  spotifyId?: string; // Only present for Spotify results
  duration?: number | null;
  genre?: string;
}

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function AddSongModal({ isOpen, onClose, artistId, membership }: AddSongModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { session } = useServerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addSongMutation = useMutation({
    mutationFn: async (songData: SongSearchResult) => {
      // If song is from bndy-songs, add directly to playbook using existing song_id
      if (songData.source === "bndy") {
        const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/playbook`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            song_id: songData.id,
            added_by_membership_id: membership.id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to add song");
        }

        return response.json();
      }

      // If song is from Spotify, first create in bndy-songs, then add to playbook
      // Step 1: Create global song
      const createSongResponse = await fetch(`https://api.bndy.co.uk/api/songs`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: songData.title,
          artistName: songData.artistName,
          album: songData.album,
          albumImageUrl: songData.imageUrl,
          spotifyUrl: songData.spotifyUrl,
          duration: songData.duration,
          genre: songData.genre || "",
        }),
      });

      if (!createSongResponse.ok) {
        const error = await createSongResponse.json();
        throw new Error(error.error || "Failed to create song");
      }

      const createdSong = await createSongResponse.json();

      // Step 2: Add to playbook
      const addToPlaybookResponse = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/playbook`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          song_id: createdSong.id,
          added_by_membership_id: membership.id,
        }),
      });

      if (!addToPlaybookResponse.ok) {
        const error = await addToPlaybookResponse.json();
        throw new Error(error.error || "Failed to add to playbook");
      }

      return addToPlaybookResponse.json();
    },
    onSuccess: () => {
      // Invalidate the songs list query to refresh the playbook view
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"] });
      toast({ title: "Song added to playbook!" });
      onClose();
      setSearchQuery("");
      setSearchResults([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add song",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('Starting combined search for:', query);
    setIsSearching(true);

    try {
      // Run both searches in parallel for better performance
      const [bndySongsResponse, spotifyResult] = await Promise.allSettled([
        fetch(
          `https://api.bndy.co.uk/api/songs?q=${encodeURIComponent(query)}`,
          { credentials: "include" }
        ),
        spotifyService.searchTracks(query, 10)
      ]);

      // Process bndy-songs results
      let bndySongs: SongSearchResult[] = [];
      if (bndySongsResponse.status === 'fulfilled' && bndySongsResponse.value.ok) {
        const songs = await bndySongsResponse.value.json();
        bndySongs = songs.map((song: any) => ({
          id: song.id,
          title: song.title,
          artistName: song.artistName,
          album: song.album,
          imageUrl: song.albumImageUrl || null,
          spotifyUrl: song.spotifyUrl,
          source: "bndy" as const,
          duration: song.duration,
          genre: song.genre,
        }));
        console.log('Found', bndySongs.length, 'songs in bndy-songs');
      }

      // Process Spotify results and deduplicate
      let spotifySongs: SongSearchResult[] = [];
      if (spotifyResult.status === 'fulfilled') {
        // Deduplicate: filter out Spotify songs that already exist in bndy-songs
        const bndyKeys = new Set(
          bndySongs.map(song =>
            `${song.title.toLowerCase().trim()}|${song.artistName.toLowerCase().trim()}`
          )
        );

        spotifySongs = spotifyResult.value.tracks.items
          .map((track: SpotifyTrack) => ({
            id: track.id,
            title: track.name,
            artistName: track.artists.map(a => a.name).join(", "),
            album: track.album.name,
            imageUrl: track.album.images.length > 0 ? track.album.images[track.album.images.length - 1].url : null,
            spotifyUrl: track.external_urls.spotify,
            source: "spotify" as const,
            spotifyId: track.id,
            duration: Math.floor(track.duration_ms / 1000),
          }))
          .filter(song => {
            const key = `${song.title.toLowerCase().trim()}|${song.artistName.toLowerCase().trim()}`;
            return !bndyKeys.has(key);
          });

        console.log('Found', spotifySongs.length, 'unique Spotify songs (after deduplication)');
      }

      // Combine results: bndy-songs first, then Spotify
      const combinedResults = [...bndySongs, ...spotifySongs];
      setSearchResults(combinedResults);
      console.log('Total results:', combinedResults.length);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleAddSong = (song: SongSearchResult) => {
    addSongMutation.mutate(song);
  };

  // Live search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchQuery);
      }, 200);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  // Clear search on modal close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 sm:items-center overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl mt-4 sm:mt-0">
        {/* Header */}
        <div className="bg-orange-500 text-white p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-serif font-bold">Add Song to Playbook</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-white/80 p-2"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 sm:p-6 border-b">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs or artists..."
              className="w-full px-4 py-3 pl-11 sm:pl-12 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base sm:text-lg"
              autoFocus
            />
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
              {isSearching ? (
                <i className="fas fa-spinner fa-spin text-orange-500"></i>
              ) : (
                <i className="fas fa-search text-muted-foreground"></i>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
          {searchQuery.length >= 1 && searchQuery.length < 2 && (
            <p className="text-sm text-muted-foreground mt-2">Type at least 2 characters to search</p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {!searchQuery && (
            <div className="p-6 text-center text-muted-foreground">
              <i className="fas fa-search text-4xl mb-4 text-muted-foreground/50"></i>
              <p className="text-sm sm:text-base">Start typing to search for songs</p>
              <p className="text-xs mt-2 text-muted-foreground/70">Searches your library first, then Spotify</p>
            </div>
          )}

          {searchQuery && searchQuery.length < 2 && (
            <div className="p-6 text-center text-muted-foreground">
              <i className="fas fa-keyboard text-4xl mb-4 text-muted-foreground/50"></i>
              <p className="text-sm sm:text-base">Keep typing... (need at least 2 characters)</p>
            </div>
          )}

          {searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
            <div className="p-6 text-center text-muted-foreground">
              <i className="fas fa-exclamation-circle text-4xl mb-4 text-muted-foreground/50"></i>
              <p className="text-sm sm:text-base">No results found for "{searchQuery}"</p>
            </div>
          )}

          {/* Show results */}
          {searchResults.length > 0 && (
            <div className="relative">
              {isSearching && (
                <div className="absolute inset-0 bg-background/75 flex items-center justify-center z-10">
                  <div className="flex items-center space-x-2 text-orange-500">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span className="text-sm">Updating results...</span>
                  </div>
                </div>
              )}

              {searchResults.map((song) => (
                <button
                  key={`${song.source}-${song.id}`}
                  onClick={() => handleAddSong(song)}
                  disabled={addSongMutation.isPending}
                  className="w-full p-3 sm:p-4 border-b hover:bg-muted/50 flex items-center space-x-3 sm:space-x-4 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {/* Album artwork with orange corner marker for bndy-songs */}
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-muted rounded flex-shrink-0 overflow-hidden">
                    {song.imageUrl ? (
                      <img
                        src={song.imageUrl}
                        alt={song.album || "Album artwork"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600">
                        <i className="fas fa-music text-white text-lg sm:text-xl"></i>
                      </div>
                    )}
                    {/* Orange corner triangle for bndy-songs */}
                    {song.source === "bndy" && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-t-orange-500 border-l-[16px] border-l-transparent"></div>
                    )}
                  </div>

                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                      {song.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{song.artistName}</p>
                    {song.album && (
                      <p className="text-xs text-muted-foreground truncate hidden sm:block">{song.album}</p>
                    )}
                  </div>

                  {/* Add icon */}
                  <div className="px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg flex items-center space-x-2 flex-shrink-0 text-sm sm:text-base">
                    <i className="fas fa-plus"></i>
                    <span className="hidden sm:inline">Add</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
