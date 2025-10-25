import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout";
import type { ArtistMembership, Artist } from "@/types/api";
import Sortable from "sortablejs";

interface Song {
  id: string;
  song_id: string;
  title: string;
  artist: string;
  duration: number;
  position: number;
  tuning?: string;
  segueInto?: boolean; // True if this song segues into the next one
  imageUrl?: string;
}

interface Set {
  id: string;
  name: string;
  targetDuration: number;
  songs: Song[];
}

interface Setlist {
  id: string;
  artist_id: string;
  name: string;
  sets: Set[];
  created_by_membership_id?: string;
  created_at: string;
  updated_at: string;
}

interface PlaybookSong {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  spotifyUrl: string;
  imageUrl?: string;
  duration?: number;
  bpm?: number;
  key?: string;
  tuning?: string;
}

interface SetlistEditorProps {
  artistId: string;
  setlistId: string;
  membership: ArtistMembership & { artist: Artist };
}

// Helper function to format duration in seconds to MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Calculate duration difference percentage
function getDurationVariance(actual: number, target: number): number {
  if (target === 0) return 0;
  return ((actual - target) / target) * 100;
}

// Get color class based on variance
function getVarianceColor(variance: number): string {
  const absVariance = Math.abs(variance);
  if (absVariance <= 5) return 'text-blue-500';
  if (absVariance <= 20) return 'text-yellow-500';
  return 'text-red-500';
}

