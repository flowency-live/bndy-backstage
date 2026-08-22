// Godmode › Curators — access policies, curator activity, hidden records + restore.
// Feature 4 (2026-08-11): a curator "delete" hides the record and lands here.

import { useMemo, useState } from 'react';
import { CheckCheck, EyeOff, Flag, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import type { ActivityEntry } from '@/lib/services/godmode-service';
import DataTable, { type Column } from '../components/DataTable';
import { FacetChips, GodmodePageHeader, TableSearch } from '../components/godmode-ui';
import { useGodmodeActivity, useGodmodeFlags, useResolveFlag, useRestoreHidden } from '../lib/queries';
import CuratorAccessPanel from './CuratorAccessPanel';

/**
 * The activity feed is the source of truth for the hidden list: the latest
 * hide/restore action per entity decides its state. Restore then invalidates
 * the feed, so the row leaves the Hidden facet on refresh.
 */
function computeHiddenNow(entries: ActivityEntry[]): ActivityEntry[] {
  const latest = new Map<string, ActivityEntry>();
  // entries arrive newest first — keep the FIRST hide/restore per entity
  for (const e of entries) {
    if (e.action !== 'hide' && e.action !== 'restore') continue;
    const key = `${e.entityType}:${e.entityId}`;
    if (!latest.has(key)) latest.set(key, e);
  }
  return [...latest.values()].filter((e) => e.action === 'hide');
}

const ACTION_STYLES: Record<string, string> = {
  edit: 'bg-blue-500/20 text-blue-400',
  hide: 'bg-red-500/20 text-red-400',
  restore: 'bg-emerald-500/20 text-emerald-400',
  'set-role': 'bg-purple-500/20 text-purple-400',
  'set-curator-access': 'bg-cyan-500/20 text-cyan-400',
  flag: 'bg-amber-500/20 text-amber-400',
  cancel: 'bg-amber-500/20 text-amber-400',
  uncancel: 'bg-emerald-500/20 text-emerald-400',
};

/** Feed rows and flag rows share one table shape; flagId marks a resolvable flag. */
type Row = ActivityEntry & { flagId?: string };

export default function CuratorsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast } = useToast();

  const activityQuery = useGodmodeActivity();
  const flagsQuery = useGodmodeFlags('open');
  const restore = useRestoreHidden();
  const resolveFlag = useResolveFlag();
  const entries = activityQuery.data ?? [];
  const openFlags = flagsQuery.data ?? [];

  const flagRows: Row[] = useMemo(
    () =>
      openFlags.map((f) => ({
        at: f.createdAt,
        actorName: f.reporterName || 'Anonymous visitor',
        actorId: f.reporterUserId || 'anonymous',
        action: 'flag',
        entityType: f.entityType,
        entityId: f.entityId,
        entityName: f.entityName,
        detail: f.reason,
        flagId: f.id,
      })),
    [openFlags],
  );

  const [facet, setFacet] = useState('flags');
  const [search, setSearch] = useState('');

  const hiddenNow = useMemo(() => computeHiddenNow(entries), [entries]);

  const rows = useMemo(() => {
    const base: Row[] =
      facet === 'hidden' ? hiddenNow : facet === 'flags' ? flagRows : facet === 'all' ? entries : entries.filter((e) => e.action === facet);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (e) =>
        (e.entityName && e.entityName.toLowerCase().includes(q)) ||
        (e.actorName && e.actorName.toLowerCase().includes(q)) ||
        e.entityType.toLowerCase().includes(q),
    );
  }, [entries, hiddenNow, flagRows, facet, search]);

  const facets = useMemo(
    () => [
      { value: 'flags', label: 'Open flags', count: openFlags.length, warn: openFlags.length > 0 },
      { value: 'hidden', label: 'Hidden now', count: hiddenNow.length, warn: hiddenNow.length > 0 },
      { value: 'all', label: 'All activity', count: entries.length },
      { value: 'edit', label: 'Edits', count: entries.filter((e) => e.action === 'edit').length },
      { value: 'hide', label: 'Hides', count: entries.filter((e) => e.action === 'hide').length },
      { value: 'restore', label: 'Restores', count: entries.filter((e) => e.action === 'restore').length },
      { value: 'set-role', label: 'Role changes', count: entries.filter((e) => e.action === 'set-role').length },
      { value: 'set-curator-access', label: 'Access changes', count: entries.filter((e) => e.action === 'set-curator-access').length },
    ],
    [entries, hiddenNow, openFlags],
  );

  const handleResolveFlag = async (row: Row) => {
    if (!row.flagId) return;
    const confirmed = await confirm({
      title: 'Resolve flag',
      description: `Close this flag on "${row.entityName || row.entityId}"? Fix the record first if it needs fixing.`,
      confirmText: 'Resolve',
    });
    if (!confirmed) return;
    try {
      await resolveFlag.mutateAsync(row.flagId);
      toast({ title: 'Flag resolved' });
    } catch (err) {
      toast({
        title: 'Resolve failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async (e: ActivityEntry) => {
    if (e.entityType !== 'artist' && e.entityType !== 'venue' && e.entityType !== 'event') return;
    const confirmed = await confirm({
      title: 'Restore record',
      description: `Bring "${e.entityName || e.entityId}" back onto every public surface?`,
      confirmText: 'Restore',
    });
    if (!confirmed) return;
    try {
      await restore.mutateAsync({ entityType: e.entityType, id: e.entityId });
      toast({ title: 'Restored' });
    } catch (err) {
      toast({
        title: 'Restore failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const columns: Column<Row>[] = [
    {
      key: 'at',
      header: 'When',
      widthClass: 'w-36',
      sortValue: (e) => e.at,
      render: (e) => (
        <span className="text-muted-foreground text-xs">
          {new Date(e.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Who',
      sortValue: (e) => e.actorName || e.actorId,
      render: (e) => <span className="font-medium truncate">{e.actorName || e.actorId.slice(0, 8)}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      widthClass: 'w-24',
      sortValue: (e) => e.action,
      render: (e) => (
        <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${ACTION_STYLES[e.action] || 'bg-muted'}`}>
          {e.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Record',
      sortValue: (e) => e.entityName || e.entityId,
      render: (e) => (
        <span className="flex flex-col leading-tight">
          <span className="font-medium truncate">{e.entityName || e.entityId}</span>
          <span className="text-[11px] text-muted-foreground">{e.entityType}</span>
        </span>
      ),
    },
    {
      key: 'detail',
      header: 'Detail',
      className: 'hidden md:table-cell',
      sortValue: (e) => e.detail || '',
      render: (e) => <span className="text-muted-foreground text-xs truncate">{e.detail || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      widthClass: 'w-24',
      render: (e) =>
        e.flagId ? (
          <span className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-amber-500 hover:text-amber-400"
              title="Resolve this flag"
              onClick={() => handleResolveFlag(e)}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Resolve
            </Button>
          </span>
        ) : e.action === 'hide' && facet === 'hidden' ? (
          <span className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-emerald-500 hover:text-emerald-400"
              title="Restore this record"
              onClick={() => handleRestore(e)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <GodmodePageHeader
        icon={facet === 'hidden' ? EyeOff : facet === 'flags' ? Flag : ShieldCheck}
        title="Curators"
        count={`${rows.length.toLocaleString()} ${facet === 'hidden' ? 'hidden record' : 'entr'}${rows.length === 1 ? (facet === 'hidden' ? '' : 'y') : facet === 'hidden' ? 's' : 'ies'}`}
        isFetching={activityQuery.isFetching || flagsQuery.isFetching}
        onRefresh={() => { activityQuery.refetch(); flagsQuery.refetch(); }}
      />

      <CuratorAccessPanel />

      <div className="flex flex-wrap items-center gap-3">
        <TableSearch value={search} onChange={setSearch} placeholder="Search record, curator…" />
        <FacetChips facets={facets} active={facet} onChange={setFacet} />
      </div>

      {activityQuery.isError ? (
        <div className="py-12 text-center text-destructive">{(activityQuery.error as Error).message}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(e) => `${e.at}-${e.entityId}`}
          defaultSort={{ key: 'at', dir: 'desc' }}
          emptyMessage={
            activityQuery.isLoading
              ? 'Loading activity…'
              : facet === 'hidden'
                ? 'Nothing is hidden. Curator deletes land here.'
                : facet === 'flags'
                  ? 'No open flags. Visitor reports land here.'
                  : 'No activity yet.'
          }
        />
      )}

      <ConfirmDialog />
    </div>
  );
}
