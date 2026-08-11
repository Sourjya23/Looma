import { Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import { HistorySidebar } from '../history/HistorySidebar';
import { useAuth } from '../auth/AuthContext';

export function AppLayout() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams(); // Works if it's a child route

  if (!token) return null;

  const handleNewWriting = () => {
    navigate('/new');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <HistorySidebar token={token} onNewWriting={handleNewWriting} activeSessionId={sessionId} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <nav style={{ height: '80px', padding: '0 2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link to="/leaderboard" style={{ textDecoration: 'none', color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
              Leaderboard
            </Link>
            <Link to="/dashboard" style={{ textDecoration: 'none', color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
              Dashboard
            </Link>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Hey, {user?.username}</span>
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
