import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE, getAvatarUrl } from '@/lib/api';
import { LeaderboardRow } from '@/types/leaderboard';

export function LeaderboardPage() {
  const { token, user } = useAuth();
  const [period, setPeriod] = useState<'weekly' | 'alltime'>('weekly');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [lbRes, rankRes] = await Promise.all([
          fetch(`${API_BASE}/leaderboard?period=${period}&limit=50`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/leaderboard/me?period=${period}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const lbData = await lbRes.json();
        const rankData = await rankRes.json();

        if (lbData.success) setLeaderboard(lbData.data);
        if (rankData.success) setMyRank(rankData.data);

      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Real-time polling
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [token, period]);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderRankRow = (row: any, isMe: boolean) => (
    <div 
      key={row.userId}
      style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        backgroundColor: isMe ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
        borderBottom: '1px solid var(--color-border)',
        borderLeft: isMe ? '3px solid var(--color-primary)' : '3px solid transparent',
        transition: 'background-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
          width: '44px', height: '44px', borderRadius: '50%', 
          background: row.rank <= 3 
            ? 'linear-gradient(135deg, var(--color-primary), #818cf8)' 
            : 'var(--color-bg-alt)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: row.rank <= 3 ? '1.25rem' : '0.875rem',
          color: row.rank <= 3 ? '#fff' : 'var(--color-text-secondary)',
          flexShrink: 0,
        }}>
          {getMedalEmoji(row.rank)}
        </div>
        
        {row.avatarUrl ? (
          <img src={getAvatarUrl(row.avatarUrl)} alt={row.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            {row.displayName?.charAt(0).toUpperCase()}
          </div>
        )}

        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {row.displayName} 
            {isMe && <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px', backgroundColor: 'var(--color-primary)', color: '#fff' }}>You</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
            {row.level && <span>Lv. {row.level}</span>}
            {row.currentStreak > 0 && <span>🔥 {row.currentStreak} day streak</span>}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-text-primary)' }}>
          {row.xp.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>XP</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 'clamp(2rem, 4vw, 4rem)', maxWidth: '800px', margin: '0 auto', width: '100%' }} className="animate-fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
            Leaderboard
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Compete with other writers based on practice XP.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--color-bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-lg)' }}>
          <button 
            onClick={() => setPeriod('weekly')}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 500,
              backgroundColor: period === 'weekly' ? 'white' : 'transparent',
              boxShadow: period === 'weekly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              border: 'none', cursor: 'pointer'
            }}
          >
            Weekly
          </button>
          <button 
            onClick={() => setPeriod('alltime')}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 500,
              backgroundColor: period === 'alltime' ? 'white' : 'transparent',
              boxShadow: period === 'alltime' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              border: 'none', cursor: 'pointer'
            }}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* My Stats Card */}
      {myRank && (
        <div style={{ 
          background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', 
          borderRadius: '1rem', 
          padding: '1.5rem 2rem', 
          marginBottom: '1.5rem',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.25rem' }}>Your Rank</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>#{myRank.rank}</div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{myRank.xp?.toLocaleString() || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total XP</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{myRank.level || 1}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>🔥 {myRank.currentStreak || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day Streak</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' }}>
          <div className="spinner"></div>
          <div style={{ color: 'var(--color-text-muted)' }}>Loading rankings...</div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {leaderboard.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>No rankings yet</div>
              <div>Write your first story to appear on the leaderboard!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {leaderboard.map((row) => renderRankRow(row, row.userId === user?.id))}
              
              {myRank && myRank.rank > 50 && (
                <>
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>...</div>
                  {myRank.nearby.map((row: any) => renderRankRow(row, row.isMe))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
