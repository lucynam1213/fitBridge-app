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
  createRecord, listRecords, eqUser, TABLES, isAirtableConfigured,
} from '../services/airtable';

const AppContext = createContext(null);

// Map Airtable record -> in-app meal shape.
function recordToMeal(rec) {
  const f = rec.fields || {};
  let items = f.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = items.split(',').map((s) => s.trim()); }
  }
  return {
    id: rec.id,
    userId: f.userId,
    date: f.date || 'Today',
    type: f.type || 'Snacks',
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fat: Number(f.fat) || 0,
    items: Array.isArray(items) ? items : [],
    source: f.source || 'manual',
    loggedAt: f.loggedAt || rec.createdTime,
  };
}

function mealToFields(meal, userId) {
  return {
    userId,
    date: meal.date || 'Today',
    type: meal.type,
    calories: Number(meal.calories) || 0,
    protein: Number(meal.protein) || 0,
    carbs: Number(meal.carbs) || 0,
    fat: Number(meal.fat) || 0,
    items: JSON.stringify(meal.items || []),
    source: meal.source || 'manual',
    loggedAt: new Date().toISOString(),
  };
}

function recordToMetric(rec) {
  const f = rec.fields || {};
  return {
    id: rec.id,
    userId: f.userId,
    date: f.date,
    weight: Number(f.weight) || 0,
    bodyFat: Number(f.bodyFat) || 0,
    bmi: Number(f.bmi) || 0,
  };
}

function recordToWorkoutLog(rec) {
  const f = rec.fields || {};
  return {
    id: rec.id,
    userId: f.userId,
    workoutId: f.workoutId,
    title: f.title,
    date: f.date,
    duration: Number(f.duration) || 0,
    calories: Number(f.calories) || 0,
    status: f.status || 'completed',
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
  const [metrics, setMetrics] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [clients] = useState(initialClients);
  const [loading, setLoading] = useState(false);

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

  // Refresh all data for the signed-in user.
  const refresh = useCallback(async (userId) => {
    const uid = userId || currentUser?.id;
    if (!uid) return;
    setLoading(true);
    try {
      const [m, bm, wh] = await Promise.all([
        loadMealsFor(uid),
        loadMetricsFor(uid),
        loadHistoryFor(uid),
      ]);
      setMeals(m.length ? m : initialMeals.map((x) => ({ ...x, userId: uid })));
      setMetrics(bm.length ? bm : initialMetrics.map((x) => ({ ...x, userId: uid })));
      setWorkoutHistory(wh.length ? wh : initialHistory.map((x) => ({ ...x, userId: uid })));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, loadMealsFor, loadMetricsFor, loadHistoryFor]);

  // Trainer-side: fetch a specific client's shared data on demand.
  const getClientData = useCallback(async (userId) => {
    const [m, bm, wh] = await Promise.all([
      loadMealsFor(userId),
      loadMetricsFor(userId),
      loadHistoryFor(userId),
    ]);
    return { meals: m, metrics: bm, workoutHistory: wh };
  }, [loadMealsFor, loadMetricsFor, loadHistoryFor]);

  // Initial load whenever the user changes.
  useEffect(() => {
    if (currentUser?.id) refresh(currentUser.id);
    else {
      setMeals([]); setMetrics([]); setWorkoutHistory([]);
    }
  }, [currentUser?.id, refresh]);

  // ----- Auth (still mock-credentialed for the demo) -----
  function login(email, password) {
    const user = initialUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (user) { setCurrentUser(user); return { success: true, user }; }
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
    return { success: true, user: newUser };
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem('fitbridge_user');
  }

  // ----- Mutations (write through to Airtable) -----
  async function addMeal(meal) {
    const uid = currentUser?.id;
    if (!uid) return;
    // Optimistic UI insert.
    const tempId = `tmp_${Date.now()}`;
    const optimistic = { ...meal, id: tempId, userId: uid, loggedAt: new Date().toISOString() };
    setMeals((prev) => [optimistic, ...prev]);
    try {
      const rec = await createRecord(TABLES.meals, mealToFields(meal, uid));
      const saved = recordToMeal(rec);
      setMeals((prev) => [saved, ...prev.filter((m) => m.id !== tempId)]);
      return saved;
    } catch (e) {
      console.warn('addMeal failed', e);
    }
  }

  async function saveMealScan(scan) {
    const uid = currentUser?.id;
    if (!uid) return;
    try {
      await createRecord(TABLES.scans, {
        userId: uid,
        label: scan.label || '',
        items: JSON.stringify(scan.items || []),
        calories: scan.calories || 0,
        protein: scan.protein || 0,
        carbs: scan.carbs || 0,
        fat: scan.fat || 0,
        confidence: scan.confidence || 0,
        mealType: scan.mealType || '',
        fileName: scan.fileName || '',
        analyzedAt: scan.analyzedAt || new Date().toISOString(),
      });
    } catch (e) {
      console.warn('saveMealScan failed', e);
    }
  }

  async function addMetric(metric) {
    const uid = currentUser?.id;
    if (!uid) return;
    const tempId = `tmp_${Date.now()}`;
    setMetrics((prev) => [{ ...metric, id: tempId, userId: uid }, ...prev]);
    try {
      const rec = await createRecord(TABLES.metrics, {
        userId: uid,
        date: metric.date,
        weight: metric.weight,
        bodyFat: metric.bodyFat,
        bmi: metric.bmi,
        loggedAt: new Date().toISOString(),
      });
      const saved = recordToMetric(rec);
      setMetrics((prev) => [saved, ...prev.filter((m) => m.id !== tempId)]);
    } catch (e) {
      console.warn('addMetric failed', e);
    }
  }

  async function addWorkoutLog(log) {
    const uid = currentUser?.id;
    if (!uid) return;
    const tempId = `tmp_${Date.now()}`;
    setWorkoutHistory((prev) => [{ ...log, id: tempId, userId: uid }, ...prev]);
    setCurrentUser((prev) =>
      prev ? { ...prev, totalWorkouts: (prev.totalWorkouts || 0) + 1, streak: (prev.streak || 0) + 1 } : prev
    );
    try {
      const rec = await createRecord(TABLES.workoutLogs, {
        userId: uid,
        workoutId: log.workoutId,
        title: log.title,
        date: log.date,
        duration: log.duration,
        calories: log.calories,
        status: log.status || 'completed',
        loggedAt: new Date().toISOString(),
      });
      const saved = recordToWorkoutLog(rec);
      setWorkoutHistory((prev) => [saved, ...prev.filter((w) => w.id !== tempId)]);
    } catch (e) {
      console.warn('addWorkoutLog failed', e);
    }
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

  const todayMeals = meals.filter((m) => m.date === 'Today');
  const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

  return (
    <AppContext.Provider value={{
      currentUser,
      login,
      signup,
      logout,
      workouts,
      clients,
      workoutHistory,
      meals,
      metrics,
      notifications,
      unreadCount,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      loading,
      isAirtableConfigured,
      addMeal,
      saveMealScan,
      addMetric,
      addWorkoutLog,
      createWorkout,
      assignWorkout,
      markNotificationRead,
      markAllNotificationsRead,
      refresh,
      getClientData,
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
