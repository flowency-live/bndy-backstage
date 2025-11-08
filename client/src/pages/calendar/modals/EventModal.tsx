import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DatePickerModal from '@/components/date-picker-modal';
import { apiRequest } from '@/services/api';
import type { Event } from '@/types/api';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  artistId: string;
  event?: Event | null;
  selectedDate?: string;
}

/**
 * Simple event modal for "Other" type events
 * No recurring support - single events only
 * Used for miscellaneous calendar entries
 */
export function EventModal({
  isOpen,
  onClose,
  onSuccess,
  artistId,
  event,
  selectedDate,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!event;

  // Initialize form with event data or selected date
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDate(event.date);
      setStartTime(event.startTime || '');
      setEndTime(event.endTime || '');
      setLocation(event.location || '');
      setNotes(event.notes || '');
    } else if (selectedDate) {
      setDate(selectedDate);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
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
      setError(null);
    }
  }, [isOpen]);

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
      const eventData = {
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        type: 'other',
        artistId,
      };

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
      setError(err.message || 'Failed to save event');
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
          <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-sans font-bold text-foreground">
              {isEditMode ? 'Edit Event' : 'New Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
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
                placeholder="What's happening?"
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
                className="w-full px-4 py-2 border border-input rounded-lg bg-background hover:border-slate-500 transition-colors text-left"
              >
                {date
                  ? format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
                  : 'Select date'}
              </button>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Time
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  End Time
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full"
                />
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
                placeholder="Where?"
                className="w-full"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                rows={4}
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
                className="flex-1 py-3 px-4 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        title="Select date"
      />
    </>
  );
}
