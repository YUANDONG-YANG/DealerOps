const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

export function cad(value: unknown): string {
  return value == null || value === '' ? '—' : CAD.format(Number(value));
}

// Audit timestamps arrive as UTC and are shown in the viewer's local zone (AUD-03).
export function dateTimeLocal(value: unknown): string {
  if (!value) return '—';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
    + ` ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

// Avatar initials: first letter of the first two words ("E2E Staff" -> "ES").
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
