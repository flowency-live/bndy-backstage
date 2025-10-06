import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { ArtistMembership, Artist } from "@/types/api";
import { EVENT_TYPES, EVENT_TYPE_CONFIG } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GigAlertBanner from "@/components/gig-alert-banner";
import ImageUpload from "@/components/ui/image-upload";

interface AdminProps {
  artistId: string;
  membership: ArtistMembership;
}

// Removed AvatarUploadModal and ActiveMagicLinks - incomplete features

export default function Admin({ artistId, membership }: AdminProps) {
  // Apply band theme for admin/management pages
  useSectionTheme('band');
  
  const [, setLocation] = useLocation();
  const { session } = useServerAuth();
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('spotify_access_token')
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    localStorage.getItem('spotify_playlist_id') || ''
  );
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'artist' | 'members' | 'spotify'>('artist');
  const [invitePhone, setInvitePhone] = useState("");
  // Fetch full artist data
  const { data: artistData } = useQuery<Artist>({
    queryKey: ["/api/artists", artistId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/artists/${artistId}`);
      return response.json();
    },
    enabled: !!artistId,
  });

  const [artistSettings, setArtistSettings] = useState({
    name: artistData?.name || membership.artist?.name || membership.name || '',
    description: artistData?.bio || membership.artist?.bio || '',
    avatar: artistData?.profileImageUrl || membership.artist?.profileImageUrl || null,
    allowedEventTypes: artistData?.allowedEventTypes || membership.artist?.allowedEventTypes || ['practice', 'public_gig'],
  });

  // Update form when artist data loads
  useEffect(() => {
    if (artistData) {
      setArtistSettings({
        name: artistData.name || '',
        description: artistData.bio || '',
        avatar: artistData.profileImageUrl || null,
        allowedEventTypes: artistData.allowedEventTypes || ['practice', 'public_gig'],
      });
    }
  }, [artistData]);

  // Get artist members
  const { data: membersResponse, isLoading } = useQuery({
    queryKey: ["/api/artists", artistId, "members"],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("GET", `/api/artists/${artistId}/members`);
      const data = await response.json();
      // Handle both array and object responses
      return Array.isArray(data) ? data : (data?.members || []);
    },
    enabled: !!session && !!artistId,
  });

  // Ensure artistMembers is always an array
  const artistMembers = Array.isArray(membersResponse) ? membersResponse : (membersResponse?.members || []);

  // Spotify queries
  const { data: playlistsResponse } = useQuery({
    queryKey: ['/api/spotify/playlists'],
    queryFn: async () => {
      if (!accessToken) return { items: [] };

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

      const data = await response.json();
      // Handle both array and object responses
      return Array.isArray(data) ? { items: data } : data;
    },
    enabled: !!accessToken,
  });

  // Ensure playlists is always an array
  const playlists = Array.isArray(playlistsResponse?.items)
    ? playlistsResponse.items
    : Array.isArray(playlistsResponse)
      ? playlistsResponse
      : [];

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


  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("DELETE", `/api/artists/${artistId}/members/${membershipId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "events"] });
      toast({
        title: "Success",
        description: "Band member removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove artist member",
        variant: "destructive",
      });
    },
  });

  // Band settings mutation
  const updateArtistMutation = useMutation({
    mutationFn: async (settings: typeof artistSettings) => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("PUT", `/api/artists/${artistId}`, {
        name: settings.name,
        bio: settings.description,
        profileImageUrl: settings.avatar,
        allowedEventTypes: settings.allowedEventTypes,
      });

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId] });
      toast({
        title: "Success",
        description: "Artist settings updated successfully",
      });
      // Navigate back to dashboard and refresh
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update band settings",
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
    if (!selectedPlaylistId || !accessToken || !session) return;
    
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
          const addResponse = await apiRequest("POST", `/api/artists/${artistId}/songs`, {
            spotifyId: item.track.id,
            title: item.track.name,
            artist: item.track.artists.map((a: any) => a.name).join(", "),
            album: item.track.album.name || "",
            spotifyUrl: item.track.external_urls.spotify,
            imageUrl: item.track.album.images.length > 0 ? item.track.album.images[0].url : null,
            previewUrl: item.track.preview_url,
            addedByMembershipId: membership.id
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
      
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "songs"] });
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


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-primary font-sans">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      
      {/* Gig Alert Banner */}
      <div className="px-4">
        <GigAlertBanner artistId={artistId} className="mb-4" />
      </div>
      
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="bg-card rounded-t-2xl border-b border-border">
            <div className="flex space-x-0 px-1 pt-1">
              <button
                onClick={() => setActiveTab('artist')}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'artist'
                    ? 'bg-background text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                data-testid="tab-artist"
              >
                <i className="fas fa-cog mr-2"></i>
                Artist Settings
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'members'
                    ? 'bg-background text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                data-testid="tab-members"
              >
                <i className="fas fa-users mr-2"></i>
                Members
              </button>
              <button
                onClick={() => setActiveTab('spotify')}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'spotify'
                    ? 'bg-background text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                data-testid="tab-spotify"
              >
                <i className="fab fa-spotify mr-2"></i>
                Spotify
              </button>
            </div>
          </div>
          
          <div className="bg-card rounded-b-2xl shadow-lg overflow-hidden">
            <div className="p-6">
            {/* Artist Settings Tab */}
            {activeTab === 'artist' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-serif font-bold text-brand-primary mb-2">Artist Profile</h2>
                  <p className="text-muted-foreground">Any artist member can edit these details to keep your artist's profile up to date.</p>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  updateArtistMutation.mutate(artistSettings);
                }} className="space-y-6">
                  
                  {/* Artist Avatar */}
                  <div>
                    <Label className="text-card-foreground font-semibold mb-3 block">Artist Avatar</Label>
                    <p className="text-sm text-muted-foreground mb-4">Upload a logo or image for your artist</p>
                    <div className="flex justify-center">
                      <ImageUpload
                        value={artistSettings.avatar || undefined}
                        onChange={(value) => setArtistSettings(prev => ({ ...prev, avatar: value }))}
                        placeholder="Upload band logo"
                        size="lg"
                        data-testid="band-avatar-upload"
                      />
                    </div>
                  </div>

                  {/* Artist Name */}
                  <div>
                    <Label htmlFor="artistName" className="text-card-foreground font-semibold mb-2 block">Artist Name *</Label>
                    <Input
                      id="artistName"
                      type="text"
                      value={artistSettings.name}
                      onChange={(e) => setArtistSettings(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter band name"
                      className="focus:border-brand-primary focus:ring-brand-primary"
                      data-testid="input-band-name"
                      required
                    />
                  </div>

                  {/* Band Description */}
                  <div>
                    <Label htmlFor="artistDescription" className="text-card-foreground font-semibold mb-2 block">Description</Label>
                    <Textarea
                      id="artistDescription"
                      value={artistSettings.description}
                      onChange={(e) => setArtistSettings(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Tell us about your artist..."
                      className="focus:border-brand-primary focus:ring-brand-primary resize-none"
                      data-testid="input-band-description"
                      rows={4}
                    />
                  </div>

                  {/* Event Types Configuration */}
                  <div>
                    <Label className="text-card-foreground font-semibold mb-3 block">Allowed Event Types</Label>
                    <p className="text-sm text-muted-foreground mb-4">Choose which event types your artist uses. Members will only see these options when creating events.</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {EVENT_TYPES.filter(type => type !== 'unavailable').map((type) => {
                        const config = EVENT_TYPE_CONFIG[type];
                        const isSelected = artistSettings.allowedEventTypes.includes(type);
                        
                        return (
                          <button 
                            key={type}
                            type="button"
                            onClick={() => {
                              setArtistSettings(prev => {
                                const newTypes = isSelected 
                                  ? prev.allowedEventTypes.filter(t => t !== type)
                                  : [...prev.allowedEventTypes, type];
                                
                                // Prevent deselecting all types - must have at least one
                                if (newTypes.length === 0) {
                                  return prev;
                                }
                                
                                return { ...prev, allowedEventTypes: newTypes };
                              });
                            }}
                            className={`p-3 rounded-lg border-2 text-center transition-all duration-200 relative ${
                              isSelected
                                ? `border-2 shadow-lg transform scale-[1.02]`
                                : "border-border hover:border-border/80 hover:shadow-sm"
                            }`}
                            style={{
                              borderColor: isSelected ? config.color : undefined,
                              backgroundColor: isSelected ? `${config.color}25` : undefined,
                            }}
                            data-testid={`button-event-type-${type}`}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                                <i className="fas fa-check text-xs" style={{ color: config.color }}></i>
                              </div>
                            )}
                            <div className="text-xl mb-1">{config.icon}</div>
                            <div className={`text-xs font-sans font-semibold ${
                              isSelected ? "text-card-foreground" : "text-muted-foreground"
                            }`} style={{
                              color: isSelected ? config.color : undefined,
                            }}>{config.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/dashboard")}
                      className="px-6"
                      data-testid="button-cancel-band"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="action"
                      disabled={updateArtistMutation.isPending}
                      className="px-6"
                      data-testid="button-save-band"
                    >
                      {updateArtistMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-serif font-bold text-brand-primary mb-2">Members</h2>
                  <p className="text-muted-foreground">View and manage your artist members. {(membership.role === 'admin' || membership.role === 'owner') ? 'You can invite new members and remove existing ones.' : 'Contact an admin to invite new members.'}</p>
                </div>

                {/* Current Members */}
                <div className="mb-8">
                  <h3 className="text-xl font-sans font-semibold text-card-foreground mb-4">Current Members ({artistMembers.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {artistMembers.map((member) => (
                      <div key={member.id} className="bg-muted rounded-xl p-4 flex items-center justify-between" data-testid={`member-card-${member.id}`}>
                        <div className="flex items-center space-x-4">
                          <div className="relative group">
                            {member.avatarUrl ? (
                              <img 
                                src={member.avatarUrl} 
                                alt={`${member.displayName} avatar`}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: member.color }}
                              >
                                <i className={`fas ${member.icon} text-white`}></i>
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-sans font-semibold text-card-foreground" data-testid={`member-name-${member.id}`}>{member.displayName}</h4>
                            <p className="text-sm text-muted-foreground" data-testid={`member-role-${member.id}`}>{member.role}</p>
                            {member.user?.email && (
                              <p className="text-xs text-muted-foreground">{member.user.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Edit avatar button for self or admin */}
                        
                          {/* Only allow removal if not the current user and user is admin */}
                          {member.id !== membership.id && (membership.role === 'admin' || membership.role === 'owner') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-red-500 hover:text-red-700 p-2" data-testid={`button-remove-${member.id}`}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Artist Member</AlertDialogTitle>
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
                      </div>
                    ))}
                  </div>
                </div>
                
                
                {/* Magic Link Invites - only for admins and owners */}
                {(membership.role === 'admin' || membership.role === 'owner') && (
                  <div className="border-t pt-6 mb-8">
                    <h3 className="text-xl font-sans font-semibold text-brand-primary mb-4">Magic Link Invites</h3>
                    
                    {/* General Invite Link */}
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">General Invite Link</h4>
                          <p className="text-sm text-muted-foreground">Share this link to invite people to join</p>
                        </div>
                        <Button
                          onClick={async () => {
                            try {
                              const response = await apiRequest("POST", `/api/artists/${artistId}/invites/general`);
                              const data = await response.json();
                              
                              // Copy to clipboard
                              await navigator.clipboard.writeText(data.inviteLink);
                              
                              toast({
                                title: "Invite link generated!",
                                description: "Link has been copied to your clipboard. Share it with people you want to invite.",
                                variant: "default"
                              });
                            } catch (error: any) {
                              toast({
                                title: "Error generating link",
                                description: error.message || "Please try again",
                                variant: "destructive"
                              });
                            }
                          }}
                          variant="outline"
                          size="sm"
                          data-testid="button-generate-general-link"
                        >
                          <i className="fas fa-link mr-2"></i>
                          Generate Link
                        </Button>
                      </div>
                    </div>

                    {/* Specific Member Invite */}
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">Send Specific Invite</h4>
                          <p className="text-sm text-muted-foreground">Send a personalized magic link to someone's phone</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          type="tel"
                          placeholder="+44 7xxx xxx xxx"
                          className="flex-1"
                          data-testid="input-invite-phone"
                          value={invitePhone}
                          onChange={(e) => setInvitePhone(e.target.value)}
                        />
                        <Button
                          onClick={async () => {
                            if (!invitePhone.trim()) {
                              toast({
                                title: "Phone number required",
                                description: "Please enter a phone number to send the invite",
                                variant: "destructive"
                              });
                              return;
                            }

                            try {
                              const response = await apiRequest("POST", `/api/artists/${artistId}/invites/phone`, {
                                phone: invitePhone
                              });
                              const data = await response.json();
                              
                              toast({
                                title: "Invite sent!",
                                description: `Magic link sent to ${invitePhone}`,
                                variant: "default"
                              });
                              
                              setInvitePhone("");
                            } catch (error: any) {
                              toast({
                                title: "Error sending invite",
                                description: error.message || "Please try again",
                                variant: "destructive"
                              });
                            }
                          }}
                          variant="action"
                          data-testid="button-send-invite"
                          disabled={!invitePhone.trim()}
                        >
                          <i className="fas fa-paper-plane mr-2"></i>
                          Send Invite
                        </Button>
                      </div>
                    </div>
                    
                    {/* TODO: Active Magic Links List - backend storage not implemented yet */}
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Active Magic Links</h4>
                      <p className="text-sm text-muted-foreground">Magic link management is in development. Generated links are temporary and not stored.</p>
                    </div>
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
    </div>
  );
}