export default function SetlistEditor({ artistId, setlistId, membership }: SetlistEditorProps) {
  useSectionTheme('songs');

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sortableRefs = useRef<{ [key: string]: Sortable }>({});

  // Fetch setlist
  const { data: setlist, isLoading: setlistLoading } = useQuery<Setlist>({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId],
    queryFn: async () => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch setlist");
      }

      return response.json();
    },
    enabled: !!artistId && !!setlistId,
  });

  // Fetch playbook songs
  const { data: playbookSongs = [], isLoading: songsLoading } = useQuery<PlaybookSong[]>({
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

      return data.map((item: any) => ({
        id: item.id,
        spotifyId: item.globalSong?.spotifyUrl || '',
        title: item.globalSong?.title || 'Unknown',
        artist: item.globalSong?.artistName || 'Unknown',
        album: item.globalSong?.album || '',
        spotifyUrl: item.globalSong?.spotifyUrl || '',
        imageUrl: item.globalSong?.albumImageUrl || null,
        duration: item.globalSong?.duration || 0,
        bpm: item.globalSong?.metadata?.bpm || null,
        key: item.globalSong?.metadata?.key || null,
        tuning: item.tuning || 'standard',
      })).sort((a: PlaybookSong, b: PlaybookSong) => (a.title || '').localeCompare(b.title || ''));
    },
    enabled: !!artistId,
  });

  // Update setlist mutation with optimistic updates
  const updateSetlistMutation = useMutation({
    mutationFn: async (updates: Partial<Setlist>) => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update setlist");
      }

      return response.json();
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId] });

      // Snapshot previous value
      const previousSetlist = queryClient.getQueryData(["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId]);

      // Optimistically update
      queryClient.setQueryData(["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId], (old: any) => ({
        ...old,
        ...updates,
      }));

      return { previousSetlist };
    },
    onError: (error: Error, _updates, context) => {
      // Rollback on error
      queryClient.setQueryData(["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId], context?.previousSetlist);
      toast({
        title: "Failed to update setlist",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId] });
    },
  });

  // Initialize Sortable for all sets when setlist loads
  useEffect(() => {
    if (!setlist) return;

    // Clean up existing sortables safely
    Object.values(sortableRefs.current).forEach(sortable => {
      if (sortable && typeof sortable.destroy === 'function') {
        try {
          sortable.destroy();
        } catch (e) {
          console.warn('Failed to destroy sortable:', e);
        }
      }
    });
    sortableRefs.current = {};

    // Initialize sortable for each set
    setlist.sets.forEach((set) => {
      const element = document.getElementById(`set-${set.id}`);
      if (element) {
        sortableRefs.current[set.id] = Sortable.create(element, {
          group: 'setlist-songs',
          animation: 150,
          onEnd: (evt) => handleSongMove(evt, set.id),
        });
      }
    });

    // Initialize sortable for drawer (playbook)
    const drawerElement = document.getElementById('playbook-drawer');
    if (drawerElement) {
      sortableRefs.current['drawer'] = Sortable.create(drawerElement, {
        group: {
          name: 'setlist-songs',
          pull: 'clone',
          put: false,
        },
        animation: 150,
        sort: false,
      });
    }

    return () => {
      Object.values(sortableRefs.current).forEach(sortable => {
        if (sortable && typeof sortable.destroy === 'function') {
          try {
            sortable.destroy();
          } catch (e) {
            console.warn('Failed to destroy sortable on cleanup:', e);
          }
        }
      });
    };
  }, [setlist]);

  const handleSongMove = (evt: Sortable.SortableEvent, setId: string) => {
    if (!setlist) return;

    const fromSetId = evt.from.id.replace('set-', '');
    const toSetId = evt.to.id.replace('set-', '');
    const oldIndex = evt.oldIndex ?? 0;
    const newIndex = evt.newIndex ?? 0;

    // Clone setlist for updates
    const updatedSets = [...setlist.sets];
    const fromSet = updatedSets.find(s => s.id === fromSetId);
    const toSet = updatedSets.find(s => s.id === toSetId);

    if (!toSet) return;

    // If adding from drawer, create new song entry
    if (fromSetId === 'playbook-drawer') {
      const songElement = evt.item;
      const songId = songElement.getAttribute('data-song-id');
      const playbookSong = playbookSongs.find(s => s.id === songId);

      if (playbookSong) {
        const newSong: Song = {
          id: `${Date.now()}-${Math.random()}`,
          song_id: playbookSong.id,
          title: playbookSong.title,
          artist: playbookSong.artist,
          duration: playbookSong.duration || 0,
          position: newIndex,
          tuning: playbookSong.tuning || 'standard',
          segueInto: false,
          imageUrl: playbookSong.imageUrl,
        };
        toSet.songs.splice(newIndex, 0, newSong);
      }
    } else if (fromSet && toSet) {
      // Moving within or between sets
      const [movedSong] = fromSet.songs.splice(oldIndex, 1);
      toSet.songs.splice(newIndex, 0, movedSong);
    }

    // Update positions and filter out any undefined songs
    updatedSets.forEach(set => {
      set.songs = set.songs.filter(song => song !== undefined && song !== null);
      set.songs.forEach((song, idx) => {
        if (song) {
          song.position = idx;
        }
      });
    });

    updateSetlistMutation.mutate({ sets: updatedSets });
  };

  const handleRemoveSong = (setId: string, songId: string) => {
    if (!setlist) return;

    const updatedSets = setlist.sets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          songs: set.songs.filter(s => s.id !== songId).map((song, idx) => ({
            ...song,
            position: idx,
          })),
        };
      }
      return set;
    });

    updateSetlistMutation.mutate({ sets: updatedSets });
  };

  const handleToggleSegue = (setId: string, songId: string) => {
    if (!setlist) return;

    const updatedSets = setlist.sets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          songs: set.songs.map(song =>
            song.id === songId ? { ...song, segueInto: !song.segueInto } : song
          ),
        };
      }
      return set;
    });

    updateSetlistMutation.mutate({ sets: updatedSets });
  };

  const handleUpdateName = () => {
    if (tempName.trim() && tempName !== setlist?.name) {
      updateSetlistMutation.mutate({ name: tempName });
    }
    setEditingName(false);
  };

  const getSetTotalDuration = (set: Set): number => {
    if (!set.songs || set.songs.length === 0) return 0;
    return set.songs.reduce((total, song) => total + (song?.duration || 0), 0);
  };

  // Filter playbook songs based on search
  const filteredPlaybookSongs = playbookSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (setlistLoading || songsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <i className="fas fa-spinner fa-spin text-4xl text-orange-500"></i>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Setlist not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          {editingName ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="text-2xl font-serif font-bold bg-background border border-border rounded px-2 py-1"
                autoFocus
              />
              <button
                onClick={handleUpdateName}
                className="text-green-500 hover:text-green-600"
              >
                <i className="fas fa-check"></i>
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-red-500 hover:text-red-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setLocation("/setlists")}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h1 className="text-2xl font-serif font-bold">{setlist.name}</h1>
              <button
                onClick={() => {
                  setTempName(setlist.name);
                  setEditingName(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Edit setlist name"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button
                onClick={() => {
                  // Force a refetch to ensure data is saved
                  queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId] });
                  toast({ title: "Setlist saved", description: "All changes have been saved" });
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium"
                title="Save setlist"
              >
                <i className="fas fa-save mr-1"></i> Save
              </button>
              {updateSetlistMutation.isPending && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  <i className="fas fa-spinner fa-spin"></i> Auto-saving...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Toggle drawer button (mobile) */}
        <div className="mb-4 lg:hidden">
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium flex items-center justify-center space-x-2"
          >
            <i className={`fas fa-${drawerOpen ? 'times' : 'music'}`}></i>
            <span>{drawerOpen ? 'Close Playbook' : 'Add Songs from Playbook'}</span>
          </button>
        </div>

        {/* Backdrop for mobile drawer */}
        {drawerOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <div className="flex gap-4 relative">
          {/* Sets area */}
          <div className="flex-1 min-w-0">
            <div className="space-y-6">
              {setlist.sets.map((set) => {
                const totalDuration = getSetTotalDuration(set);
                const variance = getDurationVariance(totalDuration, set.targetDuration);
                const varianceColor = getVarianceColor(variance);

                return (
                  <div key={set.id} className="bg-card border border-border rounded overflow-hidden">
                    <div className="bg-muted/30 p-3 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">{set.name}</h3>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className={`font-medium ${varianceColor}`}>
                          {formatDuration(totalDuration)} / {formatDuration(set.targetDuration)}
                          <span className="ml-1">({variance > 0 ? '+' : ''}{variance.toFixed(0)}%)</span>
                        </div>
                        <span className="text-muted-foreground">
                          {set.songs.length} song{set.songs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div id={`set-${set.id}`} className="p-2 min-h-[100px] space-y-1">
                      {set.songs.map((song, idx) => (
                          <div key={song.id}>
                            <div
                              data-song-id={song.song_id}
                              className="flex items-center space-x-2 bg-background border border-border rounded p-2 hover:border-orange-500/50 transition-colors cursor-move"
                            >
                              {/* Position number */}
                              <div className="w-6 text-center text-sm font-bold text-foreground">
                                {idx + 1}.
                              </div>

                              {song.imageUrl && (
                                <img
                                  src={song.imageUrl}
                                  alt={song.title}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <div className="font-medium truncate text-sm">{song.title}</div>
                                  {song.tuning && song.tuning !== 'standard' && (
                                    <span className="px-1.5 py-0.5 text-xs font-semibold bg-yellow-500 text-black rounded">
                                      {song.tuning === 'drop-d' ? 'Drop D' : song.tuning.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
                              </div>
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {song.duration ? formatDuration(song.duration) : '0:00'}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSegue(set.id, song.id);
                                }}
                                className={`p-1 ${song.segueInto ? 'text-blue-500' : 'text-muted-foreground'} hover:text-blue-600`}
                                title={song.segueInto ? 'Click to break segue' : 'Click to segue into next song'}
                              >
                                <i className="fas fa-arrow-down"></i>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSong(set.id, song.id);
                                }}
                                className="text-red-500 hover:text-red-600 p-1"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                            {song.segueInto && idx < set.songs.length - 1 && (
                              <div className="flex items-center justify-center py-0.5">
                                <div className="flex items-center space-x-2 text-blue-500 text-xs">
                                  <div className="w-12 h-0.5 bg-blue-500"></div>
                                  <i className="fas fa-chevron-down text-xs"></i>
                                  <div className="w-12 h-0.5 bg-blue-500"></div>
                                  <span className="text-xs font-semibold">SEGUE</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Playbook drawer - slide-in from right on mobile, always visible on desktop */}
          <div className={`fixed lg:relative top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl lg:shadow-none transform transition-transform duration-300 z-40 ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          } lg:translate-x-0 lg:block overflow-hidden`}>
            <div className="bg-orange-500 text-white p-2 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Playbook</h3>
                <p className="text-xs opacity-90">Drag songs to add to sets</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="lg:hidden text-white hover:bg-orange-600 p-2 rounded"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-2 border-b">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs..."
                className="w-full px-2 py-1.5 text-sm border border-border bg-background rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div id="playbook-drawer" className="p-2 h-[calc(100vh-180px)] lg:max-h-[600px] overflow-y-auto space-y-1">
              {filteredPlaybookSongs.map((song) => (
                <div
                  key={song.id}
                  data-song-id={song.id}
                  className="flex items-center space-x-2 bg-background border border-border rounded p-2 hover:border-orange-500/50 transition-colors cursor-move"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{song.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {song.duration ? formatDuration(song.duration) : '--'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
