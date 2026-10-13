import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Creating account...');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      setLoadingStatus('Creating account...');
      return;
    }
    const t1 = setTimeout(() => setLoadingStatus('Connecting to server...'), 3500);
    const t2 = setTimeout(() => setLoadingStatus('Waking up cloud backend...'), 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();

      if (data.success) {
        login(data.data.token, data.data.user);
        toast.success('Successfully registered!');
        navigate('/dashboard', { replace: true });
        setTimeout(() => {
          if (window.location.pathname.includes('/register')) {
            window.location.href = '/dashboard';
          }
        }, 300);
      } else {
        toast.error(data.message || 'Registration failed');
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      toast.error('An error occurred during registration.');
      setError('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', backgroundColor: '#fafafa' }}>
      {/* Left Side: Graphic / Branding */}
      <div className="hidden md:flex" style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
        <video 
          src="https://v1.pinimg.com/videos/mc/expMp4/f8/7f/5b/f87f5b94d6a533543d2c47dc7e308e03_t3.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Right Side: Auth Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', position: 'relative', overflowY: 'auto' }}>
        <div className="login-signup-link" style={{ position: 'absolute', top: '2rem', right: '3rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none' }}>Log in</Link>
        </div>

        <div className="login-form-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--color-text-primary)', marginBottom: '2rem' }}>
              <img src="/logo-icon.png" alt="Looma Logo" style={{ height: '32px', width: 'auto' }} />
              <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Looma</span>
            </Link>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.04em', marginBottom: '2.5rem', color: 'var(--color-text-primary)' }}>Sign up</h1>
            
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-600 animate-fade-in">
                <svg className="w-4 h-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <input 
                  id="username"
                  type="text" 
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-zinc-200 bg-zinc-50/70 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5 transition-all"
                />
              </div>
              <div>
                <input 
                  id="email"
                  type="email" 
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-zinc-200 bg-zinc-50/70 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5 transition-all"
                />
              </div>
              <div>
                <input 
                  id="password"
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-zinc-200 bg-zinc-50/70 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5 transition-all"
                />
              </div>

              {/* Ultra-premium Linear / Vercel style submit button */}
              <button 
                type="submit" 
                disabled={loading}
                className={`relative overflow-hidden w-full py-3.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 mt-2 flex items-center justify-center gap-2.5 shadow-xs ${
                  loading 
                    ? 'bg-zinc-900 text-zinc-200 cursor-wait after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent' 
                    : 'bg-zinc-950 text-white hover:bg-zinc-850 active:scale-[0.99] cursor-pointer'
                }`}
              >
                {loading ? (
                  <>
                    <Spinner size={16} color="#ffffff" />
                    <span className="tracking-tight text-xs font-medium">{loadingStatus}</span>
                  </>
                ) : (
                  <span>Create account</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
