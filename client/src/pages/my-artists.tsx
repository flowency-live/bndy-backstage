import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { godmodeService } from "@/lib/services/godmode-service";
import { Loader2, Users, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Artist } from "@/types/api";
import CreateArtistWizard from "@/components/CreateArtistWizard";

export default function MyArtistsPage() {
  const [, setLocation] = useLocation();
  const { isUberAdmin, userProfile, isLoading: userLoading } = useUser();
  const [showingCreateForm, setShowingCreateForm] = useState(false);

  // Fetch ALL backstage artists (uber admin only)
  const { data: allArtists, isLoading: allArtistsLoading } = useQuery({
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

  // Determine which artists to show
  const artistsToShow = isUberAdmin
    ? allArtists || []
    : userProfile?.artists?.map(m => m.artist) || [];

  // Get set of artist IDs user is a member of (for uber admin badge display)
  const memberArtistIds = new Set(userProfile?.artists?.map(m => m.artist_id) || []);

  const isLoading = userLoading || (isUberAdmin && allArtistsLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {showingCreateForm && (
        <CreateArtistWizard
          onClose={() => setShowingCreateForm(false)}
          onSuccess={() => {
            setShowingCreateForm(false);
          }}
        />
      )}
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">
              {isUberAdmin ? "All Backstage Artists" : "My Artists"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isUberAdmin
                ? `Platform admin access to all ${artistsToShow.length} backstage artists`
                : "Select an artist to manage"}
            </p>
          </div>
        </div>

        {/* Artist Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {artistsToShow.map((artist: Artist) => {
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

                    {/* Membership Badge - only show for uber admin */}
                    {isUberAdmin && (
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
                    )}
                  </div>
                </Card>
              );
            })}

            {/* Create New Artist Tile */}
            <Card
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover-lift-subtle"
              onClick={() => setShowingCreateForm(true)}
              data-testid="create-new-artist-tile"
            >
              <CardContent className="p-0">
                {/* Orange gradient section */}
                <div
                  className="h-32 w-full relative overflow-hidden transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(24, 95%, 53%) 0%, hsl(24, 95%, 48%) 50%, hsl(24, 95%, 53%) 100%)',
                  }}
                >
                  {/* Background Icon */}
                  <div className="absolute top-2 right-2 text-white/20">
                    <Plus className="h-12 w-12" />
                  </div>

                  {/* Content */}
                  <div className="relative text-center px-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                      <Plus className="h-7 w-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* Info section */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">Create New</h3>
                  <p className="text-sm text-muted-foreground">
                    Start your artist profile
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {artistsToShow.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {isUberAdmin ? "No backstage artists found" : "You don't have any artists yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
