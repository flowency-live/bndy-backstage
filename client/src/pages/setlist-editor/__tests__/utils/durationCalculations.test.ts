import { describe, it, expect } from 'vitest';
import { formatDuration, getDurationVariance, getVarianceColor } from '../../utils/durationCalculations';

describe('durationCalculations', () => {
  describe('formatDuration', () => {
    it('should format 0 seconds as 0:00', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('should format seconds less than 60', () => {
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('should format exactly 60 seconds as 1:00', () => {
      expect(formatDuration(60)).toBe('1:00');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(245)).toBe('4:05');
    });

    it('should format large durations correctly', () => {
      expect(formatDuration(3600)).toBe('60:00');
      expect(formatDuration(3665)).toBe('61:05');
    });

    it('should pad single-digit seconds with zero', () => {
      expect(formatDuration(61)).toBe('1:01');
      expect(formatDuration(605)).toBe('10:05');
    });
  });

  describe('getDurationVariance', () => {
    it('should return 0 when target is 0', () => {
      expect(getDurationVariance(100, 0)).toBe(0);
    });

    it('should return 0 when actual equals target', () => {
      expect(getDurationVariance(100, 100)).toBe(0);
    });

    it('should return positive percentage when actual > target', () => {
      expect(getDurationVariance(110, 100)).toBe(10);
      expect(getDurationVariance(120, 100)).toBe(20);
    });

    it('should return negative percentage when actual < target', () => {
      expect(getDurationVariance(90, 100)).toBe(-10);
      expect(getDurationVariance(80, 100)).toBe(-20);
    });

    it('should handle fractional percentages', () => {
      const variance = getDurationVariance(105, 100);
      expect(variance).toBe(5);
    });

    it('should calculate variance correctly for large numbers', () => {
      expect(getDurationVariance(3600, 3000)).toBeCloseTo(20, 1);
    });
  });

  describe('getVarianceColor', () => {
    it('should return blue for variance <= 5%', () => {
      expect(getVarianceColor(0)).toBe('text-blue-500');
      expect(getVarianceColor(5)).toBe('text-blue-500');
      expect(getVarianceColor(-5)).toBe('text-blue-500');
      expect(getVarianceColor(3)).toBe('text-blue-500');
      expect(getVarianceColor(-3)).toBe('text-blue-500');
    });

    it('should return yellow for variance > 5% and <= 20%', () => {
      expect(getVarianceColor(6)).toBe('text-yellow-500');
      expect(getVarianceColor(20)).toBe('text-yellow-500');
      expect(getVarianceColor(-6)).toBe('text-yellow-500');
      expect(getVarianceColor(-20)).toBe('text-yellow-500');
      expect(getVarianceColor(15)).toBe('text-yellow-500');
    });

    it('should return red for variance > 20%', () => {
      expect(getVarianceColor(21)).toBe('text-red-500');
      expect(getVarianceColor(50)).toBe('text-red-500');
      expect(getVarianceColor(-21)).toBe('text-red-500');
      expect(getVarianceColor(-50)).toBe('text-red-500');
      expect(getVarianceColor(100)).toBe('text-red-500');
    });

    it('should handle edge cases at boundaries', () => {
      expect(getVarianceColor(5.0)).toBe('text-blue-500');
      expect(getVarianceColor(5.1)).toBe('text-yellow-500');
      expect(getVarianceColor(20.0)).toBe('text-yellow-500');
      expect(getVarianceColor(20.1)).toBe('text-red-500');
    });
  });
});
