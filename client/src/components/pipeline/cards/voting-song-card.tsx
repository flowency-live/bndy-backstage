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

  const userVote = song.votes?.[userId]?.value ?? null;
  const voteCount = Object.keys(song.votes || {}).length;
  const userHasVoted = userVote !== null;

  // Calculate score percentage
  const totalScore = Object.values(song.votes || {}).reduce(
    (sum, vote: any) => sum + (vote.value || 0),
    0
  );
  const maxScore = memberCount * 5;
  const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  console.log('VOTING CARD DEBUG:', {
    songTitle: song.globalSong?.title,
    userId,
    userVote,
    voteCount,
    memberCount,
    userHasVoted,
    scorePercentage,
    allVotes: song.votes
  });

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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/artists/${song.artist_id}/pipeline/${song.id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete suggestion');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', song.artist_id, 'voting'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-count', song.artist_id] });
      toast({
        title: 'Suggestion removed',
        description: 'The song has been removed from the pipeline'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(
        `/api/artists/${song.artist_id}/pipeline/${song.id}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to change status');
      }

      return response.json();
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', song.artist_id] });
      const statusLabels: Record<string, string> = {
        practice: 'Practice',
        parked: 'Parked',
        discarded: 'Discarded'
      };
      toast({
        title: 'Song moved',
        description: `Song moved to ${statusLabels[newStatus] || newStatus}`
      });
      onToggleExpand(); // Collapse after moving
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to move song. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleVote = async (value: number) => {
    await voteMutation.mutateAsync(value);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this suggestion?')) {
      deleteMutation.mutate();
    }
  };

  const needsUserVote = !userHasVoted;
  const isSuggester = song.suggested_by_user_id === userId;

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
        className="p-2 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={!isExpanded ? onToggleExpand : undefined}
      >
        <div className="flex gap-2">
          {/* Album Art */}
          <div className="flex-shrink-0 relative group">
            {song.globalSong.thumbnail_url ? (
              <>
                <img
                  src={song.globalSong.thumbnail_url}
                  alt={song.globalSong.title}
                  className="w-16 h-16 rounded object-cover"
                />
                {/* Play icon overlay - always visible */}
                {song.globalSong.spotify_url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                    <i className="fas fa-play text-white text-lg drop-shadow-lg"></i>
                  </div>
                )}
              </>
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
          </div>

          {/* Vote Status & Button Column */}
          {!isExpanded && (
            <div className="flex-shrink-0 flex flex-col items-end justify-center gap-1.5">
              <VoteProgressBadge
                voteCount={voteCount}
                memberCount={memberCount}
                userHasVoted={userHasVoted}
                scorePercentage={scorePercentage}
              />
              {userHasVoted ? (
                <div
                  className="flex gap-0.5 cursor-pointer hover:scale-110 transition-transform"
                  title="Change your vote"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={`fas fa-star ${
                        star <= userVote ? 'text-yellow-500' : 'text-gray-300'
                      }`}
                      style={{ fontSize: '14px' }}
                    ></i>
                  ))}
                </div>
              ) : (
                <button
                  className="px-3 py-1.5 rounded-lg font-medium text-xs bg-orange-500 text-white hover:bg-orange-600 animate-pulse transition-all"
                >
                  VOTE NOW
                </button>
              )}
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

          {/* Voting Controls or Status Actions */}
          {voteCount >= memberCount ? (
            // All votes received - show status action buttons
            <div className="space-y-3">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-1">
                  <i className="fas fa-check-circle text-green-500 mr-2"></i>
                  All votes received
                </p>
                <p className="text-xs text-muted-foreground">
                  Move this song to the next stage
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => statusMutation.mutate('practice')}
                  disabled={statusMutation.isPending}
                  className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-guitar block mb-1"></i>
                  Practice
                </button>
                <button
                  onClick={() => statusMutation.mutate('parked')}
                  disabled={statusMutation.isPending}
                  className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-pause-circle block mb-1"></i>
                  Park
                </button>
                <button
                  onClick={() => statusMutation.mutate('discarded')}
                  disabled={statusMutation.isPending}
                  className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-times-circle block mb-1"></i>
                  Discard
                </button>
              </div>

              <button
                onClick={onToggleExpand}
                className="w-full px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            // Still collecting votes - show voting controls
            <>
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
                {isSuggester && (
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-trash mr-2"></i>
                    {deleteMutation.isPending ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
