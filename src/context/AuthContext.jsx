import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── fetch profile ── */
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) { setProfile(data); return data; }
    } catch (err) { console.error('fetchProfile:', err); }
    return null;
  }, []);

  /* ── restore session on mount ── */
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) { setUser(session.user); await fetchProfile(session.user.id); }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (session?.user) { setUser(session.user); await fetchProfile(session.user.id); }
        else { setUser(null); setProfile(null); }
        setLoading(false);
      }
    );
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [fetchProfile]);

  /* ── SIGN UP ── */
  const signUp = async ({ email, password, fullName, profession, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, profession, phone } },
    });
    if (error) throw error;
    if (data.user) {
      const { data: prof } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id, email,
          full_name: fullName, profession, phone,
          role: 'member',
        }, { onConflict: 'id' })
        .select().single();
      if (prof) setProfile(prof);
    }
    return data;
  };

  /* ── SIGN IN ── */
  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) await fetchProfile(data.user.id);
    return data;
  };

  /* ── SIGN OUT ── */
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  /* ── UPDATE PROFILE ── */
  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not logged in');
    const { data, error } = await supabase
      .from('profiles').update(updates)
      .eq('id', user.id).select().single();
    if (error) throw error;
    setProfile(data);
    return data;
  };

  /* ── role helpers ── */
  const role    = profile?.role || 'member';
  const isAdmin  = role === 'admin';
  const isMember = role === 'member';

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      role, isAdmin, isMember,
      signUp, signIn, signOut,
      updateProfile, fetchProfile,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};