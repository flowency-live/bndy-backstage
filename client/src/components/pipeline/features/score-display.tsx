interface ScoreDisplayProps {
  score: number;
  voteCount: number;
  zeroVoteCount: number;
  hasDisagreement?: boolean;
  votes?: Record<string, { value: number; updated_at: string }>;
}

export default function ScoreDisplay({ score, voteCount, zeroVoteCount, hasDisagreement, votes }: ScoreDisplayProps) {
  const isHighScore = score >= 85;

  // Extract individual vote values
  const voteValues = votes ? Object.values(votes).map(v => v.value).sort((a, b) => b - a) : [];

  return (
    <div className="text-center py-6">
      {/* Score */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className={`text-5xl font-bold ${
          isHighScore ? 'text-yellow-500' : 'text-primary'
        }`}>
          {score}%
        </span>
        {isHighScore && (
          <span className="text-4xl animate-bounce">🔥</span>
        )}
      </div>

      {/* Vote Count */}
      <p className="text-sm text-muted-foreground mb-2">
        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
      </p>

      {/* Disagreement Flag and Vote Breakdown */}
      {hasDisagreement && voteValues.length > 0 && (
        <div className="mt-3 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-orange-500 mb-2">
            <i className="fas fa-exclamation-triangle"></i>
            <span className="text-sm font-semibold">Vote Disagreement</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Votes: {voteValues.join(', ')}
          </p>
        </div>
      )}

      {/* Zero Votes Warning */}
      {zeroVoteCount > 0 && (
        <div className="flex items-center justify-center gap-2 text-orange-500 mt-3">
          <span className="text-xl">💩</span>
          <span className="text-sm font-medium">
            {zeroVoteCount} {zeroVoteCount === 1 ? 'member' : 'members'} voted pass
          </span>
        </div>
      )}
    </div>
  );
}
