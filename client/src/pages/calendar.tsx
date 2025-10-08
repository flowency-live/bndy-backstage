import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useSwipe } from "@/hooks/use-swipe";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import type { Event, ArtistMembership, EVENT_TYPES } from "@/types/api";
import { EVENT_TYPE_CONFIG } from "@/types/api";
import EventModal from "@/components/event-modal";
import EventDetails from "@/components/event-details";
import PublicGigWizard from "@/components/public-gig-wizard";
import { PageHeader } from "@/components/layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import FloatingActionButton from "@/components/floating-action-button";

interface CalendarProps {
  artistId?: string | null;
  membership?: ArtistMembership | null;
}

export default function Calendar({ artistId, membership }: CalendarProps) {
  // Apply calendar theme
  useSectionTheme('calendar');

  const [, setLocation] = useLocation();
  const { session } = useServerAuth();
  const { currentArtistId, currentMembership, userProfile } = useUser();

  // Use context values if props aren't provided (for standalone usage)
  const effectiveArtistId = artistId ?? currentArtistId;
  const effectiveMembership = membership ?? currentMembership;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPublicGigWizard, setShowPublicGigWizard] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventType, setEventType] = useState<typeof EVENT_TYPES[number]>("practice");
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [dismissedHighlight, setDismissedHighlight] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
  
  // Simple toggle controls for the unified calendar view
  const [showArtistEvents, setShowArtistEvents] = useState(true);
  const [showMyEvents, setShowMyEvents] = useState(true);
  
  const { toast } = useToast();

  // Swipe handlers for month navigation
  const navigateToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const navigateToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const swipeRef = useSwipe({
    onSwipeLeft: navigateToNextMonth,
    onSwipeRight: navigateToPreviousMonth,
  }, {
    threshold: 50,
    trackMouse: false,
  });

  // Scroll to top when component loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get unified calendar data - separate arrays for different event types
  const { data: calendarData } = useQuery<{
    artistEvents: Event[];
    userEvents: Event[];
    otherArtistEvents: (Event & { artistName: string })[];
  } | Event[]>({
    queryKey: effectiveArtistId
      ? ["/api/artists", effectiveArtistId, "calendar", format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")]
      : ["/api/me/events", format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!session) {
        throw new Error("Not authenticated");
      }

      let url: string;
      if (effectiveArtistId) {
        // Artist context: get unified calendar with all event types
        url = `/api/artists/${effectiveArtistId}/calendar?startDate=${format(monthStart, "yyyy-MM-dd")}&endDate=${format(monthEnd, "yyyy-MM-dd")}`;
      } else {
        // No artist context: get user's personal events from all artists
        url = `/api/me/events?startDate=${format(monthStart, "yyyy-MM-dd")}&endDate=${format(monthEnd, "yyyy-MM-dd")}`;
      }

      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: !!session,
  });

  // Extract events from the unified calendar response or fallback to legacy format
  const allEvents: Event[] = calendarData
    ? Array.isArray(calendarData)
      ? calendarData // Legacy format (no artist context)
      : [
          ...calendarData.artistEvents,
          ...calendarData.userEvents,
          ...calendarData.otherArtistEvents.map(event => ({
            ...event,
            // Add visual indicator for cross-artist events
            title: event.title ? `${event.title} (${event.artistName})` : `${event.eventType} (${event.artistName})`
          }))
        ]
    : [];

  // Apply toggle filters based on user's preferences
  const events = allEvents.filter(event => {
    // Personal/unavailable events (including cross-artist events)
    if (event.eventType === 'unavailable' || !event.artistId) {
      return showMyEvents;
    }

    // Artist events for current artist context
    if (effectiveArtistId && event.artistId === effectiveArtistId) {
      return showArtistEvents;
    }

    // Events from other artists (when no artist context, show if artist events enabled)
    if (!effectiveArtistId) {
      return showArtistEvents;
    }

    // Other artist events in artist context (shown as part of "My Events" for cross-artist privacy)
    return showMyEvents;
  });

  // Get artist members using new artist-scoped API (only when artist context exists)
  const { data: artistMembers = [] } = useQuery<ArtistMembership[]>({
    queryKey: ["/api/artists", effectiveArtistId, "members"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/artists/${effectiveArtistId}/members`);
      const data = await response.json();
      return data.members;
    },
    enabled: !!effectiveArtistId,
  });

  // Get next upcoming artist event (only practices and gigs, not unavailability)
  const upcomingEvents = events
    .filter(event => {
      if (event.type === "unavailable") return false;
      
      const eventDate = new Date(event.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T00:00:00');
      const dateB = new Date(b.date + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });
  const nextEvent = upcomingEvents[0];

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(event => {
      const eventDate = event.date;
      const eventEndDate = event.endDate || event.date;
      return dateStr >= eventDate && dateStr <= eventEndDate;
    });
  };

  const getEventsStartingOnDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(event => event.date === dateStr);
  };

  const getEventsExtendingToDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(event => {
      if (!event.endDate || event.date === event.endDate) return false;
      return dateStr > event.date && dateStr <= event.endDate;
    });
  };

  const isMultiDayEvent = (event: any) => {
    return event.endDate && event.endDate !== event.date;
  };

  const getEventSpanDays = (event: any) => {
    if (!isMultiDayEvent(event)) return 1;
    const startDate = new Date(event.date + 'T00:00:00');
    const endDate = new Date(event.endDate + 'T00:00:00');
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const getRemainingDaysInWeek = (dayIndex: number) => {
    return 7 - (dayIndex % 7);
  };

  const getUnavailableMembers = (dateEvents: Event[]) => {
    const unavailableEvents = dateEvents.filter(e => e.type === "unavailable");
    return unavailableEvents.map(event => 
      artistMembers.find(member => member.membership_id === event.membershipId)
    ).filter(Boolean);
  };

  // Helper function to get display name for an event
  const getEventDisplayName = (event: Event & { bandName?: string; displayName?: string }) => {
    let eventName = "";

    if (event.type === "unavailable") {
      // Check if backend enriched the event with displayName (new system)
      if (event.displayName) {
        eventName = event.displayName;
      } else if (event.membershipId) {
        // Legacy band member unavailable event
        const member = artistMembers.find(member => member.membership_id === event.membershipId || member.user_id === event.membershipId);
        // For unavailable events, prefer the user's display name over the membership display name
        eventName = member?.user?.displayName?.trim() || member?.displayName || "Unavailable";
      } else if (event.ownerUserId) {
        // Fallback for events not yet enriched
        eventName = userProfile?.user?.displayName?.trim() || "Unavailable";
      } else {
        eventName = "Unavailable";
      }
    } else {
      eventName = event.title || EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.label || "Event";
    }

    // Add artist prefix when not in artist context if artistName is available
    if (!effectiveArtistId && event.artistName) {
      return `${event.artistName} - ${eventName}`;
    }

    return eventName;
  };

  // Permission function to check if user can edit an event
  const canEdit = (event: Event) => {
    // For unavailability events, check ownership
    if (event.type === "unavailable") {
      // User personal unavailable event - check if owned by current user
      if (event.ownerUserId) {
        return event.ownerUserId === userProfile?.user?.id;
      }
      // Legacy band member unavailable event - check membership
      return event.membershipId === effectiveMembership?.id;
    }
    
    // For other events, all band members can edit (could be extended with role-based permissions later)
    return true;
  };

  const getArtistEvents = (dateEvents: Event[]) => {
    return dateEvents.filter(e => e.type !== "unavailable");
  };

  const openEventModal = (date: string, type: typeof EVENT_TYPES[number]) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setEventType(type);
    setShowEventModal(true);
  };

  // Show event details (read-only first)
  const showEventDetailsModal = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  // Handle edit from details modal
  const handleEditFromDetails = (event: Event) => {
    setSelectedEvent(event);
    setSelectedDate(event.date);
    setEventType(event.type as typeof EVENT_TYPES[number]);
    setIsEditingEvent(true);
    setShowEventDetails(false);
    setShowEventModal(true);
  };

  // Handle delete from details modal
  const handleDeleteFromDetails = async (event: Event) => {
    try {
      await apiRequest("DELETE", `/api/artists/${effectiveArtistId}/events/${event.id}`);

      // Invalidate all calendar and events queries for immediate UI update
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) &&
                 queryKey[0] === '/api/artists' &&
                 queryKey[1] === effectiveArtistId &&
                 (queryKey[2] === 'events' || queryKey[2] === 'calendar');
        }
      });
      
      toast({
        title: "Event deleted",
        description: "The event has been removed from your calendar",
        variant: "default"
      });
      
      // Close the details modal
      setShowEventDetails(false);
      setSelectedEvent(null);
    } catch (error: any) {
      toast({
        title: "Error deleting event", 
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  };

  const openEditEventModal = (event: Event) => {
    // Deprecated - keeping for backward compatibility during transition
    setSelectedEvent(event);
    setSelectedDate(event.date);
    setEventType(event.type as typeof EVENT_TYPES[number]);
    setIsEditingEvent(true);
    setShowEventModal(true);
  };


  const getAgendaEvents = () => {
    return events
      .filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        const eventEndDate = event.endDate ? new Date(event.endDate + 'T00:00:00') : eventDate;
        
        // Include events that start, end, or span within the current month
        return (eventDate >= monthStart && eventDate <= monthEnd) ||
               (eventEndDate >= monthStart && eventEndDate <= monthEnd) ||
               (eventDate <= monthStart && eventEndDate >= monthEnd);
      })
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T00:00:00');
        const dateB = new Date(b.date + 'T00:00:00');
        return dateA.getTime() - dateB.getTime();
      });
  };

  const formatEventTime = (event: Event) => {
    if (!event.startTime) return "All day";
    const endTime = event.endTime ? ` - ${event.endTime}` : "";
    return `${event.startTime}${endTime}`;
  };

  // Calendar export functions
  const handleExportCalendar = async (includePrivate: boolean = false, memberOnly: boolean = false) => {
    try {
      if (!session?.access_token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to export calendar",
          variant: "destructive"
        });
        return;
      }

      const params = new URLSearchParams();
      if (includePrivate) params.append('includePrivate', 'true');
      if (memberOnly) params.append('memberOnly', 'true');

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${effectiveArtistId}/calendar/export/ical?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export calendar");
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'calendar.ics';

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Calendar exported",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      console.error("Failed to export calendar:", error);
      toast({
        title: "Export failed",
        description: "Failed to export calendar. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGetCalendarUrls = async () => {
    try {
      if (!session?.access_token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to get calendar URLs",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`https://api.bndy.co.uk/api/artists/${effectiveArtistId}/calendar/url`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get calendar URLs");
      }

      const data = await response.json();
      
      // Copy the full calendar URL to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.urls.full);
        toast({
          title: "Calendar URL copied",
          description: "Paste this URL in your calendar app to subscribe to live updates",
        });
      } else {
        toast({
          title: "Calendar URLs",
          description: "Check the console for calendar subscription URLs",
        });
        console.log("Calendar subscription URLs:", data.urls);
      }
    } catch (error) {
      console.error("Failed to get calendar URLs:", error);
      toast({
        title: "Failed to get URLs",
        description: "Failed to get calendar URLs. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      {/* Calendar Controls - Compact on mobile */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border p-2 md:p-4">
        <div className="flex items-center justify-between">
          {/* Export Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 md:gap-2 h-8 px-2 md:px-3"
                data-testid="button-calendar-export"
              >
                <i className="fas fa-download text-xs md:text-sm"></i>
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuItem
                onClick={() => handleExportCalendar(false, false)}
                data-testid="menu-export-all-public"
              >
                <i className="fas fa-calendar mr-2 w-4 h-4"></i>
                Export All Public Events
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportCalendar(true, true)}
                data-testid="menu-export-personal-all"
              >
                <i className="fas fa-user mr-2 w-4 h-4"></i>
                Export My Events (All)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportCalendar(false, true)}
                data-testid="menu-export-personal-public"
              >
                <i className="fas fa-user mr-2 w-4 h-4"></i>
                Export My Public Events
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleGetCalendarUrls}
                data-testid="menu-get-calendar-urls"
              >
                <i className="fas fa-link mr-2 w-4 h-4"></i>
                Get Subscription URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex bg-muted rounded-lg p-0.5 md:p-1">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded transition-colors ${
                viewMode === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-calendar-view"
            >
              <i className="fas fa-calendar mr-1 md:mr-2"></i>
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded transition-colors ${
                viewMode === "agenda"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-agenda-view"
            >
              <i className="fas fa-list mr-1 md:mr-2"></i>
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Event Highlight */}
      {nextEvent && !dismissedHighlight && (
        <div className="max-w-7xl mx-auto px-4 py-4 animate-fade-in-up">
          <div className="bg-card rounded-2xl p-6 shadow-lg border-l-4 border-brand-accent animate-pulse-soft hover-lift-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center">
                  <i className={`fas ${nextEvent.type === "gig" ? "fa-star" : "fa-music"} text-primary-foreground text-xl`}></i>
                </div>
                <div>
                  <h3 className="text-xl font-sans font-semibold text-card-foreground">
                    Next Up - {EVENT_TYPE_CONFIG[nextEvent.type as keyof typeof EVENT_TYPE_CONFIG]?.label || "Event"}{nextEvent.location ? ` - ${nextEvent.location}` : ''}
                  </h3>
                  <p className="text-card-foreground">
                    {format(new Date(nextEvent.date + 'T00:00:00'), "EEEE, MMMM do")}
                    {nextEvent.startTime && ` at ${nextEvent.startTime}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDismissedHighlight(true)}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-dismiss-highlight"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Combined Navigation and Toggles - Compact on mobile */}
      <div className="bg-brand-primary-light border-t">
        {/* Mobile: Single compact row */}
        <div className="flex md:hidden items-center justify-between px-2 py-1.5">
          <button
            onClick={navigateToPreviousMonth}
            className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-1"
            data-testid="button-previous-month"
          >
            <i className="fas fa-chevron-left text-base"></i>
          </button>

          <h1 className="text-slate-800 dark:text-white font-sans text-base font-semibold flex-shrink-0 mx-2">
            {format(currentDate, "MMM yyyy")}
          </h1>

          <button
            onClick={navigateToNextMonth}
            className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-1"
            data-testid="button-next-month"
          >
            <i className="fas fa-chevron-right text-base"></i>
          </button>

          <div className="flex items-center gap-1 ml-2">
            {/* Artist Events Toggle - Icon only on mobile */}
            {(effectiveArtistId || userProfile?.artists?.length) && (
              <button
                onClick={() => setShowArtistEvents(!showArtistEvents)}
                className={`
                  w-7 h-7 rounded-full text-xs font-medium border transition-all duration-200 flex items-center justify-center
                  ${showArtistEvents
                    ? 'bg-brand-accent text-white border-brand-accent'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  }
                `}
                data-testid="toggle-artist-events"
                title="Artist Events"
              >
                <i className="fas fa-users text-xs"></i>
              </button>
            )}

            {/* My Events Toggle - Icon only on mobile */}
            <button
              onClick={() => setShowMyEvents(!showMyEvents)}
              className={`
                w-7 h-7 rounded-full text-xs font-medium border transition-all duration-200 flex items-center justify-center
                ${showMyEvents
                  ? 'bg-cyan-500 text-white border-cyan-500'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }
              `}
              data-testid="toggle-my-events"
              title="My Events"
            >
              <i className="fas fa-user text-xs"></i>
            </button>
          </div>
        </div>

        {/* Desktop: Original layout with toggles and month navigation */}
        <div className="hidden md:block">
          {/* Toggle Controls */}
          <div className="px-4 py-2">
            <div className="flex flex-wrap items-center gap-4">
              {/* Artist Events Toggle */}
              {(effectiveArtistId || userProfile?.artists?.length) && (
                <button
                  onClick={() => setShowArtistEvents(!showArtistEvents)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                    ${showArtistEvents
                      ? 'bg-brand-accent text-white border-brand-accent shadow-md'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                    }
                  `}
                  data-testid="toggle-artist-events"
                >
                  <i className="fas fa-users mr-2 text-xs"></i>
                  Artist Events
                  {showArtistEvents && (
                    <i className="fas fa-check ml-2 text-xs"></i>
                  )}
                </button>
              )}

              {/* My Events Toggle */}
              <button
                onClick={() => setShowMyEvents(!showMyEvents)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                  ${showMyEvents
                    ? 'bg-cyan-500 text-white border-cyan-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                  }
                `}
                data-testid="toggle-my-events"
              >
                <i className="fas fa-user mr-2 text-xs"></i>
                My Events
                {showMyEvents && (
                  <i className="fas fa-check ml-2 text-xs"></i>
                )}
              </button>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={navigateToPreviousMonth}
                className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-2 -ml-2"
                data-testid="button-previous-month"
              >
                <i className="fas fa-chevron-left text-xl"></i>
              </button>
              <div className="flex items-center space-x-2">
                <div className="text-xs text-slate-600 dark:text-primary-foreground opacity-75">
                  <i className="fas fa-hand-point-left mr-1"></i>
                  Swipe to navigate
                </div>
                <div className="flex flex-col items-center">
                  <h1 className="text-slate-800 dark:text-white font-sans text-xl font-semibold">
                    {format(currentDate, "MMMM yyyy")}
                  </h1>
                </div>
              </div>
              <button
                onClick={navigateToNextMonth}
                className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-2 -mr-2"
                data-testid="button-next-month"
              >
                <i className="fas fa-chevron-right text-xl"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar/Agenda View */}
        {viewMode === "calendar" ? (
          <div ref={swipeRef} className="select-none">
            {/* Week headers */}
            <div className="grid grid-cols-7 bg-brand-neutral dark:bg-gray-800">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="p-2 sm:p-3 text-center text-sm sm:text-base font-sans font-semibold text-brand-primary dark:text-gray-300">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-300 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {calendarDays.map((day, index) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayEvents = getEventsForDate(day);
                const startingEvents = getEventsStartingOnDate(day);
                const extendingEvents = getEventsExtendingToDate(day);
                const artistEvents = getArtistEvents(dayEvents);
                const unavailableMembers = getUnavailableMembers(dayEvents);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday_ = isToday(day);

                return (
                  <div
                    key={index}
                    className={`min-h-20 p-1 relative ${
                      isCurrentMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'
                    } ${isToday_ ? 'ring-2 ring-brand-accent ring-inset' : ''}`}
                    data-testid={`calendar-day-${dateStr}`}
                  >
                    {/* Date number */}
                    <div className={`absolute top-1 right-1 text-xs font-medium ${
                      isCurrentMonth 
                        ? isToday_ 
                          ? 'bg-brand-accent text-white rounded px-1' 
                          : 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {format(day, 'd')}
                    </div>

                    {/* Events */}
                    <div className="space-y-1">
                      {/* Starting events */}
                      {startingEvents.map((event, eventIndex) => {
                        const getEventColors = (eventType: string) => {
                          switch (eventType) {
                            case 'unavailable':
                              return 'border-red-500 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-500/20 dark:text-red-200';
                            case 'practice':
                              return 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-200';
                            case 'gig':
                            case 'public_gig':
                              return 'border-purple-500 bg-purple-50 text-purple-800 dark:border-purple-400 dark:bg-purple-500/20 dark:text-purple-200';
                            case 'festival':
                              return 'border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-500/20 dark:text-green-200';
                            default:
                              return 'border-gray-500 bg-gray-50 text-gray-800 dark:border-gray-400 dark:bg-gray-500/20 dark:text-gray-200';
                          }
                        };
                        
                        const spanDays = Math.min(getEventSpanDays(event), getRemainingDaysInWeek(index));
                        const eventColors = getEventColors(event.type);
                        
                        return (
                          <div
                            key={`start-${event.id}-${eventIndex}`}
                            className={`mt-0.5 w-full rounded-sm px-1 py-0.5 text-[10px] leading-tight truncate border-l-2 cursor-pointer ${eventColors}`}
                            style={{
                              position: isMultiDayEvent(event) ? 'absolute' : 'relative',
                              left: isMultiDayEvent(event) ? '4px' : 'auto',
                              right: isMultiDayEvent(event) ? spanDays < getRemainingDaysInWeek(index) ? 'auto' : '4px' : 'auto',
                              zIndex: 10 + eventIndex,
                              top: isMultiDayEvent(event) ? `${20 + (eventIndex * 16)}px` : 'auto',
                              width: isMultiDayEvent(event) ? `calc(${spanDays * 100}% - 8px)` : 'auto',
                            }}
                            onClick={() => showEventDetailsModal(event)}
                            data-testid={`event-${event.id}`}
                          >
                            {event.type === 'unavailable' && <span className="mr-1">✗</span>}
                            {event.startTime ? `${event.startTime} • ${getEventDisplayName(event)}` : getEventDisplayName(event)}
                          </div>
                        );
                      })}

                      {/* Extending events */}
                      {extendingEvents.map((event, eventIndex) => {
                        const getEventColors = (eventType: string) => {
                          switch (eventType) {
                            case 'unavailable':
                              return 'border-red-500 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-500/20 dark:text-red-200';
                            case 'practice':
                              return 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-200';
                            case 'gig':
                            case 'public_gig':
                              return 'border-purple-500 bg-purple-50 text-purple-800 dark:border-purple-400 dark:bg-purple-500/20 dark:text-purple-200';
                            case 'festival':
                              return 'border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-500/20 dark:text-green-200';
                            default:
                              return 'border-gray-500 bg-gray-50 text-gray-800 dark:border-gray-400 dark:bg-gray-500/20 dark:text-gray-200';
                          }
                        };
                        
                        const remainingDays = getRemainingDaysInWeek(index);
                        const eventEndDate = new Date(event.endDate + 'T00:00:00');
                        const currentWeekEnd = new Date(day.getTime() + (remainingDays - 1) * 24 * 60 * 60 * 1000);
                        const spanDays = eventEndDate <= currentWeekEnd ? 
                          Math.ceil((eventEndDate.getTime() - day.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 
                          remainingDays;
                        const eventColors = getEventColors(event.type);
                        
                        return (
                          <div
                            key={`extend-${event.id}-${eventIndex}`}
                            className={`mt-0.5 rounded-sm px-1 py-0.5 text-[10px] leading-tight truncate border-l-2 cursor-pointer absolute ${eventColors}`}
                            style={{
                              left: '4px',
                              right: spanDays < remainingDays ? 'auto' : '4px',
                              zIndex: 10 + eventIndex,
                              top: `${20 + (eventIndex * 16)}px`,
                              width: `calc(${spanDays * 100}% - 8px)`,
                            }}
                            onClick={() => showEventDetailsModal(event)}
                            data-testid={`event-extending-${event.id}`}
                          >
                            {event.type === 'unavailable' && <span className="mr-1">✗</span>}
                            {getEventDisplayName(event)}
                          </div>
                        );
                      })}
                    </div>


                    {/* Add event button (only for current month) */}
                    {isCurrentMonth && (
                      <div className="absolute inset-0 bg-transparent hover:bg-brand-primary/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEventModal(dateStr, "practice")}
                          className="w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg"
                          title="Add event"
                          data-testid={`button-add-event-${dateStr}`}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Agenda View */
          <div className="p-4 space-y-4">
            {getAgendaEvents().length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  <i className="fas fa-calendar-times text-4xl"></i>
                </div>
                <h3 className="text-lg font-sans font-semibold text-muted-foreground mb-2">No events this month</h3>
                <p className="text-muted-foreground">Add some practices or gigs to get started</p>
              </div>
            ) : (
              getAgendaEvents().map((event) => (
                <div
                  key={event.id}
                  className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-brand-accent cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => showEventDetailsModal(event)}
                  data-testid={`agenda-event-${event.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground"
                         style={{ backgroundColor: EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.color || EVENT_TYPE_CONFIG.practice.color }}>
                      <span className="text-xl">{EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.icon || EVENT_TYPE_CONFIG.practice.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-sans font-semibold text-card-foreground">
                        {event.type === 'unavailable' && <span className="mr-1 text-red-500">✗</span>}
                        {getEventDisplayName(event)}
                      </h4>
                      <p className="text-muted-foreground">
                        {format(new Date(event.date + 'T00:00:00'), "EEEE, MMMM do")}
                        {event.startTime && ` • ${formatEventTime(event)}`}
                      </p>
                      {(event.venue || event.location) && (
                        <p className="text-muted-foreground text-sm">
                          {event.isPublic ? `📍 ${event.venue}` : `🏠 ${event.location}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Event Modal - show when artist context exists with membership */}
      {showEventModal && effectiveArtistId && effectiveMembership && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setIsEditingEvent(false);
            setSelectedEvent(null);
          }}
          selectedDate={selectedDate}
          selectedEvent={selectedEvent}
          eventType={eventType}
          currentUser={effectiveMembership}
          artistId={effectiveArtistId}
          onPublicGigSelected={() => {
            setShowEventModal(false);
            setShowPublicGigWizard(true);
          }}
        />
      )}

      {/* Public Gig Wizard - full screen wizard for creating public gigs */}
      {showPublicGigWizard && effectiveArtistId && effectiveMembership && (
        <PublicGigWizard
          isOpen={showPublicGigWizard}
          onClose={() => {
            setShowPublicGigWizard(false);
            // Refresh calendar data after creating gig
            queryClient.invalidateQueries({
              predicate: (query) => {
                const queryKey = query.queryKey;
                return Array.isArray(queryKey) &&
                       queryKey[0] === '/api/artists' &&
                       queryKey[1] === effectiveArtistId &&
                       (queryKey[2] === 'events' || queryKey[2] === 'calendar');
              }
            });
          }}
          artistId={effectiveArtistId}
          currentUser={effectiveMembership}
          initialData={selectedDate ? { date: selectedDate } : undefined}
        />
      )}

      {/* Event Details Modal */}
      <EventDetails
        event={selectedEvent}
        open={showEventDetails}
        onClose={() => {
          setShowEventDetails(false);
          setSelectedEvent(null);
        }}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
        artistMembers={artistMembers}
        currentMembershipId={effectiveMembership?.membership_id || null}
        canEdit={canEdit}
      />

      {/* Floating Action Button - always show */}
      {true && (
        <FloatingActionButton
          onClick={() => {
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setSelectedEvent(null);
            setEventType('practice');
            setIsEditingEvent(false);
            setShowEventModal(true);
          }}
          hidden={showEventModal || showEventDetails}
        />
      )}

    </div>
  );
}