/**
 * Drag-and-drop helper utilities for setlist editor
 */

import type { Setlist, SetlistSong } from '../types';

/**
 * Parse drag ID to determine if from playbook and extract song ID
 */
export function parseDragId(dragId: string): {
  isFromPlaybook: boolean;
  songId: string;
} {
  const isFromPlaybook = dragId.startsWith('playbook-');
  const songId = isFromPlaybook ? dragId.replace('playbook-', '') : dragId;
  return { isFromPlaybook, songId };
}

/**
 * Find the target set and index for a drop operation
 */
export function findTargetSet(
  overId: string,
  setlist: Setlist | null
): {
  setId: string | null;
  index: number;
} {
  if (!setlist || !setlist.sets) {
    return { setId: null, index: 0 };
  }

  // Check if dropped on a set container
  if (overId.startsWith('set-container-')) {
    const setId = overId.replace('set-container-', '');
    const targetSet = setlist.sets.find(s => s.id === setId);
    const index = targetSet && targetSet.songs?.length > 0 ? targetSet.songs.length : 0;
    return { setId, index };
  }

  // Dropped on a song - find which set and position
  for (const set of setlist.sets) {
    const songIndex = set.songs.findIndex(s => s.id === overId);
    if (songIndex !== -1) {
      return { setId: set.id, index: songIndex };
    }
  }

  return { setId: null, index: 0 };
}

/**
 * Find the source set, index, and song for a drag operation
 */
export function findSourceSet(
  songId: string,
  setlist: Setlist | null
): {
  setId: string | null;
  index: number;
  song: SetlistSong | null;
} {
  if (!setlist || !setlist.sets) {
    return { setId: null, index: -1, song: null };
  }

  for (const set of setlist.sets) {
    const idx = set.songs.findIndex(s => s.id === songId);
    if (idx !== -1) {
      return { setId: set.id, index: idx, song: set.songs[idx] };
    }
  }

  return { setId: null, index: -1, song: null };
}

/**
 * Calculate adjusted target index when moving within same set
 */
export function calculateTargetIndex(
  sourceSetId: string,
  targetSetId: string,
  sourceIndex: number,
  targetIndex: number
): number {
  // If moving to different set, no adjustment needed
  if (sourceSetId !== targetSetId) {
    return targetIndex;
  }

  // If moving within same set and moving down, adjust for removal
  if (sourceIndex < targetIndex) {
    return targetIndex - 1;
  }

  // Moving up within same set, no adjustment needed
  return targetIndex;
}

/**
 * Check if a song is already in the setlist
 */
export function findSongInSetlist(songId: string, setlist: Setlist | null): boolean {
  if (!setlist || !setlist.sets) {
    return false;
  }

  return setlist.sets.some(set =>
    set.songs.some(song => song.id === songId)
  );
}
