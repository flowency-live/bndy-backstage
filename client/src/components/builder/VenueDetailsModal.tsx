import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar, MapPin } from 'lucide-react';
import type { BuilderVenueWithDetails } from './VenueManagementTable';

export interface VenueDetailsModalProps {
  venue: BuilderVenueWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<BuilderVenueWithDetails>) => void;
  isSaving: boolean;
}

// Email validation regex
const isValidEmail = (email: string): boolean => {
  if (!email) return true; // Empty is valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format date to UK format
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'No events yet';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function VenueDetailsModal({
  venue,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: VenueDetailsModalProps) {
  // Form state
  const [standardFee, setStandardFee] = useState(venue.standard_fee || '');
  const [paymentTerms, setPaymentTerms] = useState(venue.payment_terms || '');
  const [notes, setNotes] = useState(venue.notes || '');
  const [contactName, setContactName] = useState(venue.contact_name || '');
  const [contactEmail, setContactEmail] = useState(venue.contact_email || '');
  const [contactPhone, setContactPhone] = useState(venue.contact_phone || '');
  const [featured, setFeatured] = useState(venue.featured);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Reset form when venue changes
  useEffect(() => {
    setStandardFee(venue.standard_fee || '');
    setPaymentTerms(venue.payment_terms || '');
    setNotes(venue.notes || '');
    setContactName(venue.contact_name || '');
    setContactEmail(venue.contact_email || '');
    setContactPhone(venue.contact_phone || '');
    setFeatured(venue.featured);
    setEmailError(null);
  }, [venue]);

  const handleSave = () => {
    // Validate email
    if (contactEmail && !isValidEmail(contactEmail)) {
      setEmailError('Invalid email format');
      return;
    }

    setEmailError(null);
    onSave({
      standard_fee: standardFee || null,
      payment_terms: paymentTerms || null,
      notes: notes || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      featured,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{venue.venue.name}</DialogTitle>
          <DialogDescription className="space-y-1">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{venue.venue.address}</span>
            </div>
            <div>{venue.venue.city}</div>
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="flex gap-6 py-4 border-y">
          <div className="text-sm">
            <div className="font-semibold">{venue.event_count}</div>
            <div className="text-muted-foreground">
              {venue.event_count === 1 ? 'event' : 'events'}
            </div>
          </div>
          <div className="text-sm">
            <div className="font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(venue.last_event_date)}
            </div>
            <div className="text-muted-foreground">last event</div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Featured toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="featured" className="cursor-pointer">
              Featured venue
            </Label>
            <Switch
              id="featured"
              aria-label="Featured"
              checked={featured}
              onCheckedChange={setFeatured}
            />
          </div>

          {/* Standard fee */}
          <div className="space-y-2">
            <Label htmlFor="standardFee">Standard Fee</Label>
            <Input
              id="standardFee"
              value={standardFee}
              onChange={(e) => setStandardFee(e.target.value)}
              placeholder="e.g., £150 or £75 + 50% tips"
            />
          </div>

          {/* Payment terms */}
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g., Cash on night or Invoice 7 days"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about the venue..."
              rows={3}
            />
          </div>

          {/* Contact info */}
          <div className="space-y-4 pt-4 border-t">
            <div className="text-sm font-medium">Contact Information</div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Primary contact person"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="contact@venue.com"
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
