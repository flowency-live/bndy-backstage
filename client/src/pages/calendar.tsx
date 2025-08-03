import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { useSwipe } from "@/hooks/use-swipe";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import type { Event, BandMember } from "@shared/schema";
import EventModal from "@/components/event-modal";

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { currentUser, logout } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventType, setEventType] = useState<"practice" | "gig" | "unavailable">("practice");
  const [dismissedHighlight, setDismissedHighlight] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");

  // Swipe handlers for month navigation
  const navigateToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const navigateToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const swipeRef = useSwipe({
    onSwipeLeft: navigateToNextMonth,
    onSwipeRight: navigateToPreviousMonth,
  }, {
    threshold: 50, // Lower threshold for easier swiping
    trackMouse: false, // Only track touch events
  });

  // Redirect if no user selected
  if (!currentUser) {
    setLocation("/personas");
    return null;
  }

  // Scroll to top when component loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday = 1
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events", format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(`/api/events?startDate=${format(monthStart, "yyyy-MM-dd")}&endDate=${format(monthEnd, "yyyy-MM-dd")}`);
      return response.json();
    },
  });

  const { data: bandMembers = [] } = useQuery<BandMember[]>({
    queryKey: ["/api/band-members"],
  });

  // Get next upcoming band event (only practices and gigs, not unavailability)
  const upcomingEvents = events
    .filter(event => {
      // Only show band events (practice/gig), not unavailability
      if (event.type === "unavailable") return false;
      
      // Parse date as local time by adding T00:00:00 to ensure local timezone
      const eventDate = new Date(event.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today
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

  // Get events that start on a specific date (for rendering spanning events)
  const getEventsStartingOnDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(event => event.date === dateStr);
  };

  // Get events that continue from previous days (for showing partial spans)
  const getEventsExtendingToDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(event => {
      if (!event.endDate || event.date === event.endDate) return false;
      return dateStr > event.date && dateStr <= event.endDate;
    });
  };

  // Check if event is multi-day
  const isMultiDayEvent = (event: any) => {
    return event.endDate && event.endDate !== event.date;
  };

  // Calculate how many days an event spans from a given start date
  const getEventSpanDays = (event: any) => {
    if (!isMultiDayEvent(event)) return 1;
    const startDate = new Date(event.date + 'T00:00:00');
    const endDate = new Date(event.endDate + 'T00:00:00');
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // Calculate remaining days in current week from a given day
  const getRemainingDaysInWeek = (dayIndex: number) => {
    return 7 - (dayIndex % 7);
  };

  const getUnavailableMembers = (dateEvents: Event[]) => {
    const unavailableEvents = dateEvents.filter(e => e.type === "unavailable");
    return unavailableEvents.map(event => 
      bandMembers.find(member => member.id === event.memberId)
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
    if (event.type === "unavailable" && event.memberId !== currentUser.id) {
      return; // Can't edit other members' unavailability
    }
    
    setSelectedEvent(event);
    setSelectedDate(event.date);
    setEventType(event.type as "practice" | "gig" | "unavailable");
    setShowEventModal(true);
  };

  // Get agenda events for the current month (only band events, no unavailability)
  const getAgendaEvents = () => {
    return events
      .filter(event => {
        // Only show band events (practice/gig), not unavailability
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
    <div className="min-h-screen bg-torrist-cream-light">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-torrist-orange">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-serif text-torrist-green">The Torrists</h1>
              <div className="flex items-center space-x-2 bg-torrist-cream rounded-full px-4 py-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentUser.color }}
                >
                  <i className={`fas ${currentUser.icon} text-white text-sm`}></i>
                </div>
                <span className="font-sans text-torrist-green font-semibold">{currentUser.name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="hidden md:flex bg-torrist-cream rounded-full p-1">
                <button 
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1 rounded-full text-sm font-sans font-semibold transition-colors ${
                    viewMode === "calendar" 
                      ? "bg-torrist-green text-white" 
                      : "text-torrist-green hover:bg-white"
                  }`}
                >
                  <i className="fas fa-calendar mr-1"></i>Calendar
                </button>
                <button 
                  onClick={() => setViewMode("agenda")}
                  className={`px-3 py-1 rounded-full text-sm font-sans font-semibold transition-colors ${
                    viewMode === "agenda" 
                      ? "bg-torrist-green text-white" 
                      : "text-torrist-green hover:bg-white"
                  }`}
                >
                  <i className="fas fa-list mr-1"></i>Agenda
                </button>
              </div>
              <button 
                onClick={() => {
                  logout();
                  setLocation("/personas");
                }}
                className="text-torrist-green hover:text-torrist-green-dark"
                title="Switch user"
              >
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
              <button 
                onClick={() => openEventModal(format(new Date(), "yyyy-MM-dd"), "practice")}
                className="bg-torrist-orange hover:bg-torrist-orange-light text-white px-4 py-2 rounded-full font-sans font-semibold"
              >
                <i className="fas fa-plus mr-2"></i>Add Event
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Upcoming Event Highlight */}
      {nextEvent && !dismissedHighlight && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-torrist-orange">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-torrist-orange rounded-full flex items-center justify-center">
                  <i className={`fas ${nextEvent.type === "gig" ? "fa-star" : "fa-music"} text-white text-xl`}></i>
                </div>
                <div>
                  <h3 className="text-xl font-sans font-semibold text-torrist-green">
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
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile View Toggle */}
      <div className="md:hidden max-w-7xl mx-auto px-4 py-2">
        <div className="flex bg-torrist-cream rounded-full p-1">
          <button 
            onClick={() => setViewMode("calendar")}
            className={`flex-1 py-2 rounded-full text-sm font-sans font-semibold transition-colors ${
              viewMode === "calendar" 
                ? "bg-torrist-green text-white" 
                : "text-torrist-green"
            }`}
          >
            <i className="fas fa-calendar mr-1"></i>Calendar
          </button>
          <button 
            onClick={() => setViewMode("agenda")}
            className={`flex-1 py-2 rounded-full text-sm font-sans font-semibold transition-colors ${
              viewMode === "agenda" 
                ? "bg-torrist-green text-white" 
                : "text-torrist-green"
            }`}
          >
            <i className="fas fa-list mr-1"></i>Agenda
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white">
        <div className="bg-torrist-green-light px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={navigateToPreviousMonth}
              className="text-white hover:text-gray-200 p-2 -ml-2"
            >
              <i className="fas fa-chevron-left text-xl"></i>
            </button>
            <div className="flex items-center space-x-2">
              <div className="hidden md:block text-xs text-white opacity-75">
                <i className="fas fa-hand-point-left mr-1"></i>
                Swipe to navigate
              </div>
              <h2 className="text-xl md:text-2xl font-serif text-white uppercase tracking-wide">
                {format(currentDate, "MMM yyyy")}
              </h2>
              <div className="hidden md:block text-xs text-white opacity-75">
                <i className="fas fa-hand-point-right ml-1"></i>
              </div>
            </div>
            <button 
              onClick={navigateToNextMonth}
              className="text-white hover:text-gray-200 p-2 -mr-2"
            >
              <i className="fas fa-chevron-right text-xl"></i>
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
            <div key={`header-${idx}`} className="text-center font-medium text-gray-700 py-2 text-xs">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {viewMode === "calendar" && (
          <div ref={swipeRef} className="grid grid-cols-7 touch-swipe-area">
              
              {calendarDays.map((day, dayIndex) => {
                const dayEvents = getEventsForDate(day);
                const eventsStartingToday = getEventsStartingOnDate(day);
                const eventsExtendingToday = getEventsExtendingToDate(day);
                const unavailableMembers = getUnavailableMembers(dayEvents);
                const bandEvents = getBandEvents(eventsStartingToday); // Only events that start today
                const dateStr = format(day, "yyyy-MM-dd");
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);

                return (
                  <div 
                    key={dateStr}
                    className={`min-h-[90px] border-r border-b border-gray-200 p-1 cursor-pointer hover:bg-gray-50 relative overflow-hidden ${
                      !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    }`}
                    onClick={() => openEventModal(dateStr, "practice")}
                  >
                    {/* Date number - Google Calendar style */}
                    <div className={`text-sm font-medium mb-1 relative z-20 ${
                      isTodayDate 
                        ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold' 
                        : isCurrentMonth 
                          ? 'text-gray-900' 
                          : 'text-gray-400'
                    }`}>
                      {format(day, "d")}
                    </div>

                    {/* Events - Google Calendar style with spanning capability */}
                    <div className="space-y-0.5 relative">
                      {/* Band events that start today - with spanning */}
                      {bandEvents.slice(0, 3).map((event, idx) => {
                        const eventColor = event.type === "gig" ? "bg-torrist-orange" : "bg-torrist-green";
                        const timeStr = event.startTime ? event.startTime.substring(0, 5) : "";
                        const spanDays = getEventSpanDays(event);
                        const cellsAvailable = getRemainingDaysInWeek(dayIndex);
                        const cellsToSpan = Math.min(spanDays, cellsAvailable);
                        
                        return (
                          <div 
                            key={`band-${idx}`}
                            className={`${eventColor} text-white rounded-sm px-1 py-0.5 text-xs leading-tight shadow-sm absolute z-10 cursor-pointer hover:opacity-80`}
                            style={{
                              left: 0,
                              right: isMultiDayEvent(event) ? `${100 - (cellsToSpan * 100)}%` : 0,
                              top: `${idx * 18}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditEventModal(event);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              {event.type === "gig" && <i className="fas fa-star text-xs"></i>}
                              <span className="truncate flex-1 font-medium">
                                {event.title || (event.type === "gig" ? "Gig" : "Practice")}
                                {event.location && (
                                  <span className="text-xs opacity-90 block truncate">
                                    {event.location}
                                  </span>
                                )}
                                {isMultiDayEvent(event) && spanDays > cellsAvailable && (
                                  <span className="text-xs opacity-75 ml-1">...</span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Unavailable events that start today - with spanning */}
                      {eventsStartingToday.filter(e => e.type === "unavailable").slice(0, 2).map((event, idx) => {
                        const member = bandMembers.find(m => m.id === event.memberId);
                        const spanDays = getEventSpanDays(event);
                        const cellsAvailable = getRemainingDaysInWeek(dayIndex);
                        const cellsToSpan = Math.min(spanDays, cellsAvailable);
                        
                        const canEdit = event.memberId === currentUser.id;
                        return (
                          <div 
                            key={`unavail-start-${idx}`}
                            className={`rounded-sm px-1 py-0.5 text-xs leading-tight shadow-sm absolute z-10 ${
                              canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'
                            }`}
                            style={{
                              borderLeft: `3px solid ${member?.color}`,
                              backgroundColor: 'rgba(219, 112, 147, 0.15)',
                              left: 0,
                              right: isMultiDayEvent(event) ? `${100 - (cellsToSpan * 100)}%` : 0,
                              top: `${(bandEvents.length + idx) * 18}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canEdit) {
                                openEditEventModal(event);
                              }
                            }}
                          >
                            <span className="text-gray-800 truncate font-medium">
                              {member?.name} unavailable
                              {!canEdit && <i className="fas fa-lock text-xs ml-1 opacity-50"></i>}
                              {isMultiDayEvent(event) && spanDays > cellsAvailable && (
                                <span className="text-xs opacity-75 ml-1">...</span>
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {/* Show continuation bars for multi-day events extending to this day */}
                      {eventsExtendingToday.filter(e => e.type === "unavailable").slice(0, 2).map((event, idx) => {
                        const member = bandMembers.find(m => m.id === event.memberId);
                        const isLastDay = event.endDate === dateStr;
                        const isFirstDayOfWeek = dayIndex % 7 === 0;
                        
                        return (
                          <div 
                            key={`unavail-extend-${idx}`}
                            className={`rounded-sm px-1 py-0.5 text-xs leading-tight shadow-sm absolute z-10 ${
                              event.memberId === currentUser.id ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'
                            } ${
                              isFirstDayOfWeek ? 'rounded-l-sm' : 'rounded-l-none'
                            } ${
                              isLastDay ? 'rounded-r-sm' : 'rounded-r-none'
                            }`}
                            style={{
                              borderLeft: isFirstDayOfWeek ? `3px solid ${member?.color}` : 'none',
                              backgroundColor: 'rgba(219, 112, 147, 0.15)',
                              left: 0,
                              right: isLastDay ? 0 : '-2px',
                              top: `${(bandEvents.length + idx) * 18}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (event.memberId === currentUser.id) {
                                openEditEventModal(event);
                              }
                            }}
                          >
                            <span className="text-gray-800 truncate font-medium">
                              {member?.name} unavailable
                              {event.memberId !== currentUser.id && <i className="fas fa-lock text-xs ml-1 opacity-50"></i>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        )}
        
        {/* Agenda View */}
        {viewMode === "agenda" && (
          <div className="p-6">
              <div className="space-y-4">
                {getAgendaEvents().length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <i className="fas fa-calendar text-4xl"></i>
                    </div>
                    <h3 className="text-lg font-sans font-semibold text-gray-600 mb-2">
                      No events in {format(currentDate, "MMMM yyyy")}
                    </h3>
                    <p className="text-gray-500">Add some practices, gigs, or mark your availability</p>
                  </div>
                ) : (
                  getAgendaEvents().map((event) => {
                    const eventMember = bandMembers.find(member => member.id === event.memberId);
                    return (
                      <div key={event.id} className="bg-gray-50 rounded-xl p-4 border-l-4" style={{
                        borderLeftColor: event.type === "gig" ? "var(--torrist-orange)" : 
                                        event.type === "practice" ? "var(--torrist-green)" : 
                                        "var(--torrist-unavailable)"
                      }}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ 
                                  backgroundColor: event.type === "gig" ? "var(--torrist-orange)" : 
                                                 event.type === "practice" ? "var(--torrist-green)" : 
                                                 "var(--torrist-unavailable)"
                                }}
                              >
                                <i className={`fas ${
                                  event.type === "gig" ? "fa-star" : 
                                  event.type === "practice" ? "fa-music" : 
                                  "fa-ban"
                                } text-white text-sm`}></i>
                              </div>
                              <div>
                                <h4 className="font-sans font-semibold text-gray-800">
                                  {event.title || 
                                   (event.type === "gig" ? "Gig" : 
                                    event.type === "practice" ? "Band Practice" : 
                                    "Unavailable")}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(event.date + 'T00:00:00'), "EEEE, MMMM do")}
                                  {event.endDate && event.endDate !== event.date && 
                                    ` - ${format(new Date(event.endDate + 'T00:00:00'), "MMMM do")}`}
                                </p>
                              </div>
                            </div>
                            
                            <div className="ml-11 space-y-1">
                              {(event.type === "practice" || event.type === "gig") && (
                                <>
                                  <div className="text-sm text-gray-600">
                                    <i className="fas fa-clock mr-2"></i>
                                    {formatEventTime(event)}
                                  </div>
                                  {event.location && (
                                    <div className="text-sm text-gray-600">
                                      <i className="fas fa-map-marker-alt mr-2"></i>
                                      {event.location}
                                    </div>
                                  )}
                                </>
                              )}
                              
                              {event.type === "unavailable" && eventMember && (
                                <div className="text-sm text-gray-600">
                                  <i className="fas fa-user mr-2"></i>
                                  {eventMember.name}
                                </div>
                              )}
                              
                              {event.notes && (
                                <div className="text-sm text-gray-600">
                                  <i className="fas fa-note-sticky mr-2"></i>
                                  {event.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => openEventModal(format(new Date(), "yyyy-MM-dd"), "unavailable")}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-torrist-unavailable rounded-full flex items-center justify-center">
                <i className="fas fa-ban text-gray-600 text-xl"></i>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-gray-800">Mark Unavailable</h3>
                <p className="text-sm text-gray-600">Set days you can't make it</p>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => openEventModal(format(new Date(), "yyyy-MM-dd"), "practice")}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-torrist-green rounded-full flex items-center justify-center">
                <i className="fas fa-music text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-gray-800">Add Practice</h3>
                <p className="text-sm text-gray-600">Schedule band rehearsal</p>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => openEventModal(format(new Date(), "yyyy-MM-dd"), "gig")}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-torrist-orange rounded-full flex items-center justify-center">
                <i className="fas fa-star text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-gray-800">Add Gig</h3>
                <p className="text-sm text-gray-600">Book a performance</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          selectedDate={selectedDate}
          selectedEvent={selectedEvent}
          eventType={eventType}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
