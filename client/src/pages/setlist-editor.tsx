import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout";
import type { ArtistMembership, Artist } from "@/types/api";
import type { Setlist, SetlistSet, SetlistSong, PlaybookSong } from "@/types/setlist";
import Sortable from "sortablejs";

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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Update setlist mutation with optimistic updates
  const updateSetlistMutation = useMutation({
    mutationFn: async (updates: Partial<Setlist>) => {
      console.log('[SAVE] Starting mutation with updates:', updates);
      console.log('[SAVE] Number of sets:', updates.sets?.length);
      updates.sets?.forEach((set, idx) => {
        console.log(`[SAVE] Set ${idx + 1}: "${set.name}" has ${set.songs.length} songs`);
        set.songs.forEach(song => {
          console.log(`[SAVE]   - ${song.title}: ${song.duration}s`);
        });
      });

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      console.log('[SAVE] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[SAVE] ERROR:', error);
        throw new Error(error.error || "Failed to update setlist");
      }

      const data = await response.json();
      console.log('[SAVE] Response data:', data);
      return data;
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId] });

      // Snapshot previous value
      const previousSetlist = queryClient.getQueryData(["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId]);

      // Optimistically update - force a new object reference to trigger re-render
      queryClient.setQueryData(["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          ...updates,
          updated_at: new Date().toISOString(), // Force React to see this as a new object
        };
      });

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
    onSuccess: (data) => {
      // Update cache with server response instead of invalidating
      queryClient.setQueryData(
        ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId],
        data
      );
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
          handle: '.drag-handle',  // Only drag from handle
          animation: 150,
          forceFallback: true,     // Better cross-browser support
          fallbackTolerance: 3,    // px to move before drag starts
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
        handle: '.drag-handle',    // Only drag from handle
        animation: 150,
        sort: false,
        forceFallback: true,       // Better touch support
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
    console.log('🎵 handleSongMove triggered:', { setId, from: evt.from.id, to: evt.to.id, oldIndex: evt.oldIndex, newIndex: evt.newIndex });

    if (!setlist) {
      console.error('❌ No setlist found');
      return;
    }

    const fromSetId = evt.from.id.replace('set-', '');
    const toSetId = evt.to.id.replace('set-', '');
    const oldIndex = evt.oldIndex ?? 0;
    const newIndex = evt.newIndex ?? 0;

    console.log('📍 IDs:', { fromSetId, toSetId, oldIndex, newIndex });

    // Clone setlist for updates
    const updatedSets = [...setlist.sets];
    const fromSet = updatedSets.find(s => s.id === fromSetId);
    const toSet = updatedSets.find(s => s.id === toSetId);

    if (!toSet) {
      console.error('❌ toSet not found');
      return;
    }

    console.log('📦 Before update - toSet songs:', toSet.songs.length);

    // If adding from drawer, create new song entry
    if (fromSetId === 'playbook-drawer') {
      const songElement = evt.item;
      const songId = songElement.getAttribute('data-song-id');
      const playbookSong = playbookSongs.find(s => s.id === songId);

      console.log('[DRAG] Adding from playbook');
      console.log('[DRAG] Song ID:', songId);
      console.log('[DRAG] Found playbook song:', playbookSong);

      if (playbookSong) {
        const newSong: SetlistSong = {
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
        console.log('[DRAG] Created new song object:', newSong);
        console.log('[DRAG] Song duration:', newSong.duration, 'seconds');
        toSet.songs.splice(newIndex, 0, newSong);
        console.log('[DRAG] Added to set. New songs array:', toSet.songs);
      } else {
        console.error('[DRAG] ERROR: Playbook song not found!');
      }
    } else if (fromSet && toSet) {
      // Moving within or between sets
      const [movedSong] = fromSet.songs.splice(oldIndex, 1);
      toSet.songs.splice(newIndex, 0, movedSong);
      console.log('[DRAG] Song moved between sets');
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

    console.log('📦 After update - toSet songs:', toSet.songs.length);
    console.log('🔄 Calling mutation with updated sets');

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

  const getSetTotalDuration = (set: SetlistSet): number => {
    if (!set.songs || set.songs.length === 0) {
      console.log(`[DURATION] Set "${set.name}" has no songs`);
      return 0;
    }

    const total = set.songs.reduce((sum, song) => {
      const duration = song?.duration || 0;
      console.log(`[DURATION] Song "${song.title}" duration: ${duration}s`);
      return sum + duration;
    }, 0);

    console.log(`[DURATION] Set "${set.name}" total: ${total}s from ${set.songs.length} songs`);
    return total;
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
                  if (setlist) {
                    updateSetlistMutation.mutate(
                      { sets: setlist.sets },
                      {
                        onSuccess: () => {
                          toast({ title: "Setlist saved", description: "All changes have been saved successfully" });
                        },
                      }
                    );
                  }
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium"
                title="Save setlist"
                disabled={updateSetlistMutation.isPending}
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

                console.log(`Set ${set.name}:`, {
                  songCount: set.songs.length,
                  totalDuration,
                  songs: set.songs.map(s => ({ title: s.title, duration: s.duration, position: s.position }))
                });

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
                              className="flex items-center gap-1 bg-background border border-border rounded p-1 hover:border-orange-500/50 transition-colors select-none"
                            >
                              {/* DRAG HANDLE */}
                              <div className="drag-handle cursor-grab active:cursor-grabbing p-2 -ml-1 touch-none hover:text-orange-500">
                                <i className="fas fa-grip-vertical text-sm text-muted-foreground"></i>
                              </div>

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
                  className="flex items-center gap-1 bg-background border border-border rounded p-1 hover:border-orange-500/50 transition-colors select-none"
                >
                  {/* DRAG HANDLE */}
                  <div className="drag-handle cursor-grab active:cursor-grabbing p-2 touch-none hover:text-orange-500">
                    <i className="fas fa-grip-vertical text-sm text-muted-foreground"></i>
                  </div>

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
