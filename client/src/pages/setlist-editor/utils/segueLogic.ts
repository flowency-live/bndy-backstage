/**
 * Segue management utilities for setlist editor
 *
 * Segues are musical transitions between songs. When a song is moved or removed,
 * segue flags need to be cleared to maintain consistency.
 */

/**
 * Determine if segue should be cleared when moving a song
 *
 * Moving a song (either to a different set or reordering within same set)
 * breaks the segue relationship, so it should always be cleared.
 *
 * @param sourceSetId - ID of the set the song is being moved from
 * @param targetSetId - ID of the set the song is being moved to
 * @returns true (always clear segue when moving)
 */
export function shouldClearSegueOnMove(
  sourceSetId: string,
  targetSetId: string
): boolean {
  // Moving to different set breaks segue
  if (sourceSetId !== targetSetId) {
    return true;
  }

  // Reordering within same set also breaks segue
  return true;
}

/**
 * Determine if segue should be cleared when reordering within a set
 *
 * @param sourceSetId - ID of the source set
 * @param targetSetId - ID of the target set
 * @param sourceIndex - Original position in source set
 * @param targetIndex - New position in target set
 * @returns true (always clear segue when reordering)
 */
export function shouldClearSegueOnReorder(
  sourceSetId: string,
  targetSetId: string,
  sourceIndex: number,
  targetIndex: number
): boolean {
  // Any reordering breaks the segue relationship
  return true;
}
