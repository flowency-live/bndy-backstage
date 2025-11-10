import { describe, it, expect } from 'vitest';
import { shouldClearSegueOnMove, shouldClearSegueOnReorder } from '../../utils/segueLogic';

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

    it('should always return true (moving breaks segues)', () => {
      expect(shouldClearSegueOnMove('set1', 'set2')).toBe(true);
      expect(shouldClearSegueOnMove('set2', 'set1')).toBe(true);
      expect(shouldClearSegueOnMove('set1', 'set1')).toBe(true);
    });
  });

  describe('shouldClearSegueOnReorder', () => {
    it('should return true when source and target are same (reordering breaks segue)', () => {
      const result = shouldClearSegueOnReorder('set1', 'set1', 1, 3);
      expect(result).toBe(true);
    });

    it('should return true when moving to different set', () => {
      const result = shouldClearSegueOnReorder('set1', 'set2', 1, 0);
      expect(result).toBe(true);
    });

    it('should return true for same position in same set', () => {
      const result = shouldClearSegueOnReorder('set1', 'set1', 2, 2);
      expect(result).toBe(true);
    });

    it('should always return true (any move breaks segue)', () => {
      expect(shouldClearSegueOnReorder('set1', 'set1', 0, 5)).toBe(true);
      expect(shouldClearSegueOnReorder('set1', 'set2', 0, 0)).toBe(true);
      expect(shouldClearSegueOnReorder('set2', 'set1', 3, 1)).toBe(true);
    });
  });
});
