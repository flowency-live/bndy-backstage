import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useSwipe } from "@/hooks/use-swipe";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import type { Event, UserBand, Band, EVENT_TYPES } from "@shared/schema";
import { EVENT_TYPE_CONFIG } from "@shared/schema";
import EventModal from "@/components/event-modal";
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

interface CalendarProps {
  bandId: string;
  membership: UserBand & { band: Band };
}

export default function Calendar({ bandId, membership }: CalendarProps) {
  // Apply calendar theme
  useSectionTheme('calendar');
  
  const [, setLocation] = useLocation();
  const { session } = useSupabaseAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventType, setEventType] = useState<typeof EVENT_TYPES[number]>("practice");
  const [dismissedHighlight, setDismissedHighlight] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
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

  // Get events for this band using new band-scoped API
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/bands", bandId, "events", format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`/api/bands/${bandId}/events?startDate=${format(monthStart, "yyyy-MM-dd")}&endDate=${format(monthEnd, "yyyy-MM-dd")}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      
      return response.json();
    },
    enabled: !!session?.access_token && !!bandId,
  });

  // Get band members using new band-scoped API
  const { data: bandMembers = [] } = useQuery<(UserBand & { user: any })[]>({
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

  // Get next upcoming band event (only practices and gigs, not unavailability)
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
      bandMembers.find(member => member.id === event.membershipId)
    ).filter(Boolean);
  };

  // Helper function to get display name for an event
  const getEventDisplayName = (event: Event) => {
    if (event.type === "unavailable" && event.membershipId) {
      const member = bandMembers.find(member => member.id === event.membershipId);
      return member?.displayName || "Unavailable";
    }
    return event.title || EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.label || "Event";
  };

  const getBandEvents = (dateEvents: Event[]) => {
    return dateEvents.filter(e => e.type !== "unavailable");
  };

  const openEventModal = (date: string, type: typeof EVENT_TYPES[number]) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setEventType(type);
    setShowEventModal(true);
  };

  const openEditEventModal = (event: Event) => {
    // Check if user can edit this event
    if (event.type === "unavailable" && event.membershipId !== membership.id) {
      return; // Can't edit other members' unavailability
    }
    
    setSelectedEvent(event);
    setSelectedDate(event.date);
    setEventType(event.type as typeof EVENT_TYPES[number]);
    setShowEventModal(true);
  };


  const getAgendaEvents = () => {
    return events
      .filter(event => {
        if (event.type === "unavailable") return false;
        
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate >= monthStart && eventDate <= monthEnd;
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

      const response = await fetch(`/api/bands/${bandId}/calendar/export/ical?${params.toString()}`, {
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

      const response = await fetch(`/api/bands/${bandId}/calendar/url`, {
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
      {/* Calendar Controls */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between">
          {/* Export Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                data-testid="button-calendar-export"
              >
                <i className="fas fa-download text-sm"></i>
                Export
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
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                viewMode === "calendar" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-calendar-view"
            >
              <i className="fas fa-calendar mr-2"></i>
              Calendar
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                viewMode === "agenda" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-agenda-view"
            >
              <i className="fas fa-list mr-2"></i>
              Agenda
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
                    Next Up: {nextEvent.title || (nextEvent.type === "gig" ? "Gig" : "Band Practice")}
                  </h3>
                  <p className="text-card-foreground">
                    {format(new Date(nextEvent.date + 'T00:00:00'), "EEEE, MMMM do")}
                    {nextEvent.startTime && ` at ${nextEvent.startTime}`}
                  </p>
                  {nextEvent.location && (
                    <p className="text-muted-foreground text-sm">{nextEvent.location}</p>
                  )}
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


      {/* Calendar Navigation */}
      <div className="bg-background">
        <div className="bg-brand-primary-light px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={navigateToPreviousMonth}
              className="text-white hover:text-gray-200 p-2 -ml-2"
              data-testid="button-previous-month"
            >
              <i className="fas fa-chevron-left text-xl"></i>
            </button>
            <div className="flex items-center space-x-2">
              <div className="hidden md:block text-xs text-primary-foreground opacity-75">
                <i className="fas fa-hand-point-left mr-1"></i>
                Swipe to navigate
              </div>
              <h1 className="text-white font-sans text-xl font-semibold">
                {format(currentDate, "MMMM yyyy")}
              </h1>
            </div>
            <button 
              onClick={navigateToNextMonth}
              className="text-white hover:text-gray-200 p-2 -mr-2"
              data-testid="button-next-month"
            >
              <i className="fas fa-chevron-right text-xl"></i>
            </button>
          </div>
        </div>

        {/* Calendar/Agenda View */}
        {viewMode === "calendar" ? (
          <div ref={swipeRef} className="select-none">
            {/* Week headers */}
            <div className="grid grid-cols-7 bg-brand-neutral dark:bg-gray-800">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-sans font-semibold text-brand-primary dark:text-gray-300">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayEvents = getEventsForDate(day);
                const startingEvents = getEventsStartingOnDate(day);
                const extendingEvents = getEventsExtendingToDate(day);
                const bandEvents = getBandEvents(dayEvents);
                const unavailableMembers = getUnavailableMembers(dayEvents);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday_ = isToday(day);

                return (
                  <div
                    key={index}
                    className={`min-h-24 border-r border-b border-gray-200 dark:border-gray-700 p-1 relative ${
                      isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                    } ${isToday_ ? 'ring-2 ring-brand-accent ring-inset animate-glow-today' : ''}`}
                    data-testid={`calendar-day-${dateStr}`}
                  >
                    {/* Date number */}
                    <div className={`text-sm font-sans font-semibold mb-1 ${
                      isCurrentMonth 
                        ? isToday_ ? 'text-brand-accent' : 'text-brand-primary'
                        : 'text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </div>

                    {/* Events */}
                    <div className="space-y-1">
                      {/* Starting events */}
                      {startingEvents.map((event, eventIndex) => {
                        const config = EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.practice;
                        const spanDays = Math.min(getEventSpanDays(event), getRemainingDaysInWeek(index));
                        
                        return (
                          <div
                            key={`start-${event.id}-${eventIndex}`}
                            className="text-white text-xs p-1 rounded cursor-pointer relative overflow-hidden"
                            style={{
                              backgroundColor: config.color,
                              gridColumn: isMultiDayEvent(event) ? `span ${spanDays}` : 'span 1',
                              position: isMultiDayEvent(event) ? 'absolute' : 'relative',
                              left: isMultiDayEvent(event) ? '4px' : 'auto',
                              right: isMultiDayEvent(event) ? spanDays < getRemainingDaysInWeek(index) ? 'auto' : '4px' : 'auto',
                              zIndex: 10 + eventIndex,
                              top: isMultiDayEvent(event) ? `${24 + (eventIndex * 20)}px` : 'auto',
                              width: isMultiDayEvent(event) ? `calc(${spanDays * 100}% - 8px)` : 'auto',
                            }}
                            onClick={() => openEditEventModal(event)}
                            data-testid={`event-${event.id}`}
                          >
                            <div className="font-semibold truncate flex items-center">
                              <span className="mr-1">{config.icon}</span>
                              {getEventDisplayName(event)}
                            </div>
                            {event.startTime && (
                              <div className="truncate opacity-90">{event.startTime}</div>
                            )}
                          </div>
                        );
                      })}

                      {/* Extending events */}
                      {extendingEvents.map((event, eventIndex) => {
                        const config = EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.practice;
                        const remainingDays = getRemainingDaysInWeek(index);
                        const eventEndDate = new Date(event.endDate + 'T00:00:00');
                        const currentWeekEnd = new Date(day.getTime() + (remainingDays - 1) * 24 * 60 * 60 * 1000);
                        const spanDays = eventEndDate <= currentWeekEnd ? 
                          Math.ceil((eventEndDate.getTime() - day.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 
                          remainingDays;
                        
                        return (
                          <div
                            key={`extend-${event.id}-${eventIndex}`}
                            className="text-white text-xs p-1 rounded cursor-pointer absolute overflow-hidden"
                            style={{
                              backgroundColor: config.color,
                              left: '4px',
                              right: spanDays < remainingDays ? 'auto' : '4px',
                              zIndex: 10 + eventIndex,
                              top: `${24 + (eventIndex * 20)}px`,
                              width: `calc(${spanDays * 100}% - 8px)`,
                            }}
                            onClick={() => openEditEventModal(event)}
                            data-testid={`event-extending-${event.id}`}
                          >
                            <div className="font-semibold truncate flex items-center">
                              <span className="mr-1">{config.icon}</span>
                              {getEventDisplayName(event)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Unavailable members indicator */}
                    {unavailableMembers.length > 0 && (
                      <div className="absolute bottom-1 right-1 flex -space-x-1">
                        {unavailableMembers.slice(0, 3).map((member, i) => (
                          <div
                            key={`unavailable-${member?.id}-${i}`}
                            className="w-4 h-4 rounded-full border border-white flex items-center justify-center"
                            style={{ backgroundColor: member?.color }}
                            title={`${member?.displayName} unavailable`}
                          >
                            <i className={`fas ${member?.icon} text-white text-xs`}></i>
                          </div>
                        ))}
                        {unavailableMembers.length > 3 && (
                          <div className="w-4 h-4 rounded-full bg-muted border border-foreground flex items-center justify-center text-foreground text-xs">
                            +{unavailableMembers.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add event buttons (only for current month) */}
                    {isCurrentMonth && (
                      <div className="absolute inset-0 bg-transparent hover:bg-brand-primary/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openEventModal(dateStr, "practice")}
                            className="w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white text-xs"
                            title="Add practice"
                            data-testid={`button-add-practice-${dateStr}`}
                          >
                            <i className="fas fa-music"></i>
                          </button>
                          <button
                            onClick={() => openEventModal(dateStr, "public_gig")}
                            className="w-6 h-6 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center text-white text-xs"
                            title="Add gig"
                            data-testid={`button-add-gig-${dateStr}`}
                          >
                            <i className="fas fa-star"></i>
                          </button>
                          <button
                            onClick={() => openEventModal(dateStr, "unavailable")}
                            className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs"
                            title="Mark unavailable"
                            data-testid={`button-add-unavailable-${dateStr}`}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
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
                  onClick={() => openEditEventModal(event)}
                  data-testid={`agenda-event-${event.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground"
                         style={{ backgroundColor: EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.color || EVENT_TYPE_CONFIG.practice.color }}>
                      <span className="text-xl">{EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.icon || EVENT_TYPE_CONFIG.practice.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-sans font-semibold text-card-foreground">
                        {event.title || EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]?.label || "Event"}
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

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          selectedDate={selectedDate}
          selectedEvent={selectedEvent}
          eventType={eventType}
          currentUser={membership}
          bandId={bandId}
        />
      )}

    </div>
  );
}