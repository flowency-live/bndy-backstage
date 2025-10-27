import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { PageHeader } from "@/components/layout";
import type { ArtistMembership, Artist } from "@/types/api";
import type { Setlist, SetlistSet, SetlistSong, PlaybookSong } from "@/types/setlist";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Sortable song card component
function SortableSongCard({ song, setId, idx, onToggleSegue, onRemove, showSegue, isOver, drawerOpen, isEditing, editValue, onStartEdit, onEditChange, onFinishEdit }: {
  song: SetlistSong;
  setId: string;
  idx: number;
  onToggleSegue: (setId: string, songId: string) => void;
  onRemove: (setId: string, songId: string) => void;
  showSegue: boolean;
  isOver: boolean;
  drawerOpen: boolean;
  isEditing: boolean;
  editValue: string;
  onStartEdit: (songId: string, currentTitle: string) => void;
  onEditChange: (value: string) => void;
  onFinishEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Insertion indicator - shows where drop will happen */}
      {isOver && (
        <div className="h-1 bg-orange-500 rounded-full mb-1 shadow-lg"></div>
      )}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-1 sm:gap-2 bg-background border border-border rounded p-1 sm:p-2 hover:border-orange-500/50 transition-colors select-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        {/* Position number */}
        <div className="w-5 sm:w-6 text-center text-xs sm:text-sm font-bold text-foreground shrink-0">
          {idx + 1}.
        </div>

        <div className="flex-1 min-w-0 group">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onFinishEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFinishEdit();
                if (e.key === 'Escape') onFinishEdit();
              }}
              className="w-full px-1 py-0.5 text-xs border border-orange-500 rounded"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-1">
              <div className="font-medium truncate text-xs">{song.title}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(song.id, song.title);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-orange-500 shrink-0"
                title="Edit title"
              >
                <i className="fas fa-edit text-[10px]"></i>
              </button>
            </div>
          )}
        </div>
        {!drawerOpen && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {song.tuning && song.tuning !== 'standard' && (
              <span className={`py-0.5 text-[10px] font-bold rounded shrink-0 whitespace-nowrap ${
                song.tuning === 'drop-d' ? 'bg-yellow-400 text-black px-1.5' :
                song.tuning === 'eb' ? 'bg-blue-500 text-white px-2' :
                'bg-gray-400 text-black px-1.5'
              }`}>
                {song.tuning === 'drop-d' ? '↓D' : song.tuning === 'eb' ? 'E♭' : song.tuning.toUpperCase()}
              </span>
            )}
            <span>{(song.custom_duration || song.duration) ? formatDuration(song.custom_duration || song.duration) : '0:00'}</span>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSegue(setId, song.id);
          }}
          className={`p-0.5 sm:p-1 ${song.segueInto ? 'text-blue-500' : 'text-muted-foreground'} hover:text-blue-600 shrink-0`}
          title={song.segueInto ? 'Click to break segue' : 'Click to segue into next song'}
        >
          <i className="fas fa-arrow-down text-xs"></i>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(setId, song.id);
          }}
          className="text-red-500 hover:text-red-600 p-0.5 sm:p-1 shrink-0"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>
      {showSegue && (
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
  );
}

