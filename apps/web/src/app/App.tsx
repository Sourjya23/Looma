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

// A simple protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

import { AppLayout } from '../features/layout/AppLayout';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Routes wrapped in the global authenticated layout with sidebar */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ProgressDashboardPage />} />
              <Route path="/new" element={<NewChallengePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/summary/:sessionId" element={<SummaryPage />} />
              <Route path="/report/:submissionId" element={<ReportPage />} />
            </Route>

            {/* Writing page is full screen, no sidebar */}
            <Route 
              path="/writing/:sessionId" 
              element={
                <ProtectedRoute>
                  <WritingPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Revision page is also full screen */}
            <Route 
              path="/revise/:sessionId" 
              element={
                <ProtectedRoute>
                  <RevisionEditorPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
