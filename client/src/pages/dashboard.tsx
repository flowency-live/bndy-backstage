import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useUser } from "@/lib/user-context";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Calendar, Music, Users, Settings, Mic, List, GitBranch, Clock, ChevronRight } from "lucide-react";
import type { Event, Song, UserBand, Band, User } from "@shared/schema";
import GigAlertBanner from "@/components/gig-alert-banner";
import { BndySpinnerOverlay } from "@/components/ui/bndy-spinner";

// All icons verified as valid lucide-react exports

interface UserProfile {
  user: User;
  bands: (UserBand & { band: Band })[];
}

interface DashboardProps {
  bandId: string | null;
  membership: (UserBand & { band: Band }) | null;
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
      className={`h-32 sm:h-36 lg:h-40 cursor-pointer hover-lift-subtle group border border-border animate-fade-in-up ${className}`}
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
          
          {/* Background Icon - Responsive sizing */}
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 text-white/20 text-4xl sm:text-5xl lg:text-6xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            {icon}
          </div>
          
          {/* Content - Mobile responsive padding - High contrast white text */}
          <div className="relative p-3 sm:p-4 lg:p-6 h-full flex flex-col justify-between text-white">
            <div className="transform group-hover:translate-y-[-2px] transition-transform duration-300">
              <h3 className="font-serif text-base sm:text-lg lg:text-xl font-semibold mb-1 text-white drop-shadow-lg">{title}</h3>
              {subtitle && (
                <p className="text-white/90 text-xs sm:text-sm drop-shadow-md">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              {count !== undefined && (
                <div className="text-lg sm:text-xl lg:text-2xl font-serif font-bold animate-bounce-soft text-white drop-shadow-lg">{count}</div>
              )}
              {actionLabel && (
                <div className="text-xs sm:text-sm bg-white/20 px-2 py-1 sm:px-3 sm:py-1 rounded-full backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-105 transition-all duration-300 text-white drop-shadow-md">
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

function NextUpCard({ event, onClick }: { event: Event, onClick: () => void }) {
  const eventDate = parseISO(event.date);
  const formattedDate = isToday(eventDate) 
    ? 'Today'
    : isTomorrow(eventDate) 
    ? 'Tomorrow'
    : format(eventDate, 'EEEE, MMM d');
  
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

function BandTile({ band, membership, onClick }: { 
  band: Band, 
  membership: UserBand & { band: Band },
  onClick: () => void 
}) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in-up"
      onClick={onClick}
      data-testid={`band-tile-${band.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {band.avatarUrl ? (
            <img
              src={band.avatarUrl}
              alt={`${band.name} avatar`}
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
            <h3 className="text-lg font-semibold text-foreground">{band.name}</h3>
            <p className="text-sm text-muted-foreground">
              {membership.displayName} • {membership.role}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ bandId, membership, userProfile }: DashboardProps) {
  const [, setLocation] = useLocation();
  const { session } = useSupabaseAuth();
  const { selectBand } = useUser();

  // Handle no band selected case - show band tiles
  if (!bandId || !membership || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
        <div className="px-2 sm:px-4 lg:px-6 pt-6 pb-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-4">
                Select Your Band
              </h1>
              <p className="text-muted-foreground text-lg">
                Choose a band to access your dashboard, calendar, and practice lists
              </p>
            </div>
            
            <div className="grid gap-4 max-w-2xl mx-auto">
              {userProfile?.bands.map((bandMembership) => (
                <BandTile
                  key={bandMembership.bandId}
                  band={bandMembership.band}
                  membership={bandMembership}
                  onClick={() => {
                    selectBand(bandMembership.bandId);
                    // The page will automatically reload due to band selection
                  }}
                />
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Button
                variant="outline"
                onClick={() => setLocation('/onboarding')}
                className="mr-4"
                data-testid="button-create-new-band"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Band
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get upcoming events for this band  
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/bands", bandId, "events", "upcoming"],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);
      
      const response = await fetch(`/api/bands/${bandId}/events?startDate=${format(today, "yyyy-MM-dd")}&endDate=${format(nextMonth, "yyyy-MM-dd")}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      
      const events = await response.json();
      
      // Filter and sort upcoming events (practices and gigs only)
      return events
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
    enabled: !!session?.access_token && !!bandId,
  });

  // Get songs for this band
  const { data: songs = [], isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ["/api/bands", bandId, "songs"],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`/api/bands/${bandId}/songs`, {
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
    enabled: !!session?.access_token && !!bandId,
  });

  // Get band members
  const { data: bandMembers = [], isLoading: membersLoading } = useQuery<any[]>({
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

  // Calculate some stats
  const upcomingGigs = upcomingEvents.filter(e => e.type === 'gig').length;
  const totalSongs = songs.length;
  const nextUpEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  // Loading state - check if any queries are still loading
  const isLoading = !session?.access_token || eventsLoading || songsLoading || membersLoading;

  if (isLoading) {
    return <BndySpinnerOverlay message="Loading your band dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">{/* Mobile-first layout - header is now handled by MobileNavHeader */}

      {/* Main Content Container - Edge to Edge on Mobile */}
      <div className="px-2 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-6">
        {/* Gig Alert Banner */}
        <GigAlertBanner bandId={bandId} className="mb-3 sm:mb-4" />
        
        {/* Next Up Card */}
        {nextUpEvent && (
          <div className="mb-6 sm:mb-8">
            <NextUpCard 
              event={nextUpEvent} 
              onClick={() => setLocation('/calendar')} 
            />
          </div>
        )}
        {/* Song Management Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-1 sm:mb-2">Song Management</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Organize your repertoire and setlists</p>
            </div>
            <Button 
              onClick={() => setLocation("/songs")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground self-start sm:self-auto"
              size="sm"
              data-testid="button-add-song"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Song
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <DashboardTile
              title="Playbook"
              subtitle="Complete song repertoire"
              icon={<Music />}
              color="hsl(199, 89%, 48%)"
              count={totalSongs}
              actionLabel="View All"
              onClick={() => setLocation("/songs")}
              className="animate-stagger-1"
            />
            
            <DashboardTile
              title="Setlists"
              subtitle="Ready-to-perform sets"
              icon={<List />}
              color="hsl(159, 68%, 48%)"
              count={0}
              actionLabel="Create"
              onClick={() => setLocation("/songs")}
              className="animate-stagger-2"
            />
            
            <DashboardTile
              title="Pipeline"
              subtitle="Songs in development"
              icon={<GitBranch />}
              color="hsl(45, 93%, 47%)"
              count={Math.max(0, totalSongs - 5)}
              actionLabel="Review"
              onClick={() => setLocation("/songs")}
              className="animate-stagger-3"
            />
          </div>
        </div>

        {/* Calendar & Gigs Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-1 sm:mb-2">Calendar & Gigs</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Schedule and manage your events</p>
            </div>
            <Button 
              onClick={() => setLocation("/calendar")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground self-start sm:self-auto"
              size="sm"
              data-testid="button-add-event"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
            <DashboardTile
              title="Calendar"
              subtitle="All scheduled events"
              icon={<Calendar />}
              color="hsl(271, 91%, 65%)"
              count={upcomingEvents.length}
              actionLabel="View Calendar"
              onClick={() => setLocation("/calendar")}
              className="animate-stagger-1"
            />
            
            <DashboardTile
              title="Gigs"
              subtitle="Performance schedule"
              icon={<Mic />}
              color="hsl(24, 95%, 53%)"
              count={upcomingGigs}
              actionLabel="View Gigs"
              onClick={() => setLocation("/calendar")}
              className="animate-stagger-2"
            />
          </div>
        </div>

        {/* Members & Settings Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Members Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-1 sm:mb-2">Members</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Band member management</p>
              </div>
              <Button 
                onClick={() => setLocation("/admin")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground self-start sm:self-auto"
                size="sm"
                data-testid="button-invite-member"
              >
                <Plus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </div>

            <DashboardTile
              title="Band Members"
              subtitle="Manage your team"
              icon={<Users />}
              color="hsl(142, 71%, 45%)"
              count={bandMembers.length}
              actionLabel="Manage"
              onClick={() => setLocation("/admin")}
              className="animate-stagger-3"
            />
          </div>

          {/* Settings Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-1 sm:mb-2">Settings</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Band configuration</p>
              </div>
            </div>

            <DashboardTile
              title="Band Settings"
              subtitle="Configure your band"
              icon={<Settings />}
              color="hsl(220, 13%, 51%)"
              actionLabel="Configure"
              onClick={() => setLocation("/admin")}
              className="animate-stagger-4"
            />
          </div>
        </div>

        {/* Mobile Floating Action Button */}
        <div className="fixed bottom-6 right-4 sm:right-6 md:hidden">
          <Button 
            size="lg"
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg animate-float hover-lift hover-glow-orange transition-all duration-300 group"
            onClick={() => setLocation("/songs")}
            data-testid="fab-add"
          >
            <Plus className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover:rotate-90" />
          </Button>
        </div>
      </div>
    </div>
  );

}