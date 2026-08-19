import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '../features/landing/LandingPage';
import { HowItWorksPage } from '../features/landing/HowItWorksPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { NewChallengePage } from '../features/challenge/NewChallengePage';
import { ProgressDashboardPage } from '../features/dashboard/ProgressDashboardPage';
import { WritingPage } from '../features/writing/WritingPage';
import { SummaryPage } from '../features/summary/SummaryPage';
import { RevisionEditorPage } from '../features/summary/RevisionEditorPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { LeaderboardPage } from '../features/leaderboard/LeaderboardPage';
import { ReportPage } from '../features/report/ReportPage';
import { AppLayout } from '../features/layout/AppLayout';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

/** Requires a logged-in user — redirects to /login otherwise */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redirects already-authenticated users straight to /dashboard */
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes — redirect to /dashboard if already logged in */}
            <Route path="/" element={<AuthRedirect><LandingPage /></AuthRedirect>} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
            <Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />

            {/* Protected routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ProgressDashboardPage />} />
              <Route path="/new" element={<NewChallengePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/summary/:sessionId" element={<SummaryPage />} />
              <Route path="/report/:submissionId" element={<ReportPage />} />
            </Route>

            {/* Full-screen protected pages (no sidebar) */}
            <Route path="/writing/:sessionId" element={<ProtectedRoute><WritingPage /></ProtectedRoute>} />
            <Route path="/revise/:sessionId" element={<ProtectedRoute><RevisionEditorPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
