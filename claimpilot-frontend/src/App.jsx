import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadClaim from './pages/UploadClaim';
import ClaimDetails from './pages/ClaimDetails';
import VoiceDocument from './pages/VoiceDocument';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
};

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex min-h-[calc(100vh-72px)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

const AppContent = () => {
  const location = useLocation();
  const dashboardPaths = ['/dashboard', '/upload', '/claims', '/voice-document'];
  const isDashboardRoute = dashboardPaths.some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UploadClaim />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/claims/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ClaimDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/voice-document"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <VoiceDocument />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
