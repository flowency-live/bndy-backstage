import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, Clock, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getRunDetail,
  formatSourceName,
  formatDuration,
  formatRelativeTime,
  getStatusColor,
  type SourceRun,
  type SourceRunCounts,
} from '@/lib/services/source-runs-service';

interface RunDetailModalProps {
  sourceId: string;
  runId: string;
  open: boolean;
  onClose: () => void;
}

export default function RunDetailModal({
  sourceId,
  runId,
  open,
  onClose,
}: RunDetailModalProps) {
  const [run, setRun] = useState<SourceRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && sourceId && runId) {
      fetchRunDetail();
    }
  }, [open, sourceId, runId]);

  const fetchRunDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRunDetail(sourceId, runId);
      setRun(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Run Details: {formatSourceName(sourceId)}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-destructive">
            <AlertTriangle className="h-10 w-10 mb-3" />
            <p className="text-sm">{error}</p>
            <Button onClick={fetchRunDetail} variant="outline" size="sm" className="mt-3">
              Retry
            </Button>
          </div>
        ) : run ? (
          <div className="space-y-6">
            {/* Run Header */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                getStatusColor(run.status)
              )}>
                {run.status.toUpperCase()}
              </span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(run.runDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatRelativeTime(run.startedAt)}
                {' · '}
                {formatDuration(run.startedAt, run.finishedAt)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                <code className="bg-muted px-1 rounded text-xs">{run.runId}</code>
              </div>
            </div>

            {/* Counts Table */}
            <Card className="overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b">
                <h4 className="font-semibold">Run Counts</h4>
              </div>
              <div className="p-4">
                <CountsTable counts={run.counts} />
              </div>
            </Card>

            {/* Errors */}
            {run.errors.length > 0 && (
              <Card className="overflow-hidden border-red-200 dark:border-red-900">
                <div className="bg-red-50 dark:bg-red-950 px-4 py-2 border-b border-red-200 dark:border-red-900">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Errors ({run.errors.length})
                  </h4>
                </div>
                <div className="divide-y">
                  {run.errors.map((error, idx) => (
                    <div key={idx} className="p-4">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        {error.message}
                      </p>
                      {error.code && (
                        <code className="text-xs bg-muted px-1 rounded mt-1 inline-block">
                          {error.code}
                        </code>
                      )}
                      {error.timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(error.timestamp).toLocaleString('en-GB')}
                        </p>
                      )}
                      {error.details && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface CountsTableProps {
  counts: SourceRunCounts;
}

function CountsTable({ counts }: CountsTableProps) {
  const sections = [
    {
      title: 'Input Processing',
      rows: [
        { label: 'Raw Rows', value: counts.rawRows },
        { label: 'Valid Events', value: counts.validEvents },
        { label: 'Metadata Rows', value: counts.metadataRows },
        { label: 'Parked Rows', value: counts.parkedRows },
      ],
    },
    {
      title: 'Event Changes',
      rows: [
        { label: 'Added', value: counts.added, highlight: counts.added > 0 },
        { label: 'Cancelled', value: counts.cancelled },
        { label: 'Unchanged', value: counts.unchanged },
        { label: 'Past Dropped', value: counts.pastDropped },
      ],
    },
    {
      title: 'Event Actions',
      rows: [
        { label: 'Events Created', value: counts.eventsCreated, highlight: counts.eventsCreated > 0 },
        { label: 'Events Repointed', value: counts.eventsRepointed },
        { label: 'Events Deleted', value: counts.eventsDeleted },
        { label: 'Events Hidden', value: counts.eventsHidden },
      ],
    },
    {
      title: 'Entity Resolution',
      rows: [
        { label: 'Venues Created', value: counts.venuesCreated, highlight: counts.venuesCreated > 0 },
        { label: 'Venues Matched', value: counts.venuesMatched },
        { label: 'Artists Created', value: counts.artistsCreated, highlight: counts.artistsCreated > 0 },
        { label: 'Artists Matched', value: counts.artistsMatched },
      ],
    },
    {
      title: 'Review',
      rows: [
        { label: 'Review Items', value: counts.reviewItems, warning: counts.reviewItems > 0 },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sections.map((section) => (
        <div key={section.title}>
          <h5 className="text-sm font-medium text-muted-foreground mb-2">
            {section.title}
          </h5>
          <div className="space-y-1">
            {section.rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between text-sm py-1"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn(
                  'font-medium',
                  row.highlight && 'text-green-600',
                  row.warning && 'text-orange-600'
                )}>
                  {row.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
