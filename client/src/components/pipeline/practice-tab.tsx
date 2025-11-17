import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import PracticeSongCard from "./cards/practice-song-card";
import { artistsService } from "@/lib/services/artists-service";
import type { ArtistMembership, Artist } from "@/types/api";

interface PracticeTabProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function PracticeTab({ artistId, membership }: PracticeTabProps) {
  const { session } = useServerAuth();
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['pipeline', artistId, 'practice'],
    queryFn: async () => {
      return await artistsService.getPipelineSongs(artistId, 'practice');
    },
    refetchInterval: 30000
  });

  // TODO: Get actual member count from membership prop/context
  const memberCount = 1;

  // Sort: needs RAG status first
  const sortedSongs = [...songs].sort((a, b) => {
    const aHasRag = a.rag_status?.[session?.user?.id];
    const bHasRag = b.rag_status?.[session?.user?.id];

    if (!aHasRag && bHasRag) return -1;
    if (aHasRag && !bHasRag) return 1;
    return 0;
  });

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
        <i className="fas fa-guitar text-4xl text-muted-foreground mb-4"></i>
        <h3 className="text-lg font-medium mb-2">No songs in practice</h3>
        <p className="text-muted-foreground mb-4">
          Songs appear here when moved from Review
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {sortedSongs.map((song: any) => (
        <PracticeSongCard
          key={song.id}
          song={song}
          userId={session?.user?.id || ''}
          memberCount={memberCount}
          isExpanded={expandedSongId === song.id}
          onToggleExpand={() => setExpandedSongId(expandedSongId === song.id ? null : song.id)}
        />
      ))}
    </div>
  );
}
