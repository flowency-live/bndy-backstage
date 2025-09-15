import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useUser } from "@/lib/user-context";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSwipe } from "@/hooks/use-swipe";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import type { Event, UserBand, Band } from "@shared/schema";
import EventModal from "@/components/event-modal";
import BandSwitcher from "@/components/band-switcher";
import BndyLogo from "@/components/ui/bndy-logo";

interface CalendarProps {
  bandId: string;
  membership: UserBand & { band: Band };
}

export default function Calendar({ bandId, membership }: CalendarProps) {
  const [, setLocation] = useLocation();
  const { session } = useSupabaseAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventType, setEventType] = useState<"practice" | "gig" | "unavailable">("practice");
  const [dismissedHighlight, setDismissedHighlight] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

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

  const getBandEvents = (dateEvents: Event[]) => {
    return dateEvents.filter(e => e.type === "practice" || e.type === "gig");
  };

  const openEventModal = (date: string, type: "practice" | "gig" | "unavailable") => {
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
    setEventType(event.type as "practice" | "gig" | "unavailable");
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

  return (
    <div className="min-h-screen bg-brand-neutral-light">
      {/* Header with band switcher */}
      <header className="bg-white shadow-sm border-b-4 border-brand-accent">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="grid grid-cols-3 items-center">
            {/* Left: Menu toggle */}
            <div className="justify-self-start text-left">
              <button 
                onClick={() => setIsNavigationOpen(!isNavigationOpen)}
                className="font-serif text-brand-primary hover:text-brand-primary-dark transition-colors leading-tight text-left"
                data-testid="button-menu-toggle"
              >
                <BndyLogo className="w-6 h-6" />
              </button>
            </div>
            
            {/* Center: Band switcher */}
            <div className="justify-self-center max-w-xs w-full">
              <BandSwitcher 
                currentBandId={bandId} 
                currentMembership={membership} 
              />
            </div>
            
            {/* Right: Calendar text */}
            <div className="justify-self-end">
              <span className="text-brand-primary font-serif font-semibold">Calendar</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation drawer */}
      {isNavigationOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsNavigationOpen(false)}
          />
          
          <div className="absolute left-0 top-0 h-full w-60 bg-brand-primary shadow-xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-serif text-lg">Menu</h2>
                <button 
                  onClick={() => setIsNavigationOpen(false)}
                  className="text-white hover:text-gray-200"
                  data-testid="button-close-menu"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <nav className="space-y-4">
                <Link 
                  href="/calendar" 
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                  data-testid="link-calendar"
                >
                  <i className="fas fa-calendar w-5"></i>
                  <span className="font-serif text-lg">Calendar</span>
                </Link>
                <Link 
                  href="/songs" 
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                  data-testid="link-songs"
                >
                  <i className="fas fa-music w-5"></i>
                  <span className="font-serif text-lg">Practice List</span>
                </Link>
                <Link 
                  href="/admin" 
                  className="w-full text-left py-3 px-4 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center space-x-3"
                  onClick={() => setIsNavigationOpen(false)}
                  data-testid="link-admin"
                >
                  <i className="fas fa-users-cog w-5"></i>
                  <span className="font-serif text-lg">Band Settings</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Event Highlight */}
      {nextEvent && !dismissedHighlight && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-brand-accent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center">
                  <i className={`fas ${nextEvent.type === "gig" ? "fa-star" : "fa-music"} text-white text-xl`}></i>
                </div>
                <div>
                  <h3 className="text-xl font-sans font-semibold text-brand-primary">
                    Next Up: {nextEvent.title || (nextEvent.type === "gig" ? "Gig" : "Band Practice")}
                  </h3>
                  <p className="text-gray-700">
                    {format(new Date(nextEvent.date + 'T00:00:00'), "EEEE, MMMM do")}
                    {nextEvent.startTime && ` at ${nextEvent.startTime}`}
                  </p>
                  {nextEvent.location && (
                    <p className="text-gray-600 text-sm">{nextEvent.location}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setDismissedHighlight(true)}
                className="text-gray-400 hover:text-gray-600"
                data-testid="button-dismiss-highlight"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile View Toggle */}
      <div className="md:hidden max-w-7xl mx-auto px-4 py-2">
        <div className="flex bg-brand-neutral rounded-full p-1">
          <button 
            onClick={() => setViewMode("calendar")}
            className={`flex-1 py-2 rounded-full text-sm font-sans font-semibold transition-colors ${
              viewMode === "calendar" 
                ? "bg-brand-primary text-white" 
                : "text-brand-primary"
            }`}
            data-testid="button-calendar-view"
          >
            <i className="fas fa-calendar mr-1"></i>Calendar
          </button>
          <button 
            onClick={() => setViewMode("agenda")}
            className={`flex-1 py-2 rounded-full text-sm font-sans font-semibold transition-colors ${
              viewMode === "agenda" 
                ? "bg-brand-primary text-white" 
                : "text-brand-primary"
            }`}
            data-testid="button-agenda-view"
          >
            <i className="fas fa-list mr-1"></i>Agenda
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white">
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
              <div className="hidden md:block text-xs text-white opacity-75">
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
            <div className="grid grid-cols-7 bg-brand-neutral">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-sans font-semibold text-brand-primary">
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
                    className={`min-h-24 border-r border-b border-gray-200 p-1 relative ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    } ${isToday_ ? 'ring-2 ring-brand-accent ring-inset' : ''}`}
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
                        const eventColor = event.type === "gig" ? "bg-yellow-500" : 
                                         event.type === "practice" ? "bg-blue-500" : "bg-red-500";
                        const textColor = "text-white";
                        const spanDays = Math.min(getEventSpanDays(event), getRemainingDaysInWeek(index));
                        
                        return (
                          <div
                            key={`start-${event.id}-${eventIndex}`}
                            className={`${eventColor} ${textColor} text-xs p-1 rounded cursor-pointer relative overflow-hidden`}
                            style={{
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
                            <div className="font-semibold truncate">
                              {event.title || (event.type === "gig" ? "Gig" : event.type === "practice" ? "Practice" : "Unavailable")}
                            </div>
                            {event.startTime && (
                              <div className="truncate opacity-90">{event.startTime}</div>
                            )}
                          </div>
                        );
                      })}

                      {/* Extending events */}
                      {extendingEvents.map((event, eventIndex) => {
                        const eventColor = event.type === "gig" ? "bg-yellow-500" : 
                                         event.type === "practice" ? "bg-blue-500" : "bg-red-500";
                        const textColor = "text-white";
                        const remainingDays = getRemainingDaysInWeek(index);
                        const eventEndDate = new Date(event.endDate + 'T00:00:00');
                        const currentWeekEnd = new Date(day.getTime() + (remainingDays - 1) * 24 * 60 * 60 * 1000);
                        const spanDays = eventEndDate <= currentWeekEnd ? 
                          Math.ceil((eventEndDate.getTime() - day.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 
                          remainingDays;
                        
                        return (
                          <div
                            key={`extend-${event.id}-${eventIndex}`}
                            className={`${eventColor} ${textColor} text-xs p-1 rounded cursor-pointer absolute overflow-hidden`}
                            style={{
                              left: '4px',
                              right: spanDays < remainingDays ? 'auto' : '4px',
                              zIndex: 10 + eventIndex,
                              top: `${24 + (eventIndex * 20)}px`,
                              width: `calc(${spanDays * 100}% - 8px)`,
                            }}
                            onClick={() => openEditEventModal(event)}
                            data-testid={`event-extending-${event.id}`}
                          >
                            <div className="font-semibold truncate">
                              {event.title || (event.type === "gig" ? "Gig" : event.type === "practice" ? "Practice" : "Unavailable")}
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
                          <div className="w-4 h-4 rounded-full bg-gray-500 border border-white flex items-center justify-center text-white text-xs">
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
                            onClick={() => openEventModal(dateStr, "gig")}
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
                <div className="text-gray-400 mb-4">
                  <i className="fas fa-calendar-times text-4xl"></i>
                </div>
                <h3 className="text-lg font-sans font-semibold text-gray-600 mb-2">No events this month</h3>
                <p className="text-gray-500">Add some practices or gigs to get started</p>
              </div>
            ) : (
              getAgendaEvents().map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-brand-accent cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openEditEventModal(event)}
                  data-testid={`agenda-event-${event.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.type === "gig" ? "bg-yellow-500" : "bg-blue-500"
                    }`}>
                      <i className={`fas ${event.type === "gig" ? "fa-star" : "fa-music"} text-white`}></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-sans font-semibold text-brand-primary">
                        {event.title || (event.type === "gig" ? "Gig" : "Band Practice")}
                      </h4>
                      <p className="text-gray-600">
                        {format(new Date(event.date + 'T00:00:00'), "EEEE, MMMM do")}
                        {event.startTime && ` • ${formatEventTime(event)}`}
                      </p>
                      {event.location && (
                        <p className="text-gray-500 text-sm">{event.location}</p>
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