import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { UserBand, Band } from "@shared/schema";
import { EVENT_TYPES, EVENT_TYPE_CONFIG } from "@shared/schema";
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

const ICONS = [
  { icon: "fa-microphone", color: "#D2691E", label: "Microphone" },
  { icon: "fa-guitar", color: "#6B8E23", label: "Guitar" },
  { icon: "fa-guitar", color: "#9932CC", label: "Bass" },
  { icon: "fa-drum", color: "#DC143C", label: "Drums" },
  { icon: "fa-piano", color: "#4169E1", label: "Piano" },
  { icon: "fa-music", color: "#708090", label: "Music" },
];

interface MagicLink {
  id: string;
  token: string;
  type: 'general' | 'phone';
  createdAt: string;
  expiresAt?: string;
  usesRemaining?: number;
  maxUses?: number;
  targetPhone?: string;
  createdBy: string;
  status: 'active' | 'expired' | 'revoked';
}

interface AdminProps {
  bandId: string;
  membership: UserBand & { band: Band };
}

function AvatarUploadModal({ membershipId, member, bandId, session, onClose, onSuccess }: {
  membershipId: string;
  member: any;
  bandId: string;
  session: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(member?.avatarUrl || null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const saveMutation = useMutation({
    mutationFn: async (newAvatarUrl: string | null) => {
      if (!session?.access_token) {
        throw new Error('No access token');
      }
      
      const response = await fetch(`/api/bands/${bandId}/members/${membershipId}/avatar`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ avatarUrl: newAvatarUrl })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update avatar');
      }
      
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating avatar",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync(avatarUrl);
    } finally {
      setSaving(false);
    }
  };
  
  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Avatar</DialogTitle>
          <DialogDescription>
            Update {member?.displayName || 'member'}'s avatar image
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            {/* Current Avatar Preview */}
            <div className="w-24 h-24">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={`${member?.displayName} avatar`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center border-2 border-border"
                  style={{ backgroundColor: member?.color || '#708090' }}
                >
                  <i className={`fas ${member?.icon || 'fa-user'} text-white text-2xl`}></i>
                </div>
              )}
            </div>
            
            {/* Upload Component */}
            <ImageUpload
              value={avatarUrl ?? undefined}
              onChange={(url) => setAvatarUrl(url)}
              size="md"
              placeholder="Upload new avatar"
            />
            
            {/* Remove Avatar Button */}
            {avatarUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAvatar}
                className="text-destructive hover:text-destructive"
              >
                <i className="fas fa-trash mr-2"></i>
                Remove Avatar
              </Button>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="action" 
            onClick={handleSave} 
            disabled={saving || saveMutation.isPending}
          >
            {saving || saveMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Save Avatar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActiveMagicLinks({ bandId, session, toast }: {
  bandId: string;
  session: any;
  toast: any;
}) {
  // Query for active magic links
  const { data: magicLinks = [], isLoading: linksLoading, refetch: refetchLinks } = useQuery<MagicLink[]>({
    queryKey: ['/api/bands', bandId, 'invites'],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error('No access token');
      }
      
      const response = await fetch(`/api/bands/${bandId}/invites`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch magic links');
      }
      
      return response.json();
    },
    enabled: !!session?.access_token && !!bandId
  });
  
  // Mutation for revoking magic links
  const revokeLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      if (!session?.access_token) {
        throw new Error('No access token');
      }
      
      const response = await fetch(`/api/bands/${bandId}/invites/${linkId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to revoke magic link');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchLinks();
      toast({
        title: "Magic link revoked",
        description: "The invite link has been successfully revoked",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error revoking link",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });
  
  if (linksLoading) {
    return (
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="text-center text-muted-foreground">Loading active invites...</div>
      </div>
    );
  }
  
  if (magicLinks.length === 0) {
    return (
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-semibold text-foreground mb-2">Active Magic Links</h4>
        <p className="text-sm text-muted-foreground">No active invite links. Generate one above to get started.</p>
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <h4 className="font-semibold text-foreground mb-3">Active Magic Links ({magicLinks.length})</h4>
      <div className="space-y-3">
        {magicLinks.map((link) => {
          const createdDate = new Date(link.createdAt);
          const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
          
          return (
            <Card key={link.id} className="border border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={link.type === 'general' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {link.type === 'general' ? 'General Invite' : 'Phone Invite'}
                      </Badge>
                      <Badge 
                        variant={isExpired ? 'destructive' : link.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {isExpired ? 'Expired' : link.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Created: {createdDate.toLocaleDateString()} at {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      {link.targetPhone && (
                        <div>Phone: {link.targetPhone}</div>
                      )}
                      {link.maxUses && (
                        <div>Uses: {(link.maxUses - (link.usesRemaining || 0))} / {link.maxUses}</div>
                      )}
                      {link.expiresAt && (
                        <div>Expires: {new Date(link.expiresAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {link.status === 'active' && !isExpired && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const baseUrl = window.location.origin;
                          const inviteUrl = `${baseUrl}/invite/${link.token}`;
                          
                          try {
                            await navigator.clipboard.writeText(inviteUrl);
                            toast({
                              title: "Link copied!",
                              description: "Magic link copied to clipboard",
                              variant: "default"
                            });
                          } catch {
                            toast({
                              title: "Copy failed",
                              description: "Unable to copy to clipboard",
                              variant: "destructive"
                            });
                          }
                        }}
                        data-testid={`button-copy-${link.id}`}
                      >
                        <i className="fas fa-copy mr-1 text-xs"></i>
                        Copy
                      </Button>
                    )}
                    
                    {link.status === 'active' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            data-testid={`button-revoke-${link.id}`}
                          >
                            <i className="fas fa-ban mr-1 text-xs"></i>
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Magic Link</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke this invite link? Anyone with this link will no longer be able to join the band. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeLinkMutation.mutate(link.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Revoke Link
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Admin({ bandId, membership }: AdminProps) {
  // Apply band theme for admin/management pages
  useSectionTheme('band');
  
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
  const [activeTab, setActiveTab] = useState<'band' | 'members' | 'spotify'>('band');
  const [invitePhone, setInvitePhone] = useState("");
  const [bandSettings, setBandSettings] = useState({
    name: membership.band.name,
    description: membership.band.description || '',
    avatar: membership.band.avatarUrl || null,
    allowedEventTypes: membership.band.allowedEventTypes || ['practice', 'public_gig'],
  });

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

  // Band settings mutation
  const updateBandMutation = useMutation({
    mutationFn: async (settings: typeof bandSettings) => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`/api/bands/${bandId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description,
          avatarUrl: settings.avatar,
          allowedEventTypes: settings.allowedEventTypes,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update band");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bands", bandId] });
      toast({
        title: "Success",
        description: "Band settings updated successfully",
      });
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
        <GigAlertBanner bandId={bandId} className="mb-4" />
      </div>
      
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="bg-card rounded-t-2xl border-b border-border">
            <div className="flex space-x-0 px-1 pt-1">
              <button
                onClick={() => setActiveTab('band')}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'band'
                    ? 'bg-background text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                data-testid="tab-band"
              >
                <i className="fas fa-cog mr-2"></i>
                Band Settings
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
            {/* Band Settings Tab */}
            {activeTab === 'band' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-serif font-bold text-brand-primary mb-2">Band Information</h2>
                  <p className="text-muted-foreground">Any band member can edit these details to keep your band's profile up to date.</p>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  updateBandMutation.mutate(bandSettings);
                }} className="space-y-6">
                  
                  {/* Band Avatar */}
                  <div>
                    <Label className="text-card-foreground font-semibold mb-3 block">Band Avatar</Label>
                    <p className="text-sm text-muted-foreground mb-4">Upload a logo or image for your band</p>
                    <div className="flex justify-center">
                      <ImageUpload
                        value={bandSettings.avatar || undefined}
                        onChange={(value) => setBandSettings(prev => ({ ...prev, avatar: value }))}
                        placeholder="Upload band logo"
                        size="lg"
                        data-testid="band-avatar-upload"
                      />
                    </div>
                  </div>

                  {/* Band Name */}
                  <div>
                    <Label htmlFor="bandName" className="text-card-foreground font-semibold mb-2 block">Band Name *</Label>
                    <Input
                      id="bandName"
                      type="text"
                      value={bandSettings.name}
                      onChange={(e) => setBandSettings(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter band name"
                      className="focus:border-brand-primary focus:ring-brand-primary"
                      data-testid="input-band-name"
                      required
                    />
                  </div>

                  {/* Band Description */}
                  <div>
                    <Label htmlFor="bandDescription" className="text-card-foreground font-semibold mb-2 block">Description</Label>
                    <Textarea
                      id="bandDescription"
                      value={bandSettings.description}
                      onChange={(e) => setBandSettings(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Tell us about your band..."
                      className="focus:border-brand-primary focus:ring-brand-primary resize-none"
                      data-testid="input-band-description"
                      rows={4}
                    />
                  </div>

                  {/* Event Types Configuration */}
                  <div>
                    <Label className="text-card-foreground font-semibold mb-3 block">Allowed Event Types</Label>
                    <p className="text-sm text-muted-foreground mb-4">Choose which event types your band uses. Members will only see these options when creating events.</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {EVENT_TYPES.filter(type => type !== 'unavailable').map((type) => {
                        const config = EVENT_TYPE_CONFIG[type];
                        const isSelected = bandSettings.allowedEventTypes.includes(type);
                        
                        return (
                          <button 
                            key={type}
                            type="button"
                            onClick={() => {
                              setBandSettings(prev => {
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
                      onClick={() => {
                        setBandSettings({
                          name: membership.band.name,
                          description: membership.band.description || '',
                          avatar: membership.band.avatarUrl || null,
                          allowedEventTypes: membership.band.allowedEventTypes || ['practice', 'public_gig'],
                        });
                      }}
                      className="px-6"
                      data-testid="button-cancel-band"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="action"
                      disabled={updateBandMutation.isPending}
                      className="px-6"
                      data-testid="button-save-band"
                    >
                      {updateBandMutation.isPending ? (
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
                  <h2 className="text-2xl font-serif font-bold text-brand-primary mb-2">Member Management</h2>
                  <p className="text-muted-foreground">View and manage your band members. {membership.role === 'admin' ? 'As an admin, you can invite new members and remove existing ones.' : 'Contact an admin to invite new members.'}</p>
                </div>

                {/* Current Members */}
                <div className="mb-8">
                  <h3 className="text-xl font-sans font-semibold text-card-foreground mb-4">Current Members ({bandMembers.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bandMembers.map((member) => (
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
                      </div>
                    ))}
                  </div>
                </div>
                
                
                {/* Magic Link Invites - only for admins */}
                {membership.role === 'admin' && (
                  <div className="border-t pt-6 mb-8">
                    <h3 className="text-xl font-sans font-semibold text-brand-primary mb-4">Magic Link Invites</h3>
                    
                    {/* General Band Join Link */}
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">General Band Invite Link</h4>
                          <p className="text-sm text-muted-foreground">Share this link with multiple people to join your band</p>
                        </div>
                        <Button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/bands/${bandId}/invites/general`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${session?.access_token}`,
                                  'Content-Type': 'application/json'
                                }
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to generate invite link');
                              }
                              
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
                              const response = await fetch(`/api/bands/${bandId}/invites/phone`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${session?.access_token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  phone: invitePhone
                                })
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to send invite');
                              }
                              
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
                    
                    {/* Active Magic Links List */}
                    <ActiveMagicLinks 
                      bandId={bandId} 
                      session={session} 
                      toast={toast}
                    />
                  </div>
                )}

                {/* Add New Member - only for admins */}
                {membership.role === 'admin' && (
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-sans font-semibold text-brand-primary mb-4">Manual Member Addition</h3>
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
    </div>
  );
}