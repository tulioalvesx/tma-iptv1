module.exports = (req, res) => {
  res.json({
    env: process.env.VERCEL_ENV || 'unknown',
    hasAdminUser: !!process.env.ADMIN_USER,
    hasAdminPass: !!process.env.ADMIN_PASS,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
};
