import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useToast } from "@/hooks/use-toast";
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

export default function Songs({ artistId, membership }: SongsProps) {
  // Apply songs theme
  useSectionTheme('songs');
  
  const [, setLocation] = useLocation();
  const { session } = useServerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());
  const [spotifyPlaylistId, setSpotifyPlaylistId] = useState<string | null>(null);

  // Check for Spotify settings from localStorage
  useEffect(() => {
    const playlistId = localStorage.getItem('spotify_playlist_id');
    setSpotifyPlaylistId(playlistId);
  }, []);

  // Get songs for this band using new band-scoped API
  const { data: songs = [], isLoading } = useQuery<SongWithDetails[]>({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/songs`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch songs");
      }
      
      return response.json();
    },
    enabled: !!session?.access_token && !!artistId,
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
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/songs/${songData.songId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete song");
      
      // Also remove from Spotify playlist if configured
      const { spotifySync } = await import('@/lib/spotify-sync');
      if (spotifySync.isConfigured()) {
        await spotifySync.removeTrackFromSpotify(songData.spotifyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"] });
      toast({ title: "Song removed from practice list and Spotify playlist" });
    },
    onError: () => {
      toast({ title: "Failed to remove song", variant: "destructive" });
    },
  });

  // Sort songs by readiness (most ready first) and then by vetos (vetoed songs last)
  const sortedSongs = [...songs].sort((a, b) => {
    const aVetos = a.vetos.length;
    const bVetos = b.vetos.length;
    
    // Songs with vetos go to bottom
    if (aVetos > 0 && bVetos === 0) return 1;
    if (bVetos > 0 && aVetos === 0) return -1;
    
    // Calculate readiness scores
    const getReadinessScore = (song: SongWithDetails) => {
      let score = 0;
      song.readiness.forEach(r => {
        if (r.status === "green") score += 3;
        else if (r.status === "amber") score += 2;
        else if (r.status === "red") score += 1;
      });
      return score;
    };
    
    return getReadinessScore(b) - getReadinessScore(a);
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
    song.readiness.forEach(r => counts[r.status]++);
    return counts;
  };

  const getUserReadiness = (song: SongWithDetails) => {
    return song.readiness.find(r => r.membershipId === membership.id)?.status;
  };

  const getUserVeto = (song: SongWithDetails) => {
    return song.vetos.some(v => v.membershipId === membership.id);
  };

  const handleDeleteSong = (songId: string, spotifyId: string, songTitle: string) => {
    if (confirm(`Are you sure you want to remove "${songTitle}" from the practice list?`)) {
      deleteSongMutation.mutate({ songId, spotifyId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      {/* Page Header */}
      <PageHeader title="Practice List">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          data-testid="button-add-song"
        >
          <i className="fas fa-plus"></i>
          <span>Add Song</span>
        </button>
      </PageHeader>

      <div className="max-w-4xl mx-auto px-4 py-8">
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
          <div className="space-y-1">
            {sortedSongs.map((song) => {
              const readinessCounts = getReadinessCount(song);
              const userReadiness = getUserReadiness(song);
              const userVeto = getUserVeto(song);
              const isExpanded = expandedSongs.has(song.id);
              const hasVetos = song.vetos.length > 0;

              return (
                <div 
                  key={song.id} 
                  className={`bg-card rounded-lg shadow-sm border border-border hover:bg-muted/50 transition-all duration-200 ${
                    hasVetos ? 'opacity-60' : ''
                  }`}
                  data-testid={`song-card-${song.id}`}
                >
                  {/* Main song card */}
                  <div className="px-4 py-3 flex items-center space-x-3">
                    {/* Album artwork */}
                    <div className="w-12 h-12 bg-muted rounded flex-shrink-0 overflow-hidden">
                      {song.imageUrl ? (
                        <img 
                          src={song.imageUrl} 
                          alt={song.album}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="fas fa-music text-muted-foreground text-xl"></i>
                        </div>
                      )}
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate" data-testid={`song-title-${song.id}`}>
                        {song.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`song-artist-${song.id}`}>{song.artist}</p>
                    </div>

                    {/* Readiness summary */}
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {readinessCounts.green > 0 && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full" data-testid={`readiness-green-${song.id}`}>
                            {readinessCounts.green}🟢
                          </span>
                        )}
                        {readinessCounts.amber > 0 && (
                          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full" data-testid={`readiness-amber-${song.id}`}>
                            {readinessCounts.amber}🟡
                          </span>
                        )}
                        {readinessCounts.red > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full" data-testid={`readiness-red-${song.id}`}>
                            {readinessCounts.red}🔴
                          </span>
                        )}
                      </div>
                      
                      {/* Veto indicators */}
                      {song.vetos.length > 0 && (
                        <span className="text-xl" data-testid={`vetos-${song.id}`}>
                          {"💩".repeat(Math.min(song.vetos.length, 3))}
                        </span>
                      )}

                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpanded(song.id)}
                        className="p-2 hover:bg-muted rounded-lg"
                        data-testid={`button-expand-${song.id}`}
                      >
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-muted-foreground`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
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
                              const memberReadiness = song.readiness.find(r => r.membershipId === member.id);
                              const memberVeto = song.vetos.find(v => v.membershipId === member.id);
                              
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
        )}
      </div>

      {/* Add Song Modal */}
      <AddSongModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        artistId={artistId}
        membership={membership}
      />
    </div>
  );
}