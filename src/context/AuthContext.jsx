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
        .from('profiles').select('*').eq('id', userId).single();
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

  /* ── CHECK PHONE UNIQUE ── */
  const checkPhoneUnique = async (phone) => {
    if (!phone?.trim()) return true;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone.trim())
      .maybeSingle();
    return !data; // true = unique, false = already taken
  };

  /* ── SIGN UP — sends OTP email, returns pendingData for OTP step ── */
  const signUp = async ({ email, password, fullName, profession, phone, accountType }) => {
    // 1. Check phone uniqueness first
    const phoneUnique = await checkPhoneUnique(phone);
    if (!phoneUnique) {
      throw new Error('This phone number is already registered. Please use a different number or sign in.');
    }

    // 2. Create the auth user — Supabase sends OTP confirmation email
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:    fullName,
          profession,
          phone,
          account_type: accountType || 'student',
        },
      },
    });
    if (error) throw error;

    // 3. Store pending profile data to upsert after OTP verification
    // We do NOT create the profile row yet — wait until email is confirmed
    return {
      user:        data.user,
      pendingData: { email, fullName, profession, phone, accountType },
      needsOTP:    !data.session, // if no session, email confirmation needed
    };
  };

  /* ── VERIFY OTP — called after user enters the 6-digit code ── */
  const verifyOTP = async ({ email, token, pendingData }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;

    // Create profile — always start as 'student' regardless of chosen type
    // If they chose 'member', payment will upgrade them after this
    if (data.user && pendingData) {
      const { data: prof } = await supabase
        .from('profiles')
        .upsert({
          id:               data.user.id,
          email:            pendingData.email,
          full_name:        pendingData.fullName,
          profession:       pendingData.profession,
          phone:            pendingData.phone,
          account_type:     'student',           // always student until paid
          membership_status:'Inactive',
          role:             'member',
        }, { onConflict: 'id' })
        .select().single();
      if (prof) setProfile(prof);
    }

    setUser(data.user);
    return data;
  };

  /* ── RESEND OTP ── */
  const resendOTP = async (email) => {
    const { error } = await supabase.auth.resend({
      type:  'signup',
      email,
    });
    if (error) throw error;
  };

  /* ── RESET PASSWORD (sends email link) ── */
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  /* ── UPDATE PASSWORD (after reset link) ── */
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
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

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      role:            profile?.role || 'member',
      isAdmin:         profile?.role === 'admin',
      isMember:        profile?.role === 'member',
      isAuthenticated: !!user,
      signUp,
      verifyOTP,
      resendOTP,
      checkPhoneUnique,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      fetchProfile,
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