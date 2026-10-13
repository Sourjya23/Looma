import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { UserAchievement } from 'shared-types';
import { API_BASE } from '@/lib/api';

const ACHIEVEMENT_CATALOGUE = [
  { key: 'FIRST_STORY', name: 'First Milestone', description: 'Completed first writing sprint', icon: '🖋️', tier: 'Bronze' },
  { key: '10_STORIES', name: 'Dedicated Author', description: 'Penned 10 completed stories', icon: '📚', tier: 'Silver' },
  { key: '50_STORIES', name: 'Literary Architect', description: 'Penned 50 completed stories', icon: '👑', tier: 'Gold' },
  { key: '1000_WORDS', name: 'Kiloword Club', description: 'Crafted over 1,000 words', icon: '⚡', tier: 'Bronze' },
  { key: '10000_WORDS', name: 'Prolific Scribe', description: 'Crafted over 10,000 words', icon: '💫', tier: 'Gold' },
  { key: 'FIRST_REVISION', name: 'The Refiner', description: 'Polished a story with a revision', icon: '✨', tier: 'Bronze' },
  { key: '10_REVISIONS', name: 'Master Editor', description: 'Completed 10 thoughtful revisions', icon: '🎯', tier: 'Silver' },
  { key: '7_DAY_STREAK', name: 'Weekly Ritual', description: 'Maintained a 7-day creative streak', icon: '🔥', tier: 'Silver' },
  { key: '30_DAY_STREAK', name: 'Unstoppable Momentum', description: 'Maintained a 30-day creative streak', icon: '🌟', tier: 'Gold' },
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
        console.error('Failed to fetch achievements', err);
      }
    };
    if (token) fetchGamification();
  }, [token]);

  const unlockedKeys = new Set(achievements.map((a: UserAchievement) => a.achievementKey));
  const unlockedCount = achievements.length;

  return (
    <div className="p-6 md:p-8 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Trophy Case & Milestones</h2>
          <p className="text-xs text-zinc-500">Badges earned through consistent craft and story revisions</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold self-start sm:self-auto">
          <span>🏆</span>
          <span>{unlockedCount} / {ACHIEVEMENT_CATALOGUE.length} Unlocked</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {ACHIEVEMENT_CATALOGUE.map((ac) => {
          const isUnlocked = unlockedKeys.has(ac.key);
          return (
            <div
              key={ac.key}
              className={`p-4 rounded-xl border transition-all duration-200 flex items-start gap-3.5 ${
                isUnlocked
                  ? 'bg-zinc-50/70 border-zinc-200/90 shadow-3xs'
                  : 'bg-zinc-50/20 border-zinc-200/40 opacity-55'
              }`}
            >
              <div 
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-2xs border ${
                  isUnlocked
                    ? 'bg-white border-zinc-200/80'
                    : 'bg-zinc-100 border-zinc-200/40 grayscale'
                }`}
              >
                {isUnlocked ? ac.icon : '🔒'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className={`text-xs font-semibold truncate ${isUnlocked ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    {ac.name}
                  </h3>
                  {isUnlocked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">
                  {ac.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
