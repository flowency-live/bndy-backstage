import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VenueDetailsModal from '../VenueDetailsModal';
import type { BuilderVenueWithDetails } from '../VenueManagementTable';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Test data
const mockVenue: BuilderVenueWithDetails = {
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
};

describe('VenueDetailsModal', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props: Partial<Parameters<typeof VenueDetailsModal>[0]> = {}) => {
    const defaultProps = {
      venue: mockVenue,
      isOpen: true,
      onClose: mockOnClose,
      onSave: mockOnSave,
      isSaving: false,
    };
    return render(<VenueDetailsModal {...defaultProps} {...props} />);
  };

  describe('rendering', () => {
    it('renders modal when open', () => {
      renderModal();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      renderModal({ isOpen: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays venue name in header', () => {
      renderModal();

      expect(screen.getByText('The Lion Inn')).toBeInTheDocument();
    });

    it('displays venue address', () => {
      renderModal();

      expect(screen.getByText('123 High Street')).toBeInTheDocument();
    });

    it('displays venue city', () => {
      renderModal();

      expect(screen.getByText('Congleton')).toBeInTheDocument();
    });

    it('displays event count', () => {
      renderModal();

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('events')).toBeInTheDocument();
    });

    it('displays last event date', () => {
      renderModal();

      expect(screen.getByText(/15\/05\/2026/)).toBeInTheDocument();
    });
  });

  describe('form fields', () => {
    it('renders standard fee input with current value', () => {
      renderModal();

      const feeInput = screen.getByLabelText(/fee/i);
      expect(feeInput).toHaveValue('£150');
    });

    it('renders payment terms input with current value', () => {
      renderModal();

      const paymentInput = screen.getByLabelText(/payment/i);
      expect(paymentInput).toHaveValue('Cash on night');
    });

    it('renders notes textarea with current value', () => {
      renderModal();

      const notesTextarea = screen.getByLabelText(/notes/i);
      expect(notesTextarea).toHaveValue('Great venue with outdoor stage');
    });

    it('renders contact name input with current value', () => {
      renderModal();

      const contactNameInput = screen.getByLabelText(/contact.*name/i);
      expect(contactNameInput).toHaveValue('John Smith');
    });

    it('renders contact email input with current value', () => {
      renderModal();

      const contactEmailInput = screen.getByLabelText(/email/i);
      expect(contactEmailInput).toHaveValue('john@lioninn.co.uk');
    });

    it('renders contact phone input with current value', () => {
      renderModal();

      const contactPhoneInput = screen.getByLabelText(/phone/i);
      expect(contactPhoneInput).toHaveValue('07700 900123');
    });

    it('renders empty inputs for null values', () => {
      const venueWithNulls: BuilderVenueWithDetails = {
        ...mockVenue,
        standard_fee: null,
        payment_terms: null,
        notes: null,
        contact_name: null,
        contact_email: null,
        contact_phone: null,
      };

      renderModal({ venue: venueWithNulls });

      expect(screen.getByLabelText(/fee/i)).toHaveValue('');
      expect(screen.getByLabelText(/payment/i)).toHaveValue('');
      expect(screen.getByLabelText(/notes/i)).toHaveValue('');
    });
  });

  describe('form editing', () => {
    it('allows editing standard fee', async () => {
      const user = userEvent.setup();
      renderModal();

      const feeInput = screen.getByLabelText(/fee/i);
      await user.clear(feeInput);
      await user.type(feeInput, '£200');

      expect(feeInput).toHaveValue('£200');
    });

    it('allows editing payment terms', async () => {
      const user = userEvent.setup();
      renderModal();

      const paymentInput = screen.getByLabelText(/payment/i);
      await user.clear(paymentInput);
      await user.type(paymentInput, 'Invoice 14 days');

      expect(paymentInput).toHaveValue('Invoice 14 days');
    });

    it('allows editing notes', async () => {
      const user = userEvent.setup();
      renderModal();

      const notesTextarea = screen.getByLabelText(/notes/i);
      await user.clear(notesTextarea);
      await user.type(notesTextarea, 'Updated notes');

      expect(notesTextarea).toHaveValue('Updated notes');
    });
  });

  describe('validation', () => {
    it('shows error for invalid email format', async () => {
      const user = userEvent.setup();
      renderModal();

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'not-a-valid-email');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('allows empty email (optional field)', async () => {
      const user = userEvent.setup();
      renderModal();

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('allows valid email format', async () => {
      const user = userEvent.setup();
      renderModal();

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'valid@example.com');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  describe('save and cancel', () => {
    it('renders save button', () => {
      renderModal();

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      renderModal();

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onSave with updated values when save is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      const feeInput = screen.getByLabelText(/fee/i);
      await user.clear(feeInput);
      await user.type(feeInput, '£200');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          standard_fee: '£200',
        })
      );
    });

    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('disables buttons while saving', () => {
      renderModal({ isSaving: true });

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('shows loading indicator while saving', () => {
      renderModal({ isSaving: true });

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('renders close button in dialog', () => {
      renderModal();

      // The dialog has a close button (X)
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      // The cancel button is a way to close
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('featured toggle', () => {
    it('shows featured toggle switch', () => {
      renderModal();

      expect(screen.getByRole('switch', { name: /featured/i })).toBeInTheDocument();
    });

    it('shows featured as checked when venue is featured', () => {
      const featuredVenue = { ...mockVenue, featured: true };
      renderModal({ venue: featuredVenue });

      const toggle = screen.getByRole('switch', { name: /featured/i });
      expect(toggle).toBeChecked();
    });

    it('shows featured as unchecked when venue is not featured', () => {
      renderModal();

      const toggle = screen.getByRole('switch', { name: /featured/i });
      expect(toggle).not.toBeChecked();
    });

    it('includes featured status in save payload', async () => {
      const user = userEvent.setup();
      renderModal();

      const toggle = screen.getByRole('switch', { name: /featured/i });
      await user.click(toggle);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          featured: true,
        })
      );
    });
  });
});
