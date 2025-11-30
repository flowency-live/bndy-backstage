import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { LocationSelector } from '@/components/ui/location-selector';
import { useToast } from '@/hooks/use-toast';
import { GenreSelector } from '@/components/ui/genre-selector';
import { ArtistTypeSelector } from '@/components/ui/artist-type-selector';
import { ActTypeSelector } from '@/components/ui/act-type-selector';
import { searchLocationAutocomplete } from '@/lib/services/places-service';
import type { ArtistType, ActType } from '@/lib/constants/artist';
import { useGoogleMaps } from '@/components/providers/google-maps-provider';
import ImageUpload from '@/components/ui/image-upload';

interface ArtistCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (artistData: any) => Promise<void>;
}

export default function ArtistCreateModal({
  open,
  onClose,
  onCreate,
}: ArtistCreateModalProps) {
  const { toast } = useToast();
  const { isLoaded: googleMapsLoaded, loadGoogleMaps } = useGoogleMaps();
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<'national' | 'region' | 'city'>('city');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [artistType, setArtistType] = useState<ArtistType>('band');
  const [actType, setActType] = useState<ActType[]>([]);
  const [acoustic, setAcoustic] = useState(false);
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter an artist name',
        variant: 'destructive',
      });
      return;
    }

    if (!location.trim()) {
      toast({
        title: 'Location required',
        description: 'Please select a location',
        variant: 'destructive',
      });
      return;
    }

    const artistData = {
      name: name.trim(),
      bio: bio.trim(),
      location,
      locationType,
      locationLat,
      locationLng,
      genres,
      artistType,
      actType,
      acoustic,
      facebookUrl: facebookUrl.trim() || '',
      instagramUrl: instagramUrl.trim() || '',
      websiteUrl: websiteUrl.trim() || '',
      profileImageUrl: profileImageUrl.trim() || '',
      socialMediaUrls: [],
      isVerified: false,
      followerCount: 0,
      claimedByUserId: null,
      source: 'backstage', // New artists from godmode default to backstage
      validated: false, // Require manual validation
      needs_review: true, // Flag for review
    };

    console.log('[ArtistCreateModal] Creating artist:', artistData);

    setSaving(true);
    try {
      await onCreate(artistData);
      toast({
        title: 'Artist created',
        description: 'New artist added successfully',
      });

      // Reset form
      setName('');
      setBio('');
      setLocation('');
      setLocationLat(null);
      setLocationLng(null);
      setGenres([]);
      setArtistType('band');
      setActType([]);
      setAcoustic(false);
      setFacebookUrl('');
      setInstagramUrl('');
      setWebsiteUrl('');
      setProfileImageUrl('');

      onClose();
    } catch (error: any) {
      toast({
        title: 'Error creating artist',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLocationChange = (loc: string, type: 'national' | 'region' | 'city', coordinates?: { lat: number; lng: number }) => {
    setLocation(loc);
    setLocationType(type);

    if (type === 'city' && coordinates) {
      setLocationLat(coordinates.lat);
      setLocationLng(coordinates.lng);
    } else {
      setLocationLat(null);
      setLocationLng(null);
    }
  };

  const handleCitySearch = async (query: string) => {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Artist</DialogTitle>
          <DialogDescription>
            Add a new artist to the platform. Artists created here will be marked for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Artist Name */}
          <div>
            <Label htmlFor="create-artist-name">Artist Name *</Label>
            <Input
              id="create-artist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter artist name"
              required
            />
          </div>

          {/* Profile Image */}
          <div>
            <Label>Profile Image</Label>
            <ImageUpload
              value={profileImageUrl || undefined}
              onChange={(url) => setProfileImageUrl(url || '')}
              size="lg"
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="create-artist-location">Location *</Label>
            <LocationSelector
              value={location}
              onChange={handleLocationChange}
              onCitySearch={handleCitySearch}
              required
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="create-artist-bio">Bio</Label>
            <Textarea
              id="create-artist-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Artist biography..."
              rows={4}
            />
          </div>

          {/* Genres */}
          <div>
            <Label>Genres</Label>
            <GenreSelector
              selectedGenres={genres}
              onChange={setGenres}
            />
          </div>

          {/* Artist Type */}
          <div>
            <ArtistTypeSelector
              selectedType={artistType}
              onChange={setArtistType}
              required
            />
          </div>

          {/* Act Type */}
          <div>
            <ActTypeSelector
              selectedTypes={actType}
              onChange={setActType}
            />
          </div>

          {/* Acoustic */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="create-acoustic"
              checked={acoustic}
              onCheckedChange={(checked) => setAcoustic(checked as boolean)}
            />
            <Label htmlFor="create-acoustic" className="text-sm font-medium cursor-pointer">
              Acoustic performances
            </Label>
          </div>

          {/* Social Media URLs */}
          <div className="space-y-3">
            <Label>Social Media Links</Label>

            <div>
              <Label htmlFor="create-artist-facebook" className="text-sm text-muted-foreground">
                Facebook
              </Label>
              <Input
                id="create-artist-facebook"
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <Label htmlFor="create-artist-instagram" className="text-sm text-muted-foreground">
                Instagram
              </Label>
              <Input
                id="create-artist-instagram"
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <Label htmlFor="create-artist-website" className="text-sm text-muted-foreground">
                Website
              </Label>
              <Input
                id="create-artist-website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !location.trim()}
            variant="default"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Artist
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
