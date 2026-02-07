import { useAdminContext } from '../AdminContext';
import { useArtistSettings } from './hooks/useArtistSettings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArtistTypeSelector } from '@/components/ui/artist-type-selector';
import { ActTypeSelector } from '@/components/ui/act-type-selector';
import { Checkbox } from '@/components/ui/checkbox';
import type { ArtistType, ActType } from '@/lib/constants/artist';
import { Input } from '@/components/ui/input';
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

          {/* Publish Availability */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="publishAvailability"
              checked={settings.publishAvailability || false}
              onCheckedChange={(checked) => updateField('publishAvailability', checked as boolean)}
            />
            <Label htmlFor="publishAvailability" className="text-sm font-medium cursor-pointer">
              Publish availability on public profile
            </Label>
          </div>

          {/* Voting Settings Section */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Song Voting Settings</h3>

            {/* Show Member Votes */}
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="showMemberVotes"
                checked={settings.showMemberVotes || false}
                onCheckedChange={(checked) => updateField('showMemberVotes', checked as boolean)}
              />
              <Label htmlFor="showMemberVotes" className="text-sm font-medium cursor-pointer">
                Show individual member votes when all votes are collected
              </Label>
            </div>

            {/* Auto-Discard Threshold */}
            <div className="space-y-2">
              <Label htmlFor="autoDiscardThreshold" className="text-sm font-medium">
                Auto-discard threshold (optional)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="autoDiscardThreshold"
                  type="number"
                  min={1}
                  max={99}
                  placeholder="e.g., 50"
                  value={settings.autoDiscardThreshold ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                    updateField('autoDiscardThreshold', val);
                  }}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Songs scoring below this percentage will be automatically discarded after all votes are in. Leave empty to disable.
              </p>
            </div>
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
