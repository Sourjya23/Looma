import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export function ReportPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [analyses, setAnalyses] = useState<{ english?: any, story?: any, director?: any }>({});
  const reportRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        // Fetch submission details (we can get it from the session if needed, or create a new endpoint)
        // Since we don't have a getSubmission by ID yet, we fetch session and find it
        // Wait, we need the session ID to fetch session. Let's create a quick endpoint or fetch session if we have sessionId.
        // The user said redirect to `/report/:submissionId`. We need to fetch the submission directly.
        const res = await fetch(`${API_BASE}/sessions/submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          setSubmission(data.data);
          setAnalyses({
            english: data.data.englishAnalysis || null,
            story: data.data.storyAnalysis || null,
            director: data.data.directorAnalysis || null
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    if (submissionId && token) {
      fetchReportData();
    }
  }, [submissionId, token]);

  const handleDownloadPDF = (withStory: boolean) => {
    const element = reportRef.current;
    if (!element) return;
    
    const opt = {
      margin:       0.5,
      filename:     withStory ? `full_report_${submissionId}.pdf` : `feedback_report_${submissionId}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { 
        scale: 2,
        onclone: (clonedDoc: Document) => {
          if (!withStory) {
            const storyNode = clonedDoc.getElementById('report-story-content');
            if (storyNode) storyNode.style.display = 'none';
            const storyWordCount = clonedDoc.getElementById('report-story-wordcount');
            if (storyWordCount) storyWordCount.style.display = 'none';
          }
        }
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save()
      .then(() => toast.success('PDF downloaded successfully'))
      .catch(() => toast.error('Failed to download PDF'));
  };

  const handleCopyStory = async () => {
    if (submission?.content) {
      // Strip HTML tags for clean clipboard text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = submission.content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      try {
        await navigator.clipboard.writeText(plainText);
        setCopySuccess(true);
        toast.success('Story copied to clipboard!');
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        toast.error('Failed to copy story');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--color-text-muted)' }}>Generating comprehensive report...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
        <p style={{ color: 'var(--color-error)' }}>Submission not found</p>
        <button onClick={() => navigate('/dashboard')} className="btn-pill btn-pill-dark">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--color-border)', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>AI Feedback Report</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem' }}>{submission.title || 'Untitled Story'}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate(`/summary/${submission.sessionId}`)} className="btn-pill btn-pill-outline">
            Back to Summary
          </button>
          <button onClick={handleCopyStory} className="btn-pill btn-pill-outline">
            {copySuccess ? 'Copied!' : 'Copy Story'}
          </button>
          <button onClick={() => handleDownloadPDF(false)} className="btn-pill btn-pill-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Plain Report
          </button>
          <button onClick={() => handleDownloadPDF(true)} className="btn-pill btn-pill-dark" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Report + Story
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div ref={reportRef} style={{ width: '100%', maxWidth: '1300px', backgroundColor: '#fff', padding: '3rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>{submission.title || 'Your Story'}</h1>
          <div id="report-story-wordcount" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '3rem' }}>
            <span>{submission.wordCount} words</span>
          </div>

          {analyses.english?.mistakes?.length > 0 && (
            <div style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Highlights Guide</h3>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="mistake-highlight" style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 100 100'%3E%3Cpath d='M 5,50 C 5,15 95,15 95,50 C 95,85 5,85 5,50 C 5,40 20,30 35,30' fill='none' stroke='%23F43F5E' stroke-width='2' vector-effect='non-scaling-stroke' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', padding: '0.2rem 0.4rem', margin: '0 -0.2rem'
                  }}>Grammar</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="mistake-highlight" style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 100 100'%3E%3Cpath d='M 0,85 Q 12.5,70 25,85 T 50,85 T 75,85 T 100,85' fill='none' stroke='%233B82F6' stroke-width='2.5' vector-effect='non-scaling-stroke' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', padding: '0.2rem 0.4rem', margin: '0 -0.2rem'
                  }}>Spelling</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="mistake-highlight" style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 100 100'%3E%3Cpath d='M 2,85 L 98,82 M 5,95 L 95,92' fill='none' stroke='%23F59E0B' stroke-width='2.5' vector-effect='non-scaling-stroke' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', padding: '0.2rem 0.4rem', margin: '0 -0.2rem'
                  }}>Word Choice</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="mistake-highlight" style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 100 100'%3E%3Cpath d='M -5,80 L 105,75' fill='none' stroke='%2310B981' stroke-width='35' stroke-linecap='round' opacity='0.4'/%3E%3C/svg%3E")`,
                    backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', padding: '0.2rem 0.4rem', margin: '0 -0.2rem'
                  }}>Other Issues</span>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>💡 Hover over any highlighted text in your story below to see detailed AI feedback.</p>
            </div>
          )}

          <div 
            id="report-story-content"
            style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--color-text-primary)', textAlign: 'justify', marginBottom: '4rem' }}
            dangerouslySetInnerHTML={{ __html: (() => {
              if (!submission?.content) return 'No content found.';
              let content = submission.content;
              const mistakes = analyses.english?.mistakes || [];
              const sortedMistakes = [...mistakes].sort((a: any, b: any) => (b.originalText?.length || 0) - (a.originalText?.length || 0));
              
              sortedMistakes.forEach((mistake: any) => {
                if (!mistake.originalText || mistake.originalText.length < 3) return;
                // Escape regex special chars
                let escapedText = mistake.originalText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Normalize smart quotes: match both straight and curly forms
                // Rich text editor saves curly quotes, but AI returns straight ones
                escapedText = escapedText.replace(/'/g, "['\u2018\u2019]");
                escapedText = escapedText.replace(/"/g, '["\u201C\u201D]');
                // Make spaces flexible to handle HTML spacing (nbsp, br tags, etc.)
                escapedText = escapedText.replace(/\s+/g, '(?:\\s|&nbsp;|<br\\s*/?>|<[^>]+>)*\\s*(?:\\s|&nbsp;|<br\\s*/?>)*');
                const regex = new RegExp(`(${escapedText})`, 'gi'); 
                
                let bgImage = '';
                if (mistake.category === 'grammar') {
                  bgImage = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 100 100'%3E%3Cpath d='M 5,50 C 5,15 95,15 95,50 C 95,85 5,85 5,50 C 5,40 20,30 35,30' fill='none' stroke='%23F43F5E' stroke-width='2' vector-effect='non-scaling-stroke' stroke-linecap='round'/%3E%3C/svg%3E")`;
                } else if (mistake.category === 'spelling') {
                  bgImage = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 100 100'%3E%3Cpath d='M 0,85 Q 12.5,70 25,85 T 50,85 T 75,85 T 100,85' fill='none' stroke='%233B82F6' stroke-width='2.5' vector-effect='non-scaling-stroke' stroke-linecap='round'/%3E%3C/svg%3E")`;
                } else if (mistake.category === 'word_choice') {
                  bgImage = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 100 100'%3E%3Cpath d='M 2,85 L 98,82 M 5,95 L 95,92' fill='none' stroke='%23F59E0B' stroke-width='2.5' vector-effect='non-scaling-stroke' stroke-linecap='round'/%3E%3C/svg%3E")`;
                } else {
                  bgImage = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 100 100'%3E%3Cpath d='M -5,80 L 105,75' fill='none' stroke='%2310B981' stroke-width='35' stroke-linecap='round' opacity='0.4'/%3E%3C/svg%3E")`;
                }
                
                content = content.replace(regex, `<span class="mistake-highlight" style="background-image: ${bgImage}; background-size: 100% 100%; background-repeat: no-repeat; color: inherit; cursor: help; padding: 0.2rem 0.4rem; margin: 0 -0.2rem; display: inline-block; transition: all 0.2s ease;" title="Category: ${mistake.category}&#10;Correction: ${mistake.correction}&#10;Why: ${mistake.explanation}" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">$1</span>`);
              });
              return content;
            })() }}
          />

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '3rem 0' }} />

          {analyses.english && (
            <section style={{ marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>English Teacher Analysis</h2>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>
                Score: <span style={{ color: 'var(--color-primary)' }}>{analyses.english.score}/100</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {analyses.english.strengths?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>What You Did Well</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {analyses.english.strengths.map((s: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--color-success)', display: 'flex', gap: '0.5rem' }}>
                          <span>✓</span> <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyses.english.mistakes?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Mistakes to Fix</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {analyses.english.mistakes.map((m: any, i: number) => (
                        <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                          <div style={{ color: 'var(--color-error)', marginBottom: '0.25rem', textDecoration: 'line-through' }}>
                            ❌ "{m.originalText?.replace(/<[^>]+>/g, '')}"
                          </div>
                          <div style={{ color: 'var(--color-success)', marginBottom: '0.75rem', fontWeight: 500 }}>
                            ✓ "{m.correction?.replace(/<[^>]+>/g, '')}"
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            <strong>Why?</strong> {m.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analyses.english.vocabularyImprovements?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Vocabulary Improvements</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {analyses.english.vocabularyImprovements.map((v: any, i: number) => (
                        <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                          <div style={{ marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>
                            Original: "{v.originalText?.replace(/<[^>]+>/g, '')}"
                          </div>
                          <div style={{ marginBottom: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                            Better: "{v.betterText?.replace(/<[^>]+>/g, '')}"
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            <strong>Why:</strong> {v.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analyses.english.repetition?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Repetition & Patterns</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {analyses.english.repetition.map((r: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--color-warning)', display: 'flex', gap: '0.5rem' }}>
                          <span>⚠</span> <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {analyses.english.learningPoints?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Personal Learning Points</h3>
                    <ol style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                      {analyses.english.learningPoints.map((p: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{p}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </section>
          )}

          {analyses.story && (
            <section style={{ marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: '#16a34a', borderBottom: '2px solid #16a34a', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Story Editor Analysis</h2>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>
                Score: <span style={{ color: '#16a34a' }}>{analyses.story.overallScore}/100</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Concept</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16a34a' }}>{analyses.story.conceptScore}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Characters</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16a34a' }}>{analyses.story.characterScore}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Conflict</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16a34a' }}>{analyses.story.conflictScore}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Pacing</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16a34a' }}>{analyses.story.pacingScore}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Creativity</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16a34a' }}>{analyses.story.creativityScore}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Ending</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16a34a' }}>{analyses.story.endingScore}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {analyses.story.strengths?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>What Worked Well</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {analyses.story.strengths.map((s: any, i: number) => (
                        <li key={i} style={{ marginBottom: '1rem', color: 'var(--color-success)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                          <span style={{ marginTop: '0.125rem' }}>✓</span> 
                          <div>
                            <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>{s.point}</strong>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{s.reasoning}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyses.story.problems?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Areas for Improvement</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {analyses.story.problems.map((p: any, i: number) => (
                        <div key={i} style={{ padding: '1rem', backgroundColor: '#fff1f2', borderRadius: '0.5rem', border: '1px solid #fecdd3' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#be123c', textTransform: 'capitalize' }}>{p.category} Issue ({p.severity})</strong>
                            <span style={{ fontSize: '0.75rem', backgroundColor: '#fecdd3', padding: '0.125rem 0.5rem', borderRadius: '999px', color: '#be123c' }}>{p.location}</span>
                          </div>
                          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}><strong>Problem:</strong> {p.problem}</p>
                          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}><strong>Why it matters:</strong> {p.whyItMatters}</p>
                          <p style={{ margin: '0', color: '#16a34a', fontSize: '0.875rem', fontWeight: 500 }}><strong>Suggestion:</strong> {p.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analyses.story.suggestions?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Actionable Suggestions</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {analyses.story.suggestions.map((s: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                          <span style={{ color: '#16a34a' }}>💡</span> <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {analyses.story.metaEvaluation && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Meta Evaluation</h3>
                    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div><strong>Challenge Alignment:</strong> {analyses.story.metaEvaluation.challengeAlignment}</div>
                      <div><strong>Target Audience:</strong> {analyses.story.metaEvaluation.targetAudience}</div>
                      <div><strong>Genre Identification:</strong> {analyses.story.metaEvaluation.genreIdentification}</div>
                      <div><strong>Boredom Flaws:</strong> {analyses.story.metaEvaluation.boredomFlaws}</div>
                      <div><strong>Context Continuity:</strong> {analyses.story.metaEvaluation.contextContinuity}</div>
                      <div><strong>Sequel Potential:</strong> {analyses.story.metaEvaluation.sequelPotential}</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {analyses.director && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: '#9333ea', borderBottom: '2px solid #9333ea', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Director AI Analysis</h2>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>
                Score: <span style={{ color: '#9333ea' }}>{analyses.director.overallScore}/100</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Visual Storytelling</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#9333ea' }}>{analyses.director.visualStorytellingScore}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Scene Construction</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#9333ea' }}>{analyses.director.sceneConstructionScore}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Show, Don't Tell</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#9333ea' }}>{analyses.director.showDontTellScore}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Cinematic Potential</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#9333ea' }}>{analyses.director.cinematicPotentialScore}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {analyses.director.strengths?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Cinematic Strengths</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {analyses.director.strengths.map((s: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.5rem', color: 'var(--color-success)', display: 'flex', gap: '0.5rem' }}>
                          <span>✓</span> <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyses.director.problems?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Missed Opportunities</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {analyses.director.problems.map((p: any, i: number) => (
                        <div key={i} style={{ padding: '1rem', backgroundColor: '#fff7ed', borderRadius: '0.5rem', border: '1px solid #fed7aa' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#c2410c', textTransform: 'capitalize' }}>{p.category} ({p.severity})</strong>
                            <span style={{ fontSize: '0.75rem', backgroundColor: '#fed7aa', padding: '0.125rem 0.5rem', borderRadius: '999px', color: '#c2410c' }}>{p.location}</span>
                          </div>
                          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}><strong>Problem:</strong> {p.problem}</p>
                          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}><strong>Why it matters:</strong> {p.whyItMatters}</p>
                          <p style={{ margin: '0', color: '#9333ea', fontSize: '0.875rem', fontWeight: 500 }}><strong>Suggestion:</strong> {p.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analyses.director.suggestions?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Director's Notes</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {analyses.director.suggestions.map((s: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                          <span style={{ color: '#9333ea' }}>🎬</span> <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
