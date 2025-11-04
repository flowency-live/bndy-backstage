import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import VenueAutocomplete from '@/components/ui/venue-autocomplete';
import { useToast } from '@/hooks/use-toast';

interface VenueAddModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (venueData: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    googlePlaceId: string;
    website?: string;
    phone?: string;
    postcode?: string;
    socialMediaUrls?: string[];
  }) => Promise<void>;
}

export default function VenueAddModal({
  open,
  onClose,
  onSave,
}: VenueAddModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    googlePlaceId: '',
    website: '',
    phone: '',
    postcode: '',
    facebook: '',
    instagram: '',
  });

  const handleVenueSelect = (placeId: string, name: string, address: string, location?: { lat: number; lng: number }) => {
    setFormData({
      ...formData,
      googlePlaceId: placeId,
      name: name || formData.name,
      address: address || formData.address,
      latitude: location?.lat || 0,
      longitude: location?.lng || 0,
    });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Venue name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.address.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Address is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.googlePlaceId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a venue from Google Places',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Build social media URLs array
      const socialMediaUrls: string[] = [];
      if (formData.facebook.trim()) socialMediaUrls.push(formData.facebook.trim());
      if (formData.instagram.trim()) socialMediaUrls.push(formData.instagram.trim());

      await onSave({
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        googlePlaceId: formData.googlePlaceId,
        website: formData.website.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        postcode: formData.postcode.trim() || undefined,
        socialMediaUrls: socialMediaUrls.length > 0 ? socialMediaUrls : undefined,
      });

      // Reset form
      setFormData({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        googlePlaceId: '',
        website: '',
        phone: '',
        postcode: '',
        facebook: '',
        instagram: '',
      });

      toast({
        title: 'Venue created',
        description: 'New venue has been added successfully',
      });

      onClose();
    } catch (error: any) {
      toast({
        title: 'Error creating venue',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      // Reset form on close
      setFormData({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        googlePlaceId: '',
        website: '',
        phone: '',
        postcode: '',
        facebook: '',
        instagram: '',
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Venue
          </DialogTitle>
          <DialogDescription>
            Search for a venue on Google Places and add it to the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Google Place Lookup - Primary Field */}
          <div>
            <Label htmlFor="venue-place" className="text-base font-semibold">
              Search Google Places <span className="text-destructive">*</span>
            </Label>
            <VenueAutocomplete
              value=""
              onChange={handleVenueSelect}
              placeholder="Search for venue on Google Places..."
            />
            {formData.googlePlaceId && (
              <p className="text-xs text-muted-foreground mt-1">
                Place ID: {formData.googlePlaceId}
              </p>
            )}
          </div>

          {/* Venue Name */}
          <div>
            <Label htmlFor="venue-name">
              Venue Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="venue-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter venue name"
            />
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="venue-address">
              Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="venue-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full address"
            />
          </div>

          {/* Optional Fields */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm text-muted-foreground">Optional Information</Label>

            {/* Phone */}
            <div>
              <Label htmlFor="venue-phone" className="text-sm">
                Phone
              </Label>
              <Input
                id="venue-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+44 1234 567890"
              />
            </div>

            {/* Postcode */}
            <div>
              <Label htmlFor="venue-postcode" className="text-sm">
                Postcode
              </Label>
              <Input
                id="venue-postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="SW1A 1AA"
              />
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="venue-website" className="text-sm">
                Website
              </Label>
              <Input
                id="venue-website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            {/* Facebook */}
            <div>
              <Label htmlFor="venue-facebook" className="text-sm">
                Facebook
              </Label>
              <Input
                id="venue-facebook"
                type="url"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="https://facebook.com/..."
              />
            </div>

            {/* Instagram */}
            <div>
              <Label htmlFor="venue-instagram" className="text-sm">
                Instagram
              </Label>
              <Input
                id="venue-instagram"
                type="url"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="https://instagram.com/..."
              />
            </div>
          </div>
        </div>

        {/* Footer with Save */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="default"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Venue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
