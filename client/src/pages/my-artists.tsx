import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { Artist, ArtistMembership } from "@/types/api";
import { BndySpinnerOverlay } from "@/components/ui/bndy-spinner";
import CreateArtistWizard from "@/components/CreateArtistWizard";

interface ArtistTileProps {
  artist: Artist;
  membership: ArtistMembership;
  onClick: () => void;
}

function ArtistTile({ artist, membership, onClick }: ArtistTileProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in-up hover-lift-subtle overflow-hidden"
      onClick={onClick}
      data-testid={`artist-tile-${artist.id}`}
    >
      <CardContent className="p-0">
        {/* Artist Image - Square aspect ratio, fills width */}
        <div className="aspect-square relative overflow-hidden">
          {artist.profileImageUrl ? (
            <img
              src={artist.profileImageUrl}
              alt={`${artist.name} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: membership.color }}
            >
              <i className={`fas ${membership.icon} text-white text-5xl sm:text-6xl`}></i>
            </div>
          )}
        </div>

        {/* Artist Info - Below image */}
        <div className="p-3 sm:p-4 bg-card">
          <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground mb-1 truncate">
            {artist.name}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground capitalize">
            {membership.role}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyArtists() {
  const [, setLocation] = useLocation();
  const { userProfile, selectArtist, isLoading } = useUser();
  const [showingCreateForm, setShowingCreateForm] = useState(false);

  if (isLoading) {
    return <BndySpinnerOverlay />;
  }

  const handleArtistSelect = (artistId: string) => {
    selectArtist(artistId);
    setLocation("/dashboard");
  };

  return (
    <>
      {showingCreateForm && (
        <CreateArtistWizard
          onClose={() => setShowingCreateForm(false)}
          onSuccess={() => {
            setShowingCreateForm(false);
            // Wizard will handle artist selection and redirect
          }}
        />
      )}
      <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
        <div className="px-2 sm:px-4 lg:px-6 pt-6 pb-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-2">
                My Artists
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Select an artist to manage
              </p>
            </div>

            {/* Artist Tiles - Responsive grid: 2 on mobile, 3 on tablet, 4 on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {userProfile?.artists?.map((artistMembership) => (
                <ArtistTile
                  key={artistMembership.artist_id}
                  artist={artistMembership.artist!}
                  membership={artistMembership}
                  onClick={() => handleArtistSelect(artistMembership.artist_id)}
                />
              ))}

              {/* Create New Artist Tile - Orange gradient, matches other tiles */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in-up hover-lift-subtle overflow-hidden"
                onClick={() => setShowingCreateForm(true)}
                data-testid="create-new-artist-tile"
              >
                <CardContent className="p-0">
                  {/* Orange gradient section - same aspect ratio as artist images */}
                  <div
                    className="aspect-square relative overflow-hidden transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, hsl(24, 95%, 53%) 0%, hsl(24, 95%, 48%) 50%, hsl(24, 95%, 53%) 100%)',
                    }}
                  >
                    {/* Background Icon */}
                    <div className="absolute top-2 right-2 text-white/20">
                      <Plus className="h-12 w-12 sm:h-16 sm:w-16" />
                    </div>

                    {/* Content */}
                    <div className="relative text-center px-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Plus className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-serif font-semibold text-white drop-shadow-lg">
                        Create New
                      </h3>
                    </div>
                  </div>

                  {/* Info section below - matches artist tiles */}
                  <div className="p-3 sm:p-4 bg-card">
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      Start your artist profile
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
