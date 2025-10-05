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
      className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in-up hover-lift-subtle aspect-square"
      onClick={onClick}
      data-testid={`artist-tile-${artist.id}`}
    >
      <CardContent className="p-0 h-full flex flex-col">
        {/* Artist Image - Takes most of the space */}
        <div className="flex-1 relative overflow-hidden rounded-t-lg">
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
              <i className={`fas ${membership.icon} text-white text-6xl`}></i>
            </div>
          )}
        </div>

        {/* Artist Info - Bottom section */}
        <div className="p-4 text-center">
          <h3 className="text-lg font-serif font-semibold text-foreground mb-1 truncate">
            {artist.name}
          </h3>
          <p className="text-sm text-muted-foreground capitalize">
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

            {/* Artist Tiles - 2 per row */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {userProfile?.artists?.map((artistMembership) => (
                <ArtistTile
                  key={artistMembership.artist_id}
                  artist={artistMembership.artist!}
                  membership={artistMembership}
                  onClick={() => handleArtistSelect(artistMembership.artist_id)}
                />
              ))}

              {/* Create New Artist Tile - Orange DashboardTile style */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in-up hover-lift-subtle aspect-square"
                onClick={() => setShowingCreateForm(true)}
                data-testid="create-new-artist-tile"
              >
                <CardContent className="p-0 h-full">
                  <div
                    className="h-full rounded-lg relative overflow-hidden transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, hsl(24, 95%, 53%) 0%, color-mix(in hsl, hsl(24, 95%, 53%) 80%, transparent 20%) 50%, color-mix(in hsl, hsl(24, 95%, 53%) 90%, transparent 10%) 100%)',
                      backgroundSize: '200% 200%',
                      backgroundPosition: '0% 0%'
                    }}
                  >
                    {/* Background Icon */}
                    <div className="absolute top-2 right-2 text-white/20 text-6xl">
                      <Plus className="h-16 w-16" />
                    </div>

                    {/* Content */}
                    <div className="relative text-center p-6">
                      <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                        <Plus className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="text-xl font-serif font-semibold text-white drop-shadow-lg mb-2">
                        Create New
                      </h3>
                      <p className="text-white/90 text-sm drop-shadow-md">
                        Start your artist profile
                      </p>
                    </div>
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
