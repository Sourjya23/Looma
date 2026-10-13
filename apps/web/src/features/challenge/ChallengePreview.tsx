import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import { API_BASE } from '@/lib/api';
import toast from 'react-hot-toast';

interface ChallengePreviewProps {
  token?: string;
  onStart: (challengePayload: any, config: any) => void;
  initialDifficulty?: string;
}

export function ChallengePreview({ token: propToken, onStart, initialDifficulty = 'intermediate' }: ChallengePreviewProps) {
  const { token: authToken } = useAuth();
  const token = propToken || authToken;

  const [challenge, setChallenge] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState('');
  
  const [configTime, setConfigTime] = useState<number>(30 * 60);
  const [configWordTarget, setConfigWordTarget] = useState<number>(500);
  const [configDifficulty, setConfigDifficulty] = useState<string>(initialDifficulty);

  const generateChallenge = async (diff: string, time: number, words: number, isRegen = false) => {
    if (isRegen) {
      setIsRegenerating(true);
    } else {
      setInitialLoading(true);
    }
    setError('');

    try {
      const res = await fetch(`${API_BASE}/challenges/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ 
          difficulty: diff, 
          timeLimit: Math.round(time / 60), 
          wordTarget: words, 
          mode: 'normal' 
        })
      });

      const data = await res.json();

      if (data.success && data.data) {
        setChallenge(data.data);
        if (isRegen) {
          toast.success('Fresh writing prompt generated!');
        }
      } else {
        const msg = data.message || 'Failed to generate challenge scenario.';
        setError(msg);
        toast.error(msg);
      }
    } catch (e: any) {
      const msg = e.message || 'Error connecting to the server.';
      setError(msg);
      toast.error(msg);
    } finally {
      setInitialLoading(false);
      setIsRegenerating(false);
    }
  };

  // Initial load
  useEffect(() => {
    generateChallenge(configDifficulty, configTime, configWordTarget, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerate = () => {
    generateChallenge(configDifficulty, configTime, configWordTarget, true);
  };

  const handleDifficultyChange = (diff: string) => {
    setConfigDifficulty(diff);
  };

  const handleTimeChange = (mins: number) => {
    setConfigTime(mins * 60);
  };

  const handleWordChange = (words: number) => {
    setConfigWordTarget(words);
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3 text-center animate-fade-in">
        <Spinner size={24} color="#09090b" />
        <p className="text-xs font-medium text-zinc-500 tracking-tight">Drafting a fresh writing scenario...</p>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="max-w-xl mx-auto p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
        <div className="w-10 h-10 mx-auto rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-bold">
          !
        </div>
        <h3 className="text-sm font-semibold text-red-900">Scenario Generation Error</h3>
        <p className="text-xs text-red-600 leading-relaxed">{error}</p>
        <button
          onClick={() => generateChallenge(configDifficulty, configTime, configWordTarget, false)}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all shadow-xs"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* ── EYEBROW & TITLE ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Writer Studio</span>
          <span className="w-1 h-1 rounded-full bg-zinc-300" />
          <span className="text-[11px] font-medium text-zinc-500">Draft Sprint Template</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Configure Your Writing Scenario
        </h1>
      </div>

      {/* ── CHALLENGE PROMPT CARD ── */}
      {challenge && (
        <div className={`p-6 md:p-8 rounded-3xl bg-white border border-zinc-200/80 shadow-2xs space-y-6 transition-all duration-300 ${
          isRegenerating ? 'opacity-50 pointer-events-none scale-[0.99]' : 'opacity-100'
        }`}>
          {/* Genre & Mode Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {challenge.genre && challenge.genre.trim() !== '' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200/60">
                {challenge.genre}
              </span>
            )}
            {challenge.mode === 'adaptive' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center gap-1.5">
                <span>✦</span>
                <span>Targeted Habit Practice</span>
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-200/40 capitalize">
              {configDifficulty} difficulty
            </span>
          </div>

          {/* Main Story Prompt */}
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-medium tracking-tight text-zinc-900 leading-relaxed font-serif">
              &ldquo;{challenge.prompt}&rdquo;
            </h2>
          </div>

          {/* Adaptive Reasoning if Present */}
          {challenge.mode === 'adaptive' && challenge.reasoning && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
              <span className="text-indigo-600 text-base mt-0.5">💡</span>
              <div className="space-y-0.5">
                <strong className="block text-xs font-semibold text-indigo-950">Why this challenge?</strong>
                <p className="text-xs text-indigo-900/80 leading-relaxed">{challenge.reasoning}</p>
              </div>
            </div>
          )}

          {/* Creative Constraint Box */}
          {challenge.constraint && (
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <div className="flex items-center gap-2 text-zinc-700">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Constraint</span>
              </div>
              <p className="text-xs text-zinc-700 font-medium leading-relaxed">
                {challenge.constraint}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── SPRINT CONFIGURATION SECTION ── */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-zinc-200/80 shadow-2xs space-y-6">
        <h3 className="text-sm font-semibold text-zinc-900 tracking-tight pb-3 border-b border-zinc-100">
          Sprint Parameters & Target Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Time Target */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-zinc-700">
              Time Target
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[15, 30, 45, 60].map(mins => {
                const isSelected = configTime === mins * 60;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleTimeChange(mins)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-zinc-950 text-white shadow-xs font-semibold'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/60'
                    }`}
                  >
                    {mins} min
                  </button>
                );
              })}
            </div>
          </div>

          {/* Word Target */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-zinc-700">
              Word Target
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[250, 500, 1000].map(words => {
                const isSelected = configWordTarget === words;
                return (
                  <button
                    key={words}
                    type="button"
                    onClick={() => handleWordChange(words)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-zinc-950 text-white shadow-xs font-semibold'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/60'
                    }`}
                  >
                    {words >= 1000 ? '1k' : words} w
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Target */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-zinc-700">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {['beginner', 'intermediate', 'advanced'].map(diff => {
                const isSelected = configDifficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => handleDifficultyChange(diff)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-medium capitalize transition-all truncate ${
                      isSelected
                        ? 'bg-zinc-950 text-white shadow-xs font-semibold'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/60'
                    }`}
                  >
                    {diff === 'intermediate' ? 'Interm.' : diff}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center gap-3">
          {/* Confirm & Regenerate Button */}
          <button
            type="button"
            disabled={isRegenerating}
            onClick={handleRegenerate}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50 active:scale-[0.99] text-zinc-800 text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRegenerating ? (
              <>
                <Spinner size={14} color="#09090b" />
                <span>Regenerating...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                <span>Confirm & Regenerate</span>
              </>
            )}
          </button>

          {/* Start Writing Sprint Button */}
          <button
            type="button"
            disabled={isRegenerating || !challenge}
            onClick={() => onStart(challenge, { time: configTime, words: configWordTarget, diff: configDifficulty })}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-zinc-950 hover:bg-zinc-850 active:scale-[0.99] text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>Start Writing Sprint</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