// Draggable playbook song card
function DraggablePlaybookSong({ song, isInSetlist, onQuickAdd }: {
  song: PlaybookSong;
  isInSetlist: boolean;
  onQuickAdd: (songId: string, e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: `playbook-${song.id}` });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const combinedStyle = {
    ...style,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      {...attributes}
      {...listeners}
      onClick={(e) => onQuickAdd(song.id, e)}
      className={`flex items-center gap-1 sm:gap-2 bg-background border rounded p-1 sm:p-2 transition-colors select-none ${
        isInSetlist
          ? 'border-green-500/30 opacity-60'
          : 'border-border hover:border-orange-500/50 cursor-pointer lg:cursor-grab active:cursor-grabbing'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="font-medium truncate text-xs">{song.title}</div>
          {song.tuning && song.tuning !== 'standard' && (
            <span className={`py-0.5 text-[10px] font-bold rounded shrink-0 whitespace-nowrap ${
              song.tuning === 'drop-d' ? 'bg-yellow-400 text-black px-1.5' :
              song.tuning === 'eb' ? 'bg-blue-500 text-white px-2' :
              'bg-gray-400 text-black px-1.5'
            }`}>
              {song.tuning === 'drop-d' ? '↓D' : song.tuning === 'eb' ? 'E♭' : song.tuning.toUpperCase()}
            </span>
          )}
          {isInSetlist && (
            <i className="fas fa-check text-green-500 text-xs shrink-0" title="Already in setlist"></i>
          )}
        </div>
      </div>
    </div>
  );
}

// Droppable container for sets (allows dropping into empty sets)
function DroppableSetContainer({ setId, children }: {
  setId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `set-container-${setId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`px-0 py-1 min-h-[100px] space-y-1 transition-colors ${
        isOver ? 'bg-orange-500/10 border-2 border-dashed border-orange-500' : ''
      }`}
    >
      {children}
    </div>
  );
}

export default function SetlistEditor({ artistId, setlistId, membership }: SetlistEditorProps) {
  useSectionTheme('songs');

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [activeSetId, setActiveSetId] = useState<string>('');
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set());
  const [editingTargetDuration, setEditingTargetDuration] = useState<string | null>(null);
  const [tempTargetDuration, setTempTargetDuration] = useState<number>(0);
  const [editingSongTitle, setEditingSongTitle] = useState<string | null>(null);
  const [tempSongTitle, setTempSongTitle] = useState<string>('');

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Local working copy of setlist (for unsaved changes)
  const [workingSetlist, setWorkingSetlist] = useState<Setlist | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 400, // Long delay to allow scrolling on mobile
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch setlist from database
  const { data: setlist, isLoading: setlistLoading } = useQuery<Setlist>({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId, "v3"],
    queryFn: async () => {
      console.log('[SETLIST EDIT] ========== START API FETCH (SETLIST) ==========');
      console.log('[SETLIST EDIT] Fetching from:', `https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}`);

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.log('[SETLIST EDIT] API FAILED:', response.status, response.statusText);
        throw new Error("Failed to fetch setlist");
      }

      console.log('[SETLIST EDIT] API response received, parsing JSON...');
      const setlistData = await response.json();

      console.log('[SETLIST EDIT] Raw API data:', JSON.stringify(setlistData, null, 2));
      console.log('[SETLIST EDIT] Setlist name:', setlistData.name);
      console.log('[SETLIST EDIT] Number of sets:', setlistData.sets?.length || 0);

      const allSongs: any[] = [];
      setlistData.sets?.forEach((set: any, setIdx: number) => {
        console.log(`[SETLIST EDIT] --- Set ${setIdx + 1}: "${set.name}" ---`);
        console.log(`[SETLIST EDIT] Set has ${set.songs?.length || 0} songs`);

        set.songs?.forEach((song: any, songIdx: number) => {
          allSongs.push(song);
          const tuning = song.tuning || 'UNDEFINED';
          console.log(`[SETLIST EDIT]   Song ${songIdx + 1}: "${song.title}" | duration: ${song.duration || 'NONE'}s | tuning: ${tuning}`);

          if (song.tuning && song.tuning !== 'standard') {
            console.log(`[SETLIST EDIT]   *** NON-STANDARD TUNING DETECTED: ${song.tuning} ***`);
          }
        });
      });

      const nonStandardCount = allSongs.filter(s => s.tuning !== 'standard').length;
      const totalDuration = allSongs.reduce((sum, s) => sum + (s.duration || 0), 0);
      console.log(`[SETLIST EDIT] Summary: ${allSongs.length} total songs, ${totalDuration}s total, ${nonStandardCount} non-standard tunings`);
      console.log('[SETLIST EDIT] ========== END API FETCH (SETLIST) ==========');

      return setlistData;
    },
    enabled: !!artistId && !!setlistId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: undefined,
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

      if (!Array.isArray(data)) {
        console.error('[SETLIST EDIT PLAYBOOK] Invalid response');
        return [];
      }

      console.log('[SETLIST EDIT PLAYBOOK] Raw response:', data.length, 'songs');

      const validItems = data.filter(item => item && item.globalSong);

      const mappedItems = validItems.map((item: any) => {
        const tuning = item.tuning || 'standard';
        if (tuning !== 'standard') {
          console.log(`[SETLIST EDIT PLAYBOOK] Non-standard tuning: "${item.globalSong?.title}" -> ${tuning}`);
        }

        return {
          id: item.id,
          spotifyId: item.globalSong?.spotifyUrl || '',
          title: item.globalSong?.title || 'Unknown',
          artist: item.globalSong?.artistName || 'Unknown',
          album: item.globalSong?.album || '',
          spotifyUrl: item.globalSong?.spotifyUrl || '',
          imageUrl: item.globalSong?.albumImageUrl || null,
          duration: item.globalSong?.duration || 0,
          tuning: tuning,
        };
      });

      const safeItems = mappedItems.filter(item => item && item.title);
      console.log('[SETLIST EDIT PLAYBOOK] Transformed:', safeItems.filter(s => s.tuning !== 'standard').length, 'non-standard tunings');

      return safeItems.sort((a, b) => a.title.localeCompare(b.title));
    },
    enabled: !!artistId,
    staleTime: 0, // Always refetch - don't use stale cache
    gcTime: 60 * 1000, // Keep in cache for 1 minute only
    refetchOnMount: 'always', // Force refetch when component mounts
  });

  // Initialize working copy when setlist loads
  useEffect(() => {
    console.log('[SETLIST EDIT SYNC] ========== SYNC EFFECT TRIGGERED ==========');
    console.log('[SETLIST EDIT SYNC] setlist exists:', !!setlist);
    console.log('[SETLIST EDIT SYNC] workingSetlist exists:', !!workingSetlist);
    console.log('[SETLIST EDIT SYNC] hasUnsavedChanges:', hasUnsavedChanges);

    if (setlist) {
      // Initialize workingSetlist if it doesn't exist
      if (!workingSetlist) {
        console.log('[SETLIST EDIT SYNC] Initializing workingSetlist from setlist...');
        const allSongs: any[] = [];
        setlist.sets?.forEach((set: any) => {
          set.songs?.forEach((song: any) => {
            allSongs.push(song);
          });
        });
        console.log('[SETLIST EDIT SYNC] Copying', allSongs.length, 'songs to workingSetlist');
        allSongs.forEach((song, idx) => {
          console.log(`[SETLIST EDIT SYNC]   Song ${idx + 1}: "${song.title}" | tuning: ${song.tuning || 'UNDEFINED'}`);
        });

        setWorkingSetlist(setlist);
        if (setlist.sets.length > 0 && !activeSetId) {
          setActiveSetId(setlist.sets[0].id);
        }
      }
      // Update workingSetlist with fresh data if no unsaved changes
      else if (!hasUnsavedChanges) {
        console.log('[SETLIST EDIT SYNC] Updating workingSetlist from setlist (no unsaved changes)...');
        const allSongs: any[] = [];
        setlist.sets?.forEach((set: any) => {
          set.songs?.forEach((song: any) => {
            allSongs.push(song);
          });
        });
        console.log('[SETLIST EDIT SYNC] Updating with', allSongs.length, 'songs');
        allSongs.forEach((song, idx) => {
          console.log(`[SETLIST EDIT SYNC]   Song ${idx + 1}: "${song.title}" | tuning: ${song.tuning || 'UNDEFINED'}`);
        });

        setWorkingSetlist(setlist);
      } else {
        console.log('[SETLIST EDIT SYNC] Skipping sync - has unsaved changes');
      }
    }
    console.log('[SETLIST EDIT SYNC] ========== END SYNC EFFECT ==========');
  }, [setlist, workingSetlist, activeSetId, hasUnsavedChanges]);

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

  // Drag event handlers
  const handleDragStart = (event: DragStartEvent) => {
    console.log('[DND] Drag started:', event.active.id);
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setOverId(null);
      return;
    }

    setOverId(over.id as string);
    console.log('[DND] Drag over:', { active: active.id, over: over.id });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[DND] Drag ended:', { active: active.id, over: over?.id });

    setActiveId(null);
    setOverId(null);

    if (!over || !workingSetlist) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Check if dragging from playbook (id starts with 'playbook-')
    const isFromPlaybook = activeIdStr.startsWith('playbook-');
    const songId = isFromPlaybook ? activeIdStr.replace('playbook-', '') : activeIdStr;

    // Find which set the item was dropped over
    let targetSetId: string | null = null;
    let targetIndex = 0;

    // Check if dropped directly on a set container
    if (overIdStr.startsWith('set-container-')) {
      targetSetId = overIdStr.replace('set-container-', '');
      // Find the set to determine if we should add to beginning or end
      const targetSet = workingSetlist.sets.find(s => s.id === targetSetId);
      targetIndex = targetSet && targetSet.songs.length > 0 ? targetSet.songs.length : 0;
    } else {
      // Dropped on a song - find which set and position
      for (const set of workingSetlist.sets) {
        const songIndex = set.songs.findIndex(s => s.id === overIdStr);
        if (songIndex !== -1) {
          targetSetId = set.id;
          targetIndex = songIndex; // Insert before the song we're over (matches visual indicator above)
          break;
        }
      }
    }

    if (!targetSetId) {
      console.warn('[DND] Could not determine target set');
      return;
    }

    if (isFromPlaybook) {
      // Adding from playbook
      handleAddFromPlaybook(songId, targetSetId, targetIndex);
    } else {
      // Moving within or between sets
      handleMoveSong(songId, targetSetId, targetIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const handleAddFromPlaybook = (songId: string, targetSetId: string, targetIndex: number) => {
    const playbookSong = playbookSongs.find(s => s.id === songId);

    if (!playbookSong || !workingSetlist) {
      console.error('[DND] Playbook song not found:', songId);
      return;
    }

    const newSong: SetlistSong = {
      id: `${Date.now()}-${Math.random()}`,
      song_id: playbookSong.id,
      title: playbookSong.title,
      artist: playbookSong.artist,
      duration: playbookSong.duration || 0,
      position: targetIndex,
      tuning: playbookSong.tuning || 'standard',
      segueInto: false,
      imageUrl: playbookSong.imageUrl,
    };

    console.log('[DND] Adding from playbook:', newSong.title, 'to set', targetSetId, 'at index', targetIndex);

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === targetSetId) {
        const newSongs = [...set.songs];
        newSongs.splice(targetIndex, 0, newSong);
        return {
          ...set,
          songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
        };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  const handleMoveSong = (songId: string, targetSetId: string, targetIndex: number) => {
    if (!workingSetlist) return;

    // Find source set and song
    let sourceSetId: string | null = null;
    let sourceIndex = -1;
    let songToMove: SetlistSong | null = null;

    for (const set of workingSetlist.sets) {
      const idx = set.songs.findIndex(s => s.id === songId);
      if (idx !== -1) {
        sourceSetId = set.id;
        sourceIndex = idx;
        songToMove = set.songs[idx];
        break;
      }
    }

    if (!songToMove || !sourceSetId) {
      console.warn('[DND] Could not find source song:', songId);
      return;
    }

    // If moving within same set and to same position, do nothing
    if (sourceSetId === targetSetId && sourceIndex === targetIndex) {
      console.log('[DND] Same position, no change needed');
      return;
    }

    console.log('[DND] Moving song:', songToMove.title, 'from', sourceSetId, sourceIndex, 'to', targetSetId, targetIndex);

    const updatedSets = workingSetlist.sets.map(set => {
      // Remove from source set
      if (set.id === sourceSetId) {
        const newSongs = set.songs.filter(s => s.id !== songId);

        // If source and target are same set, we need to adjust target index
        if (sourceSetId === targetSetId) {
          const adjustedIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
          newSongs.splice(adjustedIndex, 0, songToMove);
          return {
            ...set,
            songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
          };
        }

        return {
          ...set,
          songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
        };
      }

      // Add to target set (if different from source)
      if (set.id === targetSetId && sourceSetId !== targetSetId) {
        const newSongs = [...set.songs];
        newSongs.splice(targetIndex, 0, songToMove);
        return {
          ...set,
          songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
        };
      }

      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
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

  const handleStartEditSongTitle = (songId: string, currentTitle: string) => {
    setEditingSongTitle(songId);
    setTempSongTitle(currentTitle);
  };

  const handleEditSongTitleChange = (value: string) => {
    setTempSongTitle(value);
  };

  const handleFinishEditSongTitle = () => {
    if (!workingSetlist || !editingSongTitle) return;

    const trimmedTitle = tempSongTitle.trim();
    if (trimmedTitle && trimmedTitle !== editingSongTitle) {
      const updatedSets = workingSetlist.sets.map(set => ({
        ...set,
        songs: set.songs.map(song =>
          song.id === editingSongTitle ? { ...song, title: trimmedTitle } : song
        ),
      }));

      setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
      setHasUnsavedChanges(true);
    }

    setEditingSongTitle(null);
    setTempSongTitle('');
  };

  const handleUpdateName = () => {
    if (tempName.trim() && tempName !== workingSetlist?.name) {
      setWorkingSetlist({ ...workingSetlist!, name: tempName });
      setHasUnsavedChanges(true);
    }
    setEditingName(false);
  };

  const toggleSetCollapse = (setId: string) => {
    setCollapsedSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(setId)) {
        newSet.delete(setId);
      } else {
        newSet.add(setId);
      }
      return newSet;
    });
  };

  const handleUpdateTargetDuration = (setId: string, newDuration: number) => {
    if (!workingSetlist || newDuration < 0) return;

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === setId) {
        return { ...set, targetDuration: newDuration };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
    setEditingTargetDuration(null);
  };

  // Quick add function for mobile tap-to-add
  const handleQuickAdd = (songId: string, e: React.MouseEvent) => {
    // Only handle click on mobile OR when explicitly clicking (not dragging)
    const isDrag = e.type === 'click' && (e as any).detail === 0;
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
      return 0;
    }

    const total = set.songs.reduce((sum, song) => {
      const duration = song?.duration || 0;
      return sum + duration;
    }, 0);

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

  // Create all droppable IDs for DndContext
  const allDroppableIds = [
    ...(workingSetlist || setlist).sets.flatMap(set => [
      `set-container-${set.id}`,
      ...set.songs.map(song => song.id)
    ]),
    ...filteredPlaybookSongs.map(song => `playbook-${song.id}`)
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
        <div className="max-w-6xl mx-auto px-0 sm:px-6 py-2 sm:py-8">
          {/* Header */}
          <div className="mb-2 px-2 sm:px-0 sm:mb-6">
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
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={async () => {
                      if (hasUnsavedChanges) {
                        const confirmed = await confirm({
                          title: 'Unsaved Changes',
                          description: 'You have unsaved changes. Are you sure you want to leave without saving?',
                          confirmText: 'Discard Changes',
                          variant: 'destructive',
                        });
                        if (!confirmed) return;
                      }
                      setLocation("/setlists");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  {/* Hide setlist name on mobile when drawer is open */}
                  <h1 className={`text-lg sm:text-2xl font-serif font-bold ${drawerOpen ? 'hidden sm:block' : ''}`}>
                    {workingSetlist?.name || setlist.name}
                  </h1>
                  <button
                    onClick={() => {
                      setTempName(workingSetlist?.name || setlist.name);
                      setEditingName(true);
                    }}
                    className={`text-muted-foreground hover:text-foreground ${drawerOpen ? 'hidden sm:inline-block' : ''}`}
                    title="Edit setlist name"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={handleSave}
                    className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save setlist"
                    disabled={!hasUnsavedChanges || updateSetlistMutation.isPending}
                  >
                    <i className="fas fa-save"></i>
                    <span className="ml-1 hidden sm:inline">Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Discard changes"
                    disabled={!hasUnsavedChanges || updateSetlistMutation.isPending}
                  >
                    <i className="fas fa-times"></i>
                    <span className="ml-1 hidden sm:inline">Cancel</span>
                  </button>
                  {updateSetlistMutation.isPending && (
                    <span className="text-xs sm:text-sm text-muted-foreground animate-pulse">
                      <i className="fas fa-spinner fa-spin"></i>
                      <span className="ml-1 hidden sm:inline">Saving...</span>
                    </span>
                  )}
                  {hasUnsavedChanges && !updateSetlistMutation.isPending && (
                    <span className="text-xs sm:text-sm text-yellow-600" title="Unsaved changes">
                      <i className="fas fa-exclamation-circle"></i>
                      <span className="ml-1 hidden sm:inline">Unsaved changes</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toggle drawer button (mobile) - only show when closed */}
          {!drawerOpen && (
            <div className="mb-2 lg:hidden px-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium flex items-center justify-center space-x-2"
              >
                <i className="fas fa-music"></i>
                <span>Add Songs from Playbook</span>
              </button>
            </div>
          )}

          <div className={`flex gap-2 lg:gap-4 relative ${drawerOpen ? 'lg:flex-row' : 'flex-col lg:flex-row'}`}>
            {/* Sets area - 50% width on mobile when drawer is open */}
            <div className={`transition-all duration-300 ${drawerOpen ? 'w-1/2 lg:flex-1' : 'w-full lg:flex-1'} min-w-0 relative`}>
              {/* Scroll gutter on mobile - transparent touch area on right side */}
              <div className="lg:hidden absolute top-0 right-0 bottom-0 w-8 pointer-events-auto z-20" style={{ touchAction: 'pan-y' }}></div>
              <div className="space-y-6">
                {(workingSetlist || setlist).sets.map((set) => {
                  const totalDuration = getSetTotalDuration(set);
                  const variance = getDurationVariance(totalDuration, set.targetDuration);
                  const varianceColor = getVarianceColor(variance);

                  const isCollapsed = collapsedSets.has(set.id);
                  const isActive = activeSetId === set.id;

                  return (
                    <div key={set.id} className="bg-card border-y sm:border sm:rounded border-border overflow-hidden">
                      {/* Set header - redesigned for mobile */}
                      <div
                        className="bg-muted/30 p-2 sm:p-3 border-b border-border"
                      >
                        {/* Mobile layout - stacked */}
                        <div className="flex flex-col gap-1 sm:hidden">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <input
                                type="radio"
                                name="activeSet"
                                checked={isActive}
                                onChange={() => {
                                  // Make this set active
                                  setActiveSetId(set.id);
                                  // If this set is currently collapsed, expand it
                                  if (collapsedSets.has(set.id)) {
                                    setCollapsedSets(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(set.id);
                                      return newSet;
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-orange-500 focus:ring-orange-500 cursor-pointer"
                              />
                              <h3 className="font-semibold text-sm">{set.name}</h3>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSetCollapse(set.id);
                              }}
                              className="text-muted-foreground hover:text-foreground p-2 transition-colors"
                            >
                              <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'} text-base`}></i>
                            </button>
                            <div className="text-xs text-muted-foreground">
                              {set.songs.length} song{set.songs.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className={`flex items-center justify-between text-xs ${varianceColor}`}>
                            <div>
                              <span className="font-medium">{formatDuration(totalDuration)}</span>
                              <span className="text-muted-foreground mx-1">/</span>
                              <span>{formatDuration(set.targetDuration)}</span>
                            </div>
                            <div className="font-medium">
                              ({variance > 0 ? '+' : ''}{variance.toFixed(0)}%)
                            </div>
                          </div>
                        </div>

                        {/* Desktop layout - horizontal */}
                        <div className="hidden sm:flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="activeSet"
                              checked={isActive}
                              onChange={() => {
                                // Make this set active
                                setActiveSetId(set.id);
                                // If this set is currently collapsed, expand it
                                if (collapsedSets.has(set.id)) {
                                  setCollapsedSets(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(set.id);
                                    return newSet;
                                  });
                                }
                              }}
                              className="w-4 h-4 text-orange-500 focus:ring-orange-500 cursor-pointer"
                            />
                            <h3 className="font-semibold">{set.name}</h3>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className={`font-medium ${varianceColor}`}>
                              {formatDuration(totalDuration)} / {formatDuration(set.targetDuration)}
                              <span className="ml-1">({variance > 0 ? '+' : ''}{variance.toFixed(0)}%)</span>
                            </div>
                            <span className="text-muted-foreground">
                              {set.songs.length} song{set.songs.length !== 1 ? 's' : ''}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSetCollapse(set.id);
                              }}
                              className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                            >
                              <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'}`}></i>
                            </button>
                          </div>
                        </div>
                      </div>

                      {!collapsedSets.has(set.id) && (
                        <SortableContext
                          items={set.songs.map(s => s.id)}
                          strategy={verticalListSortingStrategy}
                          id={`set-container-${set.id}`}
                        >
                          <DroppableSetContainer setId={set.id}>
                            {(() => {
                              console.log(`[SETLIST EDIT RENDER] ========== RENDERING SET: "${set.name}" ==========`);
                              console.log(`[SETLIST EDIT RENDER] Set has ${set.songs.length} songs`);
                              return set.songs?.map((song, idx) => {
                                console.log(`[SETLIST EDIT RENDER] Rendering song ${idx + 1}: "${song.title}" | tuning: ${song.tuning || 'UNDEFINED'} | duration: ${song.duration || 'NONE'}s`);
                                if (song.tuning && song.tuning !== 'standard') {
                                  console.log(`[SETLIST EDIT RENDER] *** SHOULD SHOW BADGE for "${song.title}" ***`);
                                }
                                return (
                                  <SortableSongCard
                                    key={song.id}
                                    song={song}
                                    setId={set.id}
                                    idx={idx}
                                    onToggleSegue={handleToggleSegue}
                                    onRemove={handleRemoveSong}
                                    showSegue={song.segueInto && idx < set.songs.length - 1}
                                    isOver={overId === song.id}
                                    drawerOpen={drawerOpen}
                                    isEditing={editingSongTitle === song.id}
                                    editValue={tempSongTitle}
                                    onStartEdit={handleStartEditSongTitle}
                                    onEditChange={handleEditSongTitleChange}
                                    onFinishEdit={handleFinishEditSongTitle}
                                  />
                                );
                              });
                            })()}
                            {set.songs.length === 0 && (
                              <div className="text-center text-muted-foreground text-sm py-8">
                                Drag songs here
                              </div>
                            )}
                          </DroppableSetContainer>
                        </SortableContext>
                      )}
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
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search songs..."
                    className="w-full px-2 py-1.5 pr-7 text-sm border border-border bg-background rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    {/* Letter header - sticky */}
                    <div className="sticky top-0 bg-muted/90 backdrop-blur-sm px-2 py-1 mb-1 rounded text-xs font-bold text-foreground z-10 pointer-events-none">
                      {letter}
                    </div>
                    {/* Songs in this letter group */}
                    <div className="space-y-1">
                      {groupedSongs[letter].map((song) => {
                        const isInSetlist = songsInSetlist.has(song.id);
                        return (
                          <DraggablePlaybookSong
                            key={song.id}
                            song={song}
                            isInSetlist={isInSetlist}
                            onQuickAdd={handleQuickAdd}
                          />
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

      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div
            className="flex items-center gap-2 bg-orange-500 text-white border-2 border-orange-600 rounded p-3 shadow-2xl"
            style={{
              cursor: 'grabbing',
              position: 'fixed',
              zIndex: 9999,
              pointerEvents: 'none',
              touchAction: 'none',
            }}
          >
            <i className="fas fa-grip-vertical text-sm"></i>
            <div className="font-bold text-sm">
              {(() => {
                // Find the active song being dragged
                console.log('[DRAG OVERLAY] Rendering for activeId:', activeId);
                if (activeId.startsWith('playbook-')) {
                  const songId = activeId.replace('playbook-', '');
                  const song = playbookSongs.find(s => s.id === songId);
                  return song ? song.title : 'Song';
                } else {
                  // Find in setlist songs
                  for (const set of (workingSetlist || setlist)?.sets || []) {
                    const song = set.songs.find(s => s.id === activeId);
                    if (song) return song.title;
                  }
                  return 'Song';
                }
              })()}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
