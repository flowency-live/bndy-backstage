import { useState } from "react";
import { Button } from "@/components/ui/button";
import ClockFacePicker from "@/components/clock-face-picker";

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
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour');

  if (!isOpen) return null;

  const formatTime24 = (h: number, m: number) => {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const formatTime12 = (h: number, m: number) => {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const period = h >= 12 ? "PM" : "AM";
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    // Auto-advance to minute selection for mobile optimization
    setClockMode('minute');
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    // Don't auto-close - let user confirm time selection
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
        
        <div className="p-6">
          {/* Digital time display */}
          <div className="text-center mb-6">
            <div className="text-3xl font-sans font-bold text-card-foreground mb-2">
              {formatTime12(hour, minute)}
            </div>
          </div>

          {/* Clock Face Time Selection */}
          <div className="mb-6 flex justify-center">
            <ClockFacePicker
              hour={hour}
              minute={minute}
              onHourChange={handleHourChange}
              onMinuteChange={handleMinuteChange}
              mode={clockMode}
              onModeChange={setClockMode}
            />
          </div>

          {/* Confirm button */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onSelectTime(formatTime24(hour, minute));
                onClose();
              }}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
