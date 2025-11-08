import { useMemo } from 'react';
import {
  generateOccurrences,
  formatRecurringPattern,
  getNextOccurrence,
  isOccurrenceDate,
  getTotalOccurrences,
} from '../utils/recurringCalculations';
import type { RecurringEvent, RecurringRule } from '../utils/recurringCalculations';
import type { Event } from '@/types/api';

interface UseRecurringLogicOptions {
  events: Event[];
  startDate: string;
  endDate: string;
}

/**
 * Hook for handling recurring event logic
 * Generates occurrences from recurring events within a date range
 * Provides utilities for working with recurring patterns
 */
export function useRecurringLogic(options: UseRecurringLogicOptions) {
  const { events, startDate, endDate } = options;

  // Generate all occurrences for events within the date range
  const eventsWithOccurrences = useMemo(() => {
    return events.flatMap(event => {
      if ((event as RecurringEvent).recurring) {
        // This is a recurring event - generate occurrences
        return generateOccurrences(event as RecurringEvent, startDate, endDate);
      }
      // Not recurring - return as-is
      return [event];
    });
  }, [events, startDate, endDate]);

  // Helper to format a recurring pattern
  const formatPattern = (recurring: RecurringRule): string => {
    return formatRecurringPattern(recurring);
  };

  // Helper to get the next occurrence for a recurring event
  const getNext = (event: RecurringEvent, afterDate: string): string | null => {
    return getNextOccurrence(event, afterDate);
  };

  // Helper to check if a date is an occurrence
  const isOccurrence = (event: RecurringEvent, date: string): boolean => {
    return isOccurrenceDate(event, date);
  };

  // Helper to get total occurrences count
  const getTotalCount = (event: RecurringEvent): number | null => {
    return getTotalOccurrences(event);
  };

  // Check if an event is a recurring instance
  const isRecurringInstance = (event: Event): boolean => {
    return !!(event as any).isRecurringInstance;
  };

  // Get the parent event ID for a recurring instance
  const getParentEventId = (event: Event): string | null => {
    return (event as any).parentEventId || null;
  };

  // Get the instance date for a recurring instance
  const getInstanceDate = (event: Event): string | null => {
    return (event as any).instanceDate || null;
  };

  return {
    // Expanded events with all occurrences
    eventsWithOccurrences,

    // Utility functions
    formatPattern,
    getNext,
    isOccurrence,
    getTotalCount,
    isRecurringInstance,
    getParentEventId,
    getInstanceDate,
  };
}
