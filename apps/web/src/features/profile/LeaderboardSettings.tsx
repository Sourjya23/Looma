import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import { API_BASE } from '@/lib/api';

export function LeaderboardSettings() {
  const { user, token } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [optIn, setOptIn] = useState(user?.leaderboardOptIn || false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/leaderboard/opt-in`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName, leaderboardOptIn: optIn })
      });

      if (res.ok) {
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2500);
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div className="p-6 md:p-8 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-6">
      <div className="pb-3 border-b border-zinc-100">
        <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Public Profile & Leaderboard</h2>
        <p className="text-xs text-zinc-500">Manage your visibility across the global Looma community</p>
      </div>

      <div className="max-w-xl space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
            Public Pen Name / Display Name
          </label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Anonymous Storyteller"
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-zinc-200 bg-zinc-50/70 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5 transition-all"
          />
          <p className="text-[11px] text-zinc-400 mt-1.5">
            This name will appear on the weekly ranking and social shares.
          </p>
        </div>

        {/* Custom Toggle Switch */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-100">
          <div className="space-y-0.5 pr-4">
            <span className="text-xs font-semibold text-zinc-900">Include in Global Leaderboard</span>
            <p className="text-[11px] text-zinc-500">
              Showcase your earned XP and streak on the public rankings. Rankings measure practice consistency, never private story drafts.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={optIn}
            onClick={() => setOptIn(!optIn)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 ${
              optIn ? 'bg-zinc-950' : 'bg-zinc-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                optIn ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-5 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-850 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-xs"
          >
            {status === 'saving' ? (
              <>
                <Spinner size={14} color="#ffffff" />
                <span>Saving...</span>
              </>
            ) : status === 'saved' ? (
              <>
                <span className="text-emerald-400">✓</span>
                <span>Preferences Saved</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>

          {status === 'error' && (
            <span className="text-xs font-medium text-red-600">Failed to save settings. Please try again.</span>
          )}
        </div>
      </div>
    </div>
  );
}
