interface VoteProgressBadgeProps {
  voteCount: number;
  memberCount: number;
  userHasVoted: boolean;
}

export default function VoteProgressBadge({
  voteCount,
  memberCount,
  userHasVoted
}: VoteProgressBadgeProps) {
  const isComplete = voteCount >= memberCount;

  return (
    <div className="flex items-center gap-2">
      {!isComplete && (
        <span className="text-lg">⏳</span>
      )}
      <span className={`text-sm font-medium ${
        userHasVoted ? 'text-green-500' : 'text-orange-500'
      }`}>
        {voteCount}/{memberCount} votes
      </span>
      {userHasVoted && !isComplete && (
        <span className="text-green-500 text-sm">✓ You voted</span>
      )}
    </div>
  );
}
