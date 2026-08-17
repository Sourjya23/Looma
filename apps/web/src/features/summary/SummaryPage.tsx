import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import toast from 'react-hot-toast';
import type { WritingSession, Challenge, Submission } from 'shared-types';
import { API_BASE } from '@/lib/api';

type SessionComplete = WritingSession & { challenge?: Challenge; submissions?: Submission[] };

export function SummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<SessionComplete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeVersion, setActiveVersion] = useState<number>(1);
  const [analysisState, setAnalysisState] = useState<'IDLE' | 'ANALYZING' | 'COMPLETED'>('IDLE');
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      if (!token || !sessionId) return;
      
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && data.data.status === 'submitted') {
          setSession(data.data);
          const subs = data.data.submissions || [];
          if (subs.length > 0) {
            setActiveVersion(subs[subs.length - 1].version);
          }
        } else if (data.success) {
          setError('This session has not been submitted yet.');
        } else {
          setError('Failed to load session summary');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, token]);

  useEffect(() => {
    let interval: any;
    const checkStatus = async () => {
      if (!session || !token) return;
      const subs = session.submissions || [];
      const currentSub = subs.find(s => s.version === activeVersion) || subs[subs.length - 1];
      if (!currentSub) return;
      
      try {
        const res = await fetch(`${API_BASE}/submissions/${currentSub.id}/analysis-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const { english, story, director } = data.data;
          if (english && story && director) {
            setAnalysisState('COMPLETED');
            if (interval) clearInterval(interval);
          } else if (english || story || director) {
            setAnalysisState('ANALYZING');
          } else {
            setAnalysisState(prev => prev === 'ANALYZING' ? 'ANALYZING' : 'IDLE');
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (session && token) {
      setCheckingStatus(true);
      checkStatus();
    }

    if (analysisState === 'ANALYZING') {
      interval = setInterval(checkStatus, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [session, activeVersion, token, analysisState]);

  const handleAnalyzeAll = async () => {
    const subs = session?.submissions || [];
    const currentSub = subs.find(s => s.version === activeVersion) || subs[subs.length - 1];
    if (!currentSub) return;

    setAnalysisState('ANALYZING');
    try {
      await fetch(`${API_BASE}/submissions/${currentSub.id}/analyze-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('AI analysis started!');
      // Polling will handle the rest via useEffect
    } catch (e) {
      console.error(e);
      toast.error('Failed to start AI analysis');
      setAnalysisState('IDLE');
    }
  };

  const handleViewReport = () => {
    const subs = session?.submissions || [];
    const currentSub = subs.find(s => s.version === activeVersion) || subs[subs.length - 1];
    if (currentSub) {
      navigate(`/report/${currentSub.id}`);
    }
  };

  const handleCopyStory = async () => {
    const subs = session?.submissions || [];
    const currentSub = subs.find(s => s.version === activeVersion) || subs[subs.length - 1];
    if (currentSub?.content) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentSub.content;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      
      try {
        await navigator.clipboard.writeText(text);
        toast.success('Story copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy story');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading summary...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
        <p style={{ color: 'var(--color-error)' }}>{error || 'Session not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-pill btn-pill-dark">Back to Dashboard</button>
      </div>
    );
  }

  // Calculate stats based on the last submission
  const submissions = session.submissions || [];
  const finalSubmission = submissions.find(s => s.version === activeVersion) || submissions[submissions.length - 1];
  const wordCount = finalSubmission?.wordCount || 0;
  const hasMultipleVersions = submissions.length > 1;
  const previousSubmission = activeVersion > 1 ? submissions.find(s => s.version === activeVersion - 1) : null;
  
  // time spent in minutes
  const activeMinutes = session.activeTime > 0 ? (session.activeTime / 60) : 1;
  const wpm = Math.round(wordCount / activeMinutes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <main className="section-container animate-fade-in-up" style={{ flex: 1, paddingTop: 'clamp(2rem, 4vw, 4rem)', paddingBottom: 'clamp(4rem, 8vw, 6rem)', width: '100%' }}>
        <p className="eyebrow" style={{ color: 'var(--color-text-primary)' }}>Writing History</p>
        
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, letterSpacing: '-0.04em', marginBottom: '1rem', lineHeight: 1.1 }}>
          {session.title || (session.challenge?.prompt ? `"${session.challenge.prompt}"` : 'Your Story')}
        </h1>
        
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
          <span>{new Date(finalSubmission?.submittedAt || session.completedAt || '').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>•</span>
          <span style={{ fontWeight: 600 }}>Version {activeVersion}</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
          <button onClick={() => navigate('/dashboard')} className="btn-pill" style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)' }}>
            Back to Dashboard
          </button>
          <button 
            onClick={() => navigate(`/revise/${sessionId}`, { state: { version: activeVersion } })} 
            className="btn-pill btn-pill-dark"
          >
            Revise Story
          </button>
        </div>

        {hasMultipleVersions && (
          <div style={{ marginBottom: '3rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {submissions.map(sub => (
              <button
                key={sub.id}
                onClick={() => { setActiveVersion(sub.version); }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '1rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: sub.version === activeVersion ? 'var(--color-text-primary)' : 'var(--color-border)',
                  backgroundColor: sub.version === activeVersion ? 'var(--color-text-primary)' : 'transparent',
                  color: sub.version === activeVersion ? '#fff' : 'var(--color-text-primary)',
                  transition: 'all 0.2s'
                }}
              >
                Version {sub.version}
              </button>
            ))}
          </div>
        )}
        
        {session.challenge && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Challenge</h2>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                  {session.challenge.genre}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-border)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                  {session.challenge.difficulty}
                </span>
              </div>
              <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>{session.challenge.prompt}</p>
              {session.challenge.constraint && (
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Constraint:</h3>
                  <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem' }}>{session.challenge.constraint}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Your Story</h2>
          <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div 
              className="story-content"
              style={{ lineHeight: 1.8, fontSize: '1.125rem', color: 'var(--color-text-primary)' }}
              dangerouslySetInnerHTML={{ __html: finalSubmission?.content || 'No content found.' }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
          <div className="feature-card" style={{ padding: '2rem' }}>
            <div className="stat-label" style={{ marginBottom: '0.5rem' }}>Words Written</div>
            <div className="stat-number">{wordCount}</div>
            {session.wordTarget && (
              <div style={{ fontSize: '0.875rem', color: 'var(--color-success)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Target: {session.wordTarget}
              </div>
            )}
          </div>
          
          <div className="feature-card" style={{ padding: '2rem' }}>
            <div className="stat-label" style={{ marginBottom: '0.5rem' }}>Time Spent</div>
            <div className="stat-number">{Math.floor(session.activeTime / 60)}m {session.activeTime % 60}s</div>
            {session.targetTime > 0 && (
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Target: {Math.floor(session.targetTime / 60)}m
              </div>
            )}
          </div>
          
          <div className="feature-card" style={{ padding: '2rem' }}>
            <div className="stat-label" style={{ marginBottom: '0.5rem' }}>Words Per Minute</div>
            <div className="stat-number">{wpm} <span style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>WPM</span></div>
          </div>
        </div>

        {finalSubmission && (
          <div style={{ marginTop: '4rem', padding: '3rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>AI Feedback & Report</h2>
            
            {checkingStatus ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
                 <div className="spinner"></div>
                 <p style={{ color: 'var(--color-text-muted)' }}>Checking analysis status...</p>
               </div>
            ) : analysisState === 'COMPLETED' ? (
              <div>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
                  Your story has been fully analyzed by the English Teacher, Story Editor, and Director AI.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={handleViewReport} className="btn-pill btn-pill-dark">View Comprehensive Report</button>
                  <button onClick={handleCopyStory} className="btn-pill btn-pill-outline">Copy Story</button>
                </div>
              </div>
            ) : analysisState === 'ANALYZING' ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
                 <div className="spinner"></div>
                 <p style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>AI is reading your story...</p>
                 <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>This usually takes about 7-10 seconds. Please wait.</p>
               </div>
            ) : (
              <div>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
                  Get detailed feedback from three different AI perspectives to improve your writing.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={handleAnalyzeAll} className="btn-pill btn-pill-primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                    Analyze My Writing
                  </button>
                  <button onClick={handleCopyStory} className="btn-pill btn-pill-outline">Copy Story</button>
                </div>
              </div>
            )}
            
            {previousSubmission && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
                <button 
                  onClick={() => navigate(`/revise/${sessionId}`, { state: { version: activeVersion } })}
                  className="btn-pill btn-pill-outline"
                >
                  Compare with Previous Version
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
