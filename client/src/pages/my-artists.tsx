import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { godmodeService } from "@/lib/services/godmode-service";
import { Loader2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Artist } from "@/types/api";

export default function MyArtistsPage() {
  const [, setLocation] = useLocation();
  const { isUberAdmin, userProfile } = useUser();

  // Fetch ALL backstage artists
  const { data: allArtists, isLoading } = useQuery({
    queryKey: ["all-backstage-artists"],
    queryFn: async () => {
      const artists = await godmodeService.getAllArtists();
      return artists.filter((artist: Artist) => artist.source === 'backstage');
    },
    enabled: isUberAdmin,
  });

  const handleSelectArtist = (artistId: string) => {
    localStorage.setItem('bndy-selected-artist-id', artistId);
    window.location.href = '/dashboard';
  };

  // Get set of artist IDs user is a member of
  const memberArtistIds = new Set(userProfile?.artists?.map(m => m.artist_id) || []);

  if (!isUberAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            This page is only available to platform administrators.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">All Backstage Artists</h1>
          <p className="text-muted-foreground mt-1">
            Platform admin access to all {allArtists?.length || 0} backstage artists
          </p>
        </div>
      </div>

      {/* Artist Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allArtists?.map((artist: Artist) => {
            const isMember = memberArtistIds.has(artist.id);

            return (
              <Card
                key={artist.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelectArtist(artist.id)}
              >
                {/* Artist Image/Color */}
                <div
                  className="h-32 w-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{
                    backgroundColor: artist.displayColour || '#666666',
                    backgroundImage: artist.profileImageUrl
                      ? `url(${artist.profileImageUrl})`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!artist.profileImageUrl && artist.name.charAt(0)}
                </div>

                {/* Artist Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg truncate">{artist.name}</h3>

                  {artist.location && (
                    <p className="text-sm text-muted-foreground truncate">
                      {artist.location}
                    </p>
                  )}

                  {artist.genres && artist.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {artist.genres.slice(0, 2).map((genre) => (
                        <span
                          key={genre}
                          className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {genre}
                        </span>
                      ))}
                      {artist.genres.length > 2 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          +{artist.genres.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Membership Badge */}
                  <div className="mt-3 text-xs">
                    {isMember ? (
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        Member
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        Platform Admin
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {allArtists?.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No backstage artists found</p>
          </div>
        )}
      </div>
    </div>
  );
}
