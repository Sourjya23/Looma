import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        login(data.data.token, data.data.user);
        toast.success('Successfully logged in!');
        navigate('/dashboard');
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
        <div style={{ position: 'absolute', top: '2rem', right: '3rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none' }}>Sign up</Link>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--color-text-primary)', marginBottom: '2rem' }}>
              <img src="/logo-icon.png" alt="Looma Logo" style={{ height: '32px', width: 'auto' }} />
              <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Looma</span>
            </Link>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.04em', marginBottom: '2.5rem', color: 'var(--color-text-primary)' }}>Sign in</h1>
            
            {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <input 
                  id="email"
                  type="email" 
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', outline: 'none', transition: 'border-color 0.2s', fontSize: '0.95rem' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-text-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
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
                  style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', outline: 'none', transition: 'border-color 0.2s', fontSize: '0.95rem' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-text-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                style={{ width: '100%', padding: '1rem', backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem', fontSize: '0.95rem' }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
