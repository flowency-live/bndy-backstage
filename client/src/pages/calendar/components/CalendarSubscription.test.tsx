/**
 * CalendarSubscriptionModal Component Tests
 *
 * Tests for calendar subscription management modal:
 * - Generate subscription URL
 * - Scope selection (full, public, personal)
 * - Copy to clipboard functionality
 * - List existing subscriptions
 * - Revoke subscription
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CalendarSubscriptionModal } from './CalendarSubscription';
import { eventsService } from '@/lib/services/events-service';

// Mock the events service
jest.mock('@/lib/services/events-service', () => ({
  eventsService: {
    createCalendarSubscription: jest.fn(),
    getCalendarSubscriptions: jest.fn(),
    revokeCalendarSubscription: jest.fn(),
  },
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('CalendarSubscriptionModal', () => {
  const mockSubscription = {
    token: 'cal_test-token-123',
    userId: 'user-001',
    artistId: 'artist-456',
    scope: 'full' as const,
    createdAt: '2025-06-01T10:00:00Z',
    lastUsedAt: '2025-06-10T15:00:00Z',
    revokedAt: null,
    subscriptionUrl: 'https://api.bndy.co.uk/api/calendar/ical/cal_test-token-123',
    webcalUrl: 'webcal://api.bndy.co.uk/api/calendar/ical/cal_test-token-123',
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (eventsService.getCalendarSubscriptions as jest.Mock).mockResolvedValue({
      subscriptions: [],
    });
  });

  it('should render the modal when open', () => {
    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Calendar Sync')).toBeInTheDocument();
  });

  it('should not render content when closed', () => {
    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Calendar Sync')).not.toBeInTheDocument();
  });

  it('should show scope selector', () => {
    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('All Events')).toBeInTheDocument();
    expect(screen.getByText('Public Only')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('should generate subscription when button is clicked', async () => {
    (eventsService.createCalendarSubscription as jest.Mock).mockResolvedValue(mockSubscription);

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByTestId('generate-subscription-button'));

    await waitFor(() => {
      expect(eventsService.createCalendarSubscription).toHaveBeenCalledWith('artist-456', 'full');
    });
  });

  it('should generate subscription with selected scope', async () => {
    (eventsService.createCalendarSubscription as jest.Mock).mockResolvedValue({
      ...mockSubscription,
      scope: 'public',
    });

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    // Select "Public Only" scope
    fireEvent.click(screen.getByText('Public Only'));
    fireEvent.click(screen.getByTestId('generate-subscription-button'));

    await waitFor(() => {
      expect(eventsService.createCalendarSubscription).toHaveBeenCalledWith('artist-456', 'public');
    });
  });

  it('should display generated subscription URL', async () => {
    (eventsService.createCalendarSubscription as jest.Mock).mockResolvedValue(mockSubscription);

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByTestId('generate-subscription-button'));

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockSubscription.webcalUrl)).toBeInTheDocument();
    });
  });

  it('should copy webcal URL to clipboard', async () => {
    (eventsService.createCalendarSubscription as jest.Mock).mockResolvedValue(mockSubscription);
    mockWriteText.mockResolvedValue(undefined);

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByTestId('generate-subscription-button'));

    await waitFor(() => {
      expect(screen.getByTestId('copy-url-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('copy-url-button'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockSubscription.webcalUrl);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Copied to clipboard',
      })
    );
  });

  it('should load existing subscriptions when modal opens', async () => {
    (eventsService.getCalendarSubscriptions as jest.Mock).mockResolvedValue({
      subscriptions: [mockSubscription],
    });

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(eventsService.getCalendarSubscriptions).toHaveBeenCalledWith('artist-456');
    });
  });

  it('should display existing subscriptions', async () => {
    (eventsService.getCalendarSubscriptions as jest.Mock).mockResolvedValue({
      subscriptions: [mockSubscription],
    });

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Active Subscriptions')).toBeInTheDocument();
    });

    // Should show the scope
    expect(screen.getByText('Full')).toBeInTheDocument();
  });

  it('should revoke subscription when revoke button is clicked', async () => {
    (eventsService.getCalendarSubscriptions as jest.Mock).mockResolvedValue({
      subscriptions: [mockSubscription],
    });
    (eventsService.revokeCalendarSubscription as jest.Mock).mockResolvedValue(undefined);

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('revoke-subscription-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('revoke-subscription-button'));

    await waitFor(() => {
      expect(eventsService.revokeCalendarSubscription).toHaveBeenCalledWith(
        'artist-456',
        'cal_test-token-123'
      );
    });
  });

  it('should show instructions accordion', () => {
    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('How to add to your calendar')).toBeInTheDocument();
  });

  it('should expand Google Calendar instructions when clicked', async () => {
    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('How to add to your calendar'));

    await waitFor(() => {
      expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Google Calendar'));

    await waitFor(() => {
      expect(screen.getByText(/Open Google Calendar/i)).toBeInTheDocument();
    });
  });

  it('should be disabled when no artistId is provided', () => {
    render(
      <CalendarSubscriptionModal
        artistId={null}
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('generate-subscription-button')).toBeDisabled();
  });

  it('should show loading state while generating', async () => {
    // Delay the resolution to test loading state
    (eventsService.createCalendarSubscription as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockSubscription), 100))
    );

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByTestId('generate-subscription-button'));

    expect(screen.getByTestId('generate-subscription-button')).toBeDisabled();
  });

  it('should handle error when generating subscription fails', async () => {
    (eventsService.createCalendarSubscription as jest.Mock).mockRejectedValue(
      new Error('Failed to create subscription')
    );

    render(
      <CalendarSubscriptionModal
        artistId="artist-456"
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByTestId('generate-subscription-button'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to create subscription',
          variant: 'destructive',
        })
      );
    });
  });
});
