import { API_BASE_URL } from '../../config/api';

export type BacklineTaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface BacklineTask {
  sourceId: string;
  taskKey: string;
  logicalTaskKey?: string;
  reconciliationId?: string;
  kind?: string;
  nativeId?: string;
  name?: string;
  sourceUrl?: string;
  status: BacklineTaskStatus;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  updatedAt?: string;
  lastError?: string;
}

export interface BacklineEntityStats {
  discovered: number;
  hydrated: number;
  failed: number;
}

export interface BacklineFamily {
  id: string;
  label: string;
  description: string;
  status: 'healthy' | 'degraded' | 'inactive' | 'historical';
  configuredSources: number;
  enabledSources: number;
  shadow: boolean;
  canonicalWritesEnabled: boolean;
  lastRunAt?: string | null;
  lastSuccessfulRunAt?: string | null;
  consecutiveFailures: number;
}

export interface BacklineRunMetric {
  runId: string;
  sourceId: string;
  reconciliationId?: string;
  startedAt: string;
  completedAt: string;
  status: 'completed' | 'failed';
  reason: 'scheduled' | 'manual';
  complete?: boolean;
  shadow: boolean;
  writerAuthority: 'cowork' | 'aws';
  rawItems: number;
  validEvents: number;
  entityProfiles: number;
  parked: number;
  claims: number;
  added: number;
  updated: number;
  withdrawn: number;
  unchanged: number;
  fanoutQueued: number;
  warnings: number;
  errors: number;
  durationMs: number;
  reportKey?: string;
}

export interface BacklineSource {
  id: string;
  name: string;
  url?: string;
  region?: string;
  health?: string;
  shadow?: boolean;
  writerAuthority?: string;
  authorityClass?: string;
  enabled?: boolean;
  cadence?: string;
  lastRunAt?: string;
  lastSuccessfulRunAt?: string;
  lastFailureAt?: string;
  consecutiveFailures?: number;
  lastObservationId?: string;
}

export interface BacklineSummary {
  sourceFamily: string;
  family?: BacklineFamily;
  families: BacklineFamily[];
  stats: {
    artists: BacklineEntityStats;
    venues: BacklineEntityStats;
    gigs: BacklineEntityStats;
    pages: { discovered: number; completed: number; failed: number };
    queue: Record<BacklineTaskStatus, number>;
  };
  taskHistoryRows: number;
  uniqueCurrentTasks: number;
  failures: BacklineTask[];
  sources: BacklineSource[];
  runMetrics: BacklineRunMetric[];
  readOnly: boolean;
  canonicalWritesEnabled: boolean;
  computedAt: string;
}

export interface BacklineClaim {
  id: string;
  observationId: string;
  sourceId: string;
  subject: { type: string; key: string };
  predicate: string;
  value: unknown;
  confidence: number;
  evidence?: {
    sourceUrl?: string;
    evidenceKey?: string;
    rawItemId?: string;
    contentHash?: string;
    text?: string;
  };
  observedAt: string;
  status: string;
}

export interface BacklineSubject {
  type: string;
  key: string;
  claims: BacklineClaim[];
  latestByPredicate: Record<string, BacklineClaim>;
  resolutions: BacklineClaim[];
  conflicts: BacklineClaim[];
}

export interface BacklineObservation {
  id: string;
  sourceId: string;
  observedAt: string;
  sourceUrl?: string;
  captureHash?: string;
  evidenceKey?: string;
  enumerationMethod?: string;
  complete?: boolean;
  itemCount?: number;
  futureItemCount?: number;
  httpStatus?: number;
  contentType?: string;
  structuralFingerprint?: string;
}

export interface BacklineSourceDetail {
  source: BacklineSource | null;
  observations: BacklineObservation[];
}

export interface BacklineObservationDetail {
  observation: BacklineObservation | null;
  claims: BacklineClaim[];
  truncated: boolean;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Backline request failed: ${response.status}`);
  return response.json();
}

export const backlineService = {
  summary: (family = 'lemonrock') => {
    const params = new URLSearchParams({ family });
    return get<BacklineSummary>(`/api/source-runs/backline/summary?${params.toString()}`);
  },
  tasks: (filters: { family?: string; kind?: string; status?: string; limit?: number } = {}) => {
    const params = new URLSearchParams({ family: filters.family ?? 'lemonrock' });
    if (filters.kind) params.set('kind', filters.kind);
    if (filters.status) params.set('status', filters.status);
    params.set('limit', String(filters.limit ?? 200));
    return get<{ tasks: BacklineTask[]; cursor?: string | null }>(`/api/source-runs/backline/tasks?${params.toString()}`);
  },
  subject: (type: string, key: string) => {
    const params = new URLSearchParams({ type, key });
    return get<BacklineSubject>(`/api/source-runs/backline/subject?${params.toString()}`);
  },
  source: (sourceId: string) => {
    const params = new URLSearchParams({ sourceId });
    return get<BacklineSourceDetail>(`/api/source-runs/backline/source?${params.toString()}`);
  },
  observation: (observationId: string) => {
    const params = new URLSearchParams({ observationId });
    return get<BacklineObservationDetail>(`/api/source-runs/backline/observation?${params.toString()}`);
  },
};
