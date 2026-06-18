import { useState, useEffect } from 'react';
import { Activity, RefreshCw, AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getSourceSummaries,
  getSourceCoverage,
  formatRelativeTime,
  formatDuration,
  getStatusColor,
  type SourceSummary,
  type SourceRun,
  type SourceCoverage,
} from '@/lib/services/source-runs-service';
import RunDetailModal from './RunDetailModal';

export default function SourcesPage() {
  const [summaries, setSummaries] = useState<SourceSummary[]>([]);
  const [coverage, setCoverage] = useState<Map<string, SourceCoverage>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<{ sourceId: string; runId: string } | null>(null);

  const fetchSummaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, coverageData] = await Promise.all([
        getSourceSummaries(),
        getSourceCoverage()
      ]);
      setSummaries(summaryData);
      // Index coverage by sourceId for quick lookup
      const coverageMap = new Map<string, SourceCoverage>();
      for (const c of coverageData) {
        coverageMap.set(c.sourceId, c);
      }
      setCoverage(coverageMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load source data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  const handleViewRun = (sourceId: string, runId: string) => {
    setSelectedRun({ sourceId, runId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header onRefresh={fetchSummaries} />
        <div className="flex flex-col items-center justify-center h-64 text-destructive">
          <AlertTriangle className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Failed to load sources</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchSummaries} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header onRefresh={fetchSummaries} sourceCount={summaries.length} />

      {summaries.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No source runs yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Source runs will appear here once the runner has executed.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary) => (
            <SourceCard
              key={summary.sourceId}
              summary={summary}
              coverage={coverage.get(summary.sourceId)}
              onViewRun={handleViewRun}
            />
          ))}
        </div>
      )}

      {selectedRun && (
        <RunDetailModal
          sourceId={selectedRun.sourceId}
          runId={selectedRun.runId}
          open={true}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  );
}

function Header({ onRefresh, sourceCount }: { onRefresh: () => void; sourceCount?: number }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Source Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor source runs and review items
          {sourceCount !== undefined && sourceCount > 0 && ` (${sourceCount} sources)`}
        </p>
      </div>
      <Button onClick={onRefresh} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}

interface SourceCardProps {
  summary: SourceSummary;
  coverage?: SourceCoverage;
  onViewRun: (sourceId: string, runId: string) => void;
}

function SourceCard({ summary, coverage, onViewRun }: SourceCardProps) {
  const { lastRun } = summary;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        {/* Source Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold truncate">{summary.sourceName}</h3>
            {lastRun && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                getStatusColor(lastRun.status)
              )}>
                {lastRun.status}
              </span>
            )}
          </div>

          {/* Last run info */}
          {lastRun ? (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatRelativeTime(lastRun.startedAt)}
              </span>
              <span>
                Duration: {formatDuration(lastRun.startedAt, lastRun.finishedAt ?? lastRun.completedAt)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No runs recorded</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          {/* Success Rate */}
          <div className="text-center">
            <div className={cn(
              'text-2xl font-bold',
              summary.successRate >= 90 ? 'text-green-600' :
              summary.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {summary.successRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>

          {/* Headline Counts from last run */}
          {lastRun && (
            <>
              <Stat
                label="Parsed"
                value={lastRun.counts.validEvents}
                hint="Valid gigs found on the source this run (before de-duping against the previous run)"
              />
              <Stat
                label="New"
                value={lastRun.counts.added}
                positive
                hint="New since the last run — only these get written; the rest already existed"
              />
              <Stat
                label="Events"
                value={lastRun.counts.eventsCreated}
                positive
                hint="Events actually created in bndy this run"
              />
              <Stat
                label="Review"
                value={summary.openReviewItems}
                warning={summary.openReviewItems > 0}
                hint="Rows awaiting human / intelligence resolution"
              />
              <Stat
                label="Errors"
                value={lastRun.errors.length}
                warning={lastRun.errors.length > 0}
              />
            </>
          )}

          {/* Footprint - entities in bndy from this source */}
          {coverage && (coverage.events > 0 || coverage.venues > 0 || coverage.artists > 0) && (
            <div className="border-l pl-4 ml-2">
              <div className="text-xs text-muted-foreground mb-1">Footprint</div>
              <div className="flex gap-3 text-sm">
                <span title="Events in bndy from this source">{coverage.events} E</span>
                <span title="Venues in bndy from this source">{coverage.venues} V</span>
                <span title="Artists in bndy from this source">{coverage.artists} A</span>
              </div>
            </div>
          )}

          {/* View button */}
          {lastRun && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewRun(summary.sourceId, lastRun.runId)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          )}
        </div>
      </div>

      {/* Recent Runs Strip */}
      {summary.recentRuns && summary.recentRuns.length > 1 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Recent:</span>
            <div className="flex gap-1">
              {summary.recentRuns.slice(0, 10).map((run) => (
                <button
                  key={run.runId}
                  onClick={() => onViewRun(summary.sourceId, run.runId)}
                  className={cn(
                    'w-6 h-6 rounded transition-transform hover:scale-110',
                    run.status === 'completed' ? 'bg-green-500' :
                    run.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                  )}
                  title={`${run.runDate} - ${run.status}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-2">
              {summary.totalRuns} total runs
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

interface StatProps {
  label: string;
  value: number;
  positive?: boolean;
  warning?: boolean;
  hint?: string;
}

function Stat({ label, value, positive, warning, hint }: StatProps) {
  return (
    <div className="text-center min-w-[48px]" title={hint}>
      <div className={cn(
        'text-lg font-semibold',
        warning && value > 0 ? 'text-orange-600' :
        positive && value > 0 ? 'text-green-600' : ''
      )}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
