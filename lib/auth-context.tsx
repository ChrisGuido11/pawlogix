import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, scopeEmail } from './supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAnonymous: boolean;
  isLoading: boolean;
  linkAccount: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAnonymous = user?.is_anonymous ?? true;

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('pl_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) setProfile(data as UserProfile);
    } catch {
      // Profile may not exist yet for anonymous users
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          // Validate the cached session against the server — getSession only
          // reads from local storage and won't catch expired refresh tokens.
          const { error: userError } = await supabase.auth.getUser();
          if (userError) {
            // Stale or revoked session — sign out and start fresh
            await supabase.auth.signOut();
            const { data: { session: freshSession } } = await supabase.auth.signInAnonymously();
            if (freshSession) {
              setSession(freshSession);
              setUser(freshSession.user);
              await fetchProfile(freshSession.user.id);
            }
          } else {
            setSession(existingSession);
            setUser(existingSession.user);
            await fetchProfile(existingSession.user.id);
          }
        } else {
          const { data: { session: anonSession } } = await supabase.auth.signInAnonymously();
          if (anonSession) {
            setSession(anonSession);
            setUser(anonSession.user);
            await fetchProfile(anonSession.user.id);
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
        // Last resort: try to create a fresh anonymous session
        try {
          await supabase.auth.signOut();
          const { data: { session: fallbackSession } } = await supabase.auth.signInAnonymously();
          if (fallbackSession) {
            setSession(fallbackSession);
            setUser(fallbackSession.user);
          }
        } catch {
          // Nothing more we can do
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user?.id) {
          // Fire without awaiting — the gotrue-js SDK awaits this callback
          // inside _notifyAllSubscribers while holding the session lock.
          // Awaiting fetchProfile here would deadlock because the Supabase
          // query needs getSession() which tries to acquire the same lock.
          fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const linkAccount = async (email: string, password: string, displayName?: string) => {
    // --- DEBUG: gather evidence for network failure ---
    const scopedEmail = scopeEmail(email);
    console.log('[linkAccount] start', {
      scopedEmail,
      hasSession: !!session,
      hasUser: !!user,
      userId: user?.id?.slice(0, 8),
      isAnon: user?.is_anonymous,
    });

    // Quick connectivity check — bypasses SDK session/lock machinery
    try {
      const healthResp = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`,
        { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! } },
      );
      console.log('[linkAccount] health check:', healthResp.status);
    } catch (healthErr: any) {
      console.error('[linkAccount] health check FAILED:', healthErr.message);
      throw new Error(
        'Cannot reach the server. Please check your internet connection and try again.',
      );
    }
    // --- END DEBUG ---

    const updatePromise = supabase.auth.updateUser({
      email: scopedEmail,
      password,
      data: { app: 'pawlogix' },
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Account creation timed out. Please try again.')), 12000)
    );

    const { data, error } = await Promise.race([updatePromise, timeoutPromise]);

    console.log('[linkAccount] updateUser result', {
      hasData: !!data,
      hasUser: !!data?.user,
      hasError: !!error,
      errorMsg: error?.message,
      errorName: error?.name,
    });

    if (error) throw error;

    const userId = data.user?.id ?? user?.id;
    if (userId) {
      await supabase
        .from('pl_profiles')
        .upsert({
          id: userId,
          display_name: displayName || null,
          email,
        }, { onConflict: 'id' });
      await refreshProfile();
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: scopeEmail(email),
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    const { data: { session: anonSession } } = await supabase.auth.signInAnonymously();
    if (anonSession) {
      setSession(anonSession);
      setUser(anonSession.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAnonymous,
        isLoading,
        linkAccount,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
