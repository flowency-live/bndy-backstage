import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useServerAuth } from "@/hooks/useServerAuth";
import type { Event } from "@/types/api";
import { EVENT_TYPE_CONFIG } from "@/types/api";

interface GigAlertBannerProps {
  bandId: string;
  className?: string;
}

export default function GigAlertBanner({ bandId, className = "" }: GigAlertBannerProps) {
  const { session } = useServerAuth();
  
  // Get today's date in YYYY-MM-DD format
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Fetch today's events
  const { data: todayEvents = [] } = useQuery<Event[]>({
    queryKey: ["/api/bands", bandId, "events", "today", today],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("No access token");
      }
      
      const response = await fetch(`/api/bands/${bandId}/events?startDate=${today}&endDate=${today}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      
      const events = await response.json();
      
      // Filter for today's gigs only (public_gig and festival)
      return events.filter((event: Event) => 
        (event.type === "public_gig" || event.type === "festival") && 
        event.date === today
      );
    },
    enabled: !!session?.access_token && !!bandId,
  });

  // Don't render if no gigs today
  if (!todayEvents.length) {
    return null;
  }

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
                🎉 {todayEvents.length === 1 ? 'Gig' : 'Gigs'} today!
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
              🎉 You have {todayEvents.length === 1 ? 'a gig' : 'gigs'} today!
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
          {todayEvents.map((gig, index) => (
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