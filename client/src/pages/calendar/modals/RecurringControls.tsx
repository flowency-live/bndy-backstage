import { useState } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import DatePickerModal from '@/components/date-picker-modal';

export type RecurringType = 'none' | 'day' | 'week' | 'month' | 'year';
export type DurationType = 'forever' | 'count' | 'until';

export interface RecurringValue {
  type: RecurringType;
  interval: number;
  duration: DurationType;
  count?: number;
  until?: string;
}

interface RecurringControlsProps {
  value: RecurringValue;
  onChange: (value: RecurringValue) => void;
  accentColor?: string; // e.g., 'red' for unavailability, 'orange' for rehearsal
  referenceDate?: string; // For "until" date picker default
}

/**
 * Reusable recurring pattern controls
 * Extracted from UnavailabilityModal for use across all recurring event types
 * Provides Google Calendar-style recurring pattern selection
 */
export function RecurringControls({
  value,
  onChange,
  accentColor = 'red',
  referenceDate,
}: RecurringControlsProps) {
  const [showUntilDatePicker, setShowUntilDatePicker] = useState(false);

  const updateValue = (updates: Partial<RecurringValue>) => {
    onChange({ ...value, ...updates });
  };

  const handleTypeChange = (type: RecurringType) => {
    updateValue({ type });
  };

  const handleIntervalChange = (interval: number) => {
    updateValue({ interval: Math.max(1, interval) });
  };

  const handleDurationChange = (duration: DurationType) => {
    updateValue({ duration });
  };

  const handleCountChange = (count: number) => {
    updateValue({ count: Math.max(1, count), duration: 'count' });
  };

  const handleUntilDateChange = (until: string) => {
    updateValue({ until, duration: 'until' });
  };

  // Show/hide recurring section
  const [isExpanded, setIsExpanded] = useState(value.type !== 'none');

  const handleExpand = () => {
    setIsExpanded(true);
    if (value.type === 'none') {
      onChange({ ...value, type: 'week', interval: 1, duration: 'forever' });
    }
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    onChange({ ...value, type: 'none' });
  };

  if (!isExpanded) {
    return (
      <div>
        <button
          type="button"
          onClick={handleExpand}
          className={`w-full p-3 border border-input rounded-xl text-left bg-background text-muted-foreground hover:text-foreground hover:border-${accentColor}-500 focus:border-${accentColor}-500 focus:ring-2 focus:ring-${accentColor}-500/20 transition-colors flex items-center gap-2`}
        >
          <i className="fas fa-repeat"></i>
          <span className="text-sm">Add repeat</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 p-4 border border-input rounded-xl bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <label className={`text-sm font-medium text-${accentColor}-600 dark:text-${accentColor}-400`}>
            Repeat
          </label>
          <button
            type="button"
            onClick={handleCollapse}
            className={`text-xs text-${accentColor}-500 hover:text-${accentColor}-600`}
          >
            Remove
          </button>
        </div>

        {/* Pattern Selection */}
        <div className="space-y-2">
          {/* Don't repeat */}
          <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <input
              type="radio"
              name="recurring"
              value="none"
              checked={value.type === 'none'}
              onChange={() => handleTypeChange('none')}
              className={`mr-3 accent-${accentColor}-500`}
            />
            <span className="text-sm">Don't repeat</span>
          </label>

          {/* Daily */}
          <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <input
              type="radio"
              name="recurring"
              value="day"
              checked={value.type === 'day'}
              onChange={() => handleTypeChange('day')}
              className={`mr-3 accent-${accentColor}-500`}
            />
            <span className="text-sm flex items-center gap-2">
              Every
              <Input
                type="number"
                min={1}
                max={99}
                value={value.interval}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTypeChange('day');
                }}
                className="w-16 h-8 text-center px-2"
              />
              day{value.interval !== 1 ? 's' : ''}
            </span>
          </label>

          {/* Weekly */}
          <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <input
              type="radio"
              name="recurring"
              value="week"
              checked={value.type === 'week'}
              onChange={() => handleTypeChange('week')}
              className={`mr-3 accent-${accentColor}-500`}
            />
            <span className="text-sm flex items-center gap-2">
              Every
              <Input
                type="number"
                min={1}
                max={99}
                value={value.interval}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTypeChange('week');
                }}
                className="w-16 h-8 text-center px-2"
              />
              week{value.interval !== 1 ? 's' : ''}
            </span>
          </label>

          {/* Monthly */}
          <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <input
              type="radio"
              name="recurring"
              value="month"
              checked={value.type === 'month'}
              onChange={() => handleTypeChange('month')}
              className={`mr-3 accent-${accentColor}-500`}
            />
            <span className="text-sm flex items-center gap-2">
              Every
              <Input
                type="number"
                min={1}
                max={99}
                value={value.interval}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTypeChange('month');
                }}
                className="w-16 h-8 text-center px-2"
              />
              month{value.interval !== 1 ? 's' : ''}
            </span>
          </label>

          {/* Yearly */}
          <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <input
              type="radio"
              name="recurring"
              value="year"
              checked={value.type === 'year'}
              onChange={() => handleTypeChange('year')}
              className={`mr-3 accent-${accentColor}-500`}
            />
            <span className="text-sm flex items-center gap-2">
              Every
              <Input
                type="number"
                min={1}
                max={99}
                value={value.interval}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTypeChange('year');
                }}
                className="w-16 h-8 text-center px-2"
              />
              year{value.interval !== 1 ? 's' : ''}
            </span>
          </label>
        </div>

        {/* Duration Selection - Only show if not "none" */}
        {value.type !== 'none' && (
          <div className="mt-4">
            <label className={`text-sm font-medium text-${accentColor}-600 dark:text-${accentColor}-400 block mb-2`}>
              Ends
            </label>
            <div className="space-y-2">
              {/* Forever */}
              <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="duration"
                  value="forever"
                  checked={value.duration === 'forever'}
                  onChange={() => handleDurationChange('forever')}
                  className={`mr-3 accent-${accentColor}-500`}
                />
                <span className="text-sm">Forever</span>
              </label>

              {/* Specific number of times */}
              <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="duration"
                  value="count"
                  checked={value.duration === 'count'}
                  onChange={() => handleDurationChange('count')}
                  className={`mr-3 accent-${accentColor}-500`}
                />
                <span className="text-sm flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={value.count || 1}
                    onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDurationChange('count');
                    }}
                    className="w-16 h-8 text-center px-2"
                  />
                  time{(value.count || 1) !== 1 ? 's' : ''}
                </span>
              </label>

              {/* Until date */}
              <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="duration"
                  value="until"
                  checked={value.duration === 'until'}
                  onChange={() => handleDurationChange('until')}
                  className={`mr-3 accent-${accentColor}-500`}
                />
                <span className="text-sm flex items-center gap-2">
                  Until
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDurationChange('until');
                      setShowUntilDatePicker(true);
                    }}
                    className={`px-3 py-1 border border-input rounded-lg bg-background hover:border-${accentColor}-500 transition-colors text-sm`}
                  >
                    {value.until
                      ? format(new Date(value.until + 'T00:00:00'), 'dd/MM/yyyy')
                      : 'Select date'}
                  </button>
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Until Date Picker Modal */}
      <DatePickerModal
        isOpen={showUntilDatePicker}
        onClose={() => setShowUntilDatePicker(false)}
        onSelectDate={(date) => {
          handleUntilDateChange(date);
        }}
        selectedDate={value.until || referenceDate || new Date().toISOString().split('T')[0]}
        title="Repeat until"
      />
    </>
  );
}
