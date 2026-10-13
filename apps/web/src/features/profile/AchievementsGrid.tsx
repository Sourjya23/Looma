import { useEffect, useState } from 'react';
import { PenLine, BookOpen, Library, Type, ScrollText, RefreshCw, FilePen, Flame, CalendarCheck, Lock, Check } from 'lucide-react';
import type { UserAchievement } from 'shared-types';
import { useAuth } from '../auth/AuthContext';
import { API_BASE } from '@/lib/api';

const CATALOGUE = [
  { key: 'FIRST_STORY', name: 'First story', description: 'Finish your first writing sprint', icon: PenLine, tier: 'Bronze' },
  { key: '10_STORIES', name: 'Ten stories', description: 'Finish 10 stories', icon: BookOpen, tier: 'Silver' },
  { key: '50_STORIES', name: 'Fifty stories', description: 'Finish 50 stories', icon: Library, tier: 'Gold' },
  { key: '1000_WORDS', name: '1,000 words', description: 'Write 1,000 words in total', icon: Type, tier: 'Bronze' },
  { key: '10000_WORDS', name: '10,000 words', description: 'Write 10,000 words in total', icon: ScrollText, tier: 'Gold' },
  { key: 'FIRST_REVISION', name: 'First revision', description: 'Revise a story once', icon: RefreshCw, tier: 'Bronze' },
  { key: '10_REVISIONS', name: 'Ten revisions', description: 'Complete 10 revisions', icon: FilePen, tier: 'Silver' },
  { key: '7_DAY_STREAK', name: '7-day streak', description: 'Write 7 days in a row', icon: Flame, tier: 'Silver' },
  { key: '30_DAY_STREAK', name: '30-day streak', description: 'Write 30 days in a row', icon: CalendarCheck, tier: 'Gold' },
] as const;

const TIER_DOT: Record<string, string> = { Bronze: 'bg-amber-700', Silver: 'bg-zinc-400', Gold: 'bg-yellow-500' };

export function AchievementsGrid() {
  const { token } = useAuth();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`${API_BASE}/gamification/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (!cancelled && d.success) setAchievements(d.data.achievements || []); })
      .catch(err => console.error('Failed to fetch achievements', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const unlocked = new Map(achievements.map(a => [a.achievementKey, a]));
  const items = CATALOGUE.filter(a =>
    filter === 'all' ? true : filter === 'unlocked' ? unlocked.has(a.key) : !unlocked.has(a.key)
  );
  const count = CATALOGUE.filter(a => unlocked.has(a.key)).length;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-950">Achievements</h2>
          <p className="mt-0.5 text-[13px] text-zinc-500">{count} of {CATALOGUE.length} unlocked</p>
          <div className="mt-2.5 h-1 w-40 rounded-full bg-zinc-200/70 overflow-hidden">
            <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${(count / CATALOGUE.length) * 100}%` }} />
          </div>
        </div>
        <div className="inline-flex self-start sm:self-auto rounded-lg border border-zinc-200 bg-white p-0.5 text-[13px]" role="group" aria-label="Filter achievements">
          {(['all', 'unlocked', 'locked'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${filter === f ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[76px] rounded-xl bg-zinc-100" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-zinc-500">
          {filter === 'unlocked' ? 'Nothing unlocked yet. Your first sprint unlocks one.' : 'Everything is unlocked.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(a => {
            const got = unlocked.get(a.key);
            const Icon = a.icon;
            const when = got?.unlockedAt;
            return (
              <li
                key={a.key}
                className={`flex items-start gap-3 p-4 rounded-xl border bg-white ${got ? 'border-zinc-200' : 'border-zinc-200/70'}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${got ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  {got ? <Icon size={16} strokeWidth={1.75} /> : <Lock size={14} strokeWidth={1.75} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-[13px] font-medium truncate ${got ? 'text-zinc-950' : 'text-zinc-500'}`}>{a.name}</h3>
                    {got && <Check size={13} className="text-emerald-600 shrink-0" strokeWidth={2.25} aria-label="Unlocked" />}
                  </div>
                  <p className="text-xs text-zinc-500 leading-snug">{a.description}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT[a.tier]}`} />
                    {a.tier}
                    {got && when && <span>· {new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
