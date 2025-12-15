/**
 * Supabase client for auth and storage operations
 */

import { createClient, type User, type Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'assets';

// Only create client if credentials are available
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// =====================
// Auth Functions
// =====================

export type { User, Session };

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<{ user: User | null; error?: string }> {
  if (!supabase) {
    return { user: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error?: string }> {
  if (!supabase) {
    return { user: null, session: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, session: null, error: error.message };
  }

  return { user: data.user, session: data.session };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error?: string }> {
  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return {};
}

/**
 * Get current session
 */
export async function getSession(): Promise<{ session: Session | null; error?: string }> {
  if (!supabase) {
    return { session: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { session: null, error: error.message };
  }

  return { session: data.session };
}

/**
 * Get current user
 */
export async function getUser(): Promise<{ user: User | null; error?: string }> {
  if (!supabase) {
    return { user: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user };
}

// Simple in-memory cache for the token to avoid hitting storage on every request
let tokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Get access token for API calls
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid (buffer of 60s)
  if (tokenCache && tokenCache.expiresAt > now + 60) {
    return tokenCache.token;
  }

  try {
    // Add a race condition to prevent getSession from hanging indefinitely internally
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: Session | null }; error: null }>((resolve) => {
      setTimeout(() => resolve({ data: { session: null }, error: null }), 2000);
    });

    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

    // If no session (or timeout) but we think we're logged in, try to refresh
    if (!session) {
      console.log('[Supabase] No session found (or timed out), attempting refresh...');
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('[Supabase] Session refresh failed:', error);
        tokenCache = null;
        return null;
      }

      if (refreshedSession?.access_token) {
        tokenCache = {
          token: refreshedSession.access_token,
          expiresAt: refreshedSession.expires_at || (now + 3600),
        };
        return refreshedSession.access_token;
      }
      return null;
    }

    if (session.access_token) {
      tokenCache = {
        token: session.access_token,
        expiresAt: session.expires_at || (now + 3600),
      };
      return session.access_token;
    }

    return null;
  } catch (err) {
    console.error('[Supabase] Unexpected error in getAccessToken:', err);
    return null;
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => { } } } };
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    // Update cache on changes
    if (session?.access_token) {
      tokenCache = {
        token: session.access_token,
        expiresAt: session.expires_at || (Math.floor(Date.now() / 1000) + 3600),
      };
    } else if (event === 'SIGNED_OUT') {
      tokenCache = null;
    }
    callback(event, session);
  });
}

// =====================
// Storage Functions
// =====================

/**
 * Upload a blob to Supabase Storage
 */
export async function uploadBlob(
  path: string,
  blob: Blob,
  contentType: string
): Promise<{ path: string; error?: string }> {
  if (!supabase) {
    return { path: '', error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, {
      contentType,
      upsert: true,
    });

  if (error) {
    return { path: '', error: error.message };
  }

  return { path: data.path };
}

/**
 * Get the public URL for a file in storage
 */
export function getPublicUrl(path: string): string {
  if (!supabase) {
    return '';
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<{ error?: string }> {
  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    return { error: error.message };
  }

  return {};
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Generate a unique file path for storage
 */
export function generateStoragePath(
  userId: string,
  kind: string,
  extension: string = 'png'
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}/${kind}/${timestamp}-${random}.${extension}`;
}

export { STORAGE_BUCKET };
