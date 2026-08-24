import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Database,
  Gauge,
  GitBranch,
  MapPinned,
  Network,
  Radio,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CircleMarker, MapContainer, TileLayer, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { godmodeService } from '@/lib/services/godmode-service';
import { CARTO_VOYAGER_TILES } from '../venues/map/config/tileProviders';
import { useGodmodeArtists, useGodmodeUsers, useGodmodeVenues } from './lib/queries';
import { buildGodmodeIntelligence, type DistributionPoint, type GodmodeIntelligence } from './lib/intelligence';

type GrowthRange = 'all' | 'year' | '90';
type ActivityView = 'daily' | 'monthly';

const chartTooltipStyle = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  boxShadow: '0 12px 30px rgba(0,0,0,.15)',
  fontSize: 12,
};

function compact(value: number): string {
  return new Intl.NumberFormat('en-GB', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00Z`));
}

function monthDelta(value: number): string {
  return value > 0 ? `+${value.toLocaleString()} this month` : 'No change this month';
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: typeof Activity;
  accent?: boolean;
}) {
  return (
    <div className={cn('group relative overflow-hidden rounded-2xl border bg-card p-4', accent && 'border-orange-500/30 bg-orange-500/[0.04]')}>
      <div className="absolute right-2 top-2 h-16 w-16 rounded-full bg-primary/[0.04] blur-2xl transition group-hover:bg-primary/[0.08]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="mt-1 text-3xl font-black tabular-nums tracking-tight sm:text-4xl">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          {detail && <div className="mt-1 truncate text-xs text-muted-foreground">{detail}</div>}
        </div>
        <div className={cn('rounded-xl border bg-background/70 p-2 text-muted-foreground', accent && 'border-orange-500/20 text-orange-500')}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, detail, icon: Icon }: { eyebrow?: string; title: string; detail?: string; icon?: typeof Activity }) {
  return (
    <div className="min-w-0">
      {eyebrow && <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">{eyebrow}</div>}
      <div className="mt-0.5 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
      </div>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function Toggle<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="inline-flex rounded-xl border bg-muted/30 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
            value === option.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Ring({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div
        className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(#f97316 ${safe * 3.6}deg, hsl(var(--muted)) 0deg)` }}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-card text-xs font-black tabular-nums">{safe}%</div>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold">{label}</div>
        <div className="text-[11px] text-muted-foreground">{safe >= 90 ? 'Strong' : safe >= 70 ? 'Healthy' : safe >= 50 ? 'Improving' : 'Needs work'}</div>
      </div>
    </div>
  );
}

