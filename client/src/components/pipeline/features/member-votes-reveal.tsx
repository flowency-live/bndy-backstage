import { useState } from "react";
import type { ArtistMembership } from "@/types/api";

interface MemberVotesRevealProps {
  votes: Record<string, { value: number; updated_at: string }>;
  memberships: ArtistMembership[];
  votingScale: 3 | 5;
  currentUserId?: string;
  showPendingOnly?: boolean;
}

export default function MemberVotesReveal({
  votes,
  memberships,
  votingScale,
  currentUserId,
  showPendingOnly = false
}: MemberVotesRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  // Build full member list with vote status
  const memberVoteEntries = memberships.map(m => {
    const userId = m.user_id;
    const displayName = m.resolved_display_name || m.display_name || (m as any).displayName || 'Unknown';
    const vote = votes[userId];
    const hasVoted = vote !== undefined;

    return {
      userId,
      displayName,
      hasVoted,
      value: hasVoted ? vote.value : null,
      updatedAt: hasVoted ? vote.updated_at : null
    };
  });

  // Sort: voters first (by value desc), then non-voters
  memberVoteEntries.sort((a, b) => {
    if (a.hasVoted && !b.hasVoted) return -1;
    if (!a.hasVoted && b.hasVoted) return 1;
    if (a.hasVoted && b.hasVoted) return (b.value ?? 0) - (a.value ?? 0);
    return 0;
  });

  if (!isRevealed) {
    return (
      <button
        onClick={() => setIsRevealed(true)}
        className="w-full py-2 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <i className="fas fa-eye"></i>
        Show member votes
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Member Votes</span>
        <button
          onClick={() => setIsRevealed(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <i className="fas fa-eye-slash mr-1"></i>
          Hide
        </button>
      </div>
      <div className="space-y-1">
        {memberVoteEntries.map(({ userId, displayName, hasVoted, value }) => (
          <div
            key={userId}
            className={`flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded ${!hasVoted ? 'opacity-50' : ''}`}
          >
            <span className="text-sm text-foreground">{displayName}</span>
            <div className="flex items-center gap-1">
              {!hasVoted ? (
                <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                  <i className="fas fa-clock"></i>
                  Not yet voted
                </span>
              ) : showPendingOnly ? (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <i className="fas fa-check"></i>
                  Voted
                </span>
              ) : value === 0 ? (
                <span className="text-lg" title="Pass">💩</span>
              ) : (
                <div className="flex gap-0.5">
                  {Array.from({ length: votingScale }, (_, i) => i + 1).map((star) => (
                    <i
                      key={star}
                      className={`fas fa-star ${
                        star <= (value ?? 0) ? 'text-yellow-500' : 'text-gray-300'
                      }`}
                      style={{ fontSize: '12px' }}
                    ></i>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
