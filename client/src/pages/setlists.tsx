import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { PageHeader } from "@/components/layout";
import type { ArtistMembership, Artist } from "@/types/api";
import type { Setlist, SetlistSet, SetlistSong } from "@/types/setlist";

interface SetlistsProps {
  artistId: string;
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
  if (absVariance <= 5) return 'text-blue-500'; // Within 5%
  if (absVariance <= 20) return 'text-yellow-500'; // Within 20%
  return 'text-red-500'; // Way off
}

export default function Setlists({ artistId, membership }: SetlistsProps) {
  useSectionTheme('songs');

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [expandedSetlists, setExpandedSetlists] = useState<Set<string>>(new Set());

  // Fetch all setlists for this artist
  const { data: setlists = [], isLoading } = useQuery<Setlist[]>({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists"],
    queryFn: async () => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch setlists");
      }

      return response.json();
    },
    enabled: !!artistId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Create setlist mutation
  const createSetlistMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          created_by_membership_id: membership.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create setlist");
      }

      return response.json();
    },
    onSuccess: (newSetlist) => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists"] });
      toast({ title: "Setlist created!" });
      setShowCreateModal(false);
      setNewSetlistName('');
      setLocation(`/setlists/${newSetlist.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create setlist",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Delete setlist mutation
  const deleteSetlistMutation = useMutation({
    mutationFn: async (setlistId: string) => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete setlist");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists"] });
      toast({ title: "Setlist deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete setlist",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Copy setlist mutation
  const copySetlistMutation = useMutation({
    mutationFn: async (setlistId: string) => {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}/copy`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          created_by_membership_id: membership.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to copy setlist");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists"] });
      toast({ title: "Setlist copied!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to copy setlist",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleCreateSetlist = () => {
    if (!newSetlistName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a setlist name",
        variant: "destructive"
      });
      return;
    }
    createSetlistMutation.mutate(newSetlistName);
  };

  const handleDeleteSetlist = async (setlistId: string, setlistName: string) => {
    const confirmed = await confirm({
      title: 'Delete Setlist',
      description: `Are you sure you want to delete "${setlistName}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });

    if (confirmed) {
      deleteSetlistMutation.mutate(setlistId);
    }
  };

  const handleCopySetlist = (setlistId: string) => {
    copySetlistMutation.mutate(setlistId);
  };

  const handleEditSetlist = (setlistId: string) => {
    setLocation(`/setlists/${setlistId}`);
  };

  // Calculate total duration for a set
  const getSetTotalDuration = (set: SetlistSet): number => {
    const total = set.songs.reduce((total, song) => total + (song.duration || 0), 0);
    console.log(`[LIST] Set "${set.name}" total: ${total}s from ${set.songs.length} songs`);
    return total;
  };

  // Calculate total duration for entire setlist
  const getSetlistTotalDuration = (setlist: Setlist): number => {
    const total = setlist.sets.reduce((total, set) => total + getSetTotalDuration(set), 0);
    console.log(`[LIST] Setlist "${setlist.name}" total: ${total}s`);
    return total;
  };

  // Calculate total target duration for setlist
  const getSetlistTargetDuration = (setlist: Setlist): number => {
    const total = setlist.sets.reduce((total, set) => total + set.targetDuration, 0);
    console.log(`[LIST] Target duration: ${total}s`);
    return total;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      <ConfirmDialog />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setLocation("/songs")}
              className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground"
            >
              Playbook
            </button>
            <button
              onClick={() => setLocation("/setlists")}
              className="px-4 py-2 font-medium text-orange-500 border-b-2 border-orange-500"
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
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            <span className="hidden sm:inline">New Setlist</span>
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <i className="fas fa-spinner fa-spin text-4xl text-orange-500"></i>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && setlists.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-list text-6xl text-muted-foreground/30 mb-4"></i>
            <h3 className="text-xl font-semibold mb-2">No setlists yet</h3>
            <p className="text-muted-foreground mb-6">Create your first setlist to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center space-x-2"
            >
              <i className="fas fa-plus"></i>
              <span>Create Setlist</span>
            </button>
          </div>
        )}

        {/* Setlists grid */}
        {!isLoading && setlists.length > 0 && (
          <div className="grid gap-4">
            {setlists.map((setlist) => {
              const totalDuration = getSetlistTotalDuration(setlist);
              const targetDuration = getSetlistTargetDuration(setlist);
              const variance = getDurationVariance(totalDuration, targetDuration);
              const varianceColor = getVarianceColor(variance);
              const totalSongs = setlist.sets.reduce((total, set) => total + set.songs.length, 0);
              const isExpanded = expandedSetlists.has(setlist.id);

              return (
                <div
                  key={setlist.id}
                  className="bg-card border border-border rounded-lg overflow-hidden hover:border-orange-500/50 transition-all shadow-sm"
                >
                  {/* Setlist header */}
                  <div className="p-4 bg-gradient-to-r from-muted/30 to-muted/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          {setlist.name}
                        </h3>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <i className="fas fa-layer-group mr-2"></i>
                            {setlist.sets.length} set{setlist.sets.length !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center">
                            <i className="fas fa-music mr-2"></i>
                            {totalSongs} song{totalSongs !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Duration summary */}
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold ${varianceColor}`}>
                          {formatDuration(totalDuration)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          / {formatDuration(targetDuration)}
                        </div>
                        <div className={`text-xs font-semibold ${varianceColor} mt-1`}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Sets preview chips */}
                    <div className="flex flex-wrap gap-2">
                      {setlist.sets.map((set) => {
                        const setDuration = getSetTotalDuration(set);
                        const setVariance = getDurationVariance(setDuration, set.targetDuration);
                        const setColor = getVarianceColor(setVariance);

                        return (
                          <div
                            key={set.id}
                            className="flex items-center space-x-2 bg-background border border-border rounded-full px-3 py-1 text-xs"
                          >
                            <span className="font-semibold text-foreground">{set.name}</span>
                            <span className={setColor}>
                              {formatDuration(setDuration)}
                            </span>
                            <span className="text-muted-foreground">
                              ({set.songs.length})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expandable song list */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10 p-4">
                      {setlist.sets.map((set) => (
                        <div key={set.id} className="mb-4 last:mb-0">
                          <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center">
                            <i className="fas fa-layer-group mr-2 text-orange-500"></i>
                            {set.name}
                          </h4>
                          <div className="space-y-1 pl-6">
                            {set.songs.map((song, idx) => (
                              <div
                                key={song.id}
                                className="flex items-center text-sm text-muted-foreground"
                              >
                                <span className="w-6 text-xs">{idx + 1}.</span>
                                <span className="flex-1">{song.title}</span>
                                <span className="text-xs">
                                  {song.duration ? formatDuration(song.duration) : '--'}
                                </span>
                              </div>
                            ))}
                            {set.songs.length === 0 && (
                              <div className="text-xs italic text-muted-foreground/60">
                                No songs yet
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t border-border p-3 flex items-center justify-between bg-muted/5">
                    <button
                      onClick={() => {
                        setExpandedSetlists(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(setlist.id)) {
                            newSet.delete(setlist.id);
                          } else {
                            newSet.add(setlist.id);
                          }
                          return newSet;
                        });
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground px-3 py-1 rounded hover:bg-muted/30 transition-colors"
                    >
                      <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} mr-1`}></i>
                      {isExpanded ? 'Hide' : 'Show'} Songs
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditSetlist(setlist.id)}
                        className="text-sm text-orange-500 hover:text-orange-600 px-3 py-1.5 rounded hover:bg-orange-500/10 transition-colors font-medium"
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySetlist(setlist.id);
                        }}
                        className="text-sm text-blue-500 hover:text-blue-600 px-3 py-1.5 rounded hover:bg-blue-500/10 transition-colors"
                        disabled={copySetlistMutation.isPending}
                      >
                        <i className="fas fa-copy mr-1"></i>
                        Copy
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSetlist(setlist.id, setlist.name);
                        }}
                        className="text-sm text-red-500 hover:text-red-600 px-3 py-1.5 rounded hover:bg-red-500/10 transition-colors"
                        disabled={deleteSetlistMutation.isPending}
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Setlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 sm:items-center overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl mt-4 sm:mt-0">
            <div className="bg-orange-500 text-white p-4 sm:p-6 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-serif font-bold">Create New Setlist</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSetlistName('');
                }}
                className="text-white hover:text-white/80 p-2"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Setlist Name
              </label>
              <input
                type="text"
                value={newSetlistName}
                onChange={(e) => setNewSetlistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateSetlist();
                  }
                }}
                placeholder="e.g., Summer Tour 2025"
                className="w-full px-4 py-3 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base sm:text-lg"
                autoFocus
              />

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewSetlistName('');
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSetlist}
                  disabled={createSetlistMutation.isPending || !newSetlistName.trim()}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createSetlistMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating...
                    </>
                  ) : (
                    'Create Setlist'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
