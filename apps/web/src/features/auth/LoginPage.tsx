import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Logging in...');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Progressive feedback for cloud backend cold starts (Render free tier wake-up)
  useEffect(() => {
    if (!loading) {
      setLoadingStatus('Logging in...');
      return;
    }
    const t1 = setTimeout(() => setLoadingStatus('Connecting to server...'), 3500);
    const t2 = setTimeout(() => setLoadingStatus('Waking up cloud backend...'), 8000);
    const t3 = setTimeout(() => setLoadingStatus('Still connecting, almost ready...'), 20000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // So the Set-Cookie response header is accepted
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();

      if (data.success) {
        login(data.data.token, data.data.user, rememberMe);
        toast.success('Successfully logged in!');
        navigate('/dashboard', { replace: true });
        
        // Failsafe in case router transition is delayed
        setTimeout(() => {
          if (window.location.pathname.includes('/login')) {
            window.location.href = '/dashboard';
          }
        }, 300);
      } else {
        toast.error(data.message || 'Login failed');
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      toast.error('An error occurred during login.');
      setError('An error occurred during login.');
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
          Don't have an account? <Link to="/register" style={{ fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none' }}>Sign up</Link>
        </div>

        <div className="login-form-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--color-text-primary)', marginBottom: '2rem' }}>
              <img src="/logo-icon.png" alt="Looma Logo" style={{ height: '32px', width: 'auto' }} />
              <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Looma</span>
            </Link>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.04em', marginBottom: '2.5rem', color: 'var(--color-text-primary)' }}>Login</h1>
            
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
              <div className="relative">
                <input 
                  id="email"
                  type="text" 
                  placeholder="Username or email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 pr-10 rounded-xl text-sm border border-zinc-200 bg-zinc-50/70 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5 transition-all"
                />
                {email && (
                  <button 
                    type="button" 
                    onClick={() => setEmail('')} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 pr-20 rounded-xl text-sm border border-zinc-200 bg-zinc-50/70 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {password && (
                    <button 
                      type="button" 
                      onClick={() => setPassword('')} 
                      className="text-zinc-400 hover:text-zinc-600 p-1 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="text-zinc-400 hover:text-zinc-600 p-1 transition-colors"
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <input 
                  type="checkbox" 
                  id="rememberMe" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-xs text-zinc-500 cursor-pointer select-none">
                  Remember me
                </label>
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
                  <span>Sign in</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
