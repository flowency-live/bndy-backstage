import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BandSwitcher from "@/components/band-switcher";
import BndyLogo from "@/components/ui/bndy-logo";
import Navigation from "@/components/navigation";
import type { Event, Song, UserBand, Band } from "@shared/schema";

interface DashboardProps {
  bandId: string;
  membership: UserBand & { band: Band };
}

export default function Dashboard({ bandId, membership }: DashboardProps) {
  const [, setLocation] = useLocation();
  const { session } = useSupabaseAuth();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

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
        })
        .slice(0, 3); // Show next 3 events
    },
    enabled: !!session?.access_token && !!bandId,
  });

  // Get recent songs for this band
  const { data: recentSongs = [], isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ["/api/bands", bandId, "songs", "recent"],
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
      
      const songs = await response.json();
      
      // Sort by most recently updated
      return songs
        .sort((a: Song, b: Song) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 4); // Show 4 most recent
    },
    enabled: !!session?.access_token && !!bandId,
  });

  // Get band member count
  const { data: bandMembers = [] } = useQuery<any[]>({
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

  const formatEventDate = (date: string) => {
    const eventDate = new Date(date + 'T00:00:00');
    if (isToday(eventDate)) {
      return "Today";
    } else if (isTomorrow(eventDate)) {
      return "Tomorrow";
    } else {
      return format(eventDate, "MMM d");
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "practice":
        return "fas fa-music";
      case "gig":
        return "fas fa-microphone";
      default:
        return "fas fa-calendar";
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "practice":
        return "bg-brand-secondary text-white";
      case "gig":
        return "bg-brand-accent text-white";
      default:
        return "bg-brand-neutral text-white";
    }
  };

  // Removed getSongReadinessColor function as songs don't have direct readiness property

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary-light">
      {/* Header with Band Context and Navigation */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Navigation Toggle */}
            <button
              onClick={() => setIsNavigationOpen(!isNavigationOpen)}
              className="p-2 text-white hover:text-white/80 transition-colors"
              data-testid="button-toggle-navigation"
            >
              <BndyLogo className="h-8 w-auto" />
            </button>

            {/* Band Context */}
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: membership.color }}
              >
                <i className={`fas ${membership.icon} text-white text-sm`}></i>
              </div>
              <div className="text-right min-w-0">
                <h1 className="text-white font-serif font-semibold text-lg leading-tight">{membership.band.name}</h1>
                <p className="text-white/80 text-sm leading-tight">{bandMembers.length} members</p>
              </div>
            </div>

            {/* Band Switcher */}
            <BandSwitcher 
              currentBandId={bandId}
              currentMembership={membership}
            />
          </div>
        </div>
      </div>

      {/* Navigation Drawer */}
      {isNavigationOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsNavigationOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 left-0 h-screen w-64 bg-brand-primary shadow-2xl z-50">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-serif text-lg">Menu</h2>
                <button 
                  onClick={() => setIsNavigationOpen(false)}
                  className="text-white hover:text-gray-200"
                  data-testid="button-close-navigation"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              {/* Navigation links */}
              <nav className="space-y-3">
                <Link
                  to="/dashboard"
                  className="w-full text-left py-3 px-4 rounded-lg text-white bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                >
                  <i className="fas fa-home w-5"></i>
                  <span className="font-serif text-lg">Dashboard</span>
                </Link>
                
                <Link
                  to="/calendar"
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                >
                  <i className="fas fa-calendar w-5"></i>
                  <span className="font-serif text-lg">Calendar</span>
                </Link>
                
                <Link
                  to="/songs"
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                >
                  <i className="fas fa-music w-5"></i>
                  <span className="font-serif text-lg">Practice List</span>
                </Link>
                
                <Link
                  to="/admin"
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                >
                  <i className="fas fa-users-cog w-5"></i>
                  <span className="font-serif text-lg">Manage Band</span>
                </Link>
                
                <Link
                  to="/profile"
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                  data-testid="link-profile"
                >
                  <i className="fas fa-user w-5"></i>
                  <span className="font-serif text-lg">Profile</span>
                </Link>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Dashboard Content */}
      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-2xl font-serif text-white mb-2">
            Welcome back, {membership.displayName}!
          </h2>
          <p className="text-white/80 font-sans">
            Here's what's happening with {membership.band.name}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setLocation("/calendar")}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 p-4 h-auto flex flex-col items-center gap-2 backdrop-blur-sm"
            data-testid="button-go-to-calendar"
          >
            <i className="fas fa-calendar text-xl"></i>
            <span className="font-serif">Calendar</span>
          </Button>
          
          <Button
            onClick={() => setLocation("/songs")}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 p-4 h-auto flex flex-col items-center gap-2 backdrop-blur-sm"
            data-testid="button-go-to-songs"
          >
            <i className="fas fa-music text-xl"></i>
            <span className="font-serif">Practice List</span>
          </Button>
        </div>

        {/* Upcoming Events */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-brand-primary font-serif flex items-center gap-2">
              <i className="fas fa-calendar-alt"></i>
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/50"
                    data-testid={`event-${event.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventTypeColor(event.type)}`}>
                      <i className={`${getEventTypeIcon(event.type)} text-xs`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-brand-primary font-semibold truncate">
                        {event.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatEventDate(event.date)}
                        {event.startTime && ` at ${event.startTime}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-calendar text-gray-400 text-2xl mb-2"></i>
                <p className="text-gray-600 font-sans">No upcoming events</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/calendar")}
                  className="mt-2 text-brand-primary"
                  data-testid="button-add-first-event"
                >
                  Add your first event
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Songs */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-brand-primary font-serif flex items-center gap-2">
              <i className="fas fa-music"></i>
              Practice List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {songsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentSongs.length > 0 ? (
              <div className="space-y-3">
                {recentSongs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/50"
                    data-testid={`song-${song.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-brand-primary font-semibold truncate">
                        {song.title}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {song.artist}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-music text-gray-400"></i>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-music text-gray-400 text-2xl mb-2"></i>
                <p className="text-gray-600 font-sans">No songs in practice list</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/songs")}
                  className="mt-2 text-brand-primary"
                  data-testid="button-add-first-song"
                >
                  Add your first song
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Band Stats */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-serif text-brand-primary">{bandMembers.length}</div>
                <div className="text-sm text-gray-600">Members</div>
              </div>
              <div>
                <div className="text-2xl font-serif text-brand-primary">{upcomingEvents.length}</div>
                <div className="text-sm text-gray-600">Upcoming</div>
              </div>
              <div>
                <div className="text-2xl font-serif text-brand-primary">{recentSongs.length}</div>
                <div className="text-sm text-gray-600">Songs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}