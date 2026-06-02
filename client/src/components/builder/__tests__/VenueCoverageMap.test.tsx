import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VenueCoverageMap from '../VenueCoverageMap';
import type { Venue, SelectionMode } from '../VenueCoverageMap';

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Mock Leaflet and react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Circle: ({ center, radius }: { center: [number, number]; radius: number }) => (
    <div data-testid="coverage-circle" data-center={JSON.stringify(center)} data-radius={radius} />
  ),
  Polygon: ({ positions }: { positions: [number, number][] }) => (
    <div data-testid="coverage-polygon" data-positions={JSON.stringify(positions)} />
  ),
  Marker: ({ position, eventHandlers }: { position: [number, number]; eventHandlers?: { click?: () => void } }) => (
    <div
      data-testid={`venue-marker-${position[0]}-${position[1]}`}
      onClick={eventHandlers?.click}
    />
  ),
  useMap: () => ({
    fitBounds: vi.fn(),
    setView: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }),
  useMapEvents: vi.fn(),
}));

// Mock postcodes.io fetch
const mockFetchPostcode = (lat: number, lng: number) => {
  vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
    if (typeof url === 'string' && url.includes('postcodes.io')) {
      return {
        ok: true,
        json: () => Promise.resolve({
          status: 200,
          result: { latitude: lat, longitude: lng },
        }),
      } as Response;
    }
    return { ok: false } as Response;
  });
};

// Test data
const mockVenues: Venue[] = [
  { id: 'v1', name: 'The Lion Inn', latitude: 53.162, longitude: -2.212 },
  { id: 'v2', name: 'The Bear Head', latitude: 53.158, longitude: -2.215 },
  { id: 'v3', name: 'Music Hall', latitude: 53.481, longitude: -2.243 },
  { id: 'v4', name: 'The Crown', latitude: 53.145, longitude: -2.365 },
  { id: 'v5', name: 'Distant Venue', latitude: 51.507, longitude: -0.128 },
];

