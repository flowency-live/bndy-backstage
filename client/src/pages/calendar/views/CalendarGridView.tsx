import { eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { Event } from '@/types/api';
import { CalendarDay } from '../components/CalendarDay';

interface CalendarGridViewProps {
  currentDate: Date;
  events: Event[];
  artistDisplayColour?: string;
  artistColorMap?: Record<string, string>;
  artistMembers?: any[];
  currentUserDisplayName?: string;
  currentUserId?: string;
  effectiveArtistId?: string | null;
  onEventClick: (event: Event) => void;
  onDayClick?: (date: string) => void;
  onAddEvent?: (date: string) => void;
  onDeleteAvailability?: (event: Event) => void;
}

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Calendar grid view component
 * Displays month grid with week headers and day cells
 * Handles multi-day event rendering across the grid
 */
export function CalendarGridView({
  currentDate,
  events,
  artistDisplayColour,
  artistColorMap,
  artistMembers = [],
  currentUserDisplayName,
  currentUserId,
  effectiveArtistId,
  onEventClick,
  onDayClick,
  onAddEvent,
  onDeleteAvailability,
}: CalendarGridViewProps) {
  // Calculate calendar grid dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div>
      {/* Week headers */}
      <div className="grid grid-cols-7 bg-brand-neutral dark:bg-gray-800">
        {WEEK_DAYS.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className={`p-2 sm:p-3 text-center text-sm sm:text-base font-sans text-brand-primary dark:text-gray-300 ${
              index === 4 || index === 5 || index === 6 ? 'font-bold' : 'font-semibold'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 bg-white dark:bg-slate-900">
        {calendarDays.map((day, index) => (
          <CalendarDay
            key={index}
            date={day}
            dayIndex={index}
            events={events}
            currentDate={currentDate}
            artistDisplayColour={artistDisplayColour}
            artistColorMap={artistColorMap}
            artistMembers={artistMembers}
            currentUserDisplayName={currentUserDisplayName}
            currentUserId={currentUserId}
            effectiveArtistId={effectiveArtistId}
            onEventClick={onEventClick}
            onDayClick={onDayClick}
            onAddEvent={onAddEvent}
            onDeleteAvailability={onDeleteAvailability}
            totalDays={calendarDays.length}
          />
        ))}
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-muted flex items-center justify-center">
            <i className="fas fa-calendar-times text-4xl"></i>
          </div>
          <h3 className="text-lg font-sans font-semibold text-muted-foreground mb-2">
            No events this month
          </h3>
          <p className="text-muted-foreground">Add some practices or gigs to get started</p>
        </div>
      )}
    </div>
  );
}
