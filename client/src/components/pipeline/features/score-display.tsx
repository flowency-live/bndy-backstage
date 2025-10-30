interface ScoreDisplayProps {
  score: number;
  voteCount: number;
  zeroVoteCount: number;
}

export default function ScoreDisplay({ score, voteCount, zeroVoteCount }: ScoreDisplayProps) {
  const isHighScore = score >= 85;

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
