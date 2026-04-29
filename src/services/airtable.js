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
  users: import.meta.env.VITE_AIRTABLE_TABLE_USERS || 'Users',
  trainerNotes: import.meta.env.VITE_AIRTABLE_TABLE_TRAINER_NOTES || 'TrainerNotes',
  links: import.meta.env.VITE_AIRTABLE_TABLE_LINKS || 'TrainerClientLink',
  messages: import.meta.env.VITE_AIRTABLE_TABLE_MESSAGES || 'Messages',
};

export const isAirtableConfigured = Boolean(API_KEY && BASE_ID);

const BASE_URL = isAirtableConfigured
  ? `https://api.airtable.com/v0/${BASE_ID}`
  : null;

// Surface a console banner once on load so users know which mode they're in
// — matches the user requirement to make Airtable failures noisy.
if (typeof window !== 'undefined' && !window.__fb_airtable_banner) {
  window.__fb_airtable_banner = true;
  if (isAirtableConfigured) {
    console.info('[airtable] connected to base', BASE_ID);
  } else {
    console.warn('[airtable] running in LOCAL mode — set VITE_AIRTABLE_API_KEY + VITE_AIRTABLE_BASE_ID in .env.local to enable persistence.');
  }
}

// ---------- Local fallback ----------
// Each (table, userId) pair lives in its own localStorage key so two
// accounts on the same device can never see each other's offline-cached
// records. Tables without a userId field (e.g. shared Users / TrainerClientLink
// lookups) fall back to a single shared key.
const PER_USER_TABLES = new Set([
  TABLES?.meals, TABLES?.metrics, TABLES?.workoutLogs, TABLES?.scans,
  TABLES?.trainerNotes, TABLES?.messages,
]);

function inferUserKey(table, fields) {
  if (!PER_USER_TABLES.has(table)) return 'shared';
  // Messages use threadId as the partition key; everything else uses userId.
  if (table === TABLES.messages) return fields?.threadId || 'shared';
  return fields?.userId || 'shared';
}

function lsKey(table, partition = 'shared') {
  return `fitbridge_at_${table}__${partition}`;
}

// Pull every key matching a given table prefix, regardless of partition.
// Used for list operations where we don't know the userId until we see
// the filterByFormula clause.
function lsAllKeys(table) {
  const prefix = `fitbridge_at_${table}__`;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  return keys;
}

