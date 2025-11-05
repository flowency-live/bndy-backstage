import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, AlertCircle, CheckCircle2, X } from 'lucide-react';
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
    nameVariants?: string[];
  }) => Promise<void>;
}

export default function VenueAddModal({
  open,
  onClose,
  onSave,
}: VenueAddModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [existingVenue, setExistingVenue] = useState<any>(null);
  const [newOtherName, setNewOtherName] = useState('');
  const [nameVariants, setNameVariants] = useState<string[]>([]);
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

  const handleVenueSelect = (placeId: string, name: string, address: string, location?: { lat: number; lng: number }, venue?: any) => {
    // If an existing venue was selected from BNDY database
    if (venue) {
      setExistingVenue(venue);
      setFormData({
        name: venue.name || '',
        address: venue.address || '',
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
        title: 'Venue Already Exists',
        description: `"${venue.name}" is already in the database. Please select a different venue or search again.`,
        variant: 'destructive',
      });
      return;
    }

    // Clear existing venue warning
    setExistingVenue(null);

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
    // Check for existing venue
    if (existingVenue) {
      toast({
        title: 'Cannot Add Duplicate',
        description: `"${existingVenue.name}" already exists in the database.`,
        variant: 'destructive',
      });
      return;
    }

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
        nameVariants: nameVariants.length > 0 ? nameVariants : undefined,
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
      setExistingVenue(null);
      setNameVariants([]);
      setNewOtherName('');

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
      setExistingVenue(null);
      setNameVariants([]);
      setNewOtherName('');
      onClose();
    }
  };

  const handleAddOtherName = () => {
    if (!newOtherName.trim()) return;

    if (nameVariants.includes(newOtherName.trim())) {
      toast({
        title: 'Duplicate Name',
        description: 'This name already exists in the list',
        variant: 'destructive',
      });
      return;
    }

    setNameVariants([...nameVariants, newOtherName.trim()]);
    setNewOtherName('');
  };

  const handleRemoveOtherName = (nameToRemove: string) => {
    setNameVariants(nameVariants.filter(name => name !== nameToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOtherName();
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
            Search for a venue - BNDY database will be checked first to prevent duplicates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Duplicate Warning */}
          {existingVenue && (
            <div className="p-4 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                    Venue Already Exists
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                    "{existingVenue.name}" is already in the BNDY database. Please select a different venue from Google Places.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Google Place Lookup - Primary Field */}
          <div>
            <Label htmlFor="venue-place" className="text-base font-semibold">
              Search Venues <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Searches BNDY database first, then Google Places
            </p>
            <VenueAutocomplete
              value=""
              onChange={handleVenueSelect}
              placeholder="Search for venue..."
            />
            {formData.googlePlaceId && !existingVenue && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Valid Google Place selected
              </p>
            )}
          </div>

          {/* Venue Name */}
          <div>
            <Label htmlFor="venue-name">
              Venue Name (Official) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="venue-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter venue name"
              disabled={!!existingVenue}
            />
          </div>

          {/* Also Known As / Other Names */}
          <div>
            <Label htmlFor="other-names">Also Known As (Alternative Names)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add local or unofficial names that people use to refer to this venue (e.g., "Dog and Rot" for "Leek Working Mens Club")
            </p>

            {/* Display existing name variants as tags */}
            {nameVariants.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {nameVariants.map((name, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOtherName(name)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                      disabled={!!existingVenue}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input to add new name */}
            <div className="flex gap-2">
              <Input
                id="other-names"
                value={newOtherName}
                onChange={(e) => setNewOtherName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter alternative name and press Enter"
                disabled={!!existingVenue}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddOtherName}
                disabled={!newOtherName.trim() || !!existingVenue}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
              disabled={!!existingVenue}
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
                disabled={!!existingVenue}
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
                disabled={!!existingVenue}
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
                disabled={!!existingVenue}
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
                disabled={!!existingVenue}
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
                disabled={!!existingVenue}
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
            disabled={saving || !!existingVenue}
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
