import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Database, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  backlineService,
  type BacklineClaim,
  type BacklineFamily,
  type BacklineObservation,
  type BacklineTask,
  type BacklineTrustLoopReviewCase,
} from '@/lib/services/backline-service';

const statusClass: Record<string, string> = {
  healthy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  running: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  queued: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  degraded: 'bg-red-500/10 text-red-600 dark:text-red-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
  inactive: 'bg-muted text-muted-foreground',
  historical: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  passed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'needs-review': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  conflicted: 'bg-red-500/10 text-red-600 dark:text-red-400',
  unresolved: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function StatCard({ label, discovered, hydrated, failed }: { label: string; discovered: number; hydrated: number; failed: number }) {
  const pct = discovered > 0 ? Math.round((hydrated / discovered) * 100) : 0;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tabular-nums">{hydrated.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">of {discovered.toLocaleString()} discovered</div>
        </div>
        <div className="text-sm font-semibold tabular-nums">{pct}%</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-foreground/70" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {failed > 0 && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{failed.toLocaleString()} failed</div>}
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function FamilyCard({ family, selected, onClick }: { family: BacklineFamily; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 ${selected ? 'border-foreground/30 bg-muted/60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{family.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass[family.status] || 'bg-muted'}`}>{family.status}</span>
      </div>
      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{family.description}</div>
      <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
        <span>{family.enabledSources}/{family.configuredSources} enabled</span>
        <span>{family.shadow ? 'shadow' : 'write-capable'}</span>
        <span>{shortDate(family.lastSuccessfulRunAt || undefined)}</span>
      </div>
    </button>
  );
}

function reviewLabel(item: BacklineTrustLoopReviewCase): string {
  if (item.displayName) return item.displayName;
  if (item.artistName || item.venueName) return [item.artistName, item.venueName, item.date].filter(Boolean).join(' at ');
  return item.candidateKey;
}

function subjectForTask(task: BacklineTask): { type: string; key: string } | null {
  if (!task.nativeId) return null;
  if (task.kind === 'artist' || task.kind === 'band') return { type: 'artist-candidate', key: task.nativeId };
  if (task.kind === 'venue') return { type: 'venue-candidate', key: task.nativeId };
  if (task.kind === 'gig') return { type: 'event-candidate', key: `event:${task.sourceId}:${task.nativeId}` };
  return null;
}

function valueText(value: unknown): string {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function shortDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ClaimsList({ claims }: { claims: BacklineClaim[] }) {
  const shown = claims.slice(0, 100);
  return (
    <div className="space-y-2">
      {shown.map((claim) => (
        <div key={claim.id} className="rounded border p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{claim.predicate}</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">{Math.round((claim.confidence ?? 0) * 100)}%</span>
          </div>
          <div className="mt-1 break-words text-xs">{valueText(claim.value)}</div>
          <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            <div>{claim.subject.type}: {claim.subject.key}</div>
            <div>{shortDate(claim.observedAt)} · {claim.observationId}</div>
            {claim.evidence?.evidenceKey && <div className="break-all">evidence: {claim.evidence.evidenceKey}</div>}
            {claim.evidence?.contentHash && <div className="break-all">hash: {claim.evidence.contentHash}</div>}
          </div>
        </div>
      ))}
      {claims.length > shown.length && <div className="text-xs text-muted-foreground">Showing the first {shown.length.toLocaleString()} of {claims.length.toLocaleString()} Claims.</div>}
    </div>
  );
}

export default function BacklineExplorer() {
  const [family, setFamily] = useState('lemonrock');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BacklineTask | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedObservation, setSelectedObservation] = useState<BacklineObservation | null>(null);

  const summary = useQuery({
    queryKey: ['backline', 'summary', family],
    queryFn: () => backlineService.summary(family),
    refetchInterval: 60000,
  });
  const tasks = useQuery({
    queryKey: ['backline', 'tasks', family, kind, status],
    queryFn: () => backlineService.tasks({ family, kind: kind || undefined, status: status || undefined, limit: 200 }),
    refetchInterval: 30000,
  });
  const subject = subjectForTask(selected || ({} as BacklineTask));
  const subjectQuery = useQuery({
    queryKey: ['backline', 'subject', subject?.type, subject?.key],
    queryFn: () => backlineService.subject(subject!.type, subject!.key),
    enabled: Boolean(subject),
  });
  const sourceQuery = useQuery({
    queryKey: ['backline', 'source', selectedSource],
    queryFn: () => backlineService.source(selectedSource!),
    enabled: Boolean(selectedSource),
  });
  const observationQuery = useQuery({
    queryKey: ['backline', 'observation', selectedObservation?.id],
    queryFn: () => backlineService.observation(selectedObservation!.id),
    enabled: Boolean(selectedObservation),
  });
  const trustLoop = useQuery({
    queryKey: ['backline', 'trust-loop'],
    queryFn: () => backlineService.trustLoop(5),
    refetchInterval: 60000,
  });

  const filteredTasks = useMemo(() => {
    const rows = tasks.data?.tasks ?? [];
    if (!search.trim()) return rows;
    const needle = search.toLowerCase();
    return rows.filter((task) => [task.name, task.nativeId, task.sourceId, task.sourceUrl, task.lastError]
      .some((value) => value?.toLowerCase().includes(needle)));
  }, [tasks.data, search]);

  const selectFamily = (next: string) => {
    setFamily(next);
    setKind('');
    setStatus('');
    setSearch('');
    setSelected(null);
    setSelectedSource(null);
    setSelectedObservation(null);
  };

  const refresh = () => {
    summary.refetch();
    tasks.refetch();
    if (subject) subjectQuery.refetch();
    if (selectedSource) sourceQuery.refetch();
    if (selectedObservation) observationQuery.refetch();
    trustLoop.refetch();
  };

  if (summary.isError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Backline API unavailable</div>
        <div className="mt-1 text-sm text-muted-foreground">The Explorer is read-only. Deploy the Backline API and enrichment stack, then refresh.</div>
      </div>
    );
  }

  const stats = summary.data?.stats;
  const latestRun = summary.data?.runMetrics[0];
  const hasTaskLedger = (summary.data?.taskHistoryRows ?? 0) > 0;
  const familyLabel = summary.data?.family?.label ?? family;
  const latestTrustLoop = trustLoop.data?.runs[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Backline Explorer</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">READ ONLY</span>
            {summary.data?.canonicalWritesEnabled === false && (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">SHADOW</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">All Backline sources: evidence → Observations → Claims → resolution. Raw evidence stays in S3.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={summary.isFetching || tasks.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${(summary.isFetching || tasks.isFetching) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <section>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Source families</div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(summary.data?.families ?? []).map((item) => (
            <FamilyCard key={item.id} family={item} selected={family === item.id} onClick={() => selectFamily(item.id)} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <div className="font-medium">Backline Trust Loop v1</div>
            <div className="mt-1 text-xs text-muted-foreground">Deterministic identity classification and evidence-backed enrichment health. Canonical projection is off.</div>
          </div>
          {latestTrustLoop && <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${statusClass[latestTrustLoop.status] || 'bg-muted'}`}>{latestTrustLoop.status}</span>}
        </div>
        {!latestTrustLoop && !trustLoop.isLoading && <div className="p-4 text-sm text-muted-foreground">No Trust Loop cohort has been recorded yet.</div>}
        {latestTrustLoop && (
          <div className="space-y-4 p-4">
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm">
              <span className="font-medium">Verification cohort, not corpus:</span>{' '}
              these {latestTrustLoop.candidatesSeen.toLocaleString()} cases are a bounded safety and quality sample drawn from the live shadow sources.
              The source-family cards and corpus counters below show the much larger production dataset.
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Cohort classified" value={`${latestTrustLoop.candidatesClassified}/${latestTrustLoop.candidatesSeen}`} detail={latestTrustLoop.noSilentDrops ? 'bounded sample, no silent drops' : 'incomplete cohort'} />
              <MetricCard label="Resolved" value={latestTrustLoop.classifications.resolved} detail={`${latestTrustLoop.classifications.unresolved} unresolved`} />
              <MetricCard label="Conflicted" value={latestTrustLoop.classifications.conflicted} detail="parked, never forced" />
              <MetricCard label="Wrong links" value={latestTrustLoop.enrichment.wrongLinkIncidents ?? 0} detail="one incident fails the cohort" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard label="Artist classification" value={`${Math.round((latestTrustLoop.enrichment.classificationCoverage ?? 0) * 100)}%`} detail={`${latestTrustLoop.enrichment.assessedArtists ?? 0} Artists assessed`} />
              <MetricCard label="Genre evidence" value={`${Math.round((latestTrustLoop.enrichment.genreCoverage ?? 0) * 100)}%`} detail="confirmed or canonical evidence" />
              <MetricCard label="Official presence" value={`${Math.round((latestTrustLoop.enrichment.officialLinkCoverage ?? 0) * 100)}%`} detail={`${latestTrustLoop.enrichment.attemptedNoOfficialPresence ?? 0} attempted with none found`} />
            </div>
            <div className="text-xs text-muted-foreground">
              Latest run {shortDate(latestTrustLoop.completedAt)} · {latestTrustLoop.sourceIds.length} sources · {latestTrustLoop.entityTypes.artist} Artists · {latestTrustLoop.entityTypes.venue} Venues · {latestTrustLoop.entityTypes.event} Events · canonical writes {latestTrustLoop.canonicalWrites}
            </div>
            {latestTrustLoop.reviewCases.length > 0 && (
              <div className="overflow-hidden rounded border">
                <div className="border-b px-3 py-2 text-xs font-medium">Identity review queue</div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/95 text-left text-muted-foreground"><tr><th className="px-3 py-2">Candidate</th><th>Source</th><th>Type</th><th>Decision</th><th>Hypotheses</th></tr></thead>
                    <tbody>{latestTrustLoop.reviewCases.slice(0, 40).map((item) => (
                      <tr key={`${item.sourceId}:${item.candidateType}:${item.candidateKey}`} className="border-t">
                        <td className="max-w-[320px] px-3 py-2"><div className="truncate font-medium">{reviewLabel(item)}</div><div className="truncate font-mono text-[10px] text-muted-foreground">{item.candidateKey}</div></td>
                        <td className="pr-3">{item.sourceId}</td>
                        <td className="pr-3">{item.candidateType}</td>
                        <td className="pr-3"><span className={`rounded-full px-2 py-0.5 font-medium ${statusClass[item.status] || 'bg-muted'}`}>{item.status}</span></td>
                        <td className="pr-3 tabular-nums">{item.canonicalHypotheses.length}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {hasTaskLedger ? (
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label={family === 'onthecase' ? 'Bands' : 'Artists'} discovered={stats?.artists.discovered ?? 0} hydrated={stats?.artists.hydrated ?? 0} failed={stats?.artists.failed ?? 0} />
          <StatCard label="Venues" discovered={stats?.venues.discovered ?? 0} hydrated={stats?.venues.hydrated ?? 0} failed={stats?.venues.failed ?? 0} />
          <StatCard label="Gigs" discovered={stats?.gigs.discovered ?? 0} hydrated={stats?.gigs.hydrated ?? 0} failed={stats?.gigs.failed ?? 0} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Events" value={latestRun?.validEvents ?? 0} detail={latestRun ? `latest ${latestRun.reason} run` : 'no recorded source run metric'} />
          <MetricCard label="Profiles" value={latestRun?.entityProfiles ?? 0} detail={latestRun ? `${latestRun.parked.toLocaleString()} parked safely` : 'no recorded source run metric'} />
          <MetricCard label="Claims" value={latestRun?.claims ?? 0} detail={latestRun ? shortDate(latestRun.completedAt) : 'inspect source Observations below'} />
        </div>
      )}

      {(summary.data?.runMetrics.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <div className="border-b px-4 py-3 font-medium">Recent {familyLabel} runs</div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/95 text-left text-muted-foreground backdrop-blur">
                <tr><th className="px-3 py-2">Completed</th><th>Source</th><th>State</th><th>Events</th><th>Profiles</th><th>Claims</th><th>Parked</th><th>Errors</th></tr>
              </thead>
              <tbody>{summary.data?.runMetrics.map((run) => (
                <tr key={run.runId} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2">{shortDate(run.completedAt)}</td>
                  <td className="pr-3">{run.sourceId}</td>
                  <td className="pr-3"><span className={`rounded-full px-2 py-0.5 font-medium ${statusClass[run.status] || 'bg-muted'}`}>{run.status}</span></td>
                  <td className="pr-3 tabular-nums">{run.validEvents.toLocaleString()}</td>
                  <td className="pr-3 tabular-nums">{run.entityProfiles.toLocaleString()}</td>
                  <td className="pr-3 tabular-nums">{run.claims.toLocaleString()}</td>
                  <td className="pr-3 tabular-nums">{run.parked.toLocaleString()}</td>
                  <td className="pr-3 tabular-nums">{run.errors.toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {hasTaskLedger && (
        <div className="grid gap-4 xl:grid-cols-[1fr,360px]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search source ID, native ID, name or URL" className="pl-9" />
              </div>
              <select value={kind} onChange={(event) => setKind(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="">All types</option>
                <option value="artist">Artists</option>
                <option value="band">Bands</option>
                <option value="venue">Venues</option>
                <option value="gig">Gigs</option>
                <option value="artist-index-page">Artist pages</option>
                <option value="venue-index-page">Venue pages</option>
                <option value="gig-index">Gig indexes</option>
              </select>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="">All states</option>
                <option value="queued">Queued</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/95 text-left text-xs text-muted-foreground backdrop-blur">
                    <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Updated</th></tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={`${task.sourceId}:${task.taskKey}`} onClick={() => setSelected(task)} className={`cursor-pointer border-t hover:bg-muted/40 ${selected?.taskKey === task.taskKey ? 'bg-muted/60' : ''}`}>
                        <td className="max-w-[360px] px-3 py-2">
                          <div className="truncate font-medium">{task.name || task.nativeId || task.kind || 'Task'}</div>
                          <div className="truncate text-xs text-muted-foreground">{task.nativeId || task.logicalTaskKey || task.taskKey}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{task.sourceId.replace(`${family}-`, '')}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusClass[task.status] || 'bg-muted'}`}>{task.status}</span></td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{shortDate(task.updatedAt)}</td>
                      </tr>
                    ))}
                    {!tasks.isLoading && filteredTasks.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No matching Backline tasks</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3 font-medium">Task inspector</div>
            {!selected && <div className="p-4 text-sm text-muted-foreground">Select an Artist, band, Venue or Gig task to inspect its Claims and evidence provenance.</div>}
            {selected && (
              <div className="space-y-4 p-4 text-sm">
                <div>
                  <div className="font-medium">{selected.name || selected.nativeId || selected.kind}</div>
                  <div className="mt-1 break-all text-xs text-muted-foreground">{selected.nativeId || selected.logicalTaskKey}</div>
                  {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs underline">Source page <ExternalLink className="h-3 w-3" /></a>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border p-2"><div className="text-muted-foreground">State</div><div className="mt-1 font-medium">{selected.status}</div></div>
                  <div className="rounded border p-2"><div className="text-muted-foreground">Updated</div><div className="mt-1 font-medium">{shortDate(selected.updatedAt)}</div></div>
                </div>
                {selected.lastError && <div className="rounded border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">{selected.lastError}</div>}
                {!subject && <div className="text-xs text-muted-foreground">This is an enumeration or control task. Select a hydrated entity for Claims.</div>}
                {subject && subjectQuery.isLoading && <div className="text-xs text-muted-foreground">Loading Claims...</div>}
                {subjectQuery.data && (
                  <>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-muted px-2 py-1">{subjectQuery.data.claims.length} Claims</span>
                      <span className={`rounded px-2 py-1 ${subjectQuery.data.resolutions.length ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>{subjectQuery.data.resolutions.length ? `${subjectQuery.data.resolutions.length} resolution` : 'unresolved'}</span>
                      {subjectQuery.data.conflicts.length > 0 && <span className="rounded bg-red-500/10 px-2 py-1 text-red-600">{subjectQuery.data.conflicts.length} conflicts</span>}
                    </div>
                    <div className="max-h-[330px] overflow-auto"><ClaimsList claims={Object.values(subjectQuery.data.latestByPredicate)} /></div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 font-medium">{familyLabel} sources and evidence</div>
        <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
          {(summary.data?.sources ?? []).map((source) => (
            <button key={source.id} onClick={() => { setSelectedSource(source.id); setSelectedObservation(null); }} className={`rounded-md border p-3 text-left hover:bg-muted/40 ${selectedSource === source.id ? 'bg-muted/60' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{source.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.consecutiveFailures ? statusClass.degraded : statusClass.healthy}`}>{source.consecutiveFailures ? 'degraded' : source.enabled ? 'enabled' : 'inactive'}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{source.id}</div>
              <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                <span>{source.shadow ? 'shadow' : 'write'}</span>
                <span>{source.authorityClass || 'unclassified'}</span>
                <span>{source.cadence || 'manual'}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Last success: {shortDate(source.lastSuccessfulRunAt)}</div>
            </button>
          ))}
          {!summary.isLoading && (summary.data?.sources.length ?? 0) === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No registry configuration is currently present for this family.</div>
          )}
        </div>
        {selectedSource && sourceQuery.data && (
          <div className="border-t p-3">
            <div className="mb-2 text-xs font-medium">Recent Observations · {selectedSource}</div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground"><tr><th className="py-1">Observed</th><th>Items</th><th>HTTP</th><th>Complete</th><th>Evidence</th></tr></thead>
                <tbody>{sourceQuery.data.observations.map((observation) => (
                  <tr key={observation.id} onClick={() => setSelectedObservation(observation)} className={`cursor-pointer border-t hover:bg-muted/40 ${selectedObservation?.id === observation.id ? 'bg-muted/60' : ''}`}>
                    <td className="whitespace-nowrap py-1.5 pr-3">{shortDate(observation.observedAt)}</td>
                    <td className="pr-3">{observation.itemCount ?? 0}</td>
                    <td className="pr-3">{observation.httpStatus ?? '-'}</td>
                    <td className="pr-3">{observation.complete === false ? 'partial' : 'yes'}</td>
                    <td className="max-w-[440px] truncate font-mono text-[10px] text-muted-foreground">{observation.evidenceKey || '-'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        {selectedObservation && (
          <div className="border-t p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Observation {selectedObservation.id}</div>
                <div className="mt-1 text-xs text-muted-foreground">{shortDate(selectedObservation.observedAt)} · {selectedObservation.itemCount ?? 0} items</div>
              </div>
              {observationQuery.data && <span className="rounded bg-muted px-2 py-1 text-xs">{observationQuery.data.claims.length.toLocaleString()} Claims{observationQuery.data.truncated ? '+' : ''}</span>}
            </div>
            {observationQuery.isLoading && <div className="mt-3 text-xs text-muted-foreground">Loading Observation Claims...</div>}
            {observationQuery.data && <div className="mt-3 max-h-96 overflow-auto"><ClaimsList claims={observationQuery.data.claims} /></div>}
          </div>
        )}
      </div>

      {(summary.data?.failures.length ?? 0) > 0 && (
        <div className="rounded-lg border border-red-500/20">
          <div className="border-b px-4 py-3 font-medium">Recent failures</div>
          <div className="divide-y">{summary.data?.failures.map((failure) => <div key={`${failure.sourceId}:${failure.taskKey}`} className="p-3 text-xs"><div className="font-medium">{failure.name || failure.nativeId || failure.taskKey}</div><div className="mt-1 text-red-600 dark:text-red-400">{failure.lastError || 'Failed without recorded error text'}</div></div>)}</div>
        </div>
      )}
    </div>
  );
}
