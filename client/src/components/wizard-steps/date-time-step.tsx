// DateTimeStep - Calendar and time pickers for gig scheduling
import { useState, useEffect } from 'react';
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
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');

  // Default start time to 9pm and end time to midnight if not set
  useEffect(() => {
    if (!formData.startTime) {
      onUpdate({ startTime: '21:00' });
    }
    if (!formData.endTime) {
      onUpdate({ endTime: '00:00' });
    }
  }, []);

  const formatTime = (time?: string) => {
    if (!time) return null;
    // Special display for midnight
    if (time === '00:00') {
      return 'Midnight';
    }
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  const openTimePicker = (type: 'start' | 'end') => {
    setTimePickerType(type);
    setShowTimePicker(true);
  };

  const handleTimeSelect = (time: string) => {
    if (timePickerType === 'start') {
      onUpdate({ startTime: time });
    } else {
      onUpdate({ endTime: time });
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
          className="w-full min-h-[56px] md:min-h-[44px] p-4 border-2 border-input rounded-xl text-left bg-background hover:border-orange-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 transition-colors relative flex items-center gap-3"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Start Time *
            </label>
            <button
              type="button"
              onClick={() => openTimePicker('start')}
              className="w-full min-h-[56px] md:min-h-[44px] p-4 border-2 border-input rounded-xl text-left bg-background hover:border-orange-500 focus:border-orange-500 transition-colors relative flex items-center gap-3"
            >
              <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="text-base font-medium">
                {formData.startTime ? formatTime(formData.startTime) : 'Select time'}
              </span>
            </button>
          </div>

          {/* End Time (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              End Time <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </label>
            <button
              type="button"
              onClick={() => openTimePicker('end')}
              className="w-full min-h-[56px] md:min-h-[44px] p-4 border-2 border-input rounded-xl text-left bg-background hover:border-orange-500 focus:border-orange-500 transition-colors relative flex items-center gap-3"
            >
              <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="text-base font-medium">
                {formData.endTime ? formatTime(formData.endTime) : 'Not set'}
              </span>
            </button>
          </div>
        </div>
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
            timePickerType === 'start' ? formData.startTime : formData.endTime
          }
          onSelectTime={handleTimeSelect}
          title={`Select ${timePickerType === 'start' ? 'Start' : 'End'} Time`}
        />
      )}
    </div>
  );
}
