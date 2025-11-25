import type { Event } from '@/types/api';
import { getEventDisplayName, getEventColor } from '../utils/eventDisplay';
import { RecurringIndicator } from './RecurringIndicator';
import type { RecurringEvent } from '../utils/recurringCalculations';

interface EventBadgeProps {
  event: Event;
  artistDisplayColour?: string;
  artistColorMap?: Record<string, string>;
  artistMembers?: any[];
  currentUserDisplayName?: string;
  effectiveArtistId?: string | null;
  onClick?: (e: React.MouseEvent) => void;
  isMultiDay?: boolean;
  spanDays?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Event badge component for displaying events in the calendar
 * Handles color coding, privacy protection, and recurring indicators
 */
export function EventBadge({
  event,
  artistDisplayColour,
  artistColorMap,
  artistMembers = [],
  currentUserDisplayName,
  effectiveArtistId,
  onClick,
  isMultiDay = false,
  spanDays = 1,
  className = '',
  style = {},
}: EventBadgeProps) {
  const isGig = event.type === 'gig' || event.type === 'public_gig';
  const isRecurring = !!(event as RecurringEvent).recurring;

  // Get display name
  const displayName = getEventDisplayName(event as any, {
    effectiveArtistId,
    artistMembers,
    currentUserDisplayName,
  });

  // Get event color - check artistColorMap first for cross-artist events
  const getEventColorForBadge = () => {
    // For gigs: use the event's own artist color if available in the map
    if (isGig && event.artistId && artistColorMap?.[event.artistId]) {
      return artistColorMap[event.artistId];
    }
    // For gigs without artistId (personal events): use current artist color
    if (isGig) {
      return artistDisplayColour || '#f97316';
    }
    // For other event types: use standard event type colors
    return getEventColor(event, artistDisplayColour || '#f97316', effectiveArtistId);
  };

  const baseColor = getEventColorForBadge();

  // Get color classes based on event type
  const getColorClasses = () => {
    if (isGig) {
      return 'text-white dark:text-white';
    }

    switch (event.type) {
      case 'unavailable':
        return 'border-red-500 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-500/20 dark:text-red-200';
      case 'practice':
        return 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-200';
      case 'rehearsal':
        return 'border-orange-500 bg-orange-50 text-orange-800 dark:border-orange-400 dark:bg-orange-500/20 dark:text-orange-200';
      case 'festival':
        return 'border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-500/20 dark:text-green-200';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-800 dark:border-gray-400 dark:bg-gray-500/20 dark:text-gray-200';
    }
  };

  const colorClasses = getColorClasses();

  // Calculate width for multi-day events - COPIED from calendar.tsx.old line 920
  const widthStyle = isMultiDay ? `calc(${spanDays * 100}% - 8px)` : '100%';

  return (
    <div
      className={`mt-0.5 rounded-sm px-1 py-0.5 text-[10px] leading-tight border-l-2 cursor-pointer ${colorClasses} ${className}`}
      style={{
        position: isMultiDay ? 'absolute' : 'relative',
        left: isMultiDay ? '4px' : 'auto',
        width: widthStyle,
        // Gig events: allow wrapping with artist color. Other events: single line with type-based color
        // COPIED from calendar.tsx.old lines 922-932
        whiteSpace: isGig ? 'normal' : 'nowrap',
        wordWrap: isGig ? 'break-word' : 'normal',
        overflow: 'hidden',
        textOverflow: isGig ? 'clip' : 'ellipsis',
        ...(isGig && {
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as any,
          background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}dd 100%)`,
          borderColor: baseColor,
        }),
        ...style,
      }}
      onClick={onClick}
      data-testid={`event-${event.id}`}
    >
      {displayName}
      {isRecurring && (
        <RecurringIndicator
          recurring={(event as RecurringEvent).recurring}
          size="sm"
          showTooltip={false}
        />
      )}
    </div>
  );
}
