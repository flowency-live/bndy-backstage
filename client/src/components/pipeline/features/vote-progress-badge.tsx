interface VoteProgressBadgeProps {
  voteCount: number;
  memberCount: number;
  userHasVoted: boolean;
  scorePercentage?: number;
}

export default function VoteProgressBadge({
  voteCount,
  memberCount,
  userHasVoted,
  scorePercentage
}: VoteProgressBadgeProps) {
  const isComplete = voteCount >= memberCount;
  const isHighScore = scorePercentage !== undefined && scorePercentage >= 80;

  return (
    <div className="flex items-center gap-2">
      {!isComplete && (
        <span className="text-lg">⏳</span>
      )}
      {isComplete && isHighScore && (
        <span className="text-lg">🚀</span>
      )}
      <span className={`text-sm font-medium ${
        userHasVoted ? 'text-green-500' : 'text-orange-500'
      }`}>
        {voteCount}/{memberCount} votes
      </span>
      {isComplete && scorePercentage !== undefined && (
        <span className="text-sm font-medium text-foreground">
          ({scorePercentage}%)
        </span>
      )}
      {userHasVoted && !isComplete && (
        <span className="text-green-500 text-sm">✓ You voted</span>
      )}
    </div>
  );
}
