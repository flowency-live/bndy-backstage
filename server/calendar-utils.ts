import { createEvents, EventAttributes } from 'ics';
import ICAL from 'ical.js';
import { Event, Band, User } from '@shared/schema';

// Types for calendar export options
export interface CalendarExportOptions {
  bandName: string;
  bandDescription?: string;
  includePrimaryEvents?: boolean;
  includeMemberEvents?: boolean;
  includePrivateEvents?: boolean;
  membershipId?: string;
}

// iCal export using the 'ics' library for generating
export async function exportEventsToIcal(
  events: Event[], 
  options: CalendarExportOptions
): Promise<string> {
  const icsEvents: EventAttributes[] = events.map(event => {
    // Generate title
    const title = event.title || getEventTypeLabel(event.type);
    
    // Generate description
    const description = buildEventDescription(event, options);

    // Determine location
    const location = event.venue || event.location || undefined;

    let icsEvent: EventAttributes;

    if (event.isAllDay) {
      // Handle all-day events with date-only calculations
      const startDateObj = new Date(`${event.date}T00:00:00`);
      const endDateObj = event.endDate 
        ? new Date(`${event.endDate}T00:00:00`)
        : new Date(startDateObj.getTime() + (24 * 60 * 60 * 1000)); // Next day for single-day events
      
      // Calculate days correctly for all-day events
      const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      icsEvent = {
        uid: `bndy-${event.id}@bndy.app`,
        title,
        description,
        start: [startDateObj.getFullYear(), startDateObj.getMonth() + 1, startDateObj.getDate()],
        duration: { days: Math.max(1, daysDiff) },
        location,
        categories: [getEventCategory(event.type)],
        organizer: { 
          name: options.bandName,
          email: `noreply@bndy.app`
        },
      };
    } else {
      // Handle timed events
      const startDate = new Date(`${event.date}T${event.startTime || '00:00'}:00`);
      const endDate = event.endTime 
        ? new Date(`${event.endDate || event.date}T${event.endTime}:00`) 
        : new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours

      icsEvent = {
        uid: `bndy-${event.id}@bndy.app`,
        title,
        description,
        start: [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes()
        ],
        duration: { minutes: Math.max(60, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60))) },
        location,
        categories: [getEventCategory(event.type)],
        organizer: { 
          name: options.bandName,
          email: `noreply@bndy.app`
        },
      };
    }

    return icsEvent;
  });

  return new Promise((resolve, reject) => {
    createEvents(icsEvents, (error, value) => {
      if (error) {
        reject(new Error(`Failed to create iCal: ${error.message}`));
        return;
      }
      resolve(value || '');
    });
  });
}

// Parse iCal file and extract events (for import)
export function parseIcalEvents(icalString: string): any[] {
  try {
    const parsed = ICAL.parse(icalString);
    const comp = new ICAL.Component(parsed);
    const vevents = comp.getAllSubcomponents('vevent');
    
    return vevents.map(vevent => {
      const event = new ICAL.Event(vevent);
      return {
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        location: event.location,
        startDate: event.startDate.toJSDate(),
        endDate: event.endDate.toJSDate(),
        isAllDay: event.startDate.isDate,
        rrule: (event as any).recurrenceRule?.toString(),
        created: (event as any).created?.toJSDate(),
        lastModified: (event as any).lastModified?.toJSDate(),
      };
    });
  } catch (error) {
    throw new Error(`Failed to parse iCal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions
function getEventTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    practice: 'Band Practice',
    meeting: 'Band Meeting',
    recording: 'Recording Session',
    private_booking: 'Private Booking',
    public_gig: 'Public Gig',
    festival: 'Festival',
    unavailable: 'Unavailable',
  };
  return typeLabels[type] || type;
}

function getEventCategory(type: string): string {
  const categories: Record<string, string> = {
    practice: 'MUSIC',
    meeting: 'BUSINESS',
    recording: 'MUSIC',
    private_booking: 'PERFORMANCE',
    public_gig: 'PERFORMANCE',
    festival: 'PERFORMANCE',
    unavailable: 'PERSONAL',
  };
  return categories[type] || 'OTHER';
}

function buildEventDescription(event: Event, options: CalendarExportOptions): string {
  const parts: string[] = [];
  
  // Add event type
  parts.push(`Event Type: ${getEventTypeLabel(event.type)}`);
  
  // Add notes if available
  if (event.notes) {
    parts.push(`Notes: ${event.notes}`);
  }
  
  // Add band name
  parts.push(`Band: ${options.bandName}`);
  
  // Add privacy indicator
  if (event.isPublic) {
    parts.push('Public Event');
  } else {
    parts.push('Private Event');
  }
  
  // Add bndy branding
  parts.push('');
  parts.push('Powered by bndy - Band Calendar Management');
  parts.push('https://bndy.app');
  
  return parts.join('\n');
}

// Export events for a specific band to iCal format
export async function exportBandEventsToIcal(
  events: Event[],
  band: Band,
  options: Partial<CalendarExportOptions> = {}
): Promise<string> {
  const exportOptions: CalendarExportOptions = {
    bandName: band.name,
    bandDescription: band.description || undefined,
    includePrimaryEvents: true,
    includeMemberEvents: true,
    includePrivateEvents: false, // Default to excluding private events
    ...options,
  };

  // Filter events based on export options
  let filteredEvents = events;
  
  if (!exportOptions.includePrivateEvents) {
    filteredEvents = filteredEvents.filter(event => event.isPublic === true);
  }
  
  if (exportOptions.membershipId) {
    // Filter to specific member's events only (exclude band-wide events)
    filteredEvents = filteredEvents.filter(event => 
      event.membershipId === exportOptions.membershipId
    );
  }

  return exportEventsToIcal(filteredEvents, exportOptions);
}

// Generate calendar file name
export function generateCalendarFileName(bandName: string, suffix?: string): string {
  const sanitized = bandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const dateSuffix = new Date().toISOString().split('T')[0];
  const parts = [sanitized, 'calendar', dateSuffix];
  if (suffix) parts.push(suffix);
  return `${parts.join('-')}.ics`;
}