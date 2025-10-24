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
        title: item.globalSong?.title || '',
        artist: item.globalSong?.artistName || '',
        album: item.globalSong?.album || '',
        spotifyUrl: item.globalSong?.spotifyUrl || '',
        imageUrl: item.globalSong?.albumImageUrl || null,
        duration: item.globalSong?.duration || 0,
        bpm: item.globalSong?.metadata?.bpm || null,
        key: item.globalSong?.metadata?.key || null,
      })).sort((a: PlaybookSong, b: PlaybookSong) => a.title.localeCompare(b.title));
    },
    enabled: !!artistId,
  });

  // Update setlist mutation
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId] });
      toast({ title: "Setlist updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update setlist",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Initialize Sortable for all sets when setlist loads
  useEffect(() => {
    if (!setlist) return;

    // Clean up existing sortables
    Object.values(sortableRefs.current).forEach(sortable => sortable?.destroy());
    sortableRefs.current = {};

    // Initialize sortable for each set
    setlist.sets.forEach((set) => {
      const element = document.getElementById(`set-${set.id}`);
      if (element) {
        sortableRefs.current[set.id] = Sortable.create(element, {
          group: 'setlist-songs',
          animation: 150,
          handle: '.drag-handle',
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
        handle: '.drag-handle',
      });
    }

    return () => {
      Object.values(sortableRefs.current).forEach(sortable => sortable?.destroy());
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
          imageUrl: playbookSong.imageUrl,
        };
        toSet.songs.splice(newIndex, 0, newSong);
      }
    } else if (fromSet && toSet) {
      // Moving within or between sets
      const [movedSong] = fromSet.songs.splice(oldIndex, 1);
      toSet.songs.splice(newIndex, 0, movedSong);
    }

    // Update positions
    updatedSets.forEach(set => {
      set.songs.forEach((song, idx) => {
        song.position = idx;
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

  const handleUpdateName = () => {
    if (tempName.trim() && tempName !== setlist?.name) {
      updateSetlistMutation.mutate({ name: tempName });
    }
    setEditingName(false);
  };

  const getSetTotalDuration = (set: Set): number => {
    return set.songs.reduce((total, song) => total + (song.duration || 0), 0);
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
              >
                <i className="fas fa-edit"></i>
              </button>
            </div>
          )}
        </div>

        {/* Toggle drawer button (mobile) */}
        <div className="mb-4 lg:hidden">
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
          >
            <i className={`fas fa-${drawerOpen ? 'times' : 'music'}`}></i>
            <span>{drawerOpen ? 'Close' : 'Add Songs from Playbook'}</span>
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sets area */}
          <div className="flex-1">
            <div className="space-y-6">
              {setlist.sets.map((set) => {
                const totalDuration = getSetTotalDuration(set);
                const variance = getDurationVariance(totalDuration, set.targetDuration);
                const varianceColor = getVarianceColor(variance);

                return (
                  <div key={set.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{set.name}</h3>
                      <div className="flex items-center space-x-4">
                        <div className={`text-sm font-medium ${varianceColor}`}>
                          {formatDuration(totalDuration)} / {formatDuration(set.targetDuration)}
                          <span className="ml-2">({variance > 0 ? '+' : ''}{variance.toFixed(0)}%)</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {set.songs.length} song{set.songs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div id={`set-${set.id}`} className="p-4 min-h-[200px] space-y-2">
                      {set.songs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <i className="fas fa-music text-4xl mb-2 opacity-30"></i>
                          <p>Drag songs here from the playbook</p>
                        </div>
                      ) : (
                        set.songs.map((song) => (
                          <div
                            key={song.id}
                            data-song-id={song.song_id}
                            className="flex items-center space-x-3 bg-background border border-border rounded-lg p-3 hover:border-orange-500/50 transition-colors"
                          >
                            <div className="drag-handle cursor-move text-muted-foreground hover:text-foreground">
                              <i className="fas fa-grip-vertical"></i>
                            </div>
                            {song.imageUrl && (
                              <img
                                src={song.imageUrl}
                                alt={song.title}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{song.title}</div>
                              <div className="text-sm text-muted-foreground truncate">{song.artist}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDuration(song.duration)}
                            </div>
                            <button
                              onClick={() => handleRemoveSong(set.id, song.id)}
                              className="text-red-500 hover:text-red-600 p-2"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Playbook drawer - desktop always visible, mobile toggleable */}
          <div className={`${drawerOpen ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-card border border-border rounded-lg overflow-hidden`}>
            <div className="bg-orange-500 text-white p-4">
              <h3 className="font-semibold">Playbook</h3>
              <p className="text-sm opacity-90 mt-1">Drag songs to add to sets</p>
            </div>

            <div className="p-4 border-b">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs..."
                className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div id="playbook-drawer" className="p-4 max-h-[600px] overflow-y-auto space-y-2">
              {filteredPlaybookSongs.map((song) => (
                <div
                  key={song.id}
                  data-song-id={song.id}
                  className="flex items-center space-x-3 bg-background border border-border rounded-lg p-3 hover:border-orange-500/50 transition-colors cursor-move"
                >
                  <div className="drag-handle text-muted-foreground">
                    <i className="fas fa-grip-vertical"></i>
                  </div>
                  {song.imageUrl && (
                    <img
                      src={song.imageUrl}
                      alt={song.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{song.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
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
