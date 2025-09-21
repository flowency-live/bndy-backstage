import { useState } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-brand-primary font-serif">
            Select Unavailable Dates
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
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
              selected: { backgroundColor: "var(--brand-unavailable)", color: "white" },
              range_start: { backgroundColor: "var(--brand-unavailable)", color: "white", borderRadius: "6px 0 0 6px" },
              range_end: { backgroundColor: "var(--brand-unavailable)", color: "white", borderRadius: "0 6px 6px 0" },
              range_middle: { backgroundColor: "var(--brand-unavailable-light)", color: "var(--brand-unavailable)" }
            }}
            className="rounded-md border"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />

          {/* Auto-closes after selecting date range - no buttons needed */}
        </div>
      </DialogContent>
    </Dialog>
  );
}