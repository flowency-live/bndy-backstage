import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { backlineService, type BacklineProjectionItem } from '@/lib/services/backline-service';
import { describeCandidate, freshnessTone, summariseWouldWrites } from './operations-view';

function dateTime(value?: string | null) {
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

const statusStyles: Record<BacklineProjectionItem['status'], string> = {
  shadow: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

function controlLabel(control?: { enabled: boolean; state: string }) {
  if (control?.enabled) return 'CANONICAL WRITES ENABLED';
  if (control?.state === 'disabled-explicit') return 'SHADOW. EXPLICITLY OFF';
  return 'SHADOW. DEFAULT OFF';
}

export default function BacklineOperations() {
  const [family, setFamily] = useState('lemonrock');
  const [selected, setSelected] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ['backline', 'summary', family],
    queryFn: () => backlineService.summary(family),
    refetchInterval: 60000,
  });
  const operations = useQuery({
    queryKey: ['backline', 'operations', family],
    queryFn: () => backlineService.operations(family, 50),
    refetchInterval: 30000,
  });

  if (operations.isError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Backline operations unavailable</div>
        <div className="mt-1 text-sm text-muted-foreground">The read-only operations endpoint could not be reached.</div>
      </div>
    );
  }

  const data = operations.data;
  const families = summary.data?.families ?? [];
  const control = data?.projectionControl;
  const wouldWrite = data?.wouldWrite ?? [];
  const totals = summariseWouldWrites(wouldWrite);
  const selectedItem = wouldWrite.find((item) => item.idempotencyKey === selected) ?? null;
  const controlTone = control?.enabled
    ? 'bg-red-500/10 text-red-700 dark:text-red-300'
    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';

  const detailRows: Array<[string, string | undefined]> = selectedItem ? [
    ['Observation', selectedItem.observationId],
    ['Candidate', selectedItem.candidateKey],
    ['Source event', selectedItem.candidate?.sourceEventKey],
    ['Title', selectedItem.candidate?.title],
    ['Artist external id', selectedItem.candidate?.artistExternalId],
    ['Venue external id', selectedItem.candidate?.venueExternalId],
    ['Venue address', selectedItem.candidate?.venueAddress],
    ['Ends', selectedItem.candidate?.endTime],
    ['Price', selectedItem.candidate?.price],
    ['Admission', selectedItem.candidate?.admissionStatus],
    ['Event URL', selectedItem.candidate?.eventUrl],
    ['Ticket URL', selectedItem.candidate?.ticketUrl],
    ['Observed', selectedItem.candidate?.observedAt ? dateTime(selectedItem.candidate.observedAt) : undefined],
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Activity className="h-5 w-5" /> Backline operations</h2>
          <p className="text-sm text-muted-foreground">What ran, whether it is fresh, and what Backline would write if projection were enabled.</p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${controlTone}`}>
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          {controlLabel(control)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {families.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setFamily(item.id); setSelected(null); }}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${item.id === family ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Source freshness</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Verdict</th>
                <th className="px-3 py-2">Last success</th>
                <th className="px-3 py-2">Age (h)</th>
                <th className="px-3 py-2">Failures</th>
                <th className="px-3 py-2">Write mode</th>
              </tr>
            </thead>
            <tbody>
              {(data?.freshness ?? []).map((row) => {
                const tone = freshnessTone(row.status);
                return (
                  <tr key={row.sourceId} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {row.name ?? row.sourceId}
                      <div className="text-xs font-normal text-muted-foreground">{row.sourceId}</div>
                    </td>
                    <td className="px-3 py-2">{row.sourceRole ?? 'unknown'}, {row.cadence ?? 'manual'}</td>
                    <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${tone.className}`}>{tone.label}</span></td>
                    <td className="px-3 py-2">{dateTime(row.lastSuccessfulRunAt)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.ageHours ?? 'n/a'}
                      <span className="text-xs text-muted-foreground"> / {row.maxStalenessHours}</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.consecutiveFailures}</td>
                    <td className="px-3 py-2">{row.shadow ? 'shadow' : 'write'}, {row.writerAuthority ?? 'cowork'}</td>
                  </tr>
                );
              })}
              {!operations.isLoading && (data?.freshness ?? []).length === 0 && (
                <tr><td className="px-3 py-4 text-muted-foreground" colSpan={7}>No source registry records for this family.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Would-write decisions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Decisions sampled" value={totals.total} detail={`${data?.observationsSampled ?? 0} recent observations${data?.truncated ? ', truncated' : ''}`} />
          <Metric label="Would create" value={totals.byAction.create ?? 0} detail="Events Backline would add" />
          <Metric label="Shadow only" value={totals.byStatus.shadow ?? 0} detail="Recorded, nothing written" />
          <Metric label="Failed" value={totals.byStatus.failed ?? 0} detail="Retryable projection failures" />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Decision</th>
                <th className="px-3 py-2">Proposed fact</th>
                <th className="px-3 py-2">Claims</th>
              </tr>
            </thead>
            <tbody>
              {wouldWrite.map((item) => (
                <tr
                  key={item.idempotencyKey ?? `${item.observationId}:${item.candidateKey}`}
                  className={`cursor-pointer border-t hover:bg-accent/40 ${item.idempotencyKey === selected ? 'bg-accent/60' : ''}`}
                  onClick={() => setSelected(item.idempotencyKey ?? null)}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{dateTime(item.completedAt)}</td>
                  <td className="px-3 py-2">{item.sourceId}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusStyles[item.status]}`}>{item.status.toUpperCase()}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{item.wouldWrite ?? item.action}</span>
                  </td>
                  <td className="px-3 py-2">{describeCandidate(item.candidate)}</td>
                  <td className="px-3 py-2 tabular-nums">{item.candidate?.supportingClaims ?? 0}</td>
                </tr>
              ))}
              {!operations.isLoading && wouldWrite.length === 0 && (
                <tr><td className="px-3 py-4 text-muted-foreground" colSpan={5}>No projection decisions recorded for the sampled observations.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {selectedItem && (
          <div className="rounded-lg border bg-card p-4 text-sm">
            <div className="font-medium">{describeCandidate(selectedItem.candidate)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{selectedItem.reason ?? selectedItem.error ?? 'No reason recorded'}</div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {detailRows.filter(([, value]) => value).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-36 shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Projection runs</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Completed</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Observation</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Claims</th>
                <th className="px-3 py-2">Failures</th>
              </tr>
            </thead>
            <tbody>
              {(data?.projectionRuns ?? []).map((run) => (
                <tr key={run.observationId} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{dateTime(run.completedAt)}</td>
                  <td className="px-3 py-2">{run.sourceId}</td>
                  <td className="px-3 py-2 break-all text-xs">{run.observationId}</td>
                  <td className="px-3 py-2">{run.status}</td>
                  <td className="px-3 py-2 tabular-nums">{run.counts.itemsSeen ?? 0} / {run.expectedItems}</td>
                  <td className="px-3 py-2 tabular-nums">{run.counts.claims ?? 0}</td>
                  <td className="px-3 py-2 tabular-nums">{run.counts.projectionFailures ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Not shown yet</div>
        <div className="mt-1 text-muted-foreground">
          {data?.exceptions.reason ?? 'Projection exceptions are not exposed by this endpoint.'} Dead-letter queue depths need an IAM grant to the API.
        </div>
      </div>
    </div>
  );
}
