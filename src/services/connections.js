// Lightweight prototype storage for the trainer-client connection +
// scheduling flows. Backed by localStorage so the demo works without
// any extra Airtable schema changes — the user explicitly asked us to
// not change the data schema.
//
// Two collections live here:
//   * fitbridge_connection_requests — { id, clientId, clientName,
//     trainerId, trainerName, gymId, gymName, status, requestedAt,
//     respondedAt }
//   * fitbridge_sessions            — { id, clientId, trainerId,
//     gymId, dateIso, time, status, bookedAt }
//
// Both keys are read by every page that needs them and written via the
// helpers below so we have one place to evolve the shape later.

const REQ_KEY = 'fitbridge_connection_requests';
const SES_KEY = 'fitbridge_sessions';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota exceeded / disabled — fail soft */
  }
}

// ---- Connection requests --------------------------------------------------

export function listRequestsForTrainer(trainerId) {
  if (!trainerId) return [];
  return read(REQ_KEY).filter((r) => r.trainerId === trainerId);
}

export function listRequestsForClient(clientId) {
  if (!clientId) return [];
  return read(REQ_KEY).filter((r) => r.clientId === clientId);
}

export function pendingForTrainer(trainerId) {
  return listRequestsForTrainer(trainerId).filter((r) => r.status === 'pending');
}

// "Connected" = client has at least one accepted request. Drives whether
// the dashboard is unlocked (see ClientRoute). Seed accounts (alex@email.com)
// are treated as connected because they ship pre-linked to Coach Mike via
// the seed TrainerClientLink — gating them through find-a-gym would be
// confusing for the demo.
const SEED_CONNECTED_CLIENT_IDS = new Set(['usr_001']);

export function isClientConnected(clientId) {
  if (!clientId) return false;
  if (SEED_CONNECTED_CLIENT_IDS.has(clientId)) return true;
  return listRequestsForClient(clientId).some((r) => r.status === 'accepted');
}

export function hasPendingRequestForClient(clientId) {
  if (!clientId) return false;
  return listRequestsForClient(clientId).some((r) => r.status === 'pending');
}

// First accepted request — used by the connection screen + post-accept
// UI to show "you're now connected to {trainerName}" without re-querying.
export function acceptedRequestForClient(clientId) {
  if (!clientId) return null;
  return listRequestsForClient(clientId).find((r) => r.status === 'accepted') || null;
}

export function pendingRequestForClient(clientId) {
  if (!clientId) return null;
  return listRequestsForClient(clientId).find((r) => r.status === 'pending') || null;
}

export function createConnectionRequest({ clientId, clientName, trainerId, trainerName, gymId, gymName }) {
  if (!clientId || !trainerId) return null;
  const list = read(REQ_KEY);
  // Don't double-create if the client already has a pending request to
  // this trainer — return the existing record so the UI can show "you
  // already requested" instead of stacking duplicates.
  const existing = list.find(
    (r) => r.clientId === clientId && r.trainerId === trainerId && r.status === 'pending',
  );
  if (existing) return existing;
  const record = {
    id: `req_${Date.now()}`,
    clientId,
    clientName: clientName || '',
    trainerId,
    trainerName: trainerName || '',
    gymId: gymId || null,
    gymName: gymName || '',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    respondedAt: null,
  };
  list.push(record);
  write(REQ_KEY, list);
  return record;
}

export function respondToRequest(id, status) {
  if (!id) return null;
  const list = read(REQ_KEY);
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], status, respondedAt: new Date().toISOString() };
  write(REQ_KEY, list);
  return list[idx];
}

// ---- Scheduled sessions ---------------------------------------------------

export function listSessionsForClient(clientId) {
  if (!clientId) return [];
  return read(SES_KEY)
    .filter((s) => s.clientId === clientId)
    .sort((a, b) => (a.dateIso || '').localeCompare(b.dateIso || '') || (a.time || '').localeCompare(b.time || ''));
}

export function listSessionsForTrainer(trainerId) {
  if (!trainerId) return [];
  return read(SES_KEY)
    .filter((s) => s.trainerId === trainerId)
    .sort((a, b) => (a.dateIso || '').localeCompare(b.dateIso || '') || (a.time || '').localeCompare(b.time || ''));
}

export function bookSession({ clientId, clientName, trainerId, trainerName, gymId, gymName, dateIso, time }) {
  if (!clientId || !trainerId || !dateIso || !time) return null;
  const list = read(SES_KEY);
  const record = {
    id: `ses_${Date.now()}`,
    clientId,
    clientName: clientName || '',
    trainerId,
    trainerName: trainerName || '',
    gymId: gymId || null,
    gymName: gymName || '',
    dateIso,
    time,
    status: 'booked',
    bookedAt: new Date().toISOString(),
  };
  list.push(record);
  write(SES_KEY, list);
  return record;
}

export function cancelSession(id) {
  const list = read(SES_KEY);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], status: 'cancelled' };
  write(SES_KEY, list);
  return list[idx];
}
