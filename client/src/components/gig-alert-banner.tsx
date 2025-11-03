import { format } from "date-fns";
import type { Event } from "@/types/api";
import { EVENT_TYPE_CONFIG } from "@/types/api";

interface GigAlertBannerProps {
  artistId: string;
  events: Event[];           // NEW: receive from parent
  isLoading?: boolean;       // NEW: loading state
  className?: string;
}

export default function GigAlertBanner({
  artistId,
  events,
  isLoading,
  className = ""
}: GigAlertBannerProps) {
  // Get today's and tomorrow's dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  // Show skeleton while loading
  if (isLoading) {
    return <div className="w-full h-16 bg-muted animate-pulse rounded-lg mb-3 sm:mb-4" />;
  }

  // Filter events client-side for gigs only (today or tomorrow)
  const upcomingGigs = events.filter((event: Event) =>
    event.type === "gig" &&
    (event.date === todayStr || event.date === tomorrowStr)
  );

  const todayGigs = upcomingGigs.filter(g => g.date === todayStr);
  const tomorrowGigs = upcomingGigs.filter(g => g.date === tomorrowStr);

  // Don't render if no gigs today or tomorrow
  if (!todayGigs.length && !tomorrowGigs.length) {
    return null;
  }

  const isToday = todayGigs.length > 0;

  return (
    <div className={`relative overflow-hidden animate-glow-today ${className}`}>
      {/* Electric blue pulse animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-30 animate-pulse-cyan"></div>
      
      {/* Main banner content - Mobile optimized */}
      <div className="relative bg-gradient-to-r from-orange-400 to-orange-500 text-primary-foreground p-2 sm:p-3 lg:p-4 rounded-xl shadow-lg border-2 border-orange-300 animate-pulse-orange">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Mobile: Top row with icon and title */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Alert icon with electric blue glow */}
            <div className="flex-shrink-0">
              <div className="relative animate-float">
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-md opacity-80 animate-pulse-cyan"></div>
                <div className="relative bg-background text-orange-500 rounded-full p-1 sm:p-2 text-base sm:text-xl font-bold animate-bounce-soft">
                  🎭
                </div>
              </div>
            </div>
            
            {/* Alert title - Mobile layout */}
            <div className="flex-1 sm:hidden">
              <h3 className="text-base font-serif font-bold" data-testid="text-gig-alert-title">
                🎉 {isToday ?
                  (todayGigs.length === 1 ? 'Gig today!' : 'Gigs today!') :
                  (tomorrowGigs.length === 1 ? 'Gig tomorrow!' : 'Gigs tomorrow!')
                }
              </h3>
            </div>
            
            {/* Action button - Mobile top right */}
            <div className="flex-shrink-0 sm:hidden">
              <button
                onClick={() => window.location.href = '/calendar'}
                className="bg-background text-orange-500 hover:bg-muted px-2 py-1 text-xs rounded-md font-semibold transition-colors duration-200 shadow-md"
                data-testid="button-view-calendar"
              >
                Details
              </button>
            </div>
          </div>
          
          {/* Desktop title - Hidden on mobile */}
          <div className="hidden sm:block flex-1">
            <h3 className="text-lg font-serif font-bold mb-1" data-testid="text-gig-alert-title">
              🎉 You have {isToday ?
                (todayGigs.length === 1 ? 'a gig today!' : 'gigs today!') :
                (tomorrowGigs.length === 1 ? 'a gig tomorrow!' : 'gigs tomorrow!')
              }
            </h3>
          </div>
          
          {/* Desktop action button */}
          <div className="hidden sm:block flex-shrink-0">
            <button
              onClick={() => window.location.href = '/calendar'}
              className="bg-background text-orange-500 hover:bg-muted px-4 py-2 rounded-lg font-semibold transition-colors duration-200 shadow-md"
              data-testid="button-view-calendar"
            >
              View Details
            </button>
          </div>
        </div>
        
        {/* Event details - Full width on mobile */}
        <div className="mt-2 sm:mt-1 space-y-1">
          {(isToday ? todayGigs : tomorrowGigs).map((gig, index) => (
            <div key={gig.id} className="flex items-start gap-2" data-testid={`text-gig-${index}`}>
              <span className="text-sm sm:text-lg flex-shrink-0">{EVENT_TYPE_CONFIG[gig.type as keyof typeof EVENT_TYPE_CONFIG]?.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm sm:text-base block sm:inline">
                  {gig.title || EVENT_TYPE_CONFIG[gig.type as keyof typeof EVENT_TYPE_CONFIG]?.label}
                </span>
                {(gig.venue || gig.location) && (
                  <span className="text-orange-100 text-xs sm:text-sm block sm:inline sm:ml-2">
                    @ {gig.venue || gig.location}
                  </span>
                )}
                {gig.startTime && (
                  <span className="text-orange-100 text-xs sm:text-sm block sm:inline sm:ml-2">
                    at {formatTime(gig.startTime)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Additional electric blue accent border */}
      <div className="absolute inset-0 rounded-xl border-2 border-blue-400 opacity-30 animate-pulse pointer-events-none"></div>
    </div>
  );
}

// Helper function to format time (similar to EventModal)
function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour24 = parseInt(hours);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const period = hour24 >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${period}`;
}