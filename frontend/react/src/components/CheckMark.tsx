export type CheckResult = 'pass' | 'fail' | 'warn';

const PATHS: Record<CheckResult, string> = {
  pass: 'M3.5 8.5l3 3 6-7',
  fail: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
  warn: 'M8 3.5v5.5M8 12v.5',
};

/**
 * A small round check-result mark in the theme's success, danger or warning colour.
 * `null` (not checked yet) keeps an empty slot so rows stay aligned.
 */
export default function CheckMark({ result }: { result: CheckResult | null }) {
  if (!result) return <span className="check-mark" aria-hidden="true" />;
  return (
    <span className={`check-mark check-mark-${result}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="10" height="10">
        <path d={PATHS[result]} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
