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

  /* ── Extract a human-readable message from any error shape ── */
  const getErrMsg = (err, fallback = 'Something went wrong. Please try again.') => {
    if (!err) return fallback;
    const raw = err?.message || err?.error_description || err?.msg || '';
    // Supabase 504 / empty body comes back as '{}' or '' — show friendly message
    if (!raw || raw === '{}' || raw === 'null' || raw === 'undefined') {
      if (err?.status === 504 || err?.statusCode === 504) {
        return 'Connection timeout. Please check your internet and try again.';
      }
      if (err?.status === 500 || err?.statusCode === 500) {
        return 'Server error. Please try again in a moment.';
      }
      return fallback;
    }
    // Common Supabase messages → friendly versions
    if (raw.includes('User already registered'))  return 'An account with this email already exists. Please sign in instead.';
    if (raw.includes('Email not confirmed'))       return 'Please verify your email before signing in.';
    if (raw.includes('Invalid login credentials')) return 'Incorrect email or password.';
    if (raw.includes('Email rate limit'))          return 'Too many emails sent. Please wait a few minutes and try again.';
    if (raw.includes('Token has expired'))         return 'OTP expired. Click "Resend OTP" to get a new one.';
    if (raw.includes('otp_expired'))               return 'OTP expired. Click "Resend OTP" to get a new one.';
    if (raw.includes('otp_invalid') || raw.includes('token is invalid')) return 'Incorrect OTP. Please check and try again.';
    return raw;
  };
  /* ── CHECK PHONE UNIQUE — fails open so it never blocks signup ── */
  const checkPhoneUnique = async (phone) => {
    if (!phone?.trim()) return true;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone.trim())
        .maybeSingle();
      return !data;
    } catch {
      return true; // if DB unreachable, allow signup through
    }
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
          account_type: accountType || 'guest_user',
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

    // Create/update profile — do this explicitly as safety net in case trigger didn't fire
    if (data.user) {
      const profilePayload = {
        id:               data.user.id,
        email:            email,
        full_name:        pendingData?.fullName   || data.user.user_metadata?.full_name || 'FIP Member',
        profession:       pendingData?.profession || data.user.user_metadata?.profession || null,
        phone:            pendingData?.phone      || data.user.user_metadata?.phone      || null,
        account_type:     'guest_user',
        membership_status:'Inactive',
        role:             'member',
        profile_public:   true,
      };

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select().single();

      if (profErr) {
        // Profile upsert failed — log but don't block the user
        console.error('Profile upsert after OTP:', profErr.message);
      } else if (prof) {
        setProfile(prof);
      }
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

  /* ── RESET PASSWORD — Step 1: send 6-digit OTP via our Gmail SMTP ── */
  const sendResetOtp = async (email) => {
    const res  = await fetch('/api/password-reset?action=send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
  };

  /* ── RESET PASSWORD — Step 2: verify OTP → get a verified_token ── */
  const verifyResetOtp = async (email, otp) => {
    const res  = await fetch('/api/password-reset?action=verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid OTP.');
    return data.verified_token; // store this in component state for step 3
  };

  /* ── RESET PASSWORD — Step 3: set new password using verified_token ── */
  const resetPasswordWithToken = async (email, verifiedToken, newPassword) => {
    const res  = await fetch('/api/password-reset?action=reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, verified_token: verifiedToken, new_password: newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update password.');
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
      getErrMsg,
      signIn,
      signOut,
      sendResetOtp,
      verifyResetOtp,
      resetPasswordWithToken,
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