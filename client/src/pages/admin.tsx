import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { UserBand, Band } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import BandSwitcher from "@/components/band-switcher";

const ICONS = [
  { icon: "fa-microphone", color: "#D2691E", label: "Microphone" },
  { icon: "fa-guitar", color: "#6B8E23", label: "Guitar" },
  { icon: "fa-guitar", color: "#9932CC", label: "Bass" },
  { icon: "fa-drum", color: "#DC143C", label: "Drums" },
  { icon: "fa-piano", color: "#4169E1", label: "Piano" },
  { icon: "fa-music", color: "#708090", label: "Music" },
];

interface AdminProps {
  bandId: string;
  membership: UserBand & { band: Band };
}

export default function Admin({ bandId, membership }: AdminProps) {
  const [, setLocation] = useLocation();
  const { session } = useSupabaseAuth();
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('spotify_access_token')
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    localStorage.getItem('spotify_playlist_id') || ''
  );
  const [userProfile, setUserProfile] = useState<any>(null);
  const [newMember, setNewMember] = useState({
    email: "",
    role: "",
    displayName: "",
    icon: "fa-music",
    color: "#708090",
  });
  const [activeTab, setActiveTab] = useState<'members' | 'spotify'>('members');

  // Get band members using new band-scoped API
  const { data: bandMembers = [], isLoading } = useQuery<(UserBand & { user: any })[]>({
    queryKey: ["/api/bands", bandId, "members"],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`/api/bands/${bandId}/members`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch band members");
      }
      
      return response.json();
    },
    enabled: !!session?.access_token && !!bandId,
  });

  // Spotify queries
  const { data: playlists = [] } = useQuery({
    queryKey: ['/api/spotify/playlists'],
    queryFn: async () => {
      if (!accessToken) return [];
      
      const response = await fetch("/api/spotify/playlists", {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setAccessToken(null);
          localStorage.removeItem('spotify_access_token');
          throw new Error('Spotify access token expired');
        }
        throw new Error('Failed to fetch playlists');
      }
      
      return response.json();
    },
    enabled: !!accessToken,
  });

  const { data: profile } = useQuery({
    queryKey: ['/api/spotify/user'],
    queryFn: async () => {
      if (!accessToken) return null;
      
      const response = await fetch("/api/spotify/user", {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setAccessToken(null);
          localStorage.removeItem('spotify_access_token');
          throw new Error('Spotify access token expired');
        }
        throw new Error('Failed to fetch user profile');
      }
      
      return response.json();
    },
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
  }, [profile]);

  const inviteMemberMutation = useMutation({
    mutationFn: async (member: typeof newMember) => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`/api/bands/${bandId}/members/invite`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(member),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to invite member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bands", bandId, "members"] });
      setNewMember({ email: "", role: "", displayName: "", icon: "fa-music", color: "#708090" });
      toast({
        title: "Success",
        description: "Band member invited successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite band member",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`/api/bands/${bandId}/members/${membershipId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to remove member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bands", bandId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bands", bandId, "events"] });
      toast({
        title: "Success",
        description: "Band member removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove band member",
        variant: "destructive",
      });
    },
  });

  // Spotify handlers
  const handleSpotifyLogin = async () => {
    try {
      const response = await fetch("/api/spotify/auth");
      const { authUrl } = await response.json();
      
      const authWindow = window.open(authUrl, 'spotify-auth', 'width=600,height=600');
      
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          const token = localStorage.getItem('spotify_access_token');
          if (token) {
            setAccessToken(token);
            toast({
              title: "Connected to Spotify!",
              description: "You can now access your playlists"
            });
          } else {
            toast({
              title: "Connection cancelled",
              description: "Spotify connection was not completed",
              variant: "destructive"
            });
          }
        }
      }, 1000);
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Could not connect to Spotify",
        variant: "destructive"
      });
    }
  };

  const handleSpotifyDisconnect = () => {
    setAccessToken(null);
    setSelectedPlaylistId('');
    setUserProfile(null);
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_playlist_id');
    localStorage.removeItem('spotify_expires_at');
    toast({
      title: "Disconnected from Spotify",
      description: "You'll need to reconnect to access playlists"
    });
  };

  const handlePlaylistSelect = async (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    localStorage.setItem('spotify_playlist_id', playlistId);
    
    // Store Spotify settings for real-time sync
    if (accessToken) {
      const { spotifySync } = await import('@/lib/spotify-sync');
      spotifySync.setSettings(playlistId, accessToken);
    }
    
    toast({
      title: "Practice playlist set!",
      description: "This playlist will be used for importing/exporting songs and real-time sync"
    });
  };

  const importFromPlaylist = async () => {
    if (!selectedPlaylistId || !accessToken || !session?.access_token) return;
    
    try {
      const response = await fetch(`/api/spotify/playlists/${selectedPlaylistId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch playlist tracks');
      
      const tracks = await response.json();
      
      let addedCount = 0;
      for (const item of tracks) {
        try {
          const addResponse = await fetch(`/api/bands/${bandId}/songs`, {
            method: "POST",
            headers: { 
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({
              spotifyId: item.track.id,
              title: item.track.name,
              artist: item.track.artists.map((a: any) => a.name).join(", "),
              album: item.track.album.name || "",
              spotifyUrl: item.track.external_urls.spotify,
              imageUrl: item.track.album.images.length > 0 ? item.track.album.images[0].url : null,
              previewUrl: item.track.preview_url,
              addedByMembershipId: membership.id
            }),
          });
          
          if (addResponse.ok) {
            addedCount++;
          }
        } catch (error) {
          continue;
        }
      }
      
      toast({
        title: `Imported ${addedCount} songs!`,
        description: `Added ${addedCount} new songs from your Spotify playlist`
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/bands", bandId, "songs"] });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Could not import songs from playlist",
        variant: "destructive"
      });
    }
  };

  const syncToSpotify = async () => {
    if (!selectedPlaylistId || !accessToken) return;
    
    try {
      const response = await fetch(`/api/spotify/playlists/${selectedPlaylistId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to sync to Spotify');
      
      toast({
        title: "Synced to Spotify!",
        description: "Your practice list has been synced to your Spotify playlist"
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Could not sync to Spotify playlist",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email.trim() || !newMember.displayName.trim() || !newMember.role.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    inviteMemberMutation.mutate(newMember);
  };

  const selectIcon = (icon: string, color: string) => {
    setNewMember(prev => ({ ...prev, icon, color }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-primary font-sans">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-brand-primary text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-serif">Band Settings</h2>
              <button 
                onClick={() => setLocation("/calendar")}
                className="text-white hover:text-gray-200"
                data-testid="button-close-admin"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            {/* Band switcher */}
            <div className="mb-4">
              <BandSwitcher 
                currentBandId={bandId} 
                currentMembership={membership} 
              />
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 rounded-lg font-serif transition-colors ${
                  activeTab === 'members' 
                    ? 'bg-white text-brand-primary' 
                    : 'text-white hover:bg-brand-primary-light'
                }`}
                data-testid="tab-members"
              >
                <i className="fas fa-users mr-2"></i>
                Members
              </button>
              <button
                onClick={() => setActiveTab('spotify')}
                className={`px-4 py-2 rounded-lg font-serif transition-colors ${
                  activeTab === 'spotify' 
                    ? 'bg-white text-brand-primary' 
                    : 'text-white hover:bg-brand-primary-light'
                }`}
                data-testid="tab-spotify"
              >
                <i className="fab fa-spotify mr-2"></i>
                Spotify
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Members Tab */}
            {activeTab === 'members' && (
              <div>
                {/* Current Members */}
                <div className="mb-8">
                  <h3 className="text-xl font-sans font-semibold text-brand-primary mb-4">Current Members</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bandMembers.map((member) => (
                      <div key={member.id} className="bg-brand-neutral rounded-xl p-4 flex items-center justify-between" data-testid={`member-card-${member.id}`}>
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: member.color }}
                          >
                            <i className={`fas ${member.icon} text-white`}></i>
                          </div>
                          <div>
                            <h4 className="font-sans font-semibold text-brand-primary" data-testid={`member-name-${member.id}`}>{member.displayName}</h4>
                            <p className="text-sm text-gray-600" data-testid={`member-role-${member.id}`}>{member.role}</p>
                            {member.user?.email && (
                              <p className="text-xs text-gray-500">{member.user.email}</p>
                            )}
                          </div>
                        </div>
                        {/* Only allow removal if not the current user and user is admin */}
                        {member.id !== membership.id && membership.role === 'admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-red-500 hover:text-red-700 p-2" data-testid={`button-remove-${member.id}`}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Band Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.displayName}? This will also delete all their events and availability entries. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => removeMemberMutation.mutate(member.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Add New Member - only for admins */}
                {membership.role === 'admin' && (
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-sans font-semibold text-brand-primary mb-4">Invite New Member</h3>
                    <form onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Email *</label>
                          <Input
                            type="email"
                            placeholder="member@example.com"
                            value={newMember.email}
                            onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                            className="focus:border-brand-primary focus:ring-brand-primary"
                            data-testid="input-member-email"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Display Name *</label>
                          <Input
                            type="text"
                            placeholder="Display name"
                            value={newMember.displayName}
                            onChange={(e) => setNewMember(prev => ({ ...prev, displayName: e.target.value }))}
                            className="focus:border-brand-primary focus:ring-brand-primary"
                            data-testid="input-member-name"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Role *</label>
                        <Select 
                          value={newMember.role} 
                          onValueChange={(value) => setNewMember(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger className="focus:border-brand-primary focus:ring-brand-primary" data-testid="select-member-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="Lead Vocals">Lead Vocals</SelectItem>
                            <SelectItem value="Backing Vocals">Backing Vocals</SelectItem>
                            <SelectItem value="Lead Guitar">Lead Guitar</SelectItem>
                            <SelectItem value="Rhythm Guitar">Rhythm Guitar</SelectItem>
                            <SelectItem value="Bass Guitar">Bass Guitar</SelectItem>
                            <SelectItem value="Drums">Drums</SelectItem>
                            <SelectItem value="Keyboards">Keyboards</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Icon Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Icon & Color</label>
                        <div className="grid grid-cols-6 gap-3">
                          {ICONS.map(({ icon, color, label }) => (
                            <button
                              key={`${icon}-${color}`}
                              type="button"
                              onClick={() => selectIcon(icon, color)}
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform ${
                                newMember.icon === icon && newMember.color === color 
                                  ? "ring-2 ring-brand-primary ring-offset-2" 
                                  : ""
                              }`}
                              style={{ backgroundColor: color }}
                              title={label}
                              data-testid={`icon-${icon.replace('fa-', '')}-${color.replace('#', '')}`}
                            >
                              <i className={`fas ${icon}`}></i>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        type="submit"
                        disabled={inviteMemberMutation.isPending}
                        className="bg-brand-primary hover:bg-brand-primary-dark"
                        data-testid="button-invite-member"
                      >
                        {inviteMemberMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Inviting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-plus mr-2"></i>Invite Member
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            )}
            
            {/* Spotify Tab */}
            {activeTab === 'spotify' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-serif font-bold text-brand-primary mb-2">
                    <i className="fab fa-spotify mr-2"></i>
                    Spotify Integration
                  </h3>
                  <p className="text-gray-600">
                    Connect your Spotify account for real-time playlist synchronisation
                  </p>
                </div>
              
                {accessToken ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-green-600">
                          <i className="fas fa-check-circle"></i>
                          <span className="font-medium">Connected to Spotify</span>
                        </div>
                        {userProfile && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            {userProfile.images && userProfile.images.length > 0 && (
                              <img 
                                src={userProfile.images[0].url} 
                                alt="Profile" 
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span>{userProfile.display_name || userProfile.id}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleSpotifyDisconnect}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        data-testid="button-spotify-disconnect"
                      >
                        Disconnect
                      </button>
                    </div>
                    
                    {/* Playlist Selection */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Practice Playlist:
                        </label>
                        <div className="flex gap-2">
                          <Select value={selectedPlaylistId} onValueChange={handlePlaylistSelect}>
                            <SelectTrigger className="flex-1" data-testid="select-spotify-playlist">
                              <SelectValue placeholder="Choose a playlist..." />
                            </SelectTrigger>
                            <SelectContent>
                              {playlists.map((playlist: any) => (
                                <SelectItem key={playlist.id} value={playlist.id}>
                                  <div className="flex items-center space-x-2">
                                    <span>{playlist.name}</span>
                                    <span className="text-xs text-gray-500">({playlist.tracks.total} tracks)</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedPlaylistId && (
                            <div className="flex gap-2">
                              <Button
                                onClick={importFromPlaylist}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid="button-import-songs"
                              >
                                <i className="fas fa-download mr-2"></i>
                                Import Songs
                              </Button>
                              <Button
                                onClick={syncToSpotify}
                                className="bg-blue-600 hover:bg-blue-700"
                                data-testid="button-sync-spotify"
                              >
                                <i className="fas fa-upload mr-2"></i>
                                Sync to Spotify
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedPlaylistId && (
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>• <strong>Import Songs:</strong> Copy tracks from Spotify to your practice list</p>
                          <p>• <strong>Sync to Spotify:</strong> Update playlist with your complete practice list</p>
                          <p className="text-green-600 font-medium">✓ Future song changes will sync automatically</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-gray-500 mb-2">
                          <i className="fas fa-times-circle"></i>
                          <span className="font-medium">Not connected to Spotify</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Connect your Spotify account for real-time playlist synchronisation with your practice list.
                        </p>
                      </div>
                      <button
                        onClick={handleSpotifyLogin}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-serif flex items-center space-x-2"
                        data-testid="button-spotify-connect"
                      >
                        <i className="fab fa-spotify"></i>
                        <span>Connect Spotify</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}