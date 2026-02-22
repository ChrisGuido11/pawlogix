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
          setSession(existingSession);
          setUser(existingSession.user);
          await fetchProfile(existingSession.user.id);
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
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user?.id) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const linkAccount = async (email: string, password: string, displayName?: string) => {
    // Race updateUser against a timeout — Supabase email-change confirmation
    // settings can cause this call to hang in some configurations.
    const updatePromise = supabase.auth.updateUser({
      email: scopeEmail(email),
      password,
      data: { app: 'pawlogix' },
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Account creation timed out. Please try again.')), 12000)
    );

    const { data, error } = await Promise.race([updatePromise, timeoutPromise]);
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
