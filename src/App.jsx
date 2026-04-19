import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import PhoneShell from './components/PhoneShell';

// Pages
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Auth from './pages/Auth';

// User pages
import UserDashboard from './pages/user/Dashboard';
import ActiveWorkout from './pages/user/ActiveWorkout';
import WorkoutHistory from './pages/user/WorkoutHistory';
import VideoLibrary from './pages/user/VideoLibrary';
import NutritionLog from './pages/user/NutritionLog';
import AddMealEntry from './pages/user/AddMealEntry';
import PhotoScan from './pages/user/PhotoScan';
import BodyMetrics from './pages/user/BodyMetrics';
import UserProfile from './pages/user/UserProfile';
import Notifications from './pages/user/Notifications';
import Messages from './pages/user/Messages';

// Trainer pages
import TrainerDashboard from './pages/trainer/Dashboard';
import ClientList from './pages/trainer/ClientList';
import ClientDetail from './pages/trainer/ClientDetail';
import Programs from './pages/trainer/Programs';
import CreateWorkout from './pages/trainer/CreateWorkout';
import AssignWorkout from './pages/trainer/AssignWorkout';
import VideoUpload from './pages/trainer/VideoUpload';
import TrainerProfile from './pages/trainer/TrainerProfile';

function ProtectedRoute({ children, requiredRole }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to={currentUser.role === 'trainer' ? '/trainer/dashboard' : '/user/dashboard'} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <PhoneShell>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth" element={<Auth />} />

        {/* User routes */}
        <Route path="/user/dashboard" element={<ProtectedRoute requiredRole="client"><UserDashboard /></ProtectedRoute>} />
        <Route path="/user/workout" element={<ProtectedRoute requiredRole="client"><WorkoutHistory /></ProtectedRoute>} />
        <Route path="/user/workout/:id" element={<ProtectedRoute requiredRole="client"><ActiveWorkout /></ProtectedRoute>} />
        <Route path="/user/videos" element={<ProtectedRoute requiredRole="client"><VideoLibrary /></ProtectedRoute>} />
        <Route path="/user/nutrition" element={<ProtectedRoute requiredRole="client"><NutritionLog /></ProtectedRoute>} />
        <Route path="/user/nutrition/add" element={<ProtectedRoute requiredRole="client"><AddMealEntry /></ProtectedRoute>} />
        <Route path="/user/nutrition/scan" element={<ProtectedRoute requiredRole="client"><PhotoScan /></ProtectedRoute>} />
        <Route path="/user/meal/scan" element={<ProtectedRoute requiredRole="client"><PhotoScan /></ProtectedRoute>} />
        <Route path="/user/metrics" element={<ProtectedRoute requiredRole="client"><BodyMetrics /></ProtectedRoute>} />
        <Route path="/user/profile" element={<ProtectedRoute requiredRole="client"><UserProfile /></ProtectedRoute>} />
        <Route path="/user/notifications" element={<ProtectedRoute requiredRole="client"><Notifications /></ProtectedRoute>} />
        <Route path="/user/messages" element={<ProtectedRoute requiredRole="client"><Messages /></ProtectedRoute>} />

        {/* Trainer routes */}
        <Route path="/trainer/dashboard" element={<ProtectedRoute requiredRole="trainer"><TrainerDashboard /></ProtectedRoute>} />
        <Route path="/trainer/clients" element={<ProtectedRoute requiredRole="trainer"><ClientList /></ProtectedRoute>} />
        <Route path="/trainer/clients/:id" element={<ProtectedRoute requiredRole="trainer"><ClientDetail /></ProtectedRoute>} />
        <Route path="/trainer/programs" element={<ProtectedRoute requiredRole="trainer"><Programs /></ProtectedRoute>} />
        <Route path="/trainer/programs/create" element={<ProtectedRoute requiredRole="trainer"><CreateWorkout /></ProtectedRoute>} />
        <Route path="/trainer/programs/assign" element={<ProtectedRoute requiredRole="trainer"><AssignWorkout /></ProtectedRoute>} />
        <Route path="/trainer/upload" element={<ProtectedRoute requiredRole="trainer"><VideoUpload /></ProtectedRoute>} />
        <Route path="/trainer/profile" element={<ProtectedRoute requiredRole="trainer"><TrainerProfile /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PhoneShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