describe('VenueCoverageMap', () => {
  const mockOnSelectionChange = vi.fn();
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPostcode(53.162, -2.213);
  });

  const renderMap = (props: Partial<Parameters<typeof VenueCoverageMap>[0]> = {}) => {
    const defaultProps = {
      venues: mockVenues,
      selectedVenueIds: [],
      onSelectionChange: mockOnSelectionChange,
      mode: 'radius' as SelectionMode,
      onModeChange: mockOnModeChange,
      postcode: '',
      radiusMiles: 10,
    };
    return render(<VenueCoverageMap {...defaultProps} {...props} />);
  };

  describe('rendering', () => {
    it('renders map container', () => {
      renderMap();
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('renders tile layer', () => {
      renderMap();
      expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    });

    it('renders markers for all venues', () => {
      renderMap();
      mockVenues.forEach((venue) => {
        expect(
          screen.getByTestId(`venue-marker-${venue.latitude}-${venue.longitude}`)
        ).toBeInTheDocument();
      });
    });

    it('renders circle when mode is radius and postcode is set', async () => {
      renderMap({
        mode: 'radius',
        postcode: 'CW12 1AB',
        radiusMiles: 10,
      });

      await waitFor(() => {
        expect(screen.getByTestId('coverage-circle')).toBeInTheDocument();
      });
    });

    it('renders polygon when mode is polygon and polygon is defined', () => {
      const polygon: [number, number][] = [
        [53.2, -2.3],
        [53.2, -2.1],
        [53.1, -2.1],
        [53.1, -2.3],
      ];
      renderMap({
        mode: 'polygon',
        polygon,
      });

      expect(screen.getByTestId('coverage-polygon')).toBeInTheDocument();
    });
  });

  describe('mode: radius selection', () => {
    it('does not show circle when postcode is empty', () => {
      renderMap({
        mode: 'radius',
        postcode: '',
        radiusMiles: 10,
      });

      expect(screen.queryByTestId('coverage-circle')).not.toBeInTheDocument();
    });

    it('resolves postcode to coordinates', async () => {
      mockFetchPostcode(53.162, -2.213);

      renderMap({
        mode: 'radius',
        postcode: 'CW12 1AB',
        radiusMiles: 10,
      });

      await waitFor(() => {
        const circle = screen.getByTestId('coverage-circle');
        const center = JSON.parse(circle.dataset.center || '[]');
        expect(center[0]).toBeCloseTo(53.162, 1);
        expect(center[1]).toBeCloseTo(-2.213, 1);
      });
    });

    it('calculates radius in meters for Leaflet circle', async () => {
      renderMap({
        mode: 'radius',
        postcode: 'CW12 1AB',
        radiusMiles: 10,
      });

      await waitFor(() => {
        const circle = screen.getByTestId('coverage-circle');
        const radiusMeters = Number(circle.dataset.radius);
        // 10 miles = ~16093 meters
        expect(radiusMeters).toBeGreaterThan(16000);
        expect(radiusMeters).toBeLessThan(16200);
      });
    });

    it('calls onSelectionChange with venues inside radius', async () => {
      renderMap({
        mode: 'radius',
        postcode: 'CW12 1AB',
        radiusMiles: 5,
      });

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
      });

      // Venues within 5 miles of Congleton (53.162, -2.213)
      const lastCall = mockOnSelectionChange.mock.calls.at(-1);
      const selectedIds = lastCall?.[0] || [];
      // v1 and v2 are very close, should be included
      expect(selectedIds).toContain('v1');
      expect(selectedIds).toContain('v2');
      // v3 (Manchester) is ~22 miles away, should be excluded
      expect(selectedIds).not.toContain('v3');
      // v5 (London) is very far, should be excluded
      expect(selectedIds).not.toContain('v5');
    });

    it('updates selection when radius changes', async () => {
      const { rerender } = renderMap({
        mode: 'radius',
        postcode: 'CW12 1AB',
        radiusMiles: 5,
      });

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      // Increase radius to include more venues
      rerender(
        <VenueCoverageMap
          venues={mockVenues}
          selectedVenueIds={['v1', 'v2']}
          onSelectionChange={mockOnSelectionChange}
          mode="radius"
          onModeChange={mockOnModeChange}
          postcode="CW12 1AB"
          radiusMiles={15}
        />
      );

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
      });
    });
  });

  describe('mode: polygon selection', () => {
    it('does not render polygon when polygon array is empty', () => {
      renderMap({
        mode: 'polygon',
        polygon: [],
      });

      expect(screen.queryByTestId('coverage-polygon')).not.toBeInTheDocument();
    });

    it('calls onSelectionChange with venues inside polygon', () => {
      // Polygon around Congleton area
      const polygon: [number, number][] = [
        [53.2, -2.3],
        [53.2, -2.1],
        [53.1, -2.1],
        [53.1, -2.3],
      ];

      renderMap({
        mode: 'polygon',
        polygon,
      });

      expect(mockOnSelectionChange).toHaveBeenCalled();
      const lastCall = mockOnSelectionChange.mock.calls.at(-1);
      const selectedIds = lastCall?.[0] || [];
      // v1 and v2 are inside the polygon
      expect(selectedIds).toContain('v1');
      expect(selectedIds).toContain('v2');
      // v3 (Manchester) is outside
      expect(selectedIds).not.toContain('v3');
    });
  });

  describe('mode: individual click selection', () => {
    it('calls onSelectionChange when venue marker is clicked', async () => {
      const user = userEvent.setup();

      renderMap({
        mode: 'individual',
        selectedVenueIds: [],
      });

      const marker = screen.getByTestId(`venue-marker-${mockVenues[0].latitude}-${mockVenues[0].longitude}`);
      await user.click(marker);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining(['v1'])
      );
    });

    it('toggles venue off when clicking already selected venue', async () => {
      const user = userEvent.setup();

      renderMap({
        mode: 'individual',
        selectedVenueIds: ['v1', 'v2'],
      });

      const marker = screen.getByTestId(`venue-marker-${mockVenues[0].latitude}-${mockVenues[0].longitude}`);
      await user.click(marker);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        expect.not.arrayContaining(['v1'])
      );
      // v2 should still be selected
      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining(['v2'])
      );
    });
  });

  describe('visual styling', () => {
    it('shows selected venues with different styling', () => {
      renderMap({
        selectedVenueIds: ['v1', 'v3'],
      });

      // The marker component should receive isSelected prop
      // In the real implementation, this would affect the marker icon
      expect(
        screen.getByTestId(`venue-marker-${mockVenues[0].latitude}-${mockVenues[0].longitude}`)
      ).toBeInTheDocument();
    });
  });

  describe('map controls integration', () => {
    it('renders mode selector buttons', () => {
      renderMap();

      expect(screen.getByRole('button', { name: /radius/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /draw/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /individual/i })).toBeInTheDocument();
    });

    it('calls onModeChange when mode button is clicked', async () => {
      const user = userEvent.setup();

      renderMap({ mode: 'radius' });

      const drawButton = screen.getByRole('button', { name: /draw/i });
      await user.click(drawButton);

      expect(mockOnModeChange).toHaveBeenCalledWith('polygon');
    });

    it('highlights active mode button', () => {
      renderMap({ mode: 'radius' });

      const radiusButton = screen.getByRole('button', { name: /radius/i });
      expect(radiusButton).toHaveAttribute('data-active', 'true');
    });
  });

  describe('radius controls', () => {
    it('renders postcode input when in radius mode', () => {
      renderMap({ mode: 'radius' });

      expect(screen.getByPlaceholderText(/postcode/i)).toBeInTheDocument();
    });

    it('renders radius slider when in radius mode', () => {
      renderMap({ mode: 'radius' });

      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('does not render radius controls when in polygon mode', () => {
      renderMap({ mode: 'polygon' });

      expect(screen.queryByPlaceholderText(/postcode/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });
  });

  describe('polygon drawing', () => {
    it('shows drawing instructions when in polygon mode', () => {
      renderMap({ mode: 'polygon' });

      expect(screen.getByText(/click on the map/i)).toBeInTheDocument();
    });

    it('shows clear button when polygon has points', () => {
      const polygon: [number, number][] = [
        [53.2, -2.3],
        [53.2, -2.1],
        [53.1, -2.1],
      ];

      renderMap({ mode: 'polygon', polygon });

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });
  });

  describe('selected count display', () => {
    it('shows count of selected venues', () => {
      renderMap({ selectedVenueIds: ['v1', 'v2', 'v3'] });

      expect(screen.getByText(/3.*selected/i)).toBeInTheDocument();
    });

    it('shows singular when one venue selected', () => {
      renderMap({ selectedVenueIds: ['v1'] });

      expect(screen.getByText(/1.*venue.*selected/i)).toBeInTheDocument();
    });

    it('shows zero when no venues selected', () => {
      renderMap({ selectedVenueIds: [] });

      expect(screen.getByText(/0.*venues.*selected/i)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error when postcode lookup fails', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: false,
          json: () => Promise.resolve({ status: 404 }),
        } as Response;
      });

      renderMap({
        mode: 'radius',
        postcode: 'INVALID',
        radiusMiles: 10,
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid postcode/i)).toBeInTheDocument();
      });
    });
  });
});
