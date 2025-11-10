/**
 * useSongManagement - Hook for song manipulation operations
 * Handles adding, removing, editing, and reordering songs in the setlist
 */

import type { PlaybookSong, SetlistSong } from '../types';
import { useSetlistEditor } from '../context/SetlistEditorContext';

interface UseSongManagementProps {
  playbookSongs: PlaybookSong[];
}

interface UseSongManagementReturn {
  handleRemoveSong: (setId: string, songId: string) => void;
  handleToggleSegue: (setId: string, songId: string) => void;
  handleStartEditSongTitle: (songId: string, currentTitle: string) => void;
  handleEditSongTitleChange: (value: string) => void;
  handleFinishEditSongTitle: () => void;
  handleQuickAdd: (songId: string, e: React.MouseEvent) => void;
  toggleSetCollapse: (setId: string) => void;
  handleUpdateTargetDuration: (setId: string, newDuration: number) => void;
}

export function useSongManagement({
  playbookSongs,
}: UseSongManagementProps): UseSongManagementReturn {
  const {
    workingSetlist,
    setWorkingSetlist,
    setHasUnsavedChanges,
    activeSetId,
    editingSongTitle,
    setEditingSongTitle,
    tempSongTitle,
    setTempSongTitle,
    collapsedSets,
    setCollapsedSets,
    setEditingTargetDuration,
  } = useSetlistEditor();

  /**
   * Remove a song from a set
   */
  const handleRemoveSong = (setId: string, songId: string) => {
    if (!workingSetlist) return;

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          songs: (set.songs || [])
            .filter(s => s.id !== songId)
            .map((song, idx) => ({
              ...song,
              position: idx,
            })),
        };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  /**
   * Toggle segue flag on a song
   */
  const handleToggleSegue = (setId: string, songId: string) => {
    if (!workingSetlist) return;

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          songs: (set.songs || []).map(song =>
            song.id === songId ? { ...song, segueInto: !song.segueInto } : song
          ),
        };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  /**
   * Start editing a song title
   */
  const handleStartEditSongTitle = (songId: string, currentTitle: string) => {
    setEditingSongTitle(songId);
    setTempSongTitle(currentTitle);
  };

  /**
   * Update temporary song title as user types
   */
  const handleEditSongTitleChange = (value: string) => {
    setTempSongTitle(value);
  };

  /**
   * Finish editing song title and save changes
   */
  const handleFinishEditSongTitle = () => {
    if (!workingSetlist || !editingSongTitle) return;

    const trimmedTitle = tempSongTitle.trim();
    if (trimmedTitle && trimmedTitle !== editingSongTitle) {
      const updatedSets = workingSetlist.sets.map(set => ({
        ...set,
        songs: set.songs.map(song =>
          song.id === editingSongTitle ? { ...song, title: trimmedTitle } : song
        ),
      }));

      setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
      setHasUnsavedChanges(true);
    }

    setEditingSongTitle(null);
    setTempSongTitle('');
  };

  /**
   * Quick add song to active set (for mobile tap-to-add)
   */
  const handleQuickAdd = (songId: string, e: React.MouseEvent) => {
    // Only handle click on mobile OR when explicitly clicking (not dragging)
    const isDrag = e.type === 'click' && (e as any).detail === 0;
    if (isDrag) return;

    if (!workingSetlist || !activeSetId) return;

    const playbookSong = playbookSongs.find(s => s.id === songId);
    if (!playbookSong) return;

    const activeSet = workingSetlist.sets.find(s => s.id === activeSetId);
    if (!activeSet) return;

    const newSong: SetlistSong = {
      id: `${Date.now()}-${Math.random()}`,
      song_id: playbookSong.id,
      title: playbookSong.title,
      artist: playbookSong.artist,
      duration: playbookSong.duration || 0,
      position: activeSet.songs?.length || 0,
      key: playbookSong.key,
      tuning: playbookSong.tuning || 'standard',
      segueInto: false,
      imageUrl: playbookSong.imageUrl,
    };

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === activeSetId) {
        return {
          ...set,
          songs: [...(set.songs || []), newSong],
        };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  /**
   * Toggle collapse/expand state of a set
   */
  const toggleSetCollapse = (setId: string) => {
    setCollapsedSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(setId)) {
        newSet.delete(setId);
      } else {
        newSet.add(setId);
      }
      return newSet;
    });
  };

  /**
   * Update target duration for a set
   */
  const handleUpdateTargetDuration = (setId: string, newDuration: number) => {
    if (!workingSetlist || newDuration < 0) return;

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === setId) {
        return { ...set, targetDuration: newDuration };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
    setEditingTargetDuration(null);
  };

  return {
    handleRemoveSong,
    handleToggleSegue,
    handleStartEditSongTitle,
    handleEditSongTitleChange,
    handleFinishEditSongTitle,
    handleQuickAdd,
    toggleSetCollapse,
    handleUpdateTargetDuration,
  };
}
