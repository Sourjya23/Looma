import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from 'shared-types';
import { API_BASE } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, rememberMe?: boolean) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token') || sessionStorage.getItem('token')
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        // Always call /me with credentials: 'include' so the HTTP-only cookie is sent.
        // This handles both:
        //   - token in storage (non-cookie sessions / "no remember me")
        //   - HTTP-only cookie (persistent "remember me" sessions, no token in storage)
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE}/auth/me`, {
          headers,
          credentials: 'include', // Send cookie even if no token in storage
        });
        const data = await res.json();

        if (data.success) {
          setUser(data.data);
        } else {
          // Session invalid — clear storage
          setToken(null);
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        }
      } catch (e) {
        console.error('Failed to verify session', e);
        setToken(null);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    verifyUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — not every time token changes

  const login = (newToken: string, newUser: User, rememberMe: boolean = true) => {
    setToken(newToken);
    setUser(newUser);
    if (rememberMe) {
      localStorage.setItem('token', newToken);
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', newToken);
      localStorage.removeItem('token');
    }
  };

  const logout = async () => {
    // Tell backend to clear the HTTP-only cookie
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('Logout request failed', e);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedFields });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
