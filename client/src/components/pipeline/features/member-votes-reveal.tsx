import { useState } from "react";
import type { ArtistMembership } from "@/types/api";

interface MemberVotesRevealProps {
  votes: Record<string, { value: number; updated_at: string }>;
  memberships: ArtistMembership[];
  votingScale: 3 | 5;
}

export default function MemberVotesReveal({ votes, memberships, votingScale }: MemberVotesRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  // Create a map of user IDs to display names
  const memberNameMap = memberships.reduce((acc, m) => {
    const userId = m.user_id;
    const displayName = m.resolved_display_name || m.display_name || m.displayName || 'Unknown';
    acc[userId] = displayName;
    return acc;
  }, {} as Record<string, string>);

  const voteEntries = Object.entries(votes).map(([userId, vote]) => ({
    userId,
    displayName: memberNameMap[userId] || 'Unknown member',
    value: vote.value,
    updatedAt: vote.updated_at
  }));

  // Sort by vote value descending (highest first)
  voteEntries.sort((a, b) => b.value - a.value);

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
        {voteEntries.map(({ userId, displayName, value }) => (
          <div
            key={userId}
            className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded"
          >
            <span className="text-sm text-foreground">{displayName}</span>
            <div className="flex items-center gap-1">
              {value === 0 ? (
                <span className="text-lg" title="Pass">💩</span>
              ) : (
                <div className="flex gap-0.5">
                  {Array.from({ length: votingScale }, (_, i) => i + 1).map((star) => (
                    <i
                      key={star}
                      className={`fas fa-star ${
                        star <= value ? 'text-yellow-500' : 'text-gray-300'
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
