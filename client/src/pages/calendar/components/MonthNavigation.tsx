import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipe } from '@/hooks/use-swipe';

interface MonthNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  enableSwipe?: boolean;
  children?: React.ReactNode;
  // Filter toggle props (from OLD calendar)
  showArtistEvents?: boolean;
  onToggleArtistEvents?: () => void;
  showMyEvents?: boolean;
  onToggleMyEvents?: () => void;
  showAllArtists?: boolean;
  onToggleAllArtists?: () => void;
  hasArtistContext?: boolean;
  hasMultipleArtists?: boolean;
}

/**
 * Month navigation component with prev/next buttons and swipe gestures
 * Provides responsive mobile/desktop layouts
 */
export function MonthNavigation({
  currentDate,
  onDateChange,
  enableSwipe = true,
  children,
  showArtistEvents,
  onToggleArtistEvents,
  showMyEvents,
  onToggleMyEvents,
  showAllArtists,
  onToggleAllArtists,
  hasArtistContext,
  hasMultipleArtists,
}: MonthNavigationProps) {
  const navigateToPreviousMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const navigateToNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  // Setup swipe gestures for mobile navigation
  const swipeRef = useSwipe(
    {
      onSwipeLeft: navigateToNextMonth,
      onSwipeRight: navigateToPreviousMonth,
    },
    {
      threshold: 50,
      trackMouse: false,
    }
  );

  return (
    <div className="bg-brand-primary-light border-t">
      {/* Mobile: Single compact row - COPIED from calendar.tsx.old lines 659-733 */}
      <div className="flex md:hidden items-center justify-between px-2 py-1.5">
        <button
          onClick={navigateToPreviousMonth}
          className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-1"
          data-testid="button-previous-month"
        >
          <i className="fas fa-chevron-left text-base"></i>
        </button>

        <h1 className="text-slate-800 dark:text-white font-sans text-base font-semibold flex-shrink-0 mx-2">
          {format(currentDate, "MMM yyyy")}
        </h1>

        <button
          onClick={navigateToNextMonth}
          className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-1"
          data-testid="button-next-month"
        >
          <i className="fas fa-chevron-right text-base"></i>
        </button>

        <div className="flex items-center gap-1 ml-2">
          {/* Artist Events Toggle - Icon only on mobile */}
          {hasArtistContext && (
            <button
              onClick={onToggleArtistEvents}
              className={`
                w-7 h-7 rounded-full text-xs font-medium border transition-all duration-200 flex items-center justify-center
                ${showArtistEvents
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }
              `}
              data-testid="toggle-artist-events"
              title="Artist Events"
            >
              <i className="fas fa-users text-xs"></i>
            </button>
          )}

          {/* My Events Toggle - Icon only on mobile */}
          <button
            onClick={onToggleMyEvents}
            className={`
              w-7 h-7 rounded-full text-xs font-medium border transition-all duration-200 flex items-center justify-center
              ${showMyEvents
                ? 'bg-cyan-500 text-white border-cyan-500'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
              }
            `}
            data-testid="toggle-my-events"
            title="My Events"
          >
            <i className="fas fa-user text-xs"></i>
          </button>

          {/* All Artists Toggle - Icon only on mobile - only show when in artist context, user has multiple artists, AND artist events is enabled */}
          {hasArtistContext && hasMultipleArtists && showArtistEvents && (
            <button
              onClick={onToggleAllArtists}
              className={`
                w-7 h-7 rounded-full text-xs font-medium border transition-all duration-200 flex items-center justify-center
                ${showAllArtists
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }
              `}
              data-testid="toggle-all-artists"
              title="All Artists"
            >
              <i className="fas fa-layer-group text-xs"></i>
            </button>
          )}
        </div>
      </div>

      {/* Desktop: Original layout with toggles and month navigation - COPIED from calendar.tsx.old lines 736-829 */}
      <div className="hidden md:block">
        {/* Toggle Controls */}
        <div className="px-4 py-2">
          <div className="flex flex-wrap items-center gap-4">
            {/* Artist Events Toggle */}
            {hasArtistContext && (
              <button
                onClick={onToggleArtistEvents}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                  ${showArtistEvents
                    ? 'bg-brand-accent text-white border-brand-accent shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                  }
                `}
                data-testid="toggle-artist-events"
              >
                <i className="fas fa-users mr-2 text-xs"></i>
                Artist Events
                {showArtistEvents && (
                  <i className="fas fa-check ml-2 text-xs"></i>
                )}
              </button>
            )}

            {/* My Events Toggle */}
            <button
              onClick={onToggleMyEvents}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                ${showMyEvents
                  ? 'bg-cyan-500 text-white border-cyan-500 shadow-md'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                }
              `}
              data-testid="toggle-my-events"
            >
              <i className="fas fa-user mr-2 text-xs"></i>
              My Events
              {showMyEvents && (
                <i className="fas fa-check ml-2 text-xs"></i>
              )}
            </button>

            {/* All Artists Toggle - only show when in artist context, user has multiple artists, AND artist events is enabled */}
            {hasArtistContext && hasMultipleArtists && showArtistEvents && (
              <button
                onClick={onToggleAllArtists}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                  ${showAllArtists
                    ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                  }
                `}
                data-testid="toggle-all-artists"
              >
                <i className="fas fa-layer-group mr-2 text-xs"></i>
                All Artists
                {showAllArtists && (
                  <i className="fas fa-check ml-2 text-xs"></i>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={navigateToPreviousMonth}
              className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-2 -ml-2"
              data-testid="button-previous-month"
            >
              <i className="fas fa-chevron-left text-xl"></i>
            </button>
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-center">
                <h1 className="text-slate-800 dark:text-white font-sans text-xl font-semibold">
                  {format(currentDate, "MMMM yyyy")}
                </h1>
              </div>
            </div>
            <button
              onClick={navigateToNextMonth}
              className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-2 -mr-2"
              data-testid="button-next-month"
            >
              <i className="fas fa-chevron-right text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper component that provides swipe gesture support for calendar view
 * Use this to wrap the calendar grid
 */
export function SwipeableCalendarWrapper({
  currentDate,
  onDateChange,
  children,
}: {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  children: React.ReactNode;
}) {
  const navigateToPreviousMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const navigateToNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const swipeRef = useSwipe(
    {
      onSwipeLeft: navigateToNextMonth,
      onSwipeRight: navigateToPreviousMonth,
    },
    {
      threshold: 50,
      trackMouse: false,
    }
  );

  return (
    <div ref={swipeRef} className="select-none">
      {children}
    </div>
  );
}
