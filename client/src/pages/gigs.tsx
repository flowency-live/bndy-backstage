import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useUser } from "@/lib/user-context";
import { format, isToday, isPast, isFuture, startOfYear, endOfYear, addYears } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Music } from "lucide-react";
import type { Event } from "@/types/api";
import { apiRequest } from "@/lib/queryClient";

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

interface GigsProps {
  artistId: string;
}

export default function Gigs({ artistId }: GigsProps) {
  const { session } = useServerAuth();

  // Fetch all gigs (past and future)
  const { data: gigsData, isLoading } = useQuery<{
    artistEvents: Event[];
    userEvents: Event[];
    otherArtistEvents: Event[];
  }>({
    queryKey: ["/api/artists", artistId, "calendar", "all-gigs"],
    queryFn: async () => {
      // Get gigs from start of current year to end of next year
      const today = new Date();
      const startDate = startOfYear(today);
      const endDate = endOfYear(addYears(today, 1));

      const response = await apiRequest(
        "GET",
        `/api/artists/${artistId}/calendar?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`
      );
      return response.json();
    },
    enabled: !!session && !!artistId,
  });

  // Extract only this artist's gigs
  const allGigs = (gigsData?.artistEvents || [])
    .filter((event) => event.type === "gig")
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const todayGigs = allGigs.filter((gig) => isToday(new Date(gig.date)));
  const futureGigs = allGigs.filter((gig) => isFuture(new Date(gig.date)) && !isToday(new Date(gig.date)));
  const pastGigs = allGigs.filter((gig) => isPast(new Date(gig.date)) && !isToday(new Date(gig.date)));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Gigs" />

      {allGigs.length === 0 ? (
        <EmptyState
          icon={<Music className="h-12 w-12" />}
          title="No gigs yet"
          description="Add your first gig to get started"
        />
      ) : (
          <div className="space-y-8">
            {/* Today's Gigs */}
            {todayGigs.length > 0 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-orange-500">🎸</span> Today
                </h2>
                <div className="space-y-3">
                  {todayGigs.map((gig) => (
                    <GigCard key={gig.id} gig={gig} highlighted />
                  ))}
                </div>
              </div>
            )}

            {/* Future Gigs */}
            {futureGigs.length > 0 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground mb-4">
                  Upcoming
                </h2>
                <div className="space-y-3">
                  {futureGigs.map((gig) => (
                    <GigCard key={gig.id} gig={gig} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Gigs */}
            {pastGigs.length > 0 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground mb-4">
                  Past Gigs
                </h2>
                <div className="space-y-3">
                  {pastGigs.map((gig) => (
                    <GigCard key={gig.id} gig={gig} past />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </PageContainer>
  );
}

interface GigCardProps {
  gig: Event;
  highlighted?: boolean;
  past?: boolean;
}

function GigCard({ gig, highlighted, past }: GigCardProps) {
  // Format date with full day name and ordinal (e.g., "Saturday 15th November")
  const gigDateObj = new Date(gig.date);
  const dayName = format(gigDateObj, 'EEEE');
  const day = gigDateObj.getDate();
  const monthName = format(gigDateObj, 'MMMM');
  const gigDate = `${dayName} ${day}${getOrdinalSuffix(day)} ${monthName}`;
  const gigTime = gig.startTime ? ` • ${gig.startTime}${gig.endTime && gig.endTime !== "00:00" ? ` - ${gig.endTime}` : ''}` : '';

  // Color for the border - orange for today, muted for past, brand accent for future
  const borderColor = highlighted ? '#f97316' : past ? '#94a3b8' : '#f97316';

  return (
    <Card
      className={`transition-all hover:shadow-md cursor-pointer border-l-4 ${
        highlighted ? "shadow-lg" : ""
      } ${past ? "opacity-70" : ""}`}
      style={{ borderLeftColor: borderColor }}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground flex-shrink-0"
            style={{ backgroundColor: borderColor }}
          >
            <span className="text-lg">🎵</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-sans font-semibold text-card-foreground">
                {gig.title}
              </h3>
              {highlighted && (
                <Badge className="bg-orange-500 text-white">Today</Badge>
              )}
              {gig.isPublic && !highlighted && (
                <Badge variant="secondary">Public</Badge>
              )}
            </div>

            {gig.venue && (
              <p className="text-muted-foreground text-sm truncate mb-1">
                📍 {gig.venue}
              </p>
            )}

            <p className="text-muted-foreground text-sm font-medium">
              {gigDate}
              {gigTime}
            </p>

            {gig.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {gig.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
