// Shared godmode UI primitives: page header, facet chips, bulk action bar,
// badges and the URL-filter hook that lets the dashboard deep-link into a
// pre-filtered catalogue page (/godmode/artists?filter=no-genres).

import { useState } from 'react';
import { useSearch } from 'wouter';
import { RefreshCw, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ===== Page header =====

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  /** Row count summary, e.g. "312 of 4,120". */
  count?: string;
  isFetching?: boolean;
  onRefresh?: () => void;
  children?: React.ReactNode;
}

export function GodmodePageHeader({ icon: Icon, title, count, isFetching, onRefresh, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {title}
        </h1>
        {count && <span className="text-sm text-muted-foreground tabular-nums">{count}</span>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onRefresh && (
          <Button onClick={onRefresh} variant="ghost" size="sm" title="Refresh" disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== Facet chips =====

export interface Facet {
  value: string;
  label: string;
  count?: number;
  /** Amber-tint the count — a gap someone should eventually clear. */
  warn?: boolean;
}

interface FacetChipsProps {
  facets: Facet[];
  active: string;
  onChange: (value: string) => void;
}

export function FacetChips({ facets, active, onChange }: FacetChipsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {facets.map((facet) => {
        const isActive = facet.value === active;
        return (
          <button
            key={facet.value}
            type="button"
            onClick={() => onChange(facet.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {facet.label}
            {facet.count !== undefined && (
              <span
                className={cn(
                  'tabular-nums',
                  !isActive && facet.warn && facet.count > 0 ? 'text-orange-500 font-semibold' : 'opacity-70',
                )}
              >
                {facet.count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ===== Search input =====

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TableSearch({ value, onChange, placeholder }: TableSearchProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'Search…'}
      className="h-8 max-w-xs text-sm"
    />
  );
}

// ===== Bulk action bar =====

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}

export function BulkActionBar({ count, onClear, children }: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2 shadow-lg">
        <span className="text-sm font-medium tabular-nums whitespace-nowrap">{count.toLocaleString()} selected</span>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">{children}</div>
        <div className="h-4 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={onClear} title="Clear selection">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ===== Badges =====

const SOURCE_STYLES: Record<string, string> = {
  backstage: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  frontstage: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  community: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function SourceBadge({ source }: { source?: string | null }) {
  if (!source) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium leading-4',
        SOURCE_STYLES[source] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {source}
    </span>
  );
}

export function BoolMark({ value, warnWhenMissing = false }: { value: boolean; warnWhenMissing?: boolean }) {
  if (value) return <span className="text-green-600 dark:text-green-500">✓</span>;
  return <span className={warnWhenMissing ? 'text-orange-500' : 'text-muted-foreground'}>—</span>;
}

// ===== URL filter =====

/**
 * Reads ?filter=<value> once on mount so dashboard tiles can deep-link into a
 * pre-filtered page; afterwards the chip state is plain local state.
 */
export function useInitialUrlFilter(defaultValue: string): [string, (value: string) => void] {
  const search = useSearch();
  const [value, setValue] = useState<string>(() => {
    const params = new URLSearchParams(search);
    return params.get('filter') ?? defaultValue;
  });
  return [value, setValue];
}
