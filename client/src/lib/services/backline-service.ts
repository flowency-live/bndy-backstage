import { API_BASE_URL } from '../../config/api';

export type BacklineTaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface BacklineTask {
  sourceId: string;
  taskKey: string;
  logicalTaskKey?: string;
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

export interface BacklineSummary {
  sourceFamily: string;
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
  sources: Array<{
    id: string;
    name: string;
    url?: string;
    health?: string;
    shadow?: boolean;
    writerAuthority?: string;
    authorityClass?: string;
    enabled?: boolean;
    cadence?: string;
    lastSuccessfulScanAt?: string;
  }>;
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

export interface BacklineSourceDetail {
  source: Record<string, unknown> | null;
  observations: Array<{
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
  }>;
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
  summary: () => get<BacklineSummary>('/api/source-runs/backline/summary'),
  tasks: (filters: { kind?: string; status?: string; limit?: number } = {}) => {
    const params = new URLSearchParams();
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
};
