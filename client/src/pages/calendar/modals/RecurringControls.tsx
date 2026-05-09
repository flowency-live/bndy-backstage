import { useState } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import DatePickerModal from '@/components/date-picker-modal';
import { Repeat, Calendar, Hash, Infinity } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const FREQUENCY_OPTIONS: { value: RecurringType; label: string; shortLabel: string }[] = [
  { value: 'day', label: 'Daily', shortLabel: 'Day' },
  { value: 'week', label: 'Weekly', shortLabel: 'Week' },
  { value: 'month', label: 'Monthly', shortLabel: 'Month' },
  { value: 'year', label: 'Yearly', shortLabel: 'Year' },
];

/**
 * Reusable recurring pattern controls
 * Mobile-optimized with clear segmented selection
 * Prevents accidental type switches with separate controls
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
    updateValue({ interval: Math.max(1, Math.min(99, interval)) });
  };

  const handleDurationChange = (duration: DurationType) => {
    updateValue({ duration });
  };

  const handleCountChange = (count: number) => {
    updateValue({ count: Math.max(1, Math.min(999, count)), duration: 'count' });
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

  // Get accent color classes
  const getAccentClasses = (isActive: boolean) => {
    const colors: Record<string, { active: string; hover: string; border: string; text: string }> = {
      red: {
        active: 'bg-red-500 text-white border-red-500',
        hover: 'hover:bg-red-50 dark:hover:bg-red-950/30',
        border: 'border-red-500',
        text: 'text-red-600 dark:text-red-400',
      },
      orange: {
        active: 'bg-orange-500 text-white border-orange-500',
        hover: 'hover:bg-orange-50 dark:hover:bg-orange-950/30',
        border: 'border-orange-500',
        text: 'text-orange-600 dark:text-orange-400',
      },
      blue: {
        active: 'bg-blue-500 text-white border-blue-500',
        hover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
        border: 'border-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
      },
      green: {
        active: 'bg-green-500 text-white border-green-500',
        hover: 'hover:bg-green-50 dark:hover:bg-green-950/30',
        border: 'border-green-500',
        text: 'text-green-600 dark:text-green-400',
      },
    };
    return colors[accentColor] || colors.red;
  };

  const accent = getAccentClasses(true);

  // Get frequency label for summary
  const getFrequencyLabel = () => {
    const freq = FREQUENCY_OPTIONS.find(f => f.value === value.type);
    if (!freq) return '';
    if (value.interval === 1) return freq.label.toLowerCase();
    return `every ${value.interval} ${freq.shortLabel.toLowerCase()}s`;
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className={cn(
          'w-full p-4 border border-input rounded-xl text-left bg-background',
          'hover:border-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-offset-2',
          'transition-all duration-200 flex items-center gap-3 group',
          `focus:ring-${accentColor}-500/30`
        )}
      >
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          'bg-muted group-hover:bg-muted/80 transition-colors'
        )}>
          <Repeat className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-foreground">Make it repeat</span>
          <p className="text-xs text-muted-foreground mt-0.5">Set up a recurring schedule</p>
        </div>
        <i className="fas fa-chevron-right text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </button>
    );
  }

  return (
    <>
      <div className="border border-input rounded-xl bg-muted/20 overflow-hidden">
        {/* Header */}
        <div className={cn(
          'px-4 py-3 flex items-center justify-between',
          `bg-${accentColor}-50 dark:bg-${accentColor}-950/30 border-b border-input`
        )}>
          <div className="flex items-center gap-2">
            <Repeat className={cn('w-4 h-4', accent.text)} />
            <span className={cn('text-sm font-semibold', accent.text)}>
              Repeats {getFrequencyLabel()}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCollapse}
            className={cn(
              'text-xs px-2 py-1 rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            Remove
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Frequency Type - Segmented Control */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Frequency
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTypeChange(option.value)}
                  className={cn(
                    'py-2.5 px-2 text-sm font-medium rounded-md transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-1',
                    value.type === option.value
                      ? accent.active
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  {option.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Interval - Separate Clear Control */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Every
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-input rounded-lg bg-background overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleIntervalChange(value.interval - 1)}
                  disabled={value.interval <= 1}
                  className={cn(
                    'w-11 h-11 flex items-center justify-center text-lg font-medium',
                    'transition-colors border-r border-input',
                    value.interval <= 1
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  −
                </button>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={value.interval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                  className="w-14 h-11 text-center text-lg font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => handleIntervalChange(value.interval + 1)}
                  disabled={value.interval >= 99}
                  className={cn(
                    'w-11 h-11 flex items-center justify-center text-lg font-medium',
                    'transition-colors border-l border-input',
                    value.interval >= 99
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  +
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                {FREQUENCY_OPTIONS.find(f => f.value === value.type)?.shortLabel.toLowerCase()}
                {value.interval !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Duration Selection - Card Style */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Ends
            </label>
            <div className="space-y-2">
              {/* Forever */}
              <button
                type="button"
                onClick={() => handleDurationChange('forever')}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all duration-200',
                  'flex items-center gap-3',
                  value.duration === 'forever'
                    ? cn(accent.active, accent.border)
                    : cn('border-input bg-background', accent.hover)
                )}
              >
                <Infinity className={cn(
                  'w-5 h-5',
                  value.duration === 'forever' ? 'text-white' : 'text-muted-foreground'
                )} />
                <div className="flex-1">
                  <span className={cn(
                    'text-sm font-medium block',
                    value.duration === 'forever' ? 'text-white' : 'text-foreground'
                  )}>
                    Forever
                  </span>
                  <span className={cn(
                    'text-xs',
                    value.duration === 'forever' ? 'text-white/70' : 'text-muted-foreground'
                  )}>
                    No end date
                  </span>
                </div>
              </button>

              {/* After X times */}
              <button
                type="button"
                onClick={() => handleDurationChange('count')}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all duration-200',
                  'flex items-center gap-3',
                  value.duration === 'count'
                    ? cn(accent.active, accent.border)
                    : cn('border-input bg-background', accent.hover)
                )}
              >
                <Hash className={cn(
                  'w-5 h-5',
                  value.duration === 'count' ? 'text-white' : 'text-muted-foreground'
                )} />
                <div className="flex-1">
                  <span className={cn(
                    'text-sm font-medium block',
                    value.duration === 'count' ? 'text-white' : 'text-foreground'
                  )}>
                    After
                  </span>
                  <span className={cn(
                    'text-xs',
                    value.duration === 'count' ? 'text-white/70' : 'text-muted-foreground'
                  )}>
                    Specific number of times
                  </span>
                </div>
                {value.duration === 'count' && (
                  <div
                    className="flex items-center bg-white/20 rounded-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={value.count || 1}
                      onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-center text-sm font-semibold bg-transparent border-0 text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <span className="text-xs text-white/80 pr-2">times</span>
                  </div>
                )}
              </button>

              {/* Until date */}
              <button
                type="button"
                onClick={() => {
                  handleDurationChange('until');
                  if (!value.until) {
                    setShowUntilDatePicker(true);
                  }
                }}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all duration-200',
                  'flex items-center gap-3',
                  value.duration === 'until'
                    ? cn(accent.active, accent.border)
                    : cn('border-input bg-background', accent.hover)
                )}
              >
                <Calendar className={cn(
                  'w-5 h-5',
                  value.duration === 'until' ? 'text-white' : 'text-muted-foreground'
                )} />
                <div className="flex-1">
                  <span className={cn(
                    'text-sm font-medium block',
                    value.duration === 'until' ? 'text-white' : 'text-foreground'
                  )}>
                    Until date
                  </span>
                  <span className={cn(
                    'text-xs',
                    value.duration === 'until' ? 'text-white/70' : 'text-muted-foreground'
                  )}>
                    End on a specific date
                  </span>
                </div>
                {value.duration === 'until' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUntilDatePicker(true);
                    }}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium text-white transition-colors"
                  >
                    {value.until
                      ? format(new Date(value.until + 'T00:00:00'), 'dd/MM/yyyy')
                      : 'Select'}
                  </button>
                )}
              </button>
            </div>
          </div>
        </div>
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
