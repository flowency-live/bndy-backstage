import { format } from 'date-fns';
import type { Event } from '@/types/api';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AvailabilityPopupProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  availabilityEvents: Event[];
  onEditAvailability?: (event: Event) => void;
  onDeleteAvailability?: (event: Event) => void;
}

export function AvailabilityPopup({
  isOpen,
  onClose,
  date,
  availabilityEvents,
  onEditAvailability,
  onDeleteAvailability,
}: AvailabilityPopupProps) {
  const formattedDate = format(date, 'MMMM d, yyyy');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]" onClick={(e) => e.stopPropagation()}>
        <SheetHeader>
          <SheetTitle className="text-blue-600 dark:text-blue-400">
            Artist Available
          </SheetTitle>
          <SheetDescription>{formattedDate}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {availabilityEvents.map((event) => {
            return (
              <div
                key={event.id}
                className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      Marked Available
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {onEditAvailability && (
                      <button
                        onClick={() => onEditAvailability(event)}
                        className="text-xs px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {onDeleteAvailability && (
                      <button
                        onClick={() => onDeleteAvailability(event)}
                        className="text-xs px-3 py-1 rounded bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {event.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.notes}
                  </p>
                )}

                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Created {format(new Date(event.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
            );
          })}

          {availabilityEvents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No availability marked for this date
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
