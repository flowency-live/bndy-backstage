import { useState } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

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
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialDate ? new Date(initialDate + 'T00:00:00') : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (!isMultiDay) {
      // Single day mode - immediate selection and close
      const dateStr = format(date, "yyyy-MM-dd");
      onDateRangeSelect(dateStr, dateStr);
      handleClose();
      return;
    }

    // Multi-day mode - select start, then end
    if (!startDate) {
      // First selection: start date
      setStartDate(date);
      setEndDate(undefined);
    } else if (!endDate) {
      // Second selection: end date
      const finalEndDate = date < startDate ? startDate : date;
      const finalStartDate = date < startDate ? date : startDate;
      
      setStartDate(finalStartDate);
      setEndDate(finalEndDate);
      
      // Auto-close after selecting both dates
      const startStr = format(finalStartDate, "yyyy-MM-dd");
      const endStr = format(finalEndDate, "yyyy-MM-dd");
      onDateRangeSelect(startStr, endStr);
      handleClose();
    } else {
      // Reset - start over
      setStartDate(date);
      setEndDate(undefined);
    }
  };

  const handleToggleMode = () => {
    setIsMultiDay(!isMultiDay);
    // Always clear selection when switching modes
    setStartDate(undefined);
    setEndDate(undefined);
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

          {/* Helper Text */}
          <div className="text-sm text-muted-foreground">
            {!isMultiDay ? (
              "Tap any date"
            ) : !startDate ? (
              "Select start date"
            ) : !endDate ? (
              "Select end date"
            ) : (
              `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM")}`
            )}
          </div>

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={handleDateSelect}
            modifiers={{
              range_start: startDate && !endDate ? (date) => 
                format(date, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd") : () => false,
              range_end: endDate ? (date) => 
                format(date, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd") : () => false,
              range_middle: (date) => {
                if (!startDate || !endDate) return false;
                return date > startDate && date < endDate;
              },
              selected_range: (date) => selectedDates.some(d => 
                format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
              )
            }}
            modifiersClassNames={{
              range_start: "bg-orange-500 text-white hover:bg-orange-600",
              range_end: "bg-orange-500 text-white hover:bg-orange-600", 
              range_middle: "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100",
              selected_range: "bg-orange-500 text-white hover:bg-orange-600"
            }}
            className="rounded-md border w-full"
            classNames={{
              day: "h-11 w-11 text-sm", // Larger touch targets (44px)
              day_today: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-100 font-semibold",
            }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>
      </div>
    </div>
  );
}