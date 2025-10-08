import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  title: string;
  allowClear?: boolean;
  onClear?: () => void;
}

export default function DatePickerModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  title,
  allowClear = false,
  onClear,
}: DatePickerModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate);

  if (!isOpen) return null;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDateClick = (date: Date) => {
    // UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app
    const dateStr = format(date, "yyyy-MM-dd"); // Keep internal format as ISO for database compatibility
    setTempSelectedDate(dateStr);
    // Auto-close on date selection
    onSelectDate(dateStr);
    onClose();
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-sm w-full animate-slide-up">
        <div className="bg-orange-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif">{title}</h3>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {/* Month Navigation */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 text-orange-500 hover:bg-muted rounded"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="text-lg font-sans font-semibold text-card-foreground">
                {format(currentDate, "MMMM yyyy")}
              </span>
              <button 
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 text-orange-500 hover:bg-muted rounded"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <div key={`day-header-${index}`} className={`p-2 ${index >= 5 ? 'font-bold' : ''}`}>{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for month start (adjusted for Monday start) */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }, (_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}
              
              {calendarDays.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                const isSelected = tempSelectedDate === dateStr;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                let buttonClasses = "p-2 text-sm rounded hover:bg-muted transition-colors ";

                // Weekend days are bold
                if (isWeekend) {
                  buttonClasses += "font-bold ";
                }

                if (!isCurrentMonth) {
                  buttonClasses += "text-muted-foreground/50 ";
                } else if (isSelected) {
                  buttonClasses += "bg-orange-500 text-white ";
                } else if (isTodayDate) {
                  buttonClasses += "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-semibold ";
                } else {
                  buttonClasses += "text-card-foreground ";
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateClick(day)}
                    className={buttonClasses}
                    disabled={!isCurrentMonth}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Auto-closes on date selection - no buttons needed */}
          {allowClear && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleClear} className="px-6">
                Clear Selection
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
