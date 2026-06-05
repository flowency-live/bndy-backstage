/**
 * Segue management utilities for setlist editor
 *
 * Segues are musical transitions between songs. When a song is moved or removed,
 * segue flags need to be cleared to maintain consistency.
 *
 * A segue flag on song A means "A flows directly into the next song".
 * When songs are reordered, we need to clear segues when relationships change.
 */

/**
 * Determine if segue should be cleared when moving a song
 *
 * @param sourceSetId - ID of the set the song is being moved from
 * @param targetSetId - ID of the set the song is being moved to
 * @returns true if segue should be cleared
 */
export function shouldClearSegueOnMove(
  sourceSetId: string,
  targetSetId: string
): boolean {
  // Moving to different set always breaks segue (can't segue across sets)
  if (sourceSetId !== targetSetId) {
    return true;
  }

  // Moving within same set also breaks segue since the "next song" relationship changes
  return true;
}

/**
 * Determine if segue should be cleared when reordering within a set
 *
 * The segue should be cleared unless the song is just being moved to an
 * adjacent position in the same direction as its segue (keeping the same "next" song).
 *
 * @param sourceSetId - ID of the source set
 * @param targetSetId - ID of the target set
 * @param sourceIndex - Original position in source set
 * @param targetIndex - New position in target set
 * @param totalSongsInSet - Total number of songs in the set
 * @returns true if segue should be cleared
 */
export function shouldClearSegueOnReorder(
  sourceSetId: string,
  targetSetId: string,
  sourceIndex: number,
  targetIndex: number
): boolean {
  // Cross-set moves always clear segue
  if (sourceSetId !== targetSetId) {
    return true;
  }

  // No movement = no change needed
  if (sourceIndex === targetIndex) {
    return false;
  }

  // When moving within the same set:
  // - Moving forward (to higher index): new "next" song is different
  // - Moving backward (to lower index): new "next" song is different
  // In both cases, the song's relationship to its successor changes
  return true;
}

/**
 * Determine if the previous song's segue should be cleared when a song is removed/moved
 *
 * When song B is removed from position i, the song at position i-1 (if any)
 * had a segue into B. Since B is gone, that segue should be cleared.
 *
 * @param sourceIndex - Index of the song being moved/removed
 * @returns true if the previous song's segue should be cleared
 */
export function shouldClearPreviousSongSegue(sourceIndex: number): boolean {
  // If there's a song before the moved song, its segue should be cleared
  // since it no longer flows into the moved song
  return sourceIndex > 0;
}
