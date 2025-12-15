/**
 * Authentication context and hooks for the application
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as supabase from './supabase';
import * as api from './api';

// =====================
// Types
// =====================

export interface UsageStats {
  scripts: {
    used: number;
    limit: number | null;
    remaining: number | 'unlimited';
  };
  images: {
    used: number;
    limit: number | null;
    remaining: number | 'unlimited';
  };
  is_admin: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  session: supabase.Session | null;
  usage: UsageStats | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

// =====================
// Context
// =====================

const AuthContext = createContext<AuthContextType | null>(null);

// =====================
// Provider
// =====================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<supabase.Session | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user info and usage from backend
  const fetchUserInfo = useCallback(async () => {
    const token = await supabase.getAccessToken();
    if (!token) {
      setUser(null);
      setUsage(null);
      return;
    }

    const result = await api.getCurrentUser();
    if (result.data) {
      setUser(result.data.user);
      setUsage(result.data.usage);
    } else {
      setUser(null);
      setUsage(null);
    }
  }, []);

  // Refresh usage stats
  const refreshUsage = useCallback(async () => {
    const result = await api.getUsage();
    if (result.data) {
      setUsage(result.data);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      // Get initial session
      const { session: initialSession } = await supabase.getSession();
      setSession(initialSession);
      
      if (initialSession) {
        await fetchUserInfo();
      }
      
      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      
      if (newSession) {
        await fetchUserInfo();
      } else {
        setUser(null);
        setUsage(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserInfo]);

  // Sign in
  const handleSignIn = useCallback(async (email: string, password: string) => {
    const result = await supabase.signIn(email, password);
    
    if (result.error) {
      return { error: result.error };
    }

    // Fetch user info after successful sign in
    await fetchUserInfo();
    return {};
  }, [fetchUserInfo]);

  // Sign up
  const handleSignUp = useCallback(async (email: string, password: string) => {
    const result = await supabase.signUp(email, password);
    
    if (result.error) {
      return { error: result.error };
    }

    // Note: User may need to verify email before they can sign in
    return {};
  }, []);

  // Sign out
  const handleSignOut = useCallback(async () => {
    await supabase.signOut();
    setUser(null);
    setSession(null);
    setUsage(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    usage,
    isLoading,
    isAuthenticated: !!session && !!user,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshUsage,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =====================
// Hook
// =====================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// =====================
// Protected Route Component
// =====================

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback ?? null;
  }

  return <>{children}</>;
}
