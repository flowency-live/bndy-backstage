/**
 * AddToCalendarButton Component
 *
 * Dropdown button for adding events to personal calendars:
 * - Google Calendar: Opens URL with pre-filled event details
 * - Apple Calendar: Downloads .ics file
 * - Outlook: Downloads .ics file
 * - Download .ics: Direct iCal file download
 */

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { eventsService, type Event } from '@/lib/services/events-service';
import { useToast } from '@/hooks/use-toast';

interface AddToCalendarButtonProps {
  event: Event | null;
  artistId: string | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  gig: 'Gig',
  practice: 'Practice',
  recording: 'Recording',
  other: 'Event',
};

export function AddToCalendarButton({
  event,
  artistId,
  variant = 'outline',
  size = 'sm',
}: AddToCalendarButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const isDisabled = !event || !artistId;

  const getEventTitle = (): string => {
    if (!event) return 'Event';
    return event.title || EVENT_TYPE_LABELS[event.type] || 'Event';
  };

  const getEventLocation = (): string => {
    if (!event) return '';
    return event.venue || event.location || '';
  };

  const formatDateForGoogle = (date: string, time?: string): string => {
    // Remove dashes from date: 2025-07-15 -> 20250715
    const dateOnly = date.replace(/-/g, '');

    if (!time) {
      return dateOnly;
    }

    // Convert time (HH:MM) to HHMMSS format
    const timeParts = time.replace(':', '');
    return `${dateOnly}T${timeParts}00`;
  };

  const buildGoogleCalendarUrl = (): string => {
    if (!event) return '';

    const title = encodeURIComponent(getEventTitle());
    const location = encodeURIComponent(getEventLocation());

    let dates: string;
    if (event.startTime) {
      const startDateTime = formatDateForGoogle(event.date, event.startTime);
      if (event.endTime) {
        const endDateTime = formatDateForGoogle(event.date, event.endTime);
        dates = `${startDateTime}/${endDateTime}`;
      } else {
        // Default to 2 hours duration if no end time
        const endDateTime = formatDateForGoogle(event.date, event.startTime);
        dates = `${startDateTime}/${endDateTime}`;
      }
    } else {
      // All-day event: use date-only format
      // End date is next day for all-day events
      const startDate = event.date.replace(/-/g, '');
      const endDate = getNextDay(event.date).replace(/-/g, '');
      dates = `${startDate}/${endDate}`;
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: getEventTitle(),
      dates,
    });

    if (getEventLocation()) {
      params.set('location', getEventLocation());
    }

    if (event.notes) {
      params.set('details', event.notes);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const getNextDay = (dateStr: string): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const handleGoogleCalendar = () => {
    const url = buildGoogleCalendarUrl();
    window.open(url, '_blank');
  };

  const handleDownloadIcal = async () => {
    if (!event || !artistId) return;

    setIsDownloading(true);

    try {
      const blob = await eventsService.downloadEventIcal(artistId, event.id);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getEventTitle()}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({
        title: 'Calendar file downloaded',
        description: 'Open the file to add the event to your calendar',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Could not download calendar file',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isDisabled || isDownloading}
          data-testid="add-to-calendar-button"
          className="gap-1"
        >
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Add to Calendar</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <i className="fab fa-google mr-2 w-4 h-4 text-center"></i>
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadIcal}>
          <i className="fab fa-apple mr-2 w-4 h-4 text-center"></i>
          Apple Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadIcal}>
          <i className="fab fa-microsoft mr-2 w-4 h-4 text-center"></i>
          Outlook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadIcal}>
          <i className="fas fa-download mr-2 w-4 h-4 text-center"></i>
          Download .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
