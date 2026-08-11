import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { GamificationWidget } from './GamificationWidget';

export function ProgressDashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [dashRes, profRes] = await Promise.all([
          fetch(`/api/dashboard/overview?range=${range}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`/api/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const dashData = await dashRes.json();
        const profData = await profRes.json();

        if (dashData.success) setData(dashData.data);
        if (profData.success) setProfile(profData.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token, range]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '4rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (data?.isEmpty) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Your Writing Journey</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '1.125rem' }}>
          No progress yet. Complete your first writing exercise to start tracking progress.
        </p>
        <button className="btn-pill btn-pill-dark" onClick={() => navigate('/new')} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
          Start Writing
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getTrendIcon = (state: string) => {
    if (state === 'improving') return <span style={{ color: 'var(--color-success)' }}>↑</span>;
    if (state === 'worsening') return <span style={{ color: 'var(--color-error)' }}>↓</span>;
    if (state === 'stable') return <span style={{ color: 'var(--color-text-muted)' }}>→</span>;
    return <span style={{ color: 'var(--color-text-muted)' }}>-</span>;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '2rem' }}>
      
      {/* HEADER & FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Overview</p>
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
            Your Writing Journey
          </h1>
        </div>
        <div>
          <select 
            value={range} 
            onChange={e => setRange(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <GamificationWidget />

      {/* STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{data?.totalSessions}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Exercises completed</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{data?.totalWords?.toLocaleString()}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Total words</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{formatTime(data?.totalWritingTime)}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Writing time</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{data?.averageWritingSpeed}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Words / minute</div>
        </div>
      </div>

      {/* YOUR PROGRESS SUMMARY */}
      {data?.progressSummary && (
        <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', marginBottom: '3rem', borderLeft: '4px solid var(--color-text-primary)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', marginTop: 0 }}>Your Progress</h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
            {data.progressSummary}
          </p>
        </div>
      )}

      {/* MAIN GRIDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* SCORE ANALYTICS */}
        <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Performance</h2>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>English</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{data?.trends?.english?.value} {getTrendIcon(data?.trends?.english?.state)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Story</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{data?.trends?.story?.value} {getTrendIcon(data?.trends?.story?.state)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Director</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{data?.trends?.director?.value} {getTrendIcon(data?.trends?.director?.state)}</div>
              </div>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis domain={[40, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '0.875rem' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.875rem', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="english" name="English" stroke="#0a0a0a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="story" name="Story" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="director" name="Director" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* WRITING SPEED */}
        <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem', marginTop: 0 }}>Writing Speed (WPM)</h2>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                <Line type="monotone" dataKey="speed" stroke="var(--color-text-primary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WRITING VOLUME */}
        <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem', marginTop: 0 }}>Writing Volume (Words)</h2>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip cursor={{ fill: 'var(--color-bg-secondary)' }} contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                <Bar dataKey="words" fill="#0a0a0a" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {/* STRENGTHS */}
        <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem', marginTop: 0 }}>Your Strengths</h2>
          {profile?.strengths?.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {profile.strengths.map((s: any, idx: number) => (
                <li key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-success)', fontSize: '1.25rem' }}>✓</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{s.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Keep writing to discover your strengths!</p>
          )}
        </div>

        {/* FOCUS AREAS */}
        <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem', marginTop: 0 }}>Current Focus</h2>
          {profile?.weaknesses?.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {profile.weaknesses.slice(0, 3).map((w: any, idx: number) => (
                <li key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--color-error)' }}>🔴</span>
                    <span style={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>{w.subCategory.replace('_', ' ')}</span>
                  </div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{w.count} mistakes</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No critical weaknesses detected recently.</p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {/* TIME DISCIPLINE */}
        <div style={{ backgroundColor: 'var(--color-bg-primary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem', marginTop: 0 }}>Time Discipline</h2>
          {data?.timeDiscipline ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Target Average</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{Math.round(data.timeDiscipline.targetAverage / 60)} min</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Actual Average</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{Math.round(data.timeDiscipline.actualAverage / 60)} min</span>
              </div>
              
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--color-error)' }}>
                  <div style={{ width: `${data.timeDiscipline.onTimePercentage}%`, backgroundColor: 'var(--color-success)', height: '100%' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--color-success)' }}>On-time: {data.timeDiscipline.onTimePercentage}%</span>
                  <span style={{ color: 'var(--color-error)' }}>Overtime: {data.timeDiscipline.overtimePercentage}%</span>
                </div>
              </div>
            </div>
          ) : (
             <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No time data available yet.</p>
          )}
        </div>
      </div>

      {/* RECENT WRITING */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>Recent Writing</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data?.recentSessions?.map((session: any) => (
            <div 
              key={session.id} 
              onClick={() => navigate(`/summary/${session.id}`)}
              style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background-color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'}
            >
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {session.prompt}
                  {session.isBookmarked && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#eab308" xmlns="http://www.w3.org/2000/svg">
                      <title>Bookmarked</title>
                      <path d="M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21L12 16L5 21V5Z" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '1rem' }}>
                  <span>{new Date(session.completedAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{session.wordCount} words</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>English</div>
                  <div style={{ fontWeight: 600, color: '#0a0a0a' }}>{session.scores.english}</div>
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>Story</div>
                  <div style={{ fontWeight: 600, color: '#8b5cf6' }}>{session.scores.story}</div>
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>Director</div>
                  <div style={{ fontWeight: 600, color: '#ec4899' }}>{session.scores.director}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
