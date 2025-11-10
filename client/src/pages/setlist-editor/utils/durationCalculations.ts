/**
 * Duration calculation utilities for setlist editor
 */

/**
 * Format duration in seconds to MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted string in MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate percentage difference between actual and target duration
 * @param actual - Actual duration in seconds
 * @param target - Target duration in seconds
 * @returns Percentage variance (positive if over, negative if under)
 */
export function getDurationVariance(actual: number, target: number): number {
  if (target === 0) return 0;
  return ((actual - target) / target) * 100;
}

/**
 * Get Tailwind color class based on variance percentage
 * @param variance - Variance percentage
 * @returns Tailwind text color class
 */
export function getVarianceColor(variance: number): string {
  const absVariance = Math.abs(variance);
  if (absVariance <= 5) return 'text-blue-500';
  if (absVariance <= 20) return 'text-yellow-500';
  return 'text-red-500';
}
