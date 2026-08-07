// Godmode DataTable — the one dense table every catalogue page renders.
//
// Design goals, in order: scan speed, bulk operations, no pagination.
// Rows are fixed-height and virtualized (@tanstack/react-virtual) so the full
// filtered set scrolls in one container — the old pages paged 25 rows at a
// time over thousands of records. Sorting is client-side per column;
// multi-select supports shift-click ranges and drives a bulk action bar.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export const ROW_HEIGHT = 44;

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Extract a comparable value; presence makes the column sortable. */
  sortValue?: (row: T) => string | number | null | undefined;
  render: (row: T) => React.ReactNode;
  /** Fixed width, e.g. 'w-24'. Omit for flexible columns. */
  widthClass?: string;
  align?: 'left' | 'right';
  /** Hide below this breakpoint, e.g. 'hidden xl:table-cell'. */
  className?: string;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T, index: number) => void;
  /** Pass selected + onSelectedChange to enable the checkbox column. */
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  defaultSort?: SortState;
  emptyMessage?: string;
  /** Height of the scroll container. */
  heightClass?: string;
}

const isMissing = (v: unknown) => v === null || v === undefined || v === '';

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selected,
  onSelectedChange,
  defaultSort,
  emptyMessage = 'Nothing matches the current filters.',
  heightClass = 'h-[calc(100vh-292px)]',
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);
  const lastClickedIndex = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A shift-click range anchor only makes sense against the row order it was
  // set in — drop it whenever the visible set or the sort changes.
  useEffect(() => {
    lastClickedIndex.current = null;
  }, [rows, sort]);

  const selectable = Boolean(selected && onSelectedChange);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const accessor = column.sortValue;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      // Missing values sort last regardless of direction.
      if (isMissing(av) && isMissing(bv)) return 0;
      if (isMissing(av)) return 1;
      if (isMissing(bv)) return -1;
      return compareValues(av, bv) * sign;
    });
  }, [rows, sort, columns]);

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: 'asc' };
      if (current.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const handleRowSelect = useCallback(
    (row: T, index: number, shiftKey: boolean) => {
      if (!selected || !onSelectedChange) return;
      const next = new Set(selected);
      const id = rowKey(row);
      if (shiftKey && lastClickedIndex.current !== null) {
        const [from, rawTo] = [lastClickedIndex.current, index].sort((a, b) => a - b);
        const to = Math.min(rawTo, sortedRows.length - 1);
        const turningOn = !selected.has(id);
        for (let i = Math.max(0, from); i <= to; i++) {
          const rangeId = rowKey(sortedRows[i]);
          if (turningOn) next.add(rangeId);
          else next.delete(rangeId);
        }
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      lastClickedIndex.current = index;
      onSelectedChange(next);
    },
    [selected, onSelectedChange, rowKey, sortedRows],
  );

  const allVisibleSelected =
    selectable && sortedRows.length > 0 && sortedRows.every((row) => selected!.has(rowKey(row)));
  const someVisibleSelected = selectable && sortedRows.some((row) => selected!.has(rowKey(row)));

  const toggleAll = () => {
    if (!selected || !onSelectedChange) return;
    if (allVisibleSelected) {
      onSelectedChange(new Set());
    } else {
      onSelectedChange(new Set(sortedRows.map(rowKey)));
    }
  };

  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom = items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div ref={scrollRef} className={cn('overflow-auto', heightClass)}>
        <table className="w-full text-sm" style={{ tableLayout: 'auto' }}>
          <thead className="sticky top-0 z-10 bg-muted text-xs uppercase tracking-wide text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={cn(
                      'px-3 py-2 font-medium whitespace-nowrap',
                      column.align === 'right' ? 'text-right' : 'text-left',
                      column.widthClass,
                      column.className,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-foreground transition-colors',
                          isSorted && 'text-foreground',
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-3 py-16 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ height: paddingTop, padding: 0 }} />
              </tr>
            )}
            {items.map((virtualRow) => {
              const row = sortedRows[virtualRow.index];
              const id = rowKey(row);
              const isSelected = selectable && selected!.has(id);
              return (
                <tr
                  key={id}
                  data-index={virtualRow.index}
                  className={cn(
                    'border-b last:border-b-0 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50',
                  )}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => onRowClick?.(row, virtualRow.index)}
                >
                  {selectable && (
                    <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={Boolean(isSelected)}
                        aria-label="Select row"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRowSelect(row, virtualRow.index, e.shiftKey);
                        }}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-0',
                        column.align === 'right' && 'text-right tabular-nums',
                        column.widthClass,
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ height: paddingBottom, padding: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
