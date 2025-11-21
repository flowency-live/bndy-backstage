import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Save, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { LocationSelector } from '@/components/ui/location-selector';
import { useToast } from '@/hooks/use-toast';
import type { Artist } from '@/lib/services/godmode-service';
import { GenreSelector } from '@/components/ui/genre-selector';
import { ArtistTypeSelector } from '@/components/ui/artist-type-selector';
import { ActTypeSelector } from '@/components/ui/act-type-selector';
import { searchLocationAutocomplete } from '@/lib/services/places-service';
import type { ArtistType, ActType } from '@/lib/constants/artist';
import { useGoogleMaps } from '@/components/providers/google-maps-provider';
import ImageUpload from '@/components/ui/image-upload';

interface ArtistEditModalProps {
  open: boolean;
  onClose: () => void;
  artists: Artist[];
  currentIndex: number;
  onSave: (artist: Artist) => Promise<void>;
  onNavigate: (index: number) => void;
  onDelete?: (artistId: string) => Promise<void>;
}

export default function ArtistEditModal({
  open,
  onClose,
  artists,
  currentIndex,
  onSave,
  onNavigate,
  onDelete,
}: ArtistEditModalProps) {
  const { toast } = useToast();
  const { isLoaded: googleMapsLoaded, loadGoogleMaps } = useGoogleMaps();
  const [editForm, setEditForm] = useState<Artist | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingImage, setRefreshingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentArtist = artists[currentIndex];

  // Initialize form when artist changes
  useEffect(() => {
    if (currentArtist) {
      console.log('[ArtistEditModal] Loading artist:', {
        id: currentArtist.id,
        name: currentArtist.name,
        artistType: currentArtist.artistType,
        actType: currentArtist.actType
      });
      setEditForm({ ...currentArtist });
      setHasChanges(false);
    }
  }, [currentArtist]);

  const handleSave = async () => {
    if (!editForm || !hasChanges) return;

    console.log('[ArtistEditModal] Saving artist:', {
      id: editForm.id,
      name: editForm.name,
      artistType: editForm.artistType,
      actType: editForm.actType,
      location: editForm.location,
      locationType: editForm.locationType
    });

    setSaving(true);
    try {
      await onSave(editForm);
      setHasChanges(false);
      toast({
        title: 'Artist updated',
        description: 'Changes saved successfully',
      });
      onClose(); // Close modal after successful save
    } catch (error: any) {
      toast({
        title: 'Error saving artist',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!editForm) return;

    setSaving(true);
    try {
      // Save with validated set to true
      const validatedForm = { ...editForm, validated: true };
      await onSave(validatedForm);
      setHasChanges(false);

      toast({
        title: 'Artist validated',
        description: 'Artist marked as validated successfully',
      });

      // Find next unvalidated artist
      const nextUnvalidatedIndex = artists.findIndex((artist, idx) =>
        idx > currentIndex && artist.validated !== true
      );

      if (nextUnvalidatedIndex >= 0) {
        // Navigate to next unvalidated artist
        onNavigate(nextUnvalidatedIndex);
      } else {
        // No more unvalidated artists
        toast({
          title: 'All done!',
          description: 'No more unvalidated artists in this list',
        });
        onClose();
      }
    } catch (error: any) {
      toast({
        title: 'Error validating artist',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editForm || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(editForm.id);

      toast({
        title: 'Artist deleted',
        description: 'Artist removed successfully',
      });

      // Find next unvalidated artist to navigate to
      const nextUnvalidatedIndex = artists.findIndex((artist, idx) =>
        idx > currentIndex && artist.validated !== true && artist.id !== editForm.id
      );

      if (nextUnvalidatedIndex >= 0) {
        // Navigate to next unvalidated artist
        onNavigate(nextUnvalidatedIndex);
      } else {
        // No more unvalidated artists, close modal
        onClose();
      }
    } catch (error: any) {
      toast({
        title: 'Error deleting artist',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
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

  const handleLocationChange = (location: string, locationType: 'national' | 'region' | 'city') => {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      location,
      locationType,
    });
    setHasChanges(true);
  };

  const handleCitySearch = async (query: string) => {
    // Load Google Maps if not already loaded
    if (!googleMapsLoaded) {
      await loadGoogleMaps();
    }

    const predictions = await searchLocationAutocomplete(query);
    return predictions.map(p => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text || '',
      secondary_text: p.structured_formatting?.secondary_text || '',
    }));
  };

  const handleGenresChange = (genres: string[]) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      genres,
    });
    setHasChanges(true);
  };

  const handleRefreshFacebookImage = async () => {
    if (!editForm?.id || !editForm.facebookUrl) {
      toast({
        title: 'No Facebook URL',
        description: 'Please add a Facebook URL first',
        variant: 'destructive',
      });
      return;
    }

    setRefreshingImage(true);
    try {
      const response = await fetch(`https://api.bndy.co.uk/api/artists/${editForm.id}/refresh-facebook-image`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh image');
      }

      const data = await response.json();

      // Update form with new image
      setEditForm({
        ...editForm,
        profileImageUrl: data.profileImageUrl,
      });
      setHasChanges(true);

      toast({
        title: 'Image refreshed',
        description: 'Facebook profile image updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error refreshing image',
        description: error.message || 'Could not fetch Facebook image',
        variant: 'destructive',
      });
    } finally {
      setRefreshingImage(false);
    }
  };

  if (!editForm) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === artists.length - 1;
  const selectedGenres = Array.isArray(editForm.genres) ? editForm.genres : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Artist ({currentIndex + 1} of {artists.length})</span>
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
            Update artist details including name, location, genres, and social media links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Artist Name */}
          <div>
            <Label htmlFor="artist-name">Artist Name</Label>
            <Input
              id="artist-name"
              value={editForm.name || ''}
              onChange={(e) => {
                setEditForm({ ...editForm, name: e.target.value });
                setHasChanges(true);
              }}
              placeholder="Enter artist name"
            />
          </div>

          {/* Profile Image */}
          <div>
            <Label>Profile Image</Label>
            <ImageUpload
              value={editForm.profileImageUrl || undefined}
              onChange={(url) => {
                setEditForm({ ...editForm, profileImageUrl: url || '' });
                setHasChanges(true);
              }}
              size="lg"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Upload a custom profile image or use the Facebook refresh button below
            </p>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="artist-location">Location</Label>
            <LocationSelector
              value={editForm.location || ''}
              onChange={handleLocationChange}
              onCitySearch={handleCitySearch}
              required
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="artist-bio">Bio</Label>
            <Textarea
              id="artist-bio"
              value={editForm.bio || ''}
              onChange={(e) => {
                setEditForm({ ...editForm, bio: e.target.value });
                setHasChanges(true);
              }}
              placeholder="Artist biography..."
              rows={4}
            />
          </div>

          {/* Event Count (Read-only) */}
          <div>
            <Label>Events</Label>
            <div className="text-sm text-muted-foreground">
              {editForm.eventCount || 0} total events
            </div>
          </div>

          {/* Genres */}
          <div>
            <Label>Genres</Label>
            <GenreSelector
              selectedGenres={selectedGenres}
              onChange={handleGenresChange}
            />
          </div>

          {/* Artist Type */}
          <div>
            <ArtistTypeSelector
              selectedType={editForm.artistType as ArtistType}
              onChange={(type) => {
                setEditForm({ ...editForm, artistType: type });
                setHasChanges(true);
              }}
              required
            />
          </div>

          {/* Act Type */}
          <div>
            <ActTypeSelector
              selectedTypes={(editForm.actType || []) as ActType[]}
              onChange={(types) => {
                setEditForm({ ...editForm, actType: types });
                setHasChanges(true);
              }}
            />
          </div>

          {/* Acoustic */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="acoustic"
              checked={editForm.acoustic || false}
              onCheckedChange={(checked) => {
                setEditForm({ ...editForm, acoustic: checked as boolean });
                setHasChanges(true);
              }}
            />
            <Label htmlFor="acoustic" className="text-sm font-medium cursor-pointer">
              Acoustic performances
            </Label>
          </div>

          {/* Social Media URLs */}
          <div className="space-y-3">
            <Label>Social Media Links</Label>

            <div>
              <Label htmlFor="artist-facebook" className="text-sm text-muted-foreground">
                Facebook
              </Label>
              <div className="flex gap-2">
                <Input
                  id="artist-facebook"
                  type="url"
                  value={editForm.facebookUrl || ''}
                  onChange={(e) => {
                    setEditForm({ ...editForm, facebookUrl: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="https://facebook.com/..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshFacebookImage}
                  disabled={!editForm.facebookUrl || refreshingImage}
                  title="Refresh profile image from Facebook"
                >
                  {refreshingImage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="artist-instagram" className="text-sm text-muted-foreground">
                Instagram
              </Label>
              <Input
                id="artist-instagram"
                type="url"
                value={editForm.instagramUrl || ''}
                onChange={(e) => {
                  setEditForm({ ...editForm, instagramUrl: e.target.value });
                  setHasChanges(true);
                }}
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <Label htmlFor="artist-website" className="text-sm text-muted-foreground">
                Website
              </Label>
              <Input
                id="artist-website"
                type="url"
                value={editForm.websiteUrl || ''}
                onChange={(e) => {
                  setEditForm({ ...editForm, websiteUrl: e.target.value });
                  setHasChanges(true);
                }}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Footer with Save, Validate, and Delete */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              Close
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleValidate}
              disabled={editForm.validated === true || saving || deleting}
              variant="secondary"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Validate
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving || deleting}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
