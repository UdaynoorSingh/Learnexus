import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExplorerPage from './pages/ExplorerPage';
import TopicPage from './pages/TopicPage';
import UploadPage from './pages/UploadPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import VideoLearnPage from './pages/VideoLearnPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
            <Route path="/topic/:topicId" element={<TopicPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/video-learn" element={<VideoLearnPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin', 'superadmin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
