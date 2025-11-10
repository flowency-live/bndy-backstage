/**
 * Setlist calculation utilities
 */

import type { SetlistSet, Setlist } from '../types';

/**
 * Calculate total duration of all songs in a set
 * @param set - The setlist set
 * @returns Total duration in seconds
 */
export function getSetTotalDuration(set: SetlistSet): number {
  if (!set.songs || set.songs.length === 0) {
    return 0;
  }

  const total = set.songs.reduce((sum, song) => {
    const duration = song?.duration || 0;
    return sum + duration;
  }, 0);

  return total;
}

/**
 * Get all unique song IDs currently in the setlist
 * @param setlist - The complete setlist
 * @returns Set of song_ids
 */
export function getSongsInSetlist(setlist: Setlist | null): Set<string> {
  if (!setlist || !setlist.sets) {
    return new Set();
  }

  const songIds = setlist.sets.flatMap(set =>
    (set.songs || []).map(song => song.song_id)
  );

  return new Set(songIds);
}
