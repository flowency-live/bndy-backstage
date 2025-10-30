interface RagStatusControlsProps {
  currentStatus: 'RED' | 'AMBER' | 'GREEN' | null;
  onChange: (status: 'RED' | 'AMBER' | 'GREEN') => void;
}

export default function RagStatusControls({ currentStatus, onChange }: RagStatusControlsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        How ready are you to perform this?
      </p>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onChange('RED')}
          className={`
            p-4 rounded-lg transition-all flex flex-col items-center gap-2
            ${currentStatus === 'RED'
              ? 'bg-red-500/30 ring-2 ring-red-500'
              : 'bg-red-500/10 hover:bg-red-500/20'
            }
          `}
        >
          <i className="fas fa-ban text-red-500 text-2xl"></i>
          <span className="text-xs font-medium text-red-500">Not Ready</span>
        </button>

        <button
          onClick={() => onChange('AMBER')}
          className={`
            p-4 rounded-lg transition-all flex flex-col items-center gap-2
            ${currentStatus === 'AMBER'
              ? 'bg-amber-500/30 ring-2 ring-amber-500'
              : 'bg-amber-500/10 hover:bg-amber-500/20'
            }
          `}
        >
          <i className="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
          <span className="text-xs font-medium text-amber-500">Getting There</span>
        </button>

        <button
          onClick={() => onChange('GREEN')}
          className={`
            p-4 rounded-lg transition-all flex flex-col items-center gap-2
            ${currentStatus === 'GREEN'
              ? 'bg-green-500/30 ring-2 ring-green-500'
              : 'bg-green-500/10 hover:bg-green-500/20'
            }
          `}
        >
          <i className="fas fa-check-circle text-green-500 text-2xl"></i>
          <span className="text-xs font-medium text-green-500">Ready!</span>
        </button>
      </div>
    </div>
  );
}
