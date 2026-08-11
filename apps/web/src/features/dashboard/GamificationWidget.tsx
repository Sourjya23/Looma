import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE } from '@/lib/api';

interface GamificationProfile {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
}

export function GamificationWidget() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  
  useEffect(() => {
    const fetchGamification = async () => {
      try {
        const res = await fetch(`${API_BASE}/gamification/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setProfile(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch gamification profile', err);
      }
    };
    if (token) fetchGamification();
  }, [token]);

  if (!profile) return null;

  // Simple leveling logic replicated for UI progress
  const LEVEL_THRESHOLDS = [
    0, 100, 250, 450, 750, 1150, 1650, 2250, 3000, 4000, 5000, 6500, 8500, 11000, 14000
  ];
  const nextLevelXP = LEVEL_THRESHOLDS[profile.level] || profile.xp; // max level fallback
  const currentLevelXP = LEVEL_THRESHOLDS[profile.level - 1] || 0;
  
  const progressPercent = profile.level >= LEVEL_THRESHOLDS.length 
    ? 100 
    : Math.min(100, Math.max(0, ((profile.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100));

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '2rem',
      backgroundColor: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '2rem'
    }}>
      <div style={{ flex: 1, paddingRight: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            LEVEL {profile.level}
          </h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {profile.xp.toLocaleString()} XP
          </span>
        </div>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem' }}>
          <div style={{ 
            height: '100%', 
            width: `${progressPercent}%`, 
            backgroundColor: 'var(--color-primary)',
            transition: 'width 0.5s ease'
          }}></div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
          {profile.level < LEVEL_THRESHOLDS.length ? `${(nextLevelXP - profile.xp).toLocaleString()} XP to Level ${profile.level + 1}` : 'Max Level'}
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        paddingLeft: '2rem',
        borderLeft: '1px solid var(--color-border)'
      }}>
        <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🔥</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.5rem' }}>
          {profile.currentStreak} Day
        </div>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
          Streak
        </div>
      </div>
    </div>
  );
}
