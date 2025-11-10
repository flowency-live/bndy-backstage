import { useState, useEffect } from 'react';
import { X, MapPin, Building, Phone, Navigation, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ArtistVenue } from '@/lib/services/venue-crm-service';

interface VenueEditPanelProps {
  venue: ArtistVenue | null;
  artistId: string;
  onClose: () => void;
  onSave: (updates: { customVenueName?: string; notes?: string }) => Promise<void>;
}

export default function VenueEditPanel({
  venue,
  artistId,
  onClose,
  onSave
}: VenueEditPanelProps) {
  const [customName, setCustomName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (venue) {
      setCustomName(venue.custom_venue_name || '');
      setNotes(venue.notes || '');
    }
  }, [venue]);

  if (!venue) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        customVenueName: customName || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save venue:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${venue.venue.address}, ${venue.venue.city || ''}`
  )}`;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[1001]"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-card shadow-xl z-[1002] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-serif font-bold text-foreground">
                {venue.custom_venue_name || venue.venue.name}
              </h2>
              {venue.custom_venue_name && (
                <p className="text-sm text-muted-foreground mt-1">
                  Official: {venue.venue.name}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {venue.managed_on_bndy && (
            <div className="inline-flex px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
              <Building className="w-4 h-4 mr-2" />
              On BNDY
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p>{venue.venue.address}</p>
                {venue.venue.city && <p>{venue.venue.city}</p>}
                {venue.venue.postcode && <p>{venue.venue.postcode}</p>}
              </div>
            </div>
            {venue.venue.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${venue.venue.phone}`} className="hover:underline">
                  {venue.venue.phone}
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Gigs</p>
              <p className="text-2xl font-bold">{venue.gigCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contacts</p>
              <p className="text-2xl font-bold">{venue.contactCount}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-name">Custom Venue Name</Label>
              <Input
                id="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={venue.venue.name}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this venue..."
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={handleSave} className="w-full" disabled={isSaving}>
              Save Changes
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(directionsUrl, '_blank')}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = `/artists/${artistId}/venues/${venue.venue_id}`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              View Gigs
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = `/artists/${artistId}/venues/${venue.venue_id}#contacts`}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Contacts
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
