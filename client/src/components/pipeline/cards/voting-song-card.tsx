import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import VotingControls from "../features/voting-controls";
import VoteProgressBadge from "../features/vote-progress-badge";
import MemberVotesReveal from "../features/member-votes-reveal";
import { artistsService } from "@/lib/services/artists-service";
import type { ArtistMembership } from "@/types/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PipelineSong {
  id: string;
  artist_id: string;
  song_id: string;
  status: string;
  votes: Record<string, { value: number; updated_at: string }>;
  voting_scale?: 3 | 5;  // 3 for new songs, 5 for legacy (defaults to 5 if undefined)
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
  memberships?: ArtistMembership[];
  showMemberVotes?: boolean;
  dimmed?: boolean;
}

export default function VotingSongCard({
  song,
  userId,
  memberCount,
  isExpanded,
  onToggleExpand,
  memberships = [],
  showMemberVotes = false,
  dimmed = false
}: VotingSongCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const userVote = song.votes?.[userId]?.value ?? null;
  const voteCount = Object.keys(song.votes || {}).length;
  const userHasVoted = userVote !== null;
  // Detect actual scale from vote values - if any vote > 3, song was voted with 5-star scale
  const voteValues = Object.values(song.votes || {}).map((v: any) => (v && typeof v.value === 'number') ? v.value : 0);
  const maxVoteValue = voteValues.length > 0 ? Math.max(...voteValues) : 0;
  const votingScale = song.voting_scale || (maxVoteValue > 3 ? 5 : 3);

  // Check if anyone voted 0 (poop/pass)
  const hasZeroVote = Object.values(song.votes || {}).some((vote: any) => vote.value === 0);

  // Calculate score percentage using the song's voting scale
  const totalScore = Object.values(song.votes || {}).reduce(
    (sum, vote: any) => sum + (vote.value || 0),
    0
  );
  const maxScore = memberCount * votingScale;
  const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const voteMutation = useMutation({
    mutationFn: async (voteValue: number) => {
      return await artistsService.votePipelineSong(song.artist_id, song.id, voteValue);
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
      return await artistsService.deletePipelineSong(song.artist_id, song.id);
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
      return await artistsService.updatePipelineStatus(song.artist_id, song.id, newStatus);
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
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  const isSuggester = song.suggested_by_user_id === userId;

  return (
    <div className={`bg-card rounded-lg overflow-hidden border transition-all duration-200 ${
      isExpanded
        ? 'border-primary shadow-lg ring-2 ring-primary/20 relative z-10'
        : dimmed
          ? 'border-border opacity-40 blur-[1px] pointer-events-none'
          : 'border-border hover:shadow-md hover:-translate-y-0.5'
    }`}>
      {/* Collapsed Card - edge-to-edge layout like playbook */}
      <div
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={!isExpanded ? onToggleExpand : undefined}
      >
        <div className="flex items-center">
          {/* Album Art - flush to left edge */}
          <div className="w-12 h-12 flex-shrink-0 relative group overflow-hidden">
            {song.globalSong.thumbnail_url ? (
              <>
                <img
                  src={song.globalSong.thumbnail_url}
                  alt={song.globalSong.title}
                  className="w-full h-full object-cover"
                />
                {/* Play icon overlay - always visible */}
                {song.globalSong.spotify_url && (
                  <a
                    href={song.globalSong.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-all"
                    title="Open in Spotify"
                  >
                    <i className="fas fa-play text-white text-lg drop-shadow-lg"></i>
                  </a>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <i className="fas fa-music text-muted-foreground text-sm"></i>
              </div>
            )}
          </div>

          {/* Song Info - ensure readable width */}
          <div className="flex-1 min-w-0 px-3 py-2">
            <h3 className="font-semibold text-sm text-foreground truncate tracking-tight">
              {song.globalSong.title}
            </h3>
            <p className="text-xs text-muted-foreground/80 truncate">
              {song.globalSong.artist_name}
            </p>
          </div>

          {/* Vote Status & Chevron */}
          <div className="flex items-center gap-1 pr-2 flex-shrink-0">
            {/* Vote status badges - only when collapsed */}
            {!isExpanded && (
              <>
                {/* User's vote stars (compact) */}
                {userHasVoted && userVote !== 0 && (
                  <div className="flex gap-0.5" title="Your vote">
                    {Array.from({ length: votingScale }, (_, i) => i + 1).map((star) => (
                      <i
                        key={star}
                        className={`fas fa-star text-[10px] ${
                          star <= userVote ? 'text-yellow-500' : 'text-gray-300'
                        }`}
                      ></i>
                    ))}
                  </div>
                )}
                {userHasVoted && userVote === 0 && (
                  <span className="text-sm" title="You passed">💩</span>
                )}
                {hasZeroVote && voteCount >= memberCount && !userHasVoted && (
                  <span className="text-sm" title="Someone passed">💩</span>
                )}

                {/* Vote progress badge with score % and rocket/star icons */}
                <VoteProgressBadge
                  voteCount={voteCount}
                  memberCount={memberCount}
                  userHasVoted={userHasVoted}
                  scorePercentage={voteCount >= memberCount && !hasZeroVote ? scorePercentage : undefined}
                />

                {/* Action needed indicator */}
                {!userHasVoted && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" title="Vote needed" />
                )}
              </>
            )}

            {/* Chevron - ALWAYS visible for expand/collapse */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="p-1 hover:bg-muted rounded"
            >
              <i className={`fas fa-chevron-down text-muted-foreground text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30 overflow-hidden animate-expand">
          <div className="p-4 space-y-4 animate-fade-in-up">
          {/* Skip to Practice button - top right */}
          <div className="flex justify-end -mt-2 -mr-2">
            <button
              onClick={() => statusMutation.mutate('practice')}
              disabled={statusMutation.isPending}
              className="p-2 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50"
              title="Skip to Practice"
            >
              <i className="fas fa-forward"></i>
            </button>
          </div>

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

              {/* Member Votes Reveal - only shown if artist setting enabled */}
              {showMemberVotes && memberships.length > 0 && (
                <MemberVotesReveal
                  votes={song.votes}
                  memberships={memberships}
                  votingScale={votingScale as 3 | 5}
                  currentUserId={userId}
                  showPendingOnly={false}
                />
              )}

              <div className="grid grid-cols-3 gap-2">
                {/* Practice = Primary action */}
                <button
                  onClick={() => statusMutation.mutate('practice')}
                  disabled={statusMutation.isPending}
                  className="px-3 py-2 rounded-lg bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-guitar block mb-1"></i>
                  Practice
                </button>
                {/* Park = Secondary */}
                <button
                  onClick={() => statusMutation.mutate('parked')}
                  disabled={statusMutation.isPending}
                  className="px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-500 font-medium text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-pause-circle block mb-1"></i>
                  Park
                </button>
                {/* Discard = Tertiary */}
                <button
                  onClick={() => statusMutation.mutate('discarded')}
                  disabled={statusMutation.isPending}
                  className="px-3 py-2 rounded-lg bg-muted text-muted-foreground font-medium text-sm hover:bg-muted/80 transition-colors disabled:opacity-50"
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
                maxStars={votingScale as 3 | 5}
              />

              {/* Member Votes Reveal - during voting phase */}
              {showMemberVotes && memberships.length > 0 && (
                <MemberVotesReveal
                  votes={song.votes}
                  memberships={memberships}
                  votingScale={votingScale as 3 | 5}
                  currentUserId={userId}
                  showPendingOnly={!userHasVoted}
                />
              )}

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
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this suggestion? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
