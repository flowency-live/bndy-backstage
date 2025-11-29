import { format } from 'date-fns';
import { Star, Music, X } from 'lucide-react';
import { useSwipe } from '@/hooks/use-swipe';
import type { Event } from '@/types/api';

interface UpcomingEventBannerProps {
  event: Event;
  artistName?: string;
  onDismiss: () => void;
  onClick?: () => void;
}

/**
 * Upcoming event highlight banner
 * Shows next event with dismissible action and swipe-to-dismiss support
 */
export function UpcomingEventBanner({
  event,
  artistName,
  onDismiss,
  onClick,
}: UpcomingEventBannerProps) {
  // Swipe to dismiss banner
  const bannerSwipeRef = useSwipe(
    {
      onSwipeLeft: onDismiss,
      onSwipeRight: onDismiss,
    },
    {
      threshold: 50,
      trackMouse: false,
    }
  );

  const isGig = event.type === 'gig' || event.type === 'public_gig';
  // Prioritize event's artistName (for cross-artist events) over context artist name
  const displayName = event.artistName || artistName || 'Event';
  const location = event.venue || event.location || 'TBC';
  const eventDate = format(new Date(event.date + 'T00:00:00'), 'EEE MMM do');
  const eventTime = event.startTime ? ` ${event.startTime}` : '';

  return (
    <div
      ref={bannerSwipeRef}
      className="max-w-7xl mx-auto px-4 py-4 animate-fade-in-up touch-pan-y"
    >
      <div
        className="bg-card rounded-2xl p-6 shadow-lg border-l-4 border-brand-accent animate-pulse-soft hover-lift-subtle cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center">
              {isGig ? (
                <Star className="w-6 h-6 text-primary-foreground" />
              ) : (
                <Music className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-sans font-semibold text-card-foreground">
                Next - {displayName} - {location}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {eventDate}
                {eventTime}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-dismiss-highlight"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
