import { useState } from "react";

interface VotingControlsProps {
  currentVote: number | null;
  onVote: (value: number) => void;
}

export default function VotingControls({ currentVote, onVote }: VotingControlsProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground mb-2">
        Cast your vote:
      </div>

      {/* Poo Button (0 vote) */}
      <button
        onClick={() => onVote(0)}
        onMouseEnter={() => setHoveredValue(0)}
        onMouseLeave={() => setHoveredValue(null)}
        className={`
          w-full h-12 rounded-lg border-2 transition-all flex items-center justify-center gap-2
          ${currentVote === 0
            ? 'border-orange-500 bg-orange-500/20 text-orange-500'
            : 'border-border hover:border-orange-500/50 hover:bg-orange-500/10'
          }
        `}
      >
        <span className="text-2xl">💩</span>
        <span className="font-medium">Pass</span>
      </button>

      {/* Star Rating (1-5) */}
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((value) => {
          const isActive = currentVote !== null && currentVote >= value;
          const isHovered = hoveredValue !== null && hoveredValue >= value;
          const shouldHighlight = isActive || isHovered;

          return (
            <button
              key={value}
              onClick={() => onVote(value)}
              onMouseEnter={() => setHoveredValue(value)}
              onMouseLeave={() => setHoveredValue(null)}
              className="p-2 transition-transform hover:scale-110 active:scale-95"
            >
              <svg
                className={`w-10 h-10 transition-colors ${
                  shouldHighlight ? 'text-yellow-500' : 'text-muted-foreground'
                }`}
                fill={shouldHighlight ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Vote Labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>Meh</span>
        <span>Love it!</span>
      </div>
    </div>
  );
}
