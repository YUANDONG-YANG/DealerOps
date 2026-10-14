interface AuditRow {
  action?: string;
  actorUsername?: string;
  createdAt?: string;
  fieldSummary?: Record<string, unknown>;
}

function summaryText(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '—';
  const o: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const k of Object.keys(o)) {
    if (/email|phone|address/i.test(k)) delete o[k];
  }
  return Object.keys(o).length ? JSON.stringify(o) : '—';
}

export default function AuditTrail({ rows }: { rows: AuditRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="detail-audit">
      <div className="muted">Audit</div>
      <table className="table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th style={{ width: 110 }}>Action</th>
            <th>Actor</th>
            <th>When</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.action}</td>
              <td>{row.actorUsername}</td>
              <td>{row.createdAt}</td>
              <td>{summaryText(row.fieldSummary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
