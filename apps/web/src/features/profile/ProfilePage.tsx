import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import {
  Camera, Flame, Trophy, FileText, Type, Gauge, PenLine, Check,
  TrendingUp, TrendingDown, Minus, ArrowRight, ChevronDown, Calendar,
  AtSign, Sparkles, Settings, LayoutGrid, Award,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AchievementsGrid } from './AchievementsGrid';
import { LeaderboardSettings } from './LeaderboardSettings';
import { Spinner } from '../../components/ui/Spinner';
import { API_BASE, getAvatarUrl } from '@/lib/api';

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 750, 1150, 1650, 2250, 3000, 4000, 5000, 6500, 8500, 11000, 14000];

type Tab = 'overview' | 'achievements' | 'settings';
const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface WritingProfile {
  averageGrammarScore: number;
  averageStoryScore: number;
  averageDirectorScore: number;
  averageWordCount: number;
  averageWritingSpeed: number;
  totalSessions: number;
  strengths: { category: string; label: string }[];
  weaknesses: { category: string; subCategory: string; count: number; affectedSessions?: number; trend?: string }[];
  trends: { subCategory: string; state: string }[];
  aiInterpretation: string | null;
  updatedAt?: string;
}

const humanize = (s?: string) => (s || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

/** Resize an image file to max 200px and return a JPEG data URL. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const scale = Math.min(1, 200 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'overview') as Tab;
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  const [profile, setProfile] = useState<WritingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profile`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!cancelled) {
          if (data.success) setProfile(data.data);
          else setLoadError(true);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return void toast.error('Image is too large. Max 5 MB.');

    setUploadingAvatar(true);
    try {
      const avatar = await compressImage(file);
      const res = await fetch(`${API_BASE}/profile/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar }),
      });
      const data = await res.json();
      if (data.success && data.data?.avatarUrl) {
        updateUser({ avatarUrl: data.data.avatarUrl });
        toast.success('Photo updated');
      } else {
        toast.error(data.message || 'Could not update photo');
      }
    } catch {
      toast.error('Could not update photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Level & XP
  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const floor = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const ceil = LEVEL_THRESHOLDS[level] ?? xp + 500;
  const progress = Math.min(100, Math.round((Math.max(0, xp - floor) / Math.max(1, ceil - floor)) * 100));

  const name = user?.displayName || user?.username || 'Writer';
  const initial = name.charAt(0).toUpperCase();
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-10 animate-fade-in">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="relative shrink-0 self-start">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
            className="group relative block w-20 h-20 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            {user?.avatarUrl ? (
              <img src={getAvatarUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-2xl font-semibold text-zinc-500" style={{ fontFamily: 'var(--font-serif)' }}>
                {initial}
              </span>
            )}
            <span className={`absolute inset-0 flex items-center justify-center bg-zinc-950/55 text-white transition-opacity ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {uploadingAvatar ? <Spinner size={16} color="#fff" /> : <Camera size={18} strokeWidth={1.75} />}
            </span>
          </button>
          <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 pointer-events-none">
            <Camera size={13} strokeWidth={2} />
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-zinc-950 truncate">{name}</h1>
            <span className="px-2 py-0.5 rounded-md border border-zinc-200 bg-white text-[11px] font-medium text-zinc-600">
              {(user?.tier || 'FREE').charAt(0) + (user?.tier || 'FREE').slice(1).toLowerCase()}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5"><AtSign size={13} />{user?.username || 'writer'}</span>
            {joined && <span className="inline-flex items-center gap-1.5"><Calendar size={13} />Joined {joined}</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/new')}
          className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-[13px] font-medium transition-colors"
        >
          <PenLine size={14} /> New sprint
        </button>
      </header>

      {/* ── Level ── */}
      <div className="mt-7">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium text-zinc-900">Level {level}</span>
          <span className="text-zinc-500 tabular-nums">
            {xp.toLocaleString()} / {ceil.toLocaleString()} XP
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-200/70 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
          <div className="h-full rounded-full bg-zinc-900 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">{Math.max(0, ceil - xp).toLocaleString()} XP to level {level + 1}</p>
      </div>

      {/* ── Tabs ── */}
      <nav className="mt-8 border-b border-zinc-200 flex gap-6" role="tablist" aria-label="Profile sections">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`-mb-px inline-flex items-center gap-2 pb-3 pt-1 text-[13px] font-medium border-b-2 transition-colors ${
                active ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon size={15} strokeWidth={1.75} /> {label}
            </button>
          );
        })}
      </nav>

      <div className="pt-7" role="tabpanel">
        {tab === 'overview' && (
          loading ? <OverviewSkeleton /> : loadError ? (
            <EmptyState icon={FileText} title="Couldn't load your profile" body="Check your connection and refresh the page." />
          ) : (
            <Overview
              profile={profile}
              streak={user?.currentStreak ?? 0}
              bestStreak={user?.longestStreak ?? 0}
              onStart={() => navigate('/new')}
            />
          )
        )}
        {tab === 'achievements' && <AchievementsGrid />}
        {tab === 'settings' && <LeaderboardSettings onChangePhoto={() => fileInputRef.current?.click()} />}
      </div>
    </div>
  );
}

/* ───────────────────────── Overview ───────────────────────── */

function Overview({ profile, streak, bestStreak, onStart }: { profile: WritingProfile | null; streak: number; bestStreak: number; onStart: () => void }) {
  const hasData = !!profile && profile.totalSessions > 0;

  const stats = [
    { icon: FileText, label: 'Sessions', value: profile?.totalSessions ?? 0 },
    { icon: Flame, label: 'Current streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}` },
    { icon: Trophy, label: 'Best streak', value: `${bestStreak} ${bestStreak === 1 ? 'day' : 'days'}` },
    { icon: Type, label: 'Avg. words', value: hasData ? Math.round(profile!.averageWordCount).toLocaleString() : '—' },
  ];

  return (
    <div className="space-y-10">
      {/* Stats */}
      <section aria-label="Practice stats" className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl border border-zinc-200 bg-zinc-200 overflow-hidden">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white p-4 md:p-5">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Icon size={13} strokeWidth={1.75} />{label}</div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      {!hasData ? (
        <EmptyState
          icon={PenLine}
          title="Your profile fills in as you write"
          body="Finish a sprint and you'll see average scores, what you do well, and the habits worth working on."
          action={<button onClick={onStart} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-950 hover:underline underline-offset-4">Start a sprint <ArrowRight size={14} /></button>}
        />
      ) : (
        <>
          {/* Scores */}
          <Section title="Average scores" hint={`Across ${profile!.totalSessions} ${profile!.totalSessions === 1 ? 'session' : 'sessions'}`}>
            <div className="space-y-4">
              <ScoreRow label="English" value={profile!.averageGrammarScore} />
              <ScoreRow label="Story" value={profile!.averageStoryScore} />
              <ScoreRow label="Director" value={profile!.averageDirectorScore} />
            </div>
            {profile!.averageWritingSpeed > 0 && (
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <Gauge size={13} /> About {Math.round(profile!.averageWritingSpeed)} words per minute
              </p>
            )}
          </Section>

          {/* Coach notes */}
          {profile!.aiInterpretation && <CoachNotes text={profile!.aiInterpretation} updatedAt={profile!.updatedAt} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8">
            <Section title="What you do well">
              {profile!.strengths?.length ? (
                <ul className="space-y-2.5">
                  {profile!.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-800">
                      <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" strokeWidth={2} />
                      {s.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">Nothing stands out consistently yet. That's normal early on.</p>
              )}
            </Section>

            <Section title="Worth working on" hint="Recurring, not one-offs">
              <FocusList weaknesses={profile!.weaknesses} trends={profile!.trends} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function FocusList({ weaknesses, trends }: { weaknesses: WritingProfile['weaknesses']; trends: WritingProfile['trends'] }) {
  if (!weaknesses?.length) {
    return <p className="text-sm text-zinc-500">No recurring issues right now.</p>;
  }
  const trendOf = (sub: string, fallback?: string) => trends?.find(t => t.subCategory === sub)?.state ?? fallback ?? 'stable';
  return (
    <ul className="divide-y divide-zinc-100 -my-2">
      {weaknesses.slice(0, 6).map((w, i) => {
        const t = trendOf(w.subCategory, w.trend);
        const TIcon = t === 'improving' ? TrendingDown : t === 'worsening' ? TrendingUp : Minus;
        const tone = t === 'improving' ? 'text-emerald-700' : t === 'worsening' ? 'text-amber-700' : 'text-zinc-500';
        const label = t === 'improving' ? 'Improving' : t === 'worsening' ? 'More frequent' : 'Steady';
        return (
          <li key={i} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm text-zinc-900 truncate">{humanize(w.subCategory)}</div>
              <div className="text-xs text-zinc-500">
                {w.count} {w.count === 1 ? 'time' : 'times'}
                {w.affectedSessions ? ` in ${w.affectedSessions} ${w.affectedSessions === 1 ? 'session' : 'sessions'}` : ''}
              </div>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium ${tone}`} title={label}>
              <TIcon size={13} /> {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CoachNotes({ text, updatedAt }: { text: string; updatedAt?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 600;
  return (
    <Section
      title="Coach's notes"
      icon={Sparkles}
      hint={updatedAt ? `Updated ${new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : undefined}
    >
      <div className="relative">
        <div
          className={`prose prose-zinc prose-sm max-w-none text-zinc-700 leading-7 [&_strong]:text-zinc-900 [&_strong]:font-semibold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_h1]:hidden [&_h2]:font-sans [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:font-sans [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 ${long && !open ? 'max-h-56 overflow-hidden' : ''}`}
          style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}
        >
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
        {long && !open && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fafafa] to-transparent" />}
      </div>
      {long && (
        <button onClick={() => setOpen(o => !o)} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-zinc-900 hover:underline underline-offset-4">
          {open ? 'Show less' : 'Read more'}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </Section>
  );
}

/* ───────────────────────── Primitives ───────────────────────── */

function Section({ title, hint, icon: Icon, children }: { title: string; hint?: string; icon?: typeof Sparkles; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-zinc-950">
          {Icon && <Icon size={15} strokeWidth={1.75} className="text-zinc-500" />}
          {title}
        </h2>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const v = Math.round(value || 0);
  return (
    <div className="grid grid-cols-[72px_1fr_36px] items-center gap-3">
      <span className="text-[13px] text-zinc-600">{label}</span>
      <div className="h-1.5 rounded-full bg-zinc-200/70 overflow-hidden">
        <div className="h-full rounded-full bg-zinc-800" style={{ width: `${v}%` }} />
      </div>
      <span className="text-[13px] font-medium text-zinc-900 text-right tabular-nums">{v}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof PenLine; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center">
      <div className="mx-auto w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 text-[13px] text-zinc-500 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-10 animate-pulse" aria-busy="true" aria-label="Loading profile">
      <div className="h-[86px] rounded-xl bg-zinc-100" />
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-zinc-100" />
        {[0, 1, 2].map(i => <div key={i} className="h-3 rounded bg-zinc-100" />)}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-zinc-100" />
        <div className="h-24 rounded bg-zinc-100" />
      </div>
    </div>
  );
}
