import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import type { Event, BandMember } from "@shared/schema";
import EventModal from "@/components/event-modal";

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { currentUser } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [eventType, setEventType] = useState<"practice" | "gig" | "unavailable">("practice");
  const [dismissedHighlight, setDismissedHighlight] = useState(false);

  // Redirect if no user selected
  if (!currentUser) {
    setLocation("/personas");
    return null;
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  // Get next upcoming event
  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextEvent = upcomingEvents[0];

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(event => {
      const eventDate = event.date;
      const eventEndDate = event.endDate || event.date;
      return dateStr >= eventDate && dateStr <= eventEndDate;
    });
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
    setEventType(type);
    setShowEventModal(true);
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
              <button 
                onClick={() => setLocation("/personas")}
                className="text-torrist-green hover:text-torrist-green-dark"
              >
                <i className="fas fa-user-switch text-lg"></i>
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
          <div className="bg-gradient-to-r from-torrist-green to-torrist-green-light rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <i className={`fas ${nextEvent.type === "gig" ? "fa-star" : "fa-music"} text-white text-xl`}></i>
                </div>
                <div>
                  <h3 className="text-xl font-sans font-semibold">
                    Next Up: {nextEvent.title || (nextEvent.type === "gig" ? "Gig" : "Band Practice")}
                  </h3>
                  <p className="opacity-90">
                    {format(new Date(nextEvent.date), "EEEE, MMMM do")}
                    {nextEvent.startTime && ` at ${nextEvent.startTime}`}
                  </p>
                  {nextEvent.location && (
                    <p className="opacity-75 text-sm">{nextEvent.location}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setDismissedHighlight(true)}
                className="text-white hover:text-gray-200"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-torrist-green-light px-6 py-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="text-white hover:text-gray-200 p-2"
              >
                <i className="fas fa-chevron-left text-xl"></i>
              </button>
              <h2 className="text-2xl font-serif text-white">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <button 
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="text-white hover:text-gray-200 p-2"
              >
                <i className="fas fa-chevron-right text-xl"></i>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center font-sans font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for month start */}
              {Array.from({ length: monthStart.getDay() }, (_, i) => (
                <div key={`empty-${i}`} className="h-24 md:h-32"></div>
              ))}
              
              {calendarDays.map(day => {
                const dayEvents = getEventsForDate(day);
                const unavailableMembers = getUnavailableMembers(dayEvents);
                const bandEvents = getBandEvents(dayEvents);
                const dateStr = format(day, "yyyy-MM-dd");
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);

                let cellClasses = "h-24 md:h-32 rounded-lg p-2 cursor-pointer transition-colors ";
                
                if (!isCurrentMonth) {
                  cellClasses += "bg-gray-100 text-gray-400 ";
                } else if (unavailableMembers.length > 0) {
                  cellClasses += "bg-torrist-unavailable hover:bg-pink-200 ";
                } else if (bandEvents.length > 0) {
                  const hasGig = bandEvents.some(e => e.type === "gig");
                  cellClasses += hasGig 
                    ? "bg-torrist-orange bg-opacity-20 hover:bg-torrist-orange hover:bg-opacity-30 border-2 border-torrist-orange border-opacity-50 "
                    : "bg-torrist-green bg-opacity-20 hover:bg-torrist-green hover:bg-opacity-30 border-2 border-torrist-green border-opacity-50 ";
                } else if (isTodayDate) {
                  cellClasses += "bg-blue-100 hover:bg-blue-200 border-2 border-blue-400 ";
                } else {
                  cellClasses += "bg-gray-50 hover:bg-gray-100 ";
                }

                return (
                  <div 
                    key={dateStr}
                    className={cellClasses}
                    onClick={() => openEventModal(dateStr, "practice")}
                  >
                    <div className={`text-sm font-sans font-semibold ${isTodayDate ? "text-blue-700" : "text-gray-700"}`}>
                      {format(day, "d")}
                    </div>
                    
                    {isTodayDate && (
                      <div className="bg-blue-600 text-white text-xs rounded px-2 py-1 mt-1">Today</div>
                    )}
                    
                    {bandEvents.map((event, idx) => (
                      <div key={idx} className="mt-1">
                        <div className={`text-white text-xs rounded px-2 py-1 ${
                          event.type === "gig" ? "bg-torrist-orange" : "bg-torrist-green"
                        }`}>
                          <i className={`fas ${event.type === "gig" ? "fa-star" : "fa-music"} mr-1`}></i>
                          {event.type === "gig" ? "Gig" : "Practice"}
                        </div>
                        {event.startTime && (
                          <div className="text-xs text-gray-600 mt-1">{event.startTime}</div>
                        )}
                        {event.location && (
                          <div className="text-xs text-gray-600">{event.location}</div>
                        )}
                      </div>
                    ))}
                    
                    {unavailableMembers.length > 0 && (
                      <div className="flex items-center mt-1">
                        <div className="flex items-center space-x-1">
                          {unavailableMembers.slice(0, 2).map((member, idx) => (
                            <div 
                              key={idx}
                              className="w-4 h-4 rounded-full border border-white"
                              style={{ backgroundColor: member.color }}
                            ></div>
                          ))}
                          {unavailableMembers.length > 2 && (
                            <span className="text-xs text-gray-600">+{unavailableMembers.length - 2}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 ml-2">
                          {unavailableMembers.length === 1 
                            ? unavailableMembers[0].name 
                            : `${unavailableMembers.length} unavailable`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
          onClose={() => setShowEventModal(false)}
          selectedDate={selectedDate}
          eventType={eventType}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
