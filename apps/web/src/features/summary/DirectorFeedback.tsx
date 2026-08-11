import { useState, useEffect } from 'react';
import type { Submission } from 'shared-types';

interface DirectorFeedbackProps {
  submission: Submission;
  token: string;
}

type AIState = 'NOT_STARTED' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export function DirectorFeedback({ submission, token }: DirectorFeedbackProps) {
  const [state, setState] = useState<AIState>('NOT_STARTED');
  const [analysis, setAnalysis] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await fetch(`/api/submissions/${submission.id}/director-analysis`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.overallScore !== undefined) {
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
          const res = await fetch(`/api/submissions/${submission.id}/director-analysis`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.overallScore !== undefined) {
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
      const res = await fetch(`/api/submissions/${submission.id}/analyze-director`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to queue director analysis');
      }
      
      if (data.overallScore !== undefined) {
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
      <h2 style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1.5rem' }}>Director AI</h2>
      
      {state === 'NOT_STARTED' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Get visual, cinematic feedback. Is your story showing or telling?</p>
          <button onClick={handleAnalyze} className="btn-pill btn-pill-dark">
            Get Director's Feedback
          </button>
        </div>
      )}

      {state === 'ANALYZING' && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }} className="animate-fade-in-up">
          <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
          <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>Analyzing your visual storytelling...</p>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            The Director is looking at:<br/>
            ✓ Visuals ✓ Scene Construction ✓ Show vs Tell ✓ Cinematic Potential
          </p>
        </div>
      )}

      {state === 'FAILED' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>We couldn't analyze your visual storytelling right now.</p>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Your story is safely saved. Error: {errorMsg}</p>
          <button onClick={handleAnalyze} className="btn-pill btn-pill-outline">
            Try Again
          </button>
        </div>
      )}

      {state === 'COMPLETED' && analysis && (
        <div className="animate-fade-in-up">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '3rem', fontWeight: 600, letterSpacing: '-0.05em' }}>{analysis.overallScore}</span>
                <span style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>/ 100</span>
                <div style={{ color: 'var(--color-text-secondary)' }}>Overall Visual Score</div>
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Visual Storytelling</span> <strong>{analysis.visualStorytellingScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Scene Construction</span> <strong>{analysis.sceneConstructionScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Show vs Tell</span> <strong>{analysis.showDontTellScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cinematic Potential</span> <strong>{analysis.cinematicPotentialScore}</strong></div>
              </div>
            </div>

            {analysis.strengths?.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Cinematic Strengths</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {analysis.strengths.map((s: string, i: number) => (
                    <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--color-success)', display: 'flex', gap: '0.5rem' }}>
                      <span>✓</span> <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.problems?.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Visual Opportunities</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {analysis.problems.map((p: any, i: number) => (
                    <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ textTransform: 'capitalize', color: 'var(--color-warning)' }}>{p.category.replace(/_/g, ' ')} — {p.severity} severity</strong>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{stripHtml(p.location)}</span>
                      </div>
                      
                      <div style={{ marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
                        <strong>Problem:</strong> {stripHtml(p.problem)}
                      </div>
                      
                      <div style={{ marginBottom: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        <strong>Why it matters:</strong> {stripHtml(p.whyItMatters)}
                      </div>

                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', padding: '0.75rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: '0.25rem' }}>
                        <strong>Suggestion:</strong> {stripHtml(p.suggestion)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.suggestions?.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Director's Notes</h3>
                <ol style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                  {analysis.suggestions.map((p: string, i: number) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{p}</li>
                  ))}
                </ol>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
