import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import AddSongModal from "@/components/add-song-modal";
import { spotifySync } from "@/lib/spotify-sync";

import type { BandMember } from "@shared/schema";

interface SongWithDetails {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  spotifyUrl: string;
  imageUrl?: string;
  previewUrl?: string;
  addedBy?: string;
  createdAt: string;
  readiness: Array<{
    id: string;
    songId: string;
    memberId: string;
    status: "red" | "amber" | "green";
    updatedAt: string;
  }>;
  vetos: Array<{
    id: string;
    songId: string;
    memberId: string;
    createdAt: string;
  }>;
}

export default function Songs() {
  const [, setLocation] = useLocation();
  const { currentUser, logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [spotifyPlaylistId, setSpotifyPlaylistId] = useState<string | null>(null);

  // Redirect if no user selected
  if (!currentUser) {
    setLocation("/");
    return null;
  }

  // Check for Spotify settings from localStorage (same as admin panel uses)
  useEffect(() => {
    const playlistId = localStorage.getItem('spotify_playlist_id');
    setSpotifyPlaylistId(playlistId);
  }, []);

  const { data: songs = [], isLoading } = useQuery<SongWithDetails[]>({
    queryKey: ["/api/songs"],
  });

  const { data: bandMembers = [] } = useQuery<BandMember[]>({
    queryKey: ["/api/band-members"],
  });

  const updateReadinessMutation = useMutation({
    mutationFn: async ({ songId, status }: { songId: string; status: "red" | "amber" | "green" }) => {
      const response = await fetch(`/api/songs/${songId}/readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: currentUser.id, status }),
      });
      if (!response.ok) throw new Error("Failed to update readiness");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
    },
    onError: () => {
      toast({ title: "Failed to update readiness", variant: "destructive" });
    },
  });

  const toggleVetoMutation = useMutation({
    mutationFn: async ({ songId, hasVeto }: { songId: string; hasVeto: boolean }) => {
      if (hasVeto) {
        const response = await fetch(`/api/songs/${songId}/veto/${currentUser.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to remove veto");
      } else {
        const response = await fetch(`/api/songs/${songId}/veto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: currentUser.id }),
        });
        if (!response.ok) throw new Error("Failed to add veto");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (songData: { songId: string; spotifyId: string }) => {
      const response = await fetch(`/api/songs/${songData.songId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete song");
      
      // Also remove from Spotify playlist if configured
      const { spotifySync } = await import('@/lib/spotify-sync');
      if (spotifySync.isConfigured()) {
        await spotifySync.removeTrackFromSpotify(songData.spotifyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
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
    return song.readiness.find(r => r.memberId === currentUser.id)?.status;
  };

  const getUserVeto = (song: SongWithDetails) => {
    return song.vetos.some(v => v.memberId === currentUser.id);
  };

  const handleDeleteSong = (songId: string, spotifyId: string, songTitle: string) => {
    if (confirm(`Are you sure you want to remove "${songTitle}" from the practice list?`)) {
      deleteSongMutation.mutate({ songId, spotifyId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-neutral via-white to-gray-100">
      {/* Header with integrated navigation */}
      <header className="bg-white shadow-sm border-b-4 border-brand-accent">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="grid grid-cols-3 items-center">
            {/* Left: Clickable band name */}
            <div className="justify-self-start text-left">
              <button 
                onClick={() => setIsNavigationOpen(!isNavigationOpen)}
                className="font-serif text-brand-primary hover:text-brand-primary-dark transition-colors leading-tight text-left"
              >
                <div className="text-xl text-left">The</div>
                <div className="text-xl text-left">Torrists</div>
              </button>
            </div>
            
            {/* Center: User badge */}
            <div className="justify-self-center">
              <div className="flex items-center space-x-2 bg-brand-neutral rounded-full px-4 py-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentUser.color }}
                >
                  <i className={`fas ${currentUser.icon} text-white text-sm`}></i>
                </div>
                <span className="font-serif text-brand-primary font-semibold">{currentUser.name}</span>
              </div>
            </div>
            
            {/* Right: Logout button */}
            <div className="justify-self-end">
              <button 
                onClick={() => {
                  logout();
                  setLocation("/");
                }}
                className="text-brand-primary hover:text-brand-primary-dark"
                title="Switch user"
              >
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation drawer */}
      {isNavigationOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsNavigationOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-60 bg-brand-primary shadow-xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-serif text-lg">Menu</h2>
                <button 
                  onClick={() => setIsNavigationOpen(false)}
                  className="text-white hover:text-gray-200"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <nav className="space-y-4">
                <Link 
                  href="/calendar" 
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                >
                  <i className="fas fa-calendar w-5"></i>
                  <span className="font-serif text-lg">Calendar</span>
                </Link>
                <Link 
                  href="/songs" 
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                >
                  <i className="fas fa-music w-5"></i>
                  <span className="font-serif text-lg">Practice List</span>
                </Link>
                <Link 
                  href="/admin" 
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                >
                  <i className="fas fa-users-cog w-5"></i>
                  <span className="font-serif text-lg">Manage Band</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col space-y-4 mb-8">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-serif font-bold text-brand-primary">Practice List</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-brand-accent hover:bg-brand-accent-light text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-serif font-semibold shadow-lg flex items-center space-x-2 text-sm sm:text-base"
            >
              <i className="fas fa-plus"></i>
              <span>Add Song</span>
            </button>
          </div>
          
          {/* Spotify link row - only show if configured */}
          {spotifyPlaylistId && (
            <div className="flex justify-start">
              <a
                href={`https://open.spotify.com/playlist/${spotifyPlaylistId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-semibold text-sm bg-green-50 hover:bg-green-100 px-3 py-1 rounded-full transition-colors"
                title="Open practice playlist in Spotify"
              >
                <i className="fab fa-spotify"></i>
                <span>Open in Spotify</span>
              </a>
            </div>
          )}
        </div>

        {/* Songs List */}
        {isLoading ? (
          <div className="text-center py-12">
            <i className="fas fa-spinner fa-spin text-4xl text-brand-primary mb-4"></i>
            <p className="text-gray-600">Loading practice list...</p>
          </div>
        ) : sortedSongs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <i className="fas fa-music text-6xl text-gray-300 mb-6"></i>
            <h3 className="text-xl font-serif font-semibold text-gray-600 mb-2">No songs yet</h3>
            <p className="text-gray-500 mb-6">Start building your practice list by adding some songs</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-brand-accent hover:bg-brand-accent-light text-white px-6 py-3 rounded-xl font-serif font-semibold"
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
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-all duration-200 ${
                    hasVetos ? 'opacity-60' : ''
                  }`}
                >
                  {/* Main song card */}
                  <div className="px-4 py-3 flex items-center space-x-3">
                    {/* Album artwork */}
                    <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                      {song.imageUrl ? (
                        <img 
                          src={song.imageUrl} 
                          alt={song.album}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="fas fa-music text-gray-400 text-xl"></i>
                        </div>
                      )}
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {song.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{song.artist}</p>
                    </div>

                    {/* Readiness summary */}
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {readinessCounts.green > 0 && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            {readinessCounts.green}🟢
                          </span>
                        )}
                        {readinessCounts.amber > 0 && (
                          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                            {readinessCounts.amber}🟡
                          </span>
                        )}
                        {readinessCounts.red > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {readinessCounts.red}🔴
                          </span>
                        )}
                      </div>
                      
                      {/* Poo indicators */}
                      {song.vetos.length > 0 && (
                        <span className="text-xl">
                          {"💩".repeat(Math.min(song.vetos.length, 3))}
                        </span>
                      )}

                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpanded(song.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t bg-gray-50">
                      <div className="pt-4 space-y-4">
                        {/* Current user controls */}
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-semibold text-gray-700">Your status:</span>
                          <div className="flex items-center space-x-2">
                            {/* Readiness buttons */}
                            <div className="flex bg-white rounded-lg overflow-hidden border">
                              {["red", "amber", "green"].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => updateReadinessMutation.mutate({ songId: song.id, status: status as any })}
                                  className={`px-3 py-2 text-sm font-semibold transition-colors ${
                                    userReadiness === status
                                      ? status === "green" ? "bg-green-500 text-white" 
                                        : status === "amber" ? "bg-yellow-500 text-white"
                                        : "bg-red-500 text-white"
                                      : "hover:bg-gray-100"
                                  }`}
                                  disabled={updateReadinessMutation.isPending}
                                >
                                  {status === "green" ? "🟢 Ready" 
                                   : status === "amber" ? "🟡 Working" 
                                   : "🔴 Not Ready"}
                                </button>
                              ))}
                            </div>
                            
                            {/* Poo button */}
                            <button
                              onClick={() => toggleVetoMutation.mutate({ songId: song.id, hasVeto: userVeto })}
                              className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                                userVeto 
                                  ? "bg-red-100 text-red-700 hover:bg-red-200" 
                                  : "bg-gray-100 hover:bg-gray-200"
                              }`}
                              disabled={toggleVetoMutation.isPending}
                            >
                              💩
                            </button>
                          </div>
                        </div>

                        {/* All member statuses */}
                        <div>
                          <span className="font-sans font-semibold text-gray-700 block mb-2">Band readiness:</span>
                          <div className="grid grid-cols-2 gap-2">
                            {bandMembers.map((member) => {
                              const memberReadiness = song.readiness.find(r => r.memberId === member.id);
                              const memberVeto = song.vetos.find(v => v.memberId === member.id);
                              
                              return (
                                <div key={member.id} className="flex items-center space-x-2">
                                  <div 
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: member.color }}
                                  >
                                    <i className={`fas ${member.icon} text-white text-xs`}></i>
                                  </div>
                                  <span className="text-sm font-medium">{member.name}</span>
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
                          >
                            <i className="fab fa-spotify"></i>
                            <span>Open in Spotify</span>
                          </a>
                          
                          <button
                            onClick={() => handleDeleteSong(song.id, song.spotifyId, song.title)}
                            className="text-red-600 hover:text-red-700 font-semibold"
                            disabled={deleteSongMutation.isPending}
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
      />
    </div>
  );
}