import { useState, useRef, useCallback } from "react";

interface ClockFacePickerProps {
  hour: number;
  minute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  mode: 'hour' | 'minute';
  onModeChange: (mode: 'hour' | 'minute') => void;
}

export default function ClockFacePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  mode,
  onModeChange,
}: ClockFacePickerProps) {
  const clockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getAngleFromCenter = useCallback((clientX: number, clientY: number) => {
    if (!clockRef.current) return 0;
    
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360; // Adjust so 12 o'clock is 0 degrees
    
    return angle;
  }, []);

  const getValueFromAngle = useCallback((angle: number) => {
    if (mode === 'hour') {
      const hourValue = Math.round(angle / 30) % 12;
      return hourValue === 0 ? 12 : hourValue;
    } else {
      return Math.round(angle / 6) % 60;
    }
  }, [mode]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    const angle = getAngleFromCenter(e.clientX, e.clientY);
    const value = getValueFromAngle(angle);
    
    if (mode === 'hour') {
      // Convert 12-hour to 24-hour format, preserving AM/PM
      const isPM = hour >= 12;
      const newHour24 = value === 12 ? (isPM ? 12 : 0) : (isPM ? value + 12 : value);
      onHourChange(newHour24);
    } else {
      onMinuteChange(value);
    }
  }, [mode, hour, onHourChange, onMinuteChange, getAngleFromCenter, getValueFromAngle]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const angle = getAngleFromCenter(e.clientX, e.clientY);
    const value = getValueFromAngle(angle);
    
    if (mode === 'hour') {
      const isPM = hour >= 12;
      const newHour24 = value === 12 ? (isPM ? 12 : 0) : (isPM ? value + 12 : value);
      onHourChange(newHour24);
    } else {
      onMinuteChange(value);
    }
  }, [isDragging, mode, hour, onHourChange, onMinuteChange, getAngleFromCenter, getValueFromAngle]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getHourAngle = () => {
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return (hour12 * 30) - 90; // -90 to start from 12 o'clock
  };

  const getMinuteAngle = () => {
    return (minute * 6) - 90; // -90 to start from 12 o'clock
  };

  const renderHourNumbers = () => {
    const numbers = [];
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const radius = 80;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      numbers.push(
        <div
          key={i}
          className={`absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer transition-colors ${
            mode === 'hour' && ((hour === 0 && i === 12) || (hour > 0 && hour <= 12 && hour === i) || (hour > 12 && hour - 12 === i))
              ? 'bg-orange-500 text-white'
              : 'text-card-foreground hover:bg-muted'
          }`}
          style={{
            left: `calc(50% + ${x}px - 16px)`,
            top: `calc(50% + ${y}px - 16px)`,
          }}
          onClick={() => {
            const isPM = hour >= 12;
            const newHour24 = i === 12 ? (isPM ? 12 : 0) : (isPM ? i + 12 : i);
            onHourChange(newHour24);
          }}
        >
          {i}
        </div>
      );
    }
    return numbers;
  };

  const renderMinuteNumbers = () => {
    const numbers = [];
    for (let i = 0; i < 60; i += 5) {
      const angle = (i * 6 - 90) * (Math.PI / 180);
      const radius = 80;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      numbers.push(
        <div
          key={i}
          className={`absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer transition-colors ${
            mode === 'minute' && minute === i
              ? 'bg-orange-500 text-white'
              : 'text-card-foreground hover:bg-muted'
          }`}
          style={{
            left: `calc(50% + ${x}px - 16px)`,
            top: `calc(50% + ${y}px - 16px)`,
          }}
          onClick={() => onMinuteChange(i)}
        >
          {i.toString().padStart(2, '0')}
        </div>
      );
    }
    return numbers;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Mode Toggle */}
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => onModeChange('hour')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === 'hour'
              ? 'bg-orange-500 text-white'
              : 'bg-muted text-muted-foreground hover:text-card-foreground'
          }`}
        >
          Hour
        </button>
        <button
          type="button"
          onClick={() => onModeChange('minute')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === 'minute'
              ? 'bg-orange-500 text-white'
              : 'bg-muted text-muted-foreground hover:text-card-foreground'
          }`}
        >
          Minute
        </button>
      </div>

      {/* Clock Face */}
      <div className="relative">
        <div
          ref={clockRef}
          className="relative w-48 h-48 rounded-full border-4 border-border bg-card cursor-pointer select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          {/* Clock center dot */}
          <div className="absolute w-3 h-3 bg-orange-500 rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"></div>
          
          {/* Hour hand */}
          {mode === 'hour' && (
            <div
              className="absolute w-1 bg-orange-500 rounded-full origin-bottom z-10"
              style={{
                height: '60px',
                left: 'calc(50% - 2px)',
                top: 'calc(50% - 60px)',
                transform: `rotate(${getHourAngle()}deg)`,
                transformOrigin: 'bottom center',
              }}
            />
          )}
          
          {/* Minute hand */}
          {mode === 'minute' && (
            <div
              className="absolute w-0.5 bg-orange-500 rounded-full origin-bottom z-10"
              style={{
                height: '70px',
                left: 'calc(50% - 1px)',
                top: 'calc(50% - 70px)',
                transform: `rotate(${getMinuteAngle()}deg)`,
                transformOrigin: 'bottom center',
              }}
            />
          )}
          
          {/* Numbers */}
          {mode === 'hour' ? renderHourNumbers() : renderMinuteNumbers()}
        </div>
      </div>

      {/* AM/PM Toggle */}
      {mode === 'hour' && (
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => {
              const newHour = hour >= 12 ? hour - 12 : hour;
              onHourChange(newHour);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              hour < 12
                ? 'bg-orange-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-card-foreground'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => {
              const newHour = hour < 12 ? hour + 12 : hour;
              onHourChange(newHour);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              hour >= 12
                ? 'bg-orange-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-card-foreground'
            }`}
          >
            PM
          </button>
        </div>
      )}
    </div>
  );
}