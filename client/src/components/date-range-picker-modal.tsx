import { useState } from "react";
import { format, addDays } from "date-fns";
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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [hoverDate, setHoverDate] = useState<Date | undefined>(undefined);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Standard booking-style behavior
    if (!startDate) {
      // First click: set start date
      setStartDate(date);
      setEndDate(undefined);
    } else if (!endDate) {
      // Second click: set end date and auto-close
      if (date < startDate) {
        // If clicked before start, reset with new start date
        setStartDate(date);
        setEndDate(undefined);
      } else {
        // Valid end date - set it and close
        setEndDate(date);
        const startStr = format(startDate, "yyyy-MM-dd");
        const endStr = format(date, "yyyy-MM-dd");
        onDateRangeSelect(startStr, endStr);
        handleClose();
      }
    } else {
      // Both dates already set - reset with new start date
      setStartDate(date);
      setEndDate(undefined);
    }
  };

  const handleClearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setHoverDate(undefined);
  };

  const handleClose = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setHoverDate(undefined);
    onClose();
  };

  const getHoverRangeDates = () => {
    if (!startDate || !hoverDate || endDate) return [];

    const dates = [];
    const min = startDate < hoverDate ? startDate : hoverDate;
    const max = startDate < hoverDate ? hoverDate : startDate;
    let currentDate = new Date(min);

    while (currentDate <= max) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  };

  const hoverRangeDates = getHoverRangeDates();

  const getHelperText = () => {
    if (!startDate) {
      return "Select start date";
    }
    if (!endDate) {
      return "Select end date";
    }
    return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-md w-full animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Red/Pink gradient header matching unavailability theme */}
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4 rounded-t-2xl sticky top-0">
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
          {/* Helper Text with Clear button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground font-medium">
              {getHelperText()}
            </div>
            {startDate && (
              <button
                onClick={handleClearDates}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={handleDateSelect}
            defaultMonth={initialDate ? new Date(initialDate + 'T00:00:00') : new Date()}
            modifiers={{
              range_start: startDate ? (date) =>
                format(date, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd") : () => false,
              range_end: endDate ? (date) =>
                format(date, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd") : () => false,
              range_middle: (date) => {
                if (!startDate || !endDate) return false;
                return date > startDate && date < endDate;
              },
              hover_preview: (date) => hoverRangeDates.some(d =>
                format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
              )
            }}
            modifiersClassNames={{
              range_start: "bg-red-500 text-white hover:bg-red-600",
              range_end: "bg-pink-500 text-white hover:bg-pink-600",
              range_middle: "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100",
              hover_preview: "bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100"
            }}
            className="rounded-md border w-full"
            classNames={{
              day: "h-11 w-11 text-sm",
              day_today: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-100 font-semibold",
            }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            onDayMouseEnter={(date) => {
              if (startDate && !endDate) {
                setHoverDate(date);
              }
            }}
            onDayMouseLeave={() => setHoverDate(undefined)}
          />
        </div>
      </div>
    </div>
  );
}