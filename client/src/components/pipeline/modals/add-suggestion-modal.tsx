import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useToast } from "@/hooks/use-toast";
import { spotifyService } from "@/lib/services/spotify-service";
import { songsService } from "@/lib/services/songs-service";
import { artistsService } from "@/lib/services/artists-service";
import VotingControls from "../features/voting-controls";

interface SongSearchResult {
  id: string;
  title: string;
  artistName: string;
  album?: string | null;
  imageUrl?: string | null;
  spotifyUrl?: string;
  source: "bndy" | "spotify";
  spotifyId?: string;
  duration?: number | null;
  genre?: string | null;
  releaseDate?: string | null;
  previewUrl?: string | null;
}

type DestinationType = "voting" | "practice";

interface AddSuggestionModalProps {
  artistId: string;
  membershipId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSuggestionModal({
  artistId,
  membershipId,
  onClose,
  onSuccess
}: AddSuggestionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongSearchResult | null>(null);
  const [destination, setDestination] = useState<DestinationType | null>(null);
  const [comment, setComment] = useState("");
  const [voteValue, setVoteValue] = useState<number | null>(null);
  const { session } = useServerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Run both searches in parallel for better performance
      const [bndySongsResult, spotifyResult] = await Promise.allSettled([
        songsService.searchSongs(query),
        spotifyService.searchTracks(query, 10)
      ]);

      // Process bndy-songs results
      let bndySongs: SongSearchResult[] = [];
      if (bndySongsResult.status === 'fulfilled') {
        const songs = bndySongsResult.value;
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
          .map((track: any) => ({
            id: track.id,
            title: track.name,
            artistName: track.artists.map((a: any) => a.name).join(", "),
            album: track.album.name,
            imageUrl: track.album.images.length > 0 ? track.album.images[track.album.images.length - 1].url : null,
            spotifyUrl: track.external_urls.spotify,
            source: "spotify" as const,
            spotifyId: track.id,
            duration: Math.floor(track.duration_ms / 1000),
            genre: track.genre || null,
            releaseDate: track.album.release_date || null,
            previewUrl: track.preview_url || null,
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

    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

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

  const addSongMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSong || !destination) {
        throw new Error("Please select a song and destination");
      }

      if (destination === "voting" && voteValue === null) {
        throw new Error("Please add your vote");
      }

      let songId = selectedSong.id;

      // If from Spotify, create global song first
      if (selectedSong.source === "spotify") {
        const createdSong = await songsService.createGlobalSong({
          title: selectedSong.title,
          artistName: selectedSong.artistName,
          album: selectedSong.album,
          albumImageUrl: selectedSong.imageUrl,
          spotifyUrl: selectedSong.spotifyUrl,
          duration: selectedSong.duration,
          genre: selectedSong.genre,
          releaseDate: selectedSong.releaseDate,
          previewUrl: selectedSong.previewUrl
        });
        songId = createdSong.id;
      }

      // Add based on destination
      if (destination === "voting") {
        return await artistsService.addPipelineSuggestion(artistId, {
          song_id: songId,
          suggested_comment: comment.trim(),
          initial_vote: voteValue,
          added_by_membership_id: membershipId
        });
      } else {
        // Add directly to practice (status = "practice")
        return await artistsService.addPipelineSuggestion(artistId, {
          song_id: songId,
          status: "practice",
          added_by_membership_id: membershipId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", artistId] });
      toast({
        title: destination === "voting" ? "Song suggested!" : "Song added to practice!",
        description: destination === "voting"
          ? "Your suggestion has been added to the voting pipeline"
          : "Song has been added to your practice list"
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add song",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Step 1: Search for song
  if (!selectedSong) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 sm:items-center overflow-y-auto">
        <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl mt-4 sm:mt-0">
          {/* Header */}
          <div className="bg-orange-500 text-white p-4 sm:p-6 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-serif font-bold">Suggest a Song</h2>
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
                    onClick={() => setSelectedSong(song)}
                    className="w-full p-3 sm:p-4 border-b hover:bg-muted/50 flex items-center space-x-3 sm:space-x-4 text-left transition-colors"
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

                    {/* Select icon */}
                    <div className="px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg flex items-center space-x-2 flex-shrink-0 text-sm sm:text-base">
                      <i className="fas fa-chevron-right"></i>
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

  // Step 2: Choose destination
  if (!destination) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 sm:items-center overflow-y-auto">
        <div className="bg-card rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl mt-4 sm:mt-0">
          {/* Header */}
          <div className="bg-orange-500 text-white p-4 sm:p-6">
            <button
              onClick={() => setSelectedSong(null)}
              className="text-white hover:text-white/80 mb-3 flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to search</span>
            </button>
            <h2 className="text-lg sm:text-xl font-serif font-bold">Where should this song go?</h2>
          </div>

          {/* Selected Song */}
          <div className="p-4 sm:p-6 border-b">
            <div className="flex gap-3">
              {selectedSong.imageUrl ? (
                <img
                  src={selectedSong.imageUrl}
                  alt={selectedSong.title}
                  className="w-16 h-16 rounded object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                  <i className="fas fa-music text-muted-foreground"></i>
                </div>
              )}
              <div className="flex-1">
                <div className="font-semibold">{selectedSong.title}</div>
                <div className="text-sm text-muted-foreground">{selectedSong.artistName}</div>
                {selectedSong.album && (
                  <div className="text-xs text-muted-foreground mt-1">{selectedSong.album}</div>
                )}
              </div>
            </div>
          </div>

          {/* Destination Choices */}
          <div className="p-4 sm:p-6 space-y-3">
            <button
              onClick={() => setDestination("voting")}
              className="w-full p-4 border-2 border-border hover:border-orange-500 hover:bg-orange-500/5 rounded-lg transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-vote-yea text-orange-500 text-xl"></i>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Add to Voting</div>
                  <div className="text-sm text-muted-foreground">Suggest for the band to vote on</div>
                </div>
                <i className="fas fa-chevron-right text-muted-foreground"></i>
              </div>
            </button>

            <button
              onClick={() => setDestination("practice")}
              className="w-full p-4 border-2 border-border hover:border-orange-500 hover:bg-orange-500/5 rounded-lg transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-guitar text-orange-500 text-xl"></i>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Add to Practice</div>
                  <div className="text-sm text-muted-foreground">Add directly to practice list</div>
                </div>
                <i className="fas fa-chevron-right text-muted-foreground"></i>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Add vote (if destination is voting)
  if (destination === "voting") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 sm:items-center overflow-y-auto">
        <div className="bg-card rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl mt-4 sm:mt-0">
          {/* Header */}
          <div className="bg-orange-500 text-white p-4 sm:p-6">
            <button
              onClick={() => setDestination(null)}
              className="text-white hover:text-white/80 mb-3 flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </button>
            <h2 className="text-lg sm:text-xl font-serif font-bold">Add Your Vote</h2>
          </div>

          {/* Selected Song */}
          <div className="p-4 sm:p-6 border-b">
            <div className="flex gap-3">
              {selectedSong.imageUrl && (
                <img
                  src={selectedSong.imageUrl}
                  alt={selectedSong.title}
                  className="w-16 h-16 rounded object-cover"
                />
              )}
              <div className="flex-1">
                <div className="font-semibold">{selectedSong.title}</div>
                <div className="text-sm text-muted-foreground">{selectedSong.artistName}</div>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="p-4 sm:p-6">
            <label className="block text-sm font-medium mb-2">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why should the band play this song?"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              rows={3}
            />
          </div>

          {/* Voting Controls */}
          <div className="p-4 sm:p-6">
            <VotingControls
              currentVote={voteValue}
              onVote={setVoteValue}
            />
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-6 border-t flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => addSongMutation.mutate()}
              disabled={voteValue === null || addSongMutation.isPending}
              className="flex-1 px-4 py-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {addSongMutation.isPending ? "Adding..." : "Add to Pipeline"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirm (if destination is practice)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 sm:items-center overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl mt-4 sm:mt-0">
        {/* Header */}
        <div className="bg-orange-500 text-white p-4 sm:p-6">
          <button
            onClick={() => setDestination(null)}
            className="text-white hover:text-white/80 mb-3 flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i>
            <span>Back</span>
          </button>
          <h2 className="text-lg sm:text-xl font-serif font-bold">Add to Practice</h2>
        </div>

        {/* Selected Song */}
        <div className="p-4 sm:p-6 border-b">
          <div className="flex gap-3">
            {selectedSong.imageUrl && (
              <img
                src={selectedSong.imageUrl}
                alt={selectedSong.title}
                className="w-16 h-16 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <div className="font-semibold">{selectedSong.title}</div>
              <div className="text-sm text-muted-foreground">{selectedSong.artistName}</div>
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div className="p-4 sm:p-6">
          <p className="text-muted-foreground">
            This song will be added directly to your practice list without voting.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 sm:p-6 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => addSongMutation.mutate()}
            disabled={addSongMutation.isPending}
            className="flex-1 px-4 py-3 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {addSongMutation.isPending ? "Adding..." : "Add to Practice"}
          </button>
        </div>
      </div>
    </div>
  );
}
