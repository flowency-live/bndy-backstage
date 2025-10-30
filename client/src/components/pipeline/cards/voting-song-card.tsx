import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import VotingControls from "../features/voting-controls";
import VoteProgressBadge from "../features/vote-progress-badge";
import SpotifyEmbedPlayer from "@/components/spotify-embed-player";

interface PipelineSong {
  id: string;
  artist_id: string;
  song_id: string;
  status: string;
  votes: Record<string, { value: number; updated_at: string }>;
  suggested_by_user_id: string;
  suggested_comment: string;
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

interface VotingSongCardProps {
  song: PipelineSong;
  userId: string;
  memberCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function VotingSongCard({
  song,
  userId,
  memberCount,
  isExpanded,
  onToggleExpand
}: VotingSongCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userVote = song.votes?.[userId]?.value ?? null;
  const voteCount = Object.keys(song.votes || {}).length;
  const userHasVoted = userVote !== null;

  const voteMutation = useMutation({
    mutationFn: async (voteValue: number) => {
      const response = await fetch(
        `/api/artists/${song.artist_id}/pipeline/${song.id}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ vote_value: voteValue })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', song.artist_id, 'voting'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-count', song.artist_id] });
      toast({
        title: 'Vote submitted',
        description: userHasVoted ? 'Your vote has been updated' : 'Thanks for voting!'
      });
      onToggleExpand(); // Collapse after voting
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit vote. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleVote = async (value: number) => {
    setIsSubmitting(true);
    await voteMutation.mutateAsync(value);
    setIsSubmitting(false);
  };

  const needsUserVote = !userHasVoted;

  return (
    <div
      className={`
        rounded-lg overflow-hidden transition-all
        ${needsUserVote
          ? 'border-2 border-orange-500 shadow-lg shadow-orange-500/20'
          : 'border border-border'
        }
      `}
    >
      {/* Collapsed Card */}
      <div
        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={!isExpanded ? onToggleExpand : undefined}
      >
        <div className="flex gap-3">
          {/* Album Art */}
          <div className="flex-shrink-0">
            {song.globalSong.thumbnail_url ? (
              <img
                src={song.globalSong.thumbnail_url}
                alt={song.globalSong.title}
                className="w-16 h-16 rounded object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                <i className="fas fa-music text-muted-foreground"></i>
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {song.globalSong.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {song.globalSong.artist_name}
            </p>
            {song.suggested_comment && !isExpanded && (
              <p className="text-sm text-muted-foreground italic truncate mt-1">
                "{song.suggested_comment}"
              </p>
            )}
            <div className="mt-2">
              <VoteProgressBadge
                voteCount={voteCount}
                memberCount={memberCount}
                userHasVoted={userHasVoted}
              />
            </div>
          </div>

          {/* Vote Button */}
          {!isExpanded && (
            <div className="flex-shrink-0 flex items-center">
              <button
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${needsUserVote
                    ? 'bg-orange-500 text-white hover:bg-orange-600 animate-pulse'
                    : 'bg-primary/20 text-primary hover:bg-primary/30'
                  }
                `}
              >
                {needsUserVote ? 'VOTE NOW' : 'Change Vote'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-border bg-card space-y-4">
          {/* Spotify Preview */}
          {song.globalSong.spotify_url && (
            <div className="rounded-lg overflow-hidden">
              <SpotifyEmbedPlayer
                spotifyUrl={song.globalSong.spotify_url}
                onClose={() => {}}
              />
            </div>
          )}

          {/* Full Comment */}
          {song.suggested_comment && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <i className="fas fa-quote-left mr-2"></i>
                {song.suggested_comment}
              </p>
            </div>
          )}

          {/* Voting Controls */}
          <VotingControls
            currentVote={userVote}
            onVote={handleVote}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onToggleExpand}
              className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
