import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { UserAchievement } from 'shared-types';
import { API_BASE } from '@/lib/api';

const ACHIEVEMENT_CATALOGUE = [
  { key: 'FIRST_STORY', name: 'First Story', description: 'Complete your first writing session', icon: '🏆' },
  { key: '10_STORIES', name: '10 Stories', description: 'Complete 10 writing sessions', icon: '🏆' },
  { key: '50_STORIES', name: '50 Stories', description: 'Complete 50 writing sessions', icon: '🏆' },
  { key: '1000_WORDS', name: '1,000 Words', description: 'Write 1,000 words in total', icon: '📝' },
  { key: '10000_WORDS', name: '10,000 Words', description: 'Write 10,000 words in total', icon: '📝' },
  { key: 'FIRST_REVISION', name: 'First Revision', description: 'Complete your first revision', icon: '🔄' },
  { key: '10_REVISIONS', name: '10 Revisions', description: 'Complete 10 revisions', icon: '🔄' },
  { key: '7_DAY_STREAK', name: '7-Day Streak', description: 'Maintain a 7-day writing streak', icon: '🔥' },
  { key: '30_DAY_STREAK', name: '30-Day Streak', description: 'Maintain a 30-day writing streak', icon: '🔥' },
];

export function AchievementsGrid() {
  const { token } = useAuth();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);

  useEffect(() => {
    const fetchGamification = async () => {
      try {
        const res = await fetch(`${API_BASE}/gamification/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setAchievements(data.data.achievements || []);
        }
      } catch (err) {
        console.error('Failed to fetch gamification profile', err);
      }
    };
    if (token) fetchGamification();
  }, [token]);

  const unlockedKeys = new Set(achievements.map((a: UserAchievement) => a.achievementKey));

  return (
    <div style={{ marginTop: '3rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        Achievements
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        {ACHIEVEMENT_CATALOGUE.map((ac) => {
          const isUnlocked = unlockedKeys.has(ac.key);
          return (
            <div 
              key={ac.key} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: isUnlocked ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                border: `1px solid ${isUnlocked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                opacity: isUnlocked ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '2rem', filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                {isUnlocked ? ac.icon : '🔒'}
              </div>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                  {ac.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {ac.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
