import type {
  BacklineFreshnessStatus,
  BacklineProjectionCandidate,
  BacklineProjectionItem,
} from '@/lib/services/backline-service';

export interface FreshnessTone {
  label: string;
  className: string;
}

const tones: Record<BacklineFreshnessStatus, FreshnessTone> = {
  healthy: { label: 'FRESH', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  stale: { label: 'STALE', className: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  missing: { label: 'NEVER RAN', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  invalid: { label: 'INVALID', className: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  disabled: { label: 'OFF', className: 'bg-muted text-muted-foreground' },
};

export function freshnessTone(status: BacklineFreshnessStatus): FreshnessTone {
  return tones[status];
}

export interface WouldWriteSummary {
  total: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  sources: number;
}

export function summariseWouldWrites(items: readonly BacklineProjectionItem[]): WouldWriteSummary {
  const byAction: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const sources = new Set<string>();
  for (const item of items) {
    byAction[item.action] = (byAction[item.action] ?? 0) + 1;
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    sources.add(item.sourceId);
  }
  return { total: items.length, byAction, byStatus, sources: sources.size };
}

function ukDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

export function describeCandidate(candidate: BacklineProjectionCandidate | null): string {
  if (!candidate) return 'No candidate materialised';
  const artist = candidate.artistName ?? 'Unknown artist';
  const venue = [candidate.venueName ?? 'Unknown venue', candidate.venueLocation].filter(Boolean).join(', ');
  const when = [ukDate(candidate.date), candidate.startTime].filter(Boolean).join(' ');
  return when ? `${artist} at ${venue} on ${when}` : `${artist} at ${venue}`;
}
