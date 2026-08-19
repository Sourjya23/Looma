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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If we have a token, we could fetch /api/auth/me to verify and get user
    // For simplicity right now, we'll just check if it exists in local storage
    // but ideally we make a fetch call here.
    const verifyUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          setUser(data.data);
        } else {
          setToken(null);
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        }
      } catch (e) {
        console.error('Failed to verify token', e);
      } finally {
        setIsLoading(false);
      }
    };

    verifyUser();
  }, [token]);

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

  const logout = () => {
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
