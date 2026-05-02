import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  users as initialUsers,
  workouts as initialWorkouts,
  clients as initialClients,
  workoutHistory as initialHistory,
  meals as initialMeals,
  bodyMetrics as initialMetrics,
  notifications as initialNotifications,
} from '../data/mockData';
import {
  createRecord, updateRecord, listRecords, upsertByField, eqUser, TABLES, isAirtableConfigured,
  ensureUserRecord, ensureTrainerClientLink, listThread, sendMessageRecord,
  buildThreadId, findUserByEmail, clearLocalFallbackForUser,
} from '../services/airtable';
import { listAllRequests } from '../services/connections';

// "Seed" users are the two demo accounts that ship in mockData.js
// (alex@email.com, mike@fitpro.com). For these accounts we *do* show the
// pre-baked sample meals / workouts / metrics so the demo isn't empty.
//
// For any other user (real signup, Airtable-only login) we MUST start with
// empty state — pre-baked seed data leaking across users was the root cause
// of "I just signed up and I see somebody else's meals". See refresh().
function isSeedUserId(id) {
  return initialUsers.some((u) => u.id === id);
}
import { todayIso, nowIso, toIsoDate } from '../utils/date';

// Editable profile fields we sync with the Users table (anything not in this
// list stays local — e.g. the demo password).
const PROFILE_FIELDS = ['name', 'email', 'avatar', 'role', 'goal', 'bio', 'totalWorkouts', 'streak'];

function profilePatch(user) {
  const out = {};
  PROFILE_FIELDS.forEach((k) => {
    if (user[k] !== undefined && user[k] !== null) out[k] = user[k];
  });
  return out;
}

function recordToProfile(rec) {
  const f = rec.fields || {};
  const out = { airtableId: rec.id };
  PROFILE_FIELDS.forEach((k) => { if (f[k] !== undefined) out[k] = f[k]; });
  return out;
}

const AppContext = createContext(null);

// ------- Record <-> domain mappers -------

function parseItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  if (raw.startsWith('[')) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function recordToMeal(rec) {
  const f = rec.fields || {};
  return {
    id: rec.id,
    userId: f.userId,
    date: toIsoDate(f.date),
    type: f.type || 'Snacks',
    foodName: f.foodName || '',
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fat: Number(f.fat) || 0,
    transFat: Number(f.transFat) || 0,
    sugar: Number(f.sugar) || 0,
    sodium: Number(f.sodium) || 0,
    servingSize: f.servingSize || '',
    items: parseItems(f.items),
    source: f.source || 'manual',
    visibleToTrainer: f.visibleToTrainer !== false,
    loggedAt: f.loggedAt || rec.createdTime,
  };
}

function mealToFields(meal, userId) {
  return {
    userId,
    // Airtable date columns require YYYY-MM-DD — never "Today".
    date: toIsoDate(meal.date),
    type: meal.type,
    foodName: meal.foodName || (Array.isArray(meal.items) ? meal.items[0] : '') || meal.type,
    calories: Number(meal.calories) || 0,
    protein: Number(meal.protein) || 0,
    carbs: Number(meal.carbs) || 0,
    fat: Number(meal.fat) || 0,
    transFat: Number(meal.transFat) || 0,
    sugar: Number(meal.sugar) || 0,
    sodium: Number(meal.sodium) || 0,
    servingSize: meal.servingSize || '',
    items: JSON.stringify(meal.items || []),
    source: meal.source || 'manual_edit',
    visibleToTrainer: meal.visibleToTrainer !== false,
    loggedAt: nowIso(),
  };
}

function recordToScan(rec) {
  const f = rec.fields || {};
  return {
    id: rec.id,
    userId: f.userId,
    label: f.label || '',
    items: parseItems(f.items),
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fat: Number(f.fat) || 0,
    transFat: Number(f.transFat) || 0,
    confidence: Number(f.confidence) || 0,
    mealType: f.mealType || '',
    fileName: f.fileName || '',
    analyzedAt: f.analyzedAt || rec.createdTime,
    visibleToTrainer: f.visibleToTrainer !== false,
  };
}

function recordToMetric(rec) {
  const f = rec.fields || {};
  return {
    id: rec.id,
    userId: f.userId,
    date: toIsoDate(f.date),
    weight: Number(f.weight) || 0,
    bodyFat: Number(f.bodyFat) || 0,
    bmi: Number(f.bmi) || 0,
  };
}

