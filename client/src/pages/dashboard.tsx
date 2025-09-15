import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Calendar, Music, Users, Settings, Mic, List, GitBranch, Clock } from "lucide-react";
import type { Event, Song, UserBand, Band } from "@shared/schema";
import GigAlertBanner from "@/components/gig-alert-banner";

// All icons verified as valid lucide-react exports

interface DashboardProps {
  bandId: string;
  membership: UserBand & { band: Band };
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
      className={`h-40 cursor-pointer hover-lift-subtle group border border-slate-700 animate-fade-in-up ${className}`}
      onClick={onClick}
      data-testid={`tile-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-0 h-full">
        <div 
          className="h-full rounded-lg relative overflow-hidden transition-all duration-300 group-hover:scale-105"
          style={{ 
            background: `linear-gradient(135deg, ${color} 0%, ${color}80 50%, ${color}CC 100%)`,
            backgroundSize: '200% 200%',
            backgroundPosition: '0% 0%'
          }}
        >
          {/* Animated background on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ 
              background: `linear-gradient(135deg, ${color}CC 0%, ${color} 50%, ${color}80 100%)`,
              backgroundSize: '200% 200%',
              backgroundPosition: '100% 100%'
            }}
          />
          
          {/* Background Icon */}
          <div className="absolute top-2 right-2 text-white/20 text-6xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            {icon}
          </div>
          
          {/* Content */}
          <div className="relative p-6 h-full flex flex-col justify-between text-white">
            <div className="transform group-hover:translate-y-[-2px] transition-transform duration-300">
              <h3 className="font-serif text-xl font-semibold mb-1">{title}</h3>
              {subtitle && (
                <p className="text-white/80 text-sm">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              {count !== undefined && (
                <div className="text-2xl font-serif font-bold animate-bounce-soft">{count}</div>
              )}
              {actionLabel && (
                <div className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-105 transition-all duration-300">
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

export default function Dashboard({ bandId, membership }: DashboardProps) {
  const [, setLocation] = useLocation();
  const { session } = useSupabaseAuth();

  // Get upcoming events for this band
  const { data: upcomingEvents = [] } = useQuery<Event[]>({
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
  const { data: songs = [] } = useQuery<Song[]>({
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

  // Calculate some stats
  const upcomingGigs = upcomingEvents.filter(e => e.type === 'gig').length;
  const totalSongs = songs.length;

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      {/* Band Profile Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-6">
            {/* Band Avatar */}
            <Avatar className="h-20 w-20 border-2 border-orange-500">
              <AvatarImage src={membership.band.avatarUrl || ''} alt={membership.band.name} />
              <AvatarFallback className="bg-orange-500 text-white text-2xl font-serif">
                {membership.band.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Band Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold text-white mb-2">
                {membership.band.name}
              </h1>
              <div className="flex items-center gap-4 text-slate-300">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {bandMembers.length} members
                </span>
                <span className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  {totalSongs} songs
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {upcomingGigs} upcoming gigs
                </span>
              </div>
            </div>

            {/* User Role */}
            <div className="text-right">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: membership.color }}
                >
                  <i className={`fas ${membership.icon} text-white`}></i>
                </div>
                <div>
                  <div className="text-white font-semibold">{membership.displayName}</div>
                  <div className="text-slate-400 text-sm capitalize">{membership.role}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gig Alert Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <GigAlertBanner bandId={bandId} className="mb-6" />
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {/* Song Management Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-white mb-2">Song Management</h2>
              <p className="text-slate-400">Organize your repertoire and setlists</p>
            </div>
            <Button 
              onClick={() => setLocation("/songs")}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-add-song"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Song
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-white mb-2">Calendar & Gigs</h2>
              <p className="text-slate-400">Schedule and manage your events</p>
            </div>
            <Button 
              onClick={() => setLocation("/calendar")}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-add-event"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Members Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2">Members</h2>
                <p className="text-slate-400">Band member management</p>
              </div>
              <Button 
                onClick={() => setLocation("/admin")}
                className="bg-orange-500 hover:bg-orange-600 text-white"
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2">Settings</h2>
                <p className="text-slate-400">Band configuration</p>
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
        <div className="fixed bottom-6 right-6 md:hidden">
          <Button 
            size="lg"
            className="rounded-full w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white shadow-lg animate-float hover-lift hover-glow-orange transition-all duration-300 group"
            onClick={() => setLocation("/songs")}
            data-testid="fab-add"
          >
            <Plus className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" />
          </Button>
        </div>
      </div>
    </div>
  );
}