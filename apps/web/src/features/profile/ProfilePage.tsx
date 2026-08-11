import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AchievementsGrid } from './AchievementsGrid';
import { LeaderboardSettings } from './LeaderboardSettings';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export function ProfilePage() {
  const { token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setProfile(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem' }}>You don't have a writing profile yet.</p>
        <p style={{ color: 'var(--color-text-muted)' }}>Complete a few writing sessions to generate your profile!</p>
        <button onClick={() => navigate('/dashboard')} className="btn-pill btn-pill-dark">Write a Story</button>
      </div>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Max 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setUploadingAvatar(true);
      try {
        const res = await fetch(`${API_BASE}/profile/avatar`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ avatar: base64 })
        });
        const data = await res.json();
        if (data.success && data.data.avatarUrl) {
          updateUser({ avatarUrl: data.data.avatarUrl });
          toast.success('Avatar updated successfully!');
        } else {
          toast.error(data.message || 'Failed to update avatar');
        }
      } catch (err) {
        toast.error('Error uploading avatar');
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: 'clamp(2rem, 4vw, 4rem)', maxWidth: '1000px', margin: '0 auto', width: '100%' }} className="animate-fade-in-up">
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--color-bg-alt)', 
            border: '2px dashed var(--color-border)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {user?.avatarUrl ? (
            <img src={`http://localhost:3001${user.avatarUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '2rem', color: 'var(--color-text-muted)' }}>
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
          
          <div style={{ 
            position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600,
            opacity: uploadingAvatar ? 1 : 0, transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => { if (!uploadingAvatar) e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { if (!uploadingAvatar) e.currentTarget.style.opacity = '0'; }}
          >
            {uploadingAvatar ? 'Uploading...' : 'Change'}
          </div>
          <input type="file" accept="image/jpeg, image/png, image/webp" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>
        
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.04em', margin: 0 }}>
            {user?.displayName || user?.username || 'Your Writing Profile'}
          </h1>
          <div style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Level {user?.level || 1} • {user?.xp || 0} XP
          </div>
        </div>
      </div>
      
      {profile.aiInterpretation && (
        <div style={{ padding: '2rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: '1rem', marginBottom: '3rem', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--color-primary)' }}>✦</span> Coach's Assessment
          </h2>
          <div style={{ lineHeight: 1.6, color: 'var(--color-text-primary)' }} className="markdown-body">
            <ReactMarkdown>{profile.aiInterpretation}</ReactMarkdown>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Strengths */}
        <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Strengths
          </h2>
          {profile.strengths?.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {profile.strengths.map((s: any, i: number) => (
                <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-success)', fontSize: '1.25rem' }}>✓</span>
                  <span style={{ fontWeight: 500 }}>{s.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>Keep writing to discover your strengths!</p>
          )}
        </div>

        {/* Focus Areas */}
        <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Focus Areas
          </h2>
          {profile.weaknesses?.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {profile.weaknesses.map((w: any, i: number) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-warning)', fontSize: '1.25rem' }}>🔴</span>
                    <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{w.subCategory.replace(/_/g, ' ')}</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{w.count} mistakes</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>No recurring weaknesses detected yet.</p>
          )}
        </div>

      </div>

      {/* Recent Trends */}
      <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Recent Trends
        </h2>
        {profile.trends?.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {profile.trends.map((t: any, i: number) => (
              <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{t.subCategory.replace(/_/g, ' ')}</span>
                <span style={{ 
                  color: t.state === 'improving' ? 'var(--color-success)' : 
                         t.state === 'worsening' ? 'var(--color-error)' : 
                         'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}>
                  {t.state} {t.state === 'improving' ? '↑' : t.state === 'worsening' ? '↓' : '→'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>Not enough data to detect trends.</p>
        )}
      </div>

      <AchievementsGrid />
      <LeaderboardSettings />
    </div>
  );
}
