import { useState } from 'react';
import { Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import { HistorySidebar } from '../history/HistorySidebar';
import { useAuth } from '../auth/AuthContext';
import { getAvatarUrl } from '@/lib/api';

export function AppLayout() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams(); // Works if it's a child route
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!token) return null;

  const handleNewWriting = () => {
    navigate('/new');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <HistorySidebar token={token} onNewWriting={handleNewWriting} activeSessionId={sessionId} isOpen={isSidebarOpen} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <nav style={{ height: '80px', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '0.25rem' }}
              title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link to="/leaderboard" style={{ textDecoration: 'none', color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
              Leaderboard
            </Link>
            <Link to="/dashboard" style={{ textDecoration: 'none', color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
              Dashboard
            </Link>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
              {user?.avatarUrl ? (
                <img src={getAvatarUrl(user.avatarUrl)} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontWeight: 600, border: '1px solid var(--color-border)' }}>
                  {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>{user?.displayName || user?.username}</span>
            </div>

            <button onClick={() => { logout(); navigate('/'); }} className="btn-pill btn-pill-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              Log out
            </button>
          </div>
        </nav>
        
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-bg-primary)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
