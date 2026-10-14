import type { ReactNode } from 'react';

export interface Column<T = Record<string, unknown>> {
  key?: string;
  label: string;
  width?: number | string;
  render?: (row: T) => ReactNode;
}

interface Props<T = Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  onPage: (page: number) => void;
  actions?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, rows, total, page, onPage, actions, rowClassName,
}: Props<T>) {
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const pages: number[] = [];
  for (let i = 0; i < pageCount; i++) pages.push(i);

  return (
    <>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, ci) => (
              <th key={col.key ?? ci} style={col.width ? { width: col.width } : undefined}>{col.label}</th>
            ))}
            {actions && <th style={{ width: 190 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={(row as Record<string, unknown>).id as string ?? i} className={rowClassName?.(row) || ''}>
              {columns.map((col, ci) => (
                <td key={col.key ?? ci}>
                  {col.render ? col.render(row) : col.key ? String((row as Record<string, unknown>)[col.key] ?? '') : ''}
                </td>
              ))}
              {actions && <td>{actions(row)}</td>}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="state">No records</td></tr>
          )}
        </tbody>
      </table>
      <div className="toolbar">
        <span className="muted">{total} {total === 1 ? 'record' : 'records'}</span>
        <div className="pagination">
          <button disabled={page <= 0} onClick={() => onPage(page - 1)}>&lsaquo;</button>
          {pages.map(p => (
            <button key={p} className={p === page ? 'active' : ''} onClick={() => onPage(p)}>{p + 1}</button>
          ))}
          <button disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>&rsaquo;</button>
        </div>
      </div>
    </>
  );
}
