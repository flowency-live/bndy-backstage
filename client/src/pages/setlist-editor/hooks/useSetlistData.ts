/**
 * useSetlistData - React Query hook for fetching setlist and playbook data
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Setlist, PlaybookSong } from '../types';
import { useSetlistEditor } from '../context/SetlistEditorContext';

interface UseSetlistDataProps {
  artistId: string;
  setlistId: string;
}

interface UseSetlistDataReturn {
  setlist: Setlist | undefined;
  playbookSongs: PlaybookSong[];
  isLoading: boolean;
  setlistLoading: boolean;
  songsLoading: boolean;
}

export function useSetlistData({
  artistId,
  setlistId,
}: UseSetlistDataProps): UseSetlistDataReturn {
  const {
    workingSetlist,
    setWorkingSetlist,
    hasUnsavedChanges,
    activeSetId,
    setActiveSetId,
  } = useSetlistEditor();

  // Fetch setlist from database
  const { data: setlist, isLoading: setlistLoading } = useQuery<Setlist>({
    queryKey: ['/api/artists', artistId, 'setlists', setlistId, 'v3'],
    queryFn: async () => {
      const { setlistsService } = await import('@/lib/services/setlists-service');
      return setlistsService.getSetlist(artistId, setlistId);
    },
    enabled: !!artistId && !!setlistId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: undefined,
  });

  // Fetch playbook songs
  const { data: playbookSongs = [], isLoading: songsLoading } = useQuery<PlaybookSong[]>({
    queryKey: ['/api/artists', artistId, 'songs'],
    queryFn: async () => {
      const { songsService } = await import('@/lib/services/songs-service');
      const data = await songsService.getArtistSongs(artistId);

      if (!Array.isArray(data)) {
        return [];
      }

      const validItems = data.filter(item => item && item.globalSong);

      const mappedItems = validItems.map((item: any) => {
        const tuning = item.tuning || 'standard';

        return {
          id: item.id,
          spotifyId: item.globalSong?.spotifyUrl || '',
          title: item.globalSong?.title || 'Unknown',
          artist: item.globalSong?.artistName || 'Unknown',
          album: item.globalSong?.album || '',
          spotifyUrl: item.globalSong?.spotifyUrl || '',
          imageUrl: item.globalSong?.albumImageUrl || null,
          duration: item.globalSong?.duration || 0,
          key: item.globalSong?.metadata?.key || null,
          tuning: tuning,
        };
      });

      const safeItems = mappedItems.filter(item => item && item.title);

      return safeItems.sort((a, b) => a.title.localeCompare(b.title));
    },
    enabled: !!artistId,
    staleTime: 0,
    gcTime: 60 * 1000,
    refetchOnMount: 'always',
  });

  // Initialize working copy when setlist loads
  useEffect(() => {
    if (setlist) {
      // Initialize workingSetlist if it doesn't exist
      if (!workingSetlist) {
        setWorkingSetlist(setlist);
        if (setlist.sets.length > 0 && !activeSetId) {
          setActiveSetId(setlist.sets[0].id);
        }
      }
      // Update workingSetlist with fresh data if no unsaved changes
      else if (!hasUnsavedChanges) {
        setWorkingSetlist(setlist);
      }
    }
  }, [setlist, workingSetlist, activeSetId, hasUnsavedChanges, setWorkingSetlist, setActiveSetId]);

  return {
    setlist,
    playbookSongs,
    isLoading: setlistLoading || songsLoading,
    setlistLoading,
    songsLoading,
  };
}
