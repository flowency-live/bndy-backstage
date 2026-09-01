import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Database, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { backlineService, type BacklineCanonicalHydration } from '@/lib/services/backline-service';

const stateLabels: Record<BacklineCanonicalHydration['state'], string> = {
  'not-ready': 'NOT READY',
  'baseline-stale': 'DELTA REQUIRED',
  hydrating: 'HYDRATING NOW',
  attention: 'NEEDS ATTENTION',
  converged: 'CONVERGED',
};

const stateStyles: Record<BacklineCanonicalHydration['state'], string> = {
  'not-ready': 'bg-red-500/10 text-red-700 dark:text-red-300',
  'baseline-stale': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  hydrating: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  attention: 'bg-red-500/10 text-red-700 dark:text-red-300',
  converged: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

function dateTime(value?: string) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

export default function BacklineCorpus() {
  const hydration = useQuery({
    queryKey: ['backline', 'canonical-hydration'],
    queryFn: () => backlineService.hydration(),
    refetchInterval: 15000,
  });

  if (hydration.isError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Canonical corpus status unavailable</div>
        <div className="mt-1 text-sm text-muted-foreground">The read-only hydration endpoint could not be reached.</div>
      </div>
    );
  }

  const data = hydration.data;
  const latest = data?.latest;
  const baseline = data?.baseline;
  const state = data?.state ?? 'not-ready';
  const changeTotal = (latest?.inserted ?? 0) + (latest?.modified ?? 0) + (latest?.removed ?? 0);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Database className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Canonical corpus convergence</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">READ ONLY</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stateStyles[state]}`}>{stateLabels[state]}</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This is Backline's memory of canonical bndy. It separates the original baseline from later canonical changes so new source intelligence is compared with today's product data, not a stale snapshot.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => hydration.refetch()} disabled={hydration.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${hydration.isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <div className="rounded-lg border bg-background/60 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Original baseline</div>
            <div className="mt-2 font-medium">{baseline?.snapshotId ?? 'No valid baseline found'}</div>
            <div className="mt-1 text-sm text-muted-foreground">Completed {dateTime(baseline?.completedAt)}</div>
            <div className="mt-3 text-xs">{baseline?.status === 'complete' ? 'Immutable starting truth preserved' : 'Baseline is incomplete or unavailable'}</div>
          </div>
          <div className="hidden items-center justify-center text-muted-foreground lg:flex"><ArrowRight className="h-5 w-5" /></div>
          <div className="rounded-lg border bg-background/60 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest delta hydration</div>
            <div className="mt-2 font-medium">{latest?.runId ?? 'No delta run recorded'}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {latest ? `${latest.status} · updated ${dateTime(latest.updatedAt ?? latest.completedAt)}` : 'A read-only delta plan is the next operation'}
            </div>
            <div className="mt-3 text-xs">{latest?.status === 'complete' ? 'Backline caught up to this completion time' : 'Canonical BNDY remains ahead of the recorded Backline corpus'}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Canonical scanned" value={latest?.scanned ?? 0} detail="Artists, Venues, Events and Festivals inspected" />
        <Metric label="Changes found" value={changeTotal} detail={`${(latest?.inserted ?? 0).toLocaleString()} new · ${(latest?.modified ?? 0).toLocaleString()} changed · ${(latest?.removed ?? 0).toLocaleString()} removed`} />
        <Metric label="Claims built" value={latest?.claims ?? 0} detail="Atomic canonical assertions added to Backline" />
        <Metric label="Unchanged" value={latest?.unchanged ?? 0} detail={`${(latest?.checkpointsBackfilled ?? 0).toLocaleString()} sync checkpoints repaired`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="font-medium">What happens next</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {state === 'baseline-stale' && 'Run the bounded read-only delta plan. Review its insert, modify, removal and checkpoint totals before authorising any Backline write.'}
            {state === 'hydrating' && 'Backline is ingesting canonical changes now. This page refreshes automatically while the evidence graph grows.'}
            {state === 'converged' && 'Canonical convergence is proven. We can now compare fresh KLMA, Live Band Photos and Fizgig testimony against the current bndy corpus.'}
            {state === 'attention' && 'The latest hydration stopped. Preserve its partial evidence, inspect the recorded errors and resume only after adjudication.'}
            {state === 'not-ready' && 'The complete named baseline is missing or not readable. Hydration must remain blocked.'}
          </div>
          {latest?.errors?.length ? <div className="mt-3 rounded border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">{latest.errors.join(' · ')}</div> : null}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" /> Safety boundary</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Hydration writes only evidence, Claims, resolutions and checkpoints inside Backline. The global canonical projection gate is <span className="font-medium text-foreground">{data?.projectionControl.state === 'enabled' ? 'ENABLED' : 'OFF'}</span>. Hydration never authorises writes back into canonical bndy.
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Fizgig and Live Band Photos import lineage will be preserved as canonical history, then tested independently against fresh source-native snapshots.</div>
        </div>
      </div>
    </div>
  );
}
