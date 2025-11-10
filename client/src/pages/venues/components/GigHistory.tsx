import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Music, FileText, CalendarDays } from 'lucide-react';
import { format, parseISO, isFuture, isPast, isToday } from 'date-fns';
import { venueCRMService } from '@/lib/services/venue-crm-service';
import type { VenueGig } from '@/lib/services/venue-crm-service';

interface GigHistoryProps {
  artistId: string;
  venueId: string;
}

export default function GigHistory({ artistId, venueId }: GigHistoryProps) {
  // Fetch gig history
  const { data: gigs = [], isLoading } = useQuery<VenueGig[]>({
    queryKey: ['venue-gigs', artistId, venueId],
    queryFn: () => venueCRMService.getVenueGigs(artistId, venueId),
  });

  const getGigStatus = (date: string) => {
    const gigDate = parseISO(date);
    if (isToday(gigDate)) return { label: 'Today', color: 'bg-green-500' };
    if (isFuture(gigDate)) return { label: 'Upcoming', color: 'bg-blue-500' };
    return { label: 'Past', color: 'bg-gray-500' };
  };

  const formatGigDate = (date: string) => {
    try {
      const gigDate = parseISO(date);
      return format(gigDate, 'EEE, MMM d, yyyy');
    } catch {
      return date;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (gigs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No gigs yet</h3>
          <p className="text-muted-foreground">
            You haven't played any gigs at this venue yet
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate upcoming and past gigs
  const upcomingGigs = gigs.filter(gig => isFuture(parseISO(gig.date)) || isToday(parseISO(gig.date)));
  const pastGigs = gigs.filter(gig => isPast(parseISO(gig.date)) && !isToday(parseISO(gig.date)));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Our Gigs at this Venue</h2>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{gigs.length}</span> total gigs
        </div>
      </div>

      {/* Upcoming Gigs Section */}
      {upcomingGigs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming ({upcomingGigs.length})
          </h3>
          <div className="grid gap-3">
            {upcomingGigs.map((gig) => {
              const status = getGigStatus(gig.date);
              return (
                <Card key={gig.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                          <Music className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">{gig.name}</h4>
                            <Badge className={`${status.color} text-white text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatGigDate(gig.date)}</span>
                          </div>
                          {gig.type === 'public_gig' && (
                            <Badge variant="outline" className="text-xs">
                              Public Event
                            </Badge>
                          )}
                          {gig.notes && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                              <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="italic">{gig.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Gigs Section */}
      {pastGigs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Past Gigs ({pastGigs.length})
          </h3>
          <div className="grid gap-3">
            {pastGigs.map((gig) => (
              <Card key={gig.id} className="hover:shadow-md transition-shadow border-l-4 border-l-gray-300">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white flex-shrink-0">
                        <Music className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{gig.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            Past
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatGigDate(gig.date)}</span>
                        </div>
                        {gig.type === 'public_gig' && (
                          <Badge variant="outline" className="text-xs">
                            Public Event
                          </Badge>
                        )}
                        {gig.notes && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="italic">{gig.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
