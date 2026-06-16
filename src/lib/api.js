import { supabase } from '../lib/supabase.js';

/* ══════════════════════════════════════════
   AUTH HELPERS
══════════════════════════════════════════ */

export async function signUp({ email, password, fullName, profession, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, profession, phone } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}


/* ══════════════════════════════════════════
   PROFILES
══════════════════════════════════════════ */

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}


/* ══════════════════════════════════════════
   MEMBERSHIP PAYMENTS
══════════════════════════════════════════ */

export async function createPayment({ userId, plan, amount }) {
  const gst   = Math.round(amount * 0.18);
  const total = amount + gst;

  const { data, error } = await supabase
    .from('membership_payments')
    .insert({
      user_id:        userId,
      plan,
      amount,
      gst_amount:     gst,
      total_amount:   total,
      payment_status: 'Success',
      transaction_id: `FIP-${Date.now()}`,
      valid_from:     new Date().toISOString().split('T')[0],
      valid_until:    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    .select()
    .single();
  if (error) throw error;

  // Update profile membership status
  await supabase
    .from('profiles')
    .update({
      membership_plan:   plan,
      membership_status: 'Active',
      membership_start:  new Date().toISOString().split('T')[0],
      membership_end:    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    .eq('id', userId);

  return data;
}

export async function getPayments(userId) {
  const { data, error } = await supabase
    .from('membership_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}


/* ══════════════════════════════════════════
   EVENT RSVPS
══════════════════════════════════════════ */

export async function createRSVP({ userId, eventName, eventDate, fullName, email, phone, designation }) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert({
      user_id:    userId,
      event_name: eventName,
      event_date: eventDate,
      full_name:  fullName,
      email,
      phone,
      designation,
      status:     'Confirmed',
    }, { onConflict: 'user_id,event_name' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRSVPs(userId) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}


/* ══════════════════════════════════════════
   COURSE ENROLLMENTS
══════════════════════════════════════════ */

export async function enrollCourse({ userId, courseTitle, courseCategory, pricePaid = 0 }) {
  const { data, error } = await supabase
    .from('course_enrollments')
    .upsert({
      user_id:         userId,
      course_title:    courseTitle,
      course_category: courseCategory,
      price_paid:      pricePaid,
      status:          'Enrolled',
    }, { onConflict: 'user_id,course_title' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEnrollments(userId) {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateCourseProgress(enrollmentId, progress) {
  const updates = { progress };
  if (progress === 100) {
    updates.status       = 'Completed';
    updates.completed_at = new Date().toISOString();
  } else if (progress > 0) {
    updates.status = 'In Progress';
  }
  const { data, error } = await supabase
    .from('course_enrollments')
    .update(updates)
    .eq('id', enrollmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}


/* ══════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════ */

export async function submitTestimonial({ userId, name, designation, content, rating }) {
  const { data, error } = await supabase
    .from('testimonials')
    .insert({ user_id: userId || null, name, designation, content, rating })
    .select()
    .single();
  if (error) throw error;
  return data;
}


/* ══════════════════════════════════════════
   CONTACT MESSAGES
══════════════════════════════════════════ */

export async function submitContactMessage({ name, email, phone, subject, message }) {
  const { data, error } = await supabase
    .from('contact_messages')
    .insert({ name, email, phone, subject, message })
    .select()
    .single();
  if (error) throw error;
  return data;
}


/* ══════════════════════════════════════════
   ADMIN — all members
══════════════════════════════════════════ */

export async function getAllMembers() {
  const { data, error } = await supabase
    .from('admin_members_view')
    .select('*');
  if (error) throw error;
  return data;
}