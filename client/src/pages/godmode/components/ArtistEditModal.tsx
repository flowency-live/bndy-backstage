import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import LocationAutocomplete from '@/components/ui/location-autocomplete';
import { useToast } from '@/hooks/use-toast';
import type { Artist } from '@/types/api';
import { Badge } from '@/components/ui/badge';

// Genre list (matching CreateArtistWizard)
const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'Folk', 'Metal',
  'Punk', 'Indie', 'Alternative', 'Electronic', 'Dance', 'Hip Hop',
  'R&B', 'Soul', 'Funk', 'Reggae', 'Latin', 'Classical', 'Other'
];

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
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);

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

  const handleLocationChange = (location: string, lat?: number, lng?: number) => {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      location,
      locationLat: lat,
      locationLng: lng,
    });
    setHasChanges(true);
  };

  const toggleGenre = (genre: string) => {
    if (!editForm) return;

    const currentGenres = Array.isArray(editForm.genres) ? editForm.genres : [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter(g => g !== genre)
      : [...currentGenres, genre];

    setEditForm({
      ...editForm,
      genres: newGenres,
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
            {editForm.locationLat && editForm.locationLng && (
              <p className="text-xs text-muted-foreground mt-1">
                Coordinates: {editForm.locationLat.toFixed(4)}, {editForm.locationLng.toFixed(4)}
              </p>
            )}
          </div>

          {/* Genres */}
          <div>
            <Label>Genres</Label>
            <div className="space-y-2">
              {/* Selected Genres */}
              {selectedGenres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedGenres.map((genre) => (
                    <Badge
                      key={genre}
                      variant="default"
                      className="cursor-pointer hover:bg-destructive"
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Genre Selector */}
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                >
                  {selectedGenres.length === 0 ? 'Select genres...' : 'Add more genres...'}
                </Button>

                {showGenreDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {GENRES.map((genre) => (
                      <div
                        key={genre}
                        onClick={() => {
                          toggleGenre(genre);
                        }}
                        className={`px-3 py-2 cursor-pointer hover:bg-accent ${
                          selectedGenres.includes(genre) ? 'bg-accent' : ''
                        }`}
                      >
                        <span className={selectedGenres.includes(genre) ? 'font-semibold' : ''}>
                          {genre}
                        </span>
                        {selectedGenres.includes(genre) && (
                          <span className="ml-2 text-primary">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                  setEditForm({ ...editForm, facebookUrl: e.target.value || undefined });
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
                  setEditForm({ ...editForm, instagramUrl: e.target.value || undefined });
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
                  setEditForm({ ...editForm, websiteUrl: e.target.value || undefined });
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
