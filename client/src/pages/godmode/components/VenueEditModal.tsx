import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Save, X, Plus } from 'lucide-react';
import VenueAutocomplete from '@/components/ui/venue-autocomplete';
import { useToast } from '@/hooks/use-toast';
import type { Venue } from '@/types/api';

interface VenueEditModalProps {
  open: boolean;
  onClose: () => void;
  venues: Venue[];
  currentIndex: number;
  onSave: (venue: Venue) => Promise<void>;
  onNavigate: (index: number) => void;
}

export default function VenueEditModal({
  open,
  onClose,
  venues,
  currentIndex,
  onSave,
  onNavigate,
}: VenueEditModalProps) {
  const { toast } = useToast();
  const [editForm, setEditForm] = useState<Venue | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newOtherName, setNewOtherName] = useState('');

  const currentVenue = venues[currentIndex];

  // Initialize form when venue changes
  useEffect(() => {
    if (currentVenue) {
      setEditForm({ ...currentVenue });
      setHasChanges(false);
    }
  }, [currentVenue]);

  // Helper to extract social URLs
  const getSocialUrl = (platform: string): string => {
    if (!editForm) return '';

    // Check direct properties first
    if (platform === 'website' && editForm.website) return editForm.website;
    if (platform === 'facebook' && editForm.facebookUrl) return editForm.facebookUrl;
    if (platform === 'instagram' && editForm.instagramUrl) return editForm.instagramUrl;

    // Check socialMediaUrls array
    if (editForm.socialMediaUrls && Array.isArray(editForm.socialMediaUrls)) {
      const found = editForm.socialMediaUrls.find((item: any) =>
        typeof item === 'object' && item.platform === platform
      );
      if (found && typeof found === 'object' && 'url' in found) {
        return found.url as string;
      }

      // Also check if it's just an array of URL strings
      const urlString = editForm.socialMediaUrls.find((url: any) =>
        typeof url === 'string' && (
          (platform === 'facebook' && url.includes('facebook.com')) ||
          (platform === 'instagram' && url.includes('instagram.com'))
        )
      );
      if (urlString) return urlString as string;
    }

    return '';
  };

  // Helper to update social URLs
  const updateSocialUrl = (platform: string, url: string) => {
    if (!editForm) return;

    const updated = { ...editForm };

    // Update direct properties
    if (platform === 'website') updated.website = url || undefined;
    if (platform === 'facebook') updated.facebookUrl = url || undefined;
    if (platform === 'instagram') updated.instagramUrl = url || undefined;

    // Update socialMediaUrls array
    const socialArray = Array.isArray(updated.socialMediaUrls) ? [...updated.socialMediaUrls] : [];
    const existingIndex = socialArray.findIndex((item: any) =>
      typeof item === 'object' && item.platform === platform
    );

    if (url) {
      const socialItem = { platform, url };
      if (existingIndex >= 0) {
        socialArray[existingIndex] = socialItem;
      } else {
        socialArray.push(socialItem);
      }
    } else {
      // Remove if empty
      if (existingIndex >= 0) {
        socialArray.splice(existingIndex, 1);
      }
    }

    updated.socialMediaUrls = socialArray;

    setEditForm(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!editForm || !hasChanges) return;

    setSaving(true);
    try {
      await onSave(editForm);
      setHasChanges(false);
      toast({
        title: 'Venue updated',
        description: 'Changes saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving venue',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = async (newIndex: number) => {
    // Auto-save if there are changes
    if (hasChanges && editForm) {
      setSaving(true);
      try {
        await onSave(editForm);
        setHasChanges(false);
      } catch (error: any) {
        toast({
          title: 'Error saving changes',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
        setSaving(false);
        return; // Don't navigate if save failed
      } finally {
        setSaving(false);
      }
    }

    onNavigate(newIndex);
  };

  const handleVenueSelect = (placeId: string, name: string, address: string) => {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      googlePlaceId: placeId,
      name: name || editForm.name,
      address: address || editForm.address,
    });
    setHasChanges(true);
  };

  const handleAddOtherName = () => {
    if (!editForm || !newOtherName.trim()) return;

    const nameVariants = editForm.nameVariants || [];
    if (nameVariants.includes(newOtherName.trim())) {
      toast({
        title: 'Duplicate Name',
        description: 'This name already exists in the list',
        variant: 'destructive',
      });
      return;
    }

    setEditForm({
      ...editForm,
      nameVariants: [...nameVariants, newOtherName.trim()],
    });
    setNewOtherName('');
    setHasChanges(true);
  };

  const handleRemoveOtherName = (nameToRemove: string) => {
    if (!editForm) return;

    const nameVariants = editForm.nameVariants || [];
    setEditForm({
      ...editForm,
      nameVariants: nameVariants.filter(name => name !== nameToRemove),
    });
    setHasChanges(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOtherName();
    }
  };

  if (!editForm) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === venues.length - 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Venue ({currentIndex + 1} of {venues.length})</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleNavigate(currentIndex - 1)}
                disabled={isFirst || saving}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleNavigate(currentIndex + 1)}
                disabled={isLast || saving}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Update venue details including name, address, and social media links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Venue Name */}
          <div>
            <Label htmlFor="venue-name">Venue Name (Official)</Label>
            <Input
              id="venue-name"
              value={editForm.name || ''}
              onChange={(e) => {
                setEditForm({ ...editForm, name: e.target.value });
                setHasChanges(true);
              }}
              placeholder="Enter venue name"
            />
          </div>

          {/* Also Known As / Other Names */}
          <div>
            <Label htmlFor="other-names">Also Known As (Alternative Names)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add local or unofficial names that people use to refer to this venue (e.g., "Dog and Rot" for "Leek Working Mens Club")
            </p>

            {/* Display existing name variants as tags */}
            {editForm.nameVariants && editForm.nameVariants.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {editForm.nameVariants.map((name, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOtherName(name)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
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
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddOtherName}
                disabled={!newOtherName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current Address (Read-only) */}
          <div>
            <Label htmlFor="venue-address">Current Address (Read-only)</Label>
            <Input
              id="venue-address"
              value={editForm.address || 'No address set'}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>

          {/* Google Place Lookup */}
          <div>
            <Label htmlFor="venue-place">Google Place Lookup</Label>
            <VenueAutocomplete
              value=""
              onChange={handleVenueSelect}
              placeholder="Search for venue on Google Places..."
            />
            {editForm.googlePlaceId && (
              <p className="text-xs text-muted-foreground mt-1">
                Place ID: {editForm.googlePlaceId}
              </p>
            )}
          </div>

          {/* Social Media URLs */}
          <div className="space-y-3">
            <Label>Social Media Links</Label>

            <div>
              <Label htmlFor="venue-website" className="text-sm text-muted-foreground">
                Website
              </Label>
              <Input
                id="venue-website"
                type="url"
                value={getSocialUrl('website')}
                onChange={(e) => updateSocialUrl('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="venue-facebook" className="text-sm text-muted-foreground">
                Facebook
              </Label>
              <Input
                id="venue-facebook"
                type="url"
                value={getSocialUrl('facebook')}
                onChange={(e) => updateSocialUrl('facebook', e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <Label htmlFor="venue-instagram" className="text-sm text-muted-foreground">
                Instagram
              </Label>
              <Input
                id="venue-instagram"
                type="url"
                value={getSocialUrl('instagram')}
                onChange={(e) => updateSocialUrl('instagram', e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
          </div>
        </div>

        {/* Footer with Save */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            variant="default"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
