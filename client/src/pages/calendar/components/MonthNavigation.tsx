import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipe } from '@/hooks/use-swipe';

interface MonthNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  enableSwipe?: boolean;
  children?: React.ReactNode;
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
      {/* Mobile: Compact row */}
      <div className="flex md:hidden items-center justify-between px-2 py-1.5">
        <button
          onClick={navigateToPreviousMonth}
          className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-1"
          data-testid="button-previous-month"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-slate-800 dark:text-white font-sans text-base font-semibold flex-shrink-0 mx-2">
          {format(currentDate, 'MMM yyyy')}
        </h1>

        <button
          onClick={navigateToNextMonth}
          className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-1"
          data-testid="button-next-month"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Additional mobile controls slot */}
        {children && <div className="flex items-center gap-1 ml-2">{children}</div>}
      </div>

      {/* Desktop: Full navigation */}
      <div className="hidden md:block px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={navigateToPreviousMonth}
            className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-2 -ml-2"
            data-testid="button-previous-month"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-center">
              <h1 className="text-slate-800 dark:text-white font-sans text-2xl font-bold">
                {format(currentDate, 'MMMM yyyy')}
              </h1>
            </div>
          </div>

          <button
            onClick={navigateToNextMonth}
            className="text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-gray-200 p-2 -mr-2"
            data-testid="button-next-month"
            aria-label="Next month"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
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
