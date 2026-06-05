import { describe, it, expect } from 'vitest';
import {
  shouldClearSegueOnMove,
  shouldClearSegueOnReorder,
  shouldClearPreviousSongSegue,
} from '../../utils/segueLogic';

describe('segueLogic', () => {
  describe('shouldClearSegueOnMove', () => {
    it('should return true when moving to different set', () => {
      const result = shouldClearSegueOnMove('set1', 'set2');
      expect(result).toBe(true);
    });

    it('should return true when reordering within same set', () => {
      const result = shouldClearSegueOnMove('set1', 'set1');
      expect(result).toBe(true);
    });

    it('should always return true for cross-set moves', () => {
      expect(shouldClearSegueOnMove('set1', 'set2')).toBe(true);
      expect(shouldClearSegueOnMove('set2', 'set1')).toBe(true);
    });
  });

  describe('shouldClearSegueOnReorder', () => {
    it('should return true when reordering changes position', () => {
      const result = shouldClearSegueOnReorder('set1', 'set1', 1, 3);
      expect(result).toBe(true);
    });

    it('should return true when moving to different set', () => {
      const result = shouldClearSegueOnReorder('set1', 'set2', 1, 0);
      expect(result).toBe(true);
    });

    it('should return false for same position in same set (no movement)', () => {
      const result = shouldClearSegueOnReorder('set1', 'set1', 2, 2);
      expect(result).toBe(false);
    });

    it('should return true when position changes within same set', () => {
      expect(shouldClearSegueOnReorder('set1', 'set1', 0, 5)).toBe(true);
      expect(shouldClearSegueOnReorder('set1', 'set1', 3, 1)).toBe(true);
    });

    it('should return true for all cross-set moves', () => {
      expect(shouldClearSegueOnReorder('set1', 'set2', 0, 0)).toBe(true);
      expect(shouldClearSegueOnReorder('set2', 'set1', 3, 1)).toBe(true);
    });
  });

  describe('shouldClearPreviousSongSegue', () => {
    it('should return true when song has a predecessor', () => {
      expect(shouldClearPreviousSongSegue(1)).toBe(true);
      expect(shouldClearPreviousSongSegue(5)).toBe(true);
    });

    it('should return false when song is at index 0 (no predecessor)', () => {
      expect(shouldClearPreviousSongSegue(0)).toBe(false);
    });
  });
});
