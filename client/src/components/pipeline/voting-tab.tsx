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

  // TODO: Get actual member count from membership prop/context
  const memberCount = 1;

  // Group songs into three categories
  const groupedSongs = songs.reduce((acc, song) => {
    const voteCount = Object.keys(song.votes || {}).length;
    const hasUserVote = song.votes?.[session?.user?.id];

    // Calculate total score for sorting
    const totalScore = Object.values(song.votes || {}).reduce(
      (sum, vote: any) => sum + (vote.value || 0),
      0
    );
    const maxScore = memberCount * 5;
    const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const songWithScore = { ...song, totalScore, scorePercentage };

    if (voteCount >= memberCount) {
      // All votes received - ready for review
      acc.ready.push(songWithScore);
    } else if (!hasUserVote) {
      // User hasn't voted yet
      acc.pleaseVote.push(songWithScore);
    } else {
      // User has voted, waiting for others
      acc.voted.push(songWithScore);
    }

    return acc;
  }, { ready: [] as any[], pleaseVote: [] as any[], voted: [] as any[] });

  // Sort "Ready" by score (highest first)
  groupedSongs.ready.sort((a, b) => b.totalScore - a.totalScore);

  // Sort "Please vote!" by creation date (oldest first)
  groupedSongs.pleaseVote.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Sort "Voted" by creation date (oldest first)
  groupedSongs.voted.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

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
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Ready Group */}
      {groupedSongs.ready.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 h-px bg-border"></div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <i className="fas fa-check-circle text-green-500"></i>
              Ready ({groupedSongs.ready.length})
            </h3>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <div className="space-y-3">
            {groupedSongs.ready.map((song) => (
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
        </div>
      )}

      {/* Please Vote Group */}
      {groupedSongs.pleaseVote.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 h-px bg-border"></div>
            <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              Please vote! ({groupedSongs.pleaseVote.length})
            </h3>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <div className="space-y-3">
            {groupedSongs.pleaseVote.map((song) => (
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
        </div>
      )}

      {/* Voted Group */}
      {groupedSongs.voted.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 h-px bg-border"></div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <i className="fas fa-clock"></i>
              Voted ({groupedSongs.voted.length})
            </h3>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <div className="space-y-3">
            {groupedSongs.voted.map((song) => (
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
        </div>
      )}
    </div>
  );
}
