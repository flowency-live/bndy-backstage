// Source Runs Service - BNDY Source Dashboard API
// Provides access to source run records and review items for the godmode dashboard

import { API_BASE_URL } from '../../config/api';

// ===== Types =====

export interface SourceRunCounts {
  rawRows: number;
  validEvents: number;
  metadataRows: number;
  parkedRows: number;
  added: number;
  cancelled: number;
  unchanged: number;
  pastDropped: number;
  eventsCreated: number;
  eventsRepointed: number;
  eventsDeleted: number;
  eventsHidden: number;
  venuesCreated: number;
  venuesMatched: number;
  artistsCreated: number;
  artistsMatched: number;
  reviewItems: number;
}

export interface SourceRunError {
  message: string;
  code?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export type SourceRunStatus = 'started' | 'completed' | 'failed';

export interface SourceRun {
  sourceId: string;
  runId: string;
  runDate: string;
  startedAt: string;
  finishedAt?: string;
  status: SourceRunStatus;
  errors: SourceRunError[];
  counts: SourceRunCounts;
}

export type ReviewItemStatus = 'open' | 'proposed' | 'applied' | 'rejected';
export type ReviewItemEntityType = 'artist' | 'venue' | 'event';

export interface ReviewItem {
  itemId: string;
  sourceId: string;
  runId: string;
  entityType: ReviewItemEntityType;
  entityName: string;
  candidateData: Record<string, unknown>;
  reason: string;
  status: ReviewItemStatus;
}

export interface SourceSummary {
  sourceId: string;
  sourceName: string;
  lastRun?: SourceRun;
  recentRuns: SourceRun[];
  successRate: number; // percentage of completed runs in recent history
  totalRuns: number;
  openReviewItems: number;
}

// ===== API Response Types =====

interface SourceRunsResponse {
  runs: SourceRun[];
  total?: number;
}

interface ReviewItemsResponse {
  items: ReviewItem[];
  total?: number;
}

interface SourceSummariesResponse {
  sources: SourceSummary[];
}

// ===== Service Class =====

class SourceRunsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      throw new Error(`Failed request: ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return await response.json();
  }

  /**
   * Get most recent runs across all sources
   */
  async getRecentRuns(limit: number = 20): Promise<SourceRun[]> {
    const data = await this.apiRequest<SourceRunsResponse>(
      `/api/source-runs?limit=${limit}`
    );
    return data.runs || [];
  }

  /**
   * Get run history for a specific source
   */
  async getSourceRuns(sourceId: string, limit: number = 10): Promise<SourceRun[]> {
    const data = await this.apiRequest<SourceRunsResponse>(
      `/api/source-runs/${encodeURIComponent(sourceId)}?limit=${limit}`
    );
    return data.runs || [];
  }

  /**
   * Get a single run's full details
   */
  async getRunDetail(sourceId: string, runId: string): Promise<SourceRun> {
    return this.apiRequest<SourceRun>(
      `/api/source-runs/${encodeURIComponent(sourceId)}/${encodeURIComponent(runId)}`
    );
  }

  /**
   * Get review items, optionally filtered by status and/or source
   */
  async getReviewItems(
    status: ReviewItemStatus = 'open',
    sourceId?: string
  ): Promise<ReviewItem[]> {
    const params = new URLSearchParams({ status });
    if (sourceId) {
      params.append('sourceId', sourceId);
    }
    const data = await this.apiRequest<ReviewItemsResponse>(
      `/api/review-items?${params.toString()}`
    );
    return data.items || [];
  }

  /**
   * Get source summaries (aggregated view for dashboard landing)
   * Falls back to computing from recent runs if no dedicated endpoint
   */
  async getSourceSummaries(): Promise<SourceSummary[]> {
    // Compute from recent runs (correct SourceSummary shape) rather than calling
    // /api/source-runs/summaries. The backend /summaries route returns a different
    // shape ({summaries:[{runCount,lastRunDate,...}]}) than this client expects
    // ({sources: SourceSummary[]}), so relying on it left the overview empty.
    // computeSummariesFromRuns builds the right shape from /api/source-runs + /api/review-items.
    return this.computeSummariesFromRuns();
  }

  /**
   * Compute source summaries from recent runs (fallback if no dedicated endpoint)
   */
  private async computeSummariesFromRuns(): Promise<SourceSummary[]> {
    const runs = await this.getRecentRuns(100);
    const reviewItems = await this.getReviewItems('open');

    // Group runs by sourceId
    const runsBySource = new Map<string, SourceRun[]>();
    for (const run of runs) {
      const existing = runsBySource.get(run.sourceId) || [];
      existing.push(run);
      runsBySource.set(run.sourceId, existing);
    }

    // Count open review items per source
    const reviewCountBySource = new Map<string, number>();
    for (const item of reviewItems) {
      const count = reviewCountBySource.get(item.sourceId) || 0;
      reviewCountBySource.set(item.sourceId, count + 1);
    }

    // Build summaries
    const summaries: SourceSummary[] = [];
    for (const [sourceId, sourceRuns] of runsBySource) {
      // Sort by startedAt descending
      const sorted = sourceRuns.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      const completedRuns = sorted.filter(r => r.status === 'completed').length;
      const successRate = sorted.length > 0 ? (completedRuns / sorted.length) * 100 : 0;

      summaries.push({
        sourceId,
        sourceName: formatSourceName(sourceId),
        lastRun: sorted[0],
        recentRuns: sorted.slice(0, 10),
        successRate,
        totalRuns: sorted.length,
        openReviewItems: reviewCountBySource.get(sourceId) || 0,
      });
    }

    // Sort by last run date descending
    return summaries.sort((a, b) => {
      if (!a.lastRun) return 1;
      if (!b.lastRun) return -1;
      return new Date(b.lastRun.startedAt).getTime() - new Date(a.lastRun.startedAt).getTime();
    });
  }
}

// ===== Helper Functions =====

/**
 * Format a source ID into a human-readable name
 * e.g. "klma-stoke-gig-list" -> "KLMA Stoke Gig List"
 */
export function formatSourceName(sourceId: string): string {
  return sourceId
    .split('-')
    .map(word => {
      // Keep known acronyms uppercase
      if (['klma', 'api', 'rss'].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: SourceRunStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'started':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

/**
 * Format relative time (e.g. "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/**
 * Format duration between two timestamps
 */
export function formatDuration(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) return 'running...';

  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const durationMs = end - start;

  if (durationMs < 1000) return '<1s';
  if (durationMs < 60000) return `${Math.floor(durationMs / 1000)}s`;
  if (durationMs < 3600000) {
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  const hours = Math.floor(durationMs / 3600000);
  const mins = Math.floor((durationMs % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

// ===== Export =====

export const sourceRunsService = new SourceRunsService();

// Export individual methods for convenience
export const getRecentRuns = (limit?: number) => sourceRunsService.getRecentRuns(limit);
export const getSourceRuns = (sourceId: string, limit?: number) =>
  sourceRunsService.getSourceRuns(sourceId, limit);
export const getRunDetail = (sourceId: string, runId: string) =>
  sourceRunsService.getRunDetail(sourceId, runId);
export const getReviewItems = (status?: ReviewItemStatus, sourceId?: string) =>
  sourceRunsService.getReviewItems(status, sourceId);
export const getSourceSummaries = () => sourceRunsService.getSourceSummaries();

export default sourceRunsService;