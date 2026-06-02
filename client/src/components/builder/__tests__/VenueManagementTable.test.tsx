import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VenueManagementTable from '../VenueManagementTable';
import type { BuilderVenueWithDetails } from '../VenueManagementTable';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Test data
const mockVenues: BuilderVenueWithDetails[] = [
  {
    id: 'bv1',
    builder_id: 'builder-1',
    venue_id: 'v1',
    selection: 'auto',
    featured: false,
    created_at: '2026-01-01T00:00:00Z',
    venue: {
      id: 'v1',
      name: 'The Lion Inn',
      address: '123 High Street',
      city: 'Congleton',
      latitude: 53.162,
      longitude: -2.212,
    },
    event_count: 12,
    last_event_date: '2026-05-15',
    standard_fee: '£150',
    payment_terms: 'Cash on night',
    notes: 'Great venue with outdoor stage',
    contact_name: 'John Smith',
    contact_email: 'john@lioninn.co.uk',
    contact_phone: '07700 900123',
  },
  {
    id: 'bv2',
    builder_id: 'builder-1',
    venue_id: 'v2',
    selection: 'auto',
    featured: true,
    created_at: '2026-01-01T00:00:00Z',
    venue: {
      id: 'v2',
      name: 'The Bear Head',
      address: '45 Market Square',
      city: 'Congleton',
      latitude: 53.158,
      longitude: -2.215,
    },
    event_count: 8,
    last_event_date: '2026-04-22',
    standard_fee: '£100',
    payment_terms: 'Invoice 7 days',
    notes: null,
    contact_name: 'Jane Doe',
    contact_email: null,
    contact_phone: null,
  },
  {
    id: 'bv3',
    builder_id: 'builder-1',
    venue_id: 'v3',
    selection: 'manual',
    featured: false,
    created_at: '2026-01-01T00:00:00Z',
    venue: {
      id: 'v3',
      name: 'Music Hall',
      address: '78 Station Road',
      city: 'Sandbach',
      latitude: 53.145,
      longitude: -2.365,
    },
    event_count: 0,
    last_event_date: null,
    standard_fee: null,
    payment_terms: null,
    notes: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
  },
];

describe('VenueManagementTable', () => {
  const mockOnVenueClick = vi.fn();
  const mockOnSort = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTable = (props: Partial<Parameters<typeof VenueManagementTable>[0]> = {}) => {
    const defaultProps = {
      venues: mockVenues,
      onVenueClick: mockOnVenueClick,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      onSort: mockOnSort,
    };
    return render(<VenueManagementTable {...defaultProps} {...props} />);
  };

  describe('rendering', () => {
    it('renders table with headers', () => {
      renderTable();

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /events/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /last event/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /fee/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /payment/i })).toBeInTheDocument();
    });

    it('renders venue names', () => {
      renderTable();

      expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
      expect(screen.getByText('The Bear Head')).toBeInTheDocument();
      expect(screen.getByText('Music Hall')).toBeInTheDocument();
    });

    it('renders event counts', () => {
      renderTable();

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders last event dates formatted', () => {
      renderTable();

      // UK date format: DD/MM/YYYY
      expect(screen.getByText(/15.*05.*2026|15\/05\/2026/)).toBeInTheDocument();
      expect(screen.getByText(/22.*04.*2026|22\/04\/2026/)).toBeInTheDocument();
    });

    it('renders dash for missing last event date', () => {
      renderTable();

      const rows = screen.getAllByRole('row');
      const musicHallRow = rows.find((row) => within(row).queryByText('Music Hall'));
      expect(musicHallRow).toBeInTheDocument();
      // Should show dashes for missing values
      const dashes = within(musicHallRow!).getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('renders standard fees', () => {
      renderTable();

      expect(screen.getByText('£150')).toBeInTheDocument();
      expect(screen.getByText('£100')).toBeInTheDocument();
    });

    it('renders dash for missing fee', () => {
      renderTable();

      const rows = screen.getAllByRole('row');
      const musicHallRow = rows.find((row) => within(row).queryByText('Music Hall'));
      // Should show dash for fee
      expect(within(musicHallRow!).getAllByText('-').length).toBeGreaterThanOrEqual(1);
    });

    it('renders payment terms', () => {
      renderTable();

      expect(screen.getByText('Cash on night')).toBeInTheDocument();
      expect(screen.getByText('Invoice 7 days')).toBeInTheDocument();
    });

    it('shows featured badge for featured venues', () => {
      renderTable();

      const bearHeadRow = screen.getByText('The Bear Head').closest('tr');
      expect(bearHeadRow).toBeInTheDocument();
      expect(within(bearHeadRow!).getByText(/featured/i)).toBeInTheDocument();
    });

    it('shows city in venue info', () => {
      renderTable();

      // Multiple venues are in Congleton
      expect(screen.getAllByText(/Congleton/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('empty state', () => {
    it('shows empty message when no venues', () => {
      renderTable({ venues: [] });

      expect(screen.getByText(/no venues/i)).toBeInTheDocument();
    });
  });

  describe('row interaction', () => {
    it('calls onVenueClick when row is clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      await user.click(lionInnRow!);

      expect(mockOnVenueClick).toHaveBeenCalledWith(mockVenues[0]);
    });

    it('calls onVenueClick with correct venue for different rows', async () => {
      const user = userEvent.setup();
      renderTable();

      const bearHeadRow = screen.getByText('The Bear Head').closest('tr');
      await user.click(bearHeadRow!);

      expect(mockOnVenueClick).toHaveBeenCalledWith(mockVenues[1]);
    });

    it('shows hover styling on rows', () => {
      renderTable();

      const lionInnRow = screen.getByText('The Lion Inn').closest('tr');
      expect(lionInnRow).toHaveClass('cursor-pointer');
    });
  });

  describe('sorting', () => {
    it('calls onSort when header is clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      await user.click(nameHeader);

      expect(mockOnSort).toHaveBeenCalledWith('name');
    });

    it('calls onSort with events when events header clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const eventsHeader = screen.getByRole('columnheader', { name: /events/i });
      await user.click(eventsHeader);

      expect(mockOnSort).toHaveBeenCalledWith('event_count');
    });

    it('calls onSort with last_event_date when last event header clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const lastEventHeader = screen.getByRole('columnheader', { name: /last event/i });
      await user.click(lastEventHeader);

      expect(mockOnSort).toHaveBeenCalledWith('last_event_date');
    });

    it('shows sort indicator on active sort column', () => {
      renderTable({ sortBy: 'name', sortOrder: 'asc' });

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(nameHeader).toHaveAttribute('data-sorted', 'asc');
    });

    it('shows descending sort indicator', () => {
      renderTable({ sortBy: 'event_count', sortOrder: 'desc' });

      const eventsHeader = screen.getByRole('columnheader', { name: /events/i });
      expect(eventsHeader).toHaveAttribute('data-sorted', 'desc');
    });
  });

  describe('loading state', () => {
    it('shows loading skeleton when loading', () => {
      renderTable({ isLoading: true });

      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
    });
  });
});
