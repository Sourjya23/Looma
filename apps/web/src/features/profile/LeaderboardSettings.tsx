import { useState } from 'react';
import { Camera, Check, AlertCircle, Globe, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import { API_BASE, getAvatarUrl } from '@/lib/api';

const MAX_NAME = 32;

export function LeaderboardSettings({ onChangePhoto }: { onChangePhoto?: () => void }) {
  const { user, token, updateUser } = useAuth();

  const initialName = user?.displayName || '';
  const initialOptIn = user?.leaderboardOptIn || false;
  const [displayName, setDisplayName] = useState(initialName);
  const [optIn, setOptIn] = useState(initialOptIn);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const trimmed = displayName.trim();
  const dirty = trimmed !== initialName.trim() || optIn !== initialOptIn;
  const tooLong = trimmed.length > MAX_NAME;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || tooLong) return;
    setStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/leaderboard/opt-in`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: trimmed || null, leaderboardOptIn: optIn }),
      });
      if (!res.ok) throw new Error(String(res.status));
      updateUser({ displayName: trimmed || null, leaderboardOptIn: optIn });
      setStatus('saved');
      toast.success('Settings saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  };

  const reset = () => { setDisplayName(initialName); setOptIn(initialOptIn); setStatus('idle'); };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
      {/* Photo */}
      <Row title="Photo" description="Shown on your profile and the leaderboard. JPG, PNG or WebP, up to 5 MB.">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
            {user?.avatarUrl ? <img src={getAvatarUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" /> : <User size={18} />}
          </div>
          <button type="button" onClick={onChangePhoto} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-[13px] font-medium text-zinc-800 transition-colors">
            <Camera size={14} /> Change photo
          </button>
        </div>
      </Row>

      {/* Display name */}
      <Row title="Display name" description="Used on the leaderboard and when you share a story. Leave empty to use your username.">
        <label htmlFor="displayName" className="sr-only">Display name</label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={e => { setDisplayName(e.target.value); if (status !== 'saving') setStatus('idle'); }}
          placeholder={user?.username || 'Your name'}
          aria-invalid={tooLong}
          className={`w-full px-3 py-2 rounded-lg text-sm bg-white text-zinc-900 placeholder:text-zinc-400 border focus:outline-none focus:ring-2 transition ${
            tooLong ? 'border-red-300 focus:ring-red-500/20' : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-900/10'
          }`}
        />
        <div className={`mt-1.5 text-xs text-right tabular-nums ${tooLong ? 'text-red-600' : 'text-zinc-400'}`}>
          {trimmed.length}/{MAX_NAME}
        </div>
      </Row>

      {/* Leaderboard */}
      <Row title="Leaderboard" description="Show your XP and streak in public rankings. Your stories are never shared.">
        <label className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-zinc-200 bg-white cursor-pointer">
          <span className="inline-flex items-center gap-2.5 text-sm text-zinc-800">
            <Globe size={15} className="text-zinc-500" />
            Appear on the leaderboard
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={optIn}
            onClick={() => { setOptIn(v => !v); setStatus('idle'); }}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${optIn ? 'bg-zinc-900' : 'bg-zinc-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${optIn ? 'translate-x-4' : ''}`} />
          </button>
        </label>
      </Row>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-5 border-t border-zinc-200">
        {status === 'error' && (
          <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle size={14} /> Couldn't save. Try again.
          </span>
        )}
        {dirty && status !== 'saving' && (
          <button type="button" onClick={reset} className="px-3 py-2 text-[13px] font-medium text-zinc-600 hover:text-zinc-900">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!dirty || tooLong || status === 'saving'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-[13px] font-medium transition-colors disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed"
        >
          {status === 'saving' ? <><Spinner size={13} color="#fff" /> Saving</> :
           status === 'saved' ? <><Check size={14} /> Saved</> : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 md:gap-8">
      <div>
        <h3 className="text-sm font-medium text-zinc-950">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