function ActivityDistribution({ data, title, average, median, active, future }: { data: DistributionPoint[]; title: string; average: number; median: number; active: number; future: number }) {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="border-b bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">{title}</h3>
          <span className="rounded-full border bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground">rolling 28d</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniNumber label="Avg / entity" value={average.toFixed(1)} />
          <MiniNumber label="Median active" value={median.toFixed(1)} />
          <MiniNumber label="Active" value={active.toLocaleString()} />
          <MiniNumber label="Future gigs" value={future.toLocaleString()} />
        </div>
      </div>
      <div className="h-48 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.55} />
            <XAxis dataKey="band" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted) / .35)' }} />
            <Bar dataKey="count" name="Entities" fill="#f97316" radius={[7, 7, 2, 2]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MiniNumber({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/60 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}

function HealthCard({ title, health }: { title: string; health: GodmodeIntelligence['health']['artists'] }) {
  return (
    <Card className="rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{title}</h3>
        <Gauge className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-4 flex flex-col gap-4 xl:flex-row">
        <Ring value={health.completeness} label="Complete" />
        <Ring value={health.freshness} label="Fresh" />
        <Ring value={health.confidence} label="Confident" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3">
        {health.gaps.map((gap) => (
          <div key={gap.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted-foreground">{gap.label}</span>
            <span className="font-bold tabular-nums">{gap.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.65fr_.75fr]">
        <Skeleton className="h-[390px] rounded-2xl" />
        <Skeleton className="h-[390px] rounded-2xl" />
      </div>
      <Skeleton className="h-[340px] rounded-2xl" />
    </div>
  );
}

export default function IntelligencePanel() {
  const artistsQuery = useGodmodeArtists();
  const venuesQuery = useGodmodeVenues();
  const usersQuery = useGodmodeUsers();
  const eventsQuery = useQuery({
    queryKey: ['godmode', 'intelligence-events'],
    queryFn: () => godmodeService.getAllEvents('2024-01-01', '2099-12-31'),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });

  const [growthRange, setGrowthRange] = useState<GrowthRange>('all');
  const [activityView, setActivityView] = useState<ActivityView>('daily');

  const intelligence = useMemo(() => {
    if (!artistsQuery.data || !venuesQuery.data || !usersQuery.data || !eventsQuery.data) return null;
    return buildGodmodeIntelligence(artistsQuery.data, venuesQuery.data, eventsQuery.data, usersQuery.data);
  }, [artistsQuery.data, venuesQuery.data, usersQuery.data, eventsQuery.data]);

  if (artistsQuery.isLoading || venuesQuery.isLoading || usersQuery.isLoading || eventsQuery.isLoading) return <LoadingDashboard />;

  if (!intelligence || artistsQuery.isError || venuesQuery.isError || usersQuery.isError || eventsQuery.isError) {
    return (
      <Card className="rounded-2xl border-destructive/40 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-destructive"><Activity className="h-4 w-4" /> BNDY Intelligence is unavailable.</div>
        <p className="mt-1 text-xs text-muted-foreground">The operational dashboard below is still available.</p>
      </Card>
    );
  }

  const growthCutoff = growthRange === '90'
    ? new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
    : growthRange === 'year'
      ? new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)
      : '0000-01-01';
  const growthData = intelligence.growth.points.filter((point) => point.date >= growthCutoff);
  const activityData = activityView === 'daily' ? intelligence.gigActivity.daily90 : intelligence.gigActivity.monthly12;
  const activityKey = activityView === 'daily' ? 'date' : 'label';
  const maxGeoGigs = Math.max(...intelligence.geography.map((point) => point.gigs), 1);
  const sourceMax = Math.max(...intelligence.sources.map((source) => source.count), 1);
  const change = intelligence.headline.gigsMonth.changePct;

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-orange-500/[0.06] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
              <Radio className="h-3.5 w-3.5" /> Live catalogue intelligence
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">BNDY Intelligence</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">The shape, growth and pulse of the grassroots live-music data BNDY knows today.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            Updated {new Date(intelligence.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="Artists known" value={intelligence.headline.artists.total} detail={monthDelta(intelligence.headline.artists.month)} icon={UserRound} />
        <MetricTile label="Venues known" value={intelligence.headline.venues.total} detail={monthDelta(intelligence.headline.venues.month)} icon={Building2} />
        <MetricTile label="Gigs this month" value={intelligence.headline.gigsMonth.total} detail={change === null ? 'No prior-month baseline' : `${change >= 0 ? '+' : ''}${change}% vs last month`} icon={CalendarDays} accent />
        <MetricTile label="Gigs tonight" value={intelligence.headline.gigsTonight} detail={`${intelligence.tonight.venues} venues · ${intelligence.tonight.artists} artists`} icon={Radio} accent />
        <MetricTile label="Active areas" value={intelligence.headline.activeAreas} detail="with a gig this month" icon={MapPinned} />
        <MetricTile label="BNDY users" value={intelligence.headline.users.total} detail={monthDelta(intelligence.headline.users.month)} icon={UsersRound} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_.75fr]">
        <Card className="rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle eyebrow="Growth" title="BNDY network growth" detail="Cumulative artists, venues and users from record creation dates." icon={TrendingUp} />
            <Toggle value={growthRange} onChange={setGrowthRange} options={[{ value: 'all', label: 'All' }, { value: 'year', label: '12m' }, { value: '90', label: '90d' }]} />
          </div>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="artistsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.34} /><stop offset="95%" stopColor="#f97316" stopOpacity={0.01} /></linearGradient>
                  <linearGradient id="venuesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.24} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0.01} /></linearGradient>
                  <linearGradient id="usersArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.20} /><stop offset="95%" stopColor="#60a5fa" stopOpacity={0.01} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 10 }} minTickGap={32} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} width={44} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(value) => dateLabel(String(value))} />
                <Area type="monotone" dataKey="artists" name="Artists" stroke="#f97316" fill="url(#artistsArea)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="venues" name="Venues" stroke="#22c55e" fill="url(#venuesArea)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="users" name="Users" stroke="#60a5fa" fill="url(#usersArea)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 border-t pt-3 text-xs text-muted-foreground">
            <span><b className="text-orange-500">●</b> Artists +{intelligence.headline.artists.week.toLocaleString()} this week</span>
            <span><b className="text-emerald-500">●</b> Venues +{intelligence.headline.venues.week.toLocaleString()} this week</span>
            <span><b className="text-blue-400">●</b> Users +{intelligence.headline.users.week.toLocaleString()} this week</span>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-orange-500/20 bg-gradient-to-br from-orange-500/[0.09] via-card to-card p-5">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <SectionTitle eyebrow="Right now" title="Tonight in Britain" icon={Radio} />
              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-orange-500">Observed by BNDY</span>
            </div>
            <div className="mt-6 text-6xl font-black tabular-nums tracking-tighter text-orange-500">{intelligence.tonight.gigs.toLocaleString()}</div>
            <div className="text-sm font-semibold">grassroots gigs tonight</div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <MiniNumber label="Venues" value={intelligence.tonight.venues.toLocaleString()} />
              <MiniNumber label="Artists" value={intelligence.tonight.artists.toLocaleString()} />
              <MiniNumber label="Areas" value={intelligence.tonight.areas.toLocaleString()} />
            </div>
            {intelligence.tonight.busiestArea && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border bg-background/55 p-3 text-xs">
                <MapPinned className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">Busiest tonight</span>
                <span className="ml-auto font-bold">{intelligence.tonight.busiestArea}</span>
              </div>
            )}
            <div className="mt-4 border-t pt-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Discovery velocity</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-xl font-black tabular-nums">{intelligence.discovery.today}</div><div className="text-[10px] text-muted-foreground">today</div></div>
                <div><div className="text-xl font-black tabular-nums">{intelligence.discovery.week}</div><div className="text-[10px] text-muted-foreground">7 days</div></div>
                <div><div className="text-xl font-black tabular-nums">{intelligence.discovery.month}</div><div className="text-[10px] text-muted-foreground">month</div></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
        <Card className="rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle eyebrow="Music activity" title="Gigs taking place" detail="When the gigs happen, not when BNDY discovered them." icon={CalendarDays} />
            <Toggle value={activityView} onChange={setActivityView} options={[{ value: 'daily', label: '90 days' }, { value: 'monthly', label: '12 months' }]} />
          </div>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                <defs><linearGradient id="gigArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.4} /><stop offset="95%" stopColor="#f97316" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey={activityKey} tickFormatter={activityView === 'daily' ? dateLabel : undefined} tick={{ fontSize: 10 }} minTickGap={28} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} width={38} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(value) => activityView === 'daily' ? dateLabel(String(value)) : String(value)} />
                <Area type="monotone" dataKey="gigs" name="Gigs" stroke="#f97316" strokeWidth={2.5} fill="url(#gigArea)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl p-4 sm:p-5">
          <SectionTitle eyebrow="Rhythm" title="Gigs by day" detail="Last 12 months of observed gigs." icon={Activity} />
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intelligence.gigActivity.dayOfWeek} margin={{ top: 10, right: 5, bottom: 0, left: -24 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.45} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted) / .35)' }} />
                <Bar dataKey="gigs" name="Gigs" fill="#f97316" radius={[7, 7, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/15 p-4 sm:p-5">
          <SectionTitle eyebrow="Geography" title="Where live music is happening" detail="Gig density by venue area for the current month." icon={MapPinned} />
          <span className="text-xs text-muted-foreground">Top {intelligence.geography.length} active areas</span>
        </div>
        <div className="grid xl:grid-cols-[1.55fr_.65fr]">
          <div className="h-[380px] min-w-0 border-b xl:border-b-0 xl:border-r">
            {intelligence.geography.length > 0 ? (
              <MapContainer center={[54.45, -3.2]} zoom={5} minZoom={5} maxZoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%', background: 'hsl(var(--muted))' }}>
                <TileLayer url={CARTO_VOYAGER_TILES.url} attribution={CARTO_VOYAGER_TILES.attribution} maxZoom={CARTO_VOYAGER_TILES.maxZoom} subdomains={CARTO_VOYAGER_TILES.subdomains.split('')} />
                {intelligence.geography.map((point) => (
                  <CircleMarker
                    key={point.area}
                    center={[point.latitude, point.longitude]}
                    radius={Math.max(6, Math.min(26, 5 + Math.sqrt(point.gigs / maxGeoGigs) * 22))}
                    pathOptions={{ color: '#ea580c', fillColor: '#f97316', fillOpacity: 0.58, weight: 1.5 }}
                  >
                    <LeafletTooltip direction="top">
                      <div className="text-xs"><b>{point.area}</b><br />{point.gigs.toLocaleString()} gigs · {point.venues.toLocaleString()} venues · {point.artists.toLocaleString()} artists</div>
                    </LeafletTooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No geocoded gig activity yet.</div>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Most active</div>
            <div className="mt-3 space-y-3">
              {intelligence.geography.slice(0, 10).map((point, index) => (
                <div key={point.area} className="group">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-right font-black text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{point.area}</span>
                    <span className="font-black tabular-nums">{point.gigs.toLocaleString()}</span>
                  </div>
                  <div className="ml-8 mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.max(4, (point.gigs / maxGeoGigs) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActivityDistribution data={intelligence.artists.distribution} title="Artist activity" average={intelligence.artists.averageGigs} median={intelligence.artists.medianActiveGigs} active={intelligence.artists.active} future={intelligence.artists.withFutureGig} />
        <ActivityDistribution data={intelligence.venues.distribution} title="Venue activity" average={intelligence.venues.averageGigs} median={intelligence.venues.medianActiveGigs} active={intelligence.venues.active} future={intelligence.venues.withFutureGig} />
      </div>

      <Card className="rounded-2xl p-4 sm:p-5">
        <SectionTitle eyebrow="The graph" title="Artist ↔ venue network" detail="Relationships created by artists actually playing venues." icon={Network} />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <MiniNumber label="Relationships" value={intelligence.network.relationships.toLocaleString()} />
          <MiniNumber label="Repeat pairings" value={intelligence.network.repeatRelationships.toLocaleString()} />
          <MiniNumber label="New this month" value={intelligence.network.newRelationshipsMonth.toLocaleString()} />
          <MiniNumber label="Venues / artist" value={intelligence.network.avgVenuesPerArtist.toFixed(1)} />
          <MiniNumber label="Artists / venue" value={intelligence.network.avgArtistsPerVenue.toFixed(1)} />
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl border bg-muted/20 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-orange-500/10 text-orange-500"><GitBranch className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><div className="text-sm font-bold">The network itself is now measurable.</div><div className="text-xs text-muted-foreground">New artist-to-venue relationships are a better signal of ecosystem growth than catalogue size alone.</div></div>
          <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <HealthCard title="Artist data health" health={intelligence.health.artists} />
        <HealthCard title="Venue data health" health={intelligence.health.venues} />
      </div>

      <Card className="rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle eyebrow="Discovery" title="Where BNDY's knowledge came from" detail="Source mix for gigs discovered in the last 30 days." icon={Database} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> {intelligence.discovery.month.toLocaleString()} gigs added this month</div>
        </div>
        {intelligence.sources.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">Source provenance is not present on recent gig records yet.</p>
        ) : (
          <div className="mt-5 grid gap-x-8 gap-y-3 md:grid-cols-2">
            {intelligence.sources.map((source) => (
              <div key={source.source}>
                <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold">{source.source}</span><span className="font-black tabular-nums">{source.count.toLocaleString()}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(3, (source.count / sourceMax) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <span>Catalogue growth is reconstructed from creation timestamps on records that exist today; deleted historical records are not represented.</span>
        <span className="font-medium">Observed by BNDY · not yet a claim of total UK market coverage</span>
      </div>
    </section>
  );
}
