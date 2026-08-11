import { useState, useEffect } from 'react';
import type { Submission } from 'shared-types';
import { API_BASE } from '@/lib/api';

interface StoryFeedbackProps {
  submission: Submission;
  token: string;
}

type AIState = 'NOT_STARTED' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export function StoryFeedback({ submission, token }: StoryFeedbackProps) {
  const [state, setState] = useState<AIState>('NOT_STARTED');
  const [analysis, setAnalysis] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await fetch(`${API_BASE}/submissions/${submission.id}/story-analysis`, {
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
          const res = await fetch(`${API_BASE}/submissions/${submission.id}/story-analysis`, {
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
      const res = await fetch(`${API_BASE}/submissions/${submission.id}/analyze-story`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to queue story analysis');
      }
      
      if (data.overallScore !== undefined) {
        // Fallback if somehow it processed synchronously
        setAnalysis(data);
        setState('COMPLETED');
      }
      // If queued: true, the useEffect polling will pick it up
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Something went wrong');
      setState('FAILED');
    }
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return '#ef4444';
    if (severity === 'medium') return '#f59e0b';
    return '#6b7280';
  };

  const getSeverityBg = (severity: string) => {
    if (severity === 'high') return 'rgba(239, 68, 68, 0.08)';
    if (severity === 'medium') return 'rgba(245, 158, 11, 0.08)';
    return 'rgba(107, 114, 128, 0.08)';
  };

  return (
    <div style={{ padding: '2rem', border: '1px solid var(--color-border)', borderRadius: '1rem', backgroundColor: 'var(--color-bg-alt)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1.5rem' }}>Story Editor</h2>
      
      {state === 'NOT_STARTED' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Get deep structural feedback on your plot, pacing, characters, and storytelling.</p>
          <button onClick={handleAnalyze} className="btn-pill btn-pill-dark">
            Get Director's Feedback
          </button>
        </div>
      )}

      {state === 'ANALYZING' && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }} className="animate-fade-in-up">
          <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
          <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>Analyzing your story...</p>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Story Editor is evaluating:<br/>
            ✓ Concept ✓ Character ✓ Conflict ✓ Pacing ✓ Creativity ✓ Ending ✓ Visual Storytelling
          </p>
        </div>
      )}

      {state === 'FAILED' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>We couldn't analyze your story right now.</p>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Your story is safely saved. Error: {errorMsg}</p>
          <button onClick={handleAnalyze} className="btn-pill btn-pill-outline">
            Try Again
          </button>
        </div>
      )}

      {state === 'COMPLETED' && analysis && (
        <div className="animate-fade-in-up">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* SCORECARD */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <span style={{ fontSize: '3rem', fontWeight: 600, letterSpacing: '-0.05em' }}>{analysis.overallScore}</span>
                <span style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>/ 100</span>
                <div style={{ color: 'var(--color-text-secondary)' }}>Overall Story Score</div>
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Concept</span> <strong>{analysis.conceptScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Character</span> <strong>{analysis.characterScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Conflict</span> <strong>{analysis.conflictScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pacing</span> <strong>{analysis.pacingScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Creativity</span> <strong>{analysis.creativityScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ending</span> <strong>{analysis.endingScore}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Visual</span> <strong>{analysis.visualStorytellingScore}</strong></div>
              </div>
            </div>

            {/* STRENGTHS — structured with reasoning */}
            {analysis.strengths?.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success)' }}>💪</span> What works
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {analysis.strengths.map((s: any, i: number) => (
                    <div key={i} style={{ padding: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.05)', borderRadius: '0.5rem', borderLeft: '3px solid var(--color-success)' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                        {typeof s === 'string' ? s : s.point}
                      </div>
                      {typeof s !== 'string' && s.reasoning && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {s.reasoning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROBLEMS — with severity-coded cards */}
            {analysis.problems?.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>What needs attention</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {analysis.problems.map((p: any, i: number) => (
                    <div key={i} style={{ padding: '1.25rem', backgroundColor: getSeverityBg(p.severity), borderRadius: '0.5rem', borderLeft: `3px solid ${getSeverityColor(p.severity)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <strong style={{ textTransform: 'capitalize', color: getSeverityColor(p.severity), fontSize: '0.875rem' }}>
                          {p.category} — {p.severity} severity
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{p.location}</span>
                      </div>
                      
                      <div style={{ marginBottom: '0.75rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                        <strong>Problem:</strong> {p.problem}
                      </div>
                      
                      <div style={{ marginBottom: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                        <strong>Why it matters:</strong> {p.whyItMatters}
                      </div>

                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', padding: '0.75rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: '0.25rem', lineHeight: 1.5 }}>
                        <strong>💡 Suggestion:</strong> {p.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* META ANALYSIS */}
            {analysis.metaEvaluation && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎯</span> Meta Analysis
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>Challenge Alignment</strong>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{analysis.metaEvaluation.challengeAlignment}</span>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>Target Audience</strong>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{analysis.metaEvaluation.targetAudience}</span>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>Genre Profile</strong>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{analysis.metaEvaluation.genreIdentification}</span>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b' }}>Boredom Flaws</strong>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{analysis.metaEvaluation.boredomFlaws}</span>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Context Continuity</strong>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{analysis.metaEvaluation.contextContinuity}</span>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-success)' }}>Sequel Potential</strong>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{analysis.metaEvaluation.sequelPotential}</span>
                  </div>
                </div>
              </div>
            )}

            {/* OVERALL SUGGESTIONS */}
            {analysis.suggestions?.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Overall Suggestions</h3>
                <ol style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                  {analysis.suggestions.map((p: string, i: number) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>{p}</li>
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
