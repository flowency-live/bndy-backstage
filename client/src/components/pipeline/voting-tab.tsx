import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import VotingSongCard from "./cards/voting-song-card";
import { artistsService } from "@/lib/services/artists-service";
import { membershipsService } from "@/lib/services/memberships-service";
import type { ArtistMembership, Artist } from "@/types/api";

interface PipelineSong {
  id: string;
  artist_id: string;
  song_id: string;
  status: string;
  votes: Record<string, { value: number; updated_at: string }>;
  voting_scale?: 3 | 5;
  suggested_by_user_id: string;
  suggested_comment: string;
  created_at: string;
  globalSong: {
    id: string;
    title: string;
    artist_name: string;
    album: string;
    spotify_url: string;
    thumbnail_url?: string;
    preview_url?: string;
  };
}

interface PipelineSongWithScore extends PipelineSong {
  totalScore: number;
  scorePercentage: number;
}

interface VotingTabProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function VotingTab({ artistId, membership }: VotingTabProps) {
  const { session } = useServerAuth();
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  // Collapsible group state - "Please vote!" expanded by default (action needed)
  const [collapsed, setCollapsed] = useState({
    ready: true,
    pleaseVote: false,
    voted: true
  });

  const toggleGroup = (group: 'ready' | 'pleaseVote' | 'voted') => {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['pipeline', artistId, 'voting'],
    queryFn: async () => {
      return await artistsService.getVotingPipelineSongs(artistId);
    },
    refetchInterval: 30000
  });

  // Query memberships for member count AND for showing individual votes
  const { data: membershipsData } = useQuery({
    queryKey: ['artist-memberships', artistId],
    queryFn: async () => {
      const data = await membershipsService.getArtistMemberships(artistId);
      return data.memberships?.filter((m: ArtistMembership) => m.status === 'active') || [];
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const memberships = membershipsData || [];
  const memberCount = memberships.length || 1;

  // Get artist settings for showMemberVotes
  const showMemberVotes = membership.artist?.showMemberVotes || false;

  // Group songs into three categories
  const groupedSongs = songs.reduce((acc: { ready: PipelineSongWithScore[], pleaseVote: PipelineSongWithScore[], voted: PipelineSongWithScore[] }, song: PipelineSong) => {
    const voteCount = Object.keys(song.votes || {}).length;
    const cognitoId = session?.user?.cognitoId;
    const hasUserVote = cognitoId ? song.votes?.[cognitoId] : undefined;
    const votingScale = song.voting_scale || 5;  // Backwards compatible: existing songs use 5

    // Calculate total score for sorting
    const totalScore = Object.values(song.votes || {}).reduce(
      (sum: number, vote: { value: number }) => sum + (vote.value || 0),
      0
    );
    const maxScore = memberCount * votingScale;
    const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const songWithScore: PipelineSongWithScore = { ...song, totalScore, scorePercentage };

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
  }, { ready: [], pleaseVote: [], voted: [] });

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
          <button
            onClick={() => toggleGroup('ready')}
            className="mb-3 w-full flex items-center gap-2 group cursor-pointer"
          >
            <div className="flex-1 h-px bg-border"></div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <i className={`fas fa-chevron-${collapsed.ready ? 'right' : 'down'} text-xs transition-transform`}></i>
              <i className="fas fa-check-circle text-green-500"></i>
              Ready ({groupedSongs.ready.length})
            </h3>
            <div className="flex-1 h-px bg-border"></div>
          </button>
          {!collapsed.ready && (
            <div className="space-y-3">
              {groupedSongs.ready.map((song: PipelineSongWithScore) => (
                <VotingSongCard
                  key={song.id}
                  song={song}
                  userId={session?.user?.cognitoId || ''}
                  memberCount={memberCount}
                  isExpanded={expandedSongId === song.id}
                  onToggleExpand={() => handleToggleExpand(song.id)}
                  memberships={memberships}
                  showMemberVotes={showMemberVotes}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Please Vote Group */}
      {groupedSongs.pleaseVote.length > 0 && (
        <div>
          <button
            onClick={() => toggleGroup('pleaseVote')}
            className="mb-3 w-full flex items-center gap-2 group cursor-pointer"
          >
            <div className="flex-1 h-px bg-border"></div>
            <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide flex items-center gap-2">
              <i className={`fas fa-chevron-${collapsed.pleaseVote ? 'right' : 'down'} text-xs transition-transform`}></i>
              <i className="fas fa-exclamation-circle"></i>
              Please vote! ({groupedSongs.pleaseVote.length})
            </h3>
            <div className="flex-1 h-px bg-border"></div>
          </button>
          {!collapsed.pleaseVote && (
            <div className="space-y-3">
              {groupedSongs.pleaseVote.map((song: PipelineSongWithScore) => (
                <VotingSongCard
                  key={song.id}
                  song={song}
                  userId={session?.user?.cognitoId || ''}
                  memberCount={memberCount}
                  isExpanded={expandedSongId === song.id}
                  onToggleExpand={() => handleToggleExpand(song.id)}
                  memberships={memberships}
                  showMemberVotes={showMemberVotes}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Voted Group */}
      {groupedSongs.voted.length > 0 && (
        <div>
          <button
            onClick={() => toggleGroup('voted')}
            className="mb-3 w-full flex items-center gap-2 group cursor-pointer"
          >
            <div className="flex-1 h-px bg-border"></div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <i className={`fas fa-chevron-${collapsed.voted ? 'right' : 'down'} text-xs transition-transform`}></i>
              <i className="fas fa-clock"></i>
              Voted ({groupedSongs.voted.length})
            </h3>
            <div className="flex-1 h-px bg-border"></div>
          </button>
          {!collapsed.voted && (
            <div className="space-y-3">
              {groupedSongs.voted.map((song: PipelineSongWithScore) => (
                <VotingSongCard
                  key={song.id}
                  song={song}
                  userId={session?.user?.cognitoId || ''}
                  memberCount={memberCount}
                  isExpanded={expandedSongId === song.id}
                  onToggleExpand={() => handleToggleExpand(song.id)}
                  memberships={memberships}
                  showMemberVotes={showMemberVotes}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
