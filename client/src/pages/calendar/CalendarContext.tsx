import { createContext, useContext, useState, ReactNode } from 'react';
import type { Event } from '@/types/api';

interface CalendarContextType {
  // Modal states
  showEventModal: boolean;
  setShowEventModal: (show: boolean) => void;
  showPublicGigWizard: boolean;
  setShowPublicGigWizard: (show: boolean) => void;
  showUnavailabilityModal: boolean;
  setShowUnavailabilityModal: (show: boolean) => void;
  showEventDetails: boolean;
  setShowEventDetails: (show: boolean) => void;

  // Event selection
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isEditingEvent: boolean;
  setIsEditingEvent: (editing: boolean) => void;

  // Navigation
  currentDate: Date;
  setCurrentDate: (date: Date) => void;

  // View controls
  viewMode: 'calendar' | 'agenda';
  setViewMode: (mode: 'calendar' | 'agenda') => void;

  // Filter toggles
  showArtistEvents: boolean;
  setShowArtistEvents: (show: boolean) => void;
  showMyEvents: boolean;
  setShowMyEvents: (show: boolean) => void;
  showAllArtists: boolean;
  setShowAllArtists: (show: boolean) => void;

  // UI state
  dismissedHighlight: boolean;
  setDismissedHighlight: (dismissed: boolean) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPublicGigWizard, setShowPublicGigWizard] = useState(false);
  const [showUnavailabilityModal, setShowUnavailabilityModal] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Event selection
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isEditingEvent, setIsEditingEvent] = useState(false);

  // Navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // View controls
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  // Filter toggles
  const [showArtistEvents, setShowArtistEvents] = useState(true);
  const [showMyEvents, setShowMyEvents] = useState(true);
  const [showAllArtists, setShowAllArtists] = useState(false);

  // UI state
  const [dismissedHighlight, setDismissedHighlight] = useState(false);

  const value: CalendarContextType = {
    showEventModal,
    setShowEventModal,
    showPublicGigWizard,
    setShowPublicGigWizard,
    showUnavailabilityModal,
    setShowUnavailabilityModal,
    showEventDetails,
    setShowEventDetails,
    selectedEvent,
    setSelectedEvent,
    selectedDate,
    setSelectedDate,
    isEditingEvent,
    setIsEditingEvent,
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    showArtistEvents,
    setShowArtistEvents,
    showMyEvents,
    setShowMyEvents,
    showAllArtists,
    setShowAllArtists,
    dismissedHighlight,
    setDismissedHighlight,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
}
