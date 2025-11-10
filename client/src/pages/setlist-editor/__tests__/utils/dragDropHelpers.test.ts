import { describe, it, expect } from 'vitest';
import {
  parseDragId,
  findSourceSet,
  findTargetSet,
  calculateTargetIndex,
  findSongInSetlist,
} from '../../utils/dragDropHelpers';
import type { Setlist, SetlistSet, SetlistSong } from '../../types';

describe('dragDropHelpers', () => {
  describe('parseDragId', () => {
    it('should identify playbook songs and extract song ID', () => {
      const result = parseDragId('playbook-song123');
      expect(result.isFromPlaybook).toBe(true);
      expect(result.songId).toBe('song123');
    });

    it('should identify setlist songs (no prefix)', () => {
      const result = parseDragId('song456');
      expect(result.isFromPlaybook).toBe(false);
      expect(result.songId).toBe('song456');
    });

    it('should handle edge cases', () => {
      expect(parseDragId('playbook-')).toEqual({ isFromPlaybook: true, songId: '' });
      expect(parseDragId('')).toEqual({ isFromPlaybook: false, songId: '' });
    });
  });

  describe('findTargetSet', () => {
    const mockSetlist: Setlist = {
      id: 'setlist1',
      artist_id: 'artist1',
      name: 'Test Setlist',
      sets: [
        {
          id: 'set1',
          name: 'Set 1',
          targetDuration: 1800,
          songs: [
            { id: 'song1', title: 'Song 1', duration: 180, position: 0 } as SetlistSong,
            { id: 'song2', title: 'Song 2', duration: 240, position: 1 } as SetlistSong,
          ],
        },
        {
          id: 'set2',
          name: 'Set 2',
          targetDuration: 1800,
          songs: [
            { id: 'song3', title: 'Song 3', duration: 200, position: 0 } as SetlistSong,
          ],
        },
      ],
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    };

    it('should find set when dropped on set-container', () => {
      const result = findTargetSet('set-container-set1', mockSetlist);
      expect(result.setId).toBe('set1');
      expect(result.index).toBe(2); // End of set (2 songs)
    });

    it('should find set when dropped on empty set-container', () => {
      const emptySetlist: Setlist = {
        ...mockSetlist,
        sets: [
          {
            id: 'set1',
            name: 'Set 1',
            targetDuration: 1800,
            songs: [],
          },
        ],
      };
      const result = findTargetSet('set-container-set1', emptySetlist);
      expect(result.setId).toBe('set1');
      expect(result.index).toBe(0); // Empty set
    });

    it('should find set when dropped on a song', () => {
      const result = findTargetSet('song2', mockSetlist);
      expect(result.setId).toBe('set1');
      expect(result.index).toBe(1); // Insert before song2 (position 1)
    });

    it('should find set when dropped on song in second set', () => {
      const result = findTargetSet('song3', mockSetlist);
      expect(result.setId).toBe('set2');
      expect(result.index).toBe(0); // Insert before song3 (position 0)
    });

    it('should return null when dropped on invalid target', () => {
      const result = findTargetSet('invalid-id', mockSetlist);
      expect(result.setId).toBeNull();
      expect(result.index).toBe(0);
    });

    it('should handle null setlist', () => {
      const result = findTargetSet('song1', null as any);
      expect(result.setId).toBeNull();
      expect(result.index).toBe(0);
    });
  });

  describe('findSourceSet', () => {
    const mockSetlist: Setlist = {
      id: 'setlist1',
      artist_id: 'artist1',
      name: 'Test Setlist',
      sets: [
        {
          id: 'set1',
          name: 'Set 1',
          targetDuration: 1800,
          songs: [
            { id: 'song1', title: 'Song 1', duration: 180, position: 0 } as SetlistSong,
            { id: 'song2', title: 'Song 2', duration: 240, position: 1 } as SetlistSong,
          ],
        },
        {
          id: 'set2',
          name: 'Set 2',
          targetDuration: 1800,
          songs: [
            { id: 'song3', title: 'Song 3', duration: 200, position: 0 } as SetlistSong,
          ],
        },
      ],
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    };

    it('should find source set for first song in first set', () => {
      const result = findSourceSet('song1', mockSetlist);
      expect(result.setId).toBe('set1');
      expect(result.index).toBe(0);
      expect(result.song).toEqual(mockSetlist.sets[0].songs[0]);
    });

    it('should find source set for second song in first set', () => {
      const result = findSourceSet('song2', mockSetlist);
      expect(result.setId).toBe('set1');
      expect(result.index).toBe(1);
      expect(result.song?.id).toBe('song2');
    });

    it('should find source set for song in second set', () => {
      const result = findSourceSet('song3', mockSetlist);
      expect(result.setId).toBe('set2');
      expect(result.index).toBe(0);
      expect(result.song?.id).toBe('song3');
    });

    it('should return null when song not found', () => {
      const result = findSourceSet('nonexistent', mockSetlist);
      expect(result.setId).toBeNull();
      expect(result.index).toBe(-1);
      expect(result.song).toBeNull();
    });

    it('should handle null setlist', () => {
      const result = findSourceSet('song1', null as any);
      expect(result.setId).toBeNull();
      expect(result.index).toBe(-1);
      expect(result.song).toBeNull();
    });
  });

  describe('calculateTargetIndex', () => {
    it('should return same index when moving to different set', () => {
      const result = calculateTargetIndex('set1', 'set2', 1, 2);
      expect(result).toBe(2);
    });

    it('should adjust index when moving down within same set', () => {
      // Moving from position 1 to position 3 in same set
      // After removal, target index becomes 2
      const result = calculateTargetIndex('set1', 'set1', 1, 3);
      expect(result).toBe(2); // 3 - 1 = 2
    });

    it('should keep index when moving up within same set', () => {
      // Moving from position 3 to position 1 in same set
      const result = calculateTargetIndex('set1', 'set1', 3, 1);
      expect(result).toBe(1);
    });

    it('should handle moving to same position (no-op)', () => {
      const result = calculateTargetIndex('set1', 'set1', 2, 2);
      expect(result).toBe(2);
    });

    it('should handle edge case: moving from start', () => {
      const result = calculateTargetIndex('set1', 'set1', 0, 5);
      expect(result).toBe(4);
    });
  });

  describe('findSongInSetlist', () => {
    const mockSetlist: Setlist = {
      id: 'setlist1',
      artist_id: 'artist1',
      name: 'Test Setlist',
      sets: [
        {
          id: 'set1',
          name: 'Set 1',
          targetDuration: 1800,
          songs: [
            { id: 'song1', title: 'Song 1', duration: 180, position: 0 } as SetlistSong,
          ],
        },
        {
          id: 'set2',
          name: 'Set 2',
          targetDuration: 1800,
          songs: [
            { id: 'song3', title: 'Song 3', duration: 200, position: 0 } as SetlistSong,
          ],
        },
      ],
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    };

    it('should find song in setlist', () => {
      const result = findSongInSetlist('song1', mockSetlist);
      expect(result).toBe(true);
    });

    it('should return false when song not found', () => {
      const result = findSongInSetlist('nonexistent', mockSetlist);
      expect(result).toBe(false);
    });

    it('should handle null setlist', () => {
      const result = findSongInSetlist('song1', null as any);
      expect(result).toBe(false);
    });
  });
});
