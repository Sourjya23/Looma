import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar 
} from 'recharts';
import { Spinner } from '../../components/ui/Spinner';
import { API_BASE } from '@/lib/api';

const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 750, 1150, 1650, 2250, 3000, 4000, 5000, 6500, 8500, 11000, 14000
];

export function ProgressDashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [range, setRange] = useState('30d');
  const [activeChartTab, setActiveChartTab] = useState<'performance' | 'speed' | 'volume'>('performance');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [dashRes, profRes] = await Promise.all([
          fetch(`${API_BASE}/dashboard/overview?range=${range}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const dashData = await dashRes.json();
        const profData = await profRes.json();

        if (dashData.success) setData(dashData.data);
        if (profData.success) setProfile(profData.data);
      } catch (err) {
        console.error('Error loading dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) loadData();
  }, [token, range]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size={24} color="#09090b" />
        <p className="text-xs font-medium text-zinc-500 tracking-tight">Gathering writing analytics...</p>
      </div>
    );
  }

  const isFirstTime = Boolean(data?.isEmpty);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getTrendBadge = (state?: string, value?: number) => {
    if (!state || state === 'stable') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
          <span>→</span> <span>Stable</span>
        </span>
      );
    }
    if (state === 'improving') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
          <span>↑</span> <span>+{value ?? ''}%</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
        <span>↓</span> <span>Needs focus</span>
      </span>
    );
  };

  // Gamification calculations
  const userLevel = user?.level || 1;
  const userXP = user?.xp || 0;
  const currentThreshold = LEVEL_THRESHOLDS[userLevel - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[userLevel] || (userXP + 500);
  const xpIntoCurrentLevel = Math.max(0, userXP - currentThreshold);
  const xpNeededForNext = Math.max(1, nextThreshold - currentThreshold);
  const xpProgressPercent = Math.min(100, Math.round((xpIntoCurrentLevel / xpNeededForNext) * 100));

  // Average quality calculation
  const scores = [
    data?.trends?.english?.value,
    data?.trends?.story?.value,
    data?.trends?.director?.value
  ].filter(v => typeof v === 'number' && v > 0);
  const avgQuality = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 82;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 animate-fade-in space-y-8">
      
      {/* ── TOP HERO HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Writer Studio</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300" />
            <span className="text-[11px] text-zinc-500 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Welcome back, {user?.displayName || user?.username || 'Writer'}
          </h1>
        </div>

        {/* Range Selector & Action */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Segmented Range Pills */}
          <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/60 shadow-xs">
            {(['7d', '30d', '90d', 'all'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  range === r 
                    ? 'bg-white text-zinc-900 shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {r === '7d' ? '7D' : r === '30d' ? '30D' : r === '90d' ? '90D' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-850 active:scale-[0.98] transition-all shadow-xs"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Sprint</span>
          </button>
        </div>
      </div>

      {/* ── ONBOARDING WELCOME BANNER (IF NO SPRINTS YET) ── */}
      {isFirstTime && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-50 to-zinc-100/60 border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200/80 shadow-3xs flex items-center justify-center text-2xl shrink-0">
              ✍️
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Your Creative Journey Begins Here</h2>
              <p className="text-xs text-zinc-500 max-w-xl leading-relaxed mt-0.5">
                Complete your first writing sprint to unlock live typing speed telemetry, WPM trends, and multi-model editorial critique.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-850 active:scale-[0.98] transition-all shadow-xs shrink-0"
          >
            <span>Start First Sprint</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}

      {/* ── GAMIFICATION & LEVEL RIBBON ── */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 text-white shadow-sm border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-white/10 shrink-0">
            L{userLevel}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold tracking-tight">Level {userLevel} Storyteller</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/10 text-zinc-300 border border-white/5 uppercase tracking-wide">
                {user?.tier || 'FREE'} TIER
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span>{userXP.toLocaleString()} Total XP</span>
              <span>•</span>
              <span>{(nextThreshold - userXP).toLocaleString()} XP to Level {userLevel + 1}</span>
            </div>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="flex-1 max-w-md w-full">
          <div className="flex justify-between text-[11px] text-zinc-400 mb-1.5 font-medium">
            <span>Progress</span>
            <span className="text-zinc-200">{xpProgressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${xpProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Streak Counter */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0 self-start md:self-auto">
          <span className="text-2xl animate-pulse">🔥</span>
          <div>
            <div className="text-sm font-bold leading-tight">{user?.currentStreak || 1} Day Streak</div>
            <div className="text-[10px] text-zinc-400">Best: {user?.longestStreak || 1} days</div>
          </div>
        </div>
      </div>

      {/* ── BENTO KPI METRICS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Words */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between mb-3 text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Words Crafted</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-zinc-900 mb-1">
            {data?.totalWords?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <span className="font-medium text-zinc-700">{data?.totalSessions || 0}</span> sessions finished
          </div>
        </div>

        {/* Metric 2: Writing Time */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between mb-3 text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Flow Time</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-zinc-900 mb-1">
            {formatTime(data?.totalWritingTime || 0)}
          </div>
          <div className="text-xs text-zinc-500">
            Active keyboard writing
          </div>
        </div>

        {/* Metric 3: Writing Speed */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between mb-3 text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Typing Flow</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold tracking-tight text-zinc-900">
              {data?.averageWritingSpeed || 0}
            </span>
            <span className="text-xs text-zinc-400 font-medium">WPM</span>
          </div>
          <div className="flex items-center gap-1.5">
            {getTrendBadge(data?.trends?.speed?.state)}
          </div>
        </div>

        {/* Metric 4: AI Mastery */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between mb-3 text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Quality</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold tracking-tight text-zinc-900">
              {avgQuality}
            </span>
            <span className="text-xs text-zinc-400 font-medium">/ 100</span>
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-2">
            <span className="text-indigo-600 font-medium">EN {data?.trends?.english?.value || 80}</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">ST {data?.trends?.story?.value || 82}</span>
            <span>•</span>
            <span className="text-purple-600 font-medium">DIR {data?.trends?.director?.value || 84}</span>
          </div>
        </div>

      </div>

      {/* ── AI COACH PROGRESS SUMMARY ── */}
      {data?.progressSummary && (
        <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200/80 relative overflow-hidden shadow-2xs">
          <div className="flex items-center gap-2 mb-2 text-zinc-900">
            <span className="text-indigo-600 font-bold">✦</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              AI Editorial Digest
            </h2>
          </div>
          <p className="text-sm text-zinc-700 leading-relaxed max-w-4xl font-normal">
            &ldquo;{data.progressSummary}&rdquo;
          </p>
        </div>
      )}

      {/* ── INTERACTIVE ANALYTICS STUDIO ── */}
      <div className="p-6 md:p-8 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Writing Analytics Hub</h2>
            <p className="text-xs text-zinc-500">Interactive trends across all three evaluation dimensions</p>
          </div>

          {/* Chart Mode Tabs */}
          <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/60 self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab('performance')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeChartTab === 'performance' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              AI Scores
            </button>
            <button
              onClick={() => setActiveChartTab('speed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeChartTab === 'speed' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Speed (WPM)
            </button>
            <button
              onClick={() => setActiveChartTab('volume')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeChartTab === 'volume' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Word Volume
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-[280px] w-full pt-2">
          {(!data?.timeSeries || data.timeSeries.length === 0) ? (
            <div className="w-full h-full flex flex-col items-center justify-center rounded-xl bg-zinc-50/60 border border-dashed border-zinc-200 p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-400 mb-2.5 shadow-3xs">
                📈
              </div>
              <p className="text-xs font-semibold text-zinc-800">No Sprint Telemetry in this Timeframe</p>
              <p className="text-[11px] text-zinc-400 max-w-xs mt-1">
                Once you finish a story sprint, your daily WPM and AI scores will chart here automatically.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'performance' ? (
                <AreaChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="englishGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="storyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="directorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis domain={[50, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} dx={-8} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      color: '#ffffff', 
                      borderRadius: '12px', 
                      border: '1px solid #27272a',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)' 
                    }}
                    itemStyle={{ padding: '2px 0' }}
                  />
                  <Area type="monotone" dataKey="english" name="English Teacher" stroke="#4f46e5" strokeWidth={2.2} fill="url(#englishGrad)" />
                  <Area type="monotone" dataKey="story" name="Story Editor" stroke="#059669" strokeWidth={2.2} fill="url(#storyGrad)" />
                  <Area type="monotone" dataKey="director" name="Director AI" stroke="#9333ea" strokeWidth={2.2} fill="url(#directorGrad)" />
                </AreaChart>
              ) : activeChartTab === 'speed' ? (
                <AreaChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#09090b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#09090b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} dx={-8} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="speed" name="Words / Minute" stroke="#09090b" strokeWidth={2.5} fill="url(#speedGrad)" />
                </AreaChart>
              ) : (
                <BarChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} dx={-8} />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ backgroundColor: '#18181b', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="words" name="Words" fill="#09090b" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend strip */}
        {activeChartTab === 'performance' && (
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-zinc-100 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>English Teacher (Grammar & Syntax)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Story Editor (Plot & Character)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span>Director AI (Visuals & Cinematic Arc)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── MASTERY VS FOCUS BENTO GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Superpowers */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">Superpowers & Strengths</h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/40">
              {profile?.strengths?.length || 0} Identified
            </span>
          </div>

          {profile?.strengths?.length > 0 ? (
            <div className="space-y-2.5">
              {profile.strengths.map((s: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div className="text-xs font-medium text-zinc-800 leading-snug">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-400 text-xs">
              Complete 2 more stories to discover your natural strengths.
            </div>
          )}
        </div>

        {/* Focus Areas */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 font-bold">🎯</span>
              <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">Targeted Focus Areas</h2>
            </div>
            <button
              onClick={() => navigate('/new')}
              className="text-[11px] font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
            >
              Practice Now &rarr;
            </button>
          </div>

          {profile?.weaknesses?.length > 0 ? (
            <div className="space-y-2.5">
              {profile.weaknesses.slice(0, 4).map((w: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-zinc-800 capitalize">
                      {w.subCategory?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-500 bg-white px-2 py-0.5 rounded-md border border-zinc-200/60 shadow-3xs">
                    {w.count} instances
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-400 text-xs">
              No recurrent weaknesses detected. Your writing mechanics are balanced!
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
