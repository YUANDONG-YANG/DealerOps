import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export type Suggestion = { value: string; label: string; hint?: string };

const SUGGEST_DEBOUNCE_MS = 300;
export const SUGGEST_LIMIT = 8;

/** Case-insensitive substring match of `q` in any of the given fields, for client-side suggestions. */
export function matchesAny(q: string, ...fields: (string | null | undefined)[]) {
  const needle = q.trim().toLowerCase();
  return fields.some(f => (f ?? '').toLowerCase().includes(needle));
}

/** Keeps the first suggestion of each value, in order. */
export function uniqueSuggestions(items: Suggestion[]) {
  const seen = new Set<string>();
  return items.filter(s => (seen.has(s.value) ? false : (seen.add(s.value), true)));
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (!q.trim() || i < 0) return <>{text}</>;
  const end = i + q.trim().length;
  return <>{text.slice(0, i)}<strong>{text.slice(i, end)}</strong>{text.slice(end)}</>;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Fetches up to SUGGEST_LIMIT matches; the backend searches are substring (LIKE %q%) matches. */
  suggest: (q: string) => Promise<Suggestion[]>;
  /** Picking a suggestion; the list page applies it as its filter right away. */
  onPick: (s: Suggestion) => void;
  /** Enter without a highlighted suggestion. */
  onEnter?: () => void;
  placeholder?: string;
  ariaLabel: string;
}

/**
 * A list-page search box that shows matching suggestions while typing (UI conventions, search
 * boxes). Arrow keys move through the list, Enter picks, Escape or a click outside closes it.
 */
export default function SearchSuggest({ value, onChange, suggest, onPick, onEnter, placeholder, ariaLabel }: Props) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  // Only typing asks for suggestions; a pick or an outside change of `value` does not reopen the list.
  const typed = useRef(false);
  const seq = useRef(0);
  const suggestRef = useRef(suggest);
  suggestRef.current = suggest;

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || !q) { setItems([]); setOpen(false); return; }
    const mine = ++seq.current;
    setLoading(true);
    const timer = setTimeout(() => {
      suggestRef.current(q)
        .then(list => {
          if (mine !== seq.current) return;
          // A suggestion equal to the typed text adds nothing; with only that left, stay closed.
          const all = list.slice(0, SUGGEST_LIMIT);
          const rest = all.filter(s => s.value.toLowerCase() !== q.toLowerCase());
          setItems(rest);
          setActive(-1);
          setOpen(rest.length > 0 || all.length === 0);
        })
        .catch(() => { if (mine === seq.current) { setItems([]); setOpen(false); } })
        .finally(() => { if (mine === seq.current) setLoading(false); });
    }, SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  function pick(s: Suggestion) {
    typed.current = false;
    seq.current++;
    setOpen(false);
    onPick(s);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && open && items.length) {
      e.preventDefault();
      setActive(a => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp' && open && items.length) {
      e.preventDefault();
      setActive(a => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && items[active]) {
        e.preventDefault();
        pick(items[active]);
      } else {
        typed.current = false;
        seq.current++;
        setOpen(false);
        onEnter?.();
      }
    }
  }

  return (
    <div className="suggest">
      <input className="input" value={value} placeholder={placeholder} aria-label={ariaLabel}
        role="combobox" aria-expanded={open} aria-autocomplete="list" autoComplete="off"
        onChange={e => { typed.current = true; onChange(e.target.value); }}
        onKeyDown={onKeyDown}
        onFocus={() => { if (items.length && value.trim()) setOpen(true); }}
        onBlur={() => setOpen(false)} />
      {open && (
        <ul className="suggest-list" role="listbox" aria-label={`${ariaLabel} suggestions`}>
          {items.length ? items.map((s, i) => (
            <li key={`${s.value}-${i}`} role="option" aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              // mousedown, not click: the input's blur would close the list before a click lands.
              onMouseDown={e => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}>
              <span><Highlight text={s.label} q={value} /></span>
              {s.hint && <span className="suggest-hint"><Highlight text={s.hint} q={value} /></span>}
            </li>
          )) : (
            <li className="suggest-empty">{loading ? 'Searching…' : 'No matches'}</li>
          )}
        </ul>
      )}
    </div>
  );
}
