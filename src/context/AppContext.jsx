import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  createRecord, listRecords, upsertByField, eqUser, TABLES, isAirtableConfigured,
  ensureUserRecord, ensureTrainerClientLink, listThread, sendMessageRecord,
  buildThreadId,
} from '../services/airtable';
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
  const [notifications, setNotifications] = useState(initialNotifications);
  const [clients] = useState(initialClients);
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
    const records = await listRecords(TABLES.meals, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'loggedAt', direction: 'desc' }],
    });
    return records.map(recordToMeal);
  }, []);

  const loadScansFor = useCallback(async (userId) => {
    if (!userId) return [];
    const records = await listRecords(TABLES.scans, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'analyzedAt', direction: 'desc' }],
    });
    return records.map(recordToScan);
  }, []);

  const loadMetricsFor = useCallback(async (userId) => {
    if (!userId) return [];
    const records = await listRecords(TABLES.metrics, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'loggedAt', direction: 'desc' }],
    });
    return records.map(recordToMetric);
  }, []);

  const loadHistoryFor = useCallback(async (userId) => {
    if (!userId) return [];
    const records = await listRecords(TABLES.workoutLogs, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'loggedAt', direction: 'desc' }],
    });
    return records.map(recordToWorkoutLog);
  }, []);

  const loadNotesFor = useCallback(async (userId) => {
    if (!userId) return [];
    const records = await listRecords(TABLES.trainerNotes, {
      filterByFormula: eqUser(userId),
      sort: [{ field: 'createdAt', direction: 'desc' }],
    });
    return records.map(recordToNote);
  }, []);

  // Fetch the single Users-table record for this user, if one exists.
  const loadProfileFor = useCallback(async (userId) => {
    if (!userId) return null;
    const records = await listRecords(TABLES.users, {
      filterByFormula: eqUser(userId),
      maxRecords: 1,
    });
    return records.length ? recordToProfile(records[0]) : null;
  }, []);

  // Refresh all data for the signed-in user, including profile overrides.
  const refresh = useCallback(async (userId) => {
    const uid = userId || currentUser?.id;
    if (!uid) return;
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
      setMeals(m.length ? m : initialMeals.map((x) => ({ ...x, userId: uid })));
      setMealScans(scans);
      setMetrics(bm.length ? bm : initialMetrics.map((x) => ({ ...x, userId: uid })));
      setWorkoutHistory(wh.length ? wh : initialHistory.map((x) => ({ ...x, userId: uid })));
      setTrainerNotes(notes);
      if (profile) {
        setCurrentUser((prev) => prev ? { ...prev, ...profile } : prev);
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
  // Both login and signup are synchronous (return { success, user, error })
  // so existing call-sites in Auth.jsx don't need to await. Airtable
  // round-trips run as fire-and-forget side effects so the UX stays instant
  // and any persistence error is logged loudly to the console.
  function login(email, password) {
    const user = initialUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (user) {
      setCurrentUser(user);
      // Round-trip via Airtable: ensure the Users record exists so trainer
      // queries can find this client. Also auto-create a TrainerClientLink
      // for clients to their default coach (usr_002 — Coach Mike) so the
      // trainer-side dashboard surfaces real client activity.
      ensureUserRecord(user).catch((e) => console.error('[auth] Users sync failed', e));
      if (user.role === 'client') {
        ensureTrainerClientLink({ trainerId: 'usr_002', userId: user.id }).catch((e) =>
          console.error('[auth] TrainerClientLink sync failed', e)
        );
      }
      return { success: true, user };
    }
    return { success: false, error: 'Invalid email or password' };
  }

  function signup(name, email, password, role) {
    const exists = initialUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return { success: false, error: 'Email already in use' };
    const newUser = {
      id: `usr_${Date.now()}`,
      name, email, password, role,
      avatar: name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      streak: 0, totalWorkouts: 0,
    };
    setCurrentUser(newUser);
    // Persist the new account to Airtable in the background. If Airtable is
    // unreachable the local user still works; the console will show why.
    ensureUserRecord(newUser).catch((e) => console.error('[auth] signup → Users failed', e));
    if (newUser.role === 'client') {
      ensureTrainerClientLink({ trainerId: 'usr_002', userId: newUser.id }).catch((e) =>
        console.error('[auth] signup → TrainerClientLink failed', e)
      );
    }
    return { success: true, user: newUser };
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem('fitbridge_user');
  }

  // Trainer-side helper: assign / unassign a client. Used when the trainer
  // explicitly takes on or pauses a client relationship.
  async function linkTrainerClient(clientId, status = 'active') {
    const trainerId = currentUser?.role === 'trainer' ? currentUser.id : 'usr_002';
    return ensureTrainerClientLink({ trainerId, userId: clientId, status });
  }

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
    if (uid === currentUser?.id) {
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
    return {
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
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

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
      notifications,
      unreadCount,
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
