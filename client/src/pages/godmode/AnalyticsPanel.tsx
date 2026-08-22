import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Globe2, MonitorSmartphone, MousePointerClick } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getGodmodeAnalytics, type AnalyticsMetricRow } from '@/lib/services/godmode-access-service';

const RANGE_OPTIONS = [
  { days: 1 as const, label: 'Today' },
  { days: 7 as const, label: '7 days' },
  { days: 30 as const, label: '30 days' },
];

function CompactMetric({ label, value, icon: Icon, loading }: { label: string; value?: string | number; icon: typeof Activity; loading?: boolean }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <div className="mt-1 text-2xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value ?? '—'}</div>}
    </Card>
  );
}

function RankedList({ title, rows, loading }: { title: string; rows?: AnalyticsMetricRow[]; loading?: boolean }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {loading ? (
        <div className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-5/6" /><Skeleton className="h-5 w-3/4" /></div>
      ) : !rows?.length ? (
        <p className="py-4 text-sm text-muted-foreground">No traffic yet.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.slice(0, 8).map((row, index) => (
            <div key={`${row.label}-${index}`} className="flex min-w-0 items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate" title={row.label}>{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{row.pageViews.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TrafficBars({ points }: { points: Array<{ date: string; pageViews: number }> }) {
  if (!points.length) return <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No traffic yet.</div>;
  const max = Math.max(...points.map((p) => p.pageViews), 1);
  return (
    <div className="flex h-32 items-end gap-1" aria-label="Page views over time">
      {points.map((point) => (
        <div key={point.date} className="group relative flex min-w-0 flex-1 items-end justify-center h-full">
          <div
            className="w-full min-w-[3px] rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
            style={{ height: `${Math.max((point.pageViews / max) * 100, point.pageViews ? 3 : 0)}%` }}
          />
          <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow group-hover:block">
            {new Date(`${point.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: {point.pageViews.toLocaleString()} views
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPanel() {
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const query = useQuery({
    queryKey: ['godmode', 'cloudflare-analytics', days],
    queryFn: () => getGodmodeAnalytics(days),
    staleTime: 60_000,
    retry: 1,
  });

  const data = query.data;
  const pagesPerVisit = data?.visits ? (data.pageViews / data.visits).toFixed(1) : '—';
  const mobile = data?.devices.find((row) => row.label.toLowerCase().includes('mobile'));
  const mobileShare = data?.pageViews && mobile ? `${Math.round((mobile.pageViews / data.pageViews) * 100)}%` : '—';

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">bndy.live traffic</h2>
          <p className="text-xs text-muted-foreground">Cloudflare Web Analytics · privacy-first site traffic</p>
        </div>
        <div className="inline-flex rounded-md border bg-card p-0.5">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => setDays(option.days)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                days === option.days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {query.isError && (
        <Card className="border-destructive/40 p-4 text-sm text-destructive">
          Analytics unavailable: {(query.error as Error).message}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CompactMetric label="Page views" value={data?.pageViews} icon={Activity} loading={query.isLoading} />
        <CompactMetric label="Visits" value={data?.visits} icon={MousePointerClick} loading={query.isLoading} />
        <CompactMetric label="Pages / visit" value={pagesPerVisit} icon={Globe2} loading={query.isLoading} />
        <CompactMetric label="Mobile" value={mobileShare} icon={MonitorSmartphone} loading={query.isLoading} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Page views</h3>
          {data?.generatedAt && <span className="text-[11px] text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        {query.isLoading ? <Skeleton className="h-32 w-full" /> : <TrafficBars points={data?.series ?? []} />}
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RankedList title="Top pages" rows={data?.topPages} loading={query.isLoading} />
        <RankedList title="Referrers" rows={data?.referrers} loading={query.isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <RankedList title="Countries" rows={data?.countries} loading={query.isLoading} />
        <RankedList title="Devices" rows={data?.devices} loading={query.isLoading} />
        <RankedList title="Browsers" rows={data?.browsers} loading={query.isLoading} />
      </div>
    </section>
  );
}
