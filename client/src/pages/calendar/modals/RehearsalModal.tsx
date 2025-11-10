import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Music, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DatePickerModal from '@/components/date-picker-modal';
import TimePickerModal from '@/components/time-picker-modal';
import { RecurringControls, type RecurringValue } from './RecurringControls';
import { apiRequest } from '@/lib/queryClient';
import type { Event } from '@/types/api';

interface RehearsalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  artistId: string;
  event?: Event | null;
  selectedDate?: string;
}

/**
 * Rehearsal event modal with recurring support
 * Integrates RecurringControls for pattern selection
 * Orange theme for rehearsal events
 */
export function RehearsalModal({
  isOpen,
  onClose,
  onSuccess,
  artistId,
  event,
  selectedDate,
}: RehearsalModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState<RecurringValue>({
    type: 'none',
    interval: 1,
    duration: 'forever',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!event;

  // Initialize form with event data or selected date
  useEffect(() => {
    if (event) {
      setTitle(event.title || 'Rehearsal');
      setDate(event.date);
      setStartTime(event.startTime || '');
      setEndTime(event.endTime || '');
      setLocation(event.location || '');
      setNotes(event.notes || '');

      // Load recurring data if present
      const eventRecurring = (event as any).recurring;
      if (eventRecurring) {
        setRecurring({
          type: eventRecurring.type || 'none',
          interval: eventRecurring.interval || 1,
          duration: eventRecurring.duration || 'forever',
          count: eventRecurring.count,
          until: eventRecurring.until,
        });
      }
    } else if (selectedDate) {
      setDate(selectedDate);
      setTitle('Rehearsal');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setTitle('Rehearsal');
    }
  }, [event, selectedDate]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setLocation('');
      setNotes('');
      setRecurring({
        type: 'none',
        interval: 1,
        duration: 'forever',
      });
      setError(null);
    }
  }, [isOpen]);

  // Format time for display - COPIED from date-time-step.tsx
  const formatTime = (time?: string) => {
    if (!time) return null;
    if (time === '00:00') return 'Midnight';
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!date) {
      setError('Please select a date');
      return;
    }

    setIsSubmitting(true);

    try {
      const eventData: any = {
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        type: 'rehearsal',
        artistId,
      };

      // Add recurring data if pattern is not 'none'
      if (recurring.type !== 'none') {
        eventData.recurring = {
          type: recurring.type,
          interval: recurring.interval,
          duration: recurring.duration,
          ...(recurring.duration === 'count' && { count: recurring.count }),
          ...(recurring.duration === 'until' && { until: recurring.until }),
        };
      }

      if (isEditMode && event) {
        // Update existing event
        await apiRequest(`/events/${event.id}`, {
          method: 'PUT',
          body: JSON.stringify(eventData),
        });
      } else {
        // Create new event
        await apiRequest('/events', {
          method: 'POST',
          body: JSON.stringify(eventData),
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save rehearsal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-background rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              <Music className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-sans font-bold text-white">
                {isEditMode ? 'Edit Rehearsal' : 'New Rehearsal'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Rehearsal title"
                className="w-full"
                autoFocus
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background hover:border-orange-500 transition-colors text-left"
              >
                {date
                  ? format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
                  : 'Select date'}
              </button>
            </div>

            {/* Time - COPIED from date-time-step.tsx */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Time
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTimePickerType('start');
                    setShowTimePicker(true);
                  }}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background hover:border-orange-500 transition-colors text-left flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {startTime ? formatTime(startTime) : 'Select time'}
                  </span>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  End Time
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTimePickerType('end');
                    setShowTimePicker(true);
                  }}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background hover:border-orange-500 transition-colors text-left flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {endTime ? formatTime(endTime) : 'Select time'}
                  </span>
                </button>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Location
              </label>
              <Input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where are you rehearsing?"
                className="w-full"
              />
            </div>

            {/* Recurring Controls */}
            <RecurringControls
              value={recurring}
              onChange={setRecurring}
              accentColor="orange"
              referenceDate={date}
            />

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Setlist, equipment, or other notes..."
                rows={3}
                className="w-full resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-input bg-background hover:bg-accent transition-colors font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(selectedDate) => {
          setDate(selectedDate);
          setShowDatePicker(false);
        }}
        selectedDate={date}
        title="Select rehearsal date"
      />

      {/* Time Picker Modal - COPIED from date-time-step.tsx */}
      <TimePickerModal
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        selectedTime={timePickerType === 'start' ? startTime : endTime}
        onSelectTime={(time) => {
          if (timePickerType === 'start') {
            setStartTime(time);
          } else {
            setEndTime(time);
          }
          setShowTimePicker(false);
        }}
        title={timePickerType === 'start' ? 'Select start time' : 'Select end time'}
      />
    </>
  );
}
