/** One dashboard number with its label and an optional explanatory hint. */
export default function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card" style={{ minWidth: 170, flex: '1 1 170px' }}>
      <div className="muted">{label}</div>
      <strong style={{ fontSize: 22 }}>{value}</strong>
      {hint && <div className="muted" style={{ fontSize: 12 }}>{hint}</div>}
    </div>
  );
}
