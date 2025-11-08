import type { Event } from '@/types/api';

export interface RecurringRule {
  type: 'day' | 'week' | 'month' | 'year';
  interval: number; // 1-99
  duration: 'forever' | 'count' | 'until';
  count?: number; // Required if duration='count'
  until?: string; // Required if duration='until' (YYYY-MM-DD)
}

export interface RecurringEvent extends Event {
  recurring: RecurringRule;
  parentEventId?: string;
  instanceDate?: string;
  isRecurringInstance?: boolean;
}

/**
 * Generates occurrences for a recurring event within a date range
 * This mirrors the backend generateOccurrences logic for client-side display
 */
export function generateOccurrences(
  event: RecurringEvent,
  rangeStart: string,
  rangeEnd: string
): Event[] {
  if (!event.recurring) {
    return [event];
  }

  const occurrences: Event[] = [];
  const start = new Date(event.date + 'T00:00:00');
  const end = new Date(rangeEnd + 'T00:00:00');
  let current = new Date(start);
  let count = 0;

  const { type, interval, duration, count: maxCount, until } = event.recurring;

  while (current <= end) {
    const currentDateStr = current.toISOString().split('T')[0];

    if (currentDateStr >= rangeStart) {
      occurrences.push({
        ...event,
        parentEventId: event.id,
        instanceDate: currentDateStr,
        isRecurringInstance: true,
        date: currentDateStr,
        // If the original event is multi-day, adjust endDate accordingly
        endDate: event.endDate
          ? addDaysToDate(currentDateStr, getEventDuration(event))
          : currentDateStr,
      } as Event);
    }

    // Advance by interval based on type
    if (type === 'day') {
      current.setDate(current.getDate() + interval);
    } else if (type === 'week') {
      current.setDate(current.getDate() + interval * 7);
    } else if (type === 'month') {
      current.setMonth(current.getMonth() + interval);
    } else if (type === 'year') {
      current.setFullYear(current.getFullYear() + interval);
    }

    count++;

    // Check duration conditions
    if (duration === 'count' && maxCount && count >= maxCount) break;
    if (duration === 'until' && until && current > new Date(until + 'T00:00:00')) break;
  }

  return occurrences;
}

/**
 * Gets the duration of an event in days
 */
function getEventDuration(event: Event): number {
  if (!event.endDate || event.endDate === event.date) return 0;

  const start = new Date(event.date + 'T00:00:00');
  const end = new Date(event.endDate + 'T00:00:00');

  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Adds a number of days to a date string
 */
function addDaysToDate(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Formats a recurring pattern into a human-readable string
 * Examples:
 * - "Daily"
 * - "Every 2 weeks"
 * - "Monthly"
 * - "Every 3 months until Jan 31, 2026"
 * - "Weekly for 10 occurrences"
 */
export function formatRecurringPattern(recurring: RecurringRule): string {
  const { type, interval, duration, count, until } = recurring;

  // Build frequency string
  let frequency = '';
  if (interval === 1) {
    if (type === 'day') frequency = 'Daily';
    else if (type === 'week') frequency = 'Weekly';
    else if (type === 'month') frequency = 'Monthly';
    else if (type === 'year') frequency = 'Yearly';
  } else {
    if (type === 'day') frequency = `Every ${interval} days`;
    else if (type === 'week') frequency = `Every ${interval} weeks`;
    else if (type === 'month') frequency = `Every ${interval} months`;
    else if (type === 'year') frequency = `Every ${interval} years`;
  }

  // Add duration info
  if (duration === 'forever') {
    return frequency;
  } else if (duration === 'count' && count) {
    return `${frequency} for ${count} occurrence${count > 1 ? 's' : ''}`;
  } else if (duration === 'until' && until) {
    const untilDate = new Date(until + 'T00:00:00');
    const formatted = untilDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${frequency} until ${formatted}`;
  }

  return frequency;
}

/**
 * Gets the next occurrence date for a recurring event after a given date
 */
export function getNextOccurrence(
  event: RecurringEvent,
  afterDate: string
): string | null {
  if (!event.recurring) return null;

  const { type, interval, duration, count: maxCount, until } = event.recurring;
  const start = new Date(event.date + 'T00:00:00');
  const after = new Date(afterDate + 'T00:00:00');
  let current = new Date(start);
  let count = 0;

  // If afterDate is before the event starts, return the start date
  if (after < start) {
    return event.date;
  }

  // Advance until we're past the afterDate
  while (current <= after) {
    // Advance by interval
    if (type === 'day') {
      current.setDate(current.getDate() + interval);
    } else if (type === 'week') {
      current.setDate(current.getDate() + interval * 7);
    } else if (type === 'month') {
      current.setMonth(current.getMonth() + interval);
    } else if (type === 'year') {
      current.setFullYear(current.getFullYear() + interval);
    }

    count++;

    // Check duration conditions
    if (duration === 'count' && maxCount && count >= maxCount) return null;
    if (duration === 'until' && until && current > new Date(until + 'T00:00:00')) return null;
  }

  return current.toISOString().split('T')[0];
}

/**
 * Checks if a specific date is an occurrence of a recurring event
 */
export function isOccurrenceDate(event: RecurringEvent, date: string): boolean {
  if (!event.recurring) {
    return event.date === date;
  }

  const occurrences = generateOccurrences(event, event.date, date);
  return occurrences.some(occ => occ.date === date);
}

/**
 * Gets the total number of occurrences for a recurring event (if countable)
 * Returns null if infinite (duration='forever')
 */
export function getTotalOccurrences(event: RecurringEvent): number | null {
  if (!event.recurring) return 1;

  const { duration, count, until } = event.recurring;

  if (duration === 'forever') {
    return null; // Infinite
  } else if (duration === 'count' && count) {
    return count;
  } else if (duration === 'until' && until) {
    // Generate occurrences up to the until date
    const occurrences = generateOccurrences(event, event.date, until);
    return occurrences.length;
  }

  return 1;
}
