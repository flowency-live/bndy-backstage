import { useState } from 'react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useToast } from '@/hooks/use-toast';
import { eventsService } from '@/lib/services/events-service';

interface UseCalendarExportOptions {
  artistId?: string | null;
}

interface ExportOptions {
  includePrivate?: boolean;
  memberOnly?: boolean;
}

/**
 * Hook for exporting calendar data to iCal format
 * Supports filtering by privacy and member-only events
 * Backend generates iCal with RRULE support for recurring events
 */
export function useCalendarExport(options: UseCalendarExportOptions = {}) {
  const { artistId } = options;
  const { session } = useServerAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Export calendar as iCal file
   * Backend endpoint generates proper RRULE entries for recurring events
   */
  const exportCalendar = async (exportOptions: ExportOptions = {}) => {
    const { includePrivate = false, memberOnly = false } = exportOptions;

    if (!artistId) {
      toast({
        title: 'No artist context',
        description: 'Calendar export requires an artist context',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to export calendar',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const { blob, filename } = await eventsService.exportCalendar(artistId, {
        includePrivate,
        memberOnly,
        accessToken: session.access_token,
      });

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Calendar exported',
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export calendar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export all public events
   */
  const exportAllPublic = () => {
    return exportCalendar({ includePrivate: false, memberOnly: false });
  };

  /**
   * Export all personal events (including private)
   */
  const exportPersonalAll = () => {
    return exportCalendar({ includePrivate: true, memberOnly: true });
  };

  /**
   * Export personal public events only
   */
  const exportPersonalPublic = () => {
    return exportCalendar({ includePrivate: false, memberOnly: true });
  };

  /**
   * Get subscription URL for calendar apps
   * Note: This would require backend support for calendar subscription endpoints
   */
  const getSubscriptionUrl = (exportOptions: ExportOptions = {}): string | null => {
    if (!artistId || !session?.access_token) {
      return null;
    }

    const { includePrivate = false, memberOnly = false } = exportOptions;
    const params = new URLSearchParams();
    if (includePrivate) params.append('includePrivate', 'true');
    if (memberOnly) params.append('memberOnly', 'true');

    // This would need backend support for webcal:// subscription URLs
    return `https://api.bndy.co.uk/api/artists/${artistId}/calendar/subscribe?${params.toString()}`;
  };

  return {
    exportCalendar,
    exportAllPublic,
    exportPersonalAll,
    exportPersonalPublic,
    getSubscriptionUrl,
    isExporting,
  };
}