function recordToWorkoutLog(rec) {
  const f = rec.fields || {};
  let exercises = f.exercises;
  if (typeof exercises === 'string' && exercises.startsWith('[')) {
    try { exercises = JSON.parse(exercises); } catch { /* keep string */ }
  }
  return {
    id: rec.id,
    userId: f.userId,
    trainerId: f.trainerId,
    workoutId: f.workoutId,
    title: f.title,
    date: toIsoDate(f.date),
    locationType: f.locationType || 'home',
    source: f.source || 'self_logged',
    exercises,
    duration: Number(f.duration) || 0,
    calories: Number(f.calories) || 0,
    status: f.status || 'completed',
    notes: f.notes || '',
    visibleToClient: f.visibleToClient !== false,
    loggedAt: f.loggedAt || rec.createdTime,
  };
}

function recordToNote(rec) {
  const f = rec.fields || {};
  return {
    id: rec.id,
    trainerId: f.trainerId,
    userId: f.userId,
    relatedType: f.relatedType || 'general',
    relatedRecordId: f.relatedRecordId || '',
    note: f.note || '',
    createdAt: f.createdAt || rec.createdTime,
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('fitbridge_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [meals, setMeals] = useState([]);
  const [mealScans, setMealScans] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [trainerNotes, setTrainerNotes] = useState([]);
  // Seed notifications ("Coach Mike assigned a new workout", etc.) are
  // only meaningful for the demo seed user. New signups get an empty
  // notifications list so the bell badge / Notifications screen / and
  // the Quick Access "3 unread" count don't show fake activity that
  // never happened. The seed list reseeds whenever a seed user logs in.
  const [notifications, setNotifications] = useState([]);
  // The user's primary trainer thread, hydrated on refresh(). Drives the
  // unread-message badge on Home / Messages quick-access / and the
  // synthetic "New message from your trainer" entry on the Notifications
  // screen so all three counts stay in sync with what Airtable actually has.
  const [primaryThread, setPrimaryThread] = useState([]);
  // Seed clients ship with the demo (Alex, Jordan, etc.). NEW clients
  // who connect via the Find-a-Trainer flow are stitched into the list
  // dynamically below — see derivedClients. We bump `connectionsTick`
  // whenever a request is accepted so consumers re-read the localStorage
  // store and pick up the new client without a manual refresh.
  const [seedClients] = useState(initialClients);
  const [connectionsTick, setConnectionsTick] = useState(0);
  const bumpConnections = useCallback(() => setConnectionsTick((t) => t + 1), []);
  const [loading, setLoading] = useState(false);
  // Latest fetch error — pages read this via useApp() to render error states
  // and offer a retry. Cleared on next successful refresh().
  const [lastError, setLastError] = useState(null);

  // Persist current user to localStorage so reload keeps you signed in.
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fitbridge_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('fitbridge_user');
    }
  }, [currentUser]);

  // ----- Loaders (Airtable or local fallback) -----

  const loadMealsFor = useCallback(async (userId) => {
    if (!userId) return [];
    console.info('[airtable] fetch Meals for userId', userId);
    const records = await listRecords(TABLES.meals, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'loggedAt', direction: 'desc' }],
    });
    return records.map(recordToMeal);
  }, []);

  const loadScansFor = useCallback(async (userId) => {
    if (!userId) return [];
    console.info('[airtable] fetch MealScans for userId', userId);
    const records = await listRecords(TABLES.scans, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'analyzedAt', direction: 'desc' }],
    });
    return records.map(recordToScan);
  }, []);

  const loadMetricsFor = useCallback(async (userId) => {
    if (!userId) return [];
    console.info('[airtable] fetch BodyMetrics for userId', userId);
    const records = await listRecords(TABLES.metrics, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'loggedAt', direction: 'desc' }],
    });
    return records.map(recordToMetric);
  }, []);

  const loadHistoryFor = useCallback(async (userId) => {
    if (!userId) return [];
    console.info('[airtable] fetch WorkoutLogs for userId', userId);
    const records = await listRecords(TABLES.workoutLogs, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'loggedAt', direction: 'desc' }],
    });
    return records.map(recordToWorkoutLog);
  }, []);

  const loadNotesFor = useCallback(async (userId) => {
    if (!userId) return [];
    console.info('[airtable] fetch TrainerNotes for userId', userId);
    const records = await listRecords(TABLES.trainerNotes, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'createdAt', direction: 'desc' }],
    });
    return records.map(recordToNote);
  }, []);

  // Fetch the single Users-table record for this user, if one exists.
  // The lookup is by userId; refresh() also tries email as a fallback when
  // the local id has drifted from the Airtable record.
  const loadProfileFor = useCallback(async (userId) => {
    if (!userId) return null;
    console.info('[airtable] fetch Users for userId', userId);
    const records = await listRecords(TABLES.users, {
      filterByFormula: eqUser(userId),
      maxRecords: 1,
    });
    console.info('[airtable] fetch Users for userId -> result', {
      userId, found: records.length > 0, recordId: records[0]?.id || null,
    });
    return records.length ? recordToProfile(records[0]) : null;
  }, []);

  // Refresh all data for the signed-in user, including profile overrides.
  //
  // CRITICAL: real signup users must start with empty data. Only the demo
  // seed accounts (Alex / Coach Mike) get pre-baked meals/workouts/metrics
  // when Airtable returns nothing. Otherwise every fresh signup would see
  // the seed user's history as their own.
  const refresh = useCallback(async (userId) => {
    const uid = userId || currentUser?.id;
    if (!uid) return;
    const isSeed = isSeedUserId(uid);
    console.info('[AppContext] refresh start', { userId: uid, seed: isSeed, airtable: isAirtableConfigured });
    setLoading(true);
    setLastError(null);
    try {
      const [m, scans, bm, wh, notes, profile] = await Promise.all([
        loadMealsFor(uid),
        loadScansFor(uid),
        loadMetricsFor(uid),
        loadHistoryFor(uid),
        loadNotesFor(uid),
        loadProfileFor(uid),
      ]);
      console.info('[AppContext] refresh fetched', {
        userId: uid,
        meals: m.length,
        scans: scans.length,
        metrics: bm.length,
        workoutHistory: wh.length,
        trainerNotes: notes.length,
        profile: profile ? 'matched-by-userId' : 'none',
      });

      // Hydrate the user's primary trainer thread so the unread-message
      // badge on Home / Messages / Notifications stays in sync with
      // what Airtable actually contains. Fire-and-forget — failures here
      // shouldn't block the rest of refresh.
      if (currentUser?.role === 'client') {
        listThread(uid, 'usr_002')
          .then((records) => setPrimaryThread((records || []).map((r) => ({
            id: r.id,
            threadId: r.fields?.threadId,
            senderId: r.fields?.senderId,
            receiverId: r.fields?.receiverId,
            senderRole: r.fields?.senderRole,
            receiverRole: r.fields?.receiverRole,
            message: r.fields?.message || '',
            createdAt: r.fields?.createdAt || r.createdTime,
            readAt: r.fields?.readAt,
          }))))
          .catch((e) => console.error('[AppContext] primary thread fetch failed', e));
      }
      // Only seed accounts get the demo starter data when their Airtable
      // tables are empty. Real users see empty states until they log
      // their own data.
      setMeals(m.length || !isSeed ? m : initialMeals.map((x) => ({ ...x, userId: uid })));
      setMealScans(scans);
      setMetrics(bm.length || !isSeed ? bm : initialMetrics.map((x) => ({ ...x, userId: uid })));
      setWorkoutHistory(wh.length || !isSeed ? wh : initialHistory.map((x) => ({ ...x, userId: uid })));
      setTrainerNotes(notes);
      // Same idea for the seed notifications — show "Coach Mike assigned a
      // workout" only on the demo seed account; new signups start with an
      // empty notifications list so the bell badge isn't lying.
      setNotifications(isSeed ? initialNotifications : []);

      // Profile reconciliation. The userId-based lookup misses when the
      // Users table doesn't have a userId column or the local id drifted
      // from the Airtable record's id. Fall back to email lookup so we
      // can still hydrate the canonical Airtable profile into currentUser.
      let resolvedProfile = profile;
      if (!resolvedProfile && currentUser?.email && isAirtableConfigured) {
        try {
          const rec = await findUserByEmail(currentUser.email);
          if (rec) {
            resolvedProfile = recordToProfile(rec);
            console.info('[AppContext] refresh profile reconciled via email', {
              email: currentUser.email,
              recordId: rec.id,
            });
          }
        } catch (e) {
          console.error('[AppContext] refresh email-fallback lookup failed', e);
        }
      }
      if (resolvedProfile) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...resolvedProfile };
          console.info('[auth] currentUser set', { id: next.id, source: 'refresh', airtableId: next.airtableId });
          return next;
        });
      }
    } catch (err) {
      console.error('[AppContext] refresh failed', err);
      setLastError(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, loadMealsFor, loadScansFor, loadMetricsFor, loadHistoryFor, loadNotesFor, loadProfileFor]);

  // Trainer-side: fetch a specific client's shared data on demand.
  const getClientData = useCallback(async (userId) => {
    const [m, scans, bm, wh, notes] = await Promise.all([
      loadMealsFor(userId),
      loadScansFor(userId),
      loadMetricsFor(userId),
      loadHistoryFor(userId),
      loadNotesFor(userId),
    ]);
    return { meals: m, mealScans: scans, metrics: bm, workoutHistory: wh, trainerNotes: notes };
  }, [loadMealsFor, loadScansFor, loadMetricsFor, loadHistoryFor, loadNotesFor]);

  // Initial load whenever the user changes.
  useEffect(() => {
    if (currentUser?.id) refresh(currentUser.id);
    else {
      setMeals([]); setMealScans([]); setMetrics([]); setWorkoutHistory([]); setTrainerNotes([]);
    }
  }, [currentUser?.id, refresh]);

  // ----- Auth -----
  // login() and signup() return synchronously for the seed-user fast path,
  // but login() is also `async` so callers that `await` it get the Airtable
  // lookup too. Existing call-sites that don't await still work — they just
  // see the seed-user result.
  //
  // MVP-grade auth: passwords for real signups aren't persisted to Airtable
  // (no `password` column). That means a real user stays logged in via
  // localStorage but cannot re-authenticate from a fresh device until we
  // store credentials properly. Documented in AIRTABLE_SETUP.md.
  async function login(email, password) {
    console.info('[auth] login attempt', { email });
    // 1) Seed demo accounts (alex@email.com / mike@fitpro.com). These are
    // intentional shortcuts for the Demo: Client / Demo: Trainer buttons.
    // Real users with arbitrary emails go straight to Airtable below.
    const seed = initialUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (seed) {
      console.info('[auth] seed user matched', { id: seed.id, role: seed.role });
      setCurrentUser(seed);
      console.info('[auth] currentUser set', { id: seed.id, source: 'seed-login' });
      ensureUserRecord(seed).catch((e) => console.error('[auth] Users sync failed', e));
      if (seed.role === 'client') {
        ensureTrainerClientLink({ trainerId: 'usr_002', userId: seed.id }).catch((e) =>
          console.error('[auth] TrainerClientLink sync failed', e)
        );
      }
      return { success: true, user: seed };
    }

    // 2) Real users: Airtable Users is the source of truth. We don't have a
    // password column in the MVP schema, so this is "sign in if your email
    // is registered" — see the AIRTABLE_SETUP.md auth note.
    if (isAirtableConfigured) {
      try {
        const rec = await findUserByEmail(email);
        if (rec) {
          const f = rec.fields || {};
          const restored = {
            id: f.userId || `usr_${Date.now()}`,
            name: f.name || email.split('@')[0],
            email: f.email || email,
            role: f.role || 'client',
            avatar: f.avatar || (f.name || email).slice(0, 2).toUpperCase(),
            airtableId: rec.id,
            streak: Number(f.streak) || 0,
            totalWorkouts: Number(f.totalWorkouts) || 0,
          };
          console.info('[auth] Airtable user restored', { id: restored.id, role: restored.role });
          setCurrentUser(restored);
          console.info('[auth] currentUser set', { id: restored.id, source: 'airtable-login', airtableId: restored.airtableId });
          if (restored.role === 'client') {
            ensureTrainerClientLink({ trainerId: 'usr_002', userId: restored.id }).catch((e) =>
              console.error('[auth] TrainerClientLink sync failed', e)
            );
          }
          return { success: true, user: restored };
        }
      } catch (e) {
        console.error('[auth] Airtable lookup failed', e);
      }
    }

    return { success: false, error: 'Invalid email or password' };
  }

  // Signup keeps a synchronous return signature so Auth.jsx can call it
  // without await (we promised "don't change UI"). The Airtable round-trip
  // runs in the background and reconciles currentUser when the canonical
  // Users record comes back — picking up the airtableId and any persisted
  // profile fields. If the Users table didn't have all our columns, the
  // CRITICAL log in createRecord still fires.
  function signup(name, email, password, role) {
    const exists = initialUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return { success: false, error: 'Email already in use' };
    const newUser = {
      id: `usr_${Date.now()}`,
      name, email, password, role,
      avatar: name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      streak: 0, totalWorkouts: 0,
    };
    console.info('[auth] signup', { id: newUser.id, email: newUser.email, role: newUser.role });
    // Reset all per-user state so the new account starts empty regardless
    // of who was signed in before. (refresh() also fills this in from
    // Airtable, but we wipe synchronously to avoid a flash of stale data.)
    setMeals([]);
    setMealScans([]);
    setMetrics([]);
    setWorkoutHistory([]);
    setTrainerNotes([]);
    setCurrentUser(newUser);
    console.info('[auth] currentUser set', { id: newUser.id, source: 'signup-local' });

    // Airtable round-trip in the background. When it lands, replace
    // currentUser with whatever Airtable considers canonical: the airtableId
    // for future writes, and (if Airtable already had a record for this
    // email) the existing userId so loadProfileFor lookups match.
    ensureUserRecord(newUser)
      .then((rec) => {
        if (!rec) {
          console.warn('[auth] signup → ensureUserRecord returned no record');
          return;
        }
        const f = rec.fields || {};
        const reconciled = {
          ...newUser,
          airtableId: rec.id,
          // If Airtable's record uses a different userId (existing user from
          // another session), trust Airtable. Otherwise keep our local id.
          id: f.userId || newUser.id,
          // Pull in any profile fields Airtable persisted.
          name: f.name || newUser.name,
          role: f.role || newUser.role,
          avatar: f.avatar || newUser.avatar,
          streak: Number(f.streak) || newUser.streak,
          totalWorkouts: Number(f.totalWorkouts) || newUser.totalWorkouts,
        };
        // Only patch currentUser if it's still this signup (user might have
        // logged out / switched accounts before the round-trip finished).
        setCurrentUser((prev) => prev?.email === reconciled.email ? reconciled : prev);
        console.info('[auth] signup success', {
          id: reconciled.id,
          airtableId: reconciled.airtableId,
          email: reconciled.email,
          role: reconciled.role,
        });
        console.info('[auth] currentUser set', { id: reconciled.id, source: 'signup-airtable', airtableId: reconciled.airtableId });
      })
      .catch((e) => console.error('[auth] signup → Users failed', e));

    if (newUser.role === 'client') {
      ensureTrainerClientLink({ trainerId: 'usr_002', userId: newUser.id }).catch((e) =>
        console.error('[auth] signup → TrainerClientLink failed', e)
      );
    }
    return { success: true, user: newUser };
  }

  function logout() {
    const prevId = currentUser?.id;
    console.info('[auth] logout', { id: prevId });
    // Clear in-memory state first so the next user's refresh starts blank.
    setCurrentUser(null);
    setMeals([]);
    setMealScans([]);
    setMetrics([]);
    setWorkoutHistory([]);
    setTrainerNotes([]);
    setLastError(null);
    localStorage.removeItem('fitbridge_user');
    // Drop any per-user localStorage fallback rows so the next account
    // can't see the previous account's offline-cached data.
    if (prevId) clearLocalFallbackForUser(prevId);
  }

  // Trainer-side helper: assign / unassign a client. Used when the trainer
  // explicitly takes on or pauses a client relationship. After linking we
  // bump connectionsTick so the derived clients list (below) picks up the
  // newly-active relationship and any consumer (ClientList, ClientDetail)
  // re-renders with the new entry instead of falling back to the seed
  // clients[0] (Alex).
  async function linkTrainerClient(clientId, status = 'active') {
    const trainerId = currentUser?.role === 'trainer' ? currentUser.id : 'usr_002';
    const res = await ensureTrainerClientLink({ trainerId, userId: clientId, status });
    bumpConnections();
    return res;
  }

  // Combine seed clients + clients derived from accepted connection
  // requests so the trainer's client list reflects the prototype's
  // signup → request → accept flow. We dedupe by id (seed wins on
  // conflict so the seed's status/avatar/etc are preserved) and
  // recompute whenever an accept lands (connectionsTick changes).
  //
  // BUGFIX: previously every page that did `clients.find(c => c.id ===
  // selectedId) || clients[0]` would silently fall back to Alex (seed
  // index 0) for any client that wasn't in the seed list — i.e. every
  // newly-connected client. Surfacing accepted clients here means the
  // find() actually succeeds and that fallback never fires.
  const clients = useMemo(() => {
    /* eslint-disable no-unused-vars */
    const _ = connectionsTick; // re-evaluate whenever accepts happen
    /* eslint-enable no-unused-vars */
    const accepted = listAllRequests().filter((r) => r.status === 'accepted');
    const seen = new Set(seedClients.map((c) => c.id));
    const fromConnections = [];
    for (const r of accepted) {
      if (!r.clientId || seen.has(r.clientId)) continue;
      seen.add(r.clientId);
      fromConnections.push({
        id: r.clientId,
        name: r.clientName || 'New client',
        avatar: (r.clientName || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase(),
        status: 'active',
        lastActive: 'Just connected',
        sessions: 0,                   // empty by default — real signup
        // Tag so the UI can flag these as "newly connected via prototype"
        // if it wants to. Not used yet — exposed for forward-compat.
        sourcedFrom: 'connection_request',
        gymName: r.gymName || '',
        connectedAt: r.respondedAt || r.requestedAt,
      });
    }
    return [...seedClients, ...fromConnections];
  }, [seedClients, connectionsTick]);

  // Merge-update profile + sync to Airtable Users.
  async function updateProfile(patch) {
    let next;
    setCurrentUser((prev) => {
      if (!prev) { next = prev; return prev; }
      next = { ...prev, ...patch };
      if (patch.name && !patch.avatar) {
        next.avatar = patch.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
      }
      return next;
    });
    if (!next?.id) return;
    try {
      await upsertByField(TABLES.users, 'userId', next.id, {
        ...profilePatch(next),
        updatedAt: nowIso(),
      });
    } catch (e) {
      console.warn('updateProfile remote sync failed', e);
    }
  }

  // ----- Mutations (write through to Airtable) -----

  // Add a meal. The trainer can also call this on behalf of a client by
  // passing meal.userId explicitly.
  async function addMeal(meal) {
    const uid = meal.userId || currentUser?.id;
    if (!uid) return;
    const normalized = { ...meal, date: toIsoDate(meal.date) };
    const tempId = `tmp_${Date.now()}`;
    const optimistic = { ...normalized, id: tempId, userId: uid, loggedAt: nowIso() };
    setMeals((prev) => [optimistic, ...prev]);
    try {
      const rec = await createRecord(TABLES.meals, mealToFields(normalized, uid));
      const saved = recordToMeal(rec);
      setMeals((prev) => [saved, ...prev.filter((m) => m.id !== tempId)]);
      return saved;
    } catch (e) {
      console.warn('addMeal failed', e);
    }
  }

  async function saveMealScan(scan) {
    const uid = scan.userId || currentUser?.id;
    if (!uid) return;
    const tempId = `tmp_${Date.now()}`;
    const optimistic = {
      ...scan,
      id: tempId,
      userId: uid,
      analyzedAt: scan.analyzedAt || nowIso(),
    };
    setMealScans((prev) => [optimistic, ...prev]);
    try {
      const rec = await createRecord(TABLES.scans, {
        userId: uid,
        label: scan.label || '',
        items: JSON.stringify(scan.items || []),
        calories: scan.calories || 0,
        protein: scan.protein || 0,
        carbs: scan.carbs || 0,
        fat: scan.fat || 0,
        transFat: scan.transFat || 0,
        confidence: scan.confidence || 0,
        mealType: scan.mealType || '',
        fileName: scan.fileName || '',
        analyzedAt: scan.analyzedAt || nowIso(),
        visibleToTrainer: scan.visibleToTrainer !== false,
      });
      const saved = recordToScan(rec);
      setMealScans((prev) => [saved, ...prev.filter((s) => s.id !== tempId)]);
      return saved;
    } catch (e) {
      console.warn('saveMealScan failed', e);
    }
  }

  async function addMetric(metric) {
    const uid = metric.userId || currentUser?.id;
    if (!uid) return;
    const isoDate = toIsoDate(metric.date);
    const tempId = `tmp_${Date.now()}`;
    setMetrics((prev) => [{ ...metric, date: isoDate, id: tempId, userId: uid }, ...prev]);
    try {
      const rec = await createRecord(TABLES.metrics, {
        userId: uid,
        date: isoDate,
        weight: metric.weight,
        bodyFat: metric.bodyFat,
        bmi: metric.bmi,
        loggedAt: nowIso(),
      });
      const saved = recordToMetric(rec);
      setMetrics((prev) => [saved, ...prev.filter((m) => m.id !== tempId)]);
    } catch (e) {
      console.warn('addMetric failed', e);
    }
  }

  // Generic workout log writer. Used for self-logged sessions, video
  // completion, and trainer-logged gym sessions (trainer passes userId,
  // trainerId, locationType, source).
  async function addWorkoutLog(log) {
    const uid = log.userId || currentUser?.id;
    if (!uid) return;
    const tempId = `tmp_${Date.now()}`;
    const optimistic = {
      ...log,
      id: tempId,
      userId: uid,
      date: toIsoDate(log.date),
      locationType: log.locationType || 'home',
      source: log.source || (currentUser?.role === 'trainer' ? 'trainer_logged' : 'self_logged'),
      visibleToClient: log.visibleToClient !== false,
      loggedAt: nowIso(),
    };
    setWorkoutHistory((prev) => [optimistic, ...prev]);
    // Skipped sessions still get logged (so the trainer can see them) but
    // they don't count toward streaks or total workouts. Only completed
    // sessions advance those stats.
    if (uid === currentUser?.id && optimistic.status !== 'skipped') {
      setCurrentUser((prev) =>
        prev ? { ...prev, totalWorkouts: (prev.totalWorkouts || 0) + 1, streak: (prev.streak || 0) + 1 } : prev
      );
    }
    try {
      const rec = await createRecord(TABLES.workoutLogs, {
        userId: uid,
        trainerId: log.trainerId || (currentUser?.role === 'trainer' ? currentUser.id : ''),
        workoutId: log.workoutId || '',
        title: log.title,
        date: toIsoDate(log.date),
        locationType: log.locationType || 'home',
        source: optimistic.source,
        exercises: Array.isArray(log.exercises) ? JSON.stringify(log.exercises) : (log.exercises || ''),
        duration: log.duration,
        calories: log.calories,
        status: log.status || 'completed',
        notes: log.notes || '',
        visibleToClient: optimistic.visibleToClient,
        loggedAt: nowIso(),
      });
      const saved = recordToWorkoutLog(rec);
      setWorkoutHistory((prev) => [saved, ...prev.filter((w) => w.id !== tempId)]);
      return saved;
    } catch (e) {
      console.warn('addWorkoutLog failed', e);
    }
  }

  async function addTrainerNote(note) {
    const tempId = `tmp_${Date.now()}`;
    const optimistic = {
      ...note,
      id: tempId,
      trainerId: note.trainerId || (currentUser?.role === 'trainer' ? currentUser.id : ''),
      createdAt: nowIso(),
    };
    setTrainerNotes((prev) => [optimistic, ...prev]);
    try {
      const rec = await createRecord(TABLES.trainerNotes, {
        trainerId: optimistic.trainerId,
        userId: note.userId,
        relatedType: note.relatedType || 'general',
        relatedRecordId: note.relatedRecordId || '',
        note: note.note,
        createdAt: nowIso(),
      });
      const saved = recordToNote(rec);
      setTrainerNotes((prev) => [saved, ...prev.filter((n) => n.id !== tempId)]);
      return saved;
    } catch (e) {
      console.warn('addTrainerNote failed', e);
    }
  }

  // ----- Messages (trainer ↔ client chat) -----
  // Threads are pulled on-demand rather than held in context state — chat
  // is a focused view, not a global concern.
  async function fetchThread(clientId, trainerId) {
    if (!clientId || !trainerId) return [];
    console.info('[airtable] fetch Messages for threadId', buildThreadId(clientId, trainerId));
    const records = await listThread(clientId, trainerId);
    return records
      .map((r) => ({
        id: r.id,
        threadId: r.fields?.threadId,
        clientId: r.fields?.clientId,
        trainerId: r.fields?.trainerId,
        senderId: r.fields?.senderId,
        receiverId: r.fields?.receiverId,
        senderRole: r.fields?.senderRole,
        receiverRole: r.fields?.receiverRole,
        message: r.fields?.message || '',
        createdAt: r.fields?.createdAt || r.createdTime,
        readAt: r.fields?.readAt,
      }))
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  async function sendMessage({ clientId, trainerId, senderRole, message }) {
    if (!clientId || !trainerId || !message?.trim() || !senderRole) return null;
    const rec = await sendMessageRecord({ clientId, trainerId, senderRole, message });
    if (!rec) return null;
    const saved = {
      id: rec.id,
      threadId: rec.fields?.threadId,
      clientId: rec.fields?.clientId,
      trainerId: rec.fields?.trainerId,
      senderId: rec.fields?.senderId,
      receiverId: rec.fields?.receiverId,
      senderRole: rec.fields?.senderRole,
      receiverRole: rec.fields?.receiverRole,
      message: rec.fields?.message || message.trim(),
      createdAt: rec.fields?.createdAt || nowIso(),
    };
    // Mirror into the primary-thread cache so the unread badge recomputes
    // even if the user is sending FROM the messages screen (then leaves
    // before refresh runs again). Outgoing messages from the current user
    // are inherently "read" — only inbound ones drive the unread count.
    if (currentUser?.role === 'client' && saved.threadId === buildThreadId(currentUser.id, 'usr_002')) {
      setPrimaryThread((prev) => [...prev, saved]);
    }
    return saved;
  }

  function createWorkout(workout) {
    const newWorkout = { ...workout, id: `wkt_${Date.now()}`, assignedClients: 0 };
    setWorkouts((prev) => [...prev, newWorkout]);
    return newWorkout;
  }

  function assignWorkout(workoutId) {
    setWorkouts((prev) =>
      prev.map((w) => w.id === workoutId ? { ...w, assignedClients: (w.assignedClients || 0) + 1 } : w)
    );
  }

  function markNotificationRead(id) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Marking all-read should also clear the synthetic message notification —
    // do that by marking incoming trainer messages as read too.
    markMessagesRead();
  }

  // Patch every unread inbound message to readAt=now. Runs against the
  // primary thread (client → coach Mike). Updates local state immediately
  // and persists to Airtable in the background; if the readAt column is
  // missing the field-drop fallback simply ignores the update (the local
  // state is still authoritative for the UI).
  async function markMessagesRead() {
    if (!currentUser?.id || currentUser.role !== 'client') return;
    const now = nowIso();
    let touched = false;
    setPrimaryThread((prev) => {
      const next = prev.map((m) => {
        if (m.senderRole === 'trainer' && !m.readAt) {
          touched = true;
          // PATCH each in the background. We don't block the UI on this.
          if (typeof m.id === 'string' && m.id.startsWith('rec')) {
            updateRecord(TABLES.messages, m.id, { readAt: now })
              .catch((e) => console.error('[messages] mark read failed', e));
          }
          return { ...m, readAt: now };
        }
        return m;
      });
      return next;
    });
    if (touched) console.info('[messages] marked trainer messages read');
  }

  // ---- Derived notification feed ----
  //
  // Combines the seed/in-memory notifications with a synthetic
  // "New message from your trainer" entry when there are unread inbound
  // messages, and tags every notification with a `link` field so clicking
  // it can navigate to the right screen instead of just mark-as-read.
  const NOTIFICATION_LINKS = {
    workout_assigned: '/user/workout',
    goal: '/user/metrics',
    reminder: '/user/workout',
    note: '/user/coach',
    video: '/user/videos',
    message: '/user/messages',
  };

  const unreadMessageCount = primaryThread.filter(
    (m) => m.senderRole === 'trainer' && !m.readAt,
  ).length;

  // Decorate the seed list with link fields, then prepend a synthetic
  // unread-messages entry when applicable. The synthetic entry is keyed
  // off the unread count so it disappears once messages are marked read.
  const decoratedNotifications = notifications.map((n) => ({
    ...n,
    link: n.link || NOTIFICATION_LINKS[n.type] || null,
  }));

  const derivedNotifications = unreadMessageCount > 0
    ? [
        {
          id: 'msg-unread-synthetic',
          type: 'message',
          title:
            unreadMessageCount === 1
              ? 'New message from your trainer'
              : `${unreadMessageCount} new messages from your trainer`,
          time: 'Just now',
          read: false,
          link: '/user/messages',
        },
        ...decoratedNotifications,
      ]
    : decoratedNotifications;

  const unreadCount = derivedNotifications.filter((n) => !n.read).length;

  const today = todayIso();
  const todayMeals = meals.filter((m) => m.date === today || m.date === 'Today');
  const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

  // Today's gym session, if any. Drives the home-workout fallback UI.
  const todaysGymSession = workoutHistory.find(
    (w) => (w.date === today || w.date === 'Today') && w.locationType === 'gym'
  );

  return (
    <AppContext.Provider value={{
      currentUser,
      login,
      signup,
      logout,
      updateProfile,
      workouts,
      clients,
      workoutHistory,
      meals,
      mealScans,
      metrics,
      trainerNotes,
      // `notifications` exposed downstream is the *derived* feed — link-decorated
      // and including synthetic message entries — so consumers don't need to
      // know the difference.
      notifications: derivedNotifications,
      unreadCount,
      unreadMessageCount,
      markMessagesRead,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      todaysGymSession,
      loading,
      lastError,
      isAirtableConfigured,
      addMeal,
      saveMealScan,
      addMetric,
      addWorkoutLog,
      addTrainerNote,
      linkTrainerClient,
      createWorkout,
      assignWorkout,
      markNotificationRead,
      markAllNotificationsRead,
      refresh,
      getClientData,
      fetchThread,
      sendMessage,
      buildThreadId,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
