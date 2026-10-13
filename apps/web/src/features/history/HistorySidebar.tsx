import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

const CACHE_KEY = 'looma_history_cache';

interface HistorySidebarProps {
  token: string;
  onNewWriting: () => void;
  activeSessionId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({ token, onNewWriting, activeSessionId, isOpen, onClose }: HistorySidebarProps) {
  const [history, setHistory] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  const fetchHistory = async (p: number) => {
    if (loading || (!hasMore && p !== 1)) return;
    setLoading(true);
    setHasError(false);

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${API_BASE}/history?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        if (p === 1) {
          setHistory(data.data);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
          } catch (e) {
            console.warn('Failed to cache history:', e);
          }
        } else {
          setHistory(prev => {
            const updated = [...prev, ...data.data];
            return updated;
          });
        }
        setHasMore(p < (data.meta?.totalPages || 1));
      } else {
        throw new Error(data.message || 'Failed to fetch history');
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name !== 'AbortError') {
        console.warn('History fetch failed:', e);
        if (p === 1 && history.length === 0) {
          setHasError(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDelete = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (item.isBookmarked) {
      toast.error('Bookmarked stories cannot be deleted. Please unbookmark it first.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this story? This cannot be undone.')) return;
    
    const id = item.id;
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        setHistory(prev => {
          const updated = prev.filter(h => h.id !== id);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        toast.success('Story deleted successfully');
        if (activeSessionId === id) {
          navigate('/dashboard');
          onClose();
        }
      } else {
        toast.error('Failed to delete story');
        console.error('Failed to delete session');
      }
    } catch (err) {
      toast.error('Error deleting story');
      console.error(err);
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    // Optimistic UI update
    setHistory(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, isBookmarked: !currentStatus } : h);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/bookmark`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) {
        // Revert on failure
        setHistory(prev => {
          const reverted = prev.map(h => h.id === id ? { ...h, isBookmarked: currentStatus } : h);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(reverted));
          } catch {}
          return reverted;
        });
        toast.error('Failed to update bookmark');
      }
    } catch (err) {
      setHistory(prev => {
        const reverted = prev.map(h => h.id === id ? { ...h, isBookmarked: currentStatus } : h);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(reverted));
        } catch {}
        return reverted;
      });
      toast.error('Error updating bookmark');
    }
  };

  // Group by relative time (mock logic for grouping)
  const groupHistory = (items: any[]) => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const older: any[] = [];

    const now = new Date();
    const todayStr = now.toDateString();
    
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    items.forEach(item => {
      if (!item.completedAt) return;
      const d = new Date(item.completedAt).toDateString();
      if (d === todayStr) today.push(item);
      else if (d === yesterdayStr) yesterday.push(item);
      else older.push(item);
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupHistory(history);

  const renderGroup = (label: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {items.map(item => {
            const submission = item.submissions?.[0];
            const isActive = item.id === activeSessionId;
            return (
              <div
                key={item.id}
                onClick={() => { navigate(`/summary/${item.id}`); onClose(); }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--color-bg-alt)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={(e) => { 
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
                  const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                  if (deleteBtn) deleteBtn.style.opacity = '1';
                  const bookmarkBtn = e.currentTarget.querySelector('.bookmark-btn') as HTMLElement;
                  if (bookmarkBtn) bookmarkBtn.style.opacity = '1';
                }}
                onMouseLeave={(e) => { 
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                  if (deleteBtn) deleteBtn.style.opacity = '0';
                  const bookmarkBtn = e.currentTarget.querySelector('.bookmark-btn') as HTMLElement;
                  if (bookmarkBtn && !item.isBookmarked) bookmarkBtn.style.opacity = '0'; // keep visible if bookmarked
                }}
              >
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.25rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', paddingRight: '40px' }}>
                    {item.challenge?.genre ? `[${item.challenge.genre}] ` : ''} 
                    {item.title || submission?.title || 'Untitled Story'}
                  </div>
                  
                  {/* Actions Container */}
                  <div style={{ position: 'absolute', right: '0.5rem', top: '0.75rem', display: 'flex', gap: '0.25rem' }}>
                    <button
                      className="bookmark-btn"
                      onClick={(e) => handleToggleBookmark(e, item.id, !!item.isBookmarked)}
                      title={item.isBookmarked ? 'Unbookmark' : 'Bookmark'}
                      style={{
                        opacity: item.isBookmarked ? 1 : 0,
                        transition: 'opacity 0.2s',
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        color: item.isBookmarked ? '#eab308' : 'var(--color-text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={item.isBookmarked ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21L12 16L5 21V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(e, item)}
                      title={item.isBookmarked ? 'Bookmarked stories cannot be deleted' : 'Delete story'}
                      style={{
                        opacity: 0,
                        transition: 'opacity 0.2s, color 0.2s',
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem',
                        cursor: item.isBookmarked ? 'not-allowed' : 'pointer',
                        color: item.isBookmarked ? 'var(--color-text-muted)' : 'var(--color-danger)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span>{submission?.wordCount || 0} words</span>
                  
                  {submission?.englishAnalysis && (
                    <>
                      <span>·</span>
                      <span style={{ color: 'var(--color-success)' }}>{submission.englishAnalysis.score}</span>
                    </>
                  )}
                  {submission?.storyAnalysis && (
                    <>
                      <span>·</span>
                      <span style={{ color: 'var(--color-success)' }}>{submission.storyAnalysis.overallScore}</span>
                    </>
                  )}
                  {submission?.directorAnalysis && (
                    <>
                      <span>·</span>
                      <span style={{ color: 'var(--color-success)' }}>{submission.directorAnalysis.overallScore}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      width: isOpen ? '280px' : '0px', 
      height: '100vh', 
      borderRight: isOpen ? '1px solid var(--color-border)' : 'none', 
      backgroundColor: 'var(--color-bg-secondary)', 
      display: 'flex', 
      flexDirection: 'column',
      transition: 'width 0.3s ease, border-right 0.3s ease',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      
      {/* Sidebar Header (Matches Topbar Height) */}
      <div style={{ height: '80px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', borderBottom: '1px solid var(--color-border)', minWidth: '280px' }}>

        <button 
          onClick={() => { navigate('/dashboard'); onClose(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <img src="/logo-icon.png" alt="Looma Logo" style={{ height: '28px', width: 'auto' }} />
          <div style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
            Looma
          </div>
        </button>
      </div>

      <div style={{ padding: '1.5rem 1.5rem 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '280px' }}>
        <button 
          onClick={() => { onNewWriting(); onClose(); }}
          style={{ width: '100%', padding: '0.875rem', backgroundColor: 'var(--color-text-primary)', color: 'var(--color-text-on-dark)', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New Writing
        </button>
        
        <button 
          onClick={() => { navigate('/profile'); onClose(); }}
          style={{ width: '100%', padding: '0.75rem', backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          My Profile
        </button>
      </div>

      {/* Scrollable History List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', minWidth: '280px' }}>
        {loading && history.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem', paddingLeft: '0.5rem', letterSpacing: '0.05em' }}>
              RECENT STORIES
            </div>
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="animate-pulse"
                style={{ 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem', 
                  backgroundColor: 'var(--color-bg-alt)', 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div 
                  style={{ 
                    height: '13px', 
                    width: i === 1 ? '70%' : i === 2 ? '85%' : '60%', 
                    borderRadius: '4px', 
                    backgroundColor: 'var(--color-border)',
                  }} 
                />
                <div 
                  style={{ 
                    height: '10px', 
                    width: '35%', 
                    borderRadius: '3px', 
                    backgroundColor: 'var(--color-border)',
                    opacity: 0.6
                  }} 
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            {renderGroup('TODAY', today)}
            {renderGroup('YESTERDAY', yesterday)}
            {renderGroup('OLDER', older)}

            {loading && history.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                <Spinner size={16} />
              </div>
            )}
            
            {hasMore && !loading && history.length > 0 && (
              <button 
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchHistory(nextPage);
                }}
                style={{ width: '100%', padding: '0.5rem', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
              >
                Load More
              </button>
            )}

            {!loading && history.length === 0 && !hasError && (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No stories yet. Start writing!
              </div>
            )}

            {!loading && history.length === 0 && hasError && (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <span>Couldn&apos;t load history</span>
                <button 
                  onClick={() => fetchHistory(1)}
                  style={{ 
                    background: 'var(--color-bg-primary)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '0.375rem', 
                    padding: '0.35rem 0.75rem', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer', 
                    color: 'var(--color-text-primary)',
                    fontWeight: 500
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
