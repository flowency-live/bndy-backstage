import { format, isSameMonth, isToday } from 'date-fns';
import type { Event } from '@/types/api';
import { EventBadge } from './EventBadge';
import {
  getEventsForDate,
  getEventsStartingOnDate,
  getEventsExtendingToDate,
} from '../utils/eventFilters';
import {
  isMultiDayEvent,
  getEventSpanDays,
  getRemainingDaysInWeek,
} from '../utils/multiDayCalculations';

interface CalendarDayProps {
  date: Date;
  dayIndex: number;
  events: Event[];
  currentDate: Date;
  artistDisplayColour?: string;
  artistMembers?: any[];
  currentUserDisplayName?: string;
  effectiveArtistId?: string | null;
  onEventClick: (event: Event) => void;
  onDayClick?: (date: string) => void;
  onAddEvent?: (date: string) => void;
  totalDays: number;
}

/**
 * Calendar day cell component
 * Displays date number, starting events, and extending multi-day events
 * Handles overflow and multi-day event bars
 */
export function CalendarDay({
  date,
  dayIndex,
  events,
  currentDate,
  artistDisplayColour,
  artistMembers = [],
  currentUserDisplayName,
  effectiveArtistId,
  onEventClick,
  onDayClick,
  onAddEvent,
  totalDays,
}: CalendarDayProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = getEventsForDate(events, dateStr);
  const startingEvents = getEventsStartingOnDate(events, dateStr);
  const extendingEvents = getEventsExtendingToDate(events, dateStr);

  const isCurrentMonth = isSameMonth(date, currentDate);
  const isToday_ = isToday(date);

  const MAX_VISIBLE_EVENTS = 3;
  const overflowCount = startingEvents.length + extendingEvents.length - MAX_VISIBLE_EVENTS;
  const hasOverflow = overflowCount > 0;

  return (
    <div
      className={`min-h-24 relative ${
        isCurrentMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'
      } ${isToday_ ? 'ring-2 ring-brand-accent ring-inset' : ''} ${
        dayIndex < totalDays - 7 ? 'border-b border-slate-300 dark:border-slate-700' : ''
      }`}
      data-testid={`calendar-day-${dateStr}`}
      onClick={() => onDayClick?.(dateStr)}
    >
      {/* Date number - centered at top */}
      <div className="flex justify-center pt-1">
        <div
          className={`text-xs font-semibold ${
            isCurrentMonth
              ? isToday_
                ? 'bg-brand-accent text-white rounded-full w-6 h-6 flex items-center justify-center'
                : 'text-slate-800 dark:text-slate-200'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {format(date, 'd')}
        </div>
      </div>

      {/* Events */}
      <div className="space-y-1 px-1">
        {/* Starting events */}
        {startingEvents.slice(0, MAX_VISIBLE_EVENTS).map((event, eventIndex) => {
          const spanDays = Math.min(
            getEventSpanDays(event),
            getRemainingDaysInWeek(dayIndex)
          );
          const isMultiDay = isMultiDayEvent(event);

          return (
            <EventBadge
              key={`start-${event.id}-${eventIndex}`}
              event={event}
              artistDisplayColour={artistDisplayColour}
              artistMembers={artistMembers}
              currentUserDisplayName={currentUserDisplayName}
              effectiveArtistId={effectiveArtistId}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
              }}
              isMultiDay={isMultiDay}
              spanDays={spanDays}
              className={isMultiDay ? '' : ''}
              style={{
                zIndex: 10 + eventIndex,
                top: isMultiDay ? `${36 + eventIndex * 26}px` : 'auto',
                width: isMultiDay
                  ? spanDays < getRemainingDaysInWeek(dayIndex)
                    ? `calc(${(spanDays / 7) * 100}% - 8px)`
                    : 'calc(100% - 8px)'
                  : '100%',
              }}
            />
          );
        })}

        {/* Extending events (multi-day continuations) */}
        {extendingEvents
          .slice(0, Math.max(0, MAX_VISIBLE_EVENTS - startingEvents.length))
          .map((event, eventIndex) => {
            const remainingDays = getRemainingDaysInWeek(dayIndex);
            const eventEndDate = new Date(event.endDate! + 'T00:00:00');
            const currentWeekEnd = new Date(
              date.getTime() + (remainingDays - 1) * 24 * 60 * 60 * 1000
            );
            const spanDays =
              eventEndDate <= currentWeekEnd
                ? Math.ceil((eventEndDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)) + 1
                : remainingDays;

            return (
              <EventBadge
                key={`extend-${event.id}-${eventIndex}`}
                event={event}
                artistDisplayColour={artistDisplayColour}
                artistMembers={artistMembers}
                currentUserDisplayName={currentUserDisplayName}
                effectiveArtistId={effectiveArtistId}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                isMultiDay={true}
                spanDays={spanDays}
                style={{
                  zIndex: 10 + startingEvents.length + eventIndex,
                  top: `${36 + (startingEvents.length + eventIndex) * 26}px`,
                  width: spanDays < remainingDays ? 'auto' : 'calc(100% - 8px)',
                }}
              />
            );
          })}

        {/* Overflow indicator */}
        {hasOverflow && (
          <div
            className="mt-1 text-[10px] text-muted-foreground text-center cursor-pointer hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick?.(dateStr);
            }}
          >
            +{overflowCount} more
          </div>
        )}
      </div>

      {/* Add event button (only for current month) - COPIED from calendar.tsx.old lines 1005-1017 */}
      {isCurrentMonth && onAddEvent && (
        <div className="absolute inset-0 bg-transparent hover:bg-brand-primary/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddEvent(dateStr);
            }}
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
}
