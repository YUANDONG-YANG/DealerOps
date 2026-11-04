import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

export type SortDir = 'asc' | 'desc';
export interface SortState { key: string; dir: SortDir }

/** The sort after a header click: a new column starts ascending, the same column flips direction. */
export function nextSort(current: SortState | null | undefined, key: string): SortState {
  return current?.key === key && current.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' };
}

/** The `field,asc|desc` value of the list APIs' `sort` query parameter, or undefined for the default order. */
export function sortParam(sort: SortState | null | undefined) {
  return sort ? `${sort.key},${sort.dir}` : undefined;
}

// Blank values sort last in both directions; numbers and booleans compare numerically, text
// compares case-insensitively with embedded numbers in order (ISO dates compare as text).
function compareValues(a: unknown, b: unknown) {
  if (typeof a === 'boolean') a = Number(a);
  if (typeof b === 'boolean') b = Number(b);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function isBlank(v: unknown) {
  return v == null || v === '';
}

/** A sorted copy of the rows; `valueOf` reads the compared value of a row for the sort key. */
function sortRows<T>(rows: T[], sort: SortState | null | undefined, valueOf: (row: T, key: string) => unknown): T[] {
  if (!sort) return rows;
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((x, y) => {
    const a = valueOf(x, sort.key);
    const b = valueOf(y, sort.key);
    if (isBlank(a) || isBlank(b)) return isBlank(a) === isBlank(b) ? 0 : isBlank(a) ? 1 : -1;
    return sign * compareValues(a, b);
  });
}

function fieldOf(row: unknown, key: string) {
  return (row as Record<string, unknown>)[key];
}

/** Client-side sort state of a table whose rows are all loaded; the rows keep their order until a header is clicked. */
export function useSort<T>(rows: T[], valueOf: (row: T, key: string) => unknown = fieldOf) {
  const [sort, setSort] = useState<SortState | null>(null);
  const sorted = useMemo(() => sortRows(rows, sort, valueOf), [rows, sort, valueOf]);
  return { sorted, sort, toggle: (key: string) => setSort((s) => nextSort(s, key)) };
}

/** A clickable column header that shows the current sort direction. */
export function SortableTh({ label, sortKey, sort, onSort, style }: {
  label: string;
  sortKey: string;
  sort: SortState | null | undefined;
  onSort: (key: string) => void;
  style?: CSSProperties;
}) {
  const dir = sort?.key === sortKey ? sort.dir : undefined;
  return (
    <th style={style} aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
      <button type="button" className="th-sort" data-sort={dir ?? 'none'} onClick={() => onSort(sortKey)}>{label}</button>
    </th>
  );
}
