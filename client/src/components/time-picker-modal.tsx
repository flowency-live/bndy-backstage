import { useState } from "react";
import { Button } from "@/components/ui/button";

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTime?: string;
  onSelectTime: (time: string) => void;
  title: string;
}

export default function TimePickerModal({
  isOpen,
  onClose,
  selectedTime,
  onSelectTime,
  title,
}: TimePickerModalProps) {
  // Parse initial time or default to 7:00 PM
  const parseTime = (timeStr?: string) => {
    if (!timeStr) return { hour: 19, minute: 0 }; // 7:00 PM
    const [hours, minutes] = timeStr.split(":").map(Number);
    return { hour: hours, minute: minutes };
  };

  const initialTime = parseTime(selectedTime);
  const [hour, setHour] = useState(initialTime.hour);
  const [minute, setMinute] = useState(initialTime.minute);

  if (!isOpen) return null;

  const formatTime24 = (h: number, m: number) => {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const formatTime12 = (h: number, m: number) => {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const period = h >= 12 ? "PM" : "AM";
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const handleHourClick = (newHour: number) => {
    setHour(newHour);
  };

  const handleMinuteClick = (newMinute: number) => {
    setMinute(newMinute);
  };

  const handleConfirm = () => {
    onSelectTime(formatTime24(hour, minute));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full animate-slide-up">
        <div className="bg-brand-accent text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif">{title}</h3>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Digital time display */}
          <div className="text-center mb-6">
            <div className="text-3xl font-sans font-bold text-brand-primary mb-2">
              {formatTime12(hour, minute)}
            </div>
          </div>

          {/* Time Selection */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Hour Selection */}
              <div>
                <label className="block text-sm font-sans font-semibold text-gray-700 mb-2 text-center">Hour</label>
                <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                  {Array.from({ length: 24 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => handleHourClick(i)}
                      className={`p-2 text-sm rounded transition-colors ${
                        hour === i
                          ? "bg-brand-accent text-white"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {i === 0 ? 12 : i > 12 ? i - 12 : i}
                      <span className="text-xs ml-1">{i >= 12 ? "PM" : "AM"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Minute Selection */}
              <div>
                <label className="block text-sm font-sans font-semibold text-gray-700 mb-2 text-center">Minute</label>
                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                  {Array.from({ length: 12 }, (_, i) => {
                    const min = i * 5;
                    return (
                      <button
                        key={min}
                        onClick={() => handleMinuteClick(min)}
                        className={`p-2 text-sm rounded transition-colors ${
                          minute === min
                            ? "bg-brand-accent text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        {min.toString().padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1 bg-brand-accent hover:bg-brand-accent-light"
            >
              Select
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
