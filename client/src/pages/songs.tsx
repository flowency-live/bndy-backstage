import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import AddSongModal from "@/components/add-song-modal";
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

  // Redirect if no user selected
  if (!currentUser) {
    setLocation("/");
    return null;
  }

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
      toast({ title: "Failed to update veto", variant: "destructive" });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete song");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Song removed from practice list" });
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

  const handleDeleteSong = (songId: string, songTitle: string) => {
    if (confirm(`Are you sure you want to remove "${songTitle}" from the practice list?`)) {
      deleteSongMutation.mutate(songId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-torrist-cream via-white to-gray-100">
      {/* Navigation - rendered outside container */}
      <Navigation currentUser={currentUser} onLogout={logout} />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-torrist-orange">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 items-center">
            {/* Left: Empty space */}
            <div></div>
            
            {/* Center: User badge */}
            <div className="justify-self-center">
              <div className="flex items-center space-x-2 bg-torrist-cream rounded-full px-4 py-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentUser.color }}
                >
                  <i className={`fas ${currentUser.icon} text-white text-sm`}></i>
                </div>
                <span className="font-serif text-torrist-green font-semibold">{currentUser.name}</span>
              </div>
            </div>
            
            {/* Right: Logout button */}
            <div className="justify-self-end">
              <button 
                onClick={() => {
                  logout();
                  setLocation("/");
                }}
                className="text-torrist-green hover:text-torrist-green-dark"
                title="Switch user"
              >
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold text-torrist-green mb-2">Practice List</h1>
            <p className="text-gray-600 font-serif">
              Songs the band is practicing, with readiness tracking
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-torrist-orange hover:bg-torrist-orange-light text-white px-6 py-3 rounded-xl font-serif font-semibold shadow-lg flex items-center space-x-2"
          >
            <i className="fas fa-plus"></i>
            <span>Add Song</span>
          </button>
        </div>

        {/* Songs List */}
        {isLoading ? (
          <div className="text-center py-12">
            <i className="fas fa-spinner fa-spin text-4xl text-torrist-green mb-4"></i>
            <p className="text-gray-600">Loading practice list...</p>
          </div>
        ) : sortedSongs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <i className="fas fa-music text-6xl text-gray-300 mb-6"></i>
            <h3 className="text-xl font-serif font-semibold text-gray-600 mb-2">No songs yet</h3>
            <p className="text-gray-500 mb-6">Start building your practice list by adding some songs</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-torrist-orange hover:bg-torrist-orange-light text-white px-6 py-3 rounded-xl font-serif font-semibold"
            >
              Add Your First Song
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedSongs.map((song) => {
              const readinessCounts = getReadinessCount(song);
              const userReadiness = getUserReadiness(song);
              const userVeto = getUserVeto(song);
              const isExpanded = expandedSongs.has(song.id);
              const hasVetos = song.vetos.length > 0;

              return (
                <div 
                  key={song.id} 
                  className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-200 ${
                    hasVetos ? 'opacity-60' : ''
                  }`}
                >
                  {/* Main song card */}
                  <div className="p-4 flex items-center space-x-4">
                    {/* Album artwork */}
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
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
                      <h3 className="font-serif font-semibold text-torrist-green text-lg truncate">
                        {song.title}
                      </h3>
                      <p className="text-gray-600 truncate">{song.artist}</p>
                      <p className="text-sm text-gray-500 truncate">{song.album}</p>
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
                      
                      {/* Veto indicators */}
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
                            
                            {/* Veto button */}
                            <button
                              onClick={() => toggleVetoMutation.mutate({ songId: song.id, hasVeto: userVeto })}
                              className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                                userVeto 
                                  ? "bg-red-100 text-red-700 hover:bg-red-200" 
                                  : "bg-gray-100 hover:bg-gray-200"
                              }`}
                              disabled={toggleVetoMutation.isPending}
                            >
                              💩 {userVeto ? "Remove Veto" : "Veto"}
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
                            onClick={() => handleDeleteSong(song.id, song.title)}
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