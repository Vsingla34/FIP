// Temporary diagnostic — remove after fixing
export default function handler(req, res) {
  res.status(200).json({
    hasRazorpayKeyId:     !!process.env.RAZORPAY_KEY_ID,
    hasRazorpaySecret:    !!process.env.RAZORPAY_KEY_SECRET,
    hasSupabaseUrl:       !!process.env.VITE_SUPABASE_URL,
    hasServiceRole:       !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    razorpayKeyPrefix:    process.env.RAZORPAY_KEY_ID?.slice(0,10) || 'MISSING',
    supabaseUrlPrefix:    process.env.VITE_SUPABASE_URL?.slice(0,30) || 'MISSING',
    nodeVersion:          process.version,
  });
}