function lsReadKey(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function lsWriteKey(key, records) {
  localStorage.setItem(key, JSON.stringify(records));
}

function localCreate(table, fields) {
  const partition = inferUserKey(table, fields);
  const key = lsKey(table, partition);
  const records = lsReadKey(key);
  const record = {
    id: `lcl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fields,
    createdTime: new Date().toISOString(),
  };
  lsWriteKey(key, [record, ...records]);
  return record;
}

function localUpdate(table, recordId, fields) {
  // We don't know which partition the record lives in — search them all.
  const keys = lsAllKeys(table);
  for (const key of keys) {
    const records = lsReadKey(key);
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx >= 0) {
      records[idx] = { ...records[idx], fields: { ...records[idx].fields, ...fields } };
      lsWriteKey(key, records);
      return records[idx];
    }
  }
  return null;
}

// Wipe every localStorage row tagged with this userId across every
// per-user table. Called on logout so the next account on the same
// device can't see leftover offline data.
export function clearLocalFallbackForUser(userId) {
  if (!userId) return;
  const safe = String(userId);
  Object.values(TABLES || {}).forEach((table) => {
    if (!PER_USER_TABLES.has(table)) return;
    if (table === TABLES.messages) {
      // Threads encode the userId in `<clientId>__<trainerId>`; drop any
      // partition that includes this id.
      lsAllKeys(table).forEach((k) => {
        if (k.includes(safe)) localStorage.removeItem(k);
      });
    } else {
      localStorage.removeItem(lsKey(table, safe));
    }
  });
  console.info('[airtable] cleared local fallback for', userId);
}

// Parse a small subset of Airtable filter formulas so the local fallback
// behaves the same as remote: {field}='val', AND({a}='x',{b}='y'), OR(...).
function matchClause(record, clause) {
  const m = clause.trim().match(/^\{(\w+)\}\s*=\s*'([^']*)'$/);
  if (!m) return true; // unknown clauses pass through, never silently filter
  const [, field, value] = m;
  return record.fields?.[field] === value;
}

function evalFormula(record, formula) {
  if (!formula) return true;
  const trimmed = formula.trim();
  const and = trimmed.match(/^AND\((.+)\)$/s);
  if (and) {
    return splitTopLevel(and[1]).every((c) => evalFormula(record, c));
  }
  const or = trimmed.match(/^OR\((.+)\)$/s);
  if (or) {
    return splitTopLevel(or[1]).some((c) => evalFormula(record, c));
  }
  return matchClause(record, trimmed);
}

// Split "a, b, AND(c, d)" → ["a", "b", "AND(c, d)"] respecting parens.
function splitTopLevel(s) {
  const out = [];
  let depth = 0, buf = '';
  for (const ch of s) {
    if (ch === '(') { depth++; buf += ch; }
    else if (ch === ')') { depth--; buf += ch; }
    else if (ch === ',' && depth === 0) { out.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function localList(table, { filterByFormula, maxRecords } = {}) {
  // Concatenate every partition for this table. The filterByFormula clause
  // (e.g. `{userId}='X'`) still narrows results, so even if some old data
  // sits under a different partition key, only matching rows come through.
  const keys = lsAllKeys(table);
  const legacyKey = `fitbridge_at_${table}`; // pre-partition data, if any
  if (localStorage.getItem(legacyKey) !== null) keys.push(legacyKey);
  let records = [];
  for (const key of keys) records = records.concat(lsReadKey(key));
  if (filterByFormula) {
    records = records.filter((r) => evalFormula(r, filterByFormula));
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
    const method = options.method || 'GET';
    const tableMatch = path.match(/^\/([^/?]+)/);
    const table = tableMatch ? decodeURIComponent(tableMatch[1]) : path;
    // Disambiguate the most common deployment hazards so the dev console
    // tells you what to do, not just what went wrong.
    let hint = '';
    if (res.status === 401) hint = ' — token is invalid or expired. Re-issue VITE_AIRTABLE_API_KEY.';
    else if (res.status === 403 && body.includes('MODEL_NOT_FOUND')) {
      hint = ` — the "${table}" table does not exist in this base. Create it per AIRTABLE_SETUP.md.`;
    } else if (res.status === 403) hint = ' — token is missing data.records:read or data.records:write scope on this base.';
    else if (res.status === 422) hint = ' — schema mismatch (unknown field, bad date, missing select option). The service auto-retries by dropping unknown fields.';
    console.error(`[airtable] ${method} ${table} -> ${res.status}${hint}`, body);
    const err = new Error(`Airtable ${res.status}: ${body}`);
    err.status = res.status;
    err.body = body;
    err.table = table;
    throw err;
  }
  return res.json();
}

// Self-healing write: if Airtable rejects an UNKNOWN_FIELD_NAME (the base
// schema is older than the app), drop that field and retry. Keeps writes
// flowing even when the user hasn't added every new column yet.
//
// Worst-case retries = (number of unknown fields) + 1 successful attempt.
// We bound by working.length + 2 to guarantee we always reach the success
// attempt even if every field but one is unknown — and we exit early as
// soon as the body is empty.
async function writeWithFieldDropFallback(method, path, fields) {
  let working = { ...fields };
  const maxAttempts = Object.keys(working).length + 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await airtableFetch(path, {
        method,
        body: JSON.stringify({ fields: working, typecast: true }),
      });
    } catch (err) {
      if (err.status !== 422 || !err.body) throw err;
      const m = err.body.match(/Unknown field name:\s*"([^"]+)"/);
      if (!m) throw err;
      const drop = m[1];
      if (!(drop in working)) throw err;
      console.warn(`[airtable] dropping unknown field "${drop}" and retrying`);
      delete working[drop];
      if (Object.keys(working).length === 0) throw err;
    }
  }
  throw new Error('[airtable] gave up after dropping unknown fields');
}

// ---------- Public API ----------
export async function createRecord(table, fields) {
  const cleaned = stripEmpty(fields);
  if (!isAirtableConfigured) {
    console.warn(`[airtable] POST ${table} -> local-only (Airtable not configured)`);
    return localCreate(table, cleaned);
  }
  try {
    const rec = await writeWithFieldDropFallback('POST', `/${encodeURIComponent(table)}`, cleaned);
    console.info(`[airtable] POST ${table} -> ${rec?.id || 'success'}`);
    return rec;
  } catch (err) {
    console.warn(`[airtable] POST ${table} -> failed, using local fallback`, err);
    return localCreate(table, cleaned);
  }
}

export async function updateRecord(table, recordId, fields) {
  const cleaned = stripEmpty(fields);
  if (!isAirtableConfigured) return localUpdate(table, recordId, cleaned);
  try {
    return await writeWithFieldDropFallback('PATCH', `/${encodeURIComponent(table)}/${recordId}`, cleaned);
  } catch (err) {
    console.warn('[airtable] updateRecord failed, using local fallback', err);
    return localUpdate(table, recordId, cleaned);
  }
}

// Upsert by a natural key field. Airtable doesn't do this natively, so we
// list-then-PATCH-or-POST. Cheap enough for profile writes.
export async function upsertByField(table, field, value, fields) {
  const formula = `{${field}}='${String(value).replace(/'/g, "\\'")}'`;
  const existing = await listRecords(table, { filterByFormula: formula, maxRecords: 1 });
  if (existing.length) return updateRecord(table, existing[0].id, fields);
  return createRecord(table, { [field]: value, ...fields });
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

// ---------- Domain-specific helpers ----------
// Auth: find a Users record by email (case-insensitive lookup).
export async function findUserByEmail(email) {
  if (!email) return null;
  const safe = String(email).replace(/'/g, "\\'").toLowerCase();
  const records = await listRecords(TABLES.users, {
    filterByFormula: `LOWER({email})='${safe}'`,
    maxRecords: 1,
  });
  return records[0] || null;
}

// Idempotent: only creates a Users record if one with this id/email doesn't
// already exist. Used by both signup (new account) and login (so demo users
// get a row in Airtable on first login, enabling trainer-side queries).
export async function ensureUserRecord(user) {
  if (!user?.id) return null;
  // Look up by id first, then by email — covers both first signup and
  // returning users where the local id was generated client-side.
  const byId = await listRecords(TABLES.users, {
    filterByFormula: eqUser(user.id),
    maxRecords: 1,
  });
  if (byId.length) return byId[0];
  const byEmail = user.email ? await findUserByEmail(user.email) : null;
  if (byEmail) return byEmail;
  return createRecord(TABLES.users, {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || '',
    createdAt: nowIso(),
  });
}

// Create or refresh a TrainerClientLink. Idempotent — won't duplicate.
export async function ensureTrainerClientLink({ trainerId, userId, status = 'active' }) {
  if (!trainerId || !userId) return null;
  const safeT = String(trainerId).replace(/'/g, "\\'");
  const safeC = String(userId).replace(/'/g, "\\'");
  const existing = await listRecords(TABLES.links, {
    filterByFormula: `AND({trainerId}='${safeT}',{userId}='${safeC}')`,
    maxRecords: 1,
  });
  if (existing.length) {
    if (existing[0].fields?.status !== status) {
      return updateRecord(TABLES.links, existing[0].id, { status });
    }
    return existing[0];
  }
  return createRecord(TABLES.links, {
    trainerId,
    userId,
    status,
    createdAt: nowIso(),
  });
}

function nowIso() { return new Date().toISOString(); }

// ---------- Messages (trainer ↔ client chat) ----------
// Threads are identified by a deterministic combination of clientId+trainerId
// so both sides query the same stream regardless of who wrote first.
export function buildThreadId(clientId, trainerId) {
  if (!clientId || !trainerId) return '';
  return `${clientId}__${trainerId}`;
}

export async function listThread(clientId, trainerId) {
  const threadId = buildThreadId(clientId, trainerId);
  if (!threadId) return [];
  const safe = String(threadId).replace(/'/g, "\\'");
  return listRecords(TABLES.messages, {
    filterByFormula: `{threadId}='${safe}'`,
    sort: [{ field: 'createdAt', direction: 'asc' }],
    maxRecords: 200,
  });
}

export async function sendMessageRecord({ clientId, trainerId, senderRole, message }) {
  if (!clientId || !trainerId || !message?.trim() || !senderRole) return null;
  const senderId = senderRole === 'trainer' ? trainerId : clientId;
  const receiverId = senderRole === 'trainer' ? clientId : trainerId;
  const receiverRole = senderRole === 'trainer' ? 'client' : 'trainer';
  return createRecord(TABLES.messages, {
    threadId: buildThreadId(clientId, trainerId),
    clientId,
    trainerId,
    senderId,
    receiverId,
    senderRole,
    receiverRole,
    message: message.trim(),
    createdAt: nowIso(),
  });
}

// Strip undefined/null/'' so Airtable doesn't reject for unknown empty fields.
function stripEmpty(fields) {
  const out = {};
  Object.entries(fields || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
}
