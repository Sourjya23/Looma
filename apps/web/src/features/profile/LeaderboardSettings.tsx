import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function LeaderboardSettings() {
  const { user, token } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [optIn, setOptIn] = useState(user?.leaderboardOptIn || false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await fetch('/api/leaderboard/opt-in', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName, leaderboardOptIn: optIn })
      });

      if (res.ok) {
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
        Leaderboard Settings
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Configure how you appear on the global leaderboard. The leaderboard ranks practice XP, not AI scores.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Display Name
          </label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Anonymous Writer"
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
            Show me on the global leaderboard
          </span>
        </label>

        <button 
          onClick={handleSave}
          disabled={status === 'saving'}
          className="btn-pill btn-pill-dark"
          style={{ alignSelf: 'flex-start', marginTop: '0.5rem', opacity: status === 'saving' ? 0.7 : 1 }}
        >
          {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved ✓' : 'Save Settings'}
        </button>
        {status === 'error' && <div style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>Failed to save settings.</div>}
      </div>
    </div>
  );
}
