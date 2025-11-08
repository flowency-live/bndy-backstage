import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import DateRangePickerModal from '@/components/date-range-picker-modal';
import { RecurringControls, type RecurringValue } from './RecurringControls';

interface UnavailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  userDisplayName: string;
  userId: string;
  artistId?: string;
}

/**
 * Unavailability modal with recurring support
 * Refactored to use RecurringControls component
 * Red/Pink theme for unavailability events
 */
export default function UnavailabilityModal({
  isOpen,
  onClose,
  selectedDate,
  userDisplayName,
  userId,
  artistId,
}: UnavailabilityModalProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState<RecurringValue>({
    type: 'none',
    interval: 1,
    duration: 'forever',
  });

  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  useEffect(() => {
    setStartDate(selectedDate);
    setEndDate(undefined);
    setNotes('');
    setRecurring({
      type: 'none',
      interval: 1,
      duration: 'forever',
    });
  }, [selectedDate, isOpen]);

  const createUnavailabilityMutation = useMutation({
    mutationFn: async (data: {
      date: string;
      endDate?: string;
      notes?: string;
      recurring?: any;
    }) => {
      return apiRequest('POST', `https://api.bndy.co.uk/api/users/me/unavailability`, {
        type: 'unavailable',
        date: data.date,
        endDate: data.endDate,
        notes: data.notes,
        recurring: data.recurring,
        isAllDay: true,
      });
    },
    onSuccess: () => {
      if (artistId) {
        queryClient.invalidateQueries({ queryKey: ['/api/artists', artistId, 'events'] });
        queryClient.invalidateQueries({ queryKey: ['/api/artists', artistId, 'calendar'] });
      }
      toast({
        title: 'Unavailability marked',
        description:
          recurring.type !== 'none'
            ? 'Recurring unavailability saved'
            : 'Date(s) marked unavailable',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark unavailability',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }

    // Build recurring object if not "none"
    let recurringData = undefined;
    if (recurring.type !== 'none') {
      recurringData = {
        type: recurring.type,
        interval: recurring.interval,
        duration: recurring.duration,
        ...(recurring.duration === 'count' && { count: recurring.count }),
        ...(recurring.duration === 'until' && { until: recurring.until }),
      };
    }

    createUnavailabilityMutation.mutate({
      date: startDate,
      endDate: endDate && endDate !== startDate ? endDate : undefined,
      notes: notes.trim() || undefined,
      recurring: recurringData,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
          {/* Header - Red/Pink themed */}
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Ban className="w-6 h-6" />
                <h3 className="text-2xl font-serif">{userDisplayName} Unavailable</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white/90 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">
                Dates
              </label>
              <button
                type="button"
                onClick={() => setShowDateRangePicker(true)}
                className="w-full p-3 border border-input rounded-xl text-left bg-background text-foreground hover:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 relative transition-colors"
              >
                <span>
                  {startDate ? (
                    endDate && endDate !== startDate ? (
                      `${format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy')} - ${format(new Date(endDate + 'T00:00:00'), 'dd/MM/yyyy')}`
                    ) : (
                      format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy')
                    )
                  ) : (
                    'Select dates'
                  )}
                </span>
                <i className="fas fa-calendar-alt absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
              </button>
            </div>

            {/* Recurring Controls */}
            <RecurringControls
              value={recurring}
              onChange={setRecurring}
              accentColor="red"
              referenceDate={startDate}
            />

            {/* Notes */}
            <div>
              <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">
                Notes (Optional)
              </label>
              <Textarea
                placeholder="Reason or additional details..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUnavailabilityMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0"
              >
                {createUnavailabilityMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Mark Unavailable'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Date Range Picker Modal */}
      <DateRangePickerModal
        isOpen={showDateRangePicker}
        onClose={() => setShowDateRangePicker(false)}
        onDateRangeSelect={(start, end) => {
          setStartDate(start);
          setEndDate(start === end ? undefined : end);
        }}
        initialDate={startDate}
      />
    </>
  );
}
