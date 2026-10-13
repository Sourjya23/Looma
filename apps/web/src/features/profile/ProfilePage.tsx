import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AchievementsGrid } from './AchievementsGrid';
import { LeaderboardSettings } from './LeaderboardSettings';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { API_BASE, getAvatarUrl } from '@/lib/api';

const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 750, 1150, 1650, 2250, 3000, 4000, 5000, 6500, 8500, 11000, 14000
];

export function ProfilePage() {
  const { token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setProfile(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size={24} color="#09090b" />
        <p className="text-xs font-medium text-zinc-500 tracking-tight">Loading writer portfolio...</p>
      </div>
    );
  }

  // No early return for !profile — allow all users to manage avatar, trophies, and leaderboard settings

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Max 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

          setUploadingAvatar(true);
          try {
            const res = await fetch(`${API_BASE}/profile/avatar`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({ avatar: compressedBase64 })
            });
            const data = await res.json();
            if (data.success && data.data.avatarUrl) {
              updateUser({ avatarUrl: data.data.avatarUrl });
              toast.success('Avatar updated successfully!');
            } else {
              toast.error(data.message || 'Failed to update avatar');
            }
          } catch (err) {
            toast.error('Error uploading avatar');
          } finally {
            setUploadingAvatar(false);
          }
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  // Level & XP calculations
  const userLevel = user?.level || 1;
  const userXP = user?.xp || 0;
  const currentThreshold = LEVEL_THRESHOLDS[userLevel - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[userLevel] || (userXP + 500);
  const xpIntoLevel = Math.max(0, userXP - currentThreshold);
  const xpSpan = Math.max(1, nextThreshold - currentThreshold);
  const levelProgress = Math.min(100, Math.round((xpIntoLevel / xpSpan) * 100));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 animate-fade-in space-y-8">
      
      {/* ── WRITER PASSPORT HERO BANNER ── */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white border border-zinc-800 shadow-sm relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          
          {/* Avatar with upload overlay */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative w-24 h-24 rounded-2xl overflow-hidden bg-zinc-800 border-2 border-white/10 ring-4 ring-white/5 cursor-pointer shrink-0 shadow-lg"
          >
            {user?.avatarUrl ? (
              <img src={getAvatarUrl(user.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-400 bg-gradient-to-br from-zinc-800 to-zinc-900">
                {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'W'}
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {uploadingAvatar ? (
                <Spinner size={16} color="#ffffff" />
              ) : (
                <>
                  <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Change</span>
                </>
              )}
            </div>
            <input type="file" accept="image/jpeg, image/png, image/webp" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* User Bio & Tier */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                {user?.displayName || user?.username || 'Anonymous Writer'}
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-white/10 text-zinc-300 border border-white/10 uppercase tracking-wider">
                {user?.tier || 'FREE'} PLAN
              </span>
            </div>

            <p className="text-xs text-zinc-400 font-normal">
              @{user?.username || 'writer'} &bull; Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
            </p>

            {/* Level & XP Strip */}
            <div className="pt-3 max-w-md w-full">
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                <span className="text-zinc-200 font-semibold">Level {userLevel} Storyteller</span>
                <span>{userXP.toLocaleString()} / {nextThreshold.toLocaleString()} XP ({levelProgress}%)</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500" 
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats Pillar */}
          <div className="flex md:flex-col items-center justify-center gap-4 md:gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
            <div className="text-center">
              <div className="text-lg font-bold text-zinc-100">{user?.currentStreak || 1} 🔥</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Streak</div>
            </div>
            <div className="w-px md:w-full h-8 md:h-px bg-white/10" />
            <div className="text-center">
              <div className="text-lg font-bold text-zinc-100">{user?.longestStreak || 1} d</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Best Run</div>
            </div>
          </div>

        </div>

      </div>

      {/* ── AI EDITORIAL ASSESSMENT (COACH'S ASSESSMENT) ── */}
      {profile?.aiInterpretation ? (
        <div className="p-6 md:p-8 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-zinc-900 pb-2 border-b border-zinc-100">
            <span className="text-indigo-600 font-bold text-base">✦</span>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              AI Editorial Assessment & Stylistic Voice
            </h2>
          </div>
          <div className="text-sm text-zinc-700 leading-relaxed font-normal prose prose-zinc max-w-none pt-1">
            <ReactMarkdown>{profile.aiInterpretation}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="p-6 md:p-7 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 shrink-0">
              ✦
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">AI Editorial Calibration in Progress</h3>
              <p className="text-xs text-zinc-500">Penned stories will trigger comprehensive DNA analysis of your voice, rhythm, and tone.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/new')}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Start Writing Sprint &rarr;
          </button>
        </div>
      )}

      {/* ── MASTERY DIMENSIONS: STRENGTHS & FOCUS AREAS BENTO ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Strengths */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Validated Superpowers</span>
            </h2>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
              {profile?.strengths?.length || 0} Strengths
            </span>
          </div>

          {(profile?.strengths?.length ?? 0) > 0 ? (
            <div className="space-y-2.5">
              {profile!.strengths.map((s: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-xs font-medium text-zinc-800 leading-snug">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 py-6 text-center">
              Write a few more stories to allow AI to identify your core strengths.
            </p>
          )}
        </div>

        {/* Focus Areas */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
              <span className="text-amber-500 font-bold">🎯</span>
              <span>Growth & Polish Areas</span>
            </h2>
            <span className="text-[11px] font-medium text-zinc-500">
              Recurring Habits
            </span>
          </div>

          {(profile?.weaknesses?.length ?? 0) > 0 ? (
            <div className="space-y-2.5">
              {profile!.weaknesses.map((w: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-zinc-800 capitalize">
                      {w.subCategory?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-500 bg-white px-2 py-0.5 rounded-md border border-zinc-200/60 shadow-3xs">
                    {w.count} flags
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 py-6 text-center">
              No recurrent weaknesses detected. Your writing mechanics are in excellent form.
            </p>
          )}
        </div>

      </div>

      {/* ── SKILL TRAJECTORIES & TRENDS ── */}
      {(profile?.trends?.length ?? 0) > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
          <div className="pb-2 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">Recent Skill Trajectories</h2>
            <p className="text-xs text-zinc-500">How your mechanics and storytelling techniques are evolving over time</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile!.trends.map((t: any, i: number) => {
              const isImproving = t.state === 'improving';
              const isWorsening = t.state === 'worsening';
              return (
                <div key={i} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-800 capitalize truncate">
                    {t.subCategory?.replace(/_/g, ' ')}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isImproving
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/50'
                      : isWorsening
                      ? 'text-amber-700 bg-amber-50 border border-amber-200/50'
                      : 'text-zinc-600 bg-zinc-100'
                  }`}>
                    <span>{isImproving ? '↑' : isWorsening ? '↓' : '→'}</span>
                    <span className="capitalize">{t.state}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS TROPHY SHOWCASE ── */}
      <AchievementsGrid />

      {/* ── LEADERBOARD & PUBLIC PROFILE PREFERENCES ── */}
      <LeaderboardSettings />

    </div>
  );
}
