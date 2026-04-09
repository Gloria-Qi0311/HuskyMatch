import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HuskyConnectLanding from './HuskyConnect';
import SignInPage from './pages/SignInPage';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import RecommendationsPage from './pages/RecommendationsPage';
import ChatAssistantPage from './pages/ChatAssistantPage';
import StudentSearchPage from './pages/StudentSearchPage';
import StudentProfilePage from './pages/StudentProfilePage';
import DirectMessagePage from './pages/DirectMessagePage';
import MessagesPage from './pages/MessagesPage';

const RequireAuth = ({ children }) => {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('huskyconnect_user_id') : null;
  if (!userId) {
    return <Navigate to="/signin" replace />;
  }
  return children;
};

const LandingPage = () => <HuskyConnectLanding />;

const SignupLandingPage = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const section = document.getElementById('signup');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  return <HuskyConnectLanding />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupLandingPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/students"
        element={
          <RequireAuth>
            <StudentSearchPage />
          </RequireAuth>
        }
      />
      <Route
        path="/students/:id"
        element={
          <RequireAuth>
            <StudentProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/recommendations"
        element={
          <RequireAuth>
            <RecommendationsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/chat"
        element={
          <RequireAuth>
            <ChatAssistantPage />
          </RequireAuth>
        }
      />
      <Route
        path="/messages"
        element={
          <RequireAuth>
            <MessagesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/messages/:otherId"
        element={
          <RequireAuth>
            <DirectMessagePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
