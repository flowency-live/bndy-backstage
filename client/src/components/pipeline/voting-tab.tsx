import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import VotingSongCard from "./cards/voting-song-card";
import type { ArtistMembership, Artist } from "@/types/api";

interface VotingTabProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function VotingTab({ artistId, membership }: VotingTabProps) {
  const { session } = useServerAuth();
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['pipeline', artistId, 'voting'],
    queryFn: async () => {
      const response = await fetch(
        `/api/artists/${artistId}/pipeline?status=voting`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch voting songs');
      }

      return response.json();
    },
    refetchInterval: 30000
  });

  // Get member count for vote progress
  const { data: memberCount = 1 } = useQuery({
    queryKey: ['members-count', artistId],
    queryFn: async () => {
      const response = await fetch(
        `/api/artists/${artistId}/memberships`,
        { credentials: 'include' }
      );

      if (!response.ok) return 1;
      const members = await response.json();
      return members.length;
    }
  });

  // Sort songs: needs user vote first, then already voted
  const sortedSongs = [...songs].sort((a, b) => {
    const aHasUserVote = a.votes?.[session?.user?.id];
    const bHasUserVote = b.votes?.[session?.user?.id];

    if (!aHasUserVote && bHasUserVote) return -1;
    if (aHasUserVote && !bHasUserVote) return 1;
    return 0;
  });

  const handleToggleExpand = (songId: string) => {
    setExpandedSongId(expandedSongId === songId ? null : songId);
  };

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
        <i className="fas fa-vote-yea text-4xl text-muted-foreground mb-4"></i>
        <h3 className="text-lg font-medium mb-2">No songs to vote on</h3>
        <p className="text-muted-foreground mb-4">
          Suggest a song to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {sortedSongs.map((song) => (
        <VotingSongCard
          key={song.id}
          song={song}
          userId={session?.user?.id || ''}
          memberCount={memberCount}
          isExpanded={expandedSongId === song.id}
          onToggleExpand={() => handleToggleExpand(song.id)}
        />
      ))}
    </div>
  );
}
