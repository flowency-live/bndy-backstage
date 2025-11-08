import { useAdminContext } from '../AdminContext';
import { useArtistSettings } from './hooks/useArtistSettings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import ImageUpload from '@/components/ui/image-upload';
import LocationAutocomplete from '@/components/ui/location-autocomplete';
import { GenreSelector } from '@/components/ui/genre-selector';
import { ArtistTypeSelector } from '@/components/ui/artist-type-selector';
import { ActTypeSelector } from '@/components/ui/act-type-selector';
import { Checkbox } from '@/components/ui/checkbox';
import type { ArtistType, ActType } from '@/lib/constants/artist';
import { FaFacebook, FaInstagram, FaYoutube, FaSpotify, FaXTwitter, FaGlobe } from 'react-icons/fa6';
import { Loader2, Save, RotateCcw } from 'lucide-react';

const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#64748b'
];

const SOCIAL_PLATFORMS = [
  { key: 'facebookUrl', label: 'Facebook', icon: FaFacebook, color: '#1877F2', placeholder: 'facebook.com/yourband' },
  { key: 'instagramUrl', label: 'Instagram', icon: FaInstagram, color: '#E4405F', placeholder: 'instagram.com/yourband' },
  { key: 'youtubeUrl', label: 'YouTube', icon: FaYoutube, color: '#FF0000', placeholder: 'youtube.com/@yourband' },
  { key: 'spotifyUrl', label: 'Spotify', icon: FaSpotify, color: '#1DB954', placeholder: 'open.spotify.com/artist/...' },
  { key: 'twitterUrl', label: 'Twitter/X', icon: FaXTwitter, color: '#000000', placeholder: 'x.com/yourband' },
  { key: 'websiteUrl', label: 'Website', icon: FaGlobe, color: '#6B7280', placeholder: 'yourband.com' }
];

export default function ArtistSettingsTab() {
  const { artistData, isLoading: contextLoading } = useAdminContext();
  const { settings, updateField, updateMultiple, save, reset, isDirty, isLoading } = useArtistSettings(
    artistData?.id || '',
    artistData
  );

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Artist Settings</h2>
          <p className="text-muted-foreground mt-1">
            Manage your artist profile, genres, and social media links
          </p>
        </div>
        <div className="flex gap-2">
          {isDirty && (
            <Button variant="outline" onClick={reset} disabled={isLoading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
          <Button onClick={save} disabled={!isDirty || isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Avatar */}
          <div>
            <Label className="text-card-foreground font-semibold mb-3 block">Profile Image</Label>
            <ImageUpload
              value={settings.avatar || undefined}
              onChange={(url) => updateField('avatar', url)}
              size="lg"
            />
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-card-foreground font-semibold">Artist Name *</Label>
            <Input
              id="name"
              value={settings.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Your artist or band name"
              required
              className="mt-2"
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="text-card-foreground font-semibold">Bio / Description</Label>
            <Textarea
              id="bio"
              value={settings.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="Tell people about your music and story..."
              rows={4}
              className="mt-2"
            />
          </div>

          {/* Location */}
          <div>
            <Label className="text-card-foreground font-semibold mb-3 block">Location</Label>
            <LocationAutocomplete
              value={settings.location}
              onChange={(location, lat, lng) => {
                updateMultiple({ location, locationLat: lat, locationLng: lng });
              }}
              placeholder="e.g., Stoke-on-Trent, Manchester, London"
            />
            {settings.locationLat && settings.locationLng && (
              <p className="text-xs text-muted-foreground mt-1">
                Coordinates: {settings.locationLat.toFixed(4)}, {settings.locationLng.toFixed(4)}
              </p>
            )}
          </div>

          {/* Display Color */}
          <div>
            <Label className="text-card-foreground font-semibold mb-3 block">Display Colour</Label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateField('displayColour', color)}
                  className={`
                    w-10 h-10 rounded-lg transition-all
                    ${settings.displayColour === color
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: settings.displayColour }}
              />
              <span className="text-sm text-muted-foreground">
                Current: {settings.displayColour}
              </span>
            </div>
          </div>

          {/* Genres */}
          <div>
            <Label className="text-card-foreground font-semibold mb-3 block">Genres</Label>
            <GenreSelector
              selectedGenres={settings.genres}
              onChange={(genres) => updateField('genres', genres)}
            />
          </div>

          {/* Artist Type */}
          <div>
            <ArtistTypeSelector
              selectedType={settings.artistType as ArtistType}
              onChange={(type) => updateField('artistType', type)}
              required
            />
          </div>

          {/* Act Type */}
          <div>
            <ActTypeSelector
              selectedTypes={(settings.actType || []) as ActType[]}
              onChange={(types) => updateField('actType', types)}
            />
          </div>

          {/* Acoustic */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="acoustic"
              checked={settings.acoustic || false}
              onCheckedChange={(checked) => updateField('acoustic', checked as boolean)}
            />
            <Label htmlFor="acoustic" className="text-sm font-medium cursor-pointer">
              Acoustic performances
            </Label>
          </div>

          {/* Social Media Links */}
          <div>
            <Label className="text-card-foreground font-semibold mb-3 block">Social Media Links</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOCIAL_PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                return (
                  <div key={platform.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-white"
                        style={{ backgroundColor: platform.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <Label htmlFor={platform.key} className="text-sm font-medium">
                        {platform.label}
                      </Label>
                    </div>
                    <Input
                      id={platform.key}
                      value={settings[platform.key as keyof typeof settings] as string}
                      onChange={(e) => updateField(platform.key as keyof typeof settings, e.target.value)}
                      placeholder={platform.placeholder}
                      type="url"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save bar at bottom */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex justify-end gap-2 z-10">
          <Button variant="outline" onClick={reset} disabled={isLoading}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={save} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
