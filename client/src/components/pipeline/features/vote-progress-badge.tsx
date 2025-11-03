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
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-semibold ${
        userHasVoted ? 'text-green-500' : 'text-orange-500'
      }`}>
        {voteCount}/{memberCount}
      </span>
      {isComplete && scorePercentage !== undefined && (
        <span className="text-xs font-medium text-muted-foreground">
          {scorePercentage}%
        </span>
      )}
      {isComplete && isHighScore && (
        <span className="text-base animate-bounce">⭐</span>
      )}
    </div>
  );
}
