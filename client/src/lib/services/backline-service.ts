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
  } | null;
  taskLedgerAvailable: boolean;
  taskStatsAvailable: boolean;
  taskStatsReason: string;
  taskHistoryRows: number | null;
  uniqueCurrentTasks: number | null;
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

export interface BacklineTrustLoopReviewCase {
  candidateType: 'artist' | 'venue' | 'event' | 'festival';
  candidateKey: string;
  sourceId: string;
  displayName?: string;
  artistName?: string;
  venueName?: string;
  date?: string;
  status: 'resolved' | 'unresolved' | 'conflicted';
  canonicalEntityId?: string;
  canonicalHypotheses: Array<{
    canonicalEntityId: string;
    displayName?: string;
    artistName?: string;
    venueName?: string;
    date?: string;
  }>;
  supportingClaimIds: string[];
  decisionReasoning: string[];
}

export interface BacklineProviderQualificationCase {
  caseId: string;
  sourceId: string;
  entityType: 'artist' | 'venue';
  displayName: string;
  captureStatus: 'captured' | 'error';
  identityConfidence: number;
  acceptedFacts: number;
  quarantinedFacts: number;
  decision: 'capture-error' | 'abstained' | 'review-required';
  reason?: string;
}

export interface BacklineTrustLoopRun {
  id: string;
  startedAt: string;
  completedAt: string;
  sourceIds: string[];
  candidatesSeen: number;
  candidatesClassified: number;
  classifications: { resolved: number; unresolved: number; conflicted: number };
  entityTypes: { artist: number; venue: number; event: number; festival: number };
  noSilentDrops: boolean;
  canonicalWrites: 0;
  enrichment: {
    eligibleArtists?: number;
    assessedArtists?: number;
    classificationCoverage?: number;
    genreCoverage?: number;
    officialLinkCoverage?: number;
    attemptedNoOfficialPresence?: number;
    parkedOrConflicted?: number;
    wrongLinkIncidents?: number;
  };
  acceptance: {
    completeClassification?: boolean;
    zeroWrongLinks?: boolean;
    traceableDecisions?: boolean;
    reviewedKnownAnswerSetPassed?: boolean;
  };
  providerQualification?: {
    schemaVersion: number;
    providerId: string;
    capturedAt: string;
    publishedAt: string;
    gateStatus: 'capture-failed' | 'awaiting-human-review' | 'reviewed';
    reviewStatus: string;
    cases: number;
    artistCases: number;
    venueCases: number;
    capturedCases: number;
    captureErrors: number;
    highConfidenceCases?: number;
    abstainedCases?: number;
    acceptedFacts: number;
    quarantinedFacts: number;
    totalEstimatedCost: number;
    costMeasurement: 'complete' | 'partial' | 'unavailable' | 'partial-error-path';
    canonicalWrites: 0;
    sourceRunUrl?: string;
    artifactUrl?: string;
    reviewUrl?: string;
    reviewCases?: BacklineProviderQualificationCase[];
  } | null;
  status: 'passed' | 'needs-review' | 'failed';
  reviewCases: BacklineTrustLoopReviewCase[];
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
  trustLoop: (limit = 5) => {
    const params = new URLSearchParams({ limit: String(limit) });
    return get<{ runs: BacklineTrustLoopRun[]; readOnly: true; canonicalWritesEnabled: false }>(`/api/source-runs/backline/trust-loop?${params.toString()}`);
  },
};
