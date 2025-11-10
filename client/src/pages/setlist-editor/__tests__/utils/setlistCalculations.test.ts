import { describe, it, expect } from 'vitest';
import { getSetTotalDuration, getSongsInSetlist } from '../../utils/setlistCalculations';
import type { SetlistSet, Setlist, SetlistSong } from '../../types';

describe('setlistCalculations', () => {
  describe('getSetTotalDuration', () => {
    it('should return 0 for empty set', () => {
      const emptySet: SetlistSet = {
        id: 'set1',
        name: 'Set 1',
        targetDuration: 1800,
        songs: [],
      };
      expect(getSetTotalDuration(emptySet)).toBe(0);
    });

    it('should sum duration of all songs in set', () => {
      const set: SetlistSet = {
        id: 'set1',
        name: 'Set 1',
        targetDuration: 1800,
        songs: [
          { id: '1', title: 'Song 1', duration: 180, position: 0 } as SetlistSong,
          { id: '2', title: 'Song 2', duration: 240, position: 1 } as SetlistSong,
          { id: '3', title: 'Song 3', duration: 200, position: 2 } as SetlistSong,
        ],
      };
      expect(getSetTotalDuration(set)).toBe(620); // 180 + 240 + 200
    });

    it('should handle songs with 0 duration', () => {
      const set: SetlistSet = {
        id: 'set1',
        name: 'Set 1',
        targetDuration: 1800,
        songs: [
          { id: '1', title: 'Song 1', duration: 0, position: 0 } as SetlistSong,
          { id: '2', title: 'Song 2', duration: 180, position: 1 } as SetlistSong,
        ],
      };
      expect(getSetTotalDuration(set)).toBe(180);
    });

    it('should handle undefined duration (treat as 0)', () => {
      const set: SetlistSet = {
        id: 'set1',
        name: 'Set 1',
        targetDuration: 1800,
        songs: [
          { id: '1', title: 'Song 1', position: 0 } as SetlistSong,
          { id: '2', title: 'Song 2', duration: 180, position: 1 } as SetlistSong,
        ],
      };
      expect(getSetTotalDuration(set)).toBe(180);
    });

    it('should handle set with null songs array', () => {
      const set: SetlistSet = {
        id: 'set1',
        name: 'Set 1',
        targetDuration: 1800,
        songs: null as any,
      };
      expect(getSetTotalDuration(set)).toBe(0);
    });
  });

  describe('getSongsInSetlist', () => {
    it('should return empty set for empty setlist', () => {
      const setlist: Setlist = {
        id: 'setlist1',
        artist_id: 'artist1',
        name: 'Test Setlist',
        sets: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };
      const result = getSongsInSetlist(setlist);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should return set of song_ids from single set', () => {
      const setlist: Setlist = {
        id: 'setlist1',
        artist_id: 'artist1',
        name: 'Test Setlist',
        sets: [
          {
            id: 'set1',
            name: 'Set 1',
            targetDuration: 1800,
            songs: [
              { id: '1', song_id: 'song1', title: 'Song 1', duration: 180, position: 0 } as SetlistSong,
              { id: '2', song_id: 'song2', title: 'Song 2', duration: 240, position: 1 } as SetlistSong,
            ],
          },
        ],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };
      const result = getSongsInSetlist(setlist);
      expect(result.size).toBe(2);
      expect(result.has('song1')).toBe(true);
      expect(result.has('song2')).toBe(true);
    });

    it('should return set of song_ids from multiple sets', () => {
      const setlist: Setlist = {
        id: 'setlist1',
        artist_id: 'artist1',
        name: 'Test Setlist',
        sets: [
          {
            id: 'set1',
            name: 'Set 1',
            targetDuration: 1800,
            songs: [
              { id: '1', song_id: 'song1', title: 'Song 1', duration: 180, position: 0 } as SetlistSong,
            ],
          },
          {
            id: 'set2',
            name: 'Set 2',
            targetDuration: 1800,
            songs: [
              { id: '2', song_id: 'song2', title: 'Song 2', duration: 240, position: 0 } as SetlistSong,
              { id: '3', song_id: 'song3', title: 'Song 3', duration: 200, position: 1 } as SetlistSong,
            ],
          },
        ],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };
      const result = getSongsInSetlist(setlist);
      expect(result.size).toBe(3);
      expect(result.has('song1')).toBe(true);
      expect(result.has('song2')).toBe(true);
      expect(result.has('song3')).toBe(true);
    });

    it('should handle sets with empty songs arrays', () => {
      const setlist: Setlist = {
        id: 'setlist1',
        artist_id: 'artist1',
        name: 'Test Setlist',
        sets: [
          {
            id: 'set1',
            name: 'Set 1',
            targetDuration: 1800,
            songs: [],
          },
          {
            id: 'set2',
            name: 'Set 2',
            targetDuration: 1800,
            songs: [
              { id: '1', song_id: 'song1', title: 'Song 1', duration: 180, position: 0 } as SetlistSong,
            ],
          },
        ],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };
      const result = getSongsInSetlist(setlist);
      expect(result.size).toBe(1);
      expect(result.has('song1')).toBe(true);
    });

    it('should handle null setlist gracefully', () => {
      const result = getSongsInSetlist(null as any);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });
});
