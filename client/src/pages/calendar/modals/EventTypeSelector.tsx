import { Calendar, Music, Ban, MoreHorizontal } from 'lucide-react';
import { useUser } from '@/lib/user-context';

interface EventTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'gig' | 'rehearsal' | 'unavailable' | 'other') => void;
  selectedDate?: string;
}

// Event type configuration - COPIED from event-modal.tsx
const EVENT_TYPE_CONFIG = {
  gig: { label: 'Gig', icon: '🎤', color: '#f97316' },
  rehearsal: { label: 'Rehearsal', icon: '🎵', color: '#f97316' },
  unavailable: { label: 'Unavailable', icon: '🚫', color: 'hsl(0, 84%, 60%)' },
  other: { label: 'Other', icon: '📅', color: '#64748b' },
};

/**
 * Event type selector modal
 * Provides 4-button grid for selecting event type to create
 * Routes to appropriate modal based on selection
 * COPIED styling from event-modal.tsx lines 335-366
 */
export function EventTypeSelector({
  isOpen,
  onClose,
  onSelectType,
  selectedDate,
}: EventTypeSelectorProps) {
  const { isStealthMode } = useUser();

  if (!isOpen) return null;

  const handleSelect = (type: 'gig' | 'rehearsal' | 'unavailable' | 'other') => {
    onSelectType(type);
    onClose();
  };

  // In stealth mode, only allow gig creation
  const availableTypes = isStealthMode
    ? (['gig'] as const)
    : (['gig', 'rehearsal', 'unavailable', 'other'] as const);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-sans font-bold text-foreground">
            What are you adding?
          </h2>
          {selectedDate && (
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          )}
        </div>

        {/* Event Type Selection - COPIED from event-modal.tsx lines 335-366 */}
        <div className={`grid ${isStealthMode ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-4`}>
          {availableTypes.map((type) => {
            const config = EVENT_TYPE_CONFIG[type];

            return (
              <button
                key={type}
                type="button"
                onClick={() => handleSelect(type)}
                className="p-3 rounded-lg border-2 border-border hover:border-border/80 hover:shadow-sm text-center transition-all duration-200"
                data-testid={`button-event-type-${type}`}
              >
                <div className="text-xl mb-1">{config.icon}</div>
                <div className="text-xs font-sans font-semibold text-muted-foreground">{config.label}</div>
              </button>
            );
          })}
        </div>

        {isStealthMode && (
          <p className="text-xs text-muted-foreground mb-4 px-2">
            Platform admins can only create gig events in stealth mode.
          </p>
        )}

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl border border-input bg-background hover:bg-accent transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
