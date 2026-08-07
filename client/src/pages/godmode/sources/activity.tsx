import { useState, useEffect } from 'react';
import { Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getSourceActivity,
  type ActivityResponse,
  type SourceActivity,
  type ActivityPoint,
} from '@/lib/services/source-runs-service';

/**
 * AGENT WORK — what the scheduled Cowork tasks actually put into bndy.
 *
 * The rule this page is built on: A FLAT LINE AND A BROKEN LINE MUST NEVER LOOK THE SAME.
 * Sources have wildly different rhythms — KLMA rolls a 9–12 month window, sceniceye
 * publishes a Thursday edition, otcm goes quiet for a week — so "0 today" is usually
 * healthy. But "0 today" is also what a dead scheduler looks like, and in August a
 * stuck lock cost two days of enrichment while every chart read as a quiet week.
 * So a quiet day is drawn as part of the line, and a fault is drawn ON the line.
 */

// Categorical palette, validated against the card surface for CVD separation
// in both light and dark. Assigned by source in fixed order, never cycled.
const SERIES = ['#2a78d6', '#e2622a', '#1a9e74', '#8b6ad8', '#b8891f', '#1a93a6'];
const RED = '#e5484d';
const AMBER = '#e0a52a';
const MUTED = '#8fa0b8';

const W = 300;
const H = 72;
const PAD = 8;

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(Math.min(255, c + (255 - c) * factor));
  return `#${[mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

export default function AgentActivityPage() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (d = days) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getSourceActivity(d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(days); /* eslint-disable-next-line */ }, [days]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header days={days} setDays={setDays} onRefresh={() => fetchData()} />
        <div className="flex flex-col items-center justify-center h-64 text-destructive">
          <AlertTriangle className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Failed to load activity</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => fetchData()} variant="outline" className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const sources = data?.sources ?? [];
  const totals = sources.reduce(
    (t, s) => ({
      added: t.added + s.totals.added,
      gigs: t.gigs + s.totals.gigs,
      artists: t.artists + s.totals.artists,
      venues: t.venues + s.totals.venues,
    }),
    { added: 0, gigs: 0, artists: 0, venues: 0 }
  );
  const today = sources.reduce((n, s) => n + (s.points[s.points.length - 1]?.added ?? 0), 0);

  // A source that has fired at all in the window but written nothing is worth surfacing,
  // because it is indistinguishable from a healthy quiet source at a glance.
  const stalled = sources.filter(
    s => s.totals.added === 0 && s.points.some(p => p.state !== 'nofire')
  );

  return (
    <div className="space-y-6">
      <Header days={days} setDays={setDays} onRefresh={() => fetchData()} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Added today" value={today} />
        <Kpi label={`Added · ${days}d`} value={totals.added} />
        <Kpi label="Gigs" value={totals.gigs} />
        <Kpi label="Artists · venues" value={`${totals.artists} · ${totals.venues}`} />
      </div>

      {stalled.length > 0 && (
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-sm">
            <span className="font-semibold">
              {stalled.length} source{stalled.length > 1 ? 's have' : ' has'} run but written nothing
              {' '}in {days} days:
            </span>{' '}
            <span className="text-muted-foreground">
              {stalled.map(s => s.sourceName).join(', ')}. A source with nothing to publish looks
              identical to a broken one — check the marks on its line.
            </span>
          </p>
        </Card>
      )}

      {sources.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No runs recorded yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Runs appear here once they record themselves via
            {' '}<code className="text-xs">PUT /api/source-runs/{'{sourceId}'}/{'{runId}'}</code>.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {sources.map((s, i) => (
            <SourceTrend key={s.sourceId} source={s} colour={SERIES[i % SERIES.length]} />
          ))}
        </div>
      )}

      <Legend />
    </div>
  );
}

function Header({ days, setDays, onRefresh }: { days: number; setDays: (d: number) => void; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Agent Work
        </h1>
        <p className="text-muted-foreground mt-1">
          What the scheduled tasks put into bndy, by source and by day
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border overflow-hidden">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                days === d ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-3xl font-bold mt-1 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </Card>
  );
}

function SourceTrend({ source, colour }: { source: SourceActivity; colour: string }) {
  const pts = source.points;
  const n = pts.length;
  const hi = Math.max(1, ...pts.map(p => Math.max(p.added, p.offered)));

  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / Math.max(1, n - 1);
  const y = (v: number) => H - PAD - (v / hi) * (H - 2 * PAD);

  // Stacked by entity type, in three tones of the source's own hue, so a card keeps
  // one identity while still showing the mix. Split proportionally per day.
  const layers: Array<keyof Pick<ActivityPoint, 'gigs' | 'artists' | 'venues'>> = ['gigs', 'artists', 'venues'];
  const tones = [colour, shade(colour, 0.28), shade(colour, 0.52)];

  const running = new Array(n).fill(0);
  const areas = layers.map((key, li) => {
    const top = pts.map((p, i) => running[i] + p[key]);
    const up = top.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' L');
    const down = running.map((v, i) => ({ v, i })).reverse()
      .map(({ v, i }) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' L');
    top.forEach((v, i) => { running[i] = v; });
    return <path key={key} d={`M${up} L${down} Z`} fill={tones[li]} opacity={0.9 - li * 0.14} />;
  });

  // What the source offered — the gap between this and the fill is yield.
  const offered = pts.map((p, i) => `${x(i).toFixed(1)} ${y(p.offered).toFixed(1)}`).join(' L');

  const marks = pts.map((p, i) => {
    const px = x(i);
    if (p.state === 'failed') {
      return (
        <path
          key={`f${i}`}
          d={`M${px - 3.2} ${H - 9.6} L${px + 3.2} ${H - 3.2} M${px + 3.2} ${H - 9.6} L${px - 3.2} ${H - 3.2}`}
          stroke={RED} strokeWidth="1.8" strokeLinecap="round"
        />
      );
    }
    if (p.state === 'empty') {
      return <circle key={`e${i}`} cx={px} cy={y(p.added) - 4} r="3" fill="var(--card, #fff)" stroke={AMBER} strokeWidth="1.7" />;
    }
    if (p.state === 'nofire') {
      return <rect key={`n${i}`} x={px - 3.5} y={PAD - 3} width="7" height={H - PAD - 2} fill={MUTED} opacity="0.16" />;
    }
    return null;
  });

  const last = pts[n - 1];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: colour }} />
        <span className="font-semibold">{source.sourceName}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {last?.state === 'nofire' ? 'no run today' : `${last?.added ?? 0} today`}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold tabular-nums">{source.totals.added.toLocaleString()}</span>
        {source.totals.removed > 0 && (
          <span className="text-sm font-semibold text-muted-foreground tabular-nums">
            −{source.totals.removed.toLocaleString()}
          </span>
        )}
        <span className="text-xs text-muted-foreground">added</span>
        {source.yieldPct !== null && (
          <span className="ml-auto text-xs text-muted-foreground">{source.yieldPct}% of offered</span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[72px] my-2 block">
        {areas}
        <path d={`M${offered}`} fill="none" stroke={MUTED} strokeWidth="1.3" strokeDasharray="2 3" opacity="0.7" />
        {marks}
      </svg>

      <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
        <span><i className="inline-block h-2 w-2 rounded-sm mr-1.5" style={{ background: tones[0] }} />{source.totals.gigs} gigs</span>
        <span><i className="inline-block h-2 w-2 rounded-sm mr-1.5" style={{ background: tones[1] }} />{source.totals.artists} artists</span>
        <span><i className="inline-block h-2 w-2 rounded-sm mr-1.5" style={{ background: tones[2] }} />{source.totals.venues} venues</span>
      </div>
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <span><span className="font-bold" style={{ color: RED }}>✕</span> run failed or stopped</span>
      <span><span className="font-bold" style={{ color: AMBER }}>◌</span> ran, rows were offered, wrote none</span>
      <span><span className="font-bold">▨</span> never fired</span>
      <span><span className="font-bold">╌</span> rows offered by the source</span>
      <span>shading, light → dark: gigs · artists · venues</span>
      <span className="w-full sm:w-auto">
        A flat line is a source with nothing to publish, and that is healthy. A line with marks on it is a fault.
      </span>
    </div>
  );
}
