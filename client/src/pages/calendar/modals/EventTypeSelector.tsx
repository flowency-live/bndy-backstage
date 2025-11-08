import { Calendar, Music, Ban, MoreHorizontal } from 'lucide-react';

interface EventTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'gig' | 'rehearsal' | 'unavailable' | 'other') => void;
  selectedDate?: string;
}

/**
 * Event type selector modal
 * Provides 4-button grid for selecting event type to create
 * Routes to appropriate modal based on selection
 */
export function EventTypeSelector({
  isOpen,
  onClose,
  onSelectType,
  selectedDate,
}: EventTypeSelectorProps) {
  if (!isOpen) return null;

  const handleSelect = (type: 'gig' | 'rehearsal' | 'unavailable' | 'other') => {
    onSelectType(type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
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

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Gig */}
          <button
            onClick={() => handleSelect('gig')}
            className="group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-brand-accent to-brand-accent-dark hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex flex-col items-center text-white">
              <Calendar className="w-10 h-10 mb-3" />
              <span className="font-sans font-semibold text-lg">Gig</span>
            </div>
          </button>

          {/* Rehearsal */}
          <button
            onClick={() => handleSelect('rehearsal')}
            className="group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-orange-500 to-orange-600 hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex flex-col items-center text-white">
              <Music className="w-10 h-10 mb-3" />
              <span className="font-sans font-semibold text-lg">Rehearsal</span>
            </div>
          </button>

          {/* Unavailable */}
          <button
            onClick={() => handleSelect('unavailable')}
            className="group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-red-500 to-red-600 hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex flex-col items-center text-white">
              <Ban className="w-10 h-10 mb-3" />
              <span className="font-sans font-semibold text-lg">Unavailable</span>
            </div>
          </button>

          {/* Other */}
          <button
            onClick={() => handleSelect('other')}
            className="group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-slate-500 to-slate-600 hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex flex-col items-center text-white">
              <MoreHorizontal className="w-10 h-10 mb-3" />
              <span className="font-sans font-semibold text-lg">Other</span>
            </div>
          </button>
        </div>

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
