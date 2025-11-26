import { format } from 'date-fns';
import type { Event } from '@/types/api';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface UnavailabilityPopupProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  unavailabilityEvents: Event[];
  currentUserId?: string;
  onEditUserUnavailability?: (event: Event) => void;
}

export function UnavailabilityPopup({
  isOpen,
  onClose,
  date,
  unavailabilityEvents,
  currentUserId,
  onEditUserUnavailability,
}: UnavailabilityPopupProps) {
  const formattedDate = format(date, 'MMMM d, yyyy');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]" onClick={(e) => e.stopPropagation()}>
        <SheetHeader>
          <SheetTitle className="text-red-600 dark:text-red-400">
            Members Unavailable
          </SheetTitle>
          <SheetDescription>{formattedDate}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {unavailabilityEvents.map((event) => {
            const isCurrentUser = event.ownerUserId === currentUserId;
            const hasRecurring = !!event.recurring;

            return (
              <div
                key={event.id}
                className={`p-3 rounded-lg border ${
                  isCurrentUser
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800'
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {event.displayName || 'Unknown Member'}
                    </span>
                    {hasRecurring && (
                      <i
                        className="fas fa-repeat text-xs text-muted-foreground"
                        title="Recurring unavailability"
                      ></i>
                    )}
                  </div>

                  {isCurrentUser && onEditUserUnavailability && (
                    <button
                      onClick={() => onEditUserUnavailability(event)}
                      className="text-xs px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {event.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.notes}
                  </p>
                )}

                {isCurrentUser && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Your unavailability
                  </p>
                )}
              </div>
            );
          })}

          {unavailabilityEvents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No unavailability on this date
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
