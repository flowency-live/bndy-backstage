import { format, isSameMonth, isToday } from 'date-fns';
import { useState } from 'react';
import type { Event } from '@/types/api';
import { EventBadge } from './EventBadge';
import { UnavailabilityPopup } from './UnavailabilityPopup';
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
  artistColorMap?: Record<string, string>;
  artistMembers?: any[];
  currentUserDisplayName?: string;
  currentUserId?: string;
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
  artistColorMap,
  artistMembers = [],
  currentUserDisplayName,
  currentUserId,
  effectiveArtistId,
  onEventClick,
  onDayClick,
  onAddEvent,
  totalDays,
}: CalendarDayProps) {
  const [showUnavailabilityPopup, setShowUnavailabilityPopup] = useState(false);
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = getEventsForDate(events, dateStr);

  // Separate unavailability events from other events
  // Unavailability events should be full-width per day, not multi-day bars
  const unavailabilityEvents = dayEvents.filter((e) => e.type === 'unavailable');
  const startingEvents = getEventsStartingOnDate(events, dateStr).filter((e) => e.type !== 'unavailable');
  const extendingEvents = getEventsExtendingToDate(events, dateStr).filter((e) => e.type !== 'unavailable');

  const isCurrentMonth = isSameMonth(date, currentDate);
  const isToday_ = isToday(date);
  const hasUnavailability = unavailabilityEvents.length > 0;

  const MAX_VISIBLE_EVENTS = 3;
  // When consolidating unavailability into one badge, adjust overflow calculation
  const unavailabilityBadgeCount = hasUnavailability ? 1 : 0;
  const overflowCount = unavailabilityBadgeCount + startingEvents.length + extendingEvents.length - MAX_VISIBLE_EVENTS;
  const hasOverflow = overflowCount > 0;

  // Determine background color based on unavailability
  const getBackgroundClass = () => {
    if (hasUnavailability) {
      return 'bg-red-100 dark:bg-red-900/40';
    }
    if (isCurrentMonth) {
      return 'bg-white dark:bg-slate-900';
    }
    return 'bg-slate-50 dark:bg-slate-800';
  };

  return (
    <div
      className={`min-h-24 relative ${getBackgroundClass()} ${
        isToday_ ? 'ring-2 ring-brand-accent ring-inset' : ''
      } ${dayIndex < totalDays - 7 ? 'border-b border-slate-300 dark:border-slate-700' : ''}`}
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

      {/* Unavailability Badge - Top Right */}
      {hasUnavailability && (
        <div className="absolute top-1 right-1 z-20">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowUnavailabilityPopup(true);
            }}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full font-bold text-xs shadow-md hover:shadow-lg">
              {unavailabilityEvents.length}
            </div>
          </div>
        </div>
      )}

      {/* Events */}
      <div className="space-y-1 px-1">

        {/* Starting events (gigs, rehearsals, other) */}
        {startingEvents.slice(0, Math.max(0, MAX_VISIBLE_EVENTS - unavailabilityBadgeCount)).map((event, eventIndex) => {
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
              artistColorMap={artistColorMap}
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
                zIndex: 10 + unavailabilityBadgeCount + eventIndex,
                top: isMultiDay ? `${36 + (unavailabilityBadgeCount + eventIndex) * 26}px` : 'auto',
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
          .slice(0, Math.max(0, MAX_VISIBLE_EVENTS - unavailabilityBadgeCount - startingEvents.length))
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
                artistColorMap={artistColorMap}
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
                  zIndex: 10 + unavailabilityBadgeCount + startingEvents.length + eventIndex,
                  top: `${36 + (unavailabilityBadgeCount + startingEvents.length + eventIndex) * 26}px`,
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
        <div className="absolute inset-0 bg-transparent hover:bg-brand-primary/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddEvent(dateStr);
            }}
            className="w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg pointer-events-auto"
            title="Add event"
            data-testid={`button-add-event-${dateStr}`}
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
      )}

      {/* Unavailability Popup */}
      <UnavailabilityPopup
        isOpen={showUnavailabilityPopup}
        onClose={() => setShowUnavailabilityPopup(false)}
        date={date}
        unavailabilityEvents={unavailabilityEvents}
        currentUserId={currentUserId}
        onEditUserUnavailability={(event) => {
          setShowUnavailabilityPopup(false);
          onEventClick(event);
        }}
      />
    </div>
  );
}
