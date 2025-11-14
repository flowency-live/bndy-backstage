import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Artist } from '@/types/api';
import type { ArtistType, ActType } from '@/lib/constants/artist';

interface ArtistSettings {
  name: string;
  bio: string;
  location: string;
  locationLat: number | undefined;
  locationLng: number | undefined;
  avatar: string | null;
  displayColour: string;
  genres: string[];
  artistType?: ArtistType;
  actType?: ActType[];
  acoustic?: boolean;
  facebookUrl: string;
  instagramUrl: string;
  websiteUrl: string;
  youtubeUrl: string;
  spotifyUrl: string;
  twitterUrl: string;
}

export function useArtistSettings(artistId: string, artistData: Artist | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<ArtistSettings>({
    name: '',
    bio: '',
    location: '',
    locationLat: undefined,
    locationLng: undefined,
    avatar: null,
    displayColour: '#f97316',
    genres: [],
    artistType: undefined,
    actType: [],
    acoustic: false,
    facebookUrl: '',
    instagramUrl: '',
    websiteUrl: '',
    youtubeUrl: '',
    spotifyUrl: '',
    twitterUrl: ''
  });

  const [initialSettings, setInitialSettings] = useState<ArtistSettings>(settings);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize settings from artistData
  useEffect(() => {
    if (artistData) {
      const newSettings: ArtistSettings = {
        name: artistData.name || '',
        bio: artistData.bio || '',
        location: artistData.location || '',
        locationLat: artistData.locationLat,
        locationLng: artistData.locationLng,
        avatar: artistData.profileImageUrl || null,
        displayColour: artistData.displayColour || '#f97316',
        genres: artistData.genres || [],
        artistType: artistData.artistType as ArtistType,
        actType: (artistData.actType || []) as ActType[],
        acoustic: artistData.acoustic || false,
        facebookUrl: artistData.facebookUrl || '',
        instagramUrl: artistData.instagramUrl || '',
        websiteUrl: artistData.websiteUrl || '',
        youtubeUrl: artistData.youtubeUrl || '',
        spotifyUrl: artistData.spotifyUrl || '',
        twitterUrl: artistData.twitterUrl || ''
      };
      setSettings(newSettings);
      setInitialSettings(newSettings);
      setIsDirty(false);
    }
  }, [artistData]);

  // Check if settings have changed
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    setIsDirty(changed);
  }, [settings, initialSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: settings.name,
        bio: settings.bio,
        location: settings.location,
        locationLat: settings.locationLat || null,
        locationLng: settings.locationLng || null,
        profileImageUrl: settings.avatar || '',
        displayColour: settings.displayColour,
        genres: settings.genres,
        artistType: settings.artistType || null,
        actType: settings.actType || null,
        acoustic: settings.acoustic || false,
        facebookUrl: settings.facebookUrl || null,
        instagramUrl: settings.instagramUrl || null,
        websiteUrl: settings.websiteUrl || null,
        youtubeUrl: settings.youtubeUrl || null,
        spotifyUrl: settings.spotifyUrl || null,
        twitterUrl: settings.twitterUrl || null
      };

      const response = await apiRequest('PUT', `/api/artists/${artistId}`, payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/artists', artistId] });
      setInitialSettings(settings);
      setIsDirty(false);
      toast({
        title: 'Settings saved',
        description: 'Your artist settings have been updated successfully'
      });
    },
    onError: (error) => {
      console.error('Save artist settings error:', error);
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  const updateField = <K extends keyof ArtistSettings>(field: K, value: ArtistSettings[K]) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const updateMultiple = (updates: Partial<ArtistSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const reset = () => {
    setSettings(initialSettings);
    setIsDirty(false);
  };

  const save = async () => {
    if (!isDirty) return;
    await saveMutation.mutateAsync();
  };

  return {
    settings,
    updateField,
    updateMultiple,
    save,
    reset,
    isDirty,
    isLoading: saveMutation.isPending
  };
}
