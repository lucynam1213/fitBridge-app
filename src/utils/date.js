// Date helpers. Airtable date columns require ISO (YYYY-MM-DD) — never a
// human label like "Today". All write paths MUST use todayIso() / toIsoDate().

// Today in local time, formatted YYYY-MM-DD. Using local time (not UTC)
// so a meal logged at 11pm gets today's date, not tomorrow's.
export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Full ISO datetime for `loggedAt`-style timestamp columns.
export function nowIso() {
  return new Date().toISOString();
}

// Coerce any legacy / loose value to a YYYY-MM-DD date. Handles the
// historical "Today" string from earlier rows so the app doesn't break on
// previously-saved data.
export function toIsoDate(value) {
  if (!value) return todayIso();
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    if (value === 'Today') return todayIso();
    // Try a best-effort parse ("Apr 18", "Mon Apr 6", etc.).
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return toIsoDate(parsed.toISOString());
    }
    return todayIso();
  }
  if (value instanceof Date) return toIsoDate(value.toISOString());
  return todayIso();
}

// Render an ISO date the way the UI used to show it: "Today" if it's today,
// otherwise a short "Apr 18" style. Safe to pass legacy values ("Today" etc.).
export function formatDisplayDate(value) {
  if (value === 'Today') return 'Today';
  const iso = toIsoDate(value);
  if (iso === todayIso()) return 'Today';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
