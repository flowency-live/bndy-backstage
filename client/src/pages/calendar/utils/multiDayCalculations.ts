import type { Event } from '@/types/api';

/**
 * Checks if an event is a multi-day event
 */
export function isMultiDayEvent(event: Event): boolean {
  return !!event.endDate && event.endDate !== event.date;
}

/**
 * Gets the number of days an event spans
 */
export function getEventSpanDays(event: Event): number {
  if (!isMultiDayEvent(event)) return 1;

  const startDate = new Date(event.date + 'T00:00:00');
  const endDate = new Date(event.endDate! + 'T00:00:00');

  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Gets the remaining days in the current week from a specific day index
 * @param dayIndex - The day index in the calendar grid (0-41 typically)
 * @returns Number of days remaining in the week
 */
export function getRemainingDaysInWeek(dayIndex: number): number {
  return 7 - (dayIndex % 7);
}

/**
 * Calculates how many days to display for a multi-day event starting on a specific day
 * This handles week boundaries to prevent events from wrapping incorrectly
 */
export function getDisplayDaysForEvent(
  event: Event,
  dayIndex: number,
  isStartDay: boolean
): number {
  if (!isMultiDayEvent(event)) return 1;

  const totalSpan = getEventSpanDays(event);
  const remainingInWeek = getRemainingDaysInWeek(dayIndex);

  if (isStartDay) {
    // For the start day, show up to the end of the week
    return Math.min(totalSpan, remainingInWeek);
  }

  // For continuation days (when event wraps to next week)
  // This would be calculated based on which continuation segment we're on
  return Math.min(totalSpan, remainingInWeek);
}

/**
 * Checks if a date is within the range of a multi-day event
 */
export function isDateInEventRange(date: string, event: Event): boolean {
  if (!isMultiDayEvent(event)) {
    return date === event.date;
  }

  return date >= event.date && date <= (event.endDate || event.date);
}

/**
 * Gets the day offset for a date within a multi-day event
 * Returns 0 for the start day, 1 for the second day, etc.
 */
export function getDayOffsetInEvent(date: string, event: Event): number {
  if (!isMultiDayEvent(event)) return 0;

  const startDate = new Date(event.date + 'T00:00:00');
  const currentDate = new Date(date + 'T00:00:00');

  const diffTime = currentDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Calculates the width percentage for a multi-day event bar
 * Used for CSS width calculation
 */
export function getEventBarWidth(displayDays: number): string {
  // Each day is ~14.28% of the week (100% / 7 days)
  // Add slight adjustment to prevent gaps
  const widthPercent = (displayDays / 7) * 100;
  return `${Math.min(widthPercent, 100)}%`;
}

/**
 * Checks if an event should show as a continuation bar (not the start)
 */
export function isEventContinuation(date: string, event: Event): boolean {
  if (!isMultiDayEvent(event)) return false;
  return date > event.date && isDateInEventRange(date, event);
}
