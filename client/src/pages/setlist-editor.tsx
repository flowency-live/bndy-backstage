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
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [activeSetId, setActiveSetId] = useState<string>('');
  const sortableRefs = useRef<{ [key: string]: Sortable }>({});

  // Local working copy of setlist (for unsaved changes)
  const [workingSetlist, setWorkingSetlist] = useState<Setlist | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch setlist from database
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

      return data.map((item: any) => {
        const duration = item.globalSong?.duration || 0;
        console.log(`[PLAYBOOK] Song: "${item.globalSong?.title}" - Duration: ${duration}s - Has globalSong: ${!!item.globalSong}`);

        return {
          id: item.id,
          spotifyId: item.globalSong?.spotifyUrl || '',
          title: item.globalSong?.title || 'Unknown',
          artist: item.globalSong?.artistName || 'Unknown',
          album: item.globalSong?.album || '',
          spotifyUrl: item.globalSong?.spotifyUrl || '',
          imageUrl: item.globalSong?.albumImageUrl || null,
          duration: duration,
          tuning: item.tuning || 'standard',
        };
      }).sort((a: PlaybookSong, b: PlaybookSong) => (a.title || '').localeCompare(b.title || ''));
    },
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Initialize working copy when setlist loads
  useEffect(() => {
    if (setlist && !workingSetlist) {
      setWorkingSetlist(setlist);
      if (setlist.sets.length > 0 && !activeSetId) {
        setActiveSetId(setlist.sets[0].id);
      }
    }
  }, [setlist, workingSetlist, activeSetId]);

  // Warn user about unsaved changes when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
    onError: (error: Error) => {
      console.error('[SAVE] Mutation failed:', error);
      toast({
        title: "Failed to update setlist",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: (data, variables, context: any) => {
      console.log('[SAVE] Mutation succeeded, updating cache with:', data);
      // Update cache with server response
      queryClient.setQueryData(
        ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId],
        data
      );

      // Only show toast if this was a MANUAL save (not auto-save)
      if (context?.showToast) {
        toast({
          title: "Saved",
          description: "Changes saved successfully",
          duration: 2000,
        });
      }
    },
  });

  // Initialize Sortable for all sets when setlist loads
  // CRITICAL: Only depend on setlist (not workingSetlist) to avoid re-initialization on every change
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
        console.log(`[SORTABLE] Initializing Sortable for set: ${set.id}`);
        sortableRefs.current[set.id] = Sortable.create(element, {
          group: 'setlist-songs',
          // NO HANDLE - allow dragging entire card
          animation: 150,
          forceFallback: true,     // Better cross-browser support
          fallbackTolerance: 3,    // px to move before drag starts
          onStart: (evt) => {
            console.log('[SORTABLE] Drag started from:', evt.from.id, 'to:', evt.to?.id);
          },
          onEnd: (evt) => {
            console.log('[SORTABLE] Drag ended. From:', evt.from.id || 'no id', 'To:', evt.to.id);
            // Only call handleSongMove if reordering within THIS set
            // Don't call if from playbook (onAdd handles) or from another set (onAdd handles)
            const isFromThisSet = evt.from.id === `set-${set.id}`;
            const isToThisSet = evt.to.id === `set-${set.id}`;

            if (isFromThisSet && isToThisSet) {
              console.log('[SORTABLE] Reordering within same set');
              handleSongMove(evt, set.id);
            } else {
              console.log('[SORTABLE] onEnd skipped - cross-set or playbook drag handled by onAdd');
            }
          },
          onAdd: (evt) => {
            // This fires when something is added to this set from playbook OR another set
            console.log('[SORTABLE] onAdd fired! From:', evt.from.id || 'no id', 'To:', evt.to.id);

            // ALWAYS call handleSongMove from onAdd - it handles both playbook and cross-set drags
            handleSongMove(evt, set.id);
          },
        });
      }
    });

    // Initialize sortable for drawer (playbook) - each letter group
    const letterGroups = document.querySelectorAll('[data-letter-group]');
    console.log('[SORTABLE] Found', letterGroups.length, 'letter groups in playbook');

    letterGroups.forEach((groupElement, index) => {
      const letter = groupElement.getAttribute('data-letter-group');
      console.log(`[SORTABLE] Initializing Sortable for playbook group: ${letter}`);
      sortableRefs.current[`drawer-${letter}`] = Sortable.create(groupElement as HTMLElement, {
        group: {
          name: 'setlist-songs',
          pull: 'clone',
          put: false,
        },
        animation: 150,
        sort: false,
        forceFallback: true,
        draggable: '.playbook-song-card',  // Only song cards are draggable
      });
    });

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
  }, [setlist]); // Only re-initialize when setlist changes from server, not on local edits

  const handleSongMove = (evt: Sortable.SortableEvent, setId: string) => {
    console.log('🎵 handleSongMove triggered:', { setId, from: evt.from.id, to: evt.to.id, oldIndex: evt.oldIndex, newIndex: evt.newIndex });

    if (!workingSetlist) {
      console.error('❌ No working setlist found');
      return;
    }

    // Check if dragging from playbook (has data-letter-group attribute)
    const isFromPlaybook = evt.from.hasAttribute('data-letter-group');

    const fromSetId = isFromPlaybook ? 'playbook' : evt.from.id.replace('set-', '');
    const toSetId = evt.to.id.replace('set-', '');
    const oldIndex = evt.oldIndex ?? 0;
    const newIndex = evt.newIndex ?? 0;

    console.log('📍 IDs:', { fromSetId, toSetId, oldIndex, newIndex, isFromPlaybook });

    // Clone setlist for updates
    const updatedSets = [...workingSetlist.sets];
    const fromSet = isFromPlaybook ? null : updatedSets.find(s => s.id === fromSetId);
    const toSet = updatedSets.find(s => s.id === toSetId);

    if (!toSet) {
      console.error('❌ toSet not found');
      return;
    }

    console.log('📦 Before update - toSet songs:', toSet.songs.length);

    // If adding from playbook, create new song entry
    if (isFromPlaybook) {
      const songElement = evt.item;
      const songId = songElement.getAttribute('data-song-id');
      const playbookSong = playbookSongs.find(s => s.id === songId);

      console.log('[DRAG] Adding from playbook');
      console.log('[DRAG] Song ID:', songId);
      console.log('[DRAG] Found playbook song:', playbookSong);

      if (!playbookSong) {
        console.error('[DRAG] ERROR: Playbook song not found!');
        return;
      }

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

      // CRITICAL FIX: Create NEW set objects to trigger React re-render
      const immutableUpdatedSets = workingSetlist.sets.map(set => {
        if (set.id === toSetId) {
          const newSongs = [...(set.songs || [])];
          newSongs.splice(newIndex, 0, newSong);
          return {
            ...set,
            songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
          };
        }
        return set;
      });

      console.log('[DRAG] Updating local working copy (NOT saving to database)');

      // Remove clone safely - wrap in try-catch to prevent crashes
      if (evt.item && evt.item.parentNode) {
        try {
          console.log('[DRAG] Removing clone');
          evt.item.parentNode.removeChild(evt.item);
        } catch (e) {
          console.warn('[DRAG] Clone already removed by React:', e);
        }
      }

      // Update local state only - DO NOT save to database
      setWorkingSetlist({ ...workingSetlist, sets: immutableUpdatedSets });
      setHasUnsavedChanges(true);
      return;
    }

    // Moving within or between sets
    if (fromSet && toSet) {
      const movedSong = fromSet.songs?.[oldIndex];
      if (!movedSong) {
        console.error('[DRAG] Could not find moved song');
        return;
      }

      console.log('[DRAG] Song moved between/within sets');

      // CRITICAL FIX: Create NEW set objects to trigger React re-render
      const immutableUpdatedSets = workingSetlist.sets.map(set => {
        // Remove from source set
        if (set.id === fromSetId) {
          const newSongs = (set.songs || []).filter((_, idx) => idx !== oldIndex);
          return {
            ...set,
            songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
          };
        }
        // Add to destination set
        if (set.id === toSetId) {
          const newSongs = [...(set.songs || [])];
          newSongs.splice(newIndex, 0, movedSong);
          return {
            ...set,
            songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
          };
        }
        return set;
      });

      // Update local state only - DO NOT save to database
      setWorkingSetlist({ ...workingSetlist, sets: immutableUpdatedSets });
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveSong = (setId: string, songId: string) => {
    if (!workingSetlist) return;

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          songs: (set.songs || []).filter(s => s.id !== songId).map((song, idx) => ({
            ...song,
            position: idx,
          })),
        };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  const handleToggleSegue = (setId: string, songId: string) => {
    if (!workingSetlist) return;

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          songs: (set.songs || []).map(song =>
            song.id === songId ? { ...song, segueInto: !song.segueInto } : song
          ),
        };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  const handleUpdateName = () => {
    if (tempName.trim() && tempName !== workingSetlist?.name) {
      setWorkingSetlist({ ...workingSetlist!, name: tempName });
      setHasUnsavedChanges(true);
    }
    setEditingName(false);
  };

  // Quick add function for mobile tap-to-add
  const handleQuickAdd = (songId: string, e: React.MouseEvent) => {
    // Only handle click on mobile OR when explicitly clicking (not dragging)
    // Check if this was a drag operation by seeing if mouse moved
    const isDrag = e.type === 'click' && (e as any).detail === 0; // Detail is 0 for synthetic events from drag
    if (isDrag) return;

    if (!workingSetlist || !activeSetId) return;

    const playbookSong = playbookSongs.find(s => s.id === songId);
    if (!playbookSong) return;

    const activeSet = workingSetlist.sets.find(s => s.id === activeSetId);
    if (!activeSet) return;

    const newSong: SetlistSong = {
      id: `${Date.now()}-${Math.random()}`,
      song_id: playbookSong.id,
      title: playbookSong.title,
      artist: playbookSong.artist,
      duration: playbookSong.duration || 0,
      position: activeSet.songs?.length || 0,
      tuning: playbookSong.tuning || 'standard',
      segueInto: false,
      imageUrl: playbookSong.imageUrl,
    };

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === activeSetId) {
        return {
          ...set,
          songs: [...(set.songs || []), newSong],
        };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  // Save all changes to database
  const handleSave = () => {
    if (!workingSetlist || !hasUnsavedChanges) return;

    updateSetlistMutation.mutate(
      { sets: workingSetlist.sets, name: workingSetlist.name },
      {
        onSuccess: (data) => {
          console.log('[SAVE] Successfully saved to database');
          setHasUnsavedChanges(false);
          // Update the query cache with saved data
          queryClient.setQueryData(
            ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId],
            data
          );
          toast({
            title: "Saved",
            description: "Setlist saved successfully",
            duration: 2000,
          });
        },
      }
    );
  };

  // Discard all changes and reset to last saved state
  const handleCancel = () => {
    if (!setlist) return;

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to discard them?"
      );
      if (!confirmed) return;
    }

    // Reset working copy to saved version
    setWorkingSetlist(setlist);
    setHasUnsavedChanges(false);
    toast({
      title: "Changes discarded",
      description: "Setlist reset to last saved version",
      duration: 2000,
    });
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

  // Get all song IDs currently in the setlist (use working copy to reflect unsaved changes)
  const songsInSetlist = new Set(
    (workingSetlist || setlist)?.sets.flatMap(set => (set.songs || []).map(song => song.song_id)) || []
  );

  // Filter playbook songs based on search and "show all" toggle
  const filteredPlaybookSongs = playbookSongs.filter(song => {
    // Safety check
    if (!song || !song.title || !song.artist) return false;

    // Filter by search query
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by "show all" toggle
    const matchesFilter = showAllSongs || !songsInSetlist.has(song.id);

    return matchesSearch && matchesFilter;
  });

  // Group songs alphabetically
  const groupedSongs = filteredPlaybookSongs.reduce((acc, song) => {
    if (!song || !song.title) return acc;

    const firstLetter = song.title.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';

    if (!acc[letter]) {
      acc[letter] = [];
    }
    acc[letter].push(song);

    return acc;
  }, {} as Record<string, PlaybookSong[]>);

  const sortedLetters = Object.keys(groupedSongs).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

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
              <h1 className="text-2xl font-serif font-bold">{workingSetlist?.name || setlist.name}</h1>
              <button
                onClick={() => {
                  setTempName(workingSetlist?.name || setlist.name);
                  setEditingName(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Edit setlist name"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button
                onClick={handleSave}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save setlist"
                disabled={!hasUnsavedChanges || updateSetlistMutation.isPending}
              >
                <i className="fas fa-save mr-1"></i> Save
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Discard changes"
                disabled={!hasUnsavedChanges || updateSetlistMutation.isPending}
              >
                <i className="fas fa-times mr-1"></i> Cancel
              </button>
              {updateSetlistMutation.isPending && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  <i className="fas fa-spinner fa-spin"></i> Saving...
                </span>
              )}
              {hasUnsavedChanges && !updateSetlistMutation.isPending && (
                <span className="text-sm text-yellow-600">
                  <i className="fas fa-exclamation-circle mr-1"></i> Unsaved changes
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

        <div className={`flex gap-2 lg:gap-4 relative ${drawerOpen ? 'lg:flex-row' : 'flex-col lg:flex-row'}`}>
          {/* Sets area - 50% width on mobile when drawer is open */}
          <div className={`transition-all duration-300 ${drawerOpen ? 'w-1/2 lg:flex-1' : 'w-full lg:flex-1'} min-w-0`}>
            <div className="space-y-6">
              {(workingSetlist || setlist).sets.map((set) => {
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
                      <div className="flex items-center space-x-2">
                        {/* Active set radio button (mobile only) */}
                        <div className="lg:hidden">
                          <input
                            type="radio"
                            name="activeSet"
                            checked={activeSetId === set.id}
                            onChange={() => setActiveSetId(set.id)}
                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <h3 className="font-semibold">{set.name}</h3>
                      </div>
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
                      {set.songs?.map((song, idx) => (
                          <div key={song.id}>
                            <div
                              data-song-id={song.song_id}
                              className="flex items-center gap-2 bg-background border border-border rounded p-2 hover:border-orange-500/50 transition-colors select-none cursor-grab active:cursor-grabbing"
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

          {/* Playbook drawer - 50% width on mobile when open, always visible on desktop */}
          <div className={`transition-all duration-300 ${
            drawerOpen ? 'w-1/2 lg:w-80' : 'w-0 lg:w-80'
          } ${drawerOpen ? 'block' : 'hidden lg:block'} bg-card border-l border-border overflow-hidden`}>
            <div className="bg-orange-500 text-white p-2 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Playbook</h3>
                <p className="text-xs opacity-90 lg:block hidden">Drag or tap to add</p>
                <p className="text-xs opacity-90 lg:hidden">Tap to add to active set</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="lg:hidden text-white hover:bg-orange-600 p-2 rounded"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-2 border-b space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs..."
                className="w-full px-2 py-1.5 text-sm border border-border bg-background rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllSongs}
                  onChange={(e) => setShowAllSongs(e.target.checked)}
                  className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
                />
                <span className="text-foreground">Show songs already in setlist</span>
              </label>
            </div>

            <div className="p-2 h-[calc(100vh-220px)] lg:max-h-[600px] overflow-y-auto">
              {sortedLetters.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {searchQuery ? 'No songs found' : 'No songs available'}
                </div>
              )}
              {sortedLetters.map((letter) => (
                <div key={letter} className="mb-3">
                  {/* Letter header - sticky, NOT part of sortable */}
                  <div className="sticky top-0 bg-muted/90 backdrop-blur-sm px-2 py-1 mb-1 rounded text-xs font-bold text-foreground z-10 pointer-events-none">
                    {letter}
                  </div>
                  {/* Songs in this letter group - each group has its own sortable container */}
                  <div data-letter-group={letter} className="space-y-1">
                    {groupedSongs[letter].map((song) => {
                      const isInSetlist = songsInSetlist.has(song.id);
                      return (
                        <div
                          key={song.id}
                          data-song-id={song.id}
                          onClick={(e) => handleQuickAdd(song.id, e)}
                          className={`playbook-song-card flex items-center gap-2 bg-background border rounded p-2 transition-colors select-none ${
                            isInSetlist
                              ? 'border-green-500/30 opacity-60'
                              : 'border-border hover:border-orange-500/50 cursor-pointer lg:cursor-grab active:cursor-grabbing'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium truncate text-sm">{song.title}</div>
                              {isInSetlist && (
                                <i className="fas fa-check text-green-500 text-xs" title="Already in setlist"></i>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {song.duration ? formatDuration(song.duration) : '--'}
                          </div>
                        </div>
                      );
                    })}
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
