import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
// Note: update shared-types later if needed, or use string

interface ChallengePreviewProps {
  token: string; // kept for backwards compatibility if passed by parent, though unused here
  onStart: (challengePayload: any, config: any) => void;
  initialDifficulty?: string;
}

export function ChallengePreview({ onStart, initialDifficulty = 'intermediate' }: ChallengePreviewProps) {
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [configTime, setConfigTime] = useState<number>(30 * 60);
  const [configWordTarget, setConfigWordTarget] = useState<number>(500);
  const [configDifficulty, setConfigDifficulty] = useState<string>(initialDifficulty);

  const generateChallenge = async (diff: string, time: number, words: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post<any>('/challenges/generate', { 
        difficulty: diff, 
        timeLimit: time / 60, 
        wordTarget: words, 
        mode: 'normal' 
      });
      if (data.success) {
        setChallenge(data.data);
      } else {
        setError(data.message || 'Failed to generate challenge.');
      }
    } catch (e: any) {
      setError(e.message || 'Error connecting to the server.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    generateChallenge(configDifficulty, configTime, configWordTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerate = () => {
    const confirmed = window.confirm('Are you sure you want to regenerate with the selected settings?');
    if (confirmed) {
      generateChallenge(configDifficulty, configTime, configWordTarget);
    }
  };

  const handleDifficultyChange = (diff: string) => {
    setConfigDifficulty(diff);
    // Removed auto-generation
  };

  const handleTimeChange = (mins: number) => {
    const newTime = mins * 60;
    setConfigTime(newTime);
    // Removed auto-generation
  };

  const handleWordChange = (words: number) => {
    setConfigWordTarget(words);
    // Removed auto-generation
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <p className="eyebrow" style={{ color: 'var(--color-text-primary)' }}>New Writing Session</p>
      
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
          <p style={{ color: 'var(--color-text-muted)' }}>Drafting a new scenario...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)' }}>{error}</div>
      ) : challenge ? (
        <div className="animate-fade-in-up">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {challenge.genre && challenge.genre.trim() !== '' && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                {challenge.genre}
              </span>
            )}
            {challenge.mode === 'adaptive' && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff', backgroundColor: '#000000', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                Targeted Practice
              </span>
            )}
          </div>

          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 400, letterSpacing: '-0.03em', marginBottom: '2rem', lineHeight: 1.2, color: 'var(--color-text-primary)' }}>
            {challenge.prompt}
          </h1>

          {challenge.mode === 'adaptive' && challenge.reasoning && (
            <div style={{ backgroundColor: 'var(--color-bg-alt)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>💡</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Why this challenge?</strong>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{challenge.reasoning}</p>
              </div>
            </div>
          )}

          <div style={{ backgroundColor: 'var(--color-bg-alt)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '3rem', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Constraint:</h3>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{challenge.constraint}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem', padding: '1rem 0' }}>
            
            {/* Time Configuration */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>Time Target</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[15, 30, 45, 60].map(mins => (
                  <button 
                    key={mins}
                    onClick={() => handleTimeChange(mins)}
                    className={configTime === mins * 60 ? "btn-pill btn-pill-dark" : "btn-pill btn-pill-outline"}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Word Configuration */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>Word Target</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[250, 500, 1000].map(words => (
                  <button 
                    key={words}
                    onClick={() => handleWordChange(words)}
                    className={configWordTarget === words ? "btn-pill btn-pill-dark" : "btn-pill btn-pill-outline"}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    {words}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Configuration */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>Difficulty (Changes Prompt)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['beginner', 'intermediate', 'advanced'].map(diff => (
                  <button 
                    key={diff}
                    onClick={() => handleDifficultyChange(diff)}
                    className={configDifficulty === diff ? "btn-pill btn-pill-dark" : "btn-pill btn-pill-outline"}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textTransform: 'capitalize' }}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleRegenerate} className="btn-pill btn-pill-outline" style={{ flex: 1, justifyContent: 'center', padding: '1rem', fontSize: '1.125rem' }}>
              Confirm & Regenerate
            </button>
            <button onClick={() => onStart(challenge, { time: configTime, words: configWordTarget, diff: configDifficulty })} className="btn-pill btn-pill-dark" style={{ flex: 2, justifyContent: 'center', padding: '1rem', fontSize: '1.125rem' }}>
              Start Writing
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

