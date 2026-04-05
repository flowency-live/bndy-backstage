/**
 * AddToCalendarButton Component Tests
 *
 * Tests for the "Add to Calendar" dropdown button:
 * - Dropdown menu renders with all options
 * - Google Calendar opens correct URL
 * - iCal download triggers correctly
 * - Disabled state when no event
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToCalendarButton } from './add-to-calendar-button';
import { eventsService } from '@/lib/services/events-service';

// Mock the events service
jest.mock('@/lib/services/events-service', () => ({
  eventsService: {
    downloadEventIcal: jest.fn(),
  },
}));

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:http://test/mock-url');
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true,
});
Object.defineProperty(URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
  writable: true,
});

describe('AddToCalendarButton', () => {
  const mockEvent = {
    id: 'event-123',
    artistId: 'artist-456',
    title: 'Live at The Blue Note',
    date: '2025-07-15',
    startTime: '20:00',
    endTime: '23:00',
    venue: 'The Blue Note',
    location: 'London',
    type: 'gig' as const,
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the button', () => {
    render(<AddToCalendarButton event={mockEvent} artistId="artist-456" />);

    expect(screen.getByTestId('add-to-calendar-button')).toBeInTheDocument();
  });

  it('should show dropdown menu when clicked', () => {
    render(<AddToCalendarButton event={mockEvent} artistId="artist-456" />);

    fireEvent.click(screen.getByTestId('add-to-calendar-button'));

    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Apple Calendar')).toBeInTheDocument();
    expect(screen.getByText('Outlook')).toBeInTheDocument();
    expect(screen.getByText('Download .ics')).toBeInTheDocument();
  });

  it('should open Google Calendar with correct URL when clicked', () => {
    render(<AddToCalendarButton event={mockEvent} artistId="artist-456" />);

    fireEvent.click(screen.getByTestId('add-to-calendar-button'));
    fireEvent.click(screen.getByText('Google Calendar'));

    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    const calledUrl = mockWindowOpen.mock.calls[0][0];
    expect(calledUrl).toContain('calendar.google.com/calendar/render');
    expect(calledUrl).toContain('action=TEMPLATE');
    expect(calledUrl).toContain('text=Live+at+The+Blue+Note');
    expect(calledUrl).toContain('dates=20250715T200000');
  });

  it('should include end time in Google Calendar URL when provided', () => {
    render(<AddToCalendarButton event={mockEvent} artistId="artist-456" />);

    fireEvent.click(screen.getByTestId('add-to-calendar-button'));
    fireEvent.click(screen.getByText('Google Calendar'));

    const calledUrl = mockWindowOpen.mock.calls[0][0];
    expect(calledUrl).toContain('dates=20250715T200000/20250715T230000');
  });

  it('should include location in Google Calendar URL', () => {
    render(<AddToCalendarButton event={mockEvent} artistId="artist-456" />);

    fireEvent.click(screen.getByTestId('add-to-calendar-button'));
    fireEvent.click(screen.getByText('Google Calendar'));

    const calledUrl = mockWindowOpen.mock.calls[0][0];
    expect(calledUrl).toContain('location=The+Blue+Note');
  });

  it('should download iCal file when Download .ics is clicked', async () => {
    const mockBlob = new Blob(['mock ical content'], { type: 'text/calendar' });
    (eventsService.downloadEventIcal as jest.Mock).mockResolvedValue(mockBlob);

    render(<AddToCalendarButton event={mockEvent} artistId="artist-456" />);

    fireEvent.click(screen.getByTestId('add-to-calendar-button'));
    fireEvent.click(screen.getByText('Download .ics'));

    await waitFor(() => {
      expect(eventsService.downloadEventIcal).toHaveBeenCalledWith('artist-456', 'event-123');
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
  });

  it('should be disabled when no event is provided', () => {
    render(<AddToCalendarButton event={null} artistId="artist-456" />);

    const button = screen.getByTestId('add-to-calendar-button');
    expect(button).toBeDisabled();
  });

  it('should be disabled when no artistId is provided', () => {
    render(<AddToCalendarButton event={mockEvent} artistId={null} />);

    const button = screen.getByTestId('add-to-calendar-button');
    expect(button).toBeDisabled();
  });

  it('should use event title as filename for download', async () => {
    const mockBlob = new Blob(['mock ical content'], { type: 'text/calendar' });
    (eventsService.downloadEventIcal as jest.Mock).mockResolvedValue(mockBlob);

    // Mock createElement to capture the download attribute
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
      remove: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as HTMLElement);

    render(<AddToCalendarButton event={mockEvent} artistId="artist-456" />);

    fireEvent.click(screen.getByTestId('add-to-calendar-button'));
    fireEvent.click(screen.getByText('Download .ics'));

    await waitFor(() => {
      expect(mockAnchor.download).toBe('Live at The Blue Note.ics');
    });
  });

  it('should handle event without title', () => {
    const eventWithoutTitle = { ...mockEvent, title: undefined };
    render(<AddToCalendarButton event={eventWithoutTitle} artistId="artist-456" />);

    fireEvent.click(screen.getByTestId('add-to-calendar-button'));
    fireEvent.click(screen.getByText('Google Calendar'));

    const calledUrl = mockWindowOpen.mock.calls[0][0];
    // Should use event type as fallback
    expect(calledUrl).toContain('text=Gig');
  });

  it('should handle event without start time (all-day event)', () => {
    const allDayEvent = { ...mockEvent, startTime: undefined, endTime: undefined };
    render(<AddToCalendarButton event={allDayEvent} artistId="artist-456" />);

    fireEvent.click(screen.getByTestId('add-to-calendar-button'));
    fireEvent.click(screen.getByText('Google Calendar'));

    const calledUrl = mockWindowOpen.mock.calls[0][0];
    // All-day events use date-only format YYYYMMDD
    expect(calledUrl).toContain('dates=20250715/20250716');
  });
});
