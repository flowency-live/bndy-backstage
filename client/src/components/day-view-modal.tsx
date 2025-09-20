import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_CONFIG } from "@shared/schema";
import type { Event, UserBand } from "@shared/schema";

interface DayViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  events: Event[];
  members: UserBand[];
  currentUser: UserBand;
  onCreateEvent: (eventType: string) => void;
  onEditEvent: (event: Event) => void;
}

export default function DayViewModal({
  isOpen,
  onClose,
  selectedDate,
  events,
  members,
  currentUser,
  onCreateEvent,
  onEditEvent,
}: DayViewModalProps) {
  if (!isOpen) return null;

  // Filter events for this specific date
  const dayEvents = events.filter(event => 
    event.date === selectedDate || 
    (event.endDate && event.date <= selectedDate && event.endDate >= selectedDate)
  );

  // Find unavailable members for this date
  const unavailableMembers = members.filter(member => {
    return dayEvents.some(event => 
      event.type === "unavailable" && 
      event.membershipId === member.id
    );
  });

  const formatEventTime = (event: Event) => {
    if (event.startTime && event.endTime) {
      return `${event.startTime} - ${event.endTime}`;
    } else if (event.startTime) {
      return `From ${event.startTime}`;
    }
    return null;
  };

  const dateDisplay = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="bg-primary text-primary-foreground p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-serif">{dateDisplay}</h3>
            <button 
              onClick={onClose} 
              className="text-primary-foreground hover:text-primary-foreground/80"
              data-testid="button-close-day-view"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Existing Events */}
          {dayEvents.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-sans font-semibold text-card-foreground mb-3">
                Events for this day
              </h4>
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG];
                  const member = members.find(m => m.id === event.membershipId);
                  
                  return (
                    <div
                      key={event.id}
                      className="bg-muted rounded-lg p-3 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => onEditEvent(event)}
                      data-testid={`day-event-${event.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: config?.color || '#666' }}
                        >
                          {config?.icon || '📅'}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-card-foreground">
                            {event.type === 'unavailable' 
                              ? `${member?.displayName} unavailable`
                              : (event.title || config?.label || 'Event')
                            }
                          </div>
                          {formatEventTime(event) && (
                            <div className="text-sm text-muted-foreground">
                              {formatEventTime(event)}
                            </div>
                          )}
                          {(event.venue || event.location) && (
                            <div className="text-sm text-muted-foreground">
                              📍 {event.venue || event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unavailable Members */}
          {unavailableMembers.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-sans font-semibold text-card-foreground mb-3">
                Who's unavailable
              </h4>
              <div className="flex flex-wrap gap-2">
                {unavailableMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2 bg-muted rounded-full px-3 py-1"
                    data-testid={`unavailable-member-${member.id}`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: member.color }}
                    >
                      <i className={`fas ${member.icon} text-white text-xs`}></i>
                    </div>
                    <span className="text-sm text-card-foreground">{member.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Event */}
          <div className="mb-6">
            <h4 className="text-lg font-sans font-semibold text-card-foreground mb-3">
              Add new event
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onCreateEvent("practice")}
                className="p-3 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 text-center transition-all duration-200"
                data-testid="button-create-practice"
              >
                <div className="text-xl mb-1">🎵</div>
                <div className="text-xs font-sans font-semibold text-muted-foreground">Practice</div>
              </button>
              
              <button
                onClick={() => onCreateEvent("public_gig")}
                className="p-3 rounded-lg border-2 border-border hover:border-brand-accent/50 hover:bg-brand-accent/5 text-center transition-all duration-200"
                data-testid="button-create-gig"
              >
                <div className="text-xl mb-1">⭐</div>
                <div className="text-xs font-sans font-semibold text-muted-foreground">Gig</div>
              </button>
              
              <button
                onClick={() => onCreateEvent("unavailable")}
                className="p-3 rounded-lg border-2 border-border hover:border-destructive/50 hover:bg-destructive/5 text-center transition-all duration-200"
                data-testid="button-create-unavailable"
              >
                <div className="text-xl mb-1">❌</div>
                <div className="text-xs font-sans font-semibold text-muted-foreground">Unavailable</div>
              </button>
            </div>
          </div>

          {/* Close Button */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-close-day-view-bottom"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}