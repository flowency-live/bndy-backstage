import { useQuery } from "@tanstack/react-query";
import ReviewSongCard from "./cards/review-song-card";
import { artistsService } from "@/lib/services/artists-service";
import type { ArtistMembership, Artist } from "@/types/api";

interface ReviewTabProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function ReviewTab({ artistId, membership }: ReviewTabProps) {
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['pipeline', artistId, 'review'],
    queryFn: async () => {
      return await artistsService.getPipelineSongs(artistId, 'review');
    },
    refetchInterval: 30000
  });

  // TODO: Get actual member count from membership prop/context
  const memberCount = 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-muted-foreground mb-2"></i>
          <p className="text-muted-foreground">Loading songs...</p>
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-star text-4xl text-muted-foreground mb-4"></i>
        <h3 className="text-lg font-medium mb-2">No songs to review</h3>
        <p className="text-muted-foreground mb-4">
          Songs appear here when all members have voted
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {songs.map((song: any) => (
        <ReviewSongCard
          key={song.id}
          song={song}
          memberCount={memberCount}
        />
      ))}
    </div>
  );
}
