// DateTimeStep - Calendar and time pickers for gig scheduling
import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DatePickerModal from '@/components/date-picker-modal';
import TimePickerModal from '@/components/time-picker-modal';
import type { PublicGigFormData } from '@/components/public-gig-wizard';

interface DateTimeStepProps {
  formData: PublicGigFormData;
  onUpdate: (data: Partial<PublicGigFormData>) => void;
}

export default function DateTimeStep({ formData, onUpdate }: DateTimeStepProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end' | 'doors'>('start');

  const formatTime = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  const openTimePicker = (type: 'start' | 'end' | 'doors') => {
    setTimePickerType(type);
    setShowTimePicker(true);
  };

  const handleTimeSelect = (time: string) => {
    if (timePickerType === 'start') {
      onUpdate({ startTime: time });
    } else if (timePickerType === 'end') {
      onUpdate({ endTime: time });
    } else {
      onUpdate({ doorsTime: time });
    }
    setShowTimePicker(false);
  };

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-3">
          Gig Date *
        </label>
        <button
          type="button"
          onClick={() => setShowDatePicker(true)}
          className="w-full min-h-[56px] md:min-h-[44px] p-4 border-2 border-input rounded-xl text-left bg-background hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 transition-colors relative flex items-center gap-3"
        >
          <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <span className="text-base">
            {formData.date
              ? format(new Date(formData.date + 'T00:00:00'), 'EEEE, dd MMMM yyyy')
              : 'Select date'}
          </span>
        </button>
      </div>

      {/* Time Selection Grid */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-foreground">
          Times *
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Doors Time (Optional) */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">
              Doors Open (Optional)
            </label>
            <button
              type="button"
              onClick={() => openTimePicker('doors')}
              className="w-full min-h-[56px] md:min-h-[44px] p-3 border border-input rounded-xl text-left bg-background hover:border-primary focus:border-primary transition-colors relative flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">
                {formData.doorsTime ? formatTime(formData.doorsTime) : 'Not set'}
              </span>
            </button>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">
              Start Time *
            </label>
            <button
              type="button"
              onClick={() => openTimePicker('start')}
              className="w-full min-h-[56px] md:min-h-[44px] p-3 border-2 border-input rounded-xl text-left bg-background hover:border-primary focus:border-primary transition-colors relative flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">
                {formData.startTime ? formatTime(formData.startTime) : 'Select time'}
              </span>
            </button>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">
              End Time *
            </label>
            <button
              type="button"
              onClick={() => openTimePicker('end')}
              className="w-full min-h-[56px] md:min-h-[44px] p-3 border-2 border-input rounded-xl text-left bg-background hover:border-primary focus:border-primary transition-colors relative flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">
                {formData.endTime ? formatTime(formData.endTime) : 'Select time'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Duration Display (if both times set) */}
      {formData.startTime && formData.endTime && (
        <div className="bg-accent/50 rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-semibold text-foreground">
              {(() => {
                const [startHour, startMin] = formData.startTime.split(':').map(Number);
                const [endHour, endMin] = formData.endTime.split(':').map(Number);
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;
                const duration = endMinutes - startMinutes;
                const hours = Math.floor(duration / 60);
                const minutes = duration % 60;

                if (duration < 0) {
                  return 'End time must be after start time';
                }

                return hours > 0
                  ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
                  : `${minutes}m`;
              })()}
            </span>
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
        <p className="font-medium mb-2">💡 Tip</p>
        <ul className="space-y-1 text-xs">
          <li>• <strong>Doors time</strong> is when the venue opens (optional)</li>
          <li>• <strong>Start time</strong> is when your set begins</li>
          <li>• <strong>End time</strong> is when your set finishes</li>
        </ul>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DatePickerModal
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          selectedDate={formData.date}
          onSelectDate={(date) => {
            onUpdate({ date });
            setShowDatePicker(false);
          }}
          title="Select Gig Date"
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <TimePickerModal
          isOpen={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          selectedTime={
            timePickerType === 'start'
              ? formData.startTime
              : timePickerType === 'end'
              ? formData.endTime
              : formData.doorsTime
          }
          onSelectTime={handleTimeSelect}
          title={`Select ${
            timePickerType === 'start'
              ? 'Start'
              : timePickerType === 'end'
              ? 'End'
              : 'Doors'
          } Time`}
        />
      )}
    </div>
  );
}
