import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Plus } from "lucide-react";
import type { Artist, ArtistMembership } from "@/types/api";
import { BndySpinnerOverlay } from "@/components/ui/bndy-spinner";

interface ArtistTileProps {
  artist: Artist;
  membership: ArtistMembership;
  onClick: () => void;
}

function ArtistTile({ artist, membership, onClick }: ArtistTileProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in-up hover-lift-subtle"
      onClick={onClick}
      data-testid={`artist-tile-${artist.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {artist.profileImageUrl ? (
            <img
              src={artist.profileImageUrl}
              alt={`${artist.name} avatar`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: membership.color }}
            >
              <i className={`fas ${membership.icon} text-white text-2xl`}></i>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-serif font-semibold text-foreground mb-1">
              {artist.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {membership.resolved_display_name} • {membership.role}
            </p>
          </div>
          <ChevronRight className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyArtists() {
  const [, setLocation] = useLocation();
  const { userProfile, selectArtist, isLoading } = useUser();

  if (isLoading) {
    return <BndySpinnerOverlay />;
  }

  const handleArtistSelect = (artistId: string) => {
    selectArtist(artistId);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      <div className="px-2 sm:px-4 lg:px-6 pt-6 pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-2">
              My Artists
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Select an artist to manage
            </p>
          </div>

          {/* Artist Tiles */}
          <div className="grid gap-4 max-w-2xl mx-auto">
            {userProfile?.artists?.map((artistMembership) => (
              <ArtistTile
                key={artistMembership.artist_id}
                artist={artistMembership.artist!}
                membership={artistMembership}
                onClick={() => handleArtistSelect(artistMembership.artist_id)}
              />
            ))}

            {/* Create New Artist Tile */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in-up hover-lift-subtle border-2 border-dashed border-primary/30"
              onClick={() => setLocation("/dashboard")}
              data-testid="create-new-artist-tile"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                    <Plus className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-serif font-semibold text-foreground mb-1">
                      Create New Artist
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Start a new artist profile
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
