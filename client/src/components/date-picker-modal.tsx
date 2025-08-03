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
    const dateStr = format(date, "yyyy-MM-dd");
    setTempSelectedDate(dateStr);
  };

  const handleConfirm = () => {
    if (tempSelectedDate) {
      onSelectDate(tempSelectedDate);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full animate-slide-up">
        <div className="bg-torrist-green-light text-white p-4 rounded-t-2xl">
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
                className="p-2 text-torrist-green hover:bg-torrist-cream rounded"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="text-lg font-sans font-semibold text-torrist-green">
                {format(currentDate, "MMMM yyyy")}
              </span>
              <button 
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 text-torrist-green hover:bg-torrist-cream rounded"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-xs text-gray-600 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <div key={`day-header-${index}`} className="p-2">{day}</div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for month start */}
              {Array.from({ length: monthStart.getDay() }, (_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}
              
              {calendarDays.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                const isSelected = tempSelectedDate === dateStr;

                let buttonClasses = "p-2 text-sm rounded hover:bg-torrist-cream transition-colors ";
                
                if (!isCurrentMonth) {
                  buttonClasses += "text-gray-300 ";
                } else if (isSelected) {
                  buttonClasses += "bg-torrist-green text-white ";
                } else if (isTodayDate) {
                  buttonClasses += "bg-blue-100 text-blue-700 font-semibold ";
                } else {
                  buttonClasses += "text-gray-700 ";
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
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            {allowClear && (
              <Button variant="outline" onClick={handleClear} className="flex-1">
                Clear
              </Button>
            )}
            <Button 
              onClick={handleConfirm} 
              disabled={!tempSelectedDate}
              className="flex-1 bg-torrist-green hover:bg-torrist-green-dark"
            >
              Select
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
