import { format, startOfMonth, endOfMonth, addMonths, isSameMonth, startOfDay } from 'date-fns';
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
 * Displays events as a chronological list grouped by month
 * Shows next 3 months of events, excludes unavailability
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
  const todayStart = startOfDay(new Date());
  const threeMonthsFromNow = endOfMonth(addMonths(todayStart, 2));

  // Filter events for agenda view (next 3 months, no unavailability)
  const agendaEvents = events
    .filter((event) => {
      // Filter out unavailability events in agenda view
      if (event.type === 'unavailable') return false;

      const eventDate = new Date(event.date + 'T00:00:00');

      // Only show events from start of today onwards for the next 3 months
      return eventDate >= todayStart && eventDate <= threeMonthsFromNow;
    })
    .sort((a, b) => {
      // Sort chronologically
      const dateA = new Date(a.date + 'T00:00:00');
      const dateB = new Date(b.date + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });

  // Group events by month
  const eventsByMonth = agendaEvents.reduce((acc, event) => {
    const eventDate = new Date(event.date + 'T00:00:00');
    const monthKey = format(eventDate, 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const monthKeys = Object.keys(eventsByMonth).sort();

  if (agendaEvents.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-4">
            <i className="fas fa-calendar-times text-4xl"></i>
          </div>
          <h3 className="text-lg font-sans font-semibold text-muted-foreground mb-2">
            No upcoming events
          </h3>
          <p className="text-muted-foreground">Add some practices or gigs to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {monthKeys.map((monthKey) => {
        const monthEvents = eventsByMonth[monthKey];
        const monthDate = new Date(monthKey + '-01');

        return (
          <div key={monthKey} className="space-y-3">
            {/* Month Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-sans font-bold text-foreground">
                {format(monthDate, 'MMMM yyyy')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {monthEvents.length} {monthEvents.length === 1 ? 'event' : 'events'}
              </p>
            </div>

            {/* Events for this month */}
            {monthEvents.map((event) => {
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

              const eventDate = format(new Date(event.date + 'T00:00:00'), 'EEE d');
              const eventTime = event.startTime ? ` • ${formatEventTime(event)}` : '';

              return (
                <div
                  key={event.id}
                  className="bg-card rounded-lg p-3 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow"
                  style={{ borderLeftColor: eventColor }}
                  onClick={() => onEventClick(event)}
                  data-testid={`agenda-event-${event.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground flex-shrink-0"
                      style={{ backgroundColor: eventColor }}
                    >
                      <span className="text-lg">{getEventIcon(event.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans font-semibold text-base text-card-foreground truncate">
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
                      <p className="text-muted-foreground text-sm font-medium">
                        {eventDate}
                        {eventTime}
                      </p>
                      {(event.venue || event.location) && (
                        <p className="text-muted-foreground text-sm truncate">
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
      })}
    </div>
  );
}
