import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useUser } from "@/lib/user-context";
import { format, isToday, isPast, isFuture } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/types/api";
import { apiRequest } from "@/lib/queryClient";

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
      // Get gigs from the past year and next year
      const pastYear = new Date();
      pastYear.setFullYear(pastYear.getFullYear() - 1);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const response = await apiRequest(
        "GET",
        `/api/artists/${artistId}/calendar?startDate=${format(pastYear, "yyyy-MM-dd")}&endDate=${format(nextYear, "yyyy-MM-dd")}`
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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-6">Gigs</h1>

        {allGigs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground mb-4">
                <i className="fas fa-guitar text-4xl"></i>
              </div>
              <h3 className="text-lg font-sans font-semibold text-muted-foreground mb-2">
                No gigs yet
              </h3>
              <p className="text-muted-foreground">Add your first gig to get started</p>
            </CardContent>
          </Card>
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
      </div>
    </div>
  );
}

interface GigCardProps {
  gig: Event;
  highlighted?: boolean;
  past?: boolean;
}

function GigCard({ gig, highlighted, past }: GigCardProps) {
  return (
    <Card
      className={`transition-all hover:shadow-md cursor-pointer ${
        highlighted ? "border-orange-500 border-2 shadow-lg" : ""
      } ${past ? "opacity-70" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-sans font-semibold text-card-foreground">
                {gig.title}
              </h3>
              {highlighted && (
                <Badge className="bg-orange-500 text-white">Today</Badge>
              )}
              {gig.isPublic && !highlighted && (
                <Badge variant="secondary">
                  Public
                </Badge>
              )}
            </div>

            {gig.venue && (
              <p className="text-muted-foreground flex items-center gap-2 mb-1">
                <i className="fas fa-map-marker-alt"></i>
                {gig.venue}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <i className="fas fa-calendar"></i>
                {format(new Date(gig.date), "EEE, MMM do yyyy")}
              </span>
              {gig.startTime && (
                <span className="flex items-center gap-1">
                  <i className="fas fa-clock"></i>
                  {gig.startTime}
                  {gig.endTime && gig.endTime !== "00:00" && ` - ${gig.endTime}`}
                </span>
              )}
            </div>

            {gig.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {gig.description}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-2xl">🎵</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
