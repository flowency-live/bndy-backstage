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
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialDate ? new Date(initialDate + 'T00:00:00') : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (!startDate || isSelectingEndDate) {
      if (!startDate) {
        // First click - set start date
        setStartDate(date);
        setIsSelectingEndDate(true);
      } else {
        // Second click - set end date and auto-close
        let finalStartDate = startDate;
        let finalEndDate = date;
        
        if (date < startDate) {
          // If selected date is before start date, swap them
          finalStartDate = date;
          finalEndDate = startDate;
        }
        
        setEndDate(finalEndDate);
        
        // UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app
        const start = format(finalStartDate, "yyyy-MM-dd"); // Keep internal format as ISO for database compatibility
        const end = format(finalEndDate, "yyyy-MM-dd");
        onDateRangeSelect(start, end);
        handleClose();
      }
    } else {
      // Reset selection
      setStartDate(date);
      setEndDate(undefined);
      setIsSelectingEndDate(true);
    }
  };

  const handleClose = () => {
    setStartDate(initialDate ? new Date(initialDate + 'T00:00:00') : undefined);
    setEndDate(undefined);
    setIsSelectingEndDate(false);
    onClose();
  };

  const getSelectedDateRange = () => {
    if (!startDate) return [];
    if (!endDate) return [startDate];
    
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
      <div className="bg-card rounded-2xl max-w-md w-full animate-slide-up">
        <div className="bg-orange-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif">Select Unavailable Dates</h3>
            <button onClick={handleClose} className="text-white hover:text-gray-200">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="text-sm text-muted-foreground">
            {!startDate ? (
              "Select your first unavailable date"
            ) : !endDate ? (
              "Select your last unavailable date (or click confirm for single day)"
            ) : (
              // UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app
              `Selected: ${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM")} (${differenceInDays(endDate, startDate) + 1} days)`
            )}
          </div>

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
            modifiersStyles={{
              selected: { backgroundColor: "hsl(0, 84%, 60%)", color: "white" },
              range_start: { backgroundColor: "hsl(0, 84%, 60%)", color: "white", borderRadius: "6px 0 0 6px" },
              range_end: { backgroundColor: "hsl(0, 84%, 60%)", color: "white", borderRadius: "0 6px 6px 0" },
              range_middle: { backgroundColor: "hsl(0, 84%, 85%)", color: "hsl(0, 84%, 60%)" }
            }}
            className="rounded-md border"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />

          {/* Auto-closes after selecting date range - no buttons needed */}
        </div>
      </div>
    </div>
  );
}