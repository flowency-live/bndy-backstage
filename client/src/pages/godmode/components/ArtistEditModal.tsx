import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import LocationAutocomplete from '@/components/ui/location-autocomplete';
import { useToast } from '@/hooks/use-toast';
import type { Artist } from '@/lib/services/godmode-service';
import { GenreSelector } from '@/components/ui/genre-selector';

interface ArtistEditModalProps {
  open: boolean;
  onClose: () => void;
  artists: Artist[];
  currentIndex: number;
  onSave: (artist: Artist) => Promise<void>;
  onNavigate: (index: number) => void;
}

export default function ArtistEditModal({
  open,
  onClose,
  artists,
  currentIndex,
  onSave,
  onNavigate,
}: ArtistEditModalProps) {
  const { toast } = useToast();
  const [editForm, setEditForm] = useState<Artist | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentArtist = artists[currentIndex];

  // Initialize form when artist changes
  useEffect(() => {
    if (currentArtist) {
      setEditForm({ ...currentArtist });
      setHasChanges(false);
    }
  }, [currentArtist]);

  const handleSave = async () => {
    if (!editForm || !hasChanges) return;

    setSaving(true);
    try {
      await onSave(editForm);
      setHasChanges(false);
      toast({
        title: 'Artist updated',
        description: 'Changes saved successfully',
      });
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

  const handleLocationChange = (location: string) => {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      location,
    });
    setHasChanges(true);
  };

  const handleGenresChange = (genres: string[]) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      genres,
    });
    setHasChanges(true);
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

          {/* Location */}
          <div>
            <Label htmlFor="artist-location">Location (City/Town)</Label>
            <LocationAutocomplete
              value={editForm.location || ''}
              onChange={handleLocationChange}
              placeholder="e.g., Stoke-on-Trent, Manchester, London"
            />
          </div>

          {/* Genres */}
          <div>
            <Label>Genres</Label>
            <GenreSelector
              selectedGenres={selectedGenres}
              onChange={handleGenresChange}
            />
          </div>

          {/* Social Media URLs */}
          <div className="space-y-3">
            <Label>Social Media Links</Label>

            <div>
              <Label htmlFor="artist-facebook" className="text-sm text-muted-foreground">
                Facebook
              </Label>
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
