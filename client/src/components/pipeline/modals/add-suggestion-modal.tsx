import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useToast } from "@/hooks/use-toast";
import { spotifyService } from "@/lib/services/spotify-service";
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
  const [comment, setComment] = useState("");
  const [voteValue, setVoteValue] = useState<number | null>(null);
  const { session } = useServerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Search bndy-songs first
      const bndyResponse = await fetch(
        `/api/songs?q=${encodeURIComponent(query)}`,
        { credentials: "include" }
      );

      let results: SongSearchResult[] = [];

      if (bndyResponse.ok) {
        const bndySongs = await bndyResponse.json();
        results = bndySongs.map((song: any) => ({
          id: song.id,
          title: song.title,
          artistName: song.artist_name,
          album: song.album,
          imageUrl: song.thumbnail_url,
          spotifyUrl: song.spotify_url,
          source: "bndy" as const,
          duration: song.duration,
          genre: song.genre,
          releaseDate: song.release_date,
          previewUrl: song.preview_url
        }));
      }

      // If no local results, search Spotify
      if (results.length === 0) {
        const spotifyTracks = await spotifyService.searchTracks(query);
        results = spotifyTracks.map((track) => ({
          id: track.id,
          title: track.name,
          artistName: track.artists[0]?.name || "Unknown Artist",
          album: track.album?.name,
          imageUrl: track.album?.images?.[0]?.url,
          spotifyUrl: track.external_urls?.spotify,
          source: "spotify" as const,
          spotifyId: track.id,
          duration: track.duration_ms ? Math.floor(track.duration_ms / 1000) : null,
          genre: track.genre || null,
          releaseDate: track.album?.release_date || null,
          previewUrl: track.preview_url || null
        }));
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search for songs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const addSuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSong || voteValue === null) {
        throw new Error("Please select a song and vote");
      }

      let songId = selectedSong.id;

      // If from Spotify, create global song first
      if (selectedSong.source === "spotify") {
        const createResponse = await fetch(`/api/songs`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: selectedSong.title,
            artistName: selectedSong.artistName,
            album: selectedSong.album,
            albumImageUrl: selectedSong.imageUrl,
            spotifyUrl: selectedSong.spotifyUrl,
            duration: selectedSong.duration,
            genre: selectedSong.genre,
            releaseDate: selectedSong.releaseDate,
            previewUrl: selectedSong.previewUrl
          })
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create song");
        }

        const createdSong = await createResponse.json();
        songId = createdSong.id;
      }

      // Add to pipeline
      const response = await fetch(
        `/api/artists/${artistId}/pipeline/suggestions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            song_id: songId,
            suggested_comment: comment.trim(),
            initial_vote: voteValue,
            added_by_membership_id: membershipId
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add suggestion");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", artistId] });
      toast({
        title: "Song suggested!",
        description: "Your suggestion has been added to the voting pipeline"
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!selectedSong) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Suggest a Song</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a song..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isSearching && (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                No results found
              </div>
            )}

            {searchResults.map((result) => (
              <button
                key={`${result.source}-${result.id}`}
                onClick={() => setSelectedSong(result)}
                className="w-full p-3 rounded-lg border border-border hover:bg-accent transition-colors flex gap-3 text-left"
              >
                {result.imageUrl ? (
                  <img
                    src={result.imageUrl}
                    alt={result.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    <i className="fas fa-music text-muted-foreground"></i>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{result.title}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {result.artistName} {result.album && `• ${result.album}`}
                  </div>
                  {result.source === "bndy" && (
                    <span className="text-xs text-primary">In Library</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Comment & Vote
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => setSelectedSong(null)}
            className="text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to search
          </button>
          <h2 className="text-lg font-semibold">Add Your Vote</h2>
        </div>

        {/* Selected Song */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-3">
            {selectedSong.imageUrl && (
              <img
                src={selectedSong.imageUrl}
                alt={selectedSong.title}
                className="w-16 h-16 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <div className="font-medium">{selectedSong.title}</div>
              <div className="text-sm text-muted-foreground">
                {selectedSong.artistName}
              </div>
            </div>
          </div>
        </div>

        {/* Comment */}
        <div className="p-4">
          <label className="block text-sm font-medium mb-2">
            Comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Why should the band play this song?"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
        </div>

        {/* Voting */}
        <div className="p-4 flex-1 overflow-y-auto">
          <VotingControls
            currentVote={voteValue}
            onVote={setVoteValue}
          />
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => addSuggestionMutation.mutate()}
            disabled={voteValue === null || addSuggestionMutation.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {addSuggestionMutation.isPending ? "Adding..." : "Add Suggestion"}
          </button>
        </div>
      </div>
    </div>
  );
}
