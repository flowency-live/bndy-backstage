import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import type { SpotifyTrack } from "../../../server/spotify";

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddSongModal({ isOpen, onClose }: AddSongModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { currentUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addSongMutation = useMutation({
    mutationFn: async (trackData: any) => {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Song added to practice list!" });
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
    
    console.log('Starting live search for:', query);
    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=8`);
      
      if (response.ok) {
        const tracks = await response.json();
        console.log('Live search results:', tracks.length, 'tracks');
        setSearchResults(tracks);
      } else {
        console.error('Search failed with status:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleAddSong = (track: SpotifyTrack) => {
    const songData = {
      spotifyId: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(", "),
      album: track.album.name,
      spotifyUrl: track.external_urls.spotify,
      imageUrl: track.album.images.length > 0 ? track.album.images[0].url : null,
      previewUrl: track.preview_url,
      addedBy: currentUser?.id,
    };
    
    addSongMutation.mutate(songData);
  };

  // Live search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300); // Reduced to 300ms for faster response
    } else {
      setSearchResults([]);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-torrist-green text-white p-6 flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold">Add Song to Practice List</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Start typing to search for songs or artists..."
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-torrist-green text-lg"
              disabled={isSearching}
              autoFocus
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              {isSearching ? (
                <i className="fas fa-spinner fa-spin text-torrist-green"></i>
              ) : (
                <i className="fas fa-search text-gray-400"></i>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
          {searchQuery.length >= 1 && searchQuery.length < 2 && (
            <p className="text-sm text-gray-500 mt-2">Type at least 2 characters to search</p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {!searchQuery && (
            <div className="p-6 text-center text-gray-500">
              <i className="fas fa-search text-4xl mb-4 text-gray-300"></i>
              <p>Start typing to search for songs</p>
            </div>
          )}

          {searchQuery && searchQuery.length < 2 && (
            <div className="p-6 text-center text-gray-500">
              <i className="fas fa-keyboard text-4xl mb-4 text-gray-300"></i>
              <p>Keep typing... (need at least 2 characters)</p>
            </div>
          )}

          {isSearching && searchQuery.length >= 2 && (
            <div className="p-6 text-center text-gray-500">
              <i className="fas fa-spinner fa-spin text-2xl mb-2 text-torrist-green"></i>
              <p>Searching for "{searchQuery}"...</p>
            </div>
          )}
          
          {searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
            <div className="p-6 text-center text-gray-500">
              <i className="fas fa-exclamation-circle text-4xl mb-4 text-gray-300"></i>
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}

          {searchResults.length > 0 && searchResults.map((track) => (
            <div key={track.id} className="p-4 border-b hover:bg-gray-50 flex items-center space-x-4">
              {/* Album artwork */}
              <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                {track.album.images.length > 0 ? (
                  <img 
                    src={track.album.images[track.album.images.length - 1].url} 
                    alt={track.album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="fas fa-music text-gray-400"></i>
                  </div>
                )}
              </div>

              {/* Song info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-torrist-green truncate">{track.name}</h3>
                <p className="text-sm text-gray-600 truncate">{track.artists.map(a => a.name).join(", ")}</p>
                <p className="text-xs text-gray-500 truncate">{track.album.name}</p>
              </div>

              {/* Add button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleAddSong(track);
                }}
                disabled={addSongMutation.isPending}
                className="px-4 py-2 bg-torrist-orange text-white rounded-lg hover:bg-torrist-orange-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <i className="fas fa-plus"></i>
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}