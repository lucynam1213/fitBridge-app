import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import PhoneShell from './components/PhoneShell';
import { isClientConnected, hasPendingRequestForClient } from './services/connections';

// Pages
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Auth from './pages/Auth';
import Privacy from './pages/Privacy';
import HelpSupport from './pages/HelpSupport';

// User pages
import UserDashboard from './pages/user/Dashboard';
import ActiveWorkout from './pages/user/ActiveWorkout';
import WorkoutHistory from './pages/user/WorkoutHistory';
import WorkoutDetail from './pages/user/WorkoutDetail';
import VideoLibrary from './pages/user/VideoLibrary';
import VideoWorkout from './pages/user/VideoWorkout';
import NutritionLog from './pages/user/NutritionLog';
import AddMealEntry from './pages/user/AddMealEntry';
import FoodSearch from './pages/user/FoodSearch';
import FoodDetail from './pages/user/FoodDetail';
import MealDetail from './pages/user/MealDetail';
import PhotoScan from './pages/user/PhotoScan';
import BodyMetrics from './pages/user/BodyMetrics';
import UserProfile from './pages/user/UserProfile';
import EditProfile from './pages/user/EditProfile';
import CoachProfile from './pages/user/CoachProfile';
import FindGym from './pages/user/FindGym';
import FindTrainer from './pages/user/FindTrainer';
import RequestSent from './pages/user/RequestSent';
import Schedule from './pages/user/Schedule';
import Notifications from './pages/user/Notifications';
import Messages from './pages/user/Messages';
import ConnectionPending from './pages/user/ConnectionPending';

// Trainer pages
import TrainerDashboard from './pages/trainer/Dashboard';
import ClientList from './pages/trainer/ClientList';
import ClientDetail from './pages/trainer/ClientDetail';
import AddGymWorkout from './pages/trainer/AddGymWorkout';
import SelectClientForLog from './pages/trainer/SelectClientForLog';
import ScannedMealsReview from './pages/trainer/ScannedMealsReview';
import Programs from './pages/trainer/Programs';
import CreateWorkout from './pages/trainer/CreateWorkout';
import AssignWorkout from './pages/trainer/AssignWorkout';
import VideoUpload from './pages/trainer/VideoUpload';
import TrainerProfile from './pages/trainer/TrainerProfile';
import TrainerConversation from './pages/trainer/TrainerConversation';
import PendingRequests from './pages/trainer/PendingRequests';
import TrainerSchedule from './pages/trainer/TrainerSchedule';

function ProtectedRoute({ children, requiredRole }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to={currentUser.role === 'trainer' ? '/trainer/dashboard' : '/user/dashboard'} replace />;
  }
  return children;
}

