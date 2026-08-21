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
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token') || sessionStorage.getItem('token')
  );
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Only block the UI if we have a token but no user object yet.
  // Otherwise, we are either fully logged out, or we have both and can optimistically render.
  const [isLoading, setIsLoading] = useState(() => {
    const hasToken = !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
    const hasUser = !!(localStorage.getItem('user') || sessionStorage.getItem('user'));
    return hasToken && !hasUser; 
  });

  useEffect(() => {
    const verifyUser = async () => {
      try {
        // Always call /me with credentials: 'include' so the HTTP-only cookie is sent.
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
          // Update cached user
          if (localStorage.getItem('token')) {
            localStorage.setItem('user', JSON.stringify(data.data));
          } else if (sessionStorage.getItem('token')) {
            sessionStorage.setItem('user', JSON.stringify(data.data));
          } else {
            // Logged in via cookie only
            setToken(data.data.token || null);
          }
        } else {
          // Session invalid — clear storage
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      } catch (e) {
        console.error('Failed to verify session', e);
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    verifyUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const login = (newToken: string, newUser: User, rememberMe: boolean = true) => {
    setToken(newToken);
    setUser(newUser);
    if (rememberMe) {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    } else {
      sessionStorage.setItem('token', newToken);
      sessionStorage.setItem('user', JSON.stringify(newUser));
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const logout = async () => {
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
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedFields };
      setUser(newUser);
      
      // Update cache
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(newUser));
      } else if (sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', JSON.stringify(newUser));
      }
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
