import { useAdminContext } from '../AdminContext';
import { useArtistSettings } from './hooks/useArtistSettings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArtistTypeSelector } from '@/components/ui/artist-type-selector';
import { ActTypeSelector } from '@/components/ui/act-type-selector';
import { Checkbox } from '@/components/ui/checkbox';
import type { ArtistType, ActType } from '@/lib/constants/artist';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import AvatarUploadSection from './components/AvatarUploadSection';
import BasicInfoSection from './components/BasicInfoSection';
import LocationSection from './components/LocationSection';
import ColorPickerSection from './components/ColorPickerSection';
import GenresSection from './components/GenresSection';
import SocialLinksSection from './components/SocialLinksSection';

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
          {/* Avatar Upload */}
          <AvatarUploadSection
            avatar={settings.avatar || null}
            onAvatarChange={(url) => updateField('avatar', url)}
          />

          {/* Basic Info (Name + Bio) */}
          <BasicInfoSection
            name={settings.name}
            bio={settings.bio}
            onNameChange={(name) => updateField('name', name)}
            onBioChange={(bio) => updateField('bio', bio)}
          />

          {/* Location */}
          <LocationSection
            location={settings.location}
            locationLat={settings.locationLat}
            locationLng={settings.locationLng}
            onChange={(location, lat, lng) => {
              updateMultiple({ location, locationLat: lat, locationLng: lng });
            }}
          />

          {/* Display Color */}
          <ColorPickerSection
            color={settings.displayColour}
            onColorChange={(color) => updateField('displayColour', color)}
          />

          {/* Genres */}
          <GenresSection
            genres={settings.genres}
            onGenresChange={(genres) => updateField('genres', genres)}
          />

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
          <SocialLinksSection
            values={{
              facebookUrl: settings.facebookUrl,
              instagramUrl: settings.instagramUrl,
              youtubeUrl: settings.youtubeUrl,
              spotifyUrl: settings.spotifyUrl,
              twitterUrl: settings.twitterUrl,
              websiteUrl: settings.websiteUrl
            }}
            onChange={(field, value) => updateField(field as keyof typeof settings, value)}
          />
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
