// Godmode › Dashboard — queue-centric landing.
//
// The old dashboard fetched four full tables to show four count cards.
// This one is organised around "what needs my attention": open review items,
// stalled sources, and data-quality gaps that deep-link into pre-filtered
// catalogue pages. Every section renders as soon as its own query lands.

import { Link } from 'wouter';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ClipboardList,
  MapPin,
  Music,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatSourceName } from '@/lib/services/source-runs-service';
import AnalyticsPanel from './AnalyticsPanel';
import {
  useGodmodeArtists,
  useGodmodeEvents,
  useGodmodeUsers,
  useGodmodeVenues,
  useReviewItems,
  useSourceActivity,
} from './lib/queries';

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
    <Card className={cn('p-4 transition-colors', href && 'hover:bg-muted/50 cursor-pointer')}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <div
          className={cn(
            'mt-1 text-3xl font-bold tabular-nums',
            tone === 'warn' && typeof value === 'number' && value > 0 && 'text-orange-500',
            tone === 'ok' && 'text-green-600',
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
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <span className="font-semibold tabular-nums text-orange-500">{count.toLocaleString()}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}

export default function GodmodeDashboard() {
  const reviewQuery = useReviewItems('open');
  const activityQuery = useSourceActivity(7);
  const artistsQuery = useGodmodeArtists();
  const venuesQuery = useGodmodeVenues();
  const eventsQuery = useGodmodeEvents();
  const usersQuery = useGodmodeUsers();

  const openItems = reviewQuery.data ?? [];
  const artists = artistsQuery.data;
  const venues = venuesQuery.data;

  const sources = activityQuery.data?.sources ?? [];
  const addedToday = sources.reduce((n, s) => n + (s.points[s.points.length - 1]?.added ?? 0), 0);
  const added7d = sources.reduce((n, s) => n + s.totals.added, 0);
  const stalled = sources.filter((s) => s.totals.added === 0 && s.points.some((p) => p.state !== 'nofire'));
  const failedToday = sources.filter((s) => s.points[s.points.length - 1]?.state === 'failed');

  // Review items grouped by source for the attention panel.
  const reviewBySource = new Map<string, number>();
  for (const item of openItems) {
    reviewBySource.set(item.sourceId, (reviewBySource.get(item.sourceId) ?? 0) + 1);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">What needs attention, then the catalogue.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Open reviews"
          value={reviewQuery.data?.length}
          href="/godmode/sources/review"
          tone="warn"
          loading={reviewQuery.isLoading}
        />
        <KpiCard label="Added today" value={activityQuery.data ? addedToday : undefined} href="/godmode/sources/activity" loading={activityQuery.isLoading} />
        <KpiCard label="Added · 7d" value={activityQuery.data ? added7d : undefined} href="/godmode/sources/activity" loading={activityQuery.isLoading} />
        <KpiCard
          label="Sources stalled"
          value={activityQuery.data ? stalled.length : undefined}
          href="/godmode/sources/activity"
          tone="warn"
          loading={activityQuery.isLoading}
        />
      </div>

      {/* Faults surface immediately — a failed run must never look like a quiet day. */}
      {failedToday.length > 0 && (
        <Card className="border-l-4 border-l-red-500 p-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="font-semibold">{failedToday.length} source run(s) failed today:</span>
            <span className="text-muted-foreground">
              {failedToday.map((s) => s.sourceName).join(', ')}
            </span>
            <Link href="/godmode/sources" className="ml-auto text-primary hover:underline">
              Inspect
            </Link>
          </div>
        </Card>
      )}

      <AnalyticsPanel />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Review queue preview */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Review queue
            </h2>
            <Link href="/godmode/sources/review" className="text-xs text-primary hover:underline">
              Open queue →
            </Link>
          </div>
          {reviewQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : openItems.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Nothing waiting. 🎉</p>
          ) : (
            <div className="space-y-1">
              {Array.from(reviewBySource.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([sourceId, count]) => (
                  <div key={sourceId} className="flex items-center justify-between py-1 text-sm">
                    <span>{formatSourceName(sourceId)}</span>
                    <span className="font-semibold tabular-nums text-orange-500">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* Data-quality gaps → deep-linked, pre-filtered pages */}
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Data gaps
          </h2>
          {!artists || !venues ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ) : (
            <div className="-mx-2">
              <GapRow
                label="Artists needing review"
                count={artists.filter((a) => a.needs_review === true).length}
                href="/godmode/artists?filter=needs-review"
                icon={User}
              />
              <GapRow
                label="Artists with no location"
                count={artists.filter((a) => !a.location).length}
                href="/godmode/artists?filter=no-location"
                icon={User}
              />
              <GapRow
                label="Artists with no genres"
                count={artists.filter((a) => !a.genres || a.genres.length === 0).length}
                href="/godmode/artists?filter=no-genres"
                icon={User}
              />
              <GapRow
                label="Artists with no socials"
                count={artists.filter((a) => !a.facebookUrl && !a.instagramUrl).length}
                href="/godmode/artists?filter=no-socials"
                icon={User}
              />
              <GapRow
                label="Venues with no place ID"
                count={venues.filter((v) => !v.googlePlaceId).length}
                href="/godmode/venues?filter=no-place-id"
                icon={MapPin}
              />
              <GapRow
                label="Venues with no socials"
                count={
                  venues.filter(
                    (v) =>
                      !v.website &&
                      !(Array.isArray(v.socialMediaUrls) && v.socialMediaUrls.length > 0),
                  ).length
                }
                href="/godmode/venues?filter=no-socials"
                icon={MapPin}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Catalogue counts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Artists" value={artistsQuery.data?.length} href="/godmode/artists" loading={artistsQuery.isLoading} />
        <KpiCard label="Venues" value={venuesQuery.data?.length} href="/godmode/venues" loading={venuesQuery.isLoading} />
        <KpiCard label="Events (upcoming)" value={eventsQuery.data?.length} href="/godmode/events" loading={eventsQuery.isLoading} />
        <KpiCard label="Users" value={usersQuery.data?.length} href="/godmode/users" loading={usersQuery.isLoading} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <Link href="/godmode/sources" className="flex items-center gap-1 hover:text-foreground">
          <Activity className="h-3.5 w-3.5" /> Sources
        </Link>
        <Link href="/godmode/venues/enrichment" className="flex items-center gap-1 hover:text-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Enrichment queue
        </Link>
        <Link href="/godmode/songs" className="flex items-center gap-1 hover:text-foreground">
          <Music className="h-3.5 w-3.5" /> Songs
        </Link>
        <Link href="/godmode/events" className="flex items-center gap-1 hover:text-foreground">
          <Calendar className="h-3.5 w-3.5" /> Events
        </Link>
        <Link href="/godmode/users" className="flex items-center gap-1 hover:text-foreground">
          <Users className="h-3.5 w-3.5" /> Users
        </Link>
      </div>
    </div>
  );
}
