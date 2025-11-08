import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { Event } from '@/types/api';
import { EVENT_TYPE_CONFIG } from '@/types/api';
import { getEventDisplayName, formatEventTime, getEventColor, getEventIcon } from '../utils/eventDisplay';
import { RecurringIndicator } from '../components/RecurringIndicator';
import type { RecurringEvent } from '../utils/recurringCalculations';

interface AgendaViewProps {
  currentDate: Date;
  events: Event[];
  artistDisplayColour?: string;
  artistMembers?: any[];
  currentUserDisplayName?: string;
  effectiveArtistId?: string | null;
  onEventClick: (event: Event) => void;
}

/**
 * Agenda (list) view component
 * Displays events as a chronological list grouped by date
 * Excludes unavailability events
 */
export function AgendaView({
  currentDate,
  events,
  artistDisplayColour,
  artistMembers = [],
  currentUserDisplayName,
  effectiveArtistId,
  onEventClick,
}: AgendaViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Filter events for agenda view
  const agendaEvents = events
    .filter((event) => {
      // Filter out unavailability events in agenda view
      if (event.type === 'unavailable') return false;

      const eventDate = new Date(event.date + 'T00:00:00');
      const eventEndDate = event.endDate ? new Date(event.endDate + 'T00:00:00') : eventDate;

      // Include events that start, end, or span within the current month
      return (
        (eventDate >= monthStart && eventDate <= monthEnd) ||
        (eventEndDate >= monthStart && eventEndDate <= monthEnd) ||
        (eventDate <= monthStart && eventEndDate >= monthEnd)
      );
    })
    .sort((a, b) => {
      // Sort chronologically
      const dateA = new Date(a.date + 'T00:00:00');
      const dateB = new Date(b.date + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });

  if (agendaEvents.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-4">
            <i className="fas fa-calendar-times text-4xl"></i>
          </div>
          <h3 className="text-lg font-sans font-semibold text-muted-foreground mb-2">
            No events this month
          </h3>
          <p className="text-muted-foreground">Add some practices or gigs to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {agendaEvents.map((event) => {
        const isGig = event.type === 'gig' || event.type === 'public_gig';
        const isRecurring = !!(event as RecurringEvent).recurring;
        const displayColour = artistDisplayColour || '#f97316';
        const eventColor = isGig
          ? (event as any).artistDisplayColour || displayColour
          : getEventColor(event, displayColour, effectiveArtistId);

        const displayName = getEventDisplayName(event as any, {
          effectiveArtistId,
          artistMembers,
          currentUserDisplayName,
        });

        const eventDate = format(new Date(event.date + 'T00:00:00'), 'EEE d MMM');
        const eventTime = event.startTime ? ` • ${formatEventTime(event)}` : '';

        return (
          <div
            key={event.id}
            className="bg-card rounded-lg p-3 shadow-sm border-l-4 border-brand-accent cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onEventClick(event)}
            data-testid={`agenda-event-${event.id}`}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground"
                style={{ backgroundColor: eventColor }}
              >
                <span className="text-lg">{getEventIcon(event.type)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-sans font-semibold text-sm text-card-foreground">
                    {displayName}
                  </h4>
                  {isRecurring && (
                    <RecurringIndicator
                      recurring={(event as RecurringEvent).recurring}
                      size="sm"
                      showTooltip={true}
                    />
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {eventDate}
                  {eventTime}
                </p>
                {(event.venue || event.location) && (
                  <p className="text-muted-foreground text-sm">
                    {event.isPublic ? `📍 ${event.venue}` : `🏠 ${event.location}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
