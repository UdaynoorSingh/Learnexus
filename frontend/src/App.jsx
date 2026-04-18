import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExplorerPage from './pages/ExplorerPage';
import KnowledgeGraphPage from './pages/KnowledgeGraphPage';
import TopicPage from './pages/TopicPage';
import UploadPage from './pages/UploadPage';
import AdminPage from './pages/AdminPage';
import AdminAuthGate from './components/admin/AdminAuthGate';
import ProfilePage from './pages/ProfilePage';
import BookmarkedPostsPage from './pages/BookmarkedPostsPage';
import VideoLearnPage from './pages/VideoLearnPage';
import NexusBoard from './pages/NexusBoard';
import NexusLibrary from './pages/NexusLibrary';
import ChallengesPage from './pages/ChallengesPage';
import AiTutorPage from './pages/AiTutorPage';
import BrutalistBackdrop from './components/ui/BrutalistBackdrop';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            element={
              <>
                <div className="noise-overlay" />
                <BrutalistBackdrop bubbleOpacity={0.75} />
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              </>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
            <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/topic/:topicId" element={<TopicPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/video-learn" element={<VideoLearnPage />} />
            <Route path="/ai-tutor" element={<AiTutorPage />} />
            <Route path="/nexus-board" element={<NexusBoard />} />
            <Route path="/nexus-library" element={<NexusLibrary />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/bookmarks" element={<BookmarkedPostsPage />} />
          </Route>

          <Route path="/admin" element={<AdminAuthGate />}>
            <Route
              element={
                <>
                  <div className="noise-overlay" />
                  <BrutalistBackdrop bubbleOpacity={0.72} />
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                </>
              }
            >
              <Route index element={<AdminPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