// Client-side gate. Wraps the routes that need an active trainer
// connection — anything trainer-aware (dashboard, workouts, nutrition,
// metrics, messages) sits behind this. Clients without an accepted
// connection request get pushed into the find-a-gym flow; ones with a
// pending request see the holding screen. The connection / onboarding
// pages themselves are NOT wrapped — we don't want the gate to bounce
// the user out of the very flow that resolves it.
function ClientRoute({ children }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (currentUser.role !== 'client') {
    return <Navigate to="/trainer/dashboard" replace />;
  }
  if (!isClientConnected(currentUser.id)) {
    if (hasPendingRequestForClient(currentUser.id)) {
      return <Navigate to="/connect/pending" replace />;
    }
    return <Navigate to="/connect/gym" replace />;
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

        {/* Shared routes (accessible to both client and trainer) */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/help" element={<HelpSupport />} />

        {/* User routes — anything that depends on an active trainer
            relationship sits behind <ClientRoute>, which redirects
            unconnected clients into the find-a-gym flow. The connection
            flow itself + the editable profile + the pending-state screen
            stay on plain <ProtectedRoute requiredRole="client"> so the
            gate can't bounce the user out of the screens that resolve it. */}
        <Route path="/user/dashboard" element={<ClientRoute><UserDashboard /></ClientRoute>} />
        <Route path="/user/workout" element={<ClientRoute><WorkoutHistory /></ClientRoute>} />
        <Route path="/user/workout/:id" element={<ClientRoute><ActiveWorkout /></ClientRoute>} />
        <Route path="/user/workout/log/:id" element={<ClientRoute><WorkoutDetail /></ClientRoute>} />
        <Route path="/user/videos" element={<ClientRoute><VideoLibrary /></ClientRoute>} />
        <Route path="/user/video/:id" element={<ClientRoute><VideoWorkout /></ClientRoute>} />
        <Route path="/user/nutrition" element={<ClientRoute><NutritionLog /></ClientRoute>} />
        <Route path="/user/nutrition/add" element={<ClientRoute><AddMealEntry /></ClientRoute>} />
        <Route path="/user/nutrition/search" element={<ClientRoute><FoodSearch /></ClientRoute>} />
        <Route path="/user/nutrition/food" element={<ClientRoute><FoodDetail /></ClientRoute>} />
        <Route path="/user/nutrition/meal/:id" element={<ClientRoute><MealDetail /></ClientRoute>} />
        <Route path="/user/nutrition/scan" element={<ClientRoute><PhotoScan /></ClientRoute>} />
        <Route path="/user/meal/scan" element={<ClientRoute><PhotoScan /></ClientRoute>} />
        <Route path="/user/metrics" element={<ClientRoute><BodyMetrics /></ClientRoute>} />
        <Route path="/user/profile" element={<ProtectedRoute requiredRole="client"><UserProfile /></ProtectedRoute>} />
        <Route path="/user/profile/edit" element={<ProtectedRoute requiredRole="client"><EditProfile /></ProtectedRoute>} />
        <Route path="/user/coach" element={<ClientRoute><CoachProfile /></ClientRoute>} />
        <Route path="/user/schedule" element={<ClientRoute><Schedule /></ClientRoute>} />
        {/* Trainer-client connection flow (Find Gym → Find Trainer → Request Sent → Pending) */}
        <Route path="/connect/gym" element={<ProtectedRoute requiredRole="client"><FindGym /></ProtectedRoute>} />
        <Route path="/connect/gym/:gymId/trainers" element={<ProtectedRoute requiredRole="client"><FindTrainer /></ProtectedRoute>} />
        <Route path="/connect/sent" element={<ProtectedRoute requiredRole="client"><RequestSent /></ProtectedRoute>} />
        <Route path="/connect/pending" element={<ProtectedRoute requiredRole="client"><ConnectionPending /></ProtectedRoute>} />
        <Route path="/user/notifications" element={<ClientRoute><Notifications /></ClientRoute>} />
        <Route path="/user/messages" element={<ClientRoute><Messages /></ClientRoute>} />

        {/* Trainer routes */}
        <Route path="/trainer/dashboard" element={<ProtectedRoute requiredRole="trainer"><TrainerDashboard /></ProtectedRoute>} />
        <Route path="/trainer/clients" element={<ProtectedRoute requiredRole="trainer"><ClientList /></ProtectedRoute>} />
        <Route path="/trainer/clients/:id" element={<ProtectedRoute requiredRole="trainer"><ClientDetail /></ProtectedRoute>} />
        <Route path="/trainer/log-gym/select" element={<ProtectedRoute requiredRole="trainer"><SelectClientForLog /></ProtectedRoute>} />
        <Route path="/trainer/clients/:id/log-gym" element={<ProtectedRoute requiredRole="trainer"><AddGymWorkout /></ProtectedRoute>} />
        <Route path="/trainer/clients/:id/scans" element={<ProtectedRoute requiredRole="trainer"><ScannedMealsReview /></ProtectedRoute>} />
        <Route path="/trainer/clients/:id/messages" element={<ProtectedRoute requiredRole="trainer"><TrainerConversation /></ProtectedRoute>} />
        <Route path="/trainer/requests" element={<ProtectedRoute requiredRole="trainer"><PendingRequests /></ProtectedRoute>} />
        <Route path="/trainer/schedule" element={<ProtectedRoute requiredRole="trainer"><TrainerSchedule /></ProtectedRoute>} />
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
