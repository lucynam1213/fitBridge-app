// Airtable REST client for FitBridge.
// - When VITE_AIRTABLE_API_KEY + VITE_AIRTABLE_BASE_ID are set, hits api.airtable.com.
// - When missing, falls back to a localStorage-backed mock so the demo still runs.
// All "id" semantics match Airtable's record id (rec...). Local fallback uses lcl_<ts>.

const API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;

export const TABLES = {
  meals: import.meta.env.VITE_AIRTABLE_TABLE_MEALS || 'Meals',
  metrics: import.meta.env.VITE_AIRTABLE_TABLE_METRICS || 'BodyMetrics',
  workoutLogs: import.meta.env.VITE_AIRTABLE_TABLE_WORKOUT_LOGS || 'WorkoutLogs',
  scans: import.meta.env.VITE_AIRTABLE_TABLE_SCANS || 'MealScans',
};

export const isAirtableConfigured = Boolean(API_KEY && BASE_ID);

const BASE_URL = isAirtableConfigured
  ? `https://api.airtable.com/v0/${BASE_ID}`
  : null;

// ---------- Local fallback ----------
function lsKey(table) {
  return `fitbridge_at_${table}`;
}

function lsRead(table) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(table)) || '[]');
  } catch {
    return [];
  }
}

function lsWrite(table, records) {
  localStorage.setItem(lsKey(table), JSON.stringify(records));
}

function localCreate(table, fields) {
  const records = lsRead(table);
  const record = {
    id: `lcl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fields,
    createdTime: new Date().toISOString(),
  };
  lsWrite(table, [record, ...records]);
  return record;
}

function localList(table, { filterByFormula, maxRecords } = {}) {
  let records = lsRead(table);
  if (filterByFormula) {
    // Very small subset: support {userId}='abc'
    const match = filterByFormula.match(/^\{(\w+)\}\s*=\s*'([^']*)'$/);
    if (match) {
      const [, field, value] = match;
      records = records.filter((r) => r.fields?.[field] === value);
    }
  }
  if (maxRecords) records = records.slice(0, maxRecords);
  return records;
}

// ---------- Airtable HTTP ----------
async function airtableFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json();
}

// ---------- Public API ----------
export async function createRecord(table, fields) {
  if (!isAirtableConfigured) return localCreate(table, fields);
  try {
    const data = await airtableFetch(`/${encodeURIComponent(table)}`, {
      method: 'POST',
      body: JSON.stringify({ fields, typecast: true }),
    });
    return data;
  } catch (err) {
    console.warn('[airtable] createRecord failed, using local fallback', err);
    return localCreate(table, fields);
  }
}

export async function listRecords(table, { filterByFormula, maxRecords = 100, sort } = {}) {
  if (!isAirtableConfigured) return localList(table, { filterByFormula, maxRecords });
  try {
    const params = new URLSearchParams();
    if (filterByFormula) params.set('filterByFormula', filterByFormula);
    if (maxRecords) params.set('maxRecords', String(maxRecords));
    if (sort) {
      sort.forEach((s, i) => {
        params.set(`sort[${i}][field]`, s.field);
        params.set(`sort[${i}][direction]`, s.direction || 'desc');
      });
    }
    const data = await airtableFetch(`/${encodeURIComponent(table)}?${params.toString()}`);
    return data.records || [];
  } catch (err) {
    console.warn('[airtable] listRecords failed, using local fallback', err);
    return localList(table, { filterByFormula, maxRecords });
  }
}

// Helper to build a {userId}='X' formula safely.
export function eqUser(userId) {
  const safe = String(userId || '').replace(/'/g, "\\'");
  return `{userId}='${safe}'`;
}
