import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import type { WritingSession, Challenge } from 'shared-types';
import { API_BASE } from '@/lib/api';

type SessionWithChallenge = WritingSession & { challenge?: Challenge };

export function WritingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionWithChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // Customization states
  const [title, setTitle] = useState('');
  const [fontSize, setFontSize] = useState(17); // Default 17px
  const [fontFamily, setFontFamily] = useState("'Courier New', Courier, monospace");
  const [fontSizeIndicator, setFontSizeIndicator] = useState<{ size: number; id: number } | null>(null);
  const [isBoldMode, setIsBoldMode] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  // Realtime Keystroke Display
  const [lastKeystroke, setLastKeystroke] = useState<{ char: string; id: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your story here...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
      setIsBoldMode(editor.isActive('bold'));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg focus:outline-none max-w-none'
      }
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;

      // Ignore modifier keys and control keys for the keystroke display
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setLastKeystroke({ char: e.key, id: Date.now() });
      } else if (e.key === 'Backspace') {
        setLastKeystroke({ char: '⌫', id: Date.now() });
      } else if (e.key === 'Enter') {
        setLastKeystroke({ char: '↵', id: Date.now() });
      } else if (e.key === ' ') {
        setLastKeystroke({ char: '␣', id: Date.now() });
      }

      // Play deep thock sound (Holy Panda) on ANY keystroke
      if (!e.metaKey) {
        const soundId = Math.floor(Math.random() * 5) + 1; // 1 to 5
        const audio = new Audio(`/holy_panda/${soundId}.wav`);
        audio.volume = 0.7;
        audio.playbackRate = 0.9; // Lower pitch = deeper thock
        audio.play().catch(() => { });
      }

      // Feature: ESC to toggle bold
      if (e.key === 'Escape') {
        if (editor) {
          editor.chain().focus().toggleBold().run();
          setIsBoldMode(editor.isActive('bold'));
        }
      }

      // Feature: Cmd + Up / Cmd + Down to change font size
      if (e.metaKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setFontSize(prev => {
          const newSize = Math.min(prev + 1, 72);
          setFontSizeIndicator({ size: newSize, id: Date.now() });
          return newSize;
        });
      } else if (e.metaKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setFontSize(prev => {
          const newSize = Math.max(prev - 1, 10);
          setFontSizeIndicator({ size: newSize, id: Date.now() });
          return newSize;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isPaused, editor]);

  const [targetMarkerInserted, setTargetMarkerInserted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateElapsed = (sessionData: any) => {
    if (!sessionData.startedAt) return 0;

    const start = new Date(sessionData.startedAt).getTime();
    let end = Date.now();
    if (sessionData.status === 'submitted' && sessionData.completedAt) {
      end = new Date(sessionData.completedAt).getTime();
    }

    let totalElapsed = (end - start) / 1000;

    if (sessionData.pauseEvents) {
      for (const pause of sessionData.pauseEvents) {
        const pauseStart = new Date(pause.pausedAt).getTime();
        const pauseEnd = pause.resumedAt ? new Date(pause.resumedAt).getTime() : end;
        totalElapsed -= (pauseEnd - pauseStart) / 1000;
      }
    }

    return Math.max(0, Math.floor(totalElapsed));
  };

  // Fetch Session
  useEffect(() => {
    const initSession = async () => {
      if (!token || !sessionId) return;

      try {
        let res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        let data = await res.json();

        if (data.success) {
          let sessionData = data.data;

          if (sessionData.status === 'idle') {
            const startRes = await fetch(`${API_BASE}/sessions/${sessionId}/start`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}` }
            });
            const startData = await startRes.json();
            if (startData.success) {
              sessionData = startData.data;
            }
          }

          setSession(sessionData);
          setTitle((sessionData as any).title || '');
          setIsPaused(sessionData.status === 'paused');

          if (sessionData.draftContent && editor && editor.isEmpty) {
            editor.commands.setContent(sessionData.draftContent);
          }

          const elapsed = calculateElapsed(sessionData);
          setElapsedTime(elapsed);

          if (sessionData.targetTime) {
            setTimeLeft(Math.max(0, sessionData.targetTime - elapsed));
          }
        } else {
          setError('Failed to load session');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    if (editor) {
      initSession();
    }
  }, [sessionId, token, editor]); // wait for editor to be ready

  // Timer Logic
  useEffect(() => {
    if (isPaused || !session) return;

    const timer = setInterval(() => {
      setElapsedTime(prev => {
        const next = prev + 1;
        if (session.targetTime > 0 && next === session.targetTime && !targetMarkerInserted) {
          editor?.commands.insertContent('<p class="time-marker">──────── TARGET TIME REACHED ────────</p><p></p>');
          setTargetMarkerInserted(true);
        }
        return next;
      });

      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev > 0) return prev - 1;
        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, session, targetMarkerInserted, editor]);

  // Debounced Autosave
  useEffect(() => {
    if (!editor || !session || session.status === 'submitted') return;

    const handle = setTimeout(() => {
      fetch(`${API_BASE}/sessions/${session.id}/autosave`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: editor.getHTML(), 
          title,
          wordCount,
          characterCount: editor.getText().length,
          timeSpent: elapsedTime 
        })
      }).catch(() => { });
    }, 2000);

    return () => clearTimeout(handle);
  }, [wordCount, title, session?.id, token]);

  // Formatting time (mm:ss)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const togglePause = async () => {
    const newState = !isPaused;
    setIsPaused(newState);
    if (editor) {
      editor.setEditable(!newState);
    }

    try {
      await fetch(`${API_BASE}/sessions/${session?.id}/${newState ? 'pause' : 'resume'}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Session ${newState ? 'paused' : 'resumed'}`);
    } catch (e) {
      toast.error('Failed to sync pause state');
      console.error('Failed to sync pause state');
    }
  };

  const handleSubmit = async () => {
    if (!editor || !session || !token || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);

      const res = await fetch(`${API_BASE}/sessions/${session.id}/submit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content: editor.getHTML(),
          title,
          wordCount: words.length,
          characterCount: text.length,
          timeSpent: elapsedTime
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Story submitted successfully!');
        navigate(`/summary/${session.id}`);
      } else {
        toast.error(data.message || 'Failed to submit session');
      }
    } catch (e) {
      toast.error('Error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading editor...</div>;
  if (error) return <div style={{ padding: '4rem', textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!session) return null;

  const progressPercentage = session.wordTarget
    ? Math.min((wordCount / session.wordTarget) * 100, 100)
    : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Sticky Top Bar (Header + Prompt) */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(245, 245, 247, 0.95)',
        backdropFilter: 'blur(10px)',
      }}>
        {/* Editor Header */}
        <header style={{
          padding: '1rem clamp(1rem, 4vw, 3rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-secondary)' }}>
            ←
          </button>
          {timeLeft !== null && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 500,
              color: timeLeft < 60 ? '#b91c1c' : 'var(--color-text-primary)'
            }}>
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {isBoldMode && (
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', background: 'var(--color-border)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              BOLD MODE
            </span>
          )}
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
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{wordCount}</span>
            {session.wordTarget ? ` / ${session.wordTarget} words` : ' words'}
          </div>
          <button onClick={() => setShowPrompt(!showPrompt)} className="btn-pill btn-pill-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showPrompt ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </>
              )}
            </svg>
            <span className="hidden sm:inline">{showPrompt ? 'Hide Prompt' : 'Show Prompt'}</span>
          </button>
          <button onClick={togglePause} className="btn-pill btn-pill-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-pill btn-pill-dark" style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem', opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div>
                <span>Submitting...</span>
              </div>
            ) : 'Finish'}
          </button>
        </div>
        </header>
        {/* Progress Bar (Moved here inside sticky header) */}
        {session.wordTarget && (
          <div style={{ height: '3px', width: '100%', background: 'var(--color-border)' }}>
            <div style={{
              height: '100%',
              width: `${progressPercentage}%`,
              background: 'var(--color-text-primary)',
              transition: 'width 0.3s ease-out'
            }} />
          </div>
        )}

        {/* Challenge Prompt Banner */}
        {session.challenge && (
          <div style={{
            padding: showPrompt ? '2rem clamp(1rem, 4vw, 3rem)' : '0 clamp(1rem, 4vw, 3rem)',
            borderBottom: showPrompt ? '1px solid var(--color-border)' : 'none',
            backgroundColor: 'var(--color-bg-primary)',
            maxHeight: showPrompt ? '60vh' : '0',
            opacity: showPrompt ? 1 : 0,
            overflowY: 'auto',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: showPrompt ? 'auto' : 'none',
          }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', transform: showPrompt ? 'translateY(0)' : 'translateY(-20px)', transition: 'transform 0.3s ease' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {session.challenge.genre && session.challenge.genre.trim() !== '' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                    {session.challenge.genre}
                  </span>
                )}
                {session.challenge.mode === 'adaptive' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff', backgroundColor: '#000000', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                    Targeted Practice
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.3, color: 'var(--color-text-primary)' }}>
                {session.challenge.prompt}
              </h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {session.challenge.reasoning && (
                  <div style={{ backgroundColor: 'var(--color-bg-alt)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.25rem', marginTop: '2px' }}>💡</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>Why this challenge?</strong>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{session.challenge.reasoning}</p>
                    </div>
                  </div>
                )}

                {session.challenge.constraint && (
                  <div style={{ backgroundColor: 'var(--color-bg-alt)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>Constraint:</h3>
                    <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{session.challenge.constraint}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Font Size Indicator Overlay */}
      {fontSizeIndicator && (
        <div 
          key={fontSizeIndicator.id}
          style={{
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '2rem',
            fontSize: '1.5rem',
            fontWeight: 600,
            zIndex: 100,
            animation: 'fadeOut 1.5s ease-out forwards',
            pointerEvents: 'none'
          }}
        >
          {fontSizeIndicator.size}px
        </div>
      )}

      {/* Editor Main Area */}
      <main style={{
        flex: 1,
        padding: '2rem 30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: isPaused ? 0.3 : 1,
        pointerEvents: isPaused ? 'none' : 'auto',
        transition: 'opacity 0.2s',
        position: 'relative'
      }}>
        {/* Realtime Keystroke Indicator (Moved here for better typing focus context) */}
        <div style={{
          height: '40px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {lastKeystroke && (
            <div
              key={lastKeystroke.id} // Forces React to re-mount and re-trigger animation
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                animation: 'fadeOutUp 1s ease-out forwards',
                pointerEvents: 'none'
              }}
            >
              {lastKeystroke.char}
            </div>
          )}
        </div>

        <div style={{ width: '100%', maxWidth: '1350px' }} className="editor-dynamic-size">
          <style>{`
            .editor-dynamic-size .ProseMirror {
              font-family: ${fontFamily} !important;
              font-size: ${fontSize}px !important;
              line-height: 1.6;
            }
            .story-title-input {
              width: 100%;
              font-size: 2.5rem;
              font-weight: 700;
              border: none;
              outline: none;
              background: transparent;
              margin-bottom: 1rem;
              color: var(--color-text-primary);
              font-family: inherit;
              text-align: center;
            }
            .story-title-input::placeholder {
              color: var(--color-text-muted);
            }
          `}</style>
          <input
            type="text"
            className="story-title-input"
            placeholder="Untitled Story"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <EditorContent editor={editor} />
          {editor && (
            <BubbleMenu
              editor={editor}
              className="flex items-center gap-1 p-1 bg-white border border-gray-200 shadow-md rounded-md"
              style={{ backgroundColor: 'var(--color-bg)', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            >
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-1 hover:bg-gray-100 rounded ${editor.isActive({ textAlign: 'left' }) ? 'text-blue-500 font-bold' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
              >
                Left
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-1 hover:bg-gray-100 rounded ${editor.isActive({ textAlign: 'center' }) ? 'text-blue-500 font-bold' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
              >
                Center
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={`p-1 hover:bg-gray-100 rounded ${editor.isActive({ textAlign: 'justify' }) ? 'text-blue-500 font-bold' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
              >
                Justify/Format
              </button>
            </BubbleMenu>
          )}
        </div>
      </main>

      {/* Pause Overlay */}
      {isPaused && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 50
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Session Paused</h2>
          <button onClick={togglePause} className="btn-pill btn-pill-dark" style={{ fontSize: '1.125rem' }}>
            Resume Writing
          </button>
        </div>
      )}
    </div>
  );
}
