import type { ReactNode } from 'react';
import { SortableTh, nextSort, type SortDir, type SortState } from './TableSort';

export interface Column<T = Record<string, unknown>> {
  key?: string;
  label: string;
  width?: number | string;
  render?: (row: T) => ReactNode;
  /** The header sorts by this column's key; needs `key`. */
  sortable?: boolean;
}

/** A column of a table without sorting: the header is plain text. */
type PlainColumn<T> = Omit<Column<T>, 'sortable'> & { sortable?: never };

interface BaseProps<T> {
  rows: T[];
  total: number;
  page: number;
  onPage: (page: number) => void;
  actions?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string;
}

/** Sorting is always done by the caller, which reloads the rows for the new sort. */
interface SortedProps<T> extends BaseProps<T> {
  columns: Column<T>[];
  sort: SortState | null;
  onSort: (key: string, dir: SortDir) => void;
}

/** Without `onSort` no column may be sortable, so the rows keep the order they were given in. */
interface UnsortedProps<T> extends BaseProps<T> {
  columns: PlainColumn<T>[];
  sort?: never;
  onSort?: never;
}

type Props<T = Record<string, unknown>> = SortedProps<T> | UnsortedProps<T>;

/** Paged table of records with optional per-row actions and sortable columns. */
export default function DataTable<T extends Record<string, unknown>>({
  columns, rows, total, page, onPage, actions, rowClassName, sort, onSort,
}: Props<T>) {
  const cols: Column<T>[] = columns;
  function toggleSort(key: string) {
    const next = nextSort(sort, key);
    onSort?.(next.key, next.dir);
  }
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function visiblePages(): (number | 'ellipsis-start' | 'ellipsis-end')[] {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const items: (number | 'ellipsis-start' | 'ellipsis-end')[] = [0];
    if (page > 2) items.push('ellipsis-start');
    const lo = Math.max(1, page - 1);
    const hi = Math.min(pageCount - 2, page + 1);
    for (let i = lo; i <= hi; i++) items.push(i);
    if (page < pageCount - 3) items.push('ellipsis-end');
    items.push(pageCount - 1);
    return items;
  }

  return (
    <>
      <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {cols.map((col, ci) => col.sortable && col.key
              ? <SortableTh key={col.key} label={col.label} sortKey={col.key} sort={sort} onSort={toggleSort}
                  style={col.width ? { width: col.width } : undefined} />
              : <th key={col.key ?? ci} style={col.width ? { width: col.width } : undefined}>{col.label}</th>
            )}
            {actions && <th className="col-actions" style={{ width: '1%' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={(row as Record<string, unknown>).id as string ?? i} className={rowClassName?.(row) || ''}>
              {cols.map((col, ci) => (
                <td key={col.key ?? ci}>
                  {col.render ? col.render(row) : col.key ? String((row as Record<string, unknown>)[col.key] ?? '') : ''}
                </td>
              ))}
              {actions && <td className="col-actions">{actions(row)}</td>}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={cols.length + (actions ? 1 : 0)} className="state">No records</td></tr>
          )}
        </tbody>
      </table>
      </div>
      <div className="toolbar">
        <span className="muted">{total} {total === 1 ? 'record' : 'records'}</span>
        <div className="pagination">
          <button disabled={page <= 0} onClick={() => onPage(page - 1)}>&lsaquo;</button>
          {visiblePages().map((p) =>
            typeof p === 'string'
              ? <span key={p} className="pagination-ellipsis">&hellip;</span>
              : <button key={p} className={p === page ? 'active' : ''} onClick={() => onPage(p)}>{p + 1}</button>
          )}
          <button disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>&rsaquo;</button>
        </div>
      </div>
    </>
  );
}
