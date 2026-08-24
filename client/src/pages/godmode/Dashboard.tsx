import { lazy, Suspense } from 'react';
import { Link } from 'wouter';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  MapPin,
  Sparkles,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatSourceName } from '@/lib/services/source-runs-service';
import {
  useGodmodeArtists,
  useGodmodeVenues,
  useReviewItems,
  useSourceActivity,
} from './lib/queries';

const IntelligencePanel = lazy(() => import('./IntelligencePanel'));
const AnalyticsPanel = lazy(() => import('./AnalyticsPanel'));

function PanelFallback({ height = 'h-72' }: { height?: string }) {
  return <Skeleton className={cn('w-full rounded-2xl', height)} />;
}

function KpiCard({
  label,
  value,
  href,
  tone,
  loading,
}: {
  label: string;
  value: number | string | undefined;
  href?: string;
  tone?: 'warn' | 'ok';
  loading?: boolean;
}) {
  const body = (
    <Card className={cn('rounded-2xl p-4 transition-colors', href && 'cursor-pointer hover:bg-muted/40')}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <div
          className={cn(
            'mt-1 text-3xl font-black tabular-nums tracking-tight',
            tone === 'warn' && typeof value === 'number' && value > 0 && 'text-orange-500',
            tone === 'ok' && 'text-emerald-600',
          )}
        >
          {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
        </div>
      )}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function GapRow({ label, count, href, icon: Icon }: { label: string; count: number; href: string; icon: typeof User }) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-muted/60">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="font-black tabular-nums text-orange-500">{count.toLocaleString()}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}

export default function GodmodeDashboard() {
  const reviewQuery = useReviewItems('open');
  const activityQuery = useSourceActivity(7);
  const artistsQuery = useGodmodeArtists();
  const venuesQuery = useGodmodeVenues();

  const openItems = reviewQuery.data ?? [];
  const artists = artistsQuery.data;
  const venues = venuesQuery.data;
  const sources = activityQuery.data?.sources ?? [];
  const addedToday = sources.reduce((n, source) => n + (source.points[source.points.length - 1]?.added ?? 0), 0);
  const added7d = sources.reduce((n, source) => n + source.totals.added, 0);
  const stalled = sources.filter((source) => source.totals.added === 0 && source.points.some((point) => point.state !== 'nofire'));
  const failedToday = sources.filter((source) => source.points[source.points.length - 1]?.state === 'failed');

  const reviewBySource = new Map<string, number>();
  for (const item of openItems) reviewBySource.set(item.sourceId, (reviewBySource.get(item.sourceId) ?? 0) + 1);

  return (
    <div className="space-y-8 pb-8">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Godmode</div>
        <h1 className="mt-1 text-xl font-black tracking-tight">BNDY control room</h1>
        <p className="mt-1 text-sm text-muted-foreground">Intelligence first. Operations and exceptions underneath.</p>
      </div>

      <Suspense fallback={<PanelFallback height="h-[620px]" />}>
        <IntelligencePanel />
      </Suspense>

      <section className="space-y-4 border-t pt-7">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Audience</div>
          <h2 className="mt-1 text-lg font-black tracking-tight">bndy.live traffic</h2>
          <p className="text-xs text-muted-foreground">What people are actually doing with the public experience.</p>
        </div>
        <Suspense fallback={<PanelFallback />}>
          <AnalyticsPanel />
        </Suspense>
      </section>

      <section className="space-y-4 border-t pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operations</div>
            <h2 className="mt-1 text-lg font-black tracking-tight">Exceptions and work queues</h2>
            <p className="text-xs text-muted-foreground">The admin layer stays here, but it no longer owns the dashboard.</p>
          </div>
          <Link href="/godmode/sources" className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <Activity className="h-3.5 w-3.5" /> Source operations
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Open reviews" value={reviewQuery.data?.length} href="/godmode/sources/review" tone="warn" loading={reviewQuery.isLoading} />
          <KpiCard label="Added today" value={activityQuery.data ? addedToday : undefined} href="/godmode/sources/activity" loading={activityQuery.isLoading} />
          <KpiCard label="Added · 7d" value={activityQuery.data ? added7d : undefined} href="/godmode/sources/activity" loading={activityQuery.isLoading} />
          <KpiCard label="Sources stalled" value={activityQuery.data ? stalled.length : undefined} href="/godmode/sources/activity" tone="warn" loading={activityQuery.isLoading} />
        </div>

        {failedToday.length > 0 && (
          <Card className="rounded-2xl border-red-500/30 bg-red-500/[0.04] p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-bold">{failedToday.length} source run(s) failed today</span>
              <span className="text-muted-foreground">{failedToday.map((source) => source.sourceName).join(', ')}</span>
              <Link href="/godmode/sources" className="ml-auto text-xs font-semibold text-primary hover:underline">Inspect →</Link>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-bold"><ClipboardList className="h-4 w-4 text-muted-foreground" /> Review queue</h3>
              <Link href="/godmode/sources/review" className="text-xs font-semibold text-primary hover:underline">Open queue →</Link>
            </div>
            {reviewQuery.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-2/3" /></div>
            ) : openItems.length === 0 ? (
              <p className="rounded-xl bg-emerald-500/[0.06] px-3 py-4 text-sm text-emerald-700 dark:text-emerald-400">Nothing waiting.</p>
            ) : (
              <div className="space-y-1">
                {Array.from(reviewBySource.entries()).sort((a, b) => b[1] - a[1]).map(([sourceId, count]) => (
                  <div key={sourceId} className="flex items-center justify-between rounded-xl px-2 py-2 text-sm hover:bg-muted/50">
                    <span className="truncate">{formatSourceName(sourceId)}</span>
                    <span className="font-black tabular-nums text-orange-500">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-muted-foreground" /> Data gaps</h3>
            {!artists || !venues ? (
              <div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4" /></div>
            ) : (
              <div className="-mx-2">
                <GapRow label="Artists needing review" count={artists.filter((artist) => artist.needs_review === true).length} href="/godmode/artists?filter=needs-review" icon={User} />
                <GapRow label="Artists with no location" count={artists.filter((artist) => !artist.location).length} href="/godmode/artists?filter=no-location" icon={User} />
                <GapRow label="Artists with no genres" count={artists.filter((artist) => !artist.genres || artist.genres.length === 0).length} href="/godmode/artists?filter=no-genres" icon={User} />
                <GapRow label="Artists with no socials" count={artists.filter((artist) => !artist.facebookUrl && !artist.instagramUrl).length} href="/godmode/artists?filter=no-socials" icon={User} />
                <GapRow label="Venues with no Place ID" count={venues.filter((venue) => !venue.googlePlaceId).length} href="/godmode/venues?filter=no-place-id" icon={MapPin} />
                <GapRow label="Venues with no socials" count={venues.filter((venue) => !venue.website && !(Array.isArray(venue.socialMediaUrls) && venue.socialMediaUrls.length > 0)).length} href="/godmode/venues?filter=no-socials" icon={MapPin} />
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
