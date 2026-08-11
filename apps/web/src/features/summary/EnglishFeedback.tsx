import { useState, useEffect } from 'react';
import type { Submission } from 'shared-types';

interface EnglishFeedbackProps {
  submission: Submission;
  token: string;
}

type AIState = 'NOT_STARTED' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export function EnglishFeedback({ submission, token }: EnglishFeedbackProps) {
  const [state, setState] = useState<AIState>('NOT_STARTED');
  const [analysis, setAnalysis] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if we already have an analysis from the DB
  useEffect(() => {
    // We could fetch existing analysis if it was already saved in DB
    // Assuming backend returns it with submission if we include it, but currently it doesn't.
    // For simplicity, we can just rely on the user clicking Analyze, or we can fetch it explicitly.
    // Let's do an explicit fetch on mount to see if it exists.
    const checkExisting = async () => {
      try {
        const res = await fetch(`/api/submissions/${submission.id}/analysis`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.score !== undefined) {
            setAnalysis(data);
            setState('COMPLETED');
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkExisting();
  }, [submission.id, token]);

  useEffect(() => {
    let interval: any;
    if (state === 'ANALYZING') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/submissions/${submission.id}/analysis`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.score !== undefined) {
              setAnalysis(data);
              setState('COMPLETED');
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [state, submission.id, token]);

  const handleAnalyze = async () => {
    setState('ANALYZING');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/submissions/${submission.id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to queue English analysis');
      }
      
      if (data.score !== undefined) {
        setAnalysis(data);
        setState('COMPLETED');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Something went wrong');
      setState('FAILED');
    }
  };

  const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, '') : '';

  return (
    <div style={{ padding: '2rem', border: '1px solid var(--color-border)', borderRadius: '1rem', backgroundColor: 'var(--color-bg-alt)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1.5rem' }}>English / Writing Quality</h2>
      
      {state === 'NOT_STARTED' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Get personalized feedback from our AI English Teacher on your grammar, vocabulary, and sentence structure.</p>
          <button onClick={handleAnalyze} className="btn-pill btn-pill-dark">
            Analyze My Writing
          </button>
        </div>
      )}

      {state === 'ANALYZING' && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }} className="animate-fade-in-up">
          <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
          <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>Analyzing your writing...</p>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            English Teacher is reviewing:<br/>
            ✓ Grammar ✓ Sentence structure ✓ Vocabulary ✓ Natural English
          </p>
        </div>
      )}

      {state === 'FAILED' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>We couldn't analyze your writing right now.</p>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Your story is safely saved. Error: {errorMsg}</p>
          <button onClick={handleAnalyze} className="btn-pill btn-pill-outline">
            Try Again
          </button>
        </div>
      )}

      {state === 'COMPLETED' && analysis && (
        <div className="animate-fade-in-up">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: 600, letterSpacing: '-0.05em' }}>{analysis.score}</span>
            <span style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>/ 100</span>
          </div>

          {analysis.strengths?.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>What You Did Well</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {analysis.strengths.map((s: string, i: number) => (
                  <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--color-success)', display: 'flex', gap: '0.5rem' }}>
                    <span>✓</span> <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.mistakes?.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Mistakes to Fix</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analysis.mistakes.map((m: any, i: number) => (
                  <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                    <div style={{ color: 'var(--color-error)', marginBottom: '0.25rem', textDecoration: 'line-through' }}>
                      ❌ "{stripHtml(m.originalText)}"
                    </div>
                    <div style={{ color: 'var(--color-success)', marginBottom: '0.75rem', fontWeight: 500 }}>
                      ✓ "{stripHtml(m.correction)}"
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      <strong>Why?</strong> {m.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.vocabularyImprovements?.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Vocabulary Improvements</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analysis.vocabularyImprovements.map((v: any, i: number) => (
                  <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                    <div style={{ marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>
                      Original: "{stripHtml(v.originalText)}"
                    </div>
                    <div style={{ marginBottom: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      Better: "{stripHtml(v.betterText)}"
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      <strong>Why:</strong> {v.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {analysis.repetition?.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Repetition & Patterns</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {analysis.repetition.map((r: string, i: number) => (
                  <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--color-warning)', display: 'flex', gap: '0.5rem' }}>
                    <span>⚠</span> <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.learningPoints?.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Personal Learning Points</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Focus on these areas for your next story:</p>
              <ol style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                {analysis.learningPoints.map((p: string, i: number) => (
                  <li key={i} style={{ marginBottom: '0.25rem' }}>{p}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
