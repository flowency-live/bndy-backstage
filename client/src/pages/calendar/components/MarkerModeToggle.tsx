import { Button } from '@/components/ui/button';

interface MarkerModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export function MarkerModeToggle({ isActive, onToggle }: MarkerModeToggleProps) {
  return (
    <Button
      onClick={onToggle}
      variant={isActive ? "default" : "outline"}
      size="sm"
      className={`gap-1 md:gap-2 h-8 px-2 md:px-3 ${
        isActive
          ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white'
          : ''
      }`}
      title={isActive ? 'Exit marker mode' : 'Enter marker mode to mark available days'}
    >
      <i className="fas fa-calendar-check text-xs md:text-sm"></i>
      <span className="hidden lg:inline">{isActive ? 'Marker Mode Active' : 'Mark Availability'}</span>
    </Button>
  );
}
