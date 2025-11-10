/**
 * Song grouping and sorting utilities for playbook
 */

import type { PlaybookSong } from '../types';

/**
 * Group songs alphabetically by first letter of title
 * @param songs - Array of playbook songs
 * @returns Object with letters as keys and song arrays as values
 */
export function groupSongsByLetter(songs: PlaybookSong[]): Record<string, PlaybookSong[]> {
  return songs.reduce((acc, song) => {
    // Filter out invalid songs
    if (!song || !song.title) return acc;

    const firstLetter = song.title.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';

    if (!acc[letter]) {
      acc[letter] = [];
    }
    acc[letter].push(song);

    return acc;
  }, {} as Record<string, PlaybookSong[]>);
}

/**
 * Get sorted array of letter keys, with # at the end
 * @param groupedSongs - Songs grouped by letter
 * @returns Sorted array of letter keys
 */
export function getSortedLetters(groupedSongs: Record<string, PlaybookSong[]>): string[] {
  return Object.keys(groupedSongs).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });
}
