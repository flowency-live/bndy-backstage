import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Globe2, MonitorSmartphone, MousePointerClick } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getGodmodeAnalytics, type AnalyticsMetricRow } from '@/lib/services/godmode-access-service';

const RANGE_OPTIONS = [
  { days: 1 as const, label: 'Today' },
  { days: 7 as const, label: '7 days' },
  { days: 30 as const, label: '30 days' },
];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  boxShadow: '0 12px 30px rgba(0,0,0,.15)',
  fontSize: 12,
};

function CompactMetric({ label, value, icon: Icon, loading }: { label: string; value?: string | number; icon: typeof Activity; loading?: boolean }) {
  return (
    <Card className="rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      {loading ? <Skeleton className="mt-2 h-8 w-20" /> : <div className="mt-1 text-3xl font-black tabular-nums tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value ?? '—'}</div>}
    </Card>
  );
}

function RankedList({ title, rows, loading }: { title: string; rows?: AnalyticsMetricRow[]; loading?: boolean }) {
  const max = Math.max(...(rows ?? []).map((row) => row.pageViews), 1);
  return (
    <Card className="rounded-2xl p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {loading ? (
        <div className="space-y-3"><Skeleton className="h-7 w-full" /><Skeleton className="h-7 w-5/6" /><Skeleton className="h-7 w-3/4" /></div>
      ) : !rows?.length ? (
        <p className="py-4 text-sm text-muted-foreground">No traffic yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 8).map((row, index) => (
            <div key={`${row.label}-${index}`}>
              <div className="flex min-w-0 items-center gap-3 text-xs">
                <span className="w-4 text-right font-black text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold" title={row.label}>{row.label || 'Direct'}</span>
                <span className="shrink-0 font-black tabular-nums">{row.pageViews.toLocaleString()}</span>
              </div>
              <div className="ml-7 mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(3, (row.pageViews / max) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </Card>
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Globe2 className="h-3.5 w-3.5" /> Cloudflare Web Analytics · privacy-first</div>
        <div className="inline-flex rounded-xl border bg-muted/30 p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => setDays(option.days)}
              className={cn('rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors', days === option.days ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {query.isError && <Card className="rounded-2xl border-destructive/40 p-4 text-sm text-destructive">Analytics unavailable: {(query.error as Error).message}</Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CompactMetric label="Page views" value={data?.pageViews} icon={Activity} loading={query.isLoading} />
        <CompactMetric label="Visits" value={data?.visits} icon={MousePointerClick} loading={query.isLoading} />
        <CompactMetric label="Pages / visit" value={pagesPerVisit} icon={Globe2} loading={query.isLoading} />
        <CompactMetric label="Mobile" value={mobileShare} icon={MonitorSmartphone} loading={query.isLoading} />
      </div>

      <Card className="rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-bold">Traffic pulse</h3><p className="text-xs text-muted-foreground">Page views over the selected period.</p></div>
          {data?.generatedAt && <span className="text-[11px] text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        <div className="mt-4 h-[230px]">
          {query.isLoading ? <Skeleton className="h-full w-full rounded-xl" /> : !data?.series.length ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">No traffic yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs><linearGradient id="trafficArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.38} /><stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} tick={{ fontSize: 10 }} minTickGap={28} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} width={42} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => new Date(`${String(value)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} />
                <Area type="monotone" dataKey="pageViews" name="Page views" stroke="#60a5fa" strokeWidth={2.5} fill="url(#trafficArea)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankedList title="Top pages" rows={data?.topPages} loading={query.isLoading} />
        <RankedList title="Referrers" rows={data?.referrers} loading={query.isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RankedList title="Countries" rows={data?.countries} loading={query.isLoading} />
        <RankedList title="Devices" rows={data?.devices} loading={query.isLoading} />
        <RankedList title="Browsers" rows={data?.browsers} loading={query.isLoading} />
      </div>
    </section>
  );
}
