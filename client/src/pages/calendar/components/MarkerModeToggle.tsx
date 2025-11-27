interface MarkerModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export function MarkerModeToggle({ isActive, onToggle }: MarkerModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2
        ${isActive
          ? 'bg-blue-500 text-white hover:bg-blue-600'
          : 'bg-muted hover:bg-accent text-foreground'
        }
      `}
      title={isActive ? 'Exit marker mode' : 'Enter marker mode to mark available days'}
    >
      <i className="fas fa-calendar-check"></i>
      <span>{isActive ? 'Marker Mode Active' : 'Mark Availability'}</span>
    </button>
  );
}
