import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Namespace emails so each app on the shared Supabase project has independent accounts.
 * user@example.com → user+pawlogix@example.com in auth.users
 * The real email is stored in pl_profiles.email for display.
 * Password reset emails still deliver since most providers support + subaddressing.
 */
export function scopeEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local}+pawlogix@${domain}`;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
