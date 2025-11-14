'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user as User);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Check active sessions from server
    const checkUser = async () => {
      try {
        // Get session from server API to ensure cookies are properly read
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.authenticated && data.user) {
          setUser(data.user as User);
        } else {
          setUser(null);
          // Don't redirect here - let the middleware handle it
        }
      } catch (error) {
        console.error('Error checking user session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Periodically check session status (every 30 seconds)
    const interval = setInterval(() => {
      checkUser();
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  const signOut = async () => {
    try {
      setLoading(true);

      // Use server-side logout to properly clear cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Logout result:', result);

      // Clear local state
      setUser(null);

      // Use window.location for full page reload to ensure middleware runs
      window.location.href = '/login';

    } catch (error) {
      console.error('Error signing out:', error);
      // Even on error, redirect to login
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};