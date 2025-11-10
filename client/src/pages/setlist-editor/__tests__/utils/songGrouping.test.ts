import { describe, it, expect } from 'vitest';
import { groupSongsByLetter, getSortedLetters } from '../../utils/songGrouping';
import type { PlaybookSong } from '../../types';

describe('songGrouping', () => {
  describe('groupSongsByLetter', () => {
    it('should return empty object for empty array', () => {
      const result = groupSongsByLetter([]);
      expect(result).toEqual({});
    });

    it('should group songs by first letter', () => {
      const songs: PlaybookSong[] = [
        { id: '1', title: 'Apple Song', artist: 'Artist 1', duration: 180 } as PlaybookSong,
        { id: '2', title: 'Banana Song', artist: 'Artist 2', duration: 240 } as PlaybookSong,
        { id: '3', title: 'Apricot Song', artist: 'Artist 3', duration: 200 } as PlaybookSong,
      ];

      const result = groupSongsByLetter(songs);
      expect(result['A']).toHaveLength(2);
      expect(result['A'][0].title).toBe('Apple Song');
      expect(result['A'][1].title).toBe('Apricot Song');
      expect(result['B']).toHaveLength(1);
      expect(result['B'][0].title).toBe('Banana Song');
    });

    it('should convert lowercase letters to uppercase', () => {
      const songs: PlaybookSong[] = [
        { id: '1', title: 'apple', artist: 'Artist 1', duration: 180 } as PlaybookSong,
        { id: '2', title: 'Banana', artist: 'Artist 2', duration: 240 } as PlaybookSong,
      ];

      const result = groupSongsByLetter(songs);
      expect(result['A']).toBeDefined();
      expect(result['B']).toBeDefined();
      expect(result['a']).toBeUndefined();
      expect(result['b']).toBeUndefined();
    });

    it('should group non-alphabetic characters under #', () => {
      const songs: PlaybookSong[] = [
        { id: '1', title: '99 Problems', artist: 'Artist 1', duration: 180 } as PlaybookSong,
        { id: '2', title: '(Don\'t Fear) The Reaper', artist: 'Artist 2', duration: 240 } as PlaybookSong,
        { id: '3', title: 'Apple', artist: 'Artist 3', duration: 200 } as PlaybookSong,
      ];

      const result = groupSongsByLetter(songs);
      expect(result['#']).toHaveLength(2);
      expect(result['#'][0].title).toBe('99 Problems');
      expect(result['#'][1].title).toBe('(Don\'t Fear) The Reaper');
      expect(result['A']).toHaveLength(1);
    });

    it('should filter out songs with missing title', () => {
      const songs: PlaybookSong[] = [
        { id: '1', title: 'Valid Song', artist: 'Artist 1', duration: 180 } as PlaybookSong,
        { id: '2', title: null as any, artist: 'Artist 2', duration: 240 } as PlaybookSong,
        { id: '3', title: undefined as any, artist: 'Artist 3', duration: 200 } as PlaybookSong,
        { id: '4', title: '', artist: 'Artist 4', duration: 150 } as PlaybookSong,
      ];

      const result = groupSongsByLetter(songs);
      expect(result['V']).toHaveLength(1);
      expect(result['V'][0].title).toBe('Valid Song');
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('should filter out completely null/undefined songs', () => {
      const songs: PlaybookSong[] = [
        { id: '1', title: 'Valid Song', artist: 'Artist 1', duration: 180 } as PlaybookSong,
        null as any,
        undefined as any,
      ];

      const result = groupSongsByLetter(songs);
      expect(result['V']).toHaveLength(1);
      expect(Object.keys(result)).toHaveLength(1);
    });
  });

  describe('getSortedLetters', () => {
    it('should return empty array for empty object', () => {
      const result = getSortedLetters({});
      expect(result).toEqual([]);
    });

    it('should sort letters alphabetically', () => {
      const grouped = {
        'C': [],
        'A': [],
        'B': [],
      };
      const result = getSortedLetters(grouped);
      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('should put # at the end', () => {
      const grouped = {
        'C': [],
        '#': [],
        'A': [],
        'B': [],
      };
      const result = getSortedLetters(grouped);
      expect(result).toEqual(['A', 'B', 'C', '#']);
    });

    it('should handle only # symbol', () => {
      const grouped = {
        '#': [],
      };
      const result = getSortedLetters(grouped);
      expect(result).toEqual(['#']);
    });

    it('should handle mixed case (all uppercase expected)', () => {
      const grouped = {
        'z': [],
        'A': [],
        'm': [],
      };
      const result = getSortedLetters(grouped);
      expect(result).toEqual(['A', 'm', 'z']);
    });

    it('should sort full alphabet correctly', () => {
      const grouped = {
        'Z': [], 'A': [], 'M': [], 'B': [], 'Y': [], 'C': [],
        '#': [], 'X': [], 'D': [],
      };
      const result = getSortedLetters(grouped);
      expect(result).toEqual(['A', 'B', 'C', 'D', 'M', 'X', 'Y', 'Z', '#']);
    });
  });
});
