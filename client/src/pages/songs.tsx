import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import AddSongModal from "@/components/add-song-modal";
import { spotifySync } from "@/lib/spotify-sync";
import { PageHeader } from "@/components/layout";
import type { ArtistMembership, Artist } from "@/types/api";

interface SongWithDetails {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  spotifyUrl: string;
  imageUrl?: string;
  previewUrl?: string;
  addedByMembershipId?: string;
  createdAt: string;
  duration?: number;
  custom_duration?: number;
  bpm?: number;
  key?: string;
  tuning?: string;
  notes?: string;
  additionalUrl?: string;
  readiness: Array<{
    id: string;
    songId: string;
    membershipId: string;
    status: "red" | "amber" | "green";
    updatedAt: string;
  }>;
  vetos: Array<{
    id: string;
    songId: string;
    membershipId: string;
    createdAt: string;
  }>;
}

interface SongsProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

// Helper function to format duration in seconds to MM:SS
function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function Songs({ artistId, membership }: SongsProps) {
  // Apply songs theme
  useSectionTheme('songs');

  const [, setLocation] = useLocation();
  const { session } = useServerAuth();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());
  const [spotifyPlaylistId, setSpotifyPlaylistId] = useState<string | null>(null);
  const [currentView] = useState<'playbook' | 'setlists' | 'pipeline'>('playbook');
  const [editedSongs, setEditedSongs] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Check for Spotify settings from localStorage
  useEffect(() => {
    const playlistId = localStorage.getItem('spotify_playlist_id');
    setSpotifyPlaylistId(playlistId);
  }, []);

  // Get songs for this band using new band-scoped API
  const { data: songs = [], isLoading } = useQuery<SongWithDetails[]>({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"],
    queryFn: async () => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/playbook`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch songs");
      }

      const data = await response.json();

      console.log('[PLAYBOOK API] Raw response:', data.length, 'songs');

      // Transform the API response to match our interface
      const transformed = data.map((item: any) => {
        const tuning = item.tuning || 'standard';
        if (tuning !== 'standard') {
          console.log(`[PLAYBOOK API] Non-standard tuning found: "${item.globalSong?.title}" -> ${tuning}`);
        }

        return {
          id: item.id,
          spotifyId: item.globalSong?.spotifyUrl || '',
          title: item.globalSong?.title || 'Unknown Song',
          artist: item.globalSong?.artistName || 'Unknown Artist',
          album: item.globalSong?.album || '',
          spotifyUrl: item.globalSong?.spotifyUrl || '',
          imageUrl: item.globalSong?.albumImageUrl || null,
          previewUrl: item.previewUrl || null,
          addedByMembershipId: item.added_by_membership_id,
          createdAt: item.created_at,
          duration: item.globalSong?.duration || null,
          key: item.globalSong?.metadata?.key || null,
          tuning: tuning,
          notes: item.notes || '',
          additionalUrl: item.additional_url || '',
          readiness: item.readiness || [],
          vetos: item.vetos || [],
        };
      });

      console.log('[PLAYBOOK API] Transformed:', transformed.filter(s => s.tuning !== 'standard').length, 'non-standard tunings');
      return transformed;
    },
    enabled: !!artistId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: undefined,
  });

  // Get band members using new band-scoped API
  const { data: artistMembers = [] } = useQuery<(ArtistMembership & { user: any })[]>({
    queryKey: ["/api/artists", artistId, "members"],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/members`, {
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch artist members");
      }

      const data = await response.json();
      return data.members;
    },
    enabled: !!session?.access_token && !!artistId,
  });

  const updateReadinessMutation = useMutation({
    mutationFn: async ({ songId, status }: { songId: string; status: "red" | "amber" | "green" }) => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/songs/${songId}/readiness`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ membershipId: membership.id, status }),
      });
      if (!response.ok) throw new Error("Failed to update readiness");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"] });
    },
    onError: () => {
      toast({ title: "Failed to update readiness", variant: "destructive" });
    },
  });

  const toggleVetoMutation = useMutation({
    mutationFn: async ({ songId, hasVeto }: { songId: string; hasVeto: boolean }) => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      if (hasVeto) {
        const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/songs/${songId}/veto/${membership.id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to remove veto");
      } else {
        const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/songs/${songId}/veto`, {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ membershipId: membership.id }),
        });
        if (!response.ok) throw new Error("Failed to add veto");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"] });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (songData: { songId: string; spotifyId: string }) => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/playbook/${songData.songId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete song");
      }

      // 204 No Content returns empty body, don't try to parse JSON
      if (response.status === 204) {
        return { success: true };
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"] });
      toast({ title: "Song removed from playbook" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove song", description: error.message, variant: "destructive" });
    },
  });

  const updateSongMutation = useMutation({
    mutationFn: async ({ songId, updates }: { songId: string; updates: any }) => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/playbook/${songId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update song");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"] });
      // Also invalidate setlists so title/duration changes reflect in setlists
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists"] });
      toast({ title: "Song updated" });
      setEditedSongs({});
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update song", description: error.message, variant: "destructive" });
    },
  });

  // Filter by search query first
  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort songs alphabetically by title
  const sortedSongs = [...filteredSongs].sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

  // Group songs alphabetically by first letter
  const groupedSongs = sortedSongs.reduce((acc, song) => {
    const firstLetter = song.title.charAt(0).toUpperCase();
    const group = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(song);
    return acc;
  }, {} as Record<string, SongWithDetails[]>);

  // Get sorted group keys
  const groupKeys = Object.keys(groupedSongs).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  const toggleExpanded = (songId: string) => {
    const newExpanded = new Set(expandedSongs);
    if (newExpanded.has(songId)) {
      newExpanded.delete(songId);
    } else {
      newExpanded.add(songId);
    }
    setExpandedSongs(newExpanded);
  };

  const getReadinessCount = (song: SongWithDetails) => {
    const counts = { green: 0, amber: 0, red: 0 };
    if (!song || !song.readiness) return counts;
    song.readiness.forEach(r => counts[r.status]++);
    return counts;
  };

  const getUserReadiness = (song: SongWithDetails) => {
    if (!song || !song.readiness) return undefined;
    return song.readiness.find(r => r.membershipId === membership.id)?.status;
  };

  const getUserVeto = (song: SongWithDetails) => {
    if (!song || !song.vetos) return false;
    return song.vetos.some(v => v.membershipId === membership.id);
  };

  const handleDeleteSong = async (songId: string, spotifyId: string, songTitle: string) => {
    const confirmed = await confirm({
      title: 'Remove Song',
      description: `Are you sure you want to remove "${songTitle}" from the practice list?`,
      confirmText: 'Remove',
      variant: 'destructive',
    });

    if (confirmed) {
      deleteSongMutation.mutate({ songId, spotifyId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs Navigation - navigate to actual routes */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setLocation("/songs")}
              className="px-4 py-2 font-medium text-orange-500 border-b-2 border-orange-500"
            >
              Playbook
            </button>
            <button
              onClick={() => setLocation("/setlists")}
              className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground"
            >
              Setlists
            </button>
            <button
              onClick={() => setLocation("/songs")}
              className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground"
            >
              Pipeline
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            data-testid="button-add-song"
          >
            <i className="fas fa-plus"></i>
            <span className="hidden sm:inline">Add Song</span>
          </button>
        </div>

        {/* Search and Multi-Select Controls */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs by title or artist..."
              className="w-full px-3 py-2 pr-8 text-sm border border-border bg-background rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setMultiSelectMode(!multiSelectMode);
              if (multiSelectMode) {
                setSelectedSongs([]);
              }
            }}
            className={`px-3 py-2 rounded font-medium flex items-center gap-2 whitespace-nowrap ${
              multiSelectMode
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'border border-border bg-background text-foreground hover:bg-muted'
            }`}
            title="Toggle multi-select mode"
          >
            <i className="fas fa-check-square"></i>
            <span className="hidden sm:inline">Select</span>
          </button>
          {multiSelectMode && selectedSongs.length > 0 && (
            <>
              <button
                onClick={() => {
                  toast({ title: "Creating setlist from selection", description: "This feature is coming soon" });
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded font-medium flex items-center gap-2 whitespace-nowrap"
              >
                <i className="fas fa-list"></i>
                <span className="hidden sm:inline">Create Setlist</span>
                <span>({selectedSongs.length})</span>
              </button>
              <button
                onClick={() => setSelectedSongs([])}
                className="text-muted-foreground hover:text-foreground px-2 py-2"
                title="Clear selection"
              >
                <i className="fas fa-times"></i>
              </button>
            </>
          )}
        </div>

        <div>
        {/* Spotify link row - only show if configured */}
        {spotifyPlaylistId && (
          <div className="flex justify-start mb-8">
            <a
              href={`https://open.spotify.com/playlist/${spotifyPlaylistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-semibold text-sm bg-green-50 hover:bg-green-100 px-3 py-1 rounded-full transition-colors"
              title="Open practice playlist in Spotify"
              data-testid="link-spotify-playlist"
            >
              <i className="fab fa-spotify"></i>
              <span>Open in Spotify</span>
            </a>
          </div>
        )}

        {/* Songs List */}
        {isLoading ? (
          <div className="text-center py-12 animate-fade-in-up">
            <div className="relative">
              <i className="fas fa-spinner fa-spin text-4xl text-brand-primary mb-4 animate-pulse-soft"></i>
              <div className="absolute inset-0 animate-pulse-orange"></div>
            </div>
            <p className="text-muted-foreground animate-shimmer">Loading practice list...</p>
          </div>
        ) : sortedSongs.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl shadow-lg">
            <i className="fas fa-music text-6xl text-muted-foreground mb-6"></i>
            <h3 className="text-xl font-serif font-semibold text-muted-foreground mb-2">No songs yet</h3>
            <p className="text-muted-foreground mb-6">Start building your practice list by adding some songs</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-brand-accent hover:bg-brand-accent-light text-white px-6 py-3 rounded-xl font-serif font-semibold"
              data-testid="button-add-first-song"
            >
              Add Your First Song
            </button>
          </div>
        ) : (
          <div className="space-y-4" style={{ overflow: 'visible' }}>
            {groupKeys.map((letter) => (
              <div key={letter}>
                {/* Alphabetic group header */}
                <div className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm px-3 py-1.5 mb-1 rounded">
                  <h3 className="text-sm font-bold text-foreground">{letter}</h3>
                </div>
                {/* Songs in this group */}
                <div className="space-y-1">
                  {groupedSongs[letter].map((song) => {
              const readinessCounts = getReadinessCount(song);
              const userReadiness = getUserReadiness(song);
              const userVeto = getUserVeto(song);
              const isExpanded = expandedSongs.has(song.id);
              const hasVetos = song.vetos?.length > 0;
              const isSelected = selectedSongs.includes(song.id);
              const selectionIndex = selectedSongs.indexOf(song.id);

              return (
                <div
                  key={song.id}
                  className={`bg-card rounded-lg shadow-sm border transition-all duration-200 ${
                    hasVetos ? 'opacity-60' : ''
                  } ${isSelected ? 'border-orange-500 border-2' : 'border-border hover:bg-muted/50'}`}
                  data-testid={`song-card-${song.id}`}
                  style={{ overflow: 'visible' }}
                >
                  {/* Main song card */}
                  <div className="flex items-center">
                    {/* Selection checkbox - only in multi-select mode */}
                    {multiSelectMode && (
                      <div className="pl-2 pr-1">
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSongs(prev => prev.filter(id => id !== song.id));
                            } else {
                              setSelectedSongs(prev => [...prev, song.id]);
                            }
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-orange-500 border-orange-500' : 'border-border bg-background hover:border-orange-500'
                          }`}
                        >
                          {isSelected && (
                            <span className="text-white text-xs font-bold">{selectionIndex + 1}</span>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Album artwork - reduced height */}
                    <div className="w-12 h-12 bg-muted flex-shrink-0 overflow-hidden">
                      {song.imageUrl ? (
                        <img
                          src={song.imageUrl}
                          alt={song.album}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="fas fa-music text-muted-foreground text-sm"></i>
                        </div>
                      )}
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0 px-2 py-1.5">
                      <h3 className="font-medium text-sm text-foreground truncate" data-testid={`song-title-${song.id}`}>
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate" data-testid={`song-artist-${song.id}`}>{song.artist}</p>
                    </div>

                    {/* Duration, BPM, and Tuning - visible on all screen sizes */}
                    <div className="flex flex-col items-end text-xs text-muted-foreground pr-1 min-w-[55px]">
                      <div className="flex items-center gap-1">
                        {song.tuning && song.tuning !== 'standard' && (
                          <span className={`py-0.5 text-[9px] font-bold rounded shrink-0 whitespace-nowrap ${
                            song.tuning === 'drop-d' ? 'bg-yellow-400 text-black px-1' :
                            song.tuning === 'eb' ? 'bg-blue-500 text-white px-1.5' :
                            'bg-gray-400 text-black px-1'
                          }`}>
                            {song.tuning === 'drop-d' ? '↓D' : song.tuning === 'eb' ? 'E♭' : song.tuning.toUpperCase()}
                          </span>
                        )}
                        {(song.custom_duration || song.duration) && (
                          <div className="whitespace-nowrap">{formatDuration(song.custom_duration || song.duration)}</div>
                        )}
                      </div>
                      {song.bpm && (
                        <div className="whitespace-nowrap">{song.bpm} BPM</div>
                      )}
                    </div>

                    {/* Readiness summary */}
                    <div className="flex items-center space-x-0.5 pr-1">
                      <div className="flex items-center space-x-0.5">
                        {readinessCounts.green > 0 && (
                          <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full" data-testid={`readiness-green-${song.id}`}>
                            {readinessCounts.green}
                          </span>
                        )}
                        {readinessCounts.amber > 0 && (
                          <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full" data-testid={`readiness-amber-${song.id}`}>
                            {readinessCounts.amber}
                          </span>
                        )}
                        {readinessCounts.red > 0 && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full" data-testid={`readiness-red-${song.id}`}>
                            {readinessCounts.red}
                          </span>
                        )}
                      </div>

                      {/* Veto indicators */}
                      {song.vetos?.length > 0 && (
                        <span className="text-base" data-testid={`vetos-${song.id}`}>
                          {"💩".repeat(Math.min(song.vetos.length, 3))}
                        </span>
                      )}

                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpanded(song.id)}
                        className="p-1 hover:bg-muted rounded"
                        data-testid={`button-expand-${song.id}`}
                      >
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-muted-foreground text-xs`}></i>
                      </button>

                      {/* 3-dot menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === song.id ? null : song.id);
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <i className="fas fa-ellipsis-v text-muted-foreground text-xs"></i>
                        </button>

                        {openMenuId === song.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded shadow-lg py-1 min-w-[160px]">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  await handleDeleteSong(song.id, song.spotifyId, song.title);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-red-500"
                              >
                                <i className="fas fa-trash-alt w-4"></i>
                                <span>Remove from playbook</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && currentView === 'playbook' && (
                    <div className="px-4 pb-4 border-t bg-muted/50 animate-expand overflow-hidden">
                      <div className="pt-4 space-y-3 animate-fade-in-up">
                        {/* Title field */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Title</label>
                          <input
                            type="text"
                            placeholder="Song title"
                            value={editedSongs[song.id]?.title ?? song.title ?? ''}
                            onChange={(e) => setEditedSongs(prev => ({
                              ...prev,
                              [song.id]: { ...prev[song.id], title: e.target.value }
                            }))}
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>

                        {/* Editable metadata fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">BPM</label>
                            <input
                              type="number"
                              placeholder="120"
                              value={editedSongs[song.id]?.bpm ?? song.bpm ?? ''}
                              onChange={(e) => setEditedSongs(prev => ({
                                ...prev,
                                [song.id]: { ...prev[song.id], bpm: e.target.value ? parseInt(e.target.value) : null }
                              }))}
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Duration (mm:ss)</label>
                            <input
                              key={`duration-${song.id}-${song.custom_duration || song.duration}`}
                              type="text"
                              placeholder={song.duration ? formatDuration(song.duration) : '0:00'}
                              defaultValue={
                                song.custom_duration
                                  ? formatDuration(song.custom_duration)
                                  : song.duration
                                  ? formatDuration(song.duration)
                                  : ''
                              }
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                const currentDisplayedDuration = song.custom_duration || song.duration;

                                // Parse mm:ss format
                                const match = value.match(/^(\d+):(\d{2})$/);
                                if (match) {
                                  const minutes = parseInt(match[1]);
                                  const seconds = parseInt(match[2]);
                                  const totalSeconds = minutes * 60 + seconds;

                                  // Mark as edited if different from what's currently shown
                                  // OR if we're setting a custom value for the first time
                                  if (totalSeconds !== currentDisplayedDuration) {
                                    setEditedSongs(prev => ({
                                      ...prev,
                                      [song.id]: { ...prev[song.id], custom_duration: totalSeconds }
                                    }));
                                  }
                                } else if (value === '') {
                                  // Clear custom duration if field is empty
                                  if (song.custom_duration) {
                                    setEditedSongs(prev => ({
                                      ...prev,
                                      [song.id]: { ...prev[song.id], custom_duration: null }
                                    }));
                                  }
                                }
                              }}
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {song.custom_duration ? 'Custom override' : 'From Spotify'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Key</label>
                            <input
                              type="text"
                              placeholder="Am"
                              value={editedSongs[song.id]?.key ?? song.key ?? ''}
                              onChange={(e) => setEditedSongs(prev => ({
                                ...prev,
                                [song.id]: { ...prev[song.id], key: e.target.value }
                              }))}
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Tuning</label>
                            <select
                              value={editedSongs[song.id]?.tuning ?? song.tuning ?? 'standard'}
                              onChange={(e) => setEditedSongs(prev => ({
                                ...prev,
                                [song.id]: { ...prev[song.id], tuning: e.target.value }
                              }))}
                              className="w-full px-2 py-1 text-sm border border-border bg-background text-foreground rounded"
                            >
                              <option value="standard">Standard</option>
                              <option value="drop-d">Drop D</option>
                              <option value="eb">Eb</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Additional URL</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={editedSongs[song.id]?.additional_url ?? song.additionalUrl ?? ''}
                            onChange={(e) => setEditedSongs(prev => ({
                              ...prev,
                              [song.id]: { ...prev[song.id], additional_url: e.target.value }
                            }))}
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
                          <textarea
                            placeholder="Add notes about this song..."
                            value={editedSongs[song.id]?.notes ?? song.notes ?? ''}
                            onChange={(e) => setEditedSongs(prev => ({
                              ...prev,
                              [song.id]: { ...prev[song.id], notes: e.target.value }
                            }))}
                            rows={3}
                            className="w-full px-2 py-1 text-sm border rounded resize-none"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <a
                              href={song.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-green-600 hover:text-green-700 font-semibold text-sm"
                            >
                              <i className="fab fa-spotify"></i>
                              <span>Spotify</span>
                            </a>

                            {editedSongs[song.id] && (
                              <button
                                onClick={() => updateSongMutation.mutate({ songId: song.id, updates: editedSongs[song.id] })}
                                disabled={updateSongMutation.isPending}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-semibold"
                              >
                                Save
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteSong(song.id, song.spotifyId, song.title)}
                            className="text-red-600 hover:text-red-700 font-semibold text-sm"
                            disabled={deleteSongMutation.isPending}
                          >
                            <i className="fas fa-trash mr-1"></i>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isExpanded && currentView === 'pipeline' && (
                    <div className="px-4 pb-4 border-t bg-muted/50 animate-expand overflow-hidden">
                      <div className="pt-4 space-y-4 animate-fade-in-up">
                        {/* Current user controls */}
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-semibold text-foreground">Your status:</span>
                          <div className="flex items-center space-x-2">
                            {/* Readiness buttons */}
                            <div className="flex bg-background rounded-lg overflow-hidden border border-border">
                              {["red", "amber", "green"].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => updateReadinessMutation.mutate({ songId: song.id, status: status as any })}
                                  className={`px-3 py-2 text-sm font-semibold transition-colors ${
                                    userReadiness === status
                                      ? status === "green" ? "bg-green-500 text-white"
                                        : status === "amber" ? "bg-yellow-500 text-white"
                                        : "bg-red-500 text-white"
                                      : "hover:bg-muted"
                                  }`}
                                  disabled={updateReadinessMutation.isPending}
                                  data-testid={`button-readiness-${status}-${song.id}`}
                                >
                                  {status === "green" ? "🟢 Ready"
                                   : status === "amber" ? "🟡 Working"
                                   : "🔴 Not Ready"}
                                </button>
                              ))}
                            </div>

                            {/* Veto button */}
                            <button
                              onClick={() => toggleVetoMutation.mutate({ songId: song.id, hasVeto: userVeto })}
                              className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                                userVeto
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-muted hover:bg-muted/80"
                              }`}
                              disabled={toggleVetoMutation.isPending}
                              data-testid={`button-veto-${song.id}`}
                            >
                              💩
                            </button>
                          </div>
                        </div>

                        {/* All member statuses */}
                        <div>
                          <span className="font-sans font-semibold text-foreground block mb-2">Member readiness:</span>
                          <div className="grid grid-cols-2 gap-2">
                            {artistMembers.map((member) => {
                              const memberReadiness = song.readiness?.find(r => r.membershipId === member.id);
                              const memberVeto = song.vetos?.find(v => v.membershipId === member.id);

                              return (
                                <div key={member.id} className="flex items-center space-x-2" data-testid={`member-status-${member.id}-${song.id}`}>
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: member.color }}
                                  >
                                    <i className={`fas ${member.icon} text-white text-xs`}></i>
                                  </div>
                                  <span className="text-sm font-medium">{member.displayName}</span>
                                  <div className="flex items-center space-x-1">
                                    {memberReadiness && (
                                      <span className="text-sm">
                                        {memberReadiness.status === "green" ? "🟢"
                                         : memberReadiness.status === "amber" ? "🟡"
                                         : "🔴"}
                                      </span>
                                    )}
                                    {memberVeto && <span className="text-sm">💩</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2">
                          <a
                            href={song.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-semibold"
                            data-testid={`link-spotify-${song.id}`}
                          >
                            <i className="fab fa-spotify"></i>
                            <span>Open in Spotify</span>
                          </a>

                          <button
                            onClick={() => handleDeleteSong(song.id, song.spotifyId, song.title)}
                            className="text-red-600 hover:text-red-700 font-semibold"
                            disabled={deleteSongMutation.isPending}
                            data-testid={`button-delete-${song.id}`}
                          >
                            <i className="fas fa-trash mr-1"></i>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Add Song Modal */}
      <AddSongModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        artistId={artistId}
        membership={membership}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </div>
  );
}