export const users = [
  { id: 'usr_001', name: 'Alex Lee', email: 'alex@email.com', password: 'password', role: 'client', avatar: 'AL', streak: 5, totalWorkouts: 48 },
  { id: 'usr_002', name: 'Coach Mike K.', email: 'mike@fitpro.com', password: 'password', role: 'trainer', avatar: 'MK', clients: 14, rating: 4.9 },
];

export const workouts = [
  { id: 'wkt_001', title: 'Upper Body Strength', category: 'Strength', difficulty: 'Intermediate', duration: 45, exercises: ['Bench Press 4×10', 'Overhead Press 3×10', 'Tricep Dips 3×12'], assignedClients: 3 },
  { id: 'wkt_002', title: 'HIIT Cardio Blast', category: 'Cardio', difficulty: 'Advanced', duration: 20, exercises: ['Burpees 5×20', 'Mountain Climbers 5×30', 'Jump Squats 4×15'], assignedClients: 1 },
  { id: 'wkt_003', title: 'Morning Yoga Flow', category: 'Flexibility', difficulty: 'Beginner', duration: 30, exercises: ['Sun Salutation ×5', 'Warrior I & II', 'Hip Openers'], assignedClients: 2 },
  { id: 'wkt_004', title: 'Leg Day Fundamentals', category: 'Strength', difficulty: 'Intermediate', duration: 50, exercises: ['Back Squat 5×5', 'Romanian Deadlift 4×8', 'Walking Lunges 3×12'], assignedClients: 2 },
  { id: 'wkt_005', title: 'Core Stability', category: 'Core', difficulty: 'Beginner', duration: 25, exercises: ['Plank Hold 3×60s', 'Dead Bug 3×10', 'Pallof Press 3×12'], assignedClients: 4 },
];

export const clients = [
  { id: 'usr_001', name: 'Alex Lee', avatar: 'AL', status: 'active', lastActive: 'Today', sessions: 48 },
  { id: 'usr_003', name: 'Jordan Kim', avatar: 'JK', status: 'active', lastActive: 'Yesterday', sessions: 32 },
  { id: 'usr_004', name: 'Sam Rivera', avatar: 'SR', status: 'at-risk', lastActive: '5 days ago', sessions: 18 },
  { id: 'usr_005', name: 'Morgan Bell', avatar: 'MB', status: 'at-risk', lastActive: '7 days ago', sessions: 12 },
  { id: 'usr_006', name: 'Casey T.', avatar: 'CT', status: 'inactive', lastActive: '2 weeks ago', sessions: 6 },
  { id: 'usr_007', name: 'Riley Cruz', avatar: 'RC', status: 'active', lastActive: 'Today', sessions: 55 },
];

export const workoutHistory = [
  { id: 'log_001', workoutId: 'wkt_001', title: 'Upper Body Strength', date: 'Mon Apr 6', duration: 48, calories: 320, status: 'completed' },
  { id: 'log_002', workoutId: 'wkt_003', title: 'Core & Cardio', date: 'Sat Apr 4', duration: 30, calories: 210, status: 'completed' },
  { id: 'log_003', workoutId: 'wkt_004', title: 'Lower Body Power', date: 'Thu Apr 2', duration: 55, calories: 410, status: 'completed' },
  { id: 'log_004', workoutId: 'wkt_002', title: 'HIIT Circuit', date: 'Tue Mar 31', duration: 25, calories: 280, status: 'completed' },
];

export const meals = [
  { id: 'ml_001', date: 'Today', type: 'Breakfast', calories: 520, protein: 38, carbs: 55, fat: 14, items: ['Oatmeal (1 cup)', 'Whey Protein Shake', 'Banana'] },
  { id: 'ml_002', date: 'Today', type: 'Lunch', calories: 680, protein: 45, carbs: 72, fat: 18, items: ['Grilled Chicken Breast', 'Brown Rice', 'Steamed Broccoli'] },
  { id: 'ml_003', date: 'Today', type: 'Dinner', calories: 750, protein: 52, carbs: 80, fat: 22, items: ['Salmon Fillet', 'Sweet Potato', 'Asparagus'] },
  { id: 'ml_004', date: 'Today', type: 'Snacks', calories: 250, protein: 12, carbs: 30, fat: 8, items: ['Greek Yogurt', 'Almonds'] },
];

export const bodyMetrics = [
  { date: 'Apr 7', weight: 182, bodyFat: 18, bmi: 24.1 },
  { date: 'Mar 28', weight: 184, bodyFat: 18.5, bmi: 24.3 },
  { date: 'Mar 14', weight: 186, bodyFat: 19, bmi: 24.6 },
  { date: 'Mar 1', weight: 188, bodyFat: 19.5, bmi: 24.8 },
];

export const notifications = [
  { id: 'n1', type: 'workout_assigned', title: 'Coach Mike assigned a new workout', time: '2 min ago', read: false },
  { id: 'n2', type: 'goal', title: 'Your weight goal is 85% reached!', time: '15 min ago', read: false },
  { id: 'n3', type: 'reminder', title: 'Reminder: Leg Day at 3:00 PM today', time: '1 hr ago', read: false },
  { id: 'n4', type: 'note', title: 'Coach Mike left a note on your session', time: 'Yesterday', read: true },
  { id: 'n5', type: 'video', title: 'New video uploaded: Mobility Routine', time: '2 days ago', read: true },
];
