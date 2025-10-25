import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useUser } from "@/lib/user-context";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, Music, Users, Settings, Mic, List, GitBranch, Clock, ChevronRight, ChevronDown, ChevronUp, X, User as UserIcon } from "lucide-react";
import type { Event, Song, ArtistMembership, Artist, User } from "@/types/api";
import GigAlertBanner from "@/components/gig-alert-banner";
import { BndySpinnerOverlay } from "@/components/ui/bndy-spinner";
import ImageUpload from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import CreateArtistWizard from "@/components/CreateArtistWizard";

// All icons verified as valid lucide-react exports

const ICONS = [
  { icon: "fa-microphone", color: "#D2691E", label: "Vocalist" },
  { icon: "fa-guitar", color: "#6B8E23", label: "Guitarist" },
  { icon: "fa-guitar", color: "#9932CC", label: "Bassist" },
  { icon: "fa-drum", color: "#DC143C", label: "Drummer" },
  { icon: "fa-piano", color: "#4169E1", label: "Keyboardist" },
  { icon: "fa-music", color: "#708090", label: "Multi-instrumentalist" },
  { icon: "fa-headphones", color: "#FF6347", label: "Producer" },
  { icon: "fa-crown", color: "#f59e0b", label: "Artist Leader" },
];

interface UserProfile {
  user: User;
  artists: ArtistMembership[];
}

interface DashboardProps {
  artistId: string | null;
  membership: ArtistMembership | null;
  userProfile: UserProfile | null;
}

interface TileProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  className?: string;
  count?: number;
  actionLabel?: string;
}

