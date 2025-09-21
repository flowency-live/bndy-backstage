import { useState } from "react";
import { format, addDays, differenceInDays, isToday, isTomorrow, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

interface DateRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateRangeSelect: (startDate: string, endDate: string) => void;
  initialDate?: string;
}

export default function DateRangePickerModal({
  isOpen,
  onClose,
  onDateRangeSelect,
  initialDate
}: DateRangePickerModalProps) {
  const { toast } = useToast();
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialDate ? new Date(initialDate + 'T00:00:00') : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Quick date options
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const thisWeekend = { 
    start: addDays(startOfWeek(today, { weekStartsOn: 1 }), 5), 
    end: addDays(startOfWeek(today, { weekStartsOn: 1 }), 6) 
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (!isMultiDay) {
      // Single day mode - immediate selection and close
      const dateStr = format(date, "yyyy-MM-dd");
      onDateRangeSelect(dateStr, dateStr);
      
      toast({
        title: "Date set",
        description: `Unavailable on ${format(date, "dd/MM/yyyy")}`,
      });
      
      handleClose();
      return;
    }

    // Multi-day mode
    if (!startDate) {
      setStartDate(date);
      setEndDate(undefined);
    } else if (!endDate) {
      const finalEndDate = date < startDate ? startDate : date;
      const finalStartDate = date < startDate ? date : startDate;
      
      setStartDate(finalStartDate);
      setEndDate(finalEndDate);
      
      // Auto-close after selecting both dates
      const startStr = format(finalStartDate, "yyyy-MM-dd");
      const endStr = format(finalEndDate, "yyyy-MM-dd");
      onDateRangeSelect(startStr, endStr);
      
      const days = differenceInDays(finalEndDate, finalStartDate) + 1;
      toast({
        title: "Period set", 
        description: `Unavailable for ${days} days (${format(finalStartDate, "dd/MM")} - ${format(finalEndDate, "dd/MM")})`,
      });
      
      handleClose();
    } else {
      // Reset selection
      setStartDate(date);
      setEndDate(undefined);
    }
  };

  const handleQuickSelect = (start: Date, end: Date) => {
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    onDateRangeSelect(startStr, endStr);
    
    const days = differenceInDays(end, start) + 1;
    const label = days === 1 ? format(start, "dd/MM/yyyy") : `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`;
    
    toast({
      title: "Period set",
      description: `Unavailable: ${label}`,
    });
    
    handleClose();
  };

  const handleToggleMode = () => {
    setIsMultiDay(!isMultiDay);
    if (isMultiDay) {
      // Switching to single day mode - clear selection
      setStartDate(undefined);
      setEndDate(undefined);
    } else {
      // Switching to multi-day mode - keep current start date if any
      setEndDate(undefined);
    }
  };

  const handleClose = () => {
    setStartDate(initialDate ? new Date(initialDate + 'T00:00:00') : undefined);
    setEndDate(undefined);
    setIsMultiDay(false);
    onClose();
  };

  const getSelectedDateRange = () => {
    if (!startDate) return [];
    if (!endDate && isMultiDay) return [startDate];
    if (!endDate) return [];
    
    const dates = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    while (currentDate <= lastDate) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  };

  const selectedDates = getSelectedDateRange();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-md w-full animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="bg-orange-500 text-white p-4 rounded-t-2xl sticky top-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif">Mark Unavailable</h3>
            <button 
              onClick={handleClose} 
              className="text-white hover:text-gray-200 p-2 -m-2"
              data-testid="button-close-date-picker"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleMode}
              className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                !isMultiDay 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              data-testid="button-single-day"
            >
              <i className="fas fa-calendar-day"></i>
              <span>Single Day</span>
            </button>
            <button
              onClick={handleToggleMode}
              className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                isMultiDay 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              data-testid="button-multi-day"
            >
              <i className="fas fa-calendar-week"></i>
              <span>Multi-day</span>
            </button>
          </div>

          {/* Quick Selection Chips */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Quick select:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickSelect(today, today)}
                className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                data-testid="button-quick-today"
              >
                Today
              </button>
              <button
                onClick={() => handleQuickSelect(tomorrow, tomorrow)}
                className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                data-testid="button-quick-tomorrow"
              >
                Tomorrow
              </button>
              <button
                onClick={() => handleQuickSelect(thisWeekend.start, thisWeekend.end)}
                className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                data-testid="button-quick-weekend"
              >
                This Weekend
              </button>
            </div>
          </div>

          {/* Helper Text */}
          <div className="text-sm text-muted-foreground">
            {!isMultiDay ? (
              "Tap any date to mark unavailable"
            ) : !startDate ? (
              "Select start date for your unavailable period"
            ) : !endDate ? (
              `Start: ${format(startDate, "dd/MM/yyyy")} - now select end date`
            ) : (
              // UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app
              `Selected: ${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM")} (${differenceInDays(endDate, startDate) + 1} days)`
            )}
          </div>

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={handleDateSelect}
            modifiers={{
              selected: (date) => selectedDates.some(d => 
                format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
              ),
              range_start: startDate ? (date) => 
                format(date, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd") : () => false,
              range_end: endDate ? (date) => 
                format(date, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd") : () => false,
              range_middle: (date) => {
                if (!startDate || !endDate) return false;
                return date > startDate && date < endDate;
              }
            }}
            modifiersClassNames={{
              selected: "bg-orange-500 text-white hover:bg-orange-600",
              range_start: "bg-orange-500 text-white hover:bg-orange-600 rounded-l-md",
              range_end: "bg-orange-500 text-white hover:bg-orange-600 rounded-r-md", 
              range_middle: "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100"
            }}
            className="rounded-md border w-full"
            classNames={{
              day: "h-11 w-11 text-sm", // Larger touch targets (44px)
              day_selected: "bg-orange-500 text-white hover:bg-orange-600",
              day_today: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-100 font-semibold",
            }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>
      </div>
    </div>
  );
}