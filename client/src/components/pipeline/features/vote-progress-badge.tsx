interface VoteProgressBadgeProps {
  voteCount: number;
  memberCount: number;
  userHasVoted: boolean;
  scorePercentage?: number;
}

function ScoreIcon({ score }: { score: number }) {
  if (score >= 100) {
    // 100%: Shaking rocket
    return <span className="text-base inline-block animate-shake">🚀</span>;
  }

  if (score >= 90) {
    // 90-99%: Bouncy star
    return <span className="text-base animate-bounce">⭐</span>;
  }

  if (score >= 80) {
    // 80-89%: Star with exclamation (good but needs discussion)
    return (
      <span className="text-base relative inline-block">
        ⭐
        <span className="absolute -top-0.5 -right-1.5 text-[10px] font-bold text-orange-500">!</span>
      </span>
    );
  }

  return null;
}

export default function VoteProgressBadge({
  voteCount,
  memberCount,
  userHasVoted,
  scorePercentage
}: VoteProgressBadgeProps) {
  const isComplete = voteCount >= memberCount;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-semibold ${
        userHasVoted ? 'text-green-500' : 'text-orange-500'
      }`}>
        {voteCount}/{memberCount}
      </span>
      {isComplete && scorePercentage !== undefined && (
        <>
          <span className="text-xs font-medium text-muted-foreground">
            {scorePercentage}%
          </span>
          <ScoreIcon score={scorePercentage} />
        </>
      )}
    </div>
  );
}