function DashboardTile({ title, subtitle, icon, color, onClick, className = "", count, actionLabel }: TileProps) {
  return (
    <Card
      className={`aspect-square w-full cursor-pointer hover-lift-subtle group border border-border animate-fade-in-up ${className}`}
      onClick={onClick}
      data-testid={`tile-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-0 h-full">
        <div
          className="h-full rounded-lg relative overflow-hidden transition-all duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${color} 0%, color-mix(in hsl, ${color} 80%, transparent 20%) 50%, color-mix(in hsl, ${color} 90%, transparent 10%) 100%)`,
            backgroundSize: '200% 200%',
            backgroundPosition: '0% 0%'
          }}
        >
          {/* Animated background on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `linear-gradient(135deg, color-mix(in hsl, ${color} 90%, transparent 10%) 0%, ${color} 50%, color-mix(in hsl, ${color} 80%, transparent 20%) 100%)`,
              backgroundSize: '200% 200%',
              backgroundPosition: '100% 100%'
            }}
          />

          {/* Background Icon - Centered and filling tile - 200% LARGER (x4 original), MORE VISIBLE */}
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-[48rem] sm:text-[56rem] lg:text-[64rem] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            {icon}
          </div>

          {/* Content - Mobile responsive padding - High contrast white text */}
          <div className="relative p-2 sm:p-4 lg:p-6 h-full flex flex-col justify-between text-white">
            <div className="transform group-hover:translate-y-[-2px] transition-transform duration-300">
              <h3 className="font-serif text-base sm:text-lg lg:text-xl font-semibold mb-0.5 sm:mb-1 text-white drop-shadow-lg leading-tight">{title}</h3>
            </div>

            <div className="flex items-center justify-between">
              {count !== undefined && (
                <div className="text-base sm:text-xl lg:text-2xl font-serif font-bold animate-bounce-soft text-white drop-shadow-lg">{count}</div>
              )}
              {actionLabel && (
                <div className="text-[10px] sm:text-sm bg-white/20 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-105 transition-all duration-300 text-white drop-shadow-md whitespace-nowrap">
                  {actionLabel}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgendaSection({ events, onEventClick, className = "" }: { 
  events: Event[],
  onEventClick: () => void,
  className?: string 
}) {
  const [expanded, setExpanded] = React.useState(false);
  const displayEvents = expanded ? events : events.slice(0, 3);
  
  const eventTypeConfig = {
    practice: { 
      icon: <Music className="h-4 w-4" />, 
      color: 'hsl(199, 89%, 48%)',
      label: 'Practice'
    },
    gig: { 
      icon: <Mic className="h-4 w-4" />, 
      color: 'hsl(24, 95%, 53%)',
      label: 'Gig'
    },
    unavailable: { 
      icon: <Clock className="h-4 w-4" />, 
      color: 'hsl(220, 13%, 51%)',
      label: 'Unavailable'
    }
  };
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-1">Upcoming Events</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {events.length} events scheduled
          </p>
        </div>
        {events.length > 3 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="text-primary hover:text-primary/80"
            data-testid="button-toggle-agenda"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Show All <ChevronDown className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
      
      <Card>
        <CardContent className="p-0">
          {displayEvents.map((event, index) => {
            const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig] || eventTypeConfig.practice;
            const eventDate = parseISO(event.date);
            // UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app
            const formattedDate = isToday(eventDate) 
              ? 'Today'
              : isTomorrow(eventDate) 
              ? 'Tomorrow'
              : format(eventDate, 'EEE, dd/MM');
              
            return (
              <div 
                key={event.id}
                className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  index !== displayEvents.length - 1 ? 'border-b border-border' : ''
                }`}
                onClick={onEventClick}
                data-testid={`agenda-item-${event.id}`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {event.title || config.label}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span className="font-medium">{formattedDate}</span>
                      {event.startTime && (
                        <span>{event.startTime}</span>
                      )}
                      {event.location && (
                        <span className="truncate">• {event.location}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function NextUpCard({ event, onClick }: { event: Event, onClick: () => void }) {
  const eventDate = parseISO(event.date);
  // UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app
  const formattedDate = isToday(eventDate) 
    ? 'Today'
    : isTomorrow(eventDate) 
    ? 'Tomorrow'
    : format(eventDate, 'EEEE, dd/MM/yyyy');
  
  const eventTypeConfig = {
    practice: { 
      icon: <Music className="h-6 w-6" />, 
      color: 'hsl(199, 89%, 48%)',
      label: 'Practice'
    },
    gig: { 
      icon: <Mic className="h-6 w-6" />, 
      color: 'hsl(24, 95%, 53%)',
      label: 'Gig'
    },
    unavailable: { 
      icon: <Clock className="h-6 w-6" />, 
      color: 'hsl(220, 13%, 51%)',
      label: 'Unavailable'
    }
  };
  
  const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig] || eventTypeConfig.practice;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10"
      onClick={onClick}
      data-testid="next-up-card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Clock className="h-4 w-4" />
          Next Up
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: config.color }}
          >
            {config.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              {event.title || config.label}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium">{formattedDate}</span>
              {event.startTime && (
                <span>{event.startTime}</span>
              )}
              {event.location && (
                <span>• {event.location}</span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function CreateArtistForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectArtist } = useUser();

  const [formData, setFormData] = useState({
    artistName: "",
    artistDescription: "",
    bandAvatar: null as string | null,
    displayName: "",
    role: "",
    icon: "fa-music",
    color: "#708090",
  });

  const createBandMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const artistResponse = await fetch("/api/artists", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.artistName,
          bio: data.artistDescription,
          artistType: "band",
          profileImageUrl: data.bandAvatar,
          memberDisplayName: data.displayName || null,
          memberInstrument: null,
          memberIcon: data.icon,
          memberColor: data.color,
        }),
      });

      if (!artistResponse.ok) {
        const errorData = await artistResponse.json();
        throw new Error(errorData.error || "Failed to create band");
      }

      const result = await artistResponse.json();
      return { artist: result.artist, membership: result.membership };
    },
    onSuccess: ({ artist }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      localStorage.setItem('bndy-selected-context-id', artist.id);

      toast({
        title: "Welcome to your band!",
        description: `${formData.artistName} has been created successfully.`,
      });

      // Select the new band
      selectArtist(artist.id);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create band",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.artistName.trim()) {
      toast({
        title: "Artist name required",
        description: "Please enter a name for your band",
        variant: "destructive",
      });
      return;
    }

    if (!formData.displayName.trim()) {
      toast({
        title: "Display name required",
        description: "Please enter your display name in the band",
        variant: "destructive",
      });
      return;
    }

    createBandMutation.mutate(formData);
  };

  const handleIconSelect = (iconData: typeof ICONS[0]) => {
    setFormData(prev => ({
      ...prev,
      icon: iconData.icon,
      color: iconData.color,
      role: prev.role || iconData.label,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-serif">Create Your Artist</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="rounded-full"
              data-testid="button-close-create-artist"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-card-foreground mb-1">Band Information</h2>

              <div>
                <Label htmlFor="artistName" className="text-card-foreground font-medium mb-1 block">Band Name *</Label>
                <Input
                  id="artistName"
                  type="text"
                  value={formData.artistName}
                  onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
                  placeholder="Enter your band name"
                  className="mt-2"
                  data-testid="input-band-name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="artistDescription" className="text-card-foreground font-medium mb-1 block">Description (Optional)</Label>
                <Textarea
                  id="artistDescription"
                  value={formData.artistDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, artistDescription: e.target.value }))}
                  placeholder="Tell us about your band..."
                  className="mt-2 resize-none"
                  data-testid="input-band-description"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-card-foreground mb-1">Your Profile</h2>

              <div>
                <Label htmlFor="displayName" className="text-card-foreground font-medium mb-1 block">Display Name *</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="How you'll appear in the band"
                  className="mt-2"
                  data-testid="input-display-name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-card-foreground font-medium mb-1 block">Role</Label>
                <Input
                  id="role"
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g., Lead Vocalist, Guitarist"
                  className="mt-2"
                  data-testid="input-role"
                />
              </div>

              <div>
                <Label className="text-card-foreground font-medium mb-2 block">Band Avatar (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">Upload a logo or image for your band</p>
                <div className="flex justify-center">
                  <ImageUpload
                    value={formData.bandAvatar || undefined}
                    onChange={(value) => setFormData(prev => ({ ...prev, bandAvatar: value }))}
                    placeholder="Upload band logo"
                    size="lg"
                    data-testid="band-avatar-upload"
                  />
                </div>
              </div>

              <div>
                <Label className="text-card-foreground font-medium mb-2 block">Choose Your Icon</Label>
                <p className="text-sm text-muted-foreground mb-3">This represents you within the band</p>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {ICONS.map((iconData) => (
                    <button
                      key={iconData.icon}
                      type="button"
                      onClick={() => handleIconSelect(iconData)}
                      className={`p-3 rounded-lg border-2 transition-all hover:shadow-md hover:scale-105 ${
                        formData.icon === iconData.icon
                          ? 'border-orange-500 bg-orange-500/10 shadow-md scale-105'
                          : 'border-border hover:border-orange-500/50 hover:bg-muted'
                      }`}
                      data-testid={`button-icon-${iconData.icon}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center mx-auto"
                        style={{ backgroundColor: iconData.color }}
                      >
                        <i className={`fas ${iconData.icon} text-primary-foreground text-sm`}></i>
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground truncate">{iconData.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-card-foreground font-medium">Your Color:</Label>
                <div
                  className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                  style={{ backgroundColor: formData.color }}
                ></div>
                <span className="text-sm text-muted-foreground font-mono">{formData.color}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                data-testid="button-cancel-create-artist"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={createBandMutation.isPending}
                data-testid="button-create-band"
              >
                {createBandMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  "Create Artist"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ArtistTile({ artist, membership, onClick }: {
  artist: Artist,
  membership: ArtistMembership,
  onClick: () => void
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in-up"
      onClick={onClick}
      data-testid={`artist-tile-${artist.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {artist.profileImageUrl ? (
            <img
              src={artist.profileImageUrl}
              alt={`${artist.name} avatar`}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: membership.color }}
            >
              <i className={`fas ${membership.icon} text-white text-lg`}></i>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{artist.name}</h3>
            <p className="text-sm text-muted-foreground">
              {membership.resolved_display_name} • {membership.role}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ artistId, membership, userProfile }: DashboardProps) {
  const [, setLocation] = useLocation();
  const { session } = useServerAuth();
  const { selectArtist } = useUser();
  const [showingCreateForm, setShowingCreateForm] = React.useState(false);
  const [fabMenuOpen, setFabMenuOpen] = React.useState(false);

  // Get upcoming events for this band - moved to top to avoid hooks violation
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/artists", artistId, "events", "upcoming"],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/calendar?startDate=${format(today, "yyyy-MM-dd")}&endDate=${format(nextMonth, "yyyy-MM-dd")}`, {
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();

      // Dashboard shows only THIS artist's events (not user unavailability or other artists)
      const artistEvents = data.artistEvents || [];

      // Filter and sort upcoming events (practices and gigs only)
      return artistEvents
        .filter((event: Event) => {
          if (event.type === "unavailable") return false;
          const eventDate = new Date(event.date + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return eventDate >= today;
        })
        .sort((a: Event, b: Event) => {
          const dateA = new Date(a.date + 'T00:00:00');
          const dateB = new Date(b.date + 'T00:00:00');
          return dateA.getTime() - dateB.getTime();
        });
    },
    enabled: !!session && !!artistId,
  });

  // Get songs for this band
  const { data: songs = [], isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "songs"],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/playbook`, {
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch songs");
      }

      const data = await response.json();

      // Transform the API response to match our interface (same as songs.tsx)
      return data.map((item: any) => ({
        id: item.id,
        spotifyId: item.globalSong?.spotifyUrl || '',
        title: item.globalSong?.title || '',
        artist: item.globalSong?.artistName || '',
        album: item.globalSong?.album || '',
        spotifyUrl: item.globalSong?.spotifyUrl || '',
        imageUrl: item.globalSong?.albumImageUrl || null,
        previewUrl: item.previewUrl || null,
        addedByMembershipId: item.added_by_membership_id,
        createdAt: item.created_at,
        readiness: item.readiness || [],
        vetos: item.vetos || [],
      }));
    },
    enabled: !!session && !!artistId,
  });

  // Get setlists for this band
  const { data: setlists = [] } = useQuery<any[]>({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists"],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/setlists`, {
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch setlists");
      }

      return response.json();
    },
    enabled: !!session && !!artistId,
  });

  // Get band members
  const { data: artistMembers = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ["/api/artists", artistId, "members"],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}/members`, {
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch band members");
      }

      const data = await response.json();
      return data.members;
    },
    enabled: !!session && !!artistId,
  });

  // Calculate some stats
  const upcomingGigs = upcomingEvents.filter(e => e.type === 'gig').length;
  const totalSongs = songs.length;
  const nextUpEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  // Handle no artist selected case
  if (!artistId || !membership) {
    // No artist memberships - show ONLY create new tile
    if (userProfile?.artists && userProfile.artists.length === 0) {
      return (
        <>
          {showingCreateForm && (
            <CreateArtistWizard
              onClose={() => setShowingCreateForm(false)}
              onSuccess={() => setShowingCreateForm(false)}
            />
          )}
          <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
            <div className="px-2 sm:px-4 lg:px-6 pt-6 pb-6">
              <div className="max-w-4xl mx-auto">
                {/* Create New Artist Tile - Only shown when no artists exist */}
                <div className="max-w-2xl mx-auto">
                  <DashboardTile
                    title="Create New"
                    subtitle="Start your artist profile"
                    icon={<Plus />}
                    color="hsl(24, 95%, 53%)"
                    actionLabel="Get Started"
                    onClick={() => setShowingCreateForm(true)}
                    className="animate-fade-in-up"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Has artists but none selected - show artist selection tiles IN dashboard
    if (userProfile?.artists && userProfile.artists.length > 0) {
      console.log('🎯 DASHBOARD: Has artists, no selection - showing artist selection tiles');
      return (
        <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
          <div className="px-2 sm:px-4 lg:px-6 pt-6 pb-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-serif font-bold text-foreground mb-6 text-center">Select Your Artist</h2>
              <div className="space-y-3">
                {userProfile.artists.map((membership) => (
                  <ArtistTile
                    key={membership.artist_id}
                    artist={membership.artist!}
                    membership={membership}
                    onClick={() => selectArtist(membership.artist_id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Still loading userProfile - show spinner
    console.log('🎯 DASHBOARD: User profile still loading');
    return <BndySpinnerOverlay />;
  }

  // Loading state - check if any queries are still loading
  const isLoading = !session || eventsLoading || songsLoading || membersLoading;

  if (isLoading) {
    return <BndySpinnerOverlay />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">{/* Mobile-first layout - header is now handled by MobileNavHeader */}

      {/* Main Content Container - Edge to Edge on Mobile */}
      <div className="px-2 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-6">
        {/* Gig Alert Banner */}
        <GigAlertBanner artistId={artistId} className="mb-3 sm:mb-4" />

        {/* Calendar & Gigs Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-3 sm:mb-4">Calendar & Gigs</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 max-w-[900px]">
            <DashboardTile
              title="Calendar"
              icon={<Calendar />}
              color="hsl(271, 91%, 65%)"
              onClick={() => setLocation("/calendar")}
              className="animate-stagger-1"
            />

            <DashboardTile
              title="Gigs"
              icon={<Mic />}
              color="hsl(24, 95%, 53%)"
              count={upcomingGigs}
              onClick={() => setLocation("/gigs")}
              className="animate-stagger-2"
            />

            <DashboardTile
              title="Profile"
              icon={<Settings />}
              color="hsl(220, 13%, 51%)"
              onClick={() => setLocation("/admin")}
              className="animate-stagger-3"
            />
          </div>
        </div>

        {/* Song Lists Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-3 sm:mb-4">Song Lists</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 max-w-[900px]">
            <DashboardTile
              title="Playbook"
              icon={<Music />}
              color="hsl(199, 89%, 48%)"
              count={totalSongs}
              onClick={() => setLocation("/songs")}
              className="animate-stagger-1"
            />

            <DashboardTile
              title="Setlists"
              icon={<List />}
              color="hsl(159, 68%, 48%)"
              count={setlists.length}
              onClick={() => setLocation("/setlists")}
              className="animate-stagger-2"
            />

            <DashboardTile
              title="Pipeline"
              icon={<GitBranch />}
              color="hsl(45, 93%, 47%)"
              count={Math.max(0, totalSongs - 5)}
              onClick={() => setLocation("/songs")}
              className="animate-stagger-3"
            />
          </div>
        </div>

        {/* Mobile Floating Action Button with Menu */}
        <div className="fixed bottom-6 right-4 sm:right-6 md:hidden">
          {/* Menu Options */}
          {fabMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => setFabMenuOpen(false)}
              />

              {/* Menu Items */}
              <div className="absolute bottom-16 right-0 flex flex-col gap-2 z-50">
                <Button
                  size="sm"
                  className="bg-card hover:bg-accent text-foreground shadow-lg rounded-full px-4 py-2 flex items-center gap-2 whitespace-nowrap"
                  onClick={() => {
                    setLocation("/calendar");
                    setFabMenuOpen(false);
                  }}
                  data-testid="fab-menu-add-event"
                >
                  <Calendar className="h-4 w-4" />
                  Add Event
                </Button>
                <Button
                  size="sm"
                  className="bg-card hover:bg-accent text-foreground shadow-lg rounded-full px-4 py-2 flex items-center gap-2 whitespace-nowrap"
                  onClick={() => {
                    setLocation("/songs");
                    setFabMenuOpen(false);
                  }}
                  data-testid="fab-menu-add-song"
                >
                  <Music className="h-4 w-4" />
                  Add Song
                </Button>
                <Button
                  size="sm"
                  className="bg-card hover:bg-accent text-foreground shadow-lg rounded-full px-4 py-2 flex items-center gap-2 whitespace-nowrap"
                  onClick={() => {
                    setLocation("/admin");
                    setFabMenuOpen(false);
                  }}
                  data-testid="fab-menu-invite-user"
                >
                  <Users className="h-4 w-4" />
                  Invite User
                </Button>
              </div>
            </>
          )}

          {/* Main FAB Button */}
          <Button
            size="lg"
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg animate-float hover-lift hover-glow-orange transition-all duration-300 group z-50 relative"
            onClick={() => setFabMenuOpen(!fabMenuOpen)}
            data-testid="fab-add"
          >
            <Plus className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 ${fabMenuOpen ? 'rotate-45' : 'group-hover:rotate-90'}`} />
          </Button>
        </div>
      </div>
    </div>
  );

}