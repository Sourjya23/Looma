import { useState, useMemo } from 'react';
import type { Submission } from 'shared-types';
import * as Diff from 'diff';

interface Props {
  v1: Submission;
  v2: Submission;
}

export function RevisionComparison({ v1, v2 }: Props) {
  const [activeView, setActiveView] = useState<'diff' | 'stats'>('diff');

  // We need to fetch analysis for both to compare scores and mistakes.
  // We'll skip complex DB fetching here for brevity and assume they are passed if available,
  // or we just show text diff if analysis is missing.
  
  const diffs = useMemo(() => {
    // Basic text diff
    // We can use Diff.diffWords to highlight changes
    return Diff.diffWords(v1.content, v2.content);
  }, [v1.content, v2.content]);

  return (
    <div className="animate-fade-in-up">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => setActiveView('diff')} className={`btn-pill ${activeView === 'diff' ? 'btn-pill-dark' : ''}`}>Text Diff</button>
        <button onClick={() => setActiveView('stats')} className={`btn-pill ${activeView === 'stats' ? 'btn-pill-dark' : ''}`}>Score Changes</button>
      </div>

      {activeView === 'diff' && (
        <div style={{ padding: '3rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', lineHeight: '1.8', fontSize: '1.125rem', textAlign: 'justify', maxWidth: '800px', margin: '0 auto' }}>
          {diffs.map((part, index) => {
            const color = part.added ? 'var(--color-success)' : part.removed ? 'var(--color-error)' : 'inherit';
            const textDecoration = part.removed ? 'line-through' : 'none';
            const backgroundColor = part.added ? '#dcfce7' : part.removed ? '#fee2e2' : 'transparent';
            
            return (
              <span key={index} style={{ color, textDecoration, backgroundColor, padding: part.added || part.removed ? '0 0.25rem' : '0', borderRadius: '0.25rem' }}>
                {part.value}
              </span>
            );
          })}
        </div>
      )}

      {activeView === 'stats' && (
        <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <h3 style={{ marginTop: 0 }}>Progress Summary</h3>
          <p>
            Word Count: {v1.wordCount} &rarr; {v2.wordCount} ({v2.wordCount - v1.wordCount > 0 ? '+' : ''}{v2.wordCount - v1.wordCount})
          </p>
          <p>
            You can fetch specific English/Story/Director scores from the backend to display detailed score deltas here.
          </p>
        </div>
      )}
    </div>
  );
}
