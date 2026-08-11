import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useAuth } from '../auth/AuthContext';
import type { WritingSession, Submission } from 'shared-types';
import { API_BASE } from '@/lib/api';

export function RevisionEditorPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState<WritingSession | null>(null);
  const [parentSubmission, setParentSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [fontFamily, setFontFamily] = useState("'Courier New', Courier, monospace");

  const initialDraft = session?.draftRevisionContent || parentSubmission?.content || '';

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your revision...',
      }),
    ],
    content: initialDraft,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    },
  });

  // Re-inject content if it was loaded late
  useEffect(() => {
    if (editor && initialDraft && editor.isEmpty) {
      editor.commands.setContent(initialDraft);
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    }
  }, [editor, initialDraft]);

  useEffect(() => {
    const fetchSession = async () => {
      if (!token || !sessionId) return;
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          setSession(data.data);
          
          // Get the version passed from summary page or default to latest
          const targetVersion = location.state?.version;
          const submissions = data.data.submissions || [];
          let targetSub = submissions[submissions.length - 1]; // default latest
          
          if (targetVersion) {
            const found = submissions.find((s: Submission) => s.version === targetVersion);
            if (found) targetSub = found;
          }
          
          setParentSubmission(targetSub);
        } else {
          setError('Failed to load session');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId, token, location.state]);

  // Autosave
  useEffect(() => {
    if (!editor || !token || !sessionId) return;
    
    const interval = setInterval(async () => {
      const content = editor.getHTML();
      // Skip if nothing changed from what we have
      if (content === '<p></p>' || content === session?.draftRevisionContent) return;
      
      try {
        await fetch(`${API_BASE}/sessions/${sessionId}/autosave-revision`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content })
        });
      } catch (e) {
        console.error('Autosave failed', e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [editor, token, sessionId, session?.draftRevisionContent]);

  const handleSubmit = async () => {
    if (!editor || !token || !sessionId || !parentSubmission) return;
    setSaving(true);
    
    try {
      const content = editor.getHTML();
      const text = editor.getText();
      const characterCount = text.length;

      const res = await fetch(`${API_BASE}/sessions/${sessionId}/submit-revision`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          wordCount,
          characterCount,
          activeWritingTime: 0,
          parentSubmissionId: parentSubmission.id
        })
      });
      
      const data = await res.json();
      if (data.success) {
        navigate(`/summary/${sessionId}`);
      } else {
        alert('Failed to submit revision: ' + data.message);
      }
    } catch (e) {
      alert('Error submitting revision');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading editor...</div>;
  if (error || !session || !parentSubmission) return <div style={{ padding: '2rem', color: 'red' }}>{error || 'Not found'}</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>REVISING: {session.title || 'Draft'}</h1>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Revising from Version {parentSubmission.version}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={fontFamily} 
            onChange={(e) => setFontFamily(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', outline: 'none' }}
          >
            <option value="'Courier New', Courier, monospace">Courier New</option>
            <option value="'Times New Roman', Times, serif">Times New Roman</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Inter, system-ui, sans-serif">Inter</option>
          </select>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {wordCount} words
          </div>
          <button onClick={() => navigate(`/summary/${sessionId}`)} className="btn-pill" style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-pill btn-pill-dark">
            {saving ? 'Submitting...' : 'Submit Revision'}
          </button>
        </div>
      </div>

      {/* Editor Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT PANE - V1 Read Only */}
        <div style={{ padding: '2rem', overflowY: 'auto', borderRight: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Original Story (Version {parentSubmission.version})
          </div>
          <div 
            style={{ fontFamily: fontFamily, color: 'var(--color-text-primary)', lineHeight: '1.7', fontSize: '1.125rem' }} 
            dangerouslySetInnerHTML={{ __html: parentSubmission.content }} 
          />
        </div>

        {/* RIGHT PANE - V2 Editor */}
        <div style={{ padding: '2rem', overflowY: 'auto', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Your Revision
          </div>
          <div style={{ maxWidth: '800px', margin: '0 auto', minHeight: '100%', cursor: 'text' }}>
             <EditorContent editor={editor} style={{ fontFamily: fontFamily, minHeight: '100%', fontSize: '1.125rem', lineHeight: '1.7', color: 'var(--color-text-primary)' }} />
          </div>
        </div>

      </div>
    </div>
  );
}
