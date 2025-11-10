/**
 * usePlaybookFilter - Hook for filtering and grouping playbook songs
 */

import { useMemo } from 'react';
import type { PlaybookSong, Setlist } from '../types';
import { groupSongsByLetter, getSortedLetters, getSongsInSetlist } from '../utils';
import { useSetlistEditor } from '../context/SetlistEditorContext';

interface UsePlaybookFilterProps {
  playbookSongs: PlaybookSong[];
  setlist: Setlist | undefined;
}

interface UsePlaybookFilterReturn {
  filteredPlaybookSongs: PlaybookSong[];
  groupedSongs: Record<string, PlaybookSong[]>;
  sortedLetters: string[];
  songsInSetlist: Set<string>;
}

export function usePlaybookFilter({
  playbookSongs,
  setlist,
}: UsePlaybookFilterProps): UsePlaybookFilterReturn {
  const { searchQuery, showAllSongs, workingSetlist } = useSetlistEditor();

  // Get all song IDs currently in the setlist (use working copy to reflect unsaved changes)
  const songsInSetlist = useMemo(() => {
    return getSongsInSetlist(workingSetlist || setlist || null);
  }, [workingSetlist, setlist]);

  // Filter playbook songs based on search and "show all" toggle
  const filteredPlaybookSongs = useMemo(() => {
    return playbookSongs.filter(song => {
      // Safety check
      if (!song || !song.title || !song.artist) return false;

      // Filter by search query
      const matchesSearch =
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by "show all" toggle
      const matchesFilter = showAllSongs || !songsInSetlist.has(song.id);

      return matchesSearch && matchesFilter;
    });
  }, [playbookSongs, searchQuery, showAllSongs, songsInSetlist]);

  // Group songs alphabetically
  const groupedSongs = useMemo(() => {
    return groupSongsByLetter(filteredPlaybookSongs);
  }, [filteredPlaybookSongs]);

  // Get sorted letter keys
  const sortedLetters = useMemo(() => {
    return getSortedLetters(groupedSongs);
  }, [groupedSongs]);

  return {
    filteredPlaybookSongs,
    groupedSongs,
    sortedLetters,
    songsInSetlist,
  };
